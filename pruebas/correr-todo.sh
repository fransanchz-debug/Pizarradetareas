#!/usr/bin/env bash
# Pasa todas las pruebas de siempre con la copia de ejemplo (datos inventados, congelados al 17/11/2026).
# Fecha fija (17/11/2026) para que los resultados sean comparables entre ejecuciones.
cd "$(dirname "$0")"
python3 - <<'PY'
# foto grande de muestra para probar la reducción de tamaño (no se sube a git)
try:
    from PIL import Image, ImageDraw
    import random, os
    if not os.path.exists("foto_grande.jpg"):
        im = Image.new("RGB", (4000, 3000)); d = ImageDraw.Draw(im)
        for y in range(0, 3000, 40):
            for x in range(0, 4000, 40): d.rectangle([x, y, x+39, y+39], fill=(random.randint(40,90), random.randint(110,170), random.randint(30,70)))
        im.save("foto_grande.jpg", quality=95)
except ImportError:
    print("(sin Pillow: se salta la prueba de fotos)")
PY
export FECHA=2026-11-17T09:00:00
for t in t1 t2 t3 t10 t7 t8 t9; do echo "== $t"; node $t.js 2>&1 | grep -v "^$"; done
echo "== t6 (tareas personales)";  FECHA=2026-11-19T09:00:00 DATOS="$PWD/datos-ejemplo-mias.json" node t6.js
echo "== t11 (tareas nuevas)";     FECHA=2026-11-19T09:00:00 DATOS="$PWD/datos-ejemplo-mias.json" node t11.js
echo "== t4 (fotos)";              node t4.js
echo "== t5 (fotos en pizarra y espejo)"; FECHA=2026-11-17T09:00:00 DATOS="$PWD/datos-ejemplo-fotos.json" node t5.js
echo "Lo importante: ninguna línea que empiece por ERR, y los resultados iguales que la vez anterior."
