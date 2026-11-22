const run = require('./shot.js');
(async () => {
  await run(async p => {
    await p.evaluate(() => (window.__log = []));
    const cdp = await p.context().newCDPSession(p);
    const cards = p.locator('[data-columna="M"] [data-tarea-id]');
    const ids0 = await cards.evaluateAll(els => els.map(e => e.textContent.slice(0, 22)));
    const a = await cards.nth(0).boundingBox(), c = await cards.nth(2).boundingBox();
    const x = a.x + a.width / 2, y = a.y + a.height / 2, y2 = c.y + c.height * 0.8;
    const toque = (type, yy) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: yy }] });
    await toque('touchStart', y); await p.waitForTimeout(650);
    for (let i = 1; i <= 8; i++) { await toque('touchMove', y + (y2 - y) * i / 8); await p.waitForTimeout(30); }
    await p.screenshot({ path: 'v_arrastre.png' });
    await toque('touchEnd', y2); await p.waitForTimeout(400);
    const log = await p.evaluate(() => window.__log.filter(x => x.op === 'update').map(x => [x.ruta, x.data]));
    console.log('D) arrastre: primera tarea =', ids0[0], '| guardado:', JSON.stringify(log), '| ventana abierta tras soltar:', await p.locator('text=Los cambios se guardan solos').count());
    // histórico completo solo al abrir
    await p.locator('button', { hasText: 'Histórico' }).click(); await p.waitForTimeout(500);
    console.log('E) lecturas de histórico al abrir la ventana:', JSON.stringify(await p.evaluate(() => window.__lecturas.history)));
    await p.screenshot({ path: 'v_historico.png' });
    await p.goBack(); await p.waitForTimeout(300);
    await p.locator('button', { hasText: 'Ajustes' }).click(); await p.waitForTimeout(300);
    await p.screenshot({ path: 'v_ajustes.png' });
  });
  await run(async p => {
    await p.screenshot({ path: 'v_espejo_hoy.png' });
    await p.locator('button', { hasText: 'Mañana' }).click(); await p.waitForTimeout(300);
    await p.screenshot({ path: 'v_espejo_manana.png' });
    console.log('F) espejo mañana:', (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 160));
  }, { ruta: '/espejo/' });
  await run(async p => { await p.screenshot({ path: 'v_ordenador.png' }); }, { movil: false });
})();
