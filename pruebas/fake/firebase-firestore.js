const D = await (await fetch('/__datos.json')).json();
const conf = { general: D.config };
const avisos = { 'seq3CISgWIdOMnRGH2QAXvSHDyw1': { chatId: 1 } };
export const getFirestore = () => ({});
export const collection = (db, ...p) => ({ kind: 'col', name: p[p.length - 1], ruta: p.join('/') });
export const doc = (db, ...p) => ({ kind: 'doc', col: p[p.length - 2], id: p[p.length - 1], ruta: p.join('/') });
export const where = (campo, op, valor) => ({ campo, op, valor });
export const query = (x, ...w) => ({ ...x, filtros: w });
export const onSnapshot = (ref, cb) => {
  setTimeout(() => {
    if (ref.kind === 'col') {
      const filas = (D[ref.name] || []).filter(d => (ref.filtros || []).every(f => f.op === '>=' ? (d[f.campo] || '') >= f.valor : d[f.campo] === f.valor));
      window.__lecturas = (window.__lecturas || {}); window.__lecturas[ref.ruta.replace('artifacts/ecologicos-almeria-v1/', '')] = filas.length;
      const items = filas.map(d => { const { id, ...rest } = d; return { id, data: () => rest }; });
      cb({ forEach: f => items.forEach(f), size: items.length });
    } else {
      const v = ref.col === 'config' ? conf[ref.id] : ref.col === 'avisos' ? avisos[ref.id] : null;
      cb({ exists: () => !!v, data: () => v });
    }
  }, 100);
  return () => {};
};
const anota = (op) => async (ref, data) => { (window.__log = window.__log || []).push({ op, ruta: (ref.ruta || '').replace('artifacts/ecologicos-almeria-v1/', ''), data }); return { id: 'nuevo' + window.__log.length }; };
export const addDoc = anota('add'), updateDoc = anota('update'), deleteDoc = anota('delete'), setDoc = anota('set');
export const increment = (n) => ({ incremento: n });
