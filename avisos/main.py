"""Avisos diarios de la Pizarra de Tareas.

Lo ejecuta Google Cloud Scheduler cada 5 minutos (función de Cloud Run "avisos").
También se puede lanzar a mano desde GitHub Actions (.github/workflows/avisos.yml).

1. Confirma los dispositivos nuevos (notificaciones push que cada uno activa en
   Ajustes > Avisos de la app) con un primer aviso.
2. 🌙 Recordatorio (22:00 por defecto): cómo está planificado el día siguiente.
   Solo informa.
3. 🚨 Emergencia, unos minutos antes de la entrada (45 por defecto), una vez al día:
   - En las tareas de hoy sin trabajadores, copia la cuadrilla de la misma
     tarea (misma finca y mismo nombre) del día anterior.
   - Avisa (notificación push) de lo copiado y de los trabajadores sin tarea hoy.

4. 📤 Al terminar la jornada (15 min después de la salida) y otra vez a las
   23:50 (por si se corrige algo por la noche), envía a la app agrícola quién ha estado en qué tarea y finca, para los partes de horas.
   Las faltas apuntadas en la app agrícola no salen como "sin tarea".

El repositorio es público: no se escriben nombres ni datos en el registro.
"""

import base64
import datetime as dt
import html
import json
import os
import re
import sys
import time
import unicodedata
from zoneinfo import ZoneInfo

import google.auth
import google.auth.transport.requests
import requests
from py_vapid import Vapid02  # firma moderna (RFC 8292): la exige Apple (iPhone)
from pywebpush import WebPushException, webpush

PROJECT = "pizarra-de-tareas-semanales"
APP_ID = "ecologicos-almeria-v1"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"
ROOT = f"{BASE}/artifacts/{APP_ID}"
TZ = ZoneInfo("Europe/Madrid")
HORA_ENTRADA_DEFECTO = "08:00"
MINUTOS_ANTES_DEFECTO = 45
# Si GitHub se retrasa mucho, no mandar un aviso pasado este margen tras la entrada.
MARGEN_MAXIMO = dt.timedelta(hours=3)

# Solo reciben avisos estas cuentas (las mismas de firestore.rules).
CUENTAS_AVISOS = {
    "seq3CISgWIdOMnRGH2QAXvSHDyw1",  # Fran
    "LHagvsoFmJU9jHOV9TilSCY81r92",  # hermano de Fran
}

PROYECTO_NUM = "669734412138"
URL_APP = "https://fransanchz-debug.github.io/Pizarradetareas/"
# Contacto que exige el estándar de las notificaciones. Genérico a propósito: no se envían datos personales a
# Apple/Google. Si algún día un servicio lo rechaza (error 403 en los registros), cambiarlo aquí.
VAPID_SUB = "mailto:avisos@pizarra-tareas.invalid"
AGRI_URL = "https://pykqyjynvtgstqzgnilu.supabase.co/functions/v1/recibir-pizarra"
AGRI_KEY = os.environ.get("GESTION_AGRICOLA_CLAVE", "").strip()
HORA_SALIDA_DEFECTO = "17:00"
DESCANSO_DEFECTO = 30
MINUTOS_TRAS_SALIDA = 15
HORA_ENVIO_NOCHE = "23:50"  # segundo envío del día, con las correcciones de la tarde


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


# ---------- Notificaciones push (Web Push + VAPID) ----------

_vapid = None


def vapid():
    """Clave privada de las notificaciones: de la función (secreto) o, si se lanza a mano, de Secret Manager."""
    global _vapid
    if _vapid is None:
        pem = os.environ.get("VAPID_PRIVATE_KEY", "")
        if not pem:
            creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            creds.refresh(google.auth.transport.requests.Request())
            r = requests.get(
                f"https://secretmanager.googleapis.com/v1/projects/{PROYECTO_NUM}/secrets/VAPID_PRIVATE_KEY/versions/latest:access",
                headers={"Authorization": "Bearer " + creds.token}, timeout=30)
            r.raise_for_status()
            pem = base64.b64decode(r.json()["payload"]["data"]).decode()
        _vapid = Vapid02.from_pem(pem.encode())
    return _vapid


def aviso_push(sub, titulo, cuerpo, etiqueta, urgente=False):
    datos = json.dumps({"titulo": titulo, "cuerpo": cuerpo, "etiqueta": etiqueta, "url": URL_APP}, ensure_ascii=False)
    webpush(
        subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
        data=datos, vapid_private_key=vapid(), vapid_claims={"sub": VAPID_SUB},  # claims nuevo en cada envío
        ttl=7200 if urgente else 21600, timeout=20, headers={"Urgency": "high" if urgente else "normal"})


def estado_envio(e):
    """'caducado' si el aparato ya no existe (404/410); si no, el código o None."""
    codigo = getattr(getattr(e, "response", None), "status_code", None)
    return "caducado" if codigo in (404, 410) else codigo


def partir(texto):
    """Mensaje con marcas <b> -> (título, cuerpo): la primera línea es el título."""
    limpio = html.unescape(re.sub(r"</?b>", "", texto))
    lineas = [l.rstrip() for l in limpio.split("\n")]
    return lineas[0].strip(), "\n".join(lineas[1:]).strip()


def confirmar_nuevos(s):
    """Primer aviso a cada aparato recién activado (y limpia los que ya no existen)."""
    for a in leer_coleccion(s, "avisos"):
        subs = a.get("subs") or []
        if a["id"] not in CUENTAS_AVISOS or all(x.get("confirmada") for x in subs):
            continue
        nuevas = []
        for sub in subs:
            if not sub.get("confirmada"):
                try:
                    aviso_push(sub, "✅ Notificaciones activadas", "Aquí te llegarán los avisos de la pizarra.", "activadas")
                    sub = {**sub, "confirmada": True}
                except Exception as e:
                    estado = estado_envio(e)
                    if estado == "caducado":
                        print("Aparato caducado: se quita.")
                        continue
                    print(f"No se pudo confirmar un aparato ({estado or type(e).__name__}); se reintentará.")
            nuevas.append(sub)
        actualizar_doc(s, f"avisos/{a['id']}", {"subs": nuevas})


# ---------- Trabajadores: la lista viene de appero (gestión agrícola) ----------
# Altas y bajas se hacen SOLO en appero; la pizarra las copia (solo `activo`; los nombres no se tocan).
# Se activa con config/general.trabajadoresDesdeAppero. Nunca se borra a nadie: una baja es activo=false.

SYNC_MAX_BAJAS = 3   # más bajas de golpe que esto: no se aplican y se avisa (freno de seguridad)
SYNC_CAIDA_MIN = 60  # minutos sin poder leer appero antes de avisar


def leer_appero():
    r = requests.get(AGRI_URL, params={"trabajadores": "1"}, headers={"x-clave": AGRI_KEY}, timeout=30)
    r.raise_for_status()
    lista = r.json().get("trabajadores")
    ok = isinstance(lista, list) and lista and all(
        isinstance(t, dict) and t.get("id") and t.get("nombre") and isinstance(t.get("activo"), bool) for t in lista)
    if not ok:
        raise ValueError("lista de trabajadores vacía o con formato inesperado")
    return lista


def planificar_trabajadores(lista, docs, ahora_ms):
    """Compara la lista de appero con los trabajadores de la pizarra (no escribe nada).
    Devuelve (crear, cambios): crear = trabajadores de appero que faltan; cambios = [(id_doc, {campos})]."""
    por_id = {d["id"]: d for d in docs}
    por_appero = {d["agricolaId"]: d for d in docs if d.get("agricolaId")}
    sin_vincular = {}
    for d in docs:
        if not d.get("agricolaId"):
            sin_vincular.setdefault(normalizar(d.get("name")), d)
    crear, cambios, vistos = [], [], set()
    for t in lista:
        doc = (por_id.get(t.get("id_pizarra")) if t.get("id_pizarra") else None) or por_appero.get(t["id"]) or por_id.get(t["id"])
        if doc is None:  # alguien de la pizarra sin vincular y con el mismo nombre (p. ej. alguien que vuelve): se vincula
            cand = sin_vincular.get(normalizar(t["nombre"]))
            if cand and cand["id"] not in vistos:
                doc = cand
        if doc is None:
            if t["activo"]:
                crear.append(t)
            continue
        vistos.add(doc["id"])
        cambio = {}
        if doc.get("activo") is not False and not t["activo"]:
            cambio = {"activo": False, "bajaEn": ahora_ms}
        elif doc.get("activo") is False and t["activo"]:
            cambio = {"activo": True, "bajaEn": None}
        if doc.get("agricolaId") != t["id"]:
            cambio["agricolaId"] = t["id"]
        if cambio:
            cambios.append((doc["id"], cambio))
    for d in docs:  # vinculados que ya no vienen en la lista (borrados en appero): baja, nunca borrar
        if d["id"] not in vistos and d.get("agricolaId") and d.get("activo") is not False:
            cambios.append((d["id"], {"activo": False, "bajaEn": ahora_ms}))
    return crear, cambios


def cuenta_espejo(uid, activa):
    """Activa o desactiva la cuenta con la que un trabajador entra a la espejo."""
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(google.auth.transport.requests.Request())
    r = requests.post(f"https://identitytoolkit.googleapis.com/v1/projects/{PROYECTO}/accounts:update",
                      headers={"Authorization": "Bearer " + creds.token, "x-goog-user-project": PROYECTO},
                      json={"localId": uid, "disableUser": not activa}, timeout=30)
    r.raise_for_status()


def sincronizar_trabajadores(s, config, lista=None):
    ahora_ms = int(time.time() * 1000)
    hoy = dt.datetime.now(TZ).date().isoformat()
    try:
        lista = lista if lista is not None else leer_appero()
    except Exception as e:  # si falla, la pizarra se queda con la última lista (nunca se da de baja por un error)
        print(f"No se pudo leer appero: {type(e).__name__}")
        ultima = int(config.get("ultimaSyncTrabajadores") or 0)
        if ultima and ahora_ms - ultima > SYNC_CAIDA_MIN * 60000 and config.get("avisoSyncCaido") != hoy:
            enviar(s, "⚠️ <b>No puedo leer los trabajadores de appero</b>\nLlevo más de una hora sin conseguirlo. La pizarra mantiene la última lista.", "sync-caida")
            actualizar_doc(s, "config/general", {"avisoSyncCaido": hoy})
        return
    docs = leer_coleccion(s, "workers")
    crear, cambios = planificar_trabajadores(lista, docs, ahora_ms)
    bajas = [x for x in cambios if x[1].get("activo") is False]
    if len(bajas) > SYNC_MAX_BAJAS:  # freno de seguridad: lo normal es una baja de vez en cuando
        por_id = {d["id"]: d for d in docs}
        print(f"Freno: appero pide {len(bajas)} bajas a la vez; no se aplican.")
        if config.get("avisoSyncBloqueada") != hoy:
            nombres = ", ".join(html.escape(por_id[i].get("name", "?")) for i, _ in bajas)
            enviar(s, f"⚠️ <b>Appero pide dar de baja a {len(bajas)} trabajadores a la vez</b>\n{nombres}\nNo lo he aplicado por seguridad. Si es correcto, avísame.", "sync-freno")
            actualizar_doc(s, "config/general", {"avisoSyncBloqueada": hoy})
        cambios = [x for x in cambios if x not in bajas]
    estado = {d["id"]: dict(d) for d in docs}
    for t in crear:
        campos = {"name": t["nombre"].strip(), "activo": True, "agricolaId": t["id"], "origen": "appero", "createdAt": ahora_ms}
        actualizar_doc(s, f"workers/{t['id']}", campos)
        estado[t["id"]] = {"id": t["id"], **campos}
    for i, c in cambios:
        actualizar_doc(s, f"workers/{i}", c)
        estado[i].update(c)
    # cuentas de la espejo: la de un trabajador de baja se desactiva (y se reactiva si vuelve)
    for d in estado.values():
        if d.get("uidEspejo"):
            deshabilitar = d.get("activo") is False
            if d.get("espejoDeshabilitada") is not deshabilitar:
                try:
                    cuenta_espejo(d["uidEspejo"], not deshabilitar)
                    actualizar_doc(s, f"workers/{d['id']}", {"espejoDeshabilitada": deshabilitar})
                except Exception as e:
                    print(f"No se pudo cambiar la cuenta de la espejo ({type(e).__name__}); se reintentará.")
    actualizar_doc(s, "config/general", {"ultimaSyncTrabajadores": ahora_ms})
    if crear or cambios:
        print(f"Trabajadores sincronizados: {len(crear)} altas, {len(cambios)} cambios.")


def simular_trabajadores():
    """SOLO LEE: escribe en los registros (privados de Google) qué haría la sincronización con la lista real de appero."""
    s = sesion()
    lista = leer_appero()
    docs = leer_coleccion(s, "workers")
    crear, cambios = planificar_trabajadores(lista, docs, int(time.time() * 1000))
    por_id = {d["id"]: d for d in docs}
    nombre = lambda i: por_id[i].get("name", "?")
    bajas = [(i, c) for i, c in cambios if c.get("activo") is False]
    print(f"SIMULACIÓN appero={len(lista)} ({sum(1 for t in lista if t['activo'])} activos) pizarra={len(docs)} ({sum(1 for d in docs if d.get('activo') is not False)} activos)")
    def linea(titulo, nombres):  # una sola línea por resultado (el registro de Google separa los argumentos de print)
        print(f"SIMULACIÓN {titulo} ({len(nombres)}): " + "; ".join(nombres))
    linea("altas nuevas", [t["nombre"] for t in crear])
    linea(f"bajas (el freno salta a partir de {SYNC_MAX_BAJAS + 1})", [nombre(i) for i, _ in bajas])
    linea("reactivaciones", [nombre(i) for i, c in cambios if c.get("activo") is True])
    linea("solo se vinculan", [nombre(i) for i, c in cambios if "activo" not in c])
    linea("nombres distintos (no se tocan)", [
        f"{d.get('name')} <-> {t['nombre']}" for d in docs for t in lista
        if (t.get("id_pizarra") == d["id"] or t["id"] == d.get("agricolaId")) and normalizar(t["nombre"]) != normalizar(d.get("name"))])
    linea("activos en la pizarra que appero no conoce", [
        d.get("name") for d in docs if d.get("activo") is not False
        and not any(t.get("id_pizarra") == d["id"] or t["id"] == d.get("agricolaId") for t in lista)])


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
        trabajadores = leer_coleccion(s, "workers")
        self.nombres = {w["id"]: w.get("name", "?") for w in trabajadores}  # todos (también los de baja): para los nombres
        self.activos = {w["id"] for w in trabajadores if w.get("activo") is not False}  # los que se pueden asignar

    def etiqueta(self, t):
        finca = self.fincas.get(t.get("fincaId"), {}).get("name", "?")
        return f"{html.escape(t.get('description') or '?')} ({html.escape(finca)})"

    def equipo(self, ids):
        return html.escape(", ".join(self.nombres[w] for w in ids if w in self.nombres))

    def sin_tarea(self, tareas, extra_ids=(), faltan=()):
        asignados = {w for t in tareas for w in (t.get("workerIds") or [])} | set(extra_ids) | set(faltan)
        return sorted((n for i, n in self.nombres.items() if i in self.activos and i not in asignados), key=normalizar)

    def lineas_baja(self, desde):
        """Trabajadores de baja que siguen asignados a tareas de `desde` en adelante."""
        por = {}
        for t in self.board:
            f = fecha_tarea(t)
            if f >= desde:
                for i in t.get("workerIds") or []:
                    if i in self.nombres and i not in self.activos:
                        por.setdefault(i, []).append(f)
        if not por:
            return []
        texto = ", ".join(
            f"{self.nombres[i]} ({len(fs)} tarea{'s' if len(fs) > 1 else ''}, desde el {min(fs)[8:10]}/{min(fs)[5:7]})"
            for i, fs in sorted(por.items(), key=lambda x: normalizar(self.nombres[x[0]])))
        return ["\n🚫 <b>De baja pero asignado:</b> " + html.escape(texto)]

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
                out[i] = (a.get("tipo") or "falta", a.get("motivo") or "")
        return out

    def lineas_faltas(self, faltan, hoy=""):
        """Una sola línea «Faltan» con el motivo de cada uno."""
        if not faltan:
            return []
        items = sorted(faltan.items(), key=lambda x: normalizar(self.nombres[x[0]]))
        texto = ", ".join(self.nombres[i] + (f" ({m})" if m else "") for i, (_, m) in items)
        return [f"\n🏠 <b>Faltan{hoy}:</b> " + html.escape(texto)]


def enviar(s, texto, etiqueta="aviso", urgente=False):
    """Manda el mensaje a todos los aparatos de Fran y su hermano; quita los que ya no existen."""
    titulo, cuerpo = partir(texto)
    enviados = 0
    for a in leer_coleccion(s, "avisos"):
        subs = a.get("subs") or []
        if a["id"] not in CUENTAS_AVISOS or not subs:
            continue
        vivas = []
        for sub in subs:
            try:
                aviso_push(sub, titulo, cuerpo, etiqueta, urgente)
                enviados += 1
            except Exception as e:
                estado = estado_envio(e)
                if estado == "caducado":
                    print("Aparato caducado: se quita.")
                    continue
                print(f"No se pudo enviar a un aparato ({estado or type(e).__name__}).")
            vivas.append(sub)
        if len(vivas) != len(subs):
            actualizar_doc(s, f"avisos/{a['id']}", {"subs": vivas})
    print(f"Avisos enviados: {enviados}.")


def recordatorio(s, dia):
    """Cómo está planificado `dia` (normalmente mañana). Solo informa."""
    d = Datos(s)
    fecha, anterior = dia.isoformat(), (dia - dt.timedelta(days=1)).isoformat()
    tareas, copias = copiar_cuadrillas(d.board, d.history, d.activos, fecha, anterior)
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
        lineas += d.lineas_faltas(faltan)
        baja = d.lineas_baja(fecha)
        lineas += baja
        if not copias and not sin_cuadrilla and not sin_tarea and not baja:
            lineas.append("\n✅ Todo asignado.")
    enviar(s, "\n".join(lineas), "recordatorio")


def emergencia(s, dia):
    """Antes de entrar: copia las cuadrillas que falten y avisa si queda algo pendiente."""
    d = Datos(s)
    fecha, anterior = dia.isoformat(), (dia - dt.timedelta(days=1)).isoformat()
    tareas, copias = copiar_cuadrillas(d.board, d.history, d.activos, fecha, anterior)
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
    baja = d.lineas_baja(fecha)
    if not copias and not sin_cuadrilla and not sin_tarea and not baja:
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
    lineas += d.lineas_faltas(faltan, " hoy")
    lineas += baja
    enviar(s, "\n".join(lineas), "emergencia", urgente=True)


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
        "sin_tarea": [{"id": i, "nombre": n} for i, n in d.nombres.items() if i in d.activos and i not in por_trabajador],
    }
    r = requests.post(AGRI_URL, json=cuerpo, headers={"x-clave": AGRI_KEY}, timeout=60)
    r.raise_for_status()
    res = r.json()
    print(f"Envío a la app agrícola: {len(por_trabajador)} trabajadores. Respuesta: partes={res.get('partes')}, "
          f"ya_revisados={res.get('ya_revisados')}, sin emparejar: trabajadores={len(res.get('trabajadores_sin_emparejar') or [])}, "
          f"fincas={len(res.get('fincas_sin_emparejar') or [])}, sin cultivo={len(res.get('fincas_sin_cultivo_ese_dia') or [])}.")
    problemas = []
    if res.get("trabajadores_sin_emparejar"):
        problemas.append("👤 <b>Trabajadores que no reconoce:</b> " + html.escape(", ".join(map(str, res["trabajadores_sin_emparejar"]))))
    if res.get("fincas_sin_emparejar"):
        problemas.append("🌱 <b>Fincas que no reconoce:</b> " + html.escape(", ".join(map(str, res["fincas_sin_emparejar"]))))
    if res.get("fincas_sin_cultivo_ese_dia"):
        problemas.append("📅 <b>Fincas sin cultivo en curso ese día:</b> " + html.escape(", ".join(map(str, res["fincas_sin_cultivo_ese_dia"]))))
    if problemas:
        enviar(s, f"📤 <b>Horas del {DIAS[dia.weekday()]} {dia.day} enviadas a la app agrícola</b>, pero hay que revisar:\n\n" + "\n".join(problemas), "agricola")


def main(forzar_emergencia=False, forzar_recordatorio=False, forzar_envio=False):
    s = sesion()
    config = leer_doc(s, "config/general") or {}

    try:
        confirmar_nuevos(s)  # primer aviso a los aparatos recién activados
    except Exception as e:  # un fallo aquí no debe parar la copia de cuadrillas ni el envío de horas
        print(f"No se pudieron confirmar aparatos nuevos: {type(e).__name__}")
    if config.get("trabajadoresDesdeAppero") and AGRI_KEY:
        try:
            sincronizar_trabajadores(s, config)
        except Exception as e:  # un fallo aquí no debe parar lo demás
            print(f"Error al sincronizar trabajadores: {type(e).__name__}")

    ahora = dt.datetime.now(TZ)
    hoy = ahora.date().isoformat()

    # 🚨 Emergencia: X minutos antes de la entrada de hoy.
    aviso, entrada = hora_aviso(config, ahora)
    if forzar_emergencia or toca(config, "ultimoAviso", aviso, entrada + MARGEN_MAXIMO, ahora, hoy, s):
        emergencia(s, ahora.date())
        actualizar_doc(s, "config/general", {"ultimoAviso": hoy})

    # 📤 Envío a la app agrícola: 15 minutos después de la salida, y otra vez a
    # las 23:50 para que lleguen las correcciones hechas por la noche.
    if AGRI_KEY:
        salida = a_hora(ahora, config.get("horaSalida") or HORA_SALIDA_DEFECTO) + dt.timedelta(minutes=MINUTOS_TRAS_SALIDA)
        noche = a_hora(ahora, HORA_ENVIO_NOCHE)
        for clave, desde, hasta in (("ultimoEnvioAgricola", salida, salida + dt.timedelta(hours=6)),
                                    ("ultimoEnvioNoche", noche, noche + dt.timedelta(minutes=9))):
            if not ((forzar_envio and clave == "ultimoEnvioAgricola") or toca(config, clave, desde, hasta, ahora, hoy, s)):
                continue
            try:
                enviar_agricola(s, config, ahora.date())
            except Exception as e:
                print(f"Error al enviar a la app agrícola: {type(e).__name__}")
                if config.get("errorEnvioAgricola") != hoy:  # avisar una sola vez al día
                    enviar(s, "⚠️ No se han podido enviar hoy las horas a la app agrícola. Se sigue reintentando cada 5 minutos.", "error-agricola")
                    actualizar_doc(s, "config/general", {"errorEnvioAgricola": hoy})
                raise
            actualizar_doc(s, "config/general", {clave: hoy})

    # 🌙 Recordatorio: a su hora; si es por la tarde/noche, habla del día siguiente.
    hora_r = a_hora(ahora, config.get("horaRecordatorio") or HORA_RECORDATORIO_DEFECTO)
    if forzar_recordatorio or toca(config, "ultimoRecordatorio", hora_r, hora_r + MARGEN_RECORDATORIO, ahora, hoy, s):
        dia = ahora.date() + dt.timedelta(days=1 if hora_r.hour >= 12 else 0)
        recordatorio(s, dia)
        actualizar_doc(s, "config/general", {"ultimoRecordatorio": hoy})


def avisos(request):
    """Punto de entrada de la función de Google Cloud (la llama Cloud Scheduler)."""
    if request.args.get("simular_trabajadores"):
        simular_trabajadores()
        return "simulación hecha"
    main()
    return "ok"


if __name__ == "__main__":
    main(forzar_emergencia="--forzar" in sys.argv, forzar_recordatorio="--recordatorio" in sys.argv,
         forzar_envio="--enviar-agricola" in sys.argv)
