const run = require('./shot.js');
(async () => {
  await run(async p => { await p.screenshot({ path: 'f_pizarra.png' }); });
  await run(async p => {
    await p.screenshot({ path: 'f_espejo.png' });
    await p.getByText('Liar Pepinos').first().click(); await p.waitForTimeout(500);
    await p.locator('text=Fotos de la tarea').scrollIntoViewIfNeeded();
    await p.screenshot({ path: 'f_espejo_tarea.png' });
  }, { ruta: '/espejo/' });
})();
