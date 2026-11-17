# Notas de la Pizarra de Tareas

## Cómo está hecha la app (importante para cambiarla)
- El código está en `src/app.jsx` (pizarra) y `espejo/src/app.jsx` (espejo del encargado).
- `index.html` y `espejo/index.html` solo cargan Firebase y los archivos ya preparados
  `app.js` y `app.css`. React va con versión fija en `vendor/`.
- Después de cambiar cualquier `src/app.jsx`: `npm install` (la primera vez) y `./build.sh`,
  y subir también `app.js` y `app.css`. Si no, la web no cambia.
- No subir un `index.html` antiguo de una sola pieza encima: se perderían los cambios.
- Icono de la pantalla de inicio: `iconos/` y `manifest.webmanifest`.
- Fotos de las tareas: se reducen en el móvil (1600 px, JPEG, ~100-400 KB) y se guardan
  en Firebase Storage (`pizarra-de-tareas-semanales.firebasestorage.app`, región
  US-CENTRAL1 con 5 GB gratis), carpeta `fotos/`. Reglas en `storage.rules`: suben Fran y su
  hermano; las ven ellos y el encargado. En la tarea se guarda la lista `fotos` (url, ruta).
  Al quitar una foto de una tarea no se borra el archivo (puede estar copiada en otra tarea).

## Apps y enlaces
- **App principal** (Fran y su hermano, pueden modificar): GitHub Pages, `index.html` de este repositorio.
- **App espejo del encargado** (solo lectura, solo el día de hoy):
  https://fransanchz-debug.github.io/Pizarradetareas/espejo/ — código en `espejo/index.html`.
  - La versión antigua de la espejo en Netlify (`tareasdehoy.netlify.app`) ya NO funciona:
    usa acceso anónimo y la cuenta de Netlify se quedó sin créditos para publicar (nov. 2026).

## Seguridad (Firebase, proyecto `pizarra-de-tareas-semanales`)
- Desde nov. 2026 se entra con correo y contraseña (Firebase Authentication).
- Reglas en `firestore.rules`:
  - Fran y su hermano: leer y escribir todo en `artifacts/ecologicos-almeria-v1`.
  - Encargado: solo leer `board`, `fincas` y `workers`.
  - Nadie más puede leer ni escribir.
- Para añadir a alguien: crear su cuenta en Firebase > Authentication, añadir su UID
  en `firestore.rules` y publicar las reglas. La persona crea su contraseña con
  "He olvidado mi contraseña" en la pantalla de entrada.

## PENDIENTE: webs antiguas de primos y amigo (Netlify)
Estas webs guardan datos en la MISMA base de datos de Firebase, y desde que se
cerró el acceso (nov. 2026) **ya no funcionan** (usaban acceso anónimo):

| Web en Netlify | Datos en Firebase | Último uso visto |
|---|---|---|
| `tareashnosgonzalezsanchez.netlify.app` (primos) | `artifacts/pizarra-primos` (6 docs) | 25/10/2026 |
| `tareasjorge.netlify.app` (amigo Jorge) | `artifacts/pizarra-jorge` (7 docs) | 27/10/2026 |
| `pizarradetareas.netlify.app` | versión antigua de la app principal | 30/10/2026 |

Fran les ha dicho que avisen si las usan. Si hace falta reactivarlas:
1. Crear una cuenta para cada persona y darle acceso solo a SU carpeta
   (`artifacts/pizarra-primos` o `artifacts/pizarra-jorge`) en `firestore.rules`.
2. Añadir la pantalla de entrada a su web (igual que en `espejo/index.html`) y
   publicarla en GitHub Pages (Netlify no tiene créditos), p. ej. en una carpeta
   `primos/` o `jorge/` de este repositorio.

También existen datos de pruebas en `artifacts/ecologicos-almeria-pruebas-aisladas`
y colecciones antiguas en la raíz (`board`, `catalog`, `fincas`) que no usa ninguna app.

## Avisos diarios (copia de cuadrilla + Telegram)
- Código: `avisos/main.py`. Lo ejecuta **Google Cloud Scheduler** cada 5 minutos
  (trabajo `avisos-pizarra`, zona Europe/Madrid) llamando a la función
  `avisos` (Cloud Run, región europe-west1).
- 🌙 Recordatorio a la hora fijada (22:00 por defecto, `horaRecordatorio`): cómo
  está planificado el día siguiente (copias previstas, tareas sin cuadrilla,
  trabajadores sin tarea). Solo informa.
- 🚨 Emergencia X minutos antes de la entrada (45 por defecto, `minutosAntes`):
  copia la cuadrilla de ayer en las tareas de hoy iguales (misma finca y nombre)
  sin trabajadores y avisa solo si queda algo pendiente.
- 📤 Envío a la app agrícola 15 min después de la hora de salida y otra vez a
  las 23:50 (recoge las correcciones de la tarde; no pisa lo ya revisado): quién ha
  estado en qué tarea y finca, con la jornada (entrada, salida, descanso) para
  crear los partes de horas (función `recibir-pizarra` de gestion-agricola).
  Si no reconoce trabajadores o fincas, avisa por Telegram. Las faltas
  apuntadas en la app agrícola no salen como "sin tarea" y no se copian.
  Clave: Secret Manager `GESTION_AGRICOLA_CLAVE` (copia en un documento de Drive de Fran).
- Todo se ajusta en la app: Ajustes > Avisos (se guarda en `config/general`).
- Cuenta técnica: `pizarra-avisos@pizarra-de-tareas-semanales.iam.gserviceaccount.com`
  (lee/escribe Firestore, lee la clave del bot). GitHub también puede usarla sin
  contraseñas (Workload Identity Federation, solo este repositorio).
- Clave del bot (@PizarraEcologicosbot): en Google Secret Manager
  `TELEGRAM_BOT_TOKEN` (la usa la función) y en GitHub > Settings > Secrets >
  Actions `TELEGRAM_BOT_TOKEN` (para lanzarlo a mano). Si se cambia, cambiarla en los dos.
- Cada uno conecta su Telegram en Ajustes > Avisos > «Conectar mi Telegram».
- Prueba manual: GitHub > Actions > «Avisos diarios» > Run workflow (marcar «forzar»
  para la emergencia o «recordatorio» para el de la noche).
- Facturación: proyecto en plan Blaze, cuenta «Mi cuenta de facturación 1».
  Alerta de presupuesto de 1 € (avisa al 50 % y al 100 %). Uso esperado: 0 €.

## PENDIENTE: nombres de los trabajadores (cuando se deje AppSheet)
Fran quiere que los trabajadores se llamen igual en las dos apps, con los nombres de la
pizarra (p. ej. «Moussa Sacko», no «Mousaa Sacko»). NO se puede hacer mientras se use
AppSheet: la copia de AppSheet a la app agrícola reconoce a los trabajadores por el nombre
y crearía duplicados. Cuando se deje AppSheet, renombrar en la app agrícola (tabla
`trabajadores`) con los nombres de la pizarra. La pizarra y la app agrícola se emparejan
por identificador (`pizarra_trabajadores`), así que eso no se rompe.
