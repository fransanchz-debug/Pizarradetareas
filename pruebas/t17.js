// Calendario semanal: aparece solo con el móvil de lado (lunes a domingo, solo lectura) y no estorba en vertical.
const run = require('./shot.js');
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if (!c) process.exitCode = 1; };
(async () => {
  process.env.FECHA = '2026-11-18T10:00:00';
  await run(async p => {
    ok(await p.locator('[data-calendario]').count() === 0, 'en vertical no hay calendario');
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(500);
    ok(await p.locator('[data-calendario]').count() === 1, 'de lado aparece el calendario');
    const dias = await p.locator('[data-dia]').evaluateAll(l => l.map(x => x.getAttribute('data-dia')));
    ok(dias.join() === '2026-11-16,2026-11-17,2026-11-18,2026-11-19,2026-11-20,2026-11-21,2026-11-22', 'lunes 16 a domingo 22 (semana del 18/11)');
    const n = await p.locator('[data-dia="2026-11-17"] .line-clamp-3').count();
    ok(n === 10, `el martes 17 enseña sus 10 tareas (salen ${n})`);
    const cabe = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && !!document.querySelector('[data-calendario]'));
    ok(cabe, 'los 7 días caben a lo ancho sin desplazar');
    await p.screenshot({ path: 'cal_horizontal.png' });
    const cdp = await p.context().newCDPSession(p);
    const deslizar = async (x0, x1, y0 = 200, y1 = 200) => { const pt = (x, y) => ({ touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', ...pt(x0, y0) }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', ...pt((x0 + x1) / 2, (y0 + y1) / 2) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(250); };
    ok(await p.getByText('◀').count() === 0, 'ya no hay flechas');
    await deslizar(600, 200); // dedo hacia la izquierda
    ok(await p.locator('[data-dia="2026-11-23"]').count() === 1, 'deslizar a la izquierda pasa a la semana siguiente');
    await deslizar(200, 600); await deslizar(200, 600); // dos veces hacia la derecha
    ok(await p.locator('[data-dia="2026-11-09"]').count() === 1, 'deslizar a la derecha vuelve a la semana pasada');
    await deslizar(300, 330, 100, 300); // casi vertical: no cambia
    ok(await p.locator('[data-dia="2026-11-09"]').count() === 1, 'un gesto casi vertical o corto no cambia de semana');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
    ok(await p.locator('[data-calendario]').count() === 0, 'al volver a vertical desaparece');
  });
  await run(async p => {  // ordenador: nunca calendario
    ok(await p.locator('[data-calendario]').count() === 0, 'en un ordenador no aparece');
  }, { movil: false });
})();
