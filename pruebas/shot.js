const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const REPO = process.env.REPO || path.join(__dirname, '..'), F = path.join(__dirname, 'fake') + '/';
const tipos = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
module.exports = async function (fn, { movil = true, ruta = '/', ancho = 1366, init = null } = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext(movil ? { ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid' } : { viewport: { width: ancho, height: 800 }, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  await ctx.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.host === 'app.local') {
      if (u.pathname === '/__foto.jpg') return r.fulfill({ path: path.join(__dirname, 'foto_grande.jpg'), contentType: 'image/jpeg' });
      if (u.pathname === '/__datos.json') return r.fulfill({ path: process.env.DATOS || path.join(__dirname, 'datos-ejemplo.json'), contentType: 'application/json' });
      let f = path.join(REPO, u.pathname); if (u.pathname.endsWith('/')) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
      return r.fulfill({ path: f, contentType: tipos[path.extname(f)] || 'application/octet-stream' });
    }
    if (u.href.includes('firebasejs')) return r.fulfill({ path: F + u.pathname.split('/').pop(), contentType: 'application/javascript' });
    return r.abort();
  });
  const p = await ctx.newPage(); const errs = [];
  if (init) await p.addInitScript(init);
  if (process.env.FECHA) await p.clock.setFixedTime(new Date(process.env.FECHA));
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load')) errs.push(m.text()); });
  p.on('dialog', d => { console.log('DIALOGO:', d.message()); d.accept(); });
  await p.goto('http://app.local' + ruta); await p.waitForTimeout(1500);
  try { await fn(p); } finally { if (errs.length) console.log('ERR', errs.slice(0, 5)); await b.close(); }
};
