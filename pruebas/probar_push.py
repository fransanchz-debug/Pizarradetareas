"""Prueba del envío de notificaciones push SIN móvil ni internet: monta un «servicio de notificaciones» falso en
localhost, le manda avisos con avisos/main.py, DESCIFRA lo que recibe (como lo haría un móvil) y comprueba título,
cuerpo, firma VAPID, urgencia y que los aparatos caducados (410) se quitan. Necesita: pip install pywebpush google-auth requests"""
import base64, json, os, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from cryptography.hazmat.primitives import serialization as S
from cryptography.hazmat.primitives.asymmetric import ec
from py_vapid import Vapid02
import http_ece

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "avisos"))
v = Vapid02(); v.generate_keys(); os.environ["VAPID_PRIVATE_KEY"] = v.private_pem().decode()
import main as A

b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
recibido = []

class Servicio(BaseHTTPRequestHandler):
    def do_POST(self):
        cuerpo = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        recibido.append({"ruta": self.path, "cab": {k.lower(): v for k, v in self.headers.items()}, "cuerpo": cuerpo})
        self.send_response(410 if self.path.startswith("/caducado") else 201); self.end_headers()
    def log_message(self, *a): pass

srv = HTTPServer(("127.0.0.1", 0), Servicio); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{srv.server_port}"

def aparato(ruta):
    """Un «móvil»: par de claves y secreto de autenticación, como los crea el navegador al suscribirse."""
    priv = ec.generate_private_key(ec.SECP256R1()); auth = os.urandom(16)
    pub = priv.public_key().public_bytes(S.Encoding.X962, S.PublicFormat.UncompressedPoint)
    return {"endpoint": BASE + ruta, "keys": {"p256dh": b64(pub), "auth": b64(auth)}}, priv, auth

def descifrar(msg, priv, auth):
    return json.loads(http_ece.decrypt(msg["cuerpo"], private_key=priv, auth_secret=auth).decode())

fallos = 0
def comprobar(ok, texto):
    global fallos; fallos += (not ok); print(("  ✓ " if ok else "  ✗ ") + texto)

FRAN = sorted(A.CUENTAS_AVISOS)[0]
print("1) partir() convierte las marcas de formato")
t, c = A.partir("🚨 <b>Antes de entrar: martes 17</b>\n\n🔁 <b>Copiada:</b>\n• Liar (F6): Ana &amp; Luis")
comprobar(t == "🚨 Antes de entrar: martes 17" and c.startswith("🔁 Copiada:") and "Ana & Luis" in c, f"título={t!r}")

print("2) un aviso llega cifrado, firmado y se descifra bien")
sub, priv, auth = aparato("/ok1")
A.aviso_push(sub, "🚨 Prueba", "Cuerpo de prueba\nsegunda línea", "emergencia", urgente=True)
m = recibido[-1]; datos = descifrar(m, priv, auth)
comprobar(datos["titulo"] == "🚨 Prueba" and datos["cuerpo"] == "Cuerpo de prueba\nsegunda línea", "título y cuerpo descifrados correctamente")
comprobar(datos["etiqueta"] == "emergencia" and datos["url"] == A.URL_APP, "etiqueta y dirección de la app")
comprobar(m["cab"].get("authorization", "").lower().startswith("vapid t=") and ",k=" in m["cab"]["authorization"].replace(", k=", ",k="), "firma VAPID presente")
comprobar(m["cab"].get("content-encoding") == "aes128gcm" and m["cab"].get("urgency") == "high" and m["cab"].get("ttl") == "7200", "cifrado aes128gcm, urgencia alta, caduca a las 2 h")

print("3) enviar(): a los de Fran y su hermano, no a otros; quita los caducados")
vivo, p1, a1 = aparato("/ok2"); muerto, _, _ = aparato("/caducado1"); ajeno, _, _ = aparato("/ajeno")
guardado = []
A.leer_coleccion = lambda s, n: [{"id": FRAN, "subs": [vivo, muerto]}, {"id": "otraCuenta", "subs": [ajeno]}]
A.actualizar_doc = lambda s, ruta, campos: guardado.append((ruta, campos))
recibido.clear(); A.enviar(None, "🌙 <b>Recordatorio</b>\nlínea", "recordatorio")
rutas = sorted(x["ruta"] for x in recibido)
comprobar(rutas == ["/caducado1", "/ok2"], f"enviado solo a sus aparatos: {rutas}")
comprobar(guardado == [(f"avisos/{FRAN}", {"subs": [vivo]})], "el aparato caducado se quitó de la lista")

print("4) confirmar_nuevos(): primer aviso solo a los no confirmados")
nuevo, p2, a2 = aparato("/ok3"); ya = {**aparato("/ok4")[0], "confirmada": True}
guardado.clear(); recibido.clear()
A.leer_coleccion = lambda s, n: [{"id": FRAN, "subs": [nuevo, ya]}]
A.confirmar_nuevos(None)
comprobar([x["ruta"] for x in recibido] == ["/ok3"], "solo se avisó al nuevo")
comprobar(descifrar(recibido[0], p2, a2)["titulo"] == "✅ Notificaciones activadas", "mensaje de bienvenida")
comprobar(guardado and all(x.get("confirmada") for x in guardado[0][1]["subs"]), "queda marcado como confirmado")
ya_guardado = guardado[0][1]["subs"]
A.leer_coleccion = lambda s, n: [{"id": FRAN, "subs": ya_guardado}]  # lo que quedó guardado
guardado.clear(); recibido.clear(); A.confirmar_nuevos(None)
comprobar(not recibido and not guardado, "no se repite el aviso de bienvenida")

print("5) sin aparatos activados no pasa nada (y no falla)")
A.leer_coleccion = lambda s, n: [{"id": FRAN}]; recibido.clear(); A.enviar(None, "x\ny")
comprobar(not recibido, "no se envía nada")
print("\nRESULTADO:", "TODO BIEN" if not fallos else f"{fallos} FALLOS"); sys.exit(1 if fallos else 0)
