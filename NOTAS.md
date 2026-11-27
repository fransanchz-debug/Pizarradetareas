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
- Tareas de cada finca (catálogo): sin números; ordenadas por uso (campo `usos`, que sube
  cada vez que la tarea se pone en un día). El contador de partida se calculó el 19/11/2026
  con todo el histórico. El campo `number` sigue guardado pero ya no se muestra.
- Tareas personales de Fran y de su hermano: en `privadas/{uid}/tareas` (fuera de `board`).
  Solo las ve su dueño (regla en `firestore.rules`). Se crean con «Para mí» en «＋ Añadir
  tarea»; las no hechas pasan solas al día de hoy. La espejo, los avisos y el envío a la
  app agrícola no las leen (solo usan `board`).
- Lista personal de tareas por finca: `privadas/{uid}/catalogo` (solo la ve su dueño). Se crea
  escribiendo una tarea nueva en «＋ Añadir tarea» con «Para mí» activado; sin «Para mí», la
  tarea nueva va a la lista normal de la finca (`catalog`).

## Apps y enlaces
Nombres: «pizarra» = app principal (Fran y su hermano); «espejo» = app de solo lectura.
- **App principal** (Fran y su hermano, pueden modificar): GitHub Pages, `index.html` de este repositorio.
- **App espejo del encargado** (solo lectura, solo el día de hoy):
  https://fransanchz-debug.github.io/Pizarradetareas/espejo/ — código en `espejo/index.html`.
  - La versión antigua de la espejo en Netlify (`tareasdehoy.netlify.app`) ya NO funciona:
    usa acceso anónimo y la cuenta de Netlify se quedó sin créditos para publicar (nov. 2026).

## Seguridad (Firebase, proyecto `pizarra-de-tareas-semanales`)
- Desde nov. 2026 se entra con correo y contraseña (Firebase Authentication).
- Reglas en `firestore.rules`:
  - Fran y su hermano: leer y escribir todo en `artifacts/ecologicos-almeria-v1`.
  - Usuarios de la espejo (solo leer `board`, `fincas`, `workers` y las fotos):
    encargado Fabio y Mory (trabajador, desde el 20/11/2026). Para añadir otro: crear su
    cuenta en Firebase Authentication y añadir su UID en `esEncargado()` de `firestore.rules`
    y en `encargado()` de `storage.rules`, y publicar las dos reglas.
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

## Trabajadores: la lista viene de appero (gestión agrícola) — ACTIVA desde el 27/11/2026
- **Altas y bajas se hacen SOLO en appero**; la pizarra las copia. Código: `sincronizar_trabajadores()` en `avisos/main.py`
  (la función de avisos, cada 5 min; objetivo 2 min). Fuente: `GET recibir-pizarra?trabajadores=1` de gestion-agricola.
- Manda `activo` **y el nombre REAL**: el que figura en el documento/nómina (campo `nombre_real` de appero = nombre de pila del documento; si dos
  coinciden, nombre + primer apellido; si la ficha aún no tiene documento, el nombre corto `nombre`). OJO: el nombre corto de appero viene de AppSheet
  y puede tener erratas; NO es «el real». Se aplica con `config/general.sincronizarNombres=true` (apagado hasta que appero confirma `nombre_real`
  y el caso de Coulibali: Fran lo quiere «Madhidian Coulibaly»). También copia `faltan_datos` → `workers/{id}.faltanDatos`; la pestaña Trabajadores
  muestra un aviso ámbar si faltan datos del documento (NIE, nombre, apellidos, nacionalidad…). Se empareja por id, nunca por nombre.
  Freno: más de 20 renombres a la vez no se aplican y se avisa. Un nombre vacío
  en appero no borra el de la pizarra. Los de baja sin vínculo (Omar, Amigo Sidiki) conservan su nombre. Nunca se borra a nadie:
  una baja es `activo:false` en `workers/{id}` (así los días pasados conservan el nombre). Los de baja no salen al asignar, no se
  copian en cuadrillas, no cuentan como «sin tarea» ni se envían a la app agrícola como «sin tarea»; si siguen asignados a tareas
  futuras, el recordatorio de las 22:00 y el aviso de emergencia lo dicen («🚫 De baja pero asignado»).
- Alta nueva en appero → se crea `workers/{uuid de appero}` con `agricolaId`. Vuelve alguien → se reactiva la misma ficha
  (o se vincula por nombre a una de baja sin vincular). Desaparece de appero → baja.
- **Freno de seguridad:** más de 3 bajas a la vez o una lista vacía/rara → no se aplica y se avisa. Si appero no responde: no se
  toca nada y se avisa pasada 1 h (una vez al día).
- **Cuenta de la espejo:** si la ficha tiene `uidEspejo` (Fabio y Mory), al darla de baja se **desactiva su cuenta** de Firebase
  Authentication (rol `firebaseauth.admin` de la cuenta técnica) y se reactiva si vuelve (campo `espejoDeshabilitada`).
- **Estado: ACTIVA** (`trabajadoresDesdeAppero=true`, revisión cada 2 min con el Scheduler `*/2 * * * *`). Primera sincronización real: 14 trabajadores
  vinculados, sin cambios visibles. Para ver qué haría sin aplicar: `…/avisos?simular_trabajadores=1` (solo lee; el resultado sale en los registros de Google;
  desde el entorno de Claude no se llega a Supabase). Se **activa** con `config/general.trabajadoresDesdeAppero = true` (la pantalla Ajustes > Trabajadores pasa entonces a solo
  consulta). Antes de activarlo: `python3 pruebas/ver_sync_trabajadores.py` muestra qué haría sin aplicar nada.
- Pruebas: `pruebas/probar_sync.py`, `probar_trabajadores.py`, `t13.js`, `t14.js`.

## Avisos diarios (copia de cuadrilla + notificaciones push)
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
  Si no reconoce trabajadores o fincas, avisa con una notificación. Las faltas
  apuntadas en la app agrícola no salen como "sin tarea" y no se copian.
  Clave: Secret Manager `GESTION_AGRICOLA_CLAVE` (copia en un documento de Drive de Fran).
- Todo se ajusta en la app: Ajustes > Avisos (se guarda en `config/general`).
- Cuenta técnica: `pizarra-avisos@pizarra-de-tareas-semanales.iam.gserviceaccount.com`
  (lee/escribe Firestore, lee la clave del bot). GitHub también puede usarla sin
  contraseñas (Workload Identity Federation, solo este repositorio).
- **Notificaciones push** (Web Push estándar con claves VAPID; sustituyeron a Telegram el 26/11/2026):
  cada aparato (móvil/ordenador) se activa por separado en Ajustes > Avisos > «Activar notificaciones».
  La app guarda la suscripción en `avisos/{uid}.subs` (endpoint + claves + `confirmada` + `aparato`); la función
  `avisos` (pywebpush) envía el aviso, manda uno de bienvenida a los aparatos nuevos (en <5 min) y **quita
  solos los aparatos caducados** (error 404/410). El trabajador de fondo que las muestra es `sw.js` (raíz).
  Clave pública VAPID: constante `VAPID_PUBLICA` en `src/app.jsx`. Clave privada: solo en Secret Manager
  `VAPID_PRIVATE_KEY` (la función la lee como secreto; el flujo de GitHub, de Secret Manager). Firma moderna
  (`Vapid02`, RFC 8292): **Apple la exige**. El contacto de la firma (`VAPID_SUB` en `avisos/main.py`) es
  genérico a propósito (`mailto:avisos@example.com`): con un dominio inventado `.invalid` Apple respondió **403 BadJwtToken**; si algún día
  rechazara este, cambiarlo ahí. Verificado el 27/11/2026: el iPhone de Fran quedó confirmado.
  En iPhone solo funcionan con la pizarra **instalada en la pantalla de inicio** (iOS 16.4 o más).
  Prueba sin móvil: `pruebas/probar_push.py` (servicio falso + descifrado) y `pruebas/t12.js` (pantalla).
- Telegram: **retirado** (la app y la función ya no lo usan). Quedan sin uso, y se pueden borrar: el secreto
  `TELEGRAM_BOT_TOKEN` (Secret Manager y GitHub Actions) y el bot @PizarraEcologicosbot (con @BotFather: /deletebot).
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
- Acceso directo: botón 📲 en la cabecera de la espejo y en Ajustes > Avisos de la pizarra (componente `InstalarApp`): detecta ya instalada / Android (lanza la instalación) / iPhone-Safari (3 pasos) / iPhone sin Safari (pide abrir en Safari). En iPhone Apple no permite instalar desde código.

## «Tareas listas» (aviso a Fabio y Mory) — desde el 27/11/2026
- Fran pulsa **«📣 Tareas de hoy/mañana listas»** (franja verde bajo la cabecera de la pizarra). Qué día: antes de `horaSalida` → hoy; desde la salida
  hasta las 24:00 → mañana; pasada la medianoche → hoy. Se guarda `publicados/{fecha}` (firma de cada tarea = lo que ya vieron, `cambios`, `quitadas`)
  y se crea `avisosPendientes/{id}`; la función (cada 2 min, `enviar_pendientes`) lo manda por push a `CUENTAS_ESPEJO` (Fabio y Mory) con la dirección de la espejo.
- **La espejo solo enseña los días publicados** («Aún no están publicadas…»). Si un día no se publica, la alerta de emergencia lo avisa a Fran.
- Cambios tras publicar: la pizarra compara las tareas con la firma y muestra «N cambios sin avisar · Avisar a Fabio y Mory» (no pregunta en cada cambio).
  Al avisar se acumulan `cambios` (nueva/cambiada) y `quitadas`, que la espejo marca (NUEVA / CAMBIADA / tachadas). La firma incluye finca, texto, notas,
  prioridad, trabajadores y nº de fotos. OJO: la copia automática de cuadrillas de la emergencia cuenta como cambio si el día ya estaba publicado.
- Los de la espejo activan sus avisos en 📲 (también instalan la app). Reglas: leen `publicados` y su propio `avisos/{uid}` (NADA más). `espejo/sw.js` es copia de `sw.js`.
- Al estrenarlo se creó a mano `publicados/2026-11-27` (campo `semilla`) para que hoy no se quedara vacío.
