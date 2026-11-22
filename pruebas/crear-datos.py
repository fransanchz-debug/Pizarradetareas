"""OPCIONAL. Descarga (SOLO LEE) una copia de los datos REALES de hoy, para ver la app con datos de verdad.
Las pruebas normales (correr-todo.sh) NO la necesitan: usan datos-ejemplo*.json (inventados).
No subir estos archivos a git (están en .gitignore); contienen nombres reales.

Uso (necesita haber iniciado sesión con gcloud en el proyecto pizarra-de-tareas-semanales):
    python3 pruebas/crear-datos.py

Crea, junto a este archivo (y fuera de git, ver .gitignore):
    datos-reales.json  copia de board, history, fincas, workers, catalog y config
    datos-reales-mias.json   lo mismo + tareas personales y lista personal de ejemplo
    datos-reales-fotos.json  lo mismo + una tarea de hoy con 2 fotos de ejemplo
    foto_grande.jpg    foto de muestra grande (para probar la reducción de tamaño)
"""
import json, os, subprocess, sys, requests

PROYECTO = "pizarra-de-tareas-semanales"
RAIZ = f"https://firestore.googleapis.com/v1/projects/{PROYECTO}/databases/(default)/documents/artifacts/ecologicos-almeria-v1"
AQUI = os.path.dirname(os.path.abspath(__file__))

env = {k: v for k, v in os.environ.items() if k != "CLOUDSDK_AUTH_ACCESS_TOKEN"}  # ver HANDOFF.md
token = subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True, env=env).stdout.strip()
if not token.startswith("ya29"):
    sys.exit("No hay sesión de gcloud. Mira HANDOFF.md (apartado «Acceso a Google»).")
s = requests.Session(); s.headers.update({"Authorization": "Bearer " + token, "x-goog-user-project": PROYECTO})

def valor(v):
    for k, f in (("stringValue", str), ("integerValue", int), ("doubleValue", float), ("booleanValue", bool)):
        if k in v: return f(v[k])
    if "nullValue" in v: return None
    if "arrayValue" in v: return [valor(x) for x in v["arrayValue"].get("values", [])]
    if "mapValue" in v: return {k: valor(x) for k, x in v["mapValue"].get("fields", {}).items()}

def doc(d):
    o = {k: valor(v) for k, v in d.get("fields", {}).items()}; o["id"] = d["name"].rsplit("/", 1)[-1]; return o

def coleccion(nombre):
    out, tok = [], None
    while True:
        r = s.get(f"{RAIZ}/{nombre}", params={"pageSize": 300, **({"pageToken": tok} if tok else {})}); r.raise_for_status()
        j = r.json(); out += [doc(d) for d in j.get("documents", [])]; tok = j.get("nextPageToken")
        if not tok: return out

D = {c: coleccion(c) for c in ["board", "fincas", "workers", "catalog", "history"]}
r = s.get(f"{RAIZ}/config/general"); D["config"] = doc(r.json()) if r.ok else {}
json.dump(D, open(f"{AQUI}/datos-reales.json", "w"), ensure_ascii=False)

f = D["fincas"][0]["id"]
M = json.loads(json.dumps(D))
M["tareas"] = [
    {"id": "mia1", "fincaId": f, "description": "Revisar riego", "fecha": "2026-11-17", "dayId": "M", "hecha": False, "notes": "", "fotos": [], "order": 1},
    {"id": "mia2", "fincaId": f, "description": "Llamar al técnico", "fecha": "2026-11-19", "dayId": "J", "hecha": False, "notes": "", "fotos": [], "order": 2},
    {"id": "mia3", "fincaId": f, "description": "Pedir abono", "fecha": "2026-11-18", "dayId": "X", "hecha": True, "notes": "", "fotos": [], "order": 3}]
M["catalogo"] = [{"id": "micat1", "fincaId": f, "description": "Revisar contador de agua", "usos": 3}]
json.dump(M, open(f"{AQUI}/datos-reales-mias.json", "w"), ensure_ascii=False)

P = json.loads(json.dumps(D))
for t in P["board"]:
    if (t.get("targetDateStr") or t.get("dateString")) == "2026-11-17" and t.get("workerIds"):
        t["fotos"] = [{"url": "/__foto.jpg", "ruta": "fotos/a.jpg", "ancho": 1600, "alto": 1200}] * 2; break
json.dump(P, open(f"{AQUI}/datos-reales-fotos.json", "w"), ensure_ascii=False)

try:
    from PIL import Image, ImageDraw
    import random
    im = Image.new("RGB", (4000, 3000)); d = ImageDraw.Draw(im)
    for y in range(0, 3000, 40):
        for x in range(0, 4000, 40):
            d.rectangle([x, y, x + 39, y + 39], fill=(random.randint(40, 90), random.randint(110, 170), random.randint(30, 70)))
    im.save(f"{AQUI}/foto_grande.jpg", quality=95)
except ImportError:
    print("(sin Pillow: no se crea foto_grande.jpg; solo hace falta para probar fotos)")
print({k: len(v) for k, v in D.items() if isinstance(v, list)})
