// Ajustes > Trabajadores: con la sincronización activa es solo de consulta.
const fs = require('fs'), os = require('os'), path = require('path');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos-ejemplo.json'), 'utf8'));
const con = JSON.parse(JSON.stringify(base)); con.config.trabajadoresDesdeAppero = true;
const archivo = (D, n) => { const f = path.join(os.tmpdir(), n); fs.writeFileSync(f, JSON.stringify(D)); return f; };
const run = require('./shot.js');
const mirar = async (p) => { await p.getByText('Ajustes').first().click(); await p.waitForTimeout(300); await p.getByText('Trabajadores').first().click(); await p.waitForTimeout(300);
  return { formulario: await p.locator('.fixed input[placeholder="Nombre..."]').count(), papeleras: await p.locator('.fixed button', { hasText: '🗑️' }).count(), aviso: await p.locator('.fixed >> text=alta y de baja en appero').count(), lista: await p.locator('.fixed .space-y-1\\.5 > div').count() }; };
(async () => {
  process.env.DATOS = archivo(base, 'd-sin.json');
  await run(async p => console.log('1) sin sincronización (como hasta ahora):', JSON.stringify(await mirar(p))));
  process.env.DATOS = archivo(con, 'd-con.json');
  await run(async p => { console.log('2) con sincronización:', JSON.stringify(await mirar(p))); await p.screenshot({ path: 'w_appero.png' }); });
})();
