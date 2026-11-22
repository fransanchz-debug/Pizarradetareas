# Pruebas de la pizarra y la espejo

Abren la app **ya preparada** (`app.js`/`app.css` del repositorio) en un Chromium sin cabeza,
en tamaño iPhone, con un **Firebase de mentira** (`fake/`) que sirve una copia de los datos y
**anota lo que la app intentaría guardar** en `window.__log`. No se escribe nada en la base real.

1. `./build.sh` (si has cambiado `src/app.jsx`).
2. `./pruebas/correr-todo.sh` → pasa todas las pruebas con `datos-ejemplo*.json` (datos **inventados**, congelados
   al 17/11/2026, para que los resultados sean comparables). No hace falta ninguna clave.
3. Opcional: `python3 pruebas/crear-datos.py` baja una copia de los datos REALES (`datos-reales*.json`, fuera de git)
   para ver la app con datos de verdad, p. ej. `DATOS=pruebas/datos-reales.json node pruebas/t1.js`.
   Las comprobaciones de las pruebas no cuadrarán con datos reales de otro día.

Requisitos: Node con `playwright` (ya viene en los entornos de Claude Code en la nube), `requests` y
opcionalmente `Pillow` para Python. Capturas: cada prueba guarda PNG en la carpeta desde donde se lanza.

- `shot.js` es el motor (`FECHA=` fija el día de hoy; `DATOS=` elige el archivo de datos).
- No prueban un móvil de verdad: lo que más conviene probar a mano es arrastrar con el dedo.
