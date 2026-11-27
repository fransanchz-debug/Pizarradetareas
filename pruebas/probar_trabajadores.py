"""Trabajadores de baja en la función de avisos: no se copian en cuadrillas, no salen como «sin tarea» ni en el
envío a la app agrícola, pero su nombre se conserva. Necesita: pip install pywebpush google-auth requests"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "avisos"))
os.environ.setdefault("VAPID_PRIVATE_KEY", "x")
import main as A

fallos = 0
def comprobar(ok, texto):
    global fallos; fallos += (not ok); print(("  ✓ " if ok else "  ✗ ") + texto)

d = object.__new__(A.Datos)
d.nombres = {"a": "Ana", "b": "Baja", "c": "Carlos"}
d.activos = {"a", "c"}
print("1) «sin tarea» solo cuenta a los activos")
comprobar(d.sin_tarea([{"workerIds": ["a"]}]) == ["Carlos"], f"sin tarea = {d.sin_tarea([{'workerIds': ['a']}])}")
comprobar(d.equipo(["b"]) == "Baja", "el nombre del de baja se conserva")

print("2) copiar la cuadrilla de ayer no lleva a nadie de baja")
ayer = {"id": "t1", "fincaId": "F", "description": "Liar", "targetDateStr": "2026-11-16", "workerIds": ["a", "b", "c"]}
hoy = {"id": "t2", "fincaId": "F", "description": "liar", "targetDateStr": "2026-11-17", "workerIds": []}
_, copias = A.copiar_cuadrillas([ayer, hoy], [], d.activos, "2026-11-17", "2026-11-16")
comprobar(len(copias) == 1 and copias[0][1] == ["a", "c"], f"cuadrilla copiada = {[c[1] for c in copias]}")
_, copias2 = A.copiar_cuadrillas([{**ayer, "workerIds": ["b"]}, hoy], [], d.activos, "2026-11-17", "2026-11-16")
comprobar(copias2 == [], "si ayer solo estaba el de baja, no se copia nada")
print("\nRESULTADO:", "TODO BIEN" if not fallos else f"{fallos} FALLOS"); sys.exit(1 if fallos else 0)
