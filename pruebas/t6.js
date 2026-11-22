const run = require('./shot.js');
const L = p => p.evaluate(() => (window.__log || []).splice(0).filter(x => !x.ruta.startsWith('history') && !(x.op === 'delete' && x.ruta.startsWith('board/'))).map(x => [x.op, x.ruta, x.data]));
(async () => {
  await run(async p => {
    await p.waitForTimeout(500);
    console.log('1) al abrir (la de ayer 17 sin hacer pasa a hoy):', JSON.stringify(await L(p)));
    await p.screenshot({ path: 'm_hoy.png' });
    // marcar hecha desde la tarjeta
    await p.locator('[data-mia-id="mia2"] button').first().click(); await p.waitForTimeout(200);
    console.log('2) marcar hecha:', JSON.stringify(await L(p)));
    // abrir la tarea personal, nota, cerrar
    await p.locator('[data-mia-id="mia2"]').click(); await p.waitForTimeout(300);
    await p.screenshot({ path: 'm_ventana.png' });
    await p.locator('textarea').fill('Preguntar por el goteo'); await p.mouse.click(195, 15); await p.waitForTimeout(900);
    console.log('3) nota al cerrar:', JSON.stringify(await L(p)));
    // añadir tarea personal y luego una normal (el interruptor vuelve a desactivarse)
    const col = p.locator('[data-columna]').first();
    await col.locator('button', { hasText: 'Añadir tarea' }).click(); await p.waitForTimeout(300);
    await p.locator('button', { hasText: 'Para mí' }).click();
    await p.locator('.fixed button', { hasText: 'Finca 9' }).click(); await p.waitForTimeout(200);
    await p.screenshot({ path: 'm_anadir.png' });
    await p.locator('.fixed .space-y-1\\.5 > button').first().click(); await p.waitForTimeout(200);
    await p.locator('.fixed button', { hasText: /Listo|Cerrar/ }).last().click(); await p.waitForTimeout(300);
    await col.locator('button', { hasText: 'Añadir tarea' }).click(); await p.waitForTimeout(300);
    await p.locator('.fixed button', { hasText: 'Finca 9' }).click(); await p.waitForTimeout(200);
    await p.locator('.fixed .space-y-1\\.5 > button').first().click(); await p.waitForTimeout(200);
    console.log('4) añadir (personal y después normal):', JSON.stringify((await L(p)).map(x => [x[0], x[1], x[2] && x[2].description])));
    await p.locator('.fixed button', { hasText: /Listo|Cerrar/ }).last().click(); await p.waitForTimeout(300);
    // histórico: la hecha del 18 aparece como "Mía"
    await p.locator('button', { hasText: 'Histórico' }).click(); await p.waitForTimeout(400);
    await p.locator('.grid-cols-7 div', { hasText: /^18/ }).first().click(); await p.waitForTimeout(300);
    console.log('5) histórico del 18 incluye la mía:', await p.locator('text=Pedir abono').count(), '| etiqueta Mía:', await p.locator('.fixed >> text=👤 Mía').count());
  });
  await run(async p => { console.log('6) la espejo lee:', JSON.stringify(await p.evaluate(() => window.__lecturas))); }, { ruta: '/espejo/' });
})();
