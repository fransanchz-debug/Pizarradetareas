const run = require('./shot.js');
(async () => {
  await run(async p => {
    await p.evaluate(() => (window.__log = []));
    await p.locator('.w-60').filter({ hasText: 'Finca 9' }).locator('text=Limpiar la puerta').click(); await p.waitForTimeout(300);
    await p.screenshot({ path: 'c_mia.png' });
    await p.locator('button', { hasText: '👤 Mía' }).click(); await p.waitForTimeout(300);
    console.log('Mía:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => !x.ruta.startsWith('history') && x.op !== 'delete').map(x => [x.op, x.ruta, x.data.fecha || x.data.incremento, x.data.description]))), '| ventana cerrada:', await p.locator('text=Mover a la pizarra').count() === 0);
    await p.evaluate(() => (window.__log = []));
    await p.locator('.w-60').filter({ hasText: 'Finca 9' }).locator('text=Liar').click(); await p.waitForTimeout(300);
    await p.locator('.fixed button', { hasText: 'X 18' }).click(); await p.waitForTimeout(300);
    console.log('día normal sigue igual:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => !x.ruta.startsWith('history') && x.op !== 'delete').map(x => [x.op, x.ruta, x.data.dateString || x.data.incremento]))));
  });
})();
