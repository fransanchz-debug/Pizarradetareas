"""Avisos diarios de la Pizarra de Tareas.

Lo ejecuta GitHub Actions cada 15 minutos (.github/workflows/avisos.yml):

1. Conecta los Telegram de Fran y su hermano (mensajes "/start <código>" que
   genera la app en Ajustes > Avisos).
2. Media hora antes de la hora de entrada (Ajustes > Avisos), una vez al día:
   - En las tareas de hoy sin trabajadores, copia la cuadrilla de la misma
     tarea (misma finca y mismo nombre) del día anterior.
   - Avisa por Telegram de lo copiado y de los trabajadores sin tarea hoy.

El repositorio es público: no se escriben nombres ni datos en el registro.
"""

import datetime as dt
import html
import os
import sys
import unicodedata
from zoneinfo import ZoneInfo

import google.auth
import google.auth.transport.requests
import requests

PROJECT = "pizarra-de-tareas-semanales"
APP_ID = "ecologicos-almeria-v1"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"
ROOT = f"{BASE}/artifacts/{APP_ID}"
TZ = ZoneInfo("Europe/Madrid")
HORA_ENTRADA_DEFECTO = "08:00"
MINUTOS_ANTES = 30
# Si GitHub se retrasa mucho, no mandar un aviso pasado este margen tras la entrada.
MARGEN_MAXIMO = dt.timedelta(hours=3)

# Solo se conectan a Telegram estas cuentas (las mismas de firestore.rules).
CUENTAS_AVISOS = {
    "seq3CISgWIdOMnRGH2QAXvSHDyw1",  # Fran
    "LHagvsoFmJU9jHOV9TilSCY81r92",  # hermano de Fran
}

TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG = f"https://api.telegram.org/bot{TG_TOKEN}"


# ---------- Firestore (REST) ----------

def sesion():
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/datastore"])
    creds.refresh(google.auth.transport.requests.Request())
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {creds.token}"
    return s


def a_python(v):
    if "stringValue" in v:
        return v["stringValue"]
    if "integerValue" in v:
        return int(v["integerValue"])
    if "doubleValue" in v:
        return v["doubleValue"]
    if "booleanValue" in v:
        return v["booleanValue"]
    if "nullValue" in v:
        return None
    if "arrayValue" in v:
        return [a_python(x) for x in v["arrayValue"].get("values", [])]
    if "mapValue" in v:
        return {k: a_python(x) for k, x in v["mapValue"].get("fields", {}).items()}
    return None


def a_firestore(x):
    if x is None:
        return {"nullValue": None}
    if isinstance(x, bool):
        return {"booleanValue": x}
    if isinstance(x, int):
        return {"integerValue": str(x)}
    if isinstance(x, float):
        return {"doubleValue": x}
    if isinstance(x, list):
        return {"arrayValue": {"values": [a_firestore(i) for i in x]}}
    if isinstance(x, dict):
        return {"mapValue": {"fields": {k: a_firestore(i) for k, i in x.items()}}}
    return {"stringValue": str(x)}


def doc_a_dict(d):
    out = {k: a_python(v) for k, v in d.get("fields", {}).items()}
    out["id"] = d["name"].rsplit("/", 1)[-1]
    return out


def leer_coleccion(s, nombre):
    docs, token = [], None
    while True:
        params = {"pageSize": 300}
        if token:
            params["pageToken"] = token
        r = s.get(f"{ROOT}/{nombre}", params=params)
        r.raise_for_status()
        j = r.json()
        docs += [doc_a_dict(d) for d in j.get("documents", [])]
        token = j.get("nextPageToken")
        if not token:
            return docs


def leer_doc(s, ruta):
    r = s.get(f"{ROOT}/{ruta}")
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return doc_a_dict(r.json())


def actualizar_doc(s, ruta, campos):
    params = [("updateMask.fieldPaths", k) for k in campos]
    body = {"fields": {k: a_firestore(v) for k, v in campos.items()}}
    r = s.patch(f"{ROOT}/{ruta}", params=params, json=body)
    r.raise_for_status()


# ---------- Telegram ----------

def tg(metodo, **datos):
    r = requests.post(f"{TG}/{metodo}", json=datos, timeout=30)
    j = r.json()
    if not j.get("ok"):
        raise RuntimeError(f"Telegram {metodo}: {j.get('description')}")
    return j["result"]


def conectar_telegram(s, config):
    """Guarda el chat de quien ha pulsado 'Iniciar' con un código válido de la app."""
    yo = tg("getMe")
    if config.get("botUsername") != yo["username"]:
        actualizar_doc(s, "config/general", {"botUsername": yo["username"]})

    offset = int(config.get("telegramOffset") or 0)
    updates = tg("getUpdates", offset=offset, timeout=0, allowed_updates=["message"])
    if not updates:
        return
    pendientes = {
        a["code"]: a for a in leer_coleccion(s, "avisos")
        if a.get("code") and a["id"] in CUENTAS_AVISOS
    }
    for u in updates:
        msg = u.get("message") or {}
        texto = (msg.get("text") or "").strip()
        chat = (msg.get("chat") or {}).get("id")
        if not texto.startswith("/start") or not chat:
            continue
        code = texto[len("/start"):].strip()
        aviso = pendientes.get(code)
        if aviso:
            actualizar_doc(s, f"avisos/{aviso['id']}", {"chatId": chat, "code": None})
            tg("sendMessage", chat_id=chat, text="✅ Listo. Aquí te llegarán los avisos de la Pizarra de Tareas.")
            print("Telegram conectado para una cuenta.")
        else:
            tg("sendMessage", chat_id=chat, text="Para conectarte usa el botón «Conectar mi Telegram» en Ajustes > Avisos de la app.")
    actualizar_doc(s, "config/general", {"telegramOffset": updates[-1]["update_id"] + 1})


# ---------- Cuadrillas ----------

def normalizar(texto):
    t = unicodedata.normalize("NFKD", (texto or "").strip().lower())
    return " ".join("".join(c for c in t if not unicodedata.combining(c)).split())


def fecha_tarea(t):
    return t.get("targetDateStr") or t.get("dateString") or ""


def copiar_cuadrillas(board, history, workers_ids, hoy, ayer):
    """Devuelve [(tarea_hoy, [workerIds])] con las cuadrillas a copiar."""
    tareas_hoy = sorted((t for t in board if fecha_tarea(t) == hoy), key=lambda t: t.get("order") or 0)
    # Las tareas de ayer pueden estar ya en el histórico o seguir en la pizarra
    # (si nadie ha abierto la app desde ayer).
    ayer_por_id = {}
    for t in history:
        if t.get("snapshotDate") == ayer:
            ayer_por_id[t.get("id", "").split("_", 1)[-1]] = t
    for t in board:
        if fecha_tarea(t) == ayer:
            ayer_por_id.setdefault(t["id"], t)

    grupos = {}
    for t in sorted(ayer_por_id.values(), key=lambda t: t.get("order") or 0):
        equipo = [w for w in (t.get("workerIds") or t.get("finalWorkers") or []) if w in workers_ids]
        if equipo:
            grupos.setdefault((t.get("fincaId"), normalizar(t.get("description"))), []).append(equipo)

    copias, usados = [], {}
    for t in tareas_hoy:
        if t.get("workerIds"):
            continue
        clave = (t.get("fincaId"), normalizar(t.get("description")))
        opciones = grupos.get(clave)
        if not opciones:
            continue
        i = usados.get(clave, 0)
        copias.append((t, opciones[min(i, len(opciones) - 1)]))
        usados[clave] = i + 1
    return tareas_hoy, copias


def hora_aviso(config, ahora):
    texto = config.get("horaEntrada") or HORA_ENTRADA_DEFECTO
    hh, mm = (int(x) for x in texto.split(":"))
    entrada = ahora.replace(hour=hh, minute=mm, second=0, microsecond=0)
    return entrada - dt.timedelta(minutes=MINUTOS_ANTES), entrada


def main():
    forzar = "--forzar" in sys.argv
    s = sesion()
    config = leer_doc(s, "config/general") or {}

    if not TG_TOKEN:
        print("Falta el secreto TELEGRAM_BOT_TOKEN: no se hace nada hasta configurarlo.")
        return
    conectar_telegram(s, config)
    config = leer_doc(s, "config/general") or {}
    if not any(a.get("chatId") for a in leer_coleccion(s, "avisos") if a["id"] in CUENTAS_AVISOS):
        print("Nadie ha conectado su Telegram todavía: no se copian cuadrillas.")
        return

    ahora = dt.datetime.now(TZ)
    hoy = ahora.date().isoformat()
    ayer = (ahora.date() - dt.timedelta(days=1)).isoformat()
    aviso, entrada = hora_aviso(config, ahora)

    if not forzar:
        if config.get("ultimoAviso") == hoy:
            print("El aviso de hoy ya se hizo.")
            return
        if ahora < aviso:
            print("Todavía no es la hora del aviso.")
            return
        if ahora > entrada + MARGEN_MAXIMO:
            print("Demasiado tarde para el aviso de hoy.")
            actualizar_doc(s, "config/general", {"ultimoAviso": hoy})
            return

    board = leer_coleccion(s, "board")
    history = leer_coleccion(s, "history")
    workers = leer_coleccion(s, "workers")
    fincas = {f["id"]: f for f in leer_coleccion(s, "fincas")}
    nombres = {w["id"]: w.get("name", "?") for w in workers}

    tareas_hoy, copias = copiar_cuadrillas(board, history, set(nombres), hoy, ayer)
    for t, equipo in copias:
        actualizar_doc(s, f"board/{t['id']}", {"workerIds": equipo, "cuadrillaCopiadaDe": ayer})
        t["workerIds"] = equipo
    print(f"Tareas hoy: {len(tareas_hoy)}. Cuadrillas copiadas: {len(copias)}.")

    sin_tarea = []
    if tareas_hoy:
        asignados = {w for t in tareas_hoy for w in (t.get("workerIds") or [])}
        sin_tarea = sorted((n for i, n in nombres.items() if i not in asignados), key=normalizar)

    actualizar_doc(s, "config/general", {"ultimoAviso": hoy})

    if not tareas_hoy or (not copias and not sin_tarea):
        print("Nada que avisar hoy.")
        return

    def etiqueta(t):
        finca = fincas.get(t.get("fincaId"), {}).get("name", "?")
        return f"{html.escape(t.get('description') or '?')} ({html.escape(finca)})"

    dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    lineas = [f"📋 <b>Tareas de hoy, {dias[ahora.weekday()]} {ahora.day}</b>"]
    if copias:
        lineas.append("\n🔁 <b>Cuadrilla copiada de ayer:</b>")
        for t, equipo in copias:
            lineas.append(f"• {etiqueta(t)}: {html.escape(', '.join(nombres[w] for w in equipo))}")
    if sin_tarea:
        lineas.append("\n⚠️ <b>Sin tarea asignada hoy:</b> " + html.escape(", ".join(sin_tarea)))
    texto = "\n".join(lineas)

    enviados = 0
    for a in leer_coleccion(s, "avisos"):
        if a["id"] in CUENTAS_AVISOS and a.get("chatId"):
            tg("sendMessage", chat_id=a["chatId"], text=texto, parse_mode="HTML")
            enviados += 1
    print(f"Avisos enviados: {enviados}.")


if __name__ == "__main__":
    main()
