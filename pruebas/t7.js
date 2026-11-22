const run = require('./shot.js');
(async () => {
  await run(async p => {
    const finca6 = p.locator('.w-60', { hasText: 'Finca 6' }).first();
    console.log('lista Finca 6:', (await finca6.innerText()).replace(/\s+/g, ' ').slice(0, 130));
    console.log('números visibles en la lista:', await p.locator('.w-60 span', { hasText: /^\d+$/ }).count(), '| botón 🔃:', await p.locator('text=🔃').count());
    await p.evaluate(() => (window.__log = []));
    const col = p.locator('[data-columna]').first();
    await col.locator('button', { hasText: 'Añadir tarea' }).click(); await p.waitForTimeout(300);
    await p.locator('.fixed button', { hasText: 'Finca 6' }).click(); await p.waitForTimeout(200);
    await p.screenshot({ path: 'u_anadir.png' });
    await p.locator('.fixed .space-y-1\\.5 > button').first().click(); await p.waitForTimeout(200);
    console.log('al añadir:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => !x.ruta.startsWith('history') && !(x.op === 'delete')).map(x => [x.op, x.ruta, x.data.usos || x.data.description]))));
    await p.locator('.fixed button', { hasText: /Listo|Cerrar/ }).last().click(); await p.waitForTimeout(300);
    await p.screenshot({ path: 'u_inicio.png' });
  });
})();
