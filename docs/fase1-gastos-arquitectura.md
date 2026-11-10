# Fase 1 — Gestión económica: decisiones y modelo de datos

Documento vivo. Recoge lo acordado para migrar la parte de gastos de AppSheet
(hoja `BASE GASTOS`) a una app web propia.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Base de datos | PostgreSQL en Supabase para la parte económica. La pizarra de tareas sigue en Firebase por ahora. |
| Importe a imputar | **Total con IVA.** No se separa base e IVA a efectos de coste (sí se guardan para control). |
| Gasto de un cultivo | Se imputa entero a ese cultivo. |
| Gasto de una o varias fincas | Se busca el cultivo activo en cada finca en la fecha del gasto y se reparte proporcionalmente a la superficie. |
| Gasto sin finca (teléfono, gestoría, seguros…) | Se reparte entre **todos** los cultivos activos en la fecha, proporcional a la superficie. |
| Huecos entre campañas | No existen: los cultivos de una finca se encadenan (termina uno hoy, empieza el siguiente mañana). La app lo validará. |
| Amortizaciones | Se imputan al cierre de cada cultivo, en proporción a los días que ha durado. Se detalla más adelante. |
| Finca en la factura | Los proveedores de confianza la indican impresa; en el resto se escribirá a mano en el papel y la lectura de la foto la reconocerá. Si no se reconoce, se elige en pantalla. |
| Control horario | Importante (lo usa el encargado). Va en una fase posterior, pero genera imputaciones igual que un gasto. |
| Cierre jefes | Liquidación mensual entre Fran, su hermano y su padre: cada uno paga a sus trabajadores; se compensa lo que cada trabajador ha trabajado en fincas de otro jefe. |

## Modelo de datos

```
fincas          id, nombre, superficie_m2, lat, lng, jefe_id
jefes           id, nombre                         (Fran, hermano, padre)
campañas        id, nombre, fecha_inicio, fecha_fin
cultivos        id, finca_id, campaña_id, familia, variedad, nombre,
                superficie_m2, fecha_inicio, fecha_fin, jefe_id, activo
                -- regla: en una finca los cultivos no se solapan ni dejan huecos
proveedores     id, nombre, cif (único), categoria_defecto, ambito_defecto,
                finca_defecto
categorias      id, nombre                         (suministros, gasoil, teléfono…)

documentos      id, archivo, tipo (factura|ticket|resumen), hash (único),
                estado_lectura, datos_extraidos (json), subido_por, subido_en
facturas        id, documento_id, proveedor_id, numero, fecha, base, iva, total,
                estado (borrador|revisada|contabilizada)
                -- único (proveedor_id, numero): sustituye al "FILTRO ANTI-duplicado"
lineas          id, factura_id, fecha (de la línea o del albarán), concepto,
                categoria_id, importe_total,
                ambito (cultivo|fincas|explotacion), cultivo_id, fincas[]
imputaciones    id, origen (linea|hora|amortizacion), origen_id, cultivo_id,
                importe, porcentaje, metodo (auto|manual)

trabajadores    id, nombre, precio_hora, pagador_id (jefe), activo   -- fase posterior
partes_horas    id, fecha, trabajador_id, cultivo_id, horas, importe -- fase posterior
amortizaciones  id, finca_id, concepto, coste, fecha_compra, vida_util -- fase posterior
ingresos        id, cultivo_id, fecha, cliente, kg, bultos, precio, total
```

**Coste de un cultivo = suma de sus `imputaciones`**, venga de una factura,
de horas o de una amortización.

### Por qué cada línea lleva su propia fecha

Hay facturas que agrupan varias entregas. Ejemplo real (Combustibles Las Norias,
F 8.582): cuatro albaranes de gasóleo del 9, 14, 17 y 31 de enero en una sola
factura. Si un cultivo termina a mitad de mes, cada entrega debe ir al cultivo
activo **en la fecha del albarán**, no en la de la factura.

## Flujo foto → gasto

1. Subir foto/PDF (cámara del móvil o archivo).
2. La IA extrae: proveedor y CIF, nº, fecha, base, IVA, total, líneas con sus
   fechas, y cualquier anotación manuscrita de finca/cultivo.
3. Se reconoce el proveedor por CIF y se aplican sus valores por defecto.
4. Se propone el reparto (por línea y fecha).
5. Pantalla de revisión → **Confirmar**. Aviso si la factura ya existe.

## Facturas de muestra recibidas

| Proveedor | Tipo | Observaciones |
|---|---|---|
| Albaida Residuos (E/000029027, 75,00 €) | Foto escaneada (CamScanner) | Concepto "Mata sin rafia pepino" → pista del cultivo. Sin finca. |
| Combustibles Las Norias (F 8.582, 2.078,01 €) | PDF digital | 4 albaranes con fechas distintas en una factura. |
| Simyo (3 facturas mensuales, ~2 €) | PDF digital | Periodo de consumo; gasto sin finca → toda la explotación. |

## Pendiente

- Documentación de la app de AppSheet (PDF) para revisar fórmulas, columnas virtuales y acciones.
- Conversación con Gemini sobre `CIERRE_JEFES`.
- Fotos de facturas con la finca escrita a mano.
