# HANDOFF — relevo para otro agente (leer primero, luego `NOTAS.md`)

Escrito el 22/11/2026 al final de una sesión larga. Este archivo cuenta **cómo trabaja el dueño, qué hay,
qué falta y qué trampas hay**. `NOTAS.md` cuenta el detalle técnico de cada pieza; `pruebas/LEEME.md`, cómo probar.
Todo el repositorio puede ser público: **aquí no hay (ni debe haber) contraseñas, claves ni correos**.

## 1. Quién es el dueño y cómo quiere que trabajes (lo más importante)
- **Fran** lleva una explotación agrícola en Almería (Ecológicos Almería). **No es técnico**: no sabe de GitHub,
  Firebase ni código. Habla **español**. Usa sobre todo el **iPhone** (la app es de móvil primero) y un PC con Windows.
- **No le mandes hacer lo que puedes hacer tú.** Ha dicho: «estoy harto de copiar y pegar… quiero que trabajes tú».
  Haz tú los pasos (Firebase, Google Cloud, GitHub, reglas, despliegues) y pídele solo lo que solo él puede hacer
  (iniciar sesión con Google una vez, activar las notificaciones en su móvil, probar con el dedo, decidir). Si le pides algo en pantalla,
  explícalo **paso a paso y con nombres exactos de botones**.
- **No toques lo que ya funciona.** Su frase: «Ojo con lo que tocas. No quiero afectar en nada el funcionamiento de lo
  que ya hay». Antes de cambiar algo compartido (reglas de seguridad, datos, avisos) haz una prueba que demuestre que lo
  anterior sigue igual (en este proyecto: el simulador de reglas de Firebase y `pruebas/correr-todo.sh`).
- **Norma de «app limpia y optimizada»** (la fijó él): si te pide algo que va contra una app limpia, rápida y ordenada
  (ruido visual, más toques, más peso, duplicar listas…), **díselo y no lo hagas sin hablarlo**. Cíñete **solo** a los cambios
  que te marca, apartado por apartado. Sin extras.
- **Decisiones suyas, no tuyas:** qué se muestra, quién ve qué, abrir acceso a alguien. Propón una opción recomendada y
  pregunta lo mínimo.
- **Vocabulario:** «**pizarra**» = app principal (la usan Fran y su hermano; pueden modificar). «**espejo**» = app de solo
  lectura (la ven el encargado y un trabajador). «app agrícola» / «gestion-agricola» = otro proyecto suyo (ver §3).
- **Antes de publicar algo grande o visual**, enseña capturas (hazlas con el paquete de `pruebas/`) y/o un enlace de prueba
  (carpeta `prueba/` en GitHub Pages, como se hizo con la versión 2). Cambios pequeños y expresamente pedidos: se han
  publicado directamente tras probarlos, avisando.
- Con **contraseñas y claves**: nunca por el chat si es una clave técnica (usa `request_credential` o pásala de GitHub a
  Google sin verla). Las contraseñas de los **trabajadores** sí se las da a Fran en el chat (él lo pidió: «le damos ya la
  contraseña hecha»); no se guardan en ningún sitio.
- Dile siempre **qué no has podido probar** (nunca tienes la contraseña de Fran, ni un móvil real).

## 2. Qué es y dónde está
| Pieza | Dónde |
|---|---|
| Código | repo `fransanchz-debug/Pizarradetareas`. Rama viva = `main` (GitHub Pages). |
| **Pizarra** | https://fransanchz-debug.github.io/Pizarradetareas/ — código en `src/app.jsx` |
| **Espejo** | https://fransanchz-debug.github.io/Pizarradetareas/espejo/ — código en `espejo/src/app.jsx` |
| Datos | Firebase, proyecto `pizarra-de-tareas-semanales`, Firestore `artifacts/ecologicos-almeria-v1/...` |
| Fotos | Firebase Storage `pizarra-de-tareas-semanales.firebasestorage.app` (US-CENTRAL1), carpeta `fotos/` |
| Avisos + envío horas | Google Cloud: función `avisos` (europe-west1) + Scheduler `avisos-pizarra` cada 5 min. Código: `avisos/main.py` |
| Notificaciones | push estándar (Web Push + VAPID); `sw.js`; clave privada en Secret Manager `VAPID_PRIVATE_KEY`. Telegram se retiró el 26/11/2026 |

**Cómo se publica un cambio de la app:** editar `src/app.jsx` (o `espejo/src/app.jsx`) → `./build.sh` (genera `app.js` y
`app.css`; **hay que subirlos**) → `./pruebas/correr-todo.sh` → commit → `git push origin <rama>` y
`git push origin HEAD:main` (fast-forward). GitHub Pages tarda 1-3 min. **No** subir un `index.html` de una sola pieza antiguo.
Cada usuario debe **recargar** una vez para ver el cambio.

Colecciones de Firestore (todas bajo `artifacts/ecologicos-almeria-v1/`): `board` (tareas de trabajadores, pizarra viva),
`history` (copia de los días pasados; la crea la propia pizarra, cada minuto que alguien la tiene abierta, con lo que ya es de ayer o antes), `catalog` (lista de tareas de
cada finca, con `usos`), `fincas`, `workers`, `config/general` (horaEntrada, horaSalida, descansoMin, minutosAntes,
horaRecordatorio…), `avisos/{uid}` (aparatos con notificaciones de cada uno: `subs`), `privadas/{uid}/tareas` y `privadas/{uid}/catalogo` (**personales y
privados**: solo su dueño; la espejo, los avisos y la app agrícola **no** los leen).

**Quién entra (Firebase Authentication, correo + contraseña):** Fran y su hermano (leen y escriben; sus UID están en
`firestore.rules` y `storage.rules`), el encargado Fabio y el trabajador Mory (**solo leen** `board`, `fincas`, `workers` y
fotos; función `esEncargado()` / `encargado()` en las reglas). Cualquier otro: denegado. El acceso anónimo está desactivado.
Para dar acceso a otro trabajador a la espejo: crear cuenta (Identity Toolkit), añadir su UID en las dos reglas, probar en
el simulador, publicar (ver §5), y darle a Fran correo + contraseña hecha.

## 3. Relación con la app agrícola (otro proyecto de Fran, otra conversación)
- Repo `fransanchz-debug/gestion-agricola`, Supabase proyecto `pykqyjynvtgstqzgnilu`. Sustituye a AppSheet (usan **ambas en paralelo**
  hasta que la nueva tenga todo; Fran lo decidió así).
- La pizarra le envía cada día quién trabajó en qué finca: `POST .../functions/v1/recibir-pizarra` (cabecera `x-clave`, secreto
  `GESTION_AGRICOLA_CLAVE` en Secret Manager) 15 min después de la hora de salida y otra vez a las 23:50. Consulta también
  `?ausencias=fecha` para no avisar de quien falta. **Las tareas personales nunca se envían.**
- Hay otra sesión de Claude para ese proyecto: `session_016chSaen1ndRBD9rTFwR6eU` («Migración AppSheet a web nativa»).
  Se habla con ella con `mcp__claude-code-remote__send_message`. Las fincas y trabajadores se emparejan por identificador
  (`pizarra_trabajadores`, `pizarra_fincas` en Supabase). **No renombres fincas** en la pizarra (la espejo y la pizarra solo
  las muestran con otro formato; la app agrícola las reconoce por el nombre guardado).

## 4. Estado
**Hecho y publicado (nov. 2026):** entrada con correo/contraseña y reglas de seguridad sin caducidad · aviso de «no se ha guardado» ·
copia automática de la cuadrilla de ayer + avisos por notificación push, antes Telegram (recordatorio 22:00, emergencia 45 min antes de entrar) · envío a la
app agrícola · pizarra v2 (autoguardado, lista de trabajadores completa, «Misma cuadrilla que ayer», «Repetir día anterior»,
«＋ Añadir tarea» por día, «Copiar a» varios días, un día por pantalla en el móvil, sin franja ni números, instalable, código
precompilado) · espejo con pestañas Hoy/Mañana · **fotos** en tareas · **tareas personales** privadas («Para mí», «👤 Mía»,
lista personal por finca) · catálogo ordenado por uso · acceso de Mory a la espejo.

**Pendiente / sin confirmar (díselo a Fran con honestidad):**
0. **Notificaciones push (26/11/2026): probadas solo con un servicio falso, NO con un iPhone real.** Comprueba en los registros de la función
   (§5) que a Fran y a su hermano les llegó el aviso de bienvenida («✅ Notificaciones activadas»). Si no llega y en los registros sale 403
   de Apple, cambia `VAPID_SUB`. Hasta que no las activen, **no recibirán ningún aviso** (Telegram ya no se envía).
1. **Sin confirmar con cuenta real** (el agente nunca tuvo la contraseña de Fran): subida real de **fotos**; crear la primera tarea
   personal en producción. Pide a Fran que lo pruebe y te cuente.
2. **No he vuelto a mirar** si el envío diario de las 17:15 y de las 23:50 a la app agrícola, ni el recordatorio de las 22:00, llegan bien
   desde el 17/11. Mira los registros de la función (§5) y pregunta a Fran si le llegan los mensajes.
3. **Su hermano** (cuenta creada) tardó en crear su contraseña; confirma que ya entra y **que ha activado las notificaciones en su móvil** (Ajustes > Avisos).
4. **Encargado y Mory:** comprobar que entran en la espejo.
5. **Webs antiguas de Netlify** (primos, amigo Jorge, `pizarradetareas.netlify.app`): ya no funcionan; Fran dijo «si las usan, que me avisen».
   Netlify no tiene créditos para publicar. Detalle en `NOTAS.md`.
6. **Nombres de trabajadores** distintos entre pizarra y app agrícola: igualarlos **cuando se deje AppSheet** (no antes; crearía duplicados). Fran quiere los de la pizarra.
7. Tokens: Fran debía borrar un token de Netlify que dio; y el acceso de gcloud caduca al terminar la sesión.

## 5. Acceso y comandos (lo que el nuevo agente tiene que rehacer)
- **GitHub:** ya conectado en la cuenta de Fran (usa las herramientas `mcp__github__*` y `git`). Disparar avisos a mano:
  workflow «Avisos diarios» (`workflow_dispatch`, casillas `forzar` / `recordatorio`).
- **Google Cloud / Firebase (gcloud):** **hay que iniciar sesión de nuevo** (caduca con la sesión). Pídele a Fran que abra un enlace y
  te pase el código: `gcloud auth login --no-launch-browser --update-adc` con la entrada por una tubería con nombre (así se hizo antes).
  **Trampa:** el entorno trae `CLOUDSDK_AUTH_ACCESS_TOKEN` (un testigo falso del proxy). Usa siempre
  `env -u CLOUDSDK_AUTH_ACCESS_TOKEN gcloud ...` o `gcloud auth print-access-token` dará un testigo inútil y las APIs devolverán 401.
  Proyecto: `pizarra-de-tareas-semanales`; cuenta de facturación `Mi cuenta de facturación 1` (plan Blaze, alerta de 1 €).
- **Publicar reglas** (Firestore y Storage), sin consola: `POST firebaserules.googleapis.com/v1/projects/P:test` (simulador) →
  `POST .../rulesets` → `PATCH .../releases/cloud.firestore` o `.../releases/firebase.storage/<bucket>` con el `rulesetName`.
  **Prueba siempre en el simulador antes** (se ha hecho con >100 casos de lo que ya funcionaba + los nuevos).
- **Crear/cambiar usuarios:** Identity Toolkit REST (`.../v1/projects/P/accounts` para crear, `accounts:update` con `localId` para
  poner contraseña, `accounts:lookup` para ver). Correo de «restablecer contraseña» caduca en 1 h; a los trabajadores se les pone la
  contraseña directamente.
- **Desplegar la función de avisos** (desde la carpeta del repo):
  `env -u CLOUDSDK_AUTH_ACCESS_TOKEN gcloud --quiet functions deploy avisos --gen2 --runtime=python312 --region=europe-west1 --timeout=170s --source=avisos --entry-point=avisos --trigger-http --no-allow-unauthenticated --service-account=pizarra-avisos@pizarra-de-tareas-semanales.iam.gserviceaccount.com --set-secrets=VAPID_PRIVATE_KEY=VAPID_PRIVATE_KEY:latest,GESTION_AGRICOLA_CLAVE=GESTION_AGRICOLA_CLAVE:latest --memory=256Mi --max-instances=1` (con `CLOUDSDK_CORE_PROJECT` puesto).
  Probar: `gcloud scheduler jobs run avisos-pizarra --location=europe-west1` y leer `gcloud logging read '... service_name="avisos" ...'`.
- **Supabase / Drive / Gmail:** herramientas `mcp__Supabase__*`, `mcp__Google_Drive__*` conectadas a la cuenta de Fran. La clave de la app
  agrícola está en un documento de su Drive y ya copiada a Secret Manager.

## 6. Trampas conocidas
- **Modo automático:** el clasificador del entorno **bloquea despliegues a producción y cambios que bajan la seguridad** aunque Fran diga
  «sí». Pídele que cambie el modo (desplegable junto al cuadro de texto) a **«Accept edits»** y aprueba la acción concreta.
- Desde la nube **no se abren** las páginas `github.io` ni Netlify (el proxy las bloquea): no puedes ver lo publicado; di que no lo has visto.
  Para ver la app usa `pruebas/` (Chromium + Firebase de mentira).
- Un `index.html` antiguo de una sola pieza (p. ej. generado por otra IA) **pisaría** todo: no lo subas.
- Las **reglas de Firestore** son compartidas: cualquier cambio puede dejar sin acceso a la pizarra, la espejo o los avisos. Prueba antes.
- GitHub Actions con `cron` es poco puntual: por eso los avisos van por Google Cloud Scheduler (el flujo de GitHub quedó solo para lanzarlo a mano).
- La pizarra **archiva** sola los días pasados en `history` y los borra de `board` (solo mientras alguien la tiene abierta). Por eso los datos reales de
  `board` solo tienen hoy y el futuro; las pruebas usan una copia congelada.
- iPhone: `window.confirm` funciona; el botón «atrás» se ha cableado para cerrar ventanas (`history.pushState`).

## 7. Qué hacer primero
1. Lee este archivo y `NOTAS.md`. `git pull` y `git log --oneline | head -20`.
2. `npm install && ./pruebas/correr-todo.sh` → debe pasar sin errores (comprueba que tu entorno vale).
3. Pide a Fran el inicio de sesión de Google Cloud (§5) y mira los registros de la función de avisos (§4, punto 2).
4. Pregúntale qué quiere hacer hoy. Si pide algo contrario a la norma de app limpia (§1), díselo antes.
