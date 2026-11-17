#!/usr/bin/env bash
# Prepara la app para el navegador: src/app.jsx -> app.js y app.css (y lo mismo para espejo/).
# Uso:  npm install   (solo la primera vez)
#       ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
for d in . espejo; do
  npx esbuild "$d/src/app.jsx" --bundle=false --loader:.jsx=jsx --jsx=transform --target=es2018 --minify --outfile="$d/app.js" --log-level=warning
  npx tailwindcss -c tailwind.config.js -i src/estilos.css --content "$d/src/app.jsx,$d/index.html" -o "$d/app.css" --minify 2>/dev/null
done
echo "Listo: app.js y app.css generados."
