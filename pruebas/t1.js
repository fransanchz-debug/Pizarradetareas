const run = require('./shot.js');
const log = async p => (await p.evaluate(() => (window.__log || []).splice(0))).filter(x => !(x.ruta.startsWith('history') || (x.op==='delete' && x.ruta.startsWith('board/') && !x.manual)));
(async () => {
  await run(async p => {
    console.log('lecturas al abrir:', JSON.stringify(await p.evaluate(() => window.__lecturas)));
    await p.evaluate(() => (window.__log = []));
    await p.screenshot({ path: 'v_inicio.png' });
    // 1) abrir tarea, marcar trabajador, cerrar tocando fuera
    await p.locator('[data-columna] [data-tarea-id]').filter({ hasText: 'Liar Pepinos' }).first().click(); await p.waitForTimeout(400);
    await p.screenshot({ path: 'v_tarea.png' });
    await p.locator('button', { hasText: 'Trabajador 13' }).first().click(); await p.waitForTimeout(200);
    await p.locator('textarea').fill('Llevar tijeras'); await p.waitForTimeout(100);
    await p.mouse.click(195, 15); await p.waitForTimeout(900);
    console.log('1) tras marcar y tocar fuera:', JSON.stringify(await p.evaluate(() => window.__log.map(x => [x.op, x.ruta, x.data]))));
    await p.evaluate(() => (window.__log = []));
    // 2) misma cuadrilla que ayer en una tarea de hoy
    await p.locator('[data-columna] [data-tarea-id]').filter({ hasText: 'Tratamiento mildiu' }).first().click(); await p.waitForTimeout(400);
    const btn = p.locator('button', { hasText: /cuadrilla que ayer|Igual que ayer|no se hizo/ }).first();
    console.log('2) botón ayer:', await btn.innerText(), '| habilitado:', await btn.isEnabled());
    if (await btn.isEnabled()) { await btn.click(); await p.waitForTimeout(200); console.log('   guarda:', JSON.stringify(await p.evaluate(() => window.__log.map(x => [x.op, x.ruta, x.data])))); }
    await p.evaluate(() => (window.__log = []));
    // 3) quitar pide confirmación
    await p.locator('button', { hasText: 'Quitar tarea' }).click(); await p.waitForTimeout(300);
    console.log('3) tras quitar:', JSON.stringify(await p.evaluate(() => window.__log.map(x => [x.op, x.ruta]))));
    // 4) botón atrás cierra ventana
    await p.locator('[data-columna] [data-tarea-id]').first().click(); await p.waitForTimeout(300);
    await p.goBack(); await p.waitForTimeout(400);
    console.log('4) tras atrás: ventana abierta =', await p.locator('text=Los cambios se guardan solos').count(), '| sigue en la app =', await p.locator('text=Tareas Semanales').count());
  });
})();
