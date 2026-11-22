const run = require('./shot.js');
const L = p => p.evaluate(() => (window.__log || []).splice(0).filter(x => !x.ruta.startsWith('history') && !(x.op === 'delete' && x.ruta.startsWith('board/'))).map(x => [x.op, x.ruta, x.data && (x.data.description || x.data.workerIds || x.data.order)]));
(async () => {
  await run(async p => {
    await p.evaluate(() => (window.__log = []));
    // misma cuadrilla que ayer: miércoles 18, "Otras" F4 y 5 (ayer martes tenía 3)
    const col = d => p.locator(`[data-columna="${d}"]`);
    await col('X').scrollIntoViewIfNeeded();
    await col('X').locator('[data-tarea-id]', { hasText: 'Otras' }).first().click(); await p.waitForTimeout(400);
    const btn = p.locator('button', { hasText: /cuadrilla que ayer/ }).first();
    console.log('A) botón:', await btn.innerText(), '| habilitado:', await btn.isEnabled());
    await btn.click(); await p.waitForTimeout(300);
    console.log('   guarda:', JSON.stringify(await L(p)));
    await p.screenshot({ path: 'v_misma.png' });
    await p.locator('button[aria-label="Cerrar"]').first().click(); await p.waitForTimeout(300);
    // repetir día anterior en el jueves 19
    await col('J').scrollIntoViewIfNeeded();
    await col('J').locator('button', { hasText: 'Repetir día anterior' }).click(); await p.waitForTimeout(500);
    console.log('B) repetir:', JSON.stringify(await L(p)));
    // añadir tarea al viernes 20
    await col('V').scrollIntoViewIfNeeded();
    await col('V').locator('button', { hasText: 'Añadir tarea' }).click(); await p.waitForTimeout(300);
    await p.locator('.fixed button', { hasText: 'Finca 1 y 2' }).click(); await p.waitForTimeout(200);
    await p.screenshot({ path: 'v_anadir.png' });
    const primera = p.locator('.fixed .space-y-1\\.5 > button').first();
    await primera.click(); await p.waitForTimeout(200);
    await p.screenshot({ path: 'v_anadir2.png' });
    console.log('C) añadir:', JSON.stringify(await L(p)), '| botón:', await p.locator('.fixed button', { hasText: /Listo|Cerrar/ }).last().innerText());
  });
})();
