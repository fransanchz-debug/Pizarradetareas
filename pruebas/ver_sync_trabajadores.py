"""Muestra QUÉ haría la sincronización de trabajadores con appero SIN APLICAR NADA (solo lee).
Requiere haber iniciado sesión con gcloud y la clave de appero (se lee de Secret Manager).
Uso:  python3 pruebas/ver_sync_trabajadores.py"""
import base64, os, subprocess, sys, time, requests
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "avisos"))
os.environ.setdefault("VAPID_PRIVATE_KEY", "x")
env = {k: v for k, v in os.environ.items() if k != "CLOUDSDK_AUTH_ACCESS_TOKEN"}
tok = subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True, env=env).stdout.strip()
if not tok.startswith("ya29"): sys.exit("Falta iniciar sesión con gcloud (HANDOFF.md, «Acceso a Google»).")
H = {"Authorization": "Bearer " + tok, "x-goog-user-project": "pizarra-de-tareas-semanales"}
r = requests.get("https://secretmanager.googleapis.com/v1/projects/669734412138/secrets/GESTION_AGRICOLA_CLAVE/versions/latest:access", headers=H)
os.environ["GESTION_AGRICOLA_CLAVE"] = base64.b64decode(r.json()["payload"]["data"]).decode().strip()
import main as A
s = requests.Session(); s.headers.update(H)
lista = A.leer_appero()
docs = A.leer_coleccion(s, "workers")
crear, cambios = A.planificar_trabajadores(lista, docs, int(time.time() * 1000))
por_id = {d["id"]: d for d in docs}
print(f"appero: {len(lista)} trabajadores ({sum(1 for t in lista if t['activo'])} activos) · pizarra: {len(docs)} ({sum(1 for d in docs if d.get('activo') is not False)} activos)")
print(f"\nALTAS nuevas ({len(crear)}):"); [print("  +", t["nombre"]) for t in crear]
bajas = [(i, c) for i, c in cambios if c.get("activo") is False]
altas = [(i, c) for i, c in cambios if c.get("activo") is True]
vinc = [(i, c) for i, c in cambios if "activo" not in c]
print(f"\nBAJAS ({len(bajas)}; el freno salta a partir de {A.SYNC_MAX_BAJAS + 1}):"); [print("  -", por_id[i].get("name")) for i, _ in bajas]
print(f"\nREACTIVACIONES ({len(altas)}):"); [print("  ↺", por_id[i].get("name")) for i, _ in altas]
print(f"\nSolo se vinculan con appero, sin cambiar nada visible ({len(vinc)}):", ", ".join(por_id[i].get("name", "?") for i, _ in vinc) or "ninguno")
print("\nNombres distintos (NO se tocan en esta fase):")
ap = {t["id"]: t for t in lista}
for d in docs:
    t = next((x for x in lista if x.get("id_pizarra") == d["id"] or x["id"] == d.get("agricolaId")), None)
    if t and A.normalizar(t["nombre"]) != A.normalizar(d.get("name")): print(f"   pizarra «{d.get('name')}»  ↔  appero «{t['nombre']}»")
