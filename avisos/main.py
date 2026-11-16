"""Avisos diarios de la Pizarra de Tareas.

Lo ejecuta Google Cloud Scheduler cada 5 minutos (función de Cloud Run "avisos").
También se puede lanzar a mano desde GitHub Actions (.github/workflows/avisos.yml).

1. Conecta los Telegram de Fran y su hermano (mensajes "/start <código>" que
   genera la app en Ajustes > Avisos).
2. 🌙 Recordatorio (22:00 por defecto): cómo está planificado el día siguiente.
   Solo informa.
3. 🚨 Emergencia, unos minutos antes de la entrada (45 por defecto), una vez al día:
   - En las tareas de hoy sin trabajadores, copia la cuadrilla de la misma
     tarea (misma finca y mismo nombre) del día anterior.
   - Avisa por Telegram de lo copiado y de los trabajadores sin tarea hoy.

4. 📤 Al terminar la jornada (15 min después de la salida), envía a la app
   agrícola quién ha estado en qué tarea y finca, para los partes de horas.
   Las faltas apuntadas en la app agrícola no salen como "sin tarea".

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
MINUTOS_ANTES_DEFECTO = 45
# Si GitHub se retrasa mucho, no mandar un aviso pasado este margen tras la entrada.
MARGEN_MAXIMO = dt.timedelta(hours=3)

# Solo se conectan a Telegram estas cuentas (las mismas de firestore.rules).
CUENTAS_AVISOS = {
    "seq3CISgWIdOMnRGH2QAXvSHDyw1",  # Fran
    "LHagvsoFmJU9jHOV9TilSCY81r92",  # hermano de Fran
}

TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
AGRI_URL = "https://pykqyjynvtgstqzgnilu.supabase.co/functions/v1/recibir-pizarra"
AGRI_KEY = os.environ.get("GESTION_AGRICOLA_CLAVE", "").strip()
HORA_SALIDA_DEFECTO = "17:00"
DESCANSO_DEFECTO = 30
MINUTOS_TRAS_SALIDA = 15
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


DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
HORA_RECORDATORIO_DEFECTO = "22:00"
MARGEN_RECORDATORIO = dt.timedelta(hours=2)


def a_hora(ahora, texto):
    hh, mm = (int(x) for x in texto.split(":"))
    return ahora.replace(hour=hh, minute=mm, second=0, microsecond=0)


def hora_aviso(config, ahora):
    entrada = a_hora(ahora, config.get("horaEntrada") or HORA_ENTRADA_DEFECTO)
    antes = int(config.get("minutosAntes") or MINUTOS_ANTES_DEFECTO)
    return entrada - dt.timedelta(minutes=antes), entrada


def toca(config, clave, desde, hasta, ahora, hoy, s):
    """True si ahora está en [desde, hasta] y hoy todavía no se ha hecho."""
    if config.get(clave) == hoy or ahora < desde:
        return False
    if ahora > hasta:
        actualizar_doc(s, "config/general", {clave: hoy})  # se pasó la hora: no avisar tarde
        return False
    return True


class Datos:
    def __init__(self, s):
        self.board = leer_coleccion(s, "board")
        self.history = leer_coleccion(s, "history")
        self.fincas = {f["id"]: f for f in leer_coleccion(s, "fincas")}
        self.nombres = {w["id"]: w.get("name", "?") for w in leer_coleccion(s, "workers")}

    def etiqueta(self, t):
        finca = self.fincas.get(t.get("fincaId"), {}).get("name", "?")
        return f"{html.escape(t.get('description') or '?')} ({html.escape(finca)})"

    def equipo(self, ids):
        return html.escape(", ".join(self.nombres[w] for w in ids if w in self.nombres))

    def sin_tarea(self, tareas, extra_ids=(), faltan=()):
        asignados = {w for t in tareas for w in (t.get("workerIds") or [])} | set(extra_ids) | set(faltan)
        return sorted((n for i, n in self.nombres.items() if i not in asignados), key=normalizar)

    def faltas(self, fecha):
        """{id_pizarra: motivo} de quien está apuntado como ausente en la app agrícola."""
        if not AGRI_KEY:
            return {}
        try:
            r = requests.get(AGRI_URL, params={"ausencias": fecha}, headers={"x-clave": AGRI_KEY}, timeout=30)
            r.raise_for_status()
            lista = r.json()
        except Exception as e:  # si falla, se avisa como antes
            print(f"No se pudieron leer las faltas: {type(e).__name__}")
            return {}
        por_nombre = {normalizar(n): i for i, n in self.nombres.items()}
        out = {}
        for a in lista if isinstance(lista, list) else []:
            i = a.get("id") if a.get("id") in self.nombres else por_nombre.get(normalizar(a.get("nombre")))
            if i:
                out[i] = a.get("motivo") or ""
        return out

    def texto_faltas(self, faltan):
        return html.escape(", ".join(
            self.nombres[i] + (f" ({m})" if m else "") for i, m in sorted(faltan.items(), key=lambda x: normalizar(self.nombres[x[0]]))))


def enviar(s, texto):
    enviados = 0
    for a in leer_coleccion(s, "avisos"):
        if a["id"] in CUENTAS_AVISOS and a.get("chatId"):
            tg("sendMessage", chat_id=a["chatId"], text=texto, parse_mode="HTML")
            enviados += 1
    print(f"Avisos enviados: {enviados}.")


def recordatorio(s, dia):
    """Cómo está planificado `dia` (normalmente mañana). Solo informa."""
    d = Datos(s)
    fecha, anterior = dia.isoformat(), (dia - dt.timedelta(days=1)).isoformat()
    tareas, copias = copiar_cuadrillas(d.board, d.history, set(d.nombres), fecha, anterior)
    se_copian = {t["id"] for t, _ in copias}
    sin_cuadrilla = [t for t in tareas if not t.get("workerIds") and t["id"] not in se_copian]
    print(f"Recordatorio: {len(tareas)} tareas, {len(copias)} se copiarán, {len(sin_cuadrilla)} sin cuadrilla.")

    lineas = [f"🌙 <b>Recordatorio: {DIAS[dia.weekday()]} {dia.day}</b>"]
    if not tareas:
        lineas.append("\n⚠️ No hay ninguna tarea planificada.")
    else:
        if copias:
            lineas.append("\n🔁 <b>Se copiará la cuadrilla del día anterior:</b>")
            lineas += [f"• {d.etiqueta(t)}: {d.equipo(eq)}" for t, eq in copias]
        if sin_cuadrilla:
            lineas.append("\n❗ <b>Tareas sin cuadrilla:</b>")
            lineas += [f"• {d.etiqueta(t)}" for t in sin_cuadrilla]
        faltan = d.faltas(fecha)
        copias = [(t, [w for w in eq if w not in faltan]) for t, eq in copias]
        sin_tarea = d.sin_tarea(tareas, [w for _, eq in copias for w in eq], faltan)
        if sin_tarea:
            lineas.append("\n⚠️ <b>Sin tarea asignada:</b> " + html.escape(", ".join(sin_tarea)))
        if faltan:
            lineas.append("\n🏠 <b>Faltan:</b> " + d.texto_faltas(faltan))
        if not copias and not sin_cuadrilla and not sin_tarea:
            lineas.append("\n✅ Todo asignado.")
    enviar(s, "\n".join(lineas))


def emergencia(s, dia):
    """Antes de entrar: copia las cuadrillas que falten y avisa si queda algo pendiente."""
    d = Datos(s)
    fecha, anterior = dia.isoformat(), (dia - dt.timedelta(days=1)).isoformat()
    tareas, copias = copiar_cuadrillas(d.board, d.history, set(d.nombres), fecha, anterior)
    faltan = d.faltas(fecha) if tareas else {}
    copias = [(t, [w for w in eq if w not in faltan]) for t, eq in copias]
    copias = [(t, eq) for t, eq in copias if eq]
    for t, eq in copias:
        actualizar_doc(s, f"board/{t['id']}", {"workerIds": eq, "cuadrillaCopiadaDe": anterior})
        t["workerIds"] = eq
    print(f"Emergencia: {len(tareas)} tareas, {len(copias)} cuadrillas copiadas.")
    if not tareas:
        print("Hoy no hay tareas: no se avisa.")
        return
    sin_cuadrilla = [t for t in tareas if not t.get("workerIds")]
    sin_tarea = d.sin_tarea(tareas, faltan=faltan)
    if not copias and not sin_cuadrilla and not sin_tarea:
        print("Todo en orden: no se avisa.")
        return

    lineas = [f"🚨 <b>Antes de entrar: {DIAS[dia.weekday()]} {dia.day}</b>"]
    if copias:
        lineas.append("\n🔁 <b>Cuadrilla copiada de ayer:</b>")
        lineas += [f"• {d.etiqueta(t)}: {d.equipo(eq)}" for t, eq in copias]
    if sin_cuadrilla:
        lineas.append("\n❗ <b>Tareas sin cuadrilla:</b>")
        lineas += [f"• {d.etiqueta(t)}" for t in sin_cuadrilla]
    if sin_tarea:
        lineas.append("\n⚠️ <b>Sin tarea asignada hoy:</b> " + html.escape(", ".join(sin_tarea)))
    if faltan:
        lineas.append("\n🏠 <b>Faltan hoy:</b> " + d.texto_faltas(faltan))
    enviar(s, "\n".join(lineas))


def jornada(config):
    entrada = config.get("horaEntrada") or HORA_ENTRADA_DEFECTO
    salida = config.get("horaSalida") or HORA_SALIDA_DEFECTO
    descanso = int(config.get("descansoMin") if config.get("descansoMin") is not None else DESCANSO_DEFECTO)
    (h1, m1), (h2, m2) = ((int(x) for x in t.split(":")) for t in (entrada, salida))
    horas = round(((h2 * 60 + m2) - (h1 * 60 + m1) - descanso) / 60, 2)
    return {"entrada": entrada, "salida": salida, "descanso_min": descanso, "horas": horas}


def enviar_agricola(s, config, dia):
    """Manda a la app agrícola quién ha estado en qué tarea y finca ese día."""
    d = Datos(s)
    fecha = dia.isoformat()
    tareas = {}
    for t in d.history:
        if t.get("snapshotDate") == fecha:
            tareas[t.get("id", "").split("_", 1)[-1]] = t
    for t in d.board:
        if fecha_tarea(t) == fecha:
            tareas[t["id"]] = t
    if not tareas:
        print("Envío a la app agrícola: hoy no hay tareas.")
        return
    por_trabajador = {}
    for t in sorted(tareas.values(), key=lambda t: t.get("order") or 0):
        finca = d.fincas.get(t.get("fincaId"), {}).get("name", "")
        for w in t.get("workerIds") or []:
            if w in d.nombres:
                por_trabajador.setdefault(w, []).append({"finca": finca, "tarea": t.get("description") or ""})
    cuerpo = {
        "fecha": fecha,
        "jornada": jornada(config),
        "trabajadores": [{"id": i, "nombre": d.nombres[i], "tareas": ts} for i, ts in por_trabajador.items()],
        "sin_tarea": [{"id": i, "nombre": n} for i, n in d.nombres.items() if i not in por_trabajador],
    }
    r = requests.post(AGRI_URL, json=cuerpo, headers={"x-clave": AGRI_KEY}, timeout=60)
    r.raise_for_status()
    res = r.json()
    print(f"Envío a la app agrícola: {len(por_trabajador)} trabajadores, respuesta partes={res.get('partes')}.")
    problemas = []
    if res.get("trabajadores_sin_emparejar"):
        problemas.append("👤 <b>Trabajadores que no reconoce:</b> " + html.escape(", ".join(map(str, res["trabajadores_sin_emparejar"]))))
    if res.get("fincas_sin_emparejar"):
        problemas.append("🌱 <b>Fincas que no reconoce:</b> " + html.escape(", ".join(map(str, res["fincas_sin_emparejar"]))))
    if res.get("fincas_sin_cultivo_ese_dia"):
        problemas.append("📅 <b>Fincas sin cultivo en curso ese día:</b> " + html.escape(", ".join(map(str, res["fincas_sin_cultivo_ese_dia"]))))
    if problemas:
        enviar(s, f"📤 <b>Horas del {DIAS[dia.weekday()]} {dia.day} enviadas a la app agrícola</b>, pero hay que revisar:\n\n" + "\n".join(problemas))


def main(forzar_emergencia=False, forzar_recordatorio=False, forzar_envio=False):
    s = sesion()
    config = leer_doc(s, "config/general") or {}

    if not TG_TOKEN:
        print("Falta el secreto TELEGRAM_BOT_TOKEN: no se hace nada hasta configurarlo.")
        return
    conectar_telegram(s, config)
    config = leer_doc(s, "config/general") or {}
    if not any(a.get("chatId") for a in leer_coleccion(s, "avisos") if a["id"] in CUENTAS_AVISOS):
        print("Nadie ha conectado su Telegram todavía: no se hace nada.")
        return

    ahora = dt.datetime.now(TZ)
    hoy = ahora.date().isoformat()

    # 🚨 Emergencia: X minutos antes de la entrada de hoy.
    aviso, entrada = hora_aviso(config, ahora)
    if forzar_emergencia or toca(config, "ultimoAviso", aviso, entrada + MARGEN_MAXIMO, ahora, hoy, s):
        emergencia(s, ahora.date())
        actualizar_doc(s, "config/general", {"ultimoAviso": hoy})

    # 📤 Envío a la app agrícola: 15 minutos después de la salida.
    if AGRI_KEY:
        salida = a_hora(ahora, config.get("horaSalida") or HORA_SALIDA_DEFECTO) + dt.timedelta(minutes=MINUTOS_TRAS_SALIDA)
        if forzar_envio or toca(config, "ultimoEnvioAgricola", salida, salida + dt.timedelta(hours=6), ahora, hoy, s):
            try:
                enviar_agricola(s, config, ahora.date())
            except Exception as e:
                print(f"Error al enviar a la app agrícola: {type(e).__name__}")
                if config.get("errorEnvioAgricola") != hoy:  # avisar una sola vez al día
                    enviar(s, "⚠️ No se han podido enviar hoy las horas a la app agrícola. Se sigue reintentando cada 5 minutos.")
                    actualizar_doc(s, "config/general", {"errorEnvioAgricola": hoy})
                raise
            actualizar_doc(s, "config/general", {"ultimoEnvioAgricola": hoy})

    # 🌙 Recordatorio: a su hora; si es por la tarde/noche, habla del día siguiente.
    hora_r = a_hora(ahora, config.get("horaRecordatorio") or HORA_RECORDATORIO_DEFECTO)
    if forzar_recordatorio or toca(config, "ultimoRecordatorio", hora_r, hora_r + MARGEN_RECORDATORIO, ahora, hoy, s):
        dia = ahora.date() + dt.timedelta(days=1 if hora_r.hour >= 12 else 0)
        recordatorio(s, dia)
        actualizar_doc(s, "config/general", {"ultimoRecordatorio": hoy})


def avisos(request):
    """Punto de entrada de la función de Google Cloud (la llama Cloud Scheduler)."""
    main()
    return "ok"


if __name__ == "__main__":
    main(forzar_emergencia="--forzar" in sys.argv, forzar_recordatorio="--recordatorio" in sys.argv,
         forzar_envio="--enviar-agricola" in sys.argv)
