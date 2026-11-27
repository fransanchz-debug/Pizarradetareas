"""Sincronización de trabajadores con appero (altas y bajas), SIN red: appero, Firestore y las notificaciones son simulados.
Necesita: pip install pywebpush google-auth requests"""
import os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "avisos"))
os.environ.setdefault("VAPID_PRIVATE_KEY", "x")
import main as A

fallos = 0
def comprobar(ok, texto):
    global fallos; fallos += (not ok); print(("  ✓ " if ok else "  ✗ ") + texto)

# ---- Firestore y avisos simulados
docs, config, avisos, cuentas, escrituras = {}, {}, [], [], []
def leer_coleccion(s, n): return [{**d, "id": i} for i, d in docs.items()] if n == "workers" else []
def actualizar_doc(s, ruta, campos):
    escrituras.append((ruta, campos))
    if ruta == "config/general": config.update(campos)
    elif ruta.startswith("workers/"): docs.setdefault(ruta.split("/")[1], {}).update(campos)
A.leer_coleccion, A.actualizar_doc = leer_coleccion, actualizar_doc
A.enviar = lambda s, texto, etiqueta="aviso", urgente=False: avisos.append((etiqueta, texto))
A.cuenta_espejo = lambda uid, activa: cuentas.append((uid, activa))

def reiniciar():
    docs.clear(); config.clear(); avisos.clear(); cuentas.clear(); escrituras.clear()
    docs.update({"p1": {"name": "Ana"}, "p2": {"name": "Beto"}, "p3": {"name": "Mory", "uidEspejo": "UID3"}, "p4": {"name": "Omar", "activo": False}})
def lista(**kw):
    base = [("U1", "Ana Lopez", True, "p1"), ("U2", "Beto", True, "p2"), ("U3", "Mory D", True, "p3"), ("U4", "Omar", False, None)]
    return [{"id": i, "nombre": n, "activo": kw.get(i, a), "id_pizarra": p} for i, n, a, p in base]

print("1) altas, bajas, vínculos y cuenta de la espejo")
reiniciar()
l = lista(U2=False, U3=False, U4=True) + [{"id": "U5", "nombre": "Nuevo", "activo": True, "id_pizarra": None}]
A.sincronizar_trabajadores(None, config, l)
comprobar(docs["p1"]["agricolaId"] == "U1" and docs["p1"]["name"] == "Ana", "Ana se vincula y su nombre NO cambia («Ana Lopez» no la renombra)")
comprobar(docs["p2"]["activo"] is False and docs["p3"]["activo"] is False, "Beto y Mory quedan de baja")
comprobar(docs["U5"]["name"] == "Nuevo" and docs["U5"]["activo"] is True and docs["U5"]["agricolaId"] == "U5", "el alta nueva se crea con el identificador de appero")
comprobar(docs["p4"]["activo"] is True and "U4" not in docs, "Omar (ya existía de baja) se reactiva y NO se duplica")
comprobar(cuentas == [("UID3", False)] and docs["p3"]["espejoDeshabilitada"] is True, "la cuenta de la espejo de Mory se desactiva")
comprobar(not avisos and config.get("ultimaSyncTrabajadores"), "sin avisos y se anota la última sincronización")

print("2) repetir la sincronización no cambia nada")
cuentas.clear(); escrituras.clear(); A.sincronizar_trabajadores(None, config, l)
comprobar(not cuentas and [e for e in escrituras if e[0].startswith("workers/")] == [], "sin escrituras en trabajadores ni llamadas a cuentas")

print("3) vuelve a trabajar: se reactiva y la cuenta de la espejo también")
A.sincronizar_trabajadores(None, config, lista(U3=True, U4=True, U2=False))
comprobar(docs["p3"]["activo"] is True and cuentas == [("UID3", True)] and docs["p3"]["espejoDeshabilitada"] is False, "Mory reactivado y su cuenta activada")

print("4) un trabajador que desaparece de appero pasa a baja (nunca se borra)")
reiniciar(); A.sincronizar_trabajadores(None, config, lista())
l2 = [x for x in lista() if x["id"] != "U1"]
A.sincronizar_trabajadores(None, config, l2)
comprobar(docs["p1"]["activo"] is False and "p1" in docs, "Ana desaparece de la lista → baja, y su ficha sigue existiendo")

print("5) freno de seguridad: demasiadas bajas de golpe no se aplican")
reiniciar(); docs.update({"p5": {"name": "Eva"}, "p6": {"name": "Hugo"}})
base = lista()
A.sincronizar_trabajadores(None, config, base + [{"id": "U6", "nombre": "Eva", "activo": True, "id_pizarra": "p5"}, {"id": "U7", "nombre": "Hugo", "activo": True, "id_pizarra": "p6"}])
avisos.clear(); escrituras.clear()
todos_baja = [{**x, "activo": False} for x in base] + [{"id": "U6", "nombre": "Eva", "activo": False, "id_pizarra": "p5"}, {"id": "U7", "nombre": "Hugo", "activo": False, "id_pizarra": "p6"}]
A.sincronizar_trabajadores(None, config, todos_baja)
comprobar(all(docs[i].get("activo") is not False for i in ("p1", "p2", "p3", "p5", "p6")), "no se da de baja a nadie")
comprobar(len(avisos) == 1 and avisos[0][0] == "sync-freno", "se avisa una vez")
A.sincronizar_trabajadores(None, config, todos_baja)
comprobar(len(avisos) == 1, "y no se repite el aviso el mismo día")
print("5b) una lista vacía o rara se rechaza")
import requests
class R:
    def __init__(s, j): s.j = j
    def raise_for_status(s): pass
    def json(s): return s.j
for raro in ({"trabajadores": []}, {"trabajadores": [{"id": "x"}]}, {}):
    requests.get = lambda *a, **k: R(raro)
    try: A.leer_appero(); comprobar(False, f"se aceptó {raro}")
    except ValueError: comprobar(True, f"rechazada: {raro}")

print("6) si appero no responde, no se toca nada y se avisa pasada una hora")
reiniciar(); antes = {i: dict(d) for i, d in docs.items()}
def falla(): raise ConnectionError("sin conexión")
A.leer_appero = falla
config["ultimaSyncTrabajadores"] = int(time.time() * 1000) - 5 * 60000
A.sincronizar_trabajadores(None, config)
comprobar(docs == antes and not avisos, "hace 5 min: no cambia nada y no avisa")
config["ultimaSyncTrabajadores"] = int(time.time() * 1000) - 2 * 3600000
A.sincronizar_trabajadores(None, config); A.sincronizar_trabajadores(None, config)
comprobar(docs == antes and [a[0] for a in avisos] == ["sync-caida"], "hace 2 h: no cambia nada y avisa UNA vez")

print("7) aviso de «de baja pero asignado»")
d = object.__new__(A.Datos)
d.nombres = {"a": "Ana", "b": "Beto"}; d.activos = {"a"}
d.board = [{"id": "t1", "workerIds": ["a", "b"], "targetDateStr": "2026-11-30"}, {"id": "t2", "workerIds": ["b"], "targetDateStr": "2026-12-02"}, {"id": "t3", "workerIds": ["b"], "targetDateStr": "2026-11-20"}]
l7 = d.lineas_baja("2026-11-28")
comprobar(len(l7) == 1 and "Beto (2 tareas, desde el 30/11)" in l7[0] and "Ana" not in l7[0], f"{l7[0].strip()}")
comprobar(d.lineas_baja("2026-12-05") == [], "sin tareas futuras no avisa")
print("\nRESULTADO:", "TODO BIEN" if not fallos else f"{fallos} FALLOS"); sys.exit(1 if fallos else 0)
