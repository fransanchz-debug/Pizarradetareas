const run = require('./shot.js');
(async () => {
  await run(async p => {
    console.log('botones ocultos de la lista en el móvil:', await p.locator('.w-60 button', { hasText: '🗑️' }).first().isVisible());
    await p.locator('.w-60').filter({ hasText: 'Finca 9' }).locator('text=Limpiar la puerta').click(); await p.waitForTimeout(300);
    await p.screenshot({ path: 'c_menu.png' });
    await p.evaluate(() => (window.__log = []));
    await p.locator('button', { hasText: '🗑️ Borrar' }).click(); await p.waitForTimeout(300);
    console.log('borrar:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => x.ruta.startsWith('catalog')).map(x => [x.op, x.ruta]))), '| ventana cerrada:', await p.locator('text=Mover a la pizarra').count() === 0);
    await p.locator('.w-60').filter({ hasText: 'Finca 9' }).locator('text=Liar').click(); await p.waitForTimeout(300);
    await p.locator('button', { hasText: '✏️ Editar' }).click(); await p.waitForTimeout(300);
    console.log('editar abre:', await p.locator('text=Editar Tarea').count(), '| valor:', await p.locator('form input[type=text]').inputValue());
  });
})();
