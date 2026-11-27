// Acceso directo en la pantalla de inicio: botón en la espejo (📲) y en Ajustes > Avisos de la pizarra.
const run = require('./shot.js');
(async () => {
  await run(async p => {
    await p.locator('button[title^="Poner la app"]').click(); await p.waitForTimeout(300);
    console.log('1) espejo, iPhone/Safari, pasos:', await p.locator('.fixed >> text=Añadir a pantalla de inicio').count(), '(esperado 1)');
    await p.screenshot({ path: 'i_espejo.png' });
  }, { ruta: '/espejo/' });
  await run(async p => {
    await p.locator('button[title^="Poner la app"]').click(); await p.waitForTimeout(300);
    console.log('2) ya instalada:', await p.locator('.fixed >> text=ya está en la pantalla de inicio').count(), '(esperado 1)');
  }, { ruta: '/espejo/', init: () => Object.defineProperty(navigator, 'standalone', { value: true }) });
  await run(async p => {
    await p.getByText('Ajustes').first().click(); await p.waitForTimeout(300);
    await p.getByText('Avisos').first().click(); await p.waitForTimeout(400);
    console.log('3) pizarra, Ajustes > Avisos:', await p.locator('.fixed >> text=Poner la app en la pantalla del móvil').count(), '(esperado 1)');
    await p.screenshot({ path: 'i_pizarra.png' });
  });
  await run(async p => {
    await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__lanzado = 1; }; e.userChoice = Promise.resolve({}); window.dispatchEvent(e); });
    await p.locator('button[title^="Poner la app"]').click(); await p.waitForTimeout(300);
    await p.getByText('Añadir a la pantalla de inicio').click(); await p.waitForTimeout(200);
    console.log('4) Android: el botón lanza la instalación:', await p.evaluate(() => window.__lanzado), '(esperado 1)');
  }, { ruta: '/espejo/' });
})();
