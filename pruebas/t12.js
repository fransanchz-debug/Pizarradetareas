// Notificaciones push en Ajustes > Avisos (con el navegador simulado: no se envía nada real).
const run = require('./shot.js');
const NAV = (permiso, conSub) => `
  window.__push = { pedido: 0, registrado: null, claveLen: 0 };
  const sub = { endpoint: 'https://push.ejemplo/abc', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'P', auth: 'A' } }; }, unsubscribe: async () => { window.__push.baja = true; return true; } };
  let actual = ${conSub ? 'sub' : 'null'};
  const reg = { pushManager: { getSubscription: async () => actual, subscribe: async (o) => { window.__push.claveLen = o.applicationServerKey.length; window.__push.userVisible = o.userVisibleOnly; actual = sub; return sub; } } };
  Object.defineProperty(navigator, 'serviceWorker', { value: { register: async (u) => { window.__push.registrado = u; return reg; }, ready: Promise.resolve(reg), getRegistration: async () => reg }, configurable: true });
  window.PushManager = function () {};
  window.Notification = { permission: '${permiso}', requestPermission: async () => { window.__push.pedido++; window.Notification.permission = '${permiso === 'denied' ? 'denied' : 'granted'}'; return window.Notification.permission; } };
`;
const ABRIR = async p => { await p.getByText('Ajustes').first().click(); await p.waitForTimeout(300); await p.getByText('Avisos').first().click(); await p.waitForTimeout(500); };
const caja = p => p.locator('text=Notificaciones en este aparato').locator('..');
(async () => {
  await run(async p => { await ABRIR(p); console.log('1) iPhone sin instalar:', (await caja(p).innerText()).replace(/\s+/g, ' ').slice(0, 190)); await p.screenshot({ path: 'p_instalar.png' }); });
  await run(async p => { await ABRIR(p); console.log('2) bloqueadas:', (await caja(p).innerText()).replace(/\s+/g, ' ').slice(0, 120)); }, { init: NAV('denied', false) });
  await run(async p => {
    await ABRIR(p); await p.evaluate(() => (window.__log = []));
    console.log('3) antes:', (await caja(p).innerText()).replace(/\s+/g, ' ').slice(0, 110));
    await p.screenshot({ path: 'p_inactivo.png' });
    await p.getByText('Activar notificaciones').click(); await p.waitForTimeout(600);
    console.log('   permiso pedido:', await p.evaluate(() => window.__push.pedido), '| sw registrado:', await p.evaluate(() => window.__push.registrado), '| clave (65 = correcta):', await p.evaluate(() => window.__push.claveLen), '| userVisibleOnly:', await p.evaluate(() => window.__push.userVisible));
    console.log('   guardado:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => x.ruta.startsWith('avisos/')).map(x => [x.op, x.ruta.replace(/avisos\/.*/, 'avisos/MIO'), x.data.subs.map(s => ({ endpoint: s.endpoint, keys: s.keys, confirmada: s.confirmada, aparato: s.aparato }))]))));
    console.log('   después:', (await caja(p).innerText()).replace(/\s+/g, ' ').slice(0, 100));
    await p.screenshot({ path: 'p_activo.png' });
  }, { init: NAV('default', false), movil: false });
  await run(async p => {
    await ABRIR(p); await p.evaluate(() => (window.__log = []));
    console.log('4) ya activas:', (await caja(p).innerText()).replace(/\s+/g, ' ').slice(0, 170));
    await p.getByText('Desactivar en este aparato').click(); await p.waitForTimeout(500);
    console.log('   al desactivar: baja =', await p.evaluate(() => window.__push.baja), '| guardado:', JSON.stringify(await p.evaluate(() => window.__log.filter(x => x.ruta.startsWith('avisos/')).map(x => x.data.subs))));
  }, { init: NAV('granted', true) + `window.__avisos = { subs: [{ endpoint: 'https://push.ejemplo/abc', keys: { p256dh: 'P', auth: 'A' }, confirmada: true, aparato: 'iPhone/iPad' }] };` });
  await run(async p => { console.log('5) Telegram en pantalla:', await p.locator('text=/Telegram/i').count()); await ABRIR(p); console.log('   Telegram en Avisos:', await p.locator('text=/Telegram/i').count()); });
})();
