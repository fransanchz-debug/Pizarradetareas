# Notas de la Pizarra de Tareas

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
