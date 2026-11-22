const run = require('./shot.js');
(async () => {
  await run(async p => {
    await p.locator('[data-columna] [data-tarea-id]').filter({ hasText: 'Liar Pepinos' }).first().click(); await p.waitForTimeout(400);
    await p.evaluate(() => (window.__log = []));
    for (const d of ['X 18', 'J 19', 'V 20']) await p.locator('.fixed button', { hasText: new RegExp('^' + d + '$') }).click();
    await p.locator('text=Copiar a otros días').scrollIntoViewIfNeeded();
    await p.screenshot({ path: 'k_elegidos.png' });
    await p.locator('.fixed button', { hasText: 'Copiar a 3 días' }).click(); await p.waitForTimeout(500);
    console.log('copias:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => x.op === 'add').map(x => [x.ruta, x.data.dateString, x.data.description, x.data.workerIds.length]))));
    console.log('original intacta (sin update de fecha):', await p.evaluate(() => !window.__log.some(x => x.op === 'update' && x.ruta.startsWith('board/') && x.data.dateString)));
    console.log('aviso:', await p.locator('text=/Copiada a/').innerText());
    await p.screenshot({ path: 'k_hecho.png' });
  });
})();
