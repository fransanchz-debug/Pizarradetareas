// Trabajadores de baja en la pizarra: no salen al asignar ni en las copias, pero sus tareas pasadas los conservan.
const fs = require('fs'), os = require('os'), path = require('path');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos-ejemplo.json'), 'utf8'));
const KOMUSA = 'vCaur7KUqmbTIrPDHH2Q';                      // estaba en la cuadrilla de «Otras F4-5» del martes
const baja = D.workers.find(w => w.id === KOMUSA); baja.activo = false; baja.bajaEn = 1;
const tmp = path.join(os.tmpdir(), 'datos-baja.json'); fs.writeFileSync(tmp, JSON.stringify(D)); process.env.DATOS = tmp;
const run = require('./shot.js');
(async () => {
  await run(async p => {
    const col = d => p.locator(`[data-columna="${d}"]`);
    await col('X').locator('[data-tarea-id]', { hasText: 'Otras' }).first().click(); await p.waitForTimeout(400);
    console.log('1) el de baja NO sale al asignar (no asignado a esta tarea):', await p.locator('.fixed button', { hasText: baja.name }).count() === 0);
    await p.evaluate(() => (window.__log = []));
    await p.locator('button', { hasText: /cuadrilla que ayer/ }).first().click(); await p.waitForTimeout(300);
    const ids = await p.evaluate(() => window.__log.filter(x => x.ruta.startsWith('board/')).map(x => x.data.workerIds));
    console.log('2) «Misma cuadrilla que ayer» copia 2 (no 3) y sin el de baja:', JSON.stringify(ids.map(l => [l.length, l.includes('vCaur7KUqmbTIrPDHH2Q')])));
    await p.locator('button[aria-label="Cerrar"]').first().click(); await p.waitForTimeout(300);
    // en el martes él sigue asignado: su nombre se ve y se puede quitar, marcado «de baja»
    await col('M').locator('[data-tarea-id]', { hasText: 'Otras' }).first().click(); await p.waitForTimeout(400);
    console.log('3) ya asignado: se ve «de baja» y su nombre:', await p.locator('.fixed button', { hasText: baja.name }).locator('text=de baja').count() === 1);
    await p.locator('button[aria-label="Cerrar"]').first().click(); await p.waitForTimeout(300);
    console.log('4) en la tarjeta del martes sigue su nombre:', await col('M').locator('[data-tarea-id]', { hasText: 'Otras' }).first().locator(`text=${baja.name}`).count() === 1);
    // Ajustes > Trabajadores: no está en la lista y «borrar» da de baja (no borra)
    await p.getByText('Ajustes').first().click(); await p.waitForTimeout(300); await p.getByText('Trabajadores').first().click(); await p.waitForTimeout(300);
    console.log('5) en Ajustes no sale el de baja:', await p.locator('.fixed >> text=👤 ' + baja.name).count() === 0);
    await p.evaluate(() => (window.__log = []));
    await p.locator('.fixed .space-y-1\\.5 button', { hasText: '🗑️' }).first().click(); await p.waitForTimeout(300);
    console.log('6) «borrar» = dar de baja:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => x.ruta.startsWith('workers/')).map(x => [x.op, Object.keys(x.data)]))));
  });
})();
