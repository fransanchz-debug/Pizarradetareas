// «Tareas listas»: publicar el día (pizarra), avisar de cambios, y lo que ve la espejo (sin publicar / publicado / con cambios).
const fs = require('fs'), os = require('os'), path = require('path');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos-ejemplo.json'), 'utf8'));
const guardar = (D, n) => { const f = path.join(os.tmpdir(), n); fs.writeFileSync(f, JSON.stringify(D)); return f; };
const run = require('./shot.js');
const HOY = '2026-11-17';
const delDia = base.board.filter(t => (t.targetDateStr || t.dateString) === HOY);
const firma = (t) => JSON.stringify([t.fincaId || '', (t.description || '').trim(), (t.notes || '').trim(), t.stars || 0, [...(t.workerIds || [])].sort(), (t.fotos || []).length]);
const log = (p) => p.evaluate(() => window.__log || []);
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if (!c) process.exitCode = 1; };
(async () => {
  console.log('1) pizarra a las 10:00 (antes de la salida): el botón avisa de HOY');
  process.env.FECHA = '2026-11-17T10:00:00+01:00'; process.env.DATOS = guardar({ ...base, pubs: {} }, 'd16a.json');
  await run(async p => {
    ok(await p.getByText('Avisar a Fabio y Mory').first().count() === 1, 'se ve el botón de avisar');
    await p.getByText('Avisar a Fabio y Mory').first().click(); await p.waitForTimeout(400);
    const l = await log(p), pub = l.find(x => x.ruta === 'publicados/' + HOY), av = l.find(x => x.ruta === 'avisosPendientes');
    ok(pub && Object.keys(pub.data.firma).length === delDia.length, `guarda lo publicado (${delDia.length} tareas)`);
    ok(av && av.data.tipo === 'publicar' && av.data.titulo.includes('tareas de hoy') && av.data.enviado === false, 'pide el aviso: «…las tareas de hoy»');
  });
  console.log('2) a las 20:00 (jornada acabada, antes de las 12): avisa de MAÑANA');
  process.env.FECHA = '2026-11-17T20:00:00+01:00';
  await run(async p => {
    await p.getByText('Avisar a Fabio y Mory').first().click(); await p.waitForTimeout(400);
    const l = await log(p), av = l.find(x => x.ruta === 'avisosPendientes');
    ok(av && av.data.titulo.includes('tareas de mañana') && av.data.fecha === '2026-11-18', 'pide el aviso: «…las tareas de mañana» (18/11)');
  });
  console.log('3) ya publicado y sin cambios: no hay botón ni barra');
  process.env.FECHA = '2026-11-17T10:00:00+01:00';
  const firmas = Object.fromEntries(delDia.map(t => [t.id, firma(t)]));
  const pubOk = { [HOY]: { fecha: HOY, publicadoEn: Date.now(), firma: firmas, nombres: {}, cambios: {}, quitadas: [], cambiosEn: null } };
  process.env.DATOS = guardar({ ...base, pubs: pubOk }, 'd16b.json');
  await run(async p => {
    ok(await p.getByText('Avisar a Fabio y Mory').first().count() === 0, 'sin botón');
    ok(await p.getByText('sin avisar').count() === 0 && await p.getByText('Publicado a las').count() >= 1, 'solo «Publicado a las…»');
  });
  console.log('4) cambios después de publicar: barra «sin avisar» y aviso con detalle');
  const f2 = { ...firmas }; delete f2[delDia[0].id]; f2[delDia[1].id] = 'otra'; f2['ID_BORRADA'] = 'x';
  const pubCambios = { [HOY]: { fecha: HOY, publicadoEn: 1000, firma: f2, nombres: { ID_BORRADA: 'Finca 9 · Tarea borrada' }, cambios: {}, quitadas: [], cambiosEn: null } };
  process.env.DATOS = guardar({ ...base, pubs: pubCambios }, 'd16c.json');
  await run(async p => {
    ok(await p.getByText('3 cambios sin avisar').count() === 1, 'la barra dice «3 cambios sin avisar»');
    await p.getByText('3 cambios sin avisar').click(); await p.waitForTimeout(400);
    const l = await log(p), pub = l.find(x => x.ruta === 'publicados/' + HOY), av = l.find(x => x.ruta === 'avisosPendientes');
    ok(pub && pub.data.cambios[delDia[0].id] === 'nueva' && pub.data.cambios[delDia[1].id] === 'cambiada' && pub.data.quitadas[0] === 'Finca 9 · Tarea borrada', 'marca nueva / cambiada / quitada');
    ok(pub && pub.data.publicadoEn === 1000 && !('id' in pub.data), 'conserva la hora de publicación y no guarda el id');
    ok(av && av.data.tipo === 'cambio' && /Nueva:/.test(av.data.cuerpo) && /Cambiada:/.test(av.data.cuerpo) && /Quitada: Finca 9/.test(av.data.cuerpo), 'el aviso detalla los 3 cambios');
  });
  console.log('5) espejo: día sin publicar');
  process.env.DATOS = guardar({ ...base, pubs: {} }, 'd16d.json');
  await run(async p => {
    ok(await p.getByText('Aún no están publicadas las tareas de hoy').count() === 1, 'dice «Aún no están publicadas…»');
    ok(await p.locator('text=Coger pepinos').count() === 0, 'no enseña ninguna tarea');
  }, { ruta: '/espejo/' });
  console.log('6) espejo: publicado con cambios');
  const pubEsp = { [HOY]: { fecha: HOY, publicadoEn: 1000, cambiosEn: Date.now(), firma: {}, nombres: {}, cambios: { [delDia[0].id]: 'nueva', [delDia[1].id]: 'cambiada' }, quitadas: ['Finca 9 · Tarea borrada'] } };
  process.env.DATOS = guardar({ ...base, pubs: pubEsp }, 'd16e.json');
  await run(async p => {
    ok(await p.getByText('NUEVA', { exact: true }).count() === 1 && await p.getByText('CAMBIADA', { exact: true }).count() === 1, 'marca NUEVA y CAMBIADA');
    ok(await p.getByText('Finca 9 · Tarea borrada').count() === 1, 'enseña la tarea quitada');
    ok(await p.getByText('Cambios avisados a las').count() === 1, 'dice cuándo se avisó');
    await p.screenshot({ path: 'q_espejo_cambios.png' });
  }, { ruta: '/espejo/' });
})();
