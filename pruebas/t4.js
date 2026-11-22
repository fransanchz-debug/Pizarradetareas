const run = require('./shot.js');
(async () => {
  await run(async p => {
    await p.evaluate(() => (window.__log = []));
    await p.locator('[data-columna] [data-tarea-id]').filter({ hasText: 'Liar Pepinos' }).first().click(); await p.waitForTimeout(400);
    await p.locator('input[type=file]').setInputFiles([require('path').join(__dirname, 'foto_grande.jpg'), require('path').join(__dirname, 'foto_grande.jpg')]);
    await p.waitForTimeout(4000);
    console.log('subidas:', JSON.stringify(await p.evaluate(() => window.__subidas)));
    console.log('guardado en la tarea:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => x.data && x.data.fotos).map(x => [x.ruta, x.data.fotos.length, x.data.fotos[0].ancho + 'x' + x.data.fotos[0].alto]))));
    await p.locator('text=📷 Fotos').scrollIntoViewIfNeeded();
    await p.screenshot({ path: 'f_tarea.png' });
    await p.locator('img.w-20').first().click(); await p.waitForTimeout(400);
    await p.screenshot({ path: 'f_visor.png' });
    await p.goBack(); await p.waitForTimeout(300);
    console.log('atrás con el visor: visor abierto =', await p.locator('[aria-label="Siguiente"]').count(), '| tarea abierta =', await p.locator('text=Los cambios se guardan solos').count());
  });
})();
