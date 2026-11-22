const run = require('./shot.js');
const L = p => p.evaluate(() => (window.__log || []).splice(0).filter(x => !x.ruta.startsWith('history') && x.op !== 'delete').map(x => [x.op, x.ruta.replace('privadas/seq3CISgWIdOMnRGH2QAXvSHDyw1/', 'MIO/'), x.data.description || (x.data.usos && x.data.usos.incremento ? '+1' : '')]));
(async () => {
  await run(async p => {
    const abrir = async (paraMi) => {
      await p.locator('[data-columna]').first().locator('button', { hasText: 'Añadir tarea' }).click(); await p.waitForTimeout(300);
      if (paraMi) await p.locator('button', { hasText: 'Para mí' }).click();
      await p.locator('.fixed button', { hasText: 'Finca 8' }).click(); await p.waitForTimeout(200);
    };
    const crear = async (texto) => { await p.locator('.fixed input[placeholder*="Nueva tarea"]').fill(texto); await p.locator('.fixed button', { hasText: 'Crear' }).click(); await p.waitForTimeout(400); };
    const cerrar = async () => { await p.locator('.fixed button', { hasText: /Listo|Cerrar/ }).last().click(); await p.waitForTimeout(300); };
    await p.evaluate(() => (window.__log = []));
    await abrir(false); await crear('Poner mallas'); console.log('1) nueva normal:', JSON.stringify(await L(p)));
    await crear('liar'); console.log('2) ya existe («liar» = Liar):', JSON.stringify(await L(p))); await cerrar();
    await abrir(true);
    console.log('3) con Para mí, primeras de la lista:', (await p.locator('.fixed .space-y-1\\.5 > button').allInnerTexts()).slice(0, 3).map(t => t.replace(/\s+/g, ' ')));
    await p.screenshot({ path: 'n_personal.png' });
    await crear('Revisar bomba'); console.log('4) nueva mía:', JSON.stringify(await L(p)));
    await p.locator('.fixed .space-y-1\\.5 > button', { hasText: 'Revisar contador' }).click(); await p.waitForTimeout(300);
    console.log('5) elegir mía de la lista:', JSON.stringify(await L(p)));
    await cerrar();
    await abrir(false); console.log('6) sin Para mí no salen las mías:', await p.locator('.fixed >> text=Revisar contador').count());
  });
})();
