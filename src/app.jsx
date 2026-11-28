const { useState, useEffect, useRef } = React;

const APP_ID = "ecologicos-almeria-v1"; 

const COLOR_PALETTE = [
  { id: 'purple', color: 'bg-purple-100 border-purple-500 text-purple-900', handleColor: 'bg-purple-500' },
  { id: 'red', color: 'bg-red-100 border-red-500 text-red-900', handleColor: 'bg-red-500' },
  { id: 'orange', color: 'bg-orange-100 border-orange-500 text-orange-900', handleColor: 'bg-orange-500' },
  { id: 'green', color: 'bg-green-100 border-green-500 text-green-900', handleColor: 'bg-green-500' },
  { id: 'black', color: 'bg-slate-200 border-slate-800 text-slate-900', handleColor: 'bg-slate-800' },
  { id: 'blue', color: 'bg-blue-100 border-blue-500 text-blue-900', handleColor: 'bg-blue-500' },
  { id: 'pink', color: 'bg-pink-100 border-pink-500 text-pink-900', handleColor: 'bg-pink-500' },
  { id: 'yellow', color: 'bg-yellow-100 border-yellow-500 text-yellow-900', handleColor: 'bg-yellow-500' }
];

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const traducir = (e) => {
    const c = (e && e.code) || '';
    if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-email')) return 'Correo o contraseña incorrectos.';
    if (c.includes('too-many-requests')) return 'Demasiados intentos. Espera unos minutos.';
    if (c.includes('network')) return 'Sin conexión. Revisa internet.';
    return 'No se ha podido entrar (' + (c || 'error') + ').';
  };

  const entrar = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await window.FirebaseAPI.signInWithEmailAndPassword(window.FirebaseAPI.auth, email.trim(), password);
    } catch (err) { setMsg({ ok: false, text: traducir(err) }); }
    setBusy(false);
  };

  const recuperar = async () => {
    if (!email.trim()) { setMsg({ ok: false, text: 'Escribe primero tu correo.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await window.FirebaseAPI.sendPasswordResetEmail(window.FirebaseAPI.auth, email.trim());
      setMsg({ ok: true, text: 'Te hemos enviado un correo para crear una contraseña nueva. Mira también en spam.' });
    } catch (err) { setMsg({ ok: false, text: traducir(err) }); }
    setBusy(false);
  };

  return (
    <div className="flex items-center justify-center h-[100dvh] bg-slate-50 p-4">
      <form onSubmit={entrar} className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 flex flex-col gap-3">
        <h1 className="text-xl font-bold text-slate-800 text-center">Tareas Semanales</h1>
        <p className="text-sm text-slate-500 text-center mb-2">Entra con tu correo y contraseña</p>
        <input type="email" autoComplete="username" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-base" required />
        <input type="password" autoComplete="current-password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-base" required />
        <button type="submit" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg py-2">{busy ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" onClick={recuperar} disabled={busy} className="text-sm text-blue-700 underline">He olvidado mi contraseña</button>
        {msg && <div className={`text-sm rounded-lg p-2 text-center ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      </form>
    </div>
  );
}

// Reduce una foto a 1600 px como máximo y la pasa a JPEG (unos 200-400 KB).
async function comprimirFoto(archivo, lado = 1600, calidad = 0.8) {
  let img;
  try { img = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); }
  catch (e) {
    img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = URL.createObjectURL(archivo); });
  }
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const ancho = Math.round(img.width * escala), alto = Math.round(img.height * escala);
  const lienzo = document.createElement('canvas'); lienzo.width = ancho; lienzo.height = alto;
  lienzo.getContext('2d').drawImage(img, 0, 0, ancho, alto);
  const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/jpeg', calidad));
  return { blob, ancho, alto };
}

// Visor de fotos a pantalla completa (tocar fuera o ✕ para cerrar; flechas si hay varias).
function VisorFotos({ fotos, indice, onCambiar, onCerrar }) {
  const foto = fotos[indice];
  if (!foto) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={onCerrar}>
      <img src={foto.url} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
      <button onClick={onCerrar} aria-label="Cerrar" className="absolute top-3 right-3 text-white/90 text-3xl leading-none w-11 h-11 flex items-center justify-center rounded-full bg-black/40">✕</button>
      {fotos.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); onCambiar((indice - 1 + fotos.length) % fotos.length); }} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-3xl w-11 h-11 rounded-full bg-black/40">‹</button>
        <button onClick={e => { e.stopPropagation(); onCambiar((indice + 1) % fotos.length); }} aria-label="Siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-3xl w-11 h-11 rounded-full bg-black/40">›</button>
        <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">{indice + 1} de {fotos.length}</div>
      </>}
    </div>
  );
}

// Clave pública de las notificaciones (la privada está solo en Google Secret Manager).
const VAPID_PUBLICA = "BAh47kyd20EM3ia-K5WnVTT6xlRLoI4lHCJbq744AtAK9iVGoHX8Xm8F-BoR59JJLFu_xXLziz-7Y3jxXKGSN6E";
const clavePush = (b64) => {
  const raw = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const appInstalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// ===== ACCESO DIRECTO EN LA PANTALLA DE INICIO =====
// Guarda el aviso de instalación de Android/Chrome para poder lanzarlo desde un botón.
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__avisoInstalar = e; });

function InstalarApp() {
  const [, redibujar] = useState(0);
  useEffect(() => {
    const f = () => redibujar(n => n + 1);
    window.addEventListener('beforeinstallprompt', f);
    window.addEventListener('appinstalled', f);
    return () => { window.removeEventListener('beforeinstallprompt', f); window.removeEventListener('appinstalled', f); };
  }, []);
  const ua = navigator.userAgent || '';
  const instalada = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  const instalar = async () => {
    const e = window.__avisoInstalar; if (!e) return;
    e.prompt(); try { await e.userChoice; } catch (x) {}
    window.__avisoInstalar = null; redibujar(n => n + 1);
  };
  const paso = (n, t) => <div className="flex gap-2 items-start"><span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center">{n}</span><span className="text-sm text-slate-700">{t}</span></div>;
  if (instalada) return <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-3">✅ La app ya está en la pantalla de inicio de este móvil.</div>;
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm space-y-2.5">
      <div className="font-bold text-slate-800">📲 Poner la app en la pantalla del móvil</div>
      {window.__avisoInstalar ? (
        <button onClick={instalar} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-base">Añadir a la pantalla de inicio</button>
      ) : ios && !safari ? (
        <div className="text-sm text-slate-700">En el iPhone solo se puede desde <b>Safari</b>. Abre este mismo enlace en Safari (el icono de la brújula azul) y vuelve a pulsar aquí.</div>
      ) : ios ? (
        <div className="space-y-2">
          {paso(1, <>Pulsa el botón <b>Compartir</b> de Safari (el cuadrado con una flecha hacia arriba ⬆️, abajo en el centro).</>)}
          {paso(2, <>Desliza hacia abajo y pulsa <b>«Añadir a pantalla de inicio»</b>.</>)}
          {paso(3, <>Pulsa <b>«Añadir»</b> arriba a la derecha. Ya tendrás el icono en el móvil.</>)}
        </div>
      ) : (
        <div className="space-y-2">
          {paso(1, <>Pulsa el menú del navegador (los tres puntos ⋮).</>)}
          {paso(2, <>Pulsa <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</>)}
        </div>
      )}
    </div>
  );
}
// ===== FIN ACCESO DIRECTO =====

// ===== TAREAS LISTAS (publicar el día a Fabio y Mory) =====
// publicados/{fecha}: lo que los trabajadores ya han visto (firma de cada tarea), los cambios avisados desde entonces
// (cambios: id -> 'nueva'|'cambiada'; quitadas: nombres) y cuándo. La espejo solo enseña los días publicados.
const firmaTarea = (t) => JSON.stringify([t.fincaId || '', (t.description || '').trim(), (t.notes || '').trim(), t.stars || 0, [...(t.workerIds || [])].sort(), (t.fotos || []).length]);
const firmasDe = (tareas) => Object.fromEntries(tareas.map(t => [t.id, firmaTarea(t)]));
const calcularCambios = (tareas, pub) => {
  const firma = (pub && pub.firma) || {};
  return {
    nuevas: tareas.filter(t => firma[t.id] === undefined),
    cambiadas: tareas.filter(t => firma[t.id] !== undefined && firma[t.id] !== firmaTarea(t)),
    quitadas: Object.keys(firma).filter(id => !tareas.some(t => t.id === id)),
  };
};

// ===== CALENDARIO SEMANAL (al girar el móvil de lado) =====
// Solo lectura: lunes a domingo, una columna por día, con lo mínimo de cada tarea. Aparece solo en un móvil en horizontal.
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function CalendarioSemana({ boardTasks, historyTasks, fincas, hoyStr, user }) {
  const [semana, setSemana] = useState(0); // 0 = esta semana, -1 = la anterior, 1 = la siguiente
  const toque = useRef(null);
  const [historiaSemana, setHistoriaSemana] = useState([]);
  const hoy = new Date(hoyStr + 'T12:00:00');
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) + semana * 7);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return { fecha: isoLocal(d), num: d.getDate(), nombre: ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][i] }; });
  const desde = dias[0].fecha, hasta = dias[6].fecha;
  // Los días ya pasados están en el histórico: se leen solo desde el lunes que se mira
  useEffect(() => {
    if (!user || !window.FirebaseAPI || desde >= hoyStr) { setHistoriaSemana([]); return; }
    const { db, collection, query, where, onSnapshot } = window.FirebaseAPI;
    return onSnapshot(query(collection(db, 'artifacts', APP_ID, 'history'), where('snapshotDate', '>=', desde)), (snap) => {
      const items = []; snap.forEach(d => items.push({ ...d.data(), id: d.id })); setHistoriaSemana(items);
    });
  }, [user, desde, hoyStr]);
  const tareasDe = (fecha) => {
    const porId = new Map();
    [...historyTasks, ...historiaSemana].filter(t => t.snapshotDate === fecha).forEach(t => porId.set(String(t.id).split('_').slice(1).join('_') || t.id, t));
    boardTasks.filter(t => (t.targetDateStr || t.dateString) === fecha).forEach(t => porId.set(t.id, t));
    return [...porId.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
  };
  const nombreF = (n) => (n || '?').replace(/\s*y\s*/gi, ' y ').replace(/\s+/g, ' ').trim();
  const finca = (id) => { const f = fincas.find(f => f.id === id); return f ? { ...f, name: nombreF(f.name) } : { name: '?', color: 'bg-gray-100 border-gray-400', handleColor: 'bg-gray-400' }; };
  const etiqueta = (n) => 'F' + nombreF(n).replace(/^finca\s*/i, '').replace(/ y /g, '-').replace(/\s+/g, '');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const rango = `${dias[0].num}${dias[0].fecha.slice(5, 7) !== dias[6].fecha.slice(5, 7) ? ' ' + meses[Number(dias[0].fecha.slice(5, 7)) - 1] : ''} – ${dias[6].num} ${meses[Number(dias[6].fecha.slice(5, 7)) - 1]}`;
  return (
    <div data-calendario className="fixed inset-0 z-40 bg-white flex flex-col"
      onTouchStart={(e) => { const t = e.touches[0]; toque.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={(e) => { // deslizar el dedo hacia un lado: cambia de semana (hacia la izquierda = la siguiente)
        const i = toque.current; toque.current = null; if (!i) return;
        const t = e.changedTouches[0]; const dx = t.clientX - i.x, dy = t.clientY - i.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) setSemana(s => s + (dx < 0 ? 1 : -1));
      }}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="shrink-0 text-center py-0.5 bg-slate-800 text-white text-[12px] font-bold">
        {semana === 0 ? 'Esta semana' : semana === -1 ? 'Semana pasada' : semana === 1 ? 'Próxima semana' : 'Semana'} · {rango}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-7 divide-x divide-slate-200">
        {dias.map(d => {
          const tareas = tareasDe(d.fecha); const esHoy = d.fecha === hoyStr;
          return (
            <div key={d.fecha} data-dia={d.fecha} className="flex flex-col min-w-0 min-h-0">
              <div className={`shrink-0 text-center font-extrabold leading-tight py-0.5 ${esHoy ? 'bg-emerald-600 text-white' : d.fecha < hoyStr ? 'bg-slate-100 text-slate-500' : 'bg-slate-200 text-slate-800'}`} style={{ fontSize: 'var(--cal-d, 14px)' }}>{d.nombre} {d.num}</div>
              <div className="flex-1 min-h-0 overflow-y-auto p-0.5 space-y-0.5 bg-slate-50">
                {tareas.map(t => { const f = finca(t.fincaId); return (
                  <div key={t.id} className={`flex bg-white border ${f.color.split(' ')[1]} rounded overflow-hidden`}>
                    <div className={`w-1 shrink-0 ${f.handleColor}`}></div>
                    <div className="px-1 py-0.5 min-w-0 leading-[1.1]">
                      <div className="font-black text-slate-500" style={{ fontSize: 'var(--cal-e, 12px)' }}>{etiqueta(f.name)}</div>
                      <div className="font-semibold text-slate-800 line-clamp-3" style={{ fontSize: 'var(--cal-t, 17px)', hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word' }}>{t.description}</div>
                    </div>
                  </div>); })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ===== FIN CALENDARIO SEMANAL =====

function App() {
  const [user, setUser] = useState(null);
  const [fincas, setFincas] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [boardTasks, setBoardTasks] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [workers, setWorkers] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [dias, setDias] = useState([]);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [activeFincaForNewTask, setActiveFincaForNewTask] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('fincas'); 
  const [avisosConfig, setAvisosConfig] = useState({});
  const [publicados, setPublicados] = useState({}); // fecha -> documento publicados/{fecha}
  const [publicando, setPublicando] = useState(false);
  const [apaisado, setApaisado] = useState(false); // móvil de lado: se enseña el calendario de la semana
  useEffect(() => {
    const f = () => setApaisado(window.innerWidth > window.innerHeight && window.innerHeight <= 520); // solo móviles (no ordenador ni tablet)
    f(); window.addEventListener('resize', f); window.addEventListener('orientationchange', f);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f); };
  }, []);
  const [miAviso, setMiAviso] = useState(null);
  const [avisosEdit, setAvisosEdit] = useState({});
  const [editingFinca, setEditingFinca] = useState(null);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [editingCatalogTask, setEditingCatalogTask] = useState(null);
  const [touchMenu, setTouchMenu] = useState(null);
  const [boardTaskMenu, setBoardTaskMenu] = useState(null);
  const [showWorkersDropdown, setShowWorkersDropdown] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(null);
  const [historyViewMode, setHistoryViewMode] = useState('calendar'); // 'calendar' o 'search'
  const [historySearchText, setHistorySearchText] = useState('');
  const [historySearchFincaId, setHistorySearchFincaId] = useState('ALL');
  const [historySearchWorkerId, setHistorySearchWorkerId] = useState('ALL');
  const [fbLoaded, setFbLoaded] = useState(!!window.FirebaseAPI);
  const kanbanScrollRef = useRef(null);

  const getLocalIsoDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  useEffect(() => {
    if (window.FirebaseAPI) setFbLoaded(true);
    else {
      const handleLoad = () => setFbLoaded(true);
      window.addEventListener('firebase-modules-loaded', handleLoad);
      return () => window.removeEventListener('firebase-modules-loaded', handleLoad);
    }
  }, []);

  useEffect(() => {
    const calculateDates = () => {
      const today = new Date();
      let currentDayOfWeek = today.getDay();
      if (currentDayOfWeek === 0) currentDayOfWeek = 7; 

      const diasBase = [
        { id: 'L', name: 'Lunes', index: 1 }, { id: 'M', name: 'Martes', index: 2 },
        { id: 'X', name: 'Miércoles', index: 3 }, { id: 'J', name: 'Jueves', index: 4 },
        { id: 'V', name: 'Viernes', index: 5 }, { id: 'S', name: 'Sábado', index: 6 },
        { id: 'D', name: 'Domingo', index: 7 }
      ];

      const calculatedDias = diasBase.map(dia => {
        let diffDays = 0;
        let esProximaSemana = false;
        let esHoy = false;
        
        if (dia.index < currentDayOfWeek) {
          diffDays = 7 - currentDayOfWeek + dia.index;
          esProximaSemana = true;
        } else if (dia.index === currentDayOfWeek) {
          diffDays = 0;
          esHoy = true;
        } else {
          diffDays = dia.index - currentDayOfWeek;
        }
        
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + diffDays);
        const dateString = getLocalIsoDate(targetDate);
        
        return { ...dia, numeroDia: targetDate.getDate(), esHoy, esProximaSemana, dateString };
      });
      setDias(calculatedDias.sort((a, b) => a.dateString.localeCompare(b.dateString)));
    };

    calculateDates();
    const interval = setInterval(calculateDates, 3600000); 
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll al día de hoy al cargar la app
  useEffect(() => {
    // La clave: Solo hacer scroll cuando 'loading' es false (ya no pone "Cargando...")
    if (!loading && dias.length > 0 && kanbanScrollRef.current) {
      setTimeout(() => {
        const todayCol = kanbanScrollRef.current.querySelector('[data-hoy="true"]');
        if (todayCol) {
          const container = kanbanScrollRef.current;
          // Hoy es la primera columna: la dejamos al principio
          container.scrollTo({ left: Math.max(0, todayCol.offsetLeft - 8), behavior: 'smooth' });
        }
      }, 200); // Pequeño margen para que las tarjetas terminen de pintarse
    }
  }, [loading, dias]);

  useEffect(() => {
    if (!fbLoaded) return;
    const initAuth = async () => {
      try {
        const { auth, onAuthStateChanged, signOut } = window.FirebaseAPI;
        onAuthStateChanged(auth, (currentUser) => {
          // Las sesiones anónimas antiguas ya no valen: hay que entrar con correo y contraseña
          if (currentUser && currentUser.isAnonymous) { signOut(auth); return; }
          setUser(currentUser);
          if (!currentUser) setLoading(false);
        });
      } catch (e) { console.error("Error Auth:", e); setLoading(false); }
    };
    initAuth();
  }, [fbLoaded]);

  useEffect(() => {
    if (!user || !window.FirebaseAPI) return;
    setLoading(true);

    const { db, collection, query, onSnapshot, addDoc } = window.FirebaseAPI;
    let fincasSeeded = false;

    const unsubFincas = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'fincas')), async (snapshot) => {
      const rawItems = [];
      snapshot.forEach(doc => rawItems.push({ ...doc.data(), id: doc.id }));
      
      if (rawItems.length === 0 && !fincasSeeded) {
        fincasSeeded = true;
        const defaultFincas = [
          { name: 'Finca 8', color: COLOR_PALETTE[0].color, handleColor: COLOR_PALETTE[0].handleColor, order: 1 },
          { name: 'Finca 9', color: COLOR_PALETTE[1].color, handleColor: COLOR_PALETTE[1].handleColor, order: 2 },
          { name: 'Finca 6', color: COLOR_PALETTE[2].color, handleColor: COLOR_PALETTE[2].handleColor, order: 3 },
          { name: 'Finca 1y2', color: COLOR_PALETTE[3].color, handleColor: COLOR_PALETTE[3].handleColor, order: 4 },
          { name: 'Finca 3', color: COLOR_PALETTE[4].color, handleColor: COLOR_PALETTE[4].handleColor, order: 5 },
        ];
        for (const df of defaultFincas) {
          await addDoc(collection(db, 'artifacts', APP_ID, 'fincas'), { ...df, createdAt: Date.now() });
        }
      } else {
        // Deduplicar por id y por nombre si fuera necesario
        const uniqueMap = new Map();
        rawItems.forEach(item => {
          if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
        });
        const items = Array.from(uniqueMap.values());
        setFincas(items.sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0)));
      }
    });

    const unsubCatalog = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'catalog')), (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
      setCatalog(items);
    });

    const unsubBoard = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'board')), (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
      setBoardTasks(items);
      setLoading(false);
    });

    const unsubWorkers = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'workers')), (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
      setWorkers(items.sort((a, b) => a.name.localeCompare(b.name)));
    });

    const { doc } = window.FirebaseAPI;
    const unsubConfig = onSnapshot(doc(db, 'artifacts', APP_ID, 'config', 'general'), (snap) => {
      setAvisosConfig(snap.exists() ? snap.data() : {});
    });
    const unsubMiAviso = onSnapshot(doc(db, 'artifacts', APP_ID, 'avisos', user.uid), (snap) => {
      setMiAviso(snap.exists() ? snap.data() : null);
    });

    return () => { unsubFincas(); unsubCatalog(); unsubBoard(); unsubWorkers(); unsubConfig(); unsubMiAviso(); };
  }, [user]);

  // Histórico reciente (de ayer en adelante): basta para repetir el día de ayer y para la limpieza.
  // El histórico completo solo se descarga al abrir la ventana de Histórico.
  const hoyStr = (dias.find(d => d.esHoy) || {}).dateString;
  useEffect(() => {
    if (!user || !window.FirebaseAPI || !hoyStr) return;
    const { db, collection, query, where, onSnapshot } = window.FirebaseAPI;
    return onSnapshot(query(collection(db, 'artifacts', APP_ID, 'publicados'), where('fecha', '>=', hoyStr)), (snapshot) => {
      const m = {};
      snapshot.forEach(d => { m[d.id] = { ...d.data(), id: d.id }; });
      setPublicados(m);
    });
  }, [user, hoyStr]);
  useEffect(() => {
    if (!user || !window.FirebaseAPI || !hoyStr) return;
    const { db, collection, query, where, onSnapshot } = window.FirebaseAPI;
    const ayer = new Date(hoyStr + 'T12:00:00'); ayer.setDate(ayer.getDate() - 1);
    return onSnapshot(query(collection(db, 'artifacts', APP_ID, 'history'), where('snapshotDate', '>=', getLocalIsoDate(ayer))), (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
      setHistoryTasks(items);
    });
  }, [user, hoyStr]);

  const [historialCompleto, setHistorialCompleto] = useState(null);
  useEffect(() => {
    if (!user || !showCalendarModal || !window.FirebaseAPI) return;
    const { db, collection, query, onSnapshot } = window.FirebaseAPI;
    return onSnapshot(query(collection(db, 'artifacts', APP_ID, 'history')), (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
      setHistorialCompleto(items);
    });
  }, [user, showCalendarModal]);

  // LÓGICA DE FOTO HISTÓRICO Y LIMPIEZA
  useEffect(() => {
    if (!fbLoaded || !user || dias.length === 0) return;
    
    const processDailySnapshotsAndCleanup = async () => {
      const todayStr = getLocalIsoDate(new Date());
      const { db, setDoc, deleteDoc, doc } = window.FirebaseAPI;

      // LIMPIEZA AUTO DE SEGURIDAD: Borrar del histórico cualquier foto que pertenezca a HOY o a días futuros
      for (const ht of historyTasks) {
        if (ht.snapshotDate && ht.snapshotDate >= todayStr) {
          try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'history', ht.id)); } 
          catch(e) { console.error(e); }
        }
      }

      // PROCESAR FOTOS DE DÍAS QUE YA HAN PASADO (< todayStr)
      for (const t of boardTasks) {
        const checkDate = t.targetDateStr || t.dateString;
        if (checkDate && checkDate < todayStr) {
          const historyDoc = {
            ...t,
            snapshotDate: checkDate,
            archivedAt: Date.now(),
            finalWorkers: t.workerIds || [],
            finalNotes: t.notes || '',
            finalStars: t.stars || 0
          };
          
          try {
            // Forzar primero el borrado en la pizarra principal, que es lo más crítico para el usuario
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'board', t.id));
            // Luego aseguramos que se guarda/actualiza en el histórico
            await setDoc(doc(db, 'artifacts', APP_ID, 'history', `${checkDate}_${t.id}`), historyDoc, { merge: true });
          } catch (e) {
            console.error("Error archivando/limpiando tarea pasada:", e);
          }
        }
      }
    };

    processDailySnapshotsAndCleanup();
    const interval = setInterval(processDailySnapshotsAndCleanup, 60000); 
    return () => clearInterval(interval);
  }, [boardTasks, historyTasks, user, fbLoaded]);

  const guardarAvisos = async () => {
    const cambios = {};
    for (const k of ['horaEntrada', 'horaSalida', 'horaRecordatorio']) {
      if (avisosEdit[k] !== undefined && /^\d{2}:\d{2}$/.test(avisosEdit[k])) cambios[k] = avisosEdit[k];
    }
    if (avisosEdit.minutosAntes !== undefined) {
      const n = parseInt(avisosEdit.minutosAntes, 10);
      if (n >= 5 && n <= 240) cambios.minutosAntes = n;
    }
    if (avisosEdit.descansoMin !== undefined) {
      const n = parseInt(avisosEdit.descansoMin, 10);
      if (n >= 0 && n <= 240) cambios.descansoMin = n;
    }
    if (Object.keys(cambios).length === 0) return;
    const { db, setDoc, doc } = window.FirebaseAPI;
    await setDoc(doc(db, 'artifacts', APP_ID, 'config', 'general'), cambios, { merge: true });
    setAvisosEdit({});
  };

  // ---- Notificaciones push de ESTE aparato (cada móvil/ordenador se activa por separado)
  const [pushEstado, setPushEstado] = useState('cargando'); // cargando | activo | inactivo | instalar | denegado | noSoportado
  const [pushOcupado, setPushOcupado] = useState(false);
  const [pushError, setPushError] = useState(null);
  const comprobarPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushEstado(esIOS() && !appInstalada() ? 'instalar' : 'noSoportado'); return;
    }
    if (Notification.permission === 'denied') { setPushEstado('denegado'); return; }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg && await reg.pushManager.getSubscription();
      const guardada = sub && ((miAviso && miAviso.subs) || []).some(x => x.endpoint === sub.endpoint);
      setPushEstado(guardada ? 'activo' : 'inactivo');
    } catch (e) { setPushEstado('inactivo'); }
  };
  useEffect(() => { if (showSettingsModal && settingsTab === 'avisos') comprobarPush(); }, [showSettingsModal, settingsTab, miAviso]);
  const activarPush = async () => {
    setPushOcupado(true); setPushError(null);
    try {
      const permiso = await Notification.requestPermission(); // debe ser lo primero: iPhone lo exige al tocar el botón
      if (permiso !== 'granted') { setPushEstado(permiso === 'denied' ? 'denegado' : 'inactivo'); return; }
      const reg = await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clavePush(VAPID_PUBLICA) });
      const j = sub.toJSON();
      const otras = ((miAviso && miAviso.subs) || []).filter(x => x.endpoint !== j.endpoint);
      const aparato = esIOS() ? 'iPhone/iPad' : /android/i.test(navigator.userAgent) ? 'Android' : 'Ordenador';
      const { db, setDoc, doc } = window.FirebaseAPI;
      await setDoc(doc(db, 'artifacts', APP_ID, 'avisos', user.uid), { subs: [...otras, { endpoint: j.endpoint, keys: j.keys, creada: Date.now(), confirmada: false, aparato }] }, { merge: true });
      setPushEstado('activo');
    } catch (e) {
      console.error('Error al activar las notificaciones:', e);
      setPushError('No se han podido activar. Comprueba la conexión y vuelve a intentarlo.');
    } finally { setPushOcupado(false); }
  };
  const desactivarPush = async () => {
    setPushOcupado(true); setPushError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const { db, setDoc, doc } = window.FirebaseAPI;
        await setDoc(doc(db, 'artifacts', APP_ID, 'avisos', user.uid), { subs: ((miAviso && miAviso.subs) || []).filter(x => x.endpoint !== endpoint) }, { merge: true });
      }
      setPushEstado('inactivo');
    } catch (e) { setPushError('No se han podido desactivar.'); }
    finally { setPushOcupado(false); }
  };

  const saveFinca = async (e) => {
    e.preventDefault();
    if (!user || !editingFinca.name.trim()) return;
    const { db, collection, addDoc, updateDoc, doc } = window.FirebaseAPI;
    if (editingFinca.id) {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'fincas', editingFinca.id), { name: editingFinca.name, color: editingFinca.color, handleColor: editingFinca.handleColor });
    } else {
      await addDoc(collection(db, 'artifacts', APP_ID, 'fincas'), { name: editingFinca.name, color: editingFinca.color, handleColor: editingFinca.handleColor, order: fincas.length + 1, createdAt: Date.now() });
    }
    setEditingFinca(null);
  };

  const deleteFinca = async (id) => {
    if (!user || !window.confirm("¿Seguro que quieres borrar esta finca?")) return;
    await window.FirebaseAPI.deleteDoc(window.FirebaseAPI.doc(window.FirebaseAPI.db, 'artifacts', APP_ID, 'fincas', id));
  };

  const moveFincaOrder = async (index, direction) => {
    if (!user || index + direction < 0 || index + direction >= fincas.length) return;
    const { db, updateDoc, doc } = window.FirebaseAPI;
    
    // Clonamos y reordenamos el array local primero
    const newFincas = [...fincas];
    const targetIndex = index + direction;
    const [moved] = newFincas.splice(index, 1);
    newFincas.splice(targetIndex, 0, moved);

    // Asignamos una secuencia limpia y robusta (1, 2, 3...) a cada finca en Firestore
    const updates = newFincas.map((f, i) => 
      updateDoc(doc(db, 'artifacts', APP_ID, 'fincas', f.id), { order: i + 1 })
    );
    await Promise.all(updates);
  };

  const addWorker = async (e) => {
    e.preventDefault();
    if (!user || !newWorkerName.trim()) return;
    await window.FirebaseAPI.addDoc(window.FirebaseAPI.collection(window.FirebaseAPI.db, 'artifacts', APP_ID, 'workers'), {
      name: newWorkerName.trim(), createdAt: Date.now()
    });
    setNewWorkerName('');
  };

  const deleteWorker = async (id) => {
    const w = workers.find(x => x.id === id);
    if (!user || !window.confirm(`¿Dar de baja a ${w ? w.name : 'este trabajador'}?\n\nDejará de salir al asignar tareas, pero conserva su nombre en los días pasados.`)) return;
    await window.FirebaseAPI.updateDoc(window.FirebaseAPI.doc(window.FirebaseAPI.db, 'artifacts', APP_ID, 'workers', id), { activo: false, bajaEn: Date.now() });
  };

  const addCatalogTask = async (fincaId) => {
    if (!newTaskDesc.trim() || !user) return;
    const fincaTasks = catalog.filter(t => t.fincaId === fincaId);
    const nextNum = fincaTasks.length > 0 ? Math.max(...fincaTasks.map(t => t.number)) + 1 : 1;
    await window.FirebaseAPI.addDoc(window.FirebaseAPI.collection(window.FirebaseAPI.db, 'artifacts', APP_ID, 'catalog'), {
      fincaId, number: nextNum, description: newTaskDesc.trim(), createdAt: Date.now()
    });
    setNewTaskDesc('');
    setActiveFincaForNewTask(null);
  };

  const updateCatalogTask = async (e) => {
    e.preventDefault();
    if (!user || !editingCatalogTask) return;
    await window.FirebaseAPI.updateDoc(window.FirebaseAPI.doc(window.FirebaseAPI.db, 'artifacts', APP_ID, 'catalog', editingCatalogTask.id), {
      description: editingCatalogTask.description
    });
    setEditingCatalogTask(null);
  };

  const deleteCatalogTask = async (taskId) => {
    const t = catalog.find(x => x.id === taskId);
    if (!user || !window.confirm(`¿Seguro que quieres borrar «${t ? t.description : 'esta tarea'}» de la lista de tareas de la finca?`)) return false;
    await window.FirebaseAPI.deleteDoc(window.FirebaseAPI.doc(window.FirebaseAPI.db, 'artifacts', APP_ID, 'catalog', taskId));
    return true;
  };

  // Tareas de cada finca ordenadas por uso (las más usadas arriba). «usos» sube cada vez que se pone en un día.
  const porUso = (a, b) => (b.usos || 0) - (a.usos || 0) || (a.number || 0) - (b.number || 0);
  const contarUso = (catalogTaskId) => {
    if (!user || !catalogTaskId || !catalog.some(c => c.id === catalogTaskId)) return;
    const { db, doc, updateDoc, increment } = window.FirebaseAPI;
    updateDoc(doc(db, 'artifacts', APP_ID, 'catalog', catalogTaskId), { usos: increment(1) });
  };

  const addBoardTask = async (catalogTask, dia, customOrder = null) => {
    if (!user) return;
    contarUso(catalogTask.id);
    await window.FirebaseAPI.addDoc(window.FirebaseAPI.collection(window.FirebaseAPI.db, 'artifacts', APP_ID, 'board'), {
      catalogTaskId: catalogTask.id, fincaId: catalogTask.fincaId, number: catalogTask.number, 
      description: catalogTask.description, dayId: dia.id, dateString: dia.dateString, targetDateStr: dia.dateString, notes: '', workerIds: [], stars: 0, order: customOrder !== null ? customOrder : Date.now(), createdAt: Date.now()
    });
  };

  const updateBoardTask = async (taskId, updates) => {
    if (!user) return;
    await window.FirebaseAPI.updateDoc(window.FirebaseAPI.doc(window.FirebaseAPI.db, 'artifacts', APP_ID, 'board', taskId), updates);
  };

  const removeBoardTask = async (taskId) => {
    const t = boardTasks.find(x => x.id === taskId);
    if (!user || !window.confirm(`¿Seguro que quieres quitar «${t ? t.description : 'esta tarea'}» de la pizarra?`)) return false;
    await window.FirebaseAPI.deleteDoc(window.FirebaseAPI.doc(window.FirebaseAPI.db, 'artifacts', APP_ID, 'board', taskId));
    return true;
  };

  const moveBoardTaskVertically = async (taskId, diaId, direction) => {
    if (!user) return;
    const diaTasks = boardTasks.filter(t => t.dayId === diaId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const index = diaTasks.findIndex(t => t.id === taskId);
    if (index + direction < 0 || index + direction >= diaTasks.length) return;

    const current = diaTasks[index];
    const swap = diaTasks[index + direction];

    const { db, updateDoc, doc } = window.FirebaseAPI;
    const currentOrder = current.order || Date.now();
    const swapOrder = swap.order || (Date.now() + 100);

    await updateDoc(doc(db, 'artifacts', APP_ID, 'board', current.id), { order: swapOrder });
    await updateDoc(doc(db, 'artifacts', APP_ID, 'board', swap.id), { order: currentOrder });
  };

  const handleDragStart = (e, item, source) => {
    e.dataTransfer.setData('item', JSON.stringify(item));
    e.dataTransfer.setData('source', source);
    if (source === 'board') setDraggedTaskId(item.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  const handleDropOnColumn = (e, dia) => {
    e.preventDefault();
    setDraggedTaskId(null);
    const itemData = e.dataTransfer.getData('item');
    const source = e.dataTransfer.getData('source');
    if (!itemData) return;
    const item = JSON.parse(itemData);
    if (source === 'catalog') addBoardTask(item, dia);
    else if (source === 'board' && item.dayId !== dia.id) updateBoardTask(item.id, { dayId: dia.id, dateString: dia.dateString, targetDateStr: dia.dateString, order: Date.now() });
  };

  const handleDropOnTask = (e, targetTask, dia) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedTaskId(null);
    const itemData = e.dataTransfer.getData('item');
    const source = e.dataTransfer.getData('source');
    if (!itemData) return;
    const sourceItem = JSON.parse(itemData);
    
    if (sourceItem.id === targetTask.id) return;

    const diaTasks = boardTasks.filter(t => t.dayId === dia.id).sort((a, b) => (a.order || 0) - (b.order || 0));
    const targetIndex = diaTasks.findIndex(t => t.id === targetTask.id);

    let newOrder;
    if (targetIndex === 0) {
       newOrder = (diaTasks[0].order || Date.now()) - 1000;
    } else {
       const prevOrder = diaTasks[targetIndex - 1].order || 0;
       const nextOrder = targetTask.order || Date.now();
       newOrder = prevOrder + (nextOrder - prevOrder) / 2;
    }

    if (source === 'catalog') {
      addBoardTask(sourceItem, dia, newOrder);
    } else if (source === 'board') {
      updateBoardTask(sourceItem.id, { dayId: dia.id, dateString: dia.dateString, order: newOrder });
    }
  };

  const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const etiquetaFecha = (fecha) => { if (!fecha) return ''; const d = new Date(fecha + 'T12:00:00'); return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()}`; };
  const fechaTarea = (t) => t.targetDateStr || t.dateString || t.snapshotDate || '';
  const diaAnterior = (fecha) => { const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() - 1); return getLocalIsoDate(d); };
  const normalizar = (x) => (x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  // Tareas de un día concreto, estén aún en la pizarra o ya en el histórico.
  const tareasDeFecha = (fecha) => {
    const porId = new Map();
    historyTasks.filter(t => t.snapshotDate === fecha).forEach(t => porId.set(String(t.id).split('_').slice(1).join('_') || t.id, t));
    boardTasks.filter(t => (t.targetDateStr || t.dateString) === fecha).forEach(t => porId.set(t.id, t));
    return [...porId.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
  };
  const cuadrillaDe = (t) => ((t.workerIds && t.workerIds.length ? t.workerIds : t.finalWorkers) || []).filter(id => workers.some(w => w.id === id && w.activo !== false));
  const cuadrillaDeAyer = (task) => {
    const ayer = tareasDeFecha(diaAnterior(fechaTarea(task)));
    const igual = ayer.find(t => t.fincaId === task.fincaId && normalizar(t.description) === normalizar(task.description) && cuadrillaDe(t).length);
    return igual ? cuadrillaDe(igual) : null;
  };

  // Menú de una tarea: cada cambio se guarda al momento (las notas, al dejar de escribir).
  const notasTimer = useRef(null);
  const cambiarTarea = (cambios) => {
    if (!boardTaskMenu) return;
    setBoardTaskMenu(prev => ({ ...prev, ...cambios }));
    updateBoardTask(boardTaskMenu.id, cambios);
  };
  const cambiarNotas = (texto) => {
    setBoardTaskMenu(prev => ({ ...prev, notes: texto }));
    clearTimeout(notasTimer.current);
    const id = boardTaskMenu.id;
    notasTimer.current = setTimeout(() => updateBoardTask(id, { notes: texto }), 700);
  };
  const cerrarTareaMenu = () => {
    if (boardTaskMenu && notasTimer.current) {
      clearTimeout(notasTimer.current); notasTimer.current = null;
      const guardada = boardTasks.find(t => t.id === boardTaskMenu.id);
      if (guardada && (guardada.notes || '') !== (boardTaskMenu.notes || '')) updateBoardTask(boardTaskMenu.id, { notes: boardTaskMenu.notes || '' });
    }
    setBoardTaskMenu(null); setShowWorkersDropdown(false);
  };

  // ---- Fotos de una tarea
  const [visor, setVisor] = useState(null); // { fotos, indice }
  const [subiendo, setSubiendo] = useState(null); // texto de progreso
  // Sube varias fotos una a una; tras cada una llama a guardar(lista completa de fotos).
  const subirFotos = async (archivos, fotosIniciales, id, guardar) => {
    let fotos = [...(fotosIniciales || [])];
    const lista = [...archivos];
    for (let i = 0; i < lista.length; i++) {
      setSubiendo(lista.length > 1 ? `Subiendo foto ${i + 1} de ${lista.length}…` : 'Subiendo foto…');
      try {
        const { blob, ancho, alto } = await comprimirFoto(lista[i]);
        const nombre = `${id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
        const url = await window.FirebaseAPI.subirFoto(blob, nombre);
        fotos = [...fotos, { url, ruta: 'fotos/' + nombre, ancho, alto }];
        await guardar(fotos);
      } catch (e) { console.error('Error al subir la foto:', e); }
    }
    setSubiendo(null);
  };
  const anadirFotos = async (archivos) => {
    if (!boardTaskMenu || !archivos || !archivos.length) return;
    const id = boardTaskMenu.id;
    await subirFotos(archivos, boardTaskMenu.fotos, id, async (fotos) => {
      setBoardTaskMenu(prev => prev && prev.id === id ? { ...prev, fotos } : prev);
      await updateBoardTask(id, { fotos });
    });
  };
  const quitarFoto = (indice) => {
    if (!window.confirm('¿Quitar esta foto de la tarea?')) return;
    cambiarTarea({ fotos: (boardTaskMenu.fotos || []).filter((_, i) => i !== indice) });
  };

  // ---- Tareas personales (privadas/{uid}/tareas): solo las ve su dueño.
  // No se mezclan con las de los trabajadores: la espejo, los avisos y la app agrícola no las leen.
  const [misTareas, setMisTareas] = useState([]);
  const [miTareaId, setMiTareaId] = useState(null);
  const [paraMi, setParaMi] = useState(false);
  useEffect(() => {
    if (!user || !window.FirebaseAPI) return;
    const { db, collection, query, onSnapshot } = window.FirebaseAPI;
    return onSnapshot(query(collection(db, 'artifacts', APP_ID, 'privadas', user.uid, 'tareas')), (snap) => {
      const items = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id }));
      setMisTareas(items);
    });
  }, [user]);
  const refMia = (id) => window.FirebaseAPI.doc(window.FirebaseAPI.db, 'artifacts', APP_ID, 'privadas', user.uid, 'tareas', id);
  const cambiarMia = (id, cambios) => { if (user) window.FirebaseAPI.updateDoc(refMia(id), cambios); };
  // Lista personal de tareas de cada finca (solo la ve su dueño): privadas/{uid}/catalogo
  const [miCatalogo, setMiCatalogo] = useState([]);
  useEffect(() => {
    if (!user || !window.FirebaseAPI) return;
    const { db, collection, query, onSnapshot } = window.FirebaseAPI;
    return onSnapshot(query(collection(db, 'artifacts', APP_ID, 'privadas', user.uid, 'catalogo')), (snap) => {
      const items = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id, mio: true }));
      setMiCatalogo(items);
    });
  }, [user]);
  const borrarDeMiCatalogo = (t) => {
    if (!user || !window.confirm(`¿Quitar «${t.description}» de tu lista personal? (Tus tareas ya creadas no se borran)`)) return;
    const { db, doc, deleteDoc } = window.FirebaseAPI;
    deleteDoc(doc(db, 'artifacts', APP_ID, 'privadas', user.uid, 'catalogo', t.id));
  };
  const [textoNueva, setTextoNueva] = useState('');
  // Crea una tarea nueva en la finca (en la lista personal si es «Para mí») y la añade al día.
  const crearYAnadir = async (fincaId, dia) => {
    const texto = textoNueva.trim();
    if (!user || !texto) return;
    const { db, collection, addDoc } = window.FirebaseAPI;
    const igual = (x) => x.fincaId === fincaId && normalizar(x.description) === normalizar(texto);
    let t = (paraMi ? miCatalogo.find(igual) : null) || catalog.find(igual);
    if (!t) {
      if (paraMi) {
        const r = await addDoc(collection(db, 'artifacts', APP_ID, 'privadas', user.uid, 'catalogo'), { fincaId, description: texto, usos: 0, createdAt: Date.now() });
        t = { id: r.id, fincaId, description: texto, mio: true };
      } else {
        const deFinca = catalog.filter(x => x.fincaId === fincaId);
        const number = deFinca.length ? Math.max(...deFinca.map(x => x.number || 0)) + 1 : 1;
        const r = await addDoc(collection(db, 'artifacts', APP_ID, 'catalog'), { fincaId, number, description: texto, usos: 1, createdAt: Date.now() });
        t = { id: r.id, fincaId, number, description: texto };
      }
    }
    if (paraMi) addMiTarea(t, dia); else addBoardTask(t, dia);
    setAnadidas(prev => [...prev, t.id]);
    setTextoNueva('');
  };

  const addMiTarea = (catalogTask, dia) => {
    if (!user) return;
    if (catalogTask.mio) {
      const { db, doc, updateDoc, increment } = window.FirebaseAPI;
      updateDoc(doc(db, 'artifacts', APP_ID, 'privadas', user.uid, 'catalogo', catalogTask.id), { usos: increment(1) });
    } else contarUso(catalogTask.id);
    const { db, collection, addDoc } = window.FirebaseAPI;
    addDoc(collection(db, 'artifacts', APP_ID, 'privadas', user.uid, 'tareas'), {
      catalogTaskId: catalogTask.id, fincaId: catalogTask.fincaId, number: catalogTask.number || null, description: catalogTask.description,
      fecha: dia.dateString, dayId: dia.id, notes: '', fotos: [], hecha: false, order: Date.now(), createdAt: Date.now()
    });
  };
  const quitarMia = async (t) => {
    if (!user || !window.confirm(`¿Seguro que quieres quitar tu tarea «${t.description}»?`)) return;
    await window.FirebaseAPI.deleteDoc(refMia(t.id));
    setMiTareaId(null);
  };
  // Las que no están hechas pasan solas al día de hoy.
  useEffect(() => {
    const hoy = dias.find(d => d.esHoy);
    if (!user || !hoy) return;
    misTareas.filter(t => !t.hecha && t.fecha && t.fecha < hoy.dateString)
      .forEach(t => cambiarMia(t.id, { fecha: hoy.dateString, dayId: hoy.id, pendienteDesde: t.pendienteDesde || t.fecha }));
  }, [misTareas, hoyStr]);
  const notasMiaTimer = useRef(null);
  const [notasMia, setNotasMia] = useState(null); // { id, texto } mientras se escribe
  const cerrarMiTarea = () => {
    clearTimeout(notasMiaTimer.current);
    if (notasMia) cambiarMia(notasMia.id, { notes: notasMia.texto });
    setNotasMia(null); setMiTareaId(null);
  };

  // ---- Copiar una tarea de trabajadores a otros días (la original se queda en su día)
  const [diasCopia, setDiasCopia] = useState([]);
  const [avisoCopia, setAvisoCopia] = useState(null);
  useEffect(() => { setDiasCopia([]); setAvisoCopia(null); }, [boardTaskMenu && boardTaskMenu.id]);
  const copiarTarea = async (t, fechas) => {
    if (!user || !fechas.length) return;
    const { db, collection, addDoc } = window.FirebaseAPI;
    const hechas = [], yaEstaba = [];
    const base = Date.now();
    for (const [i, fecha] of fechas.sort().entries()) {
      const dia = dias.find(d => d.dateString === fecha);
      if (!dia) continue;
      const repetida = boardTasks.some(x => (x.targetDateStr || x.dateString) === fecha && x.fincaId === t.fincaId && normalizar(x.description) === normalizar(t.description));
      if (repetida) { yaEstaba.push(`${dia.id} ${dia.numeroDia}`); continue; }
      contarUso(t.catalogTaskId);
      await addDoc(collection(db, 'artifacts', APP_ID, 'board'), {
        catalogTaskId: t.catalogTaskId || null, fincaId: t.fincaId, number: t.number || null, description: t.description,
        dayId: dia.id, dateString: fecha, targetDateStr: fecha, notes: t.notes || '', workerIds: (t.workerIds || []).filter(id => workers.some(w => w.id === id && w.activo !== false)),
        stars: t.stars || 0, fotos: t.fotos || [], order: base + i, createdAt: base
      });
      hechas.push(`${dia.id} ${dia.numeroDia}`);
    }
    setDiasCopia([]);
    setAvisoCopia([hechas.length ? `✓ Copiada a ${hechas.join(', ')}` : '', yaEstaba.length ? `Ya estaba en ${yaEstaba.join(', ')}` : ''].filter(Boolean).join(' · '));
  };

  // ---- Añadir tareas a un día y repetir el día anterior
  const [nuevoDia, setNuevoDia] = useState(null);
  const [nuevoFincaId, setNuevoFincaId] = useState(null);
  const [anadidas, setAnadidas] = useState([]);
  const repetirAyer = async (dia) => {
    const fechaAyer = diaAnterior(dia.dateString);
    const deAyer = tareasDeFecha(fechaAyer);
    const yaHay = boardTasks.filter(t => (t.targetDateStr || t.dateString) === dia.dateString);
    const nuevas = deAyer.filter(t => !yaHay.some(y => y.fincaId === t.fincaId && normalizar(y.description) === normalizar(t.description)));
    if (nuevas.length === 0) { window.alert(`Las tareas del ${etiquetaFecha(fechaAyer)} ya están en el ${etiquetaFecha(dia.dateString)}.`); return; }
    if (!window.confirm(`¿Copiar ${nuevas.length === 1 ? 'la tarea' : `las ${nuevas.length} tareas`} del ${etiquetaFecha(fechaAyer)}, con su cuadrilla, al ${etiquetaFecha(dia.dateString)}?`)) return;
    const base = Date.now();
    nuevas.forEach(t => contarUso(t.catalogTaskId));
    const { db, collection, addDoc } = window.FirebaseAPI;
    await Promise.all(nuevas.map((t, i) => addDoc(collection(db, 'artifacts', APP_ID, 'board'), {
      catalogTaskId: t.catalogTaskId || null, fincaId: t.fincaId, number: t.number || null, description: t.description,
      dayId: dia.id, dateString: dia.dateString, targetDateStr: dia.dateString, notes: '', workerIds: cuadrillaDe(t),
      stars: t.stars || t.finalStars || 0, fotos: t.fotos || [], order: base + i, createdAt: base
    })));
  };

  // ---- Reordenar en el móvil: mantener pulsado y arrastrar
  const punteroFino = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  const arrastre = useRef(null);
  const ultimoArrastre = useRef(0);
  const [arrastrandoId, setArrastrandoId] = useState(null);
  const empezarPulsacion = (e, task, dia) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const a = { task, dia, x0: t.clientX, y0: t.clientY, activo: false };
    a.timer = setTimeout(() => { a.activo = true; setArrastrandoId(task.id); if (navigator.vibrate) navigator.vibrate(25); }, 450);
    arrastre.current = a;
  };
  useEffect(() => {
    const mover = (e) => {
      const a = arrastre.current; if (!a) return;
      const t = e.touches[0];
      if (!a.activo) { if (Math.hypot(t.clientX - a.x0, t.clientY - a.y0) > 10) { clearTimeout(a.timer); arrastre.current = null; } return; }
      e.preventDefault();
      a.y = t.clientY;
      const el = document.querySelector(`[data-tarea-id="${a.task.id}"]`);
      if (el) el.style.transform = `translateY(${t.clientY - a.y0}px)`;
    };
    const soltar = () => {
      const a = arrastre.current; arrastre.current = null; if (!a) return;
      clearTimeout(a.timer);
      if (!a.activo) return;
      ultimoArrastre.current = Date.now();
      setArrastrandoId(null);
      const el = document.querySelector(`[data-tarea-id="${a.task.id}"]`);
      if (el) el.style.transform = '';
      if (a.y === undefined) return;
      const otras = [...document.querySelectorAll(`[data-columna="${a.dia.id}"] [data-tarea-id]`)].filter(x => x.dataset.tareaId !== a.task.id);
      let idx = otras.findIndex(x => { const r = x.getBoundingClientRect(); return a.y < r.top + r.height / 2; });
      if (idx === -1) idx = otras.length;
      const porId = Object.fromEntries(boardTasksRef.current.map(t => [t.id, t]));
      const antes = otras[idx - 1] ? porId[otras[idx - 1].dataset.tareaId] : null;
      const despues = otras[idx] ? porId[otras[idx].dataset.tareaId] : null;
      const orden = antes && despues ? ((antes.order || 0) + (despues.order || 0)) / 2 : antes ? (antes.order || 0) + 1000 : despues ? (despues.order || 0) - 1000 : Date.now();
      if (orden !== a.task.order) updateBoardTaskRef.current(a.task.id, { order: orden });
    };
    document.addEventListener('touchmove', mover, { passive: false });
    document.addEventListener('touchend', soltar);
    document.addEventListener('touchcancel', soltar);
    return () => { document.removeEventListener('touchmove', mover); document.removeEventListener('touchend', soltar); document.removeEventListener('touchcancel', soltar); };
  }, []);
  const boardTasksRef = useRef([]);
  boardTasksRef.current = boardTasks;
  const updateBoardTaskRef = useRef(null);
  updateBoardTaskRef.current = updateBoardTask;

  // Nombres de finca con el mismo patrón en pantalla («Finca 1y2» → «Finca 1 y 2»; etiqueta «F1-2»).
  // No se cambia lo guardado: la app agrícola reconoce las fincas por su nombre exacto.
  const nombreFinca = (n) => (n || '?').replace(/\s*y\s*/gi, ' y ').replace(/\s+/g, ' ').trim();
  // ----- Tareas listas: avisar a Fabio y Mory -----
  const diaPublicable = (() => { // antes de la hora de salida: el día de hoy; después (hasta las 12 de la noche): mañana
    const ahora = new Date(); const [h, m] = (avisosConfig.horaSalida || '17:00').split(':').map(Number);
    const pasada = ahora.getHours() * 60 + ahora.getMinutes() >= h * 60 + m;
    const i = dias.findIndex(d => d.esHoy);
    return i < 0 ? null : (pasada ? dias.find(d => d.dateString === getLocalIsoDate(new Date(Date.now() + 86400000))) : dias[i]) || null;
  })();
  const textoDia = (dia) => dia.esHoy ? 'hoy' : dia.dateString === getLocalIsoDate(new Date(Date.now() + 86400000)) ? 'mañana' : `el ${dia.name.toLowerCase()} ${dia.numeroDia}`;
  const etiquetaTarea = (t) => `${nombreFinca((fincas.find(f => f.id === t.fincaId) || {}).name)} · ${t.description}`;
  const tareasPublicables = (dia) => boardTasks.filter(t => (t.targetDateStr || t.dateString) === dia.dateString).sort((a, b) => (a.order || 0) - (b.order || 0)); // las mismas que ve la espejo
  const pedirAviso = async (tipo, fecha, titulo, cuerpo) => {
    const { db, addDoc, collection } = window.FirebaseAPI;
    await addDoc(collection(db, 'artifacts', APP_ID, 'avisosPendientes'), { tipo, fecha, titulo, cuerpo, creado: Date.now(), enviado: false });
  };
  const publicarDia = async (dia) => {
    const tareas = tareasPublicables(dia);
    if (tareas.length === 0) { alert('Este día todavía no tiene tareas.'); return; }
    const sinCuadrilla = tareas.filter(t => !(t.workerIds || []).length).length;
    if (!confirm(`¿Avisar a Fabio y Mory de que ya pueden consultar las tareas de ${textoDia(dia)}?\n\n${tareas.length} tareas${sinCuadrilla ? ` (${sinCuadrilla} sin trabajadores asignados)` : ''}.`)) return;
    setPublicando(true);
    try {
      const { db, setDoc, doc } = window.FirebaseAPI;
      await setDoc(doc(db, 'artifacts', APP_ID, 'publicados', dia.dateString), {
        fecha: dia.dateString, publicadoEn: Date.now(), firma: firmasDe(tareas), nombres: Object.fromEntries(tareas.map(t => [t.id, etiquetaTarea(t)])), cambios: {}, quitadas: [], cambiosEn: null });
      await pedirAviso('publicar', dia.dateString, `📣 Ya puedes consultar las tareas de ${textoDia(dia)}`, `${dia.name} ${dia.numeroDia} · ${tareas.length} tareas`);
    } finally { setPublicando(false); }
  };
  const avisarCambios = async (dia) => {
    const pub = publicados[dia.dateString]; if (!pub) return;
    const tareas = tareasPublicables(dia);
    const c = calcularCambios(tareas, pub);
    const total = c.nuevas.length + c.cambiadas.length + c.quitadas.length;
    if (total === 0) return;
    if (!confirm(`¿Avisar a Fabio y Mory de que han cambiado las tareas de ${textoDia(dia)}?\n\n${total} cambio${total > 1 ? 's' : ''}.`)) return;
    setPublicando(true);
    try {
      const cambios = { ...(pub.cambios || {}) }; const quitadas = [...(pub.quitadas || [])]; const nombres = { ...(pub.nombres || {}) };
      c.nuevas.forEach(t => { cambios[t.id] = 'nueva'; });
      c.cambiadas.forEach(t => { if (cambios[t.id] !== 'nueva') cambios[t.id] = 'cambiada'; });
      c.quitadas.forEach(id => { if (cambios[id] === 'nueva') delete cambios[id]; else quitadas.push(nombres[id] || 'Una tarea'); });
      tareas.forEach(t => { nombres[t.id] = etiquetaTarea(t); });
      const { db, setDoc, doc } = window.FirebaseAPI;
      await setDoc(doc(db, 'artifacts', APP_ID, 'publicados', dia.dateString), { ...Object.fromEntries(Object.entries(pub).filter(([k]) => k !== 'id')), firma: firmasDe(tareas), nombres, cambios, quitadas, cambiosEn: Date.now() });
      const lineas = [...c.nuevas.map(t => 'Nueva: ' + etiquetaTarea(t)), ...c.cambiadas.map(t => 'Cambiada: ' + etiquetaTarea(t)), ...c.quitadas.map(id => 'Quitada: ' + (pub.nombres || {})[id])];
      await pedirAviso('cambio', dia.dateString, `✏️ Han cambiado las tareas de ${textoDia(dia)}`, lineas.slice(0, 4).join('\n') + (lineas.length > 4 ? `\n… y ${lineas.length - 4} más` : ''));
    } finally { setPublicando(false); }
  };

  const hayVentana = !!(visor || miTareaId || boardTaskMenu || touchMenu || nuevoDia || showCalendarModal || showSettingsModal || showHistoryDetailModal || editingCatalogTask || editingFinca);
  const cerrarVentanasRef = useRef(null);
  cerrarVentanasRef.current = () => {
    if (visor) { setVisor(null); window.history.pushState({ ventana: true }, ''); return; } // atrás con el visor abierto: cierra solo el visor
    if (boardTaskMenu) cerrarTareaMenu();
    if (miTareaId) cerrarMiTarea();
    setTouchMenu(null); setNuevoDia(null); setShowHistoryDetailModal(null); setShowCalendarModal(false);
    setSelectedCalendarDate(null); setShowSettingsModal(false); setEditingCatalogTask(null); setEditingFinca(null);
  };
  useEffect(() => {
    if (!hayVentana) return;
    window.history.pushState({ ventana: true }, '');
    const alVolver = () => cerrarVentanasRef.current();
    window.addEventListener('popstate', alVolver);
    return () => {
      window.removeEventListener('popstate', alVolver);
      if (window.history.state && window.history.state.ventana) window.history.back();
    };
  }, [hayVentana]);

  const getFincaData = (fincaId) => { const f = fincas.find(f => f.id === fincaId); return f ? { ...f, name: nombreFinca(f.name) } : { name: '?', color: 'bg-gray-100 border-gray-400', handleColor: 'bg-gray-400' }; };
  const getFincaTag = (fincaName) => 'F' + nombreFinca(fincaName).replace(/^finca\s*/i, '').replace(/ y /g, '-').replace(/\s+/g, '');

  if (!user && !loading) return <LoginScreen />;
  if (loading) return <div className="flex items-center justify-center h-[100dvh] bg-slate-50 font-bold text-slate-500 text-xl">⏳ Cargando Tareas Semanales...</div>;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-50">
      
      {/* CABECERA */}
      <header className="px-3 py-2 flex justify-between items-center shrink-0 bg-white shadow-sm z-20 border-b">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">Tareas Semanales</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCalendarModal(true)} className="bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg text-sm font-semibold text-blue-800 transition-colors">
            Histórico
          </button>
          <button onClick={() => setShowSettingsModal(true)} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 transition-colors">
            ⚙️ Ajustes
          </button>
        </div>
      </header>
      {diaPublicable && !publicados[diaPublicable.dateString] && (
        <button onClick={() => publicarDia(diaPublicable)} disabled={publicando} className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold disabled:opacity-50 z-10" title={`Avisar a Fabio y Mory de que las tareas de ${textoDia(diaPublicable)} están listas`}>
          📣 Tareas de {textoDia(diaPublicable)} listas · Avisar a Fabio y Mory
        </button>
      )}

      {/* PIZARRA: en el móvil, un día por pantalla (deslizar); en el ordenador, columnas */}
      <div ref={kanbanScrollRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-2 flex gap-3 items-stretch bg-slate-100/50 snap-x snap-mandatory sm:snap-none">
        {dias.map(dia => {
          const tareasDelDia = boardTasks.filter(t => t.dayId === dia.id).sort((a, b) => (a.order || 0) - (b.order || 0));
          const hayAyer = tareasDeFecha(diaAnterior(dia.dateString)).length > 0;
          return (
            <div key={dia.id} data-hoy={dia.esHoy ? "true" : "false"} data-columna={dia.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnColumn(e, dia)}
              className="snap-center shrink-0 w-[calc(100vw-1.5rem)] sm:w-64 bg-slate-100 border-2 border-dashed border-slate-200 rounded-xl flex flex-col h-full shadow-sm">

              <div className={`border-b border-slate-200 px-2 py-1.5 rounded-t-lg shrink-0 ${dia.esHoy ? 'bg-emerald-100' : 'bg-slate-200/60'}`}>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-extrabold text-lg text-slate-800">{dia.name} <span className={dia.esHoy ? 'text-emerald-700' : ''}>{dia.numeroDia}</span></span>
                  {dia.esHoy && <span className="text-xs font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full">Hoy</span>}
                  {dia.esProximaSemana && <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Próx. semana</span>}
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  <button onClick={() => { setNuevoDia(dia); setNuevoFincaId(null); setAnadidas([]); setParaMi(false); setTextoNueva(''); }} className="flex-1 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50">＋ Añadir tarea</button>
                  {hayAyer && <button onClick={() => repetirAyer(dia)} className="flex-1 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50">↻ Repetir día anterior</button>}
                </div>
                {publicados[dia.dateString] && (() => {
                  const pub = publicados[dia.dateString];
                  const c = calcularCambios(tareasPublicables(dia), pub);
                  const total = c.nuevas.length + c.cambiadas.length + c.quitadas.length;
                  const hora = new Date(pub.cambiosEn || pub.publicadoEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                  return total > 0 ? (
                    <button onClick={() => avisarCambios(dia)} disabled={publicando} className="w-full mt-1.5 py-1.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-200 disabled:opacity-50">
                      ✏️ {total} cambio{total > 1 ? 's' : ''} sin avisar · Avisar a Fabio y Mory
                    </button>
                  ) : (
                    <div className="mt-1.5 text-center text-xs font-bold text-emerald-800">✅ Publicado a las {hora}{pub.cambiosEn ? ' (con cambios avisados)' : ''}</div>
                  );
                })()}
              </div>

              <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                {tareasDelDia.map((task) => {
                  const finca = getFincaData(task.fincaId);
                  const hasNotes = task.notes && task.notes.trim().length > 0;
                  const taskWorkers = workers.filter(w => (task.workerIds || []).includes(w.id));
                  const hasStars = task.stars > 0;
                  const isBeingDragged = draggedTaskId === task.id || arrastrandoId === task.id;
                  const abrir = () => { if (Date.now() - ultimoArrastre.current < 500) return; setBoardTaskMenu(task); setShowWorkersDropdown(false); };

                  return (
                    <div key={task.id} data-tarea-id={task.id}
                      draggable={punteroFino}
                      onDragStart={(e) => handleDragStart(e, task, 'board')}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => handleDropOnTask(e, task, dia)}
                      onTouchStart={(e) => empezarPulsacion(e, task, dia)}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={abrir}
                      className={`flex flex-col bg-white border ${finca.color.split(' ')[1]} rounded-lg shadow-sm hover:shadow-md overflow-hidden cursor-pointer select-none [-webkit-touch-callout:none] ${isBeingDragged ? 'relative z-30 shadow-2xl ring-2 ring-emerald-400 scale-[1.02]' : 'transition-shadow'}`}
                    >
                      <div className="flex items-stretch min-h-[44px]">
                        <div className={`w-2 ${finca.handleColor} shrink-0`}></div>
                        <div className="px-2 py-1.5 flex-1 flex flex-col justify-center">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className={`text-xs font-black px-1.5 rounded bg-white border text-slate-700 ${finca.color.split(' ')[1]}`}>{getFincaTag(finca.name)}</span>
                            <span className="flex items-center gap-1.5">
                              {(task.fotos || []).length > 0 && <span className="text-xs font-bold text-slate-600">📷 {task.fotos.length}</span>}
                              {hasStars && <span className="text-base">{'⭐'.repeat(task.stars)}</span>}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-800 leading-tight">{task.description}</span>
                        </div>
                      </div>

                      {taskWorkers.length > 0 && (
                        <div className="bg-blue-50/60 border-t border-blue-100 px-2 py-1 flex flex-wrap gap-1">
                          {taskWorkers.map(w => (
                            <span key={w.id} className="text-xs font-bold bg-blue-100 text-blue-900 px-1.5 rounded-full">{w.name}</span>
                          ))}
                        </div>
                      )}

                      {hasNotes && (
                        <div className="bg-yellow-50 border-t border-yellow-100 px-2 py-1 text-xs font-medium flex gap-1 items-start text-slate-700">
                          <span>📝</span> <span className="line-clamp-2 leading-tight">{task.notes}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {(() => {
                  const mias = misTareas.filter(t => t.fecha === dia.dateString).sort((a, b) => (a.hecha ? 1 : 0) - (b.hecha ? 1 : 0) || (a.order || 0) - (b.order || 0));
                  if (mias.length === 0) return null;
                  return (
                    <div className="pt-2 mt-1 border-t-2 border-dashed border-slate-300 space-y-1.5">
                      <div className="text-xs font-bold text-slate-600 px-1">👤 Mis tareas</div>
                      {mias.map(t => {
                        const finca = getFincaData(t.fincaId);
                        return (
                          <div key={t.id} data-mia-id={t.id} onClick={() => setMiTareaId(t.id)} className={`flex items-stretch bg-white border-2 border-dashed ${finca.color.split(' ')[1]} rounded-lg cursor-pointer select-none ${t.hecha ? 'opacity-60' : ''}`}>
                            <button onClick={(e) => { e.stopPropagation(); cambiarMia(t.id, { hecha: !t.hecha, hechaEn: t.hecha ? null : Date.now() }); }} aria-label={t.hecha ? 'Marcar como pendiente' : 'Marcar como hecha'} className="px-2 flex items-center shrink-0">
                              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold ${t.hecha ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400 bg-white'}`}>{t.hecha ? '✓' : ''}</span>
                            </button>
                            <div className="py-1.5 pr-2 flex-1 min-w-0">
                              <div className="flex justify-between items-center gap-1">
                                <span className="flex items-center gap-1">
                                  <span className={`text-xs font-black px-1.5 rounded bg-white border text-slate-700 ${finca.color.split(' ')[1]}`}>{getFincaTag(finca.name)}</span>
                                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 rounded">👤 Mía</span>
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                  {(t.fotos || []).length > 0 && <span>📷 {t.fotos.length}</span>}
                                  {t.notes && t.notes.trim() && <span>📝</span>}
                                </span>
                              </div>
                              <span className={`text-sm font-semibold text-slate-800 leading-tight ${t.hecha ? 'line-through' : ''}`}>{t.description}</span>
                              {t.pendienteDesde && !t.hecha && <div className="text-xs text-amber-700 font-semibold">Pendiente desde el {etiquetaFecha(t.pendienteDesde)}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {tareasDelDia.length === 0 && !misTareas.some(t => t.fecha === dia.dateString) && <div className="h-full flex items-center justify-center text-slate-500 text-sm p-2 text-center">Sin tareas. Toca «＋ Añadir tarea»{hayAyer ? ' o «↻ Repetir día anterior»' : ''}.</div>}
                {tareasDelDia.length > 1 && <div className="text-center text-xs text-slate-500 pt-1">{punteroFino ? 'Arrastra una tarea para cambiar el orden' : 'Mantén pulsada una tarea y arrástrala para cambiar el orden'}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4) TAREAS POR FINCA */}
      <div className="h-[36dvh] bg-white border-t flex flex-col shrink-0 shadow-[0_-4px_10px_rgb(0,0,0,0.1)] z-20">
        <div className="p-1.5 bg-slate-800 text-white flex justify-between items-center px-3 shrink-0 shadow-sm">
          <h2 className="font-bold flex items-center gap-1.5 text-sm">📍 Tareas por fincas <span className="font-normal text-xs text-slate-500 hidden sm:inline ml-1 opacity-80">(arrastra o toca la tarea que quieras mover)</span></h2>
        </div>
        
        <div className="flex-1 overflow-x-auto p-2.5 flex gap-3 bg-slate-50/80 items-start">
          {fincas.map(finca => {
            const tareasFinca = catalog.filter(t => t.fincaId === finca.id).sort(porUso);
            const isAdding = activeFincaForNewTask === finca.id;
            
            return (
              <div key={finca.id} className={`flex-shrink-0 w-60 rounded-xl border ${finca.color} flex flex-col h-full bg-white shadow-sm overflow-hidden`}>
                
                <div className={`p-1.5 font-bold text-sm text-center border-b ${finca.color.split(' ')[1]} flex justify-between items-center bg-white/50 backdrop-blur-sm`}>
                  <span className="drop-shadow-sm ml-1">{nombreFinca(finca.name)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { setActiveFincaForNewTask(isAdding ? null : finca.id); }} className={`p-1 w-6 h-6 flex items-center justify-center rounded shadow-sm transition-colors text-slate-700 text-xs ${isAdding ? 'bg-red-200 hover:bg-red-300' : 'bg-white/60 hover:bg-white'}`} title="Añadir Tarea">
                      {isAdding ? '✕' : '➕'}
                    </button>
                  </div>
                </div>
                
                {isAdding && (
                  <div className="p-1.5 border-b bg-slate-50 flex gap-1">
                    <input type="text" autoFocus placeholder="Añadir tarea..." className="flex-1 text-xs p-1 border rounded outline-none focus:ring-2 focus:ring-emerald-500" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCatalogTask(finca.id)} />
                    <button onClick={() => addCatalogTask(finca.id)} className="bg-emerald-600 text-white px-2 rounded font-bold shadow-sm text-xs">✓</button>
                  </div>
                )}
                
                <div className="overflow-y-auto p-1.5 space-y-1 flex-1">
                  {tareasFinca.map((task) => (
                    (
                      <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task, 'catalog')} 
                        className="group flex items-center justify-between p-1 bg-white rounded border shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-400 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden flex-1" onClick={() => setTouchMenu({source: 'catalog', item: task})}>
                          <span className="text-slate-500 hidden md:block pl-1 cursor-grab text-xs">☰</span>
                          <span className="text-xs font-medium text-slate-700 truncate select-none">{task.description}</span>
                        </div>
                        <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                           <button onClick={() => setEditingCatalogTask(task)} className="text-blue-500 hover:bg-blue-50 p-0.5 rounded text-xs">✏️</button>
                           <button onClick={() => deleteCatalogTask(task.id)} className="text-red-500 hover:bg-red-50 p-0.5 rounded text-xs">🗑️</button>
                        </div>
                      </div>
                    )
                  ))}
                  {tareasFinca.length === 0 && !isAdding && <div className="text-center text-xs text-slate-500 p-2 font-medium">Sin tareas. Toca ➕ para crear.</div>}
                </div>
              </div>
            );
          })}
          {fincas.length === 0 && <div className="p-4 text-slate-500 text-xs font-medium border-2 border-dashed border-slate-300 rounded-xl w-full text-center py-6">Ve a '⚙️ Ajustes' arriba para crear fincas.</div>}
        </div>
      </div>

                {/* MODAL 1) HISTÓRICO Y BUSCADOR */}
      {showCalendarModal && (() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; 
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const todayStr = getLocalIsoDate(new Date());

        // Recopilar todo el histórico uniendo (historialCompleto || []) y las tareas de hoy en vivo si procede
        const allTasksHistory = [
          ...(historialCompleto || []),
          ...boardTasks.map(t => ({ ...t, snapshotDate: t.targetDateStr || t.dateString || todayStr })),
          ...misTareas.filter(t => t.hecha).map(t => ({ ...t, snapshotDate: t.fecha, mia: true }))
        ];

        // Filtrar tareas según el buscador avanzado
        const filteredHistoryTasks = allTasksHistory.filter(t => {
          const textMatch = !historySearchText.trim() || 
            (t.description && t.description.toLowerCase().includes(historySearchText.toLowerCase())) || 
            (t.notes && t.notes.toLowerCase().includes(historySearchText.toLowerCase()));
          
          const fincaMatch = historySearchFincaId === 'ALL' || t.fincaId === historySearchFincaId;
          
          const workerMatch = historySearchWorkerId === 'ALL' || 
            (t.workerIds && t.workerIds.includes(historySearchWorkerId)) ||
            (t.finalWorkers && t.finalWorkers.includes(historySearchWorkerId));

          return textMatch && fincaMatch && workerMatch;
        }).sort((a, b) => (b.snapshotDate || '').localeCompare(a.snapshotDate || ''));

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setShowCalendarModal(false); setSelectedCalendarDate(null); }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
              
              {/* Cabecera del modal */}
              <div className="bg-blue-50 flex flex-col border-b border-blue-100 shrink-0">
                <div className="flex justify-between items-center p-3 pb-2">
                  <h2 className="font-bold text-base text-blue-900 flex items-center gap-2">📅 Registro e Histórico</h2>
                  <button aria-label="Cerrar" onClick={() => { setShowCalendarModal(false); setSelectedCalendarDate(null); }} className="text-slate-500 text-2xl leading-none hover:bg-blue-200 rounded-full w-9 h-9 flex items-center justify-center">✕</button>
                </div>
                {/* Selector de Pestañas: Calendario vs Buscador */}
                <div className="flex px-3 gap-2 pb-1">
                  <button onClick={() => setHistoryViewMode('calendar')} className={`flex-1 py-1.5 font-bold text-xs rounded-t-lg transition-colors ${historyViewMode === 'calendar' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    📅 Por Calendario
                  </button>
                  <button onClick={() => setHistoryViewMode('search')} className={`flex-1 py-1.5 font-bold text-xs rounded-t-lg transition-colors ${historyViewMode === 'search' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    🔍 Buscador Avanzado
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
                {historyViewMode === 'calendar' ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg font-bold text-slate-600">◀</button>
                      <div className="font-bold text-lg text-slate-800 capitalize">{monthNames[month]} {year}</div>
                      <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg font-bold text-slate-600">▶</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-2">
                      <div>L</div><div>M</div><div>X</div><div>J</div><div>V</div><div>S</div><div>D</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-4">
                      {blanks.map(b => <div key={`blank-${b}`} className="p-2"></div>)}
                      {days.map(d => {
                        const dateObj = new Date(year, month, d);
                        const dateStr = getLocalIsoDate(dateObj);
                        const isToday = todayStr === dateStr;
                        const isFuture = dateStr > todayStr;
                        const isSelected = selectedCalendarDate === dateStr;
                        
                        const hasSnapshot = (historialCompleto || []).some(t => t.snapshotDate === dateStr) || (isToday && boardTasks.some(t => (t.targetDateStr || t.dateString) === dateStr));

                        return (
                          <div key={d} onClick={() => !isFuture && setSelectedCalendarDate(dateStr)} 
                               className={`p-1.5 rounded-lg text-sm font-semibold flex flex-col items-center justify-center transition-all ${isFuture ? 'opacity-30 cursor-not-allowed text-slate-500' : 'cursor-pointer hover:bg-slate-100 text-slate-700'} ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${isToday ? 'bg-blue-600 text-white shadow-md' : ''}`}>
                            <span>{d}</span>
                            <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${hasSnapshot ? (isToday ? 'bg-white' : 'bg-emerald-500') : 'bg-transparent'}`}></div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {selectedCalendarDate && (
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-sm text-slate-700">Foto del {selectedCalendarDate.split('-').reverse().join('/')}</h4>
                        </div>
                        <div className="space-y-1.5">
                          {allTasksHistory.filter(t => t.snapshotDate === selectedCalendarDate).map(t => {
                            const finca = getFincaData(t.fincaId);
                            const tWorkers = workers.filter(w => ((t.workerIds || t.finalWorkers) || []).includes(w.id));
                            return (
                              <div key={t.id} onClick={() => setShowHistoryDetailModal(t)} className="text-xs p-2 rounded-lg bg-white hover:bg-blue-50 cursor-pointer border border-slate-200 transition-colors flex flex-col gap-1 shadow-sm">
                                <div className="flex justify-between items-center">
                                  <div className="flex gap-1.5 items-center">
                                    <span className={`w-2.5 h-2.5 rounded-sm shadow-sm shrink-0 ${finca.handleColor}`}></span>
                                    <span className="font-bold text-slate-800">{finca.name}</span>
                                    {t.mia && <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">👤 Mía</span>}
                                  </div>
                                  {t.stars > 0 && <span>{'⭐'.repeat(t.stars)}</span>}
                                </div>
                                <span className="text-slate-700 pl-4 font-semibold">{t.description}</span>
                                {tWorkers.length > 0 && (
                                  <span className="text-xs text-blue-700 font-bold pl-4">👥 {tWorkers.map(w => w.name).join(', ')}</span>
                                )}
                              </div>
                            )
                          })}
                          {allTasksHistory.filter(t => t.snapshotDate === selectedCalendarDate).length === 0 && (
                            <div className="text-xs text-slate-500 italic text-center p-2">No hay tareas registradas para este día.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* VISTA BUSCADOR AVANZADO */
                  <div className="space-y-3">
                    <div className="space-y-2 bg-white p-3 rounded-lg border shadow-sm">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar palabra (tarea o comentarios)</label>
                        <input type="text" value={historySearchText} onChange={e => setHistorySearchText(e.target.value)} placeholder="Ej: tratamiento, manta, sulfato..." className="w-full p-2 text-xs border rounded outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por Finca</label>
                          <select value={historySearchFincaId} onChange={e => setHistorySearchFincaId(e.target.value)} className="w-full p-1.5 text-xs border rounded bg-white outline-none">
                            <option value="ALL">Todas las fincas</option>
                            {fincas.map(f => <option key={f.id} value={f.id}>{nombreFinca(f.name)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por Trabajador</label>
                          <select value={historySearchWorkerId} onChange={e => setHistorySearchWorkerId(e.target.value)} className="w-full p-1.5 text-xs border rounded bg-white outline-none">
                            <option value="ALL">Todos</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 px-1">
                        <span>Resultados ({filteredHistoryTasks.length})</span>
                      </div>
                      {filteredHistoryTasks.map(t => {
                        const finca = getFincaData(t.fincaId);
                        const tWorkers = workers.filter(w => ((t.workerIds || t.finalWorkers) || []).includes(w.id));
                        const formattedDate = t.snapshotDate ? t.snapshotDate.split('-').reverse().join('/') : '';
                        return (
                          <div key={t.id + (t.snapshotDate || '')} onClick={() => setShowHistoryDetailModal(t)} className="text-xs p-2.5 rounded-lg bg-white hover:bg-blue-50 cursor-pointer border border-slate-200 transition-colors flex flex-col gap-1 shadow-sm">
                            <div className="flex justify-between items-center">
                              <div className="flex gap-1.5 items-center">
                                <span className={`w-2.5 h-2.5 rounded-sm shadow-sm shrink-0 ${finca.handleColor}`}></span>
                                <span className="font-bold text-slate-800">{finca.name}</span>
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded ml-1">📅 {formattedDate}</span>
                                {t.mia && <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">👤 Mía</span>}
                              </div>
                              {t.stars > 0 && <span>{'⭐'.repeat(t.stars)}</span>}
                            </div>
                            <span className="text-slate-800 pl-4 font-semibold">{t.description}</span>
                            {t.notes && <span className="text-xs text-amber-800 bg-amber-50 p-1 rounded pl-4 line-clamp-1">📝 {t.notes}</span>}
                            {tWorkers.length > 0 && (
                              <span className="text-xs text-blue-700 font-bold pl-4">👥 {tWorkers.map(w => w.name).join(', ')}</span>
                            )}
                          </div>
                        );
                      })}
                      {filteredHistoryTasks.length === 0 && (
                        <div className="text-xs text-slate-500 italic text-center p-6 bg-white rounded-lg border">No se encontraron tareas con esos filtros.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* VENTANA DETALLE HISTORIAL (SOLO LECTURA) */}
      {showHistoryDetailModal && (() => {
        const finca = getFincaData(showHistoryDetailModal.fincaId);
        const taskWorkers = workers.filter(w => (showHistoryDetailModal.workerIds || []).includes(w.id));
        const hasNotes = showHistoryDetailModal.notes && showHistoryDetailModal.notes.trim().length > 0;

        return (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowHistoryDetailModal(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              
              <div className={`p-4 text-white ${finca.handleColor} flex justify-between items-start`}>
                <div>
                  <div className="text-xs font-bold opacity-90 mb-1 tracking-wide uppercase">{finca.name} - {showHistoryDetailModal.snapshotDate ? showHistoryDetailModal.snapshotDate.split('-').reverse().join('/') : ''}</div>
                  <h3 className="font-black text-xl leading-tight">
                    {showHistoryDetailModal.description}
                  </h3>
                </div>
                <button aria-label="Cerrar" onClick={() => setShowHistoryDetailModal(null)} className="text-white text-2xl leading-none bg-black/10 hover:bg-black/20 w-9 h-9 flex items-center justify-center rounded-full transition-colors">✕</button>
              </div>
              
              <div className="p-5 flex flex-col gap-4 bg-slate-50">
                
                {showHistoryDetailModal.stars > 0 && (
                  <div className="bg-white p-3 rounded-lg border shadow-sm flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Prioridad:</span>
                    <span className="text-xl drop-shadow-md">{`⭐`.repeat(showHistoryDetailModal.stars)}</span>
                  </div>
                )}

                <div className="bg-white p-3 rounded-lg border shadow-sm">
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-2">👥 Cuadrilla Asignada</span>
                  {taskWorkers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {taskWorkers.map(w => (
                        <div key={w.id} className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded font-bold text-xs shadow-sm">
                          {w.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No hubo trabajadores asignados.</span>
                  )}
                </div>

                {hasNotes && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 shadow-sm">
                    <span className="block text-xs font-bold text-yellow-700 uppercase mb-1">📝 Anotaciones</span>
                    <p className="text-xs text-slate-800 whitespace-pre-wrap font-medium">{showHistoryDetailModal.notes}</p>
                  </div>
                )}

                {(showHistoryDetailModal.fotos || []).length > 0 && (
                  <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <span className="block text-xs font-bold text-slate-600 uppercase mb-2">📷 Fotos</span>
                    <div className="flex gap-2 overflow-x-auto">
                      {showHistoryDetailModal.fotos.map((f, i) => (
                        <img key={f.ruta || f.url} src={f.url} alt="" loading="lazy" onClick={() => setVisor({ fotos: showHistoryDetailModal.fotos, indice: i })} className="w-20 h-20 object-cover rounded-lg border cursor-pointer bg-slate-100 shrink-0" />
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
              <div className="p-3 bg-white border-t flex gap-2">
                <button onClick={() => setShowHistoryDetailModal(null)} className="w-full py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-300 transition-colors">Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE AJUSTES */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 flex flex-col border-b">
              <div className="flex justify-between items-center p-3 pb-2">
                <h2 className="font-bold text-base text-slate-800">Ajustes</h2>
                <button aria-label="Cerrar" onClick={() => setShowSettingsModal(false)} className="text-slate-500 text-2xl leading-none hover:bg-slate-200 rounded-full w-9 h-9 flex items-center justify-center">✕</button>
              </div>
              <div className="flex px-3 gap-3">
                <button onClick={() => setSettingsTab('fincas')} className={`pb-2 font-bold text-xs border-b-2 transition-colors ${settingsTab === 'fincas' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  ⚙️ Gestión Fincas
                </button>
                <button onClick={() => setSettingsTab('workers')} className={`pb-2 font-bold text-xs border-b-2 transition-colors ${settingsTab === 'workers' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  👥 Trabajadores
                </button>
                <button onClick={() => setSettingsTab('avisos')} className={`pb-2 font-bold text-xs border-b-2 transition-colors ${settingsTab === 'avisos' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  🔔 Avisos
                </button>
              </div>
            </div>

            <div className="p-3 overflow-y-auto bg-slate-50/50 flex-1">
              {settingsTab === 'fincas' && (
                editingFinca ? (
                  <form onSubmit={saveFinca} className="space-y-3 bg-white p-3 rounded-lg border shadow-sm">
                    <h3 className="font-bold text-sm text-slate-700">{editingFinca.id ? 'Editar Finca' : 'Nueva Finca'}</h3>
                    <input type="text" required autoFocus value={editingFinca.name} onChange={e => setEditingFinca({...editingFinca, name: e.target.value})} className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nombre (Ej: Finca Nueva)" />
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Color</label>
                      <div className="grid grid-cols-4 gap-2">
                        {COLOR_PALETTE.map((cp, i) => (
                          <div key={i} onClick={() => setEditingFinca({...editingFinca, color: cp.color, handleColor: cp.handleColor})}
                               className={`cursor-pointer h-7 rounded border-2 ${cp.handleColor} ${editingFinca.handleColor === cp.handleColor ? 'ring-2 ring-slate-800 ring-offset-1 scale-105' : 'opacity-70 hover:opacity-100'}`}></div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setEditingFinca(null)} className="flex-1 py-1.5 bg-slate-100 text-sm font-bold rounded text-slate-700">Cancelar</button>
                      <button type="submit" className="flex-1 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded">Guardar</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <button onClick={() => setEditingFinca({ name: '', color: COLOR_PALETTE[0].color, handleColor: COLOR_PALETTE[0].handleColor })} className="w-full py-1.5 bg-white text-emerald-700 border-2 border-emerald-200 border-dashed rounded font-bold text-sm hover:bg-emerald-50 transition-colors">➕ Añadir Nueva Finca</button>
                    {fincas.map((f, index) => (
                      <div key={f.id} className={`flex items-center justify-between p-2 border rounded bg-white shadow-sm`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${f.handleColor}`}></div>
                          <span className="font-bold text-sm text-slate-700">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex flex-col border-r pr-1 mr-1">
                            <button onClick={() => moveFincaOrder(index, -1)} disabled={index === 0} className="text-slate-500 hover:text-slate-800 disabled:opacity-30 text-xs">⬆️</button>
                            <button onClick={() => moveFincaOrder(index, 1)} disabled={index === fincas.length - 1} className="text-slate-500 hover:text-slate-800 disabled:opacity-30 text-xs">⬇️</button>
                          </div>
                          <button onClick={() => setEditingFinca(f)} className="p-1 hover:bg-slate-100 rounded text-slate-600 text-xs">✏️</button>
                          <button onClick={() => deleteFinca(f.id)} className="p-1 hover:bg-red-50 rounded text-red-500 text-xs">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {settingsTab === 'workers' && (
                <div className="space-y-3">
                  {avisosConfig.trabajadoresDesdeAppero ? (
                    <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg p-2.5">
                      Los trabajadores se dan de <b>alta y de baja en appero</b> (gestión agrícola). Aquí se actualizan solos en un par de minutos.
                    </div>
                  ) : (
                  <form onSubmit={addWorker} className="flex gap-2 bg-white p-2 rounded border shadow-sm">
                    <input type="text" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} placeholder="Nombre..." className="flex-1 p-1.5 text-sm border rounded outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" className="bg-blue-600 text-white px-3 text-sm font-bold rounded hover:bg-blue-700">Añadir</button>
                  </form>
                  )}
                  <div className="space-y-1.5">
                    {workers.filter(w => w.activo !== false).map(w => (
                      <div key={w.id} className="bg-white p-2 border rounded shadow-sm">
                       <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-slate-700 flex items-center gap-2">👤 {w.name}</span>
                        {!avisosConfig.trabajadoresDesdeAppero && <button onClick={() => deleteWorker(w.id)} className="p-1 hover:bg-red-50 text-red-500 rounded text-xs">🗑️</button>}
                       </div>
                       {Array.isArray(w.faltanDatos) && w.faltanDatos.length > 0 && (
                        <div className="mt-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded p-1.5">
                          ⚠️ Documento sin registrar bien: faltan {w.faltanDatos.join(', ')}. Se completa en appero.
                        </div>
                       )}
                      </div>
                    ))}
                    {workers.filter(w => w.activo !== false).length === 0 && <div className="text-center p-3 text-xs text-slate-500 italic">No hay trabajadores registrados.</div>}
                  </div>
                </div>
              )}

              {settingsTab === 'avisos' && (() => {
                const valor = (k, def) => avisosEdit[k] !== undefined ? avisosEdit[k] : (avisosConfig[k] ?? def);
                const horaEntrada = valor('horaEntrada', '08:00');
                const minutosAntes = Number(valor('minutosAntes', 45)) || 45;
                const horaRecordatorio = valor('horaRecordatorio', '22:00');
                const horaSalida = valor('horaSalida', '17:00');
                const descansoMin = valor('descansoMin', 30);
                const aMin = (x) => { const [a, b] = (x || '0:0').split(':').map(Number); return a * 60 + b; };
                const horasJornada = Math.round((aMin(horaSalida) - aMin(horaEntrada) - (Number(descansoMin) || 0)) / 6) / 10;
                const [hh, mm] = (horaEntrada || '08:00').split(':').map(Number);
                const t = hh * 60 + mm - minutosAntes;
                const horaAviso = `${String(Math.floor(((t + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((t % 60) + 60) % 60).padStart(2, '0')}`;
                const hayCambios = Object.keys(avisosEdit).length > 0;
                return (
                  <div className="space-y-3">
                    <InstalarApp />
                    <div className="bg-white p-3 rounded-lg border shadow-sm space-y-2">
                      <h3 className="font-bold text-sm text-slate-800">🔔 Notificaciones en este aparato</h3>
                      {pushEstado === 'cargando' && <p className="text-xs text-slate-500">Comprobando…</p>}
                      {pushEstado === 'activo' && <>
                        <p className="text-xs text-emerald-700 font-bold">✅ Activadas. Te llegarán los avisos aunque la app esté cerrada.</p>
                        {((miAviso && miAviso.subs) || []).some(x => !x.confirmada) && <p className="text-xs text-amber-700">⏳ En menos de 5 minutos te llegará un aviso de confirmación.</p>}
                        <button onClick={desactivarPush} disabled={pushOcupado} className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">Desactivar en este aparato</button>
                      </>}
                      {pushEstado === 'inactivo' && <>
                        <p className="text-xs text-slate-500">Pulsa el botón y acepta el permiso. Cada móvil u ordenador se activa por separado.</p>
                        <button onClick={activarPush} disabled={pushOcupado} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-2 rounded-lg">{pushOcupado ? 'Activando…' : 'Activar notificaciones'}</button>
                      </>}
                      {pushEstado === 'instalar' && <p className="text-xs text-slate-700">En el iPhone hay que instalar antes la pizarra: en Safari pulsa <b>Compartir</b> (⬆️), elige <b>«Añadir a pantalla de inicio»</b>, ábrela desde su icono y vuelve aquí.</p>}
                      {pushEstado === 'denegado' && <p className="text-xs text-slate-700">Las notificaciones están bloqueadas para esta página. Actívalas en los ajustes del móvil: <b>iPhone</b> → Ajustes → Notificaciones → Pizarra; <b>Android</b> → ⋮ del navegador → Ajustes del sitio → Notificaciones.</p>}
                      {pushEstado === 'noSoportado' && <p className="text-xs text-slate-700">Este navegador no admite notificaciones. Prueba con Chrome, o instala la pizarra en la pantalla de inicio.</p>}
                      {pushError && <p className="text-xs text-red-700 font-semibold">{pushError}</p>}
                      {((miAviso && miAviso.subs) || []).length > 0 && <p className="text-xs text-slate-500">Aparatos con avisos: {miAviso.subs.map(x => x.aparato || 'aparato').join(', ')}</p>}
                    </div>
                    <div className="bg-white p-3 rounded-lg border shadow-sm space-y-3">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">🕗 Jornada</h3>
                        <div className="flex flex-wrap gap-3 mt-1 items-end">
                          <label className="text-xs text-slate-600">Entrada<br /><input type="time" value={horaEntrada} onChange={e => setAvisosEdit({ ...avisosEdit, horaEntrada: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></label>
                          <label className="text-xs text-slate-600">Salida<br /><input type="time" value={horaSalida} onChange={e => setAvisosEdit({ ...avisosEdit, horaSalida: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></label>
                          <label className="text-xs text-slate-600">Descanso (min)<br /><input type="number" min="0" max="240" step="5" value={descansoMin} onChange={e => setAvisosEdit({ ...avisosEdit, descansoMin: e.target.value })} className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></label>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Jornada de <b>{horasJornada} h</b>. Al terminar (15 min después de la salida) se envían a la app agrícola los trabajadores de cada tarea y finca.</p>
                      </div>
                      <div className="border-t pt-3">
                        <h3 className="font-bold text-sm text-slate-800">🌙 Recordatorio (la noche antes)</h3>
                        <p className="text-xs text-slate-500">Cómo está planificado el día siguiente: tareas sin cuadrilla, las que se copiarán solas y quién se queda sin tarea. Solo informa, no cambia nada.</p>
                        <input type="time" value={horaRecordatorio} onChange={e => setAvisosEdit({ ...avisosEdit, horaRecordatorio: e.target.value })} className="mt-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                      </div>
                      <div className="border-t pt-3">
                        <h3 className="font-bold text-sm text-slate-800">🚨 Aviso de emergencia</h3>
                        <p className="text-xs text-slate-500">A las <b>{horaAviso}</b> se copia la cuadrilla de ayer en las tareas repetidas sin trabajadores, y os avisa solo si queda algo pendiente.</p>
                        <div className="flex gap-2 items-center mt-1">
                          <input type="number" min="5" max="240" step="5" value={minutosAntes} onChange={e => setAvisosEdit({ ...avisosEdit, minutosAntes: e.target.value })} className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                          <span className="text-xs text-slate-600">minutos antes de la entrada</span>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center border-t pt-3">
                        <button onClick={guardarAvisos} disabled={!hayCambios} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-xs px-3 py-2 rounded-lg">Guardar</button>
                        {hayCambios && <button onClick={() => setAvisosEdit({})} className="text-xs text-slate-500 underline">Deshacer</button>}
                      </div>
                      <p className="text-xs text-slate-500">Los avisos pueden llegar hasta 5 minutos después de su hora.</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="p-3 border-t bg-white flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-500 truncate">Has entrado como {user && user.email}</span>
              <button onClick={() => { if (confirm('¿Cerrar sesión en este dispositivo?')) { setShowSettingsModal(false); window.FirebaseAPI.signOut(window.FirebaseAPI.auth); } }} className="shrink-0 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                🚪 Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR TAREA DEL CATÁLOGO */}
      {editingCatalogTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditingCatalogTask(null)}>
          <form onSubmit={updateCatalogTask} className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-2 text-slate-800">Editar Tarea</h3>
            <input type="text" autoFocus required value={editingCatalogTask.description} onChange={e => setEditingCatalogTask({...editingCatalogTask, description: e.target.value})} className="w-full p-2 border rounded mb-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingCatalogTask(null)} className="flex-1 py-1.5 bg-slate-100 rounded text-sm font-bold text-slate-700">Cancelar</button>
              <button type="submit" className="flex-1 py-1.5 bg-emerald-600 text-white rounded text-sm font-bold">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* MENÚ TAREA TABLERO */}
      {boardTaskMenu && (() => {
        const finca = getFincaData(boardTaskMenu.fincaId);
        const fechaEsta = fechaTarea(boardTaskMenu);
        // Libres (y los de esta tarea) primero; debajo, los que ya están en otra tarea ese día.
        const otraTareaDe = (wId) => boardTasks.find(t => t.id !== boardTaskMenu.id && (t.targetDateStr || t.dateString) === fechaEsta && (t.workerIds || []).includes(wId));
        const lista = workers.filter(w => w.activo !== false || (boardTaskMenu.workerIds || []).includes(w.id));
        const libres = lista.filter(w => (boardTaskMenu.workerIds || []).includes(w.id) || !otraTareaDe(w.id));
        const ocupados = lista.filter(w => !libres.includes(w));
        const deAyer = cuadrillaDeAyer(boardTaskMenu);
        const mismaQueAyer = deAyer && deAyer.length === (boardTaskMenu.workerIds || []).length && deAyer.every(id => (boardTaskMenu.workerIds || []).includes(id));
        const alternar = (wId) => {
          const actuales = boardTaskMenu.workerIds || [];
          cambiarTarea({ workerIds: actuales.includes(wId) ? actuales.filter(id => id !== wId) : [...actuales, wId] });
        };
        const fichaTrabajador = (w, ocupado) => {
          const marcado = (boardTaskMenu.workerIds || []).includes(w.id);
          const otra = ocupado ? otraTareaDe(w.id) : null;
          const otraFinca = otra ? getFincaData(otra.fincaId) : null;
          return (
            <button key={w.id} type="button" onClick={() => alternar(w.id)}
              className={`flex items-center justify-between gap-1.5 px-2 py-2 rounded-lg border text-left transition-colors ${marcado ? 'bg-blue-50 border-blue-400 text-blue-900' : ocupado ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 text-xs ${marcado ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>{marcado ? '✓' : ''}</span>
                <span className={`text-sm font-semibold truncate ${ocupado && !marcado ? 'line-through' : ''}`}>{w.name}{w.activo === false && <span className="ml-1.5 text-xs font-bold text-amber-700">de baja</span>}</span>
              </span>
              {otraFinca && <span className={`text-xs font-bold px-1.5 rounded text-white shrink-0 ${otraFinca.handleColor}`}>{getFincaTag(otraFinca.name)}</span>}
            </button>
          );
        };

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={cerrarTareaMenu}>
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[92dvh]" onClick={e => e.stopPropagation()}>

              <div className={`p-3 rounded-t-2xl sm:rounded-t-xl text-white ${finca.handleColor} flex justify-between items-start gap-2`}>
                <div className="min-w-0">
                  <div className="text-xs font-bold opacity-90 mb-0.5">{finca.name} · {etiquetaFecha(fechaEsta)}</div>
                  <h3 className="font-black text-lg leading-tight line-clamp-2">{boardTaskMenu.description}</h3>
                </div>
                <button onClick={cerrarTareaMenu} aria-label="Cerrar" className="text-white/90 text-2xl leading-none hover:bg-black/20 w-9 h-9 flex items-center justify-center rounded-full shrink-0">✕</button>
              </div>

              <div className="p-3 overflow-y-auto flex-1 bg-slate-50 flex flex-col gap-3">

                <div className="bg-white p-2.5 rounded-lg border flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-700">👥 Cuadrilla</span>
                    <button type="button" disabled={!deAyer || mismaQueAyer} onClick={() => cambiarTarea({ workerIds: deAyer })}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-500">
                      {mismaQueAyer ? '✓ Igual que ayer' : deAyer ? '↻ Misma cuadrilla que ayer' : 'Ayer no se hizo esta tarea'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {libres.map(w => fichaTrabajador(w, false))}
                  </div>
                  {ocupados.length > 0 && <>
                    <div className="text-xs font-semibold text-slate-500 mt-1">Ya están en otra tarea ese día:</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ocupados.map(w => fichaTrabajador(w, true))}
                    </div>
                  </>}
                  {workers.length === 0 && <div className="text-sm text-slate-500 italic text-center p-2">Sin trabajadores en Ajustes.</div>}
                </div>

                <div className="bg-white p-2 rounded-lg border">
                  <textarea value={boardTaskMenu.notes || ''} onChange={(e) => cambiarNotas(e.target.value)} placeholder="📝 Detalles, maquinaria necesaria..." className="w-full p-2 border border-yellow-200 rounded bg-yellow-50/50 text-sm outline-none focus:ring-2 focus:ring-yellow-400 resize-none h-16" />
                </div>

                <div className="bg-white p-2.5 rounded-lg border flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-700">📷 Fotos {(boardTaskMenu.fotos || []).length > 0 && <span className="font-semibold text-slate-500">({boardTaskMenu.fotos.length})</span>}</span>
                    <label className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 cursor-pointer hover:bg-slate-50 ${subiendo ? 'opacity-50 pointer-events-none' : ''}`}>
                      ＋ Añadir fotos
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => { anadirFotos(e.target.files); e.target.value = ''; }} />
                    </label>
                  </div>
                  {subiendo && <div className="text-xs font-semibold text-blue-700">⏳ {subiendo}</div>}
                  {(boardTaskMenu.fotos || []).length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {boardTaskMenu.fotos.map((f, i) => (
                        <div key={f.ruta || f.url} className="relative shrink-0">
                          <img src={f.url} alt="" loading="lazy" onClick={() => setVisor({ fotos: boardTaskMenu.fotos, indice: i })} className="w-20 h-20 object-cover rounded-lg border cursor-pointer bg-slate-100" />
                          <button onClick={() => quitarFoto(i)} aria-label="Quitar foto" className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-600 text-xs leading-none shadow-sm">✕</button>
                        </div>
                      ))}
                    </div>
                  ) : !subiendo && <div className="text-xs text-slate-500">Haz una foto o elige de tu galería para que se entienda bien la tarea.</div>}
                </div>

                <div className="bg-white px-2.5 py-2 rounded-lg border flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 shrink-0">Prioridad</span>
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2, 3].map(num => (
                      <button key={num} type="button" onClick={() => cambiarTarea({ stars: num })}
                        className={`flex-1 py-1 rounded-md text-xs font-semibold border ${(boardTaskMenu.stars || 0) === num ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        {num === 0 ? 'Normal' : '⭐'.repeat(num)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">📋 Copiar a otros días <span className="font-normal text-xs text-slate-500">(esta se queda en su día)</span></span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {dias.filter(dia => dia.dateString !== fechaEsta).map(dia => {
                      const elegido = diasCopia.includes(dia.dateString);
                      return (
                        <button key={dia.id} onClick={() => setDiasCopia(elegido ? diasCopia.filter(d => d !== dia.dateString) : [...diasCopia, dia.dateString])}
                          className={`py-1.5 rounded-md font-bold text-xs border leading-tight ${elegido ? 'bg-blue-600 border-blue-600 text-white' : dia.esHoy ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white text-slate-700 border-slate-300'}`}>
                          {elegido ? '✓ ' : ''}{dia.id} {dia.numeroDia}
                        </button>
                      );
                    })}
                  </div>
                  <button disabled={diasCopia.length === 0} onClick={() => copiarTarea(boardTaskMenu, diasCopia)}
                    className="py-2 rounded-lg bg-slate-800 text-white text-sm font-bold disabled:opacity-40">
                    {diasCopia.length === 0 ? 'Elige uno o varios días' : `Copiar a ${diasCopia.length === 1 ? '1 día' : `${diasCopia.length} días`}`}
                  </button>
                  {avisoCopia && <div className="text-xs font-semibold text-emerald-700">{avisoCopia}</div>}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                  <span className="text-xs text-slate-500">✓ Los cambios se guardan solos</span>
                  <button onClick={async () => { if (await removeBoardTask(boardTaskMenu.id)) { clearTimeout(notasTimer.current); setBoardTaskMenu(null); } }} className="px-3 py-2 bg-white text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-50 text-sm">
                    🗑️ Quitar tarea
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {visor && <VisorFotos fotos={visor.fotos} indice={visor.indice} onCambiar={(i) => setVisor({ ...visor, indice: i })} onCerrar={() => setVisor(null)} />}

      {/* TAREA PERSONAL (solo la ve su dueño) */}
      {miTareaId && (() => {
        const t = misTareas.find(x => x.id === miTareaId);
        if (!t) return null;
        const finca = getFincaData(t.fincaId);
        const textoNotas = notasMia && notasMia.id === t.id ? notasMia.texto : (t.notes || '');
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={cerrarMiTarea}>
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[92dvh]" onClick={e => e.stopPropagation()}>
              <div className={`p-3 rounded-t-2xl sm:rounded-t-xl border-b-4 border-dashed ${finca.color.split(' ')[1]} bg-slate-50 flex justify-between items-start gap-2`}>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-600 mb-0.5">👤 Tarea personal · {finca.name} · {etiquetaFecha(t.fecha)}</div>
                  <h3 className="font-black text-lg leading-tight text-slate-800 line-clamp-2">{t.description}</h3>
                </div>
                <button onClick={cerrarMiTarea} aria-label="Cerrar" className="text-slate-500 text-2xl leading-none hover:bg-slate-200 w-9 h-9 flex items-center justify-center rounded-full shrink-0">✕</button>
              </div>
              <div className="p-3 overflow-y-auto flex-1 bg-slate-50 flex flex-col gap-3">
                <button onClick={() => cambiarMia(t.id, { hecha: !t.hecha, hechaEn: t.hecha ? null : Date.now() })}
                  className={`w-full py-3 rounded-lg font-bold text-base border-2 ${t.hecha ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-emerald-600 text-emerald-700'}`}>
                  {t.hecha ? '✓ Hecha (toca para desmarcar)' : 'Marcar como hecha'}
                </button>
                {t.pendienteDesde && !t.hecha && <div className="text-sm text-amber-800 font-semibold">Pendiente desde el {etiquetaFecha(t.pendienteDesde)}</div>}
                <div className="bg-white p-2 rounded-lg border">
                  <textarea value={textoNotas} onChange={(e) => { const texto = e.target.value; setNotasMia({ id: t.id, texto }); clearTimeout(notasMiaTimer.current); notasMiaTimer.current = setTimeout(() => cambiarMia(t.id, { notes: texto }), 700); }}
                    placeholder="📝 Notas para ti..." className="w-full p-2 border border-yellow-200 rounded bg-yellow-50/50 text-sm outline-none focus:ring-2 focus:ring-yellow-400 resize-none h-16" />
                </div>
                <div className="bg-white p-2.5 rounded-lg border flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-700">📷 Fotos {(t.fotos || []).length > 0 && <span className="font-semibold text-slate-500">({t.fotos.length})</span>}</span>
                    <label className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 cursor-pointer hover:bg-slate-50 ${subiendo ? 'opacity-50 pointer-events-none' : ''}`}>
                      ＋ Añadir fotos
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => { subirFotos(e.target.files, t.fotos, 'mia_' + t.id, async (fotos) => cambiarMia(t.id, { fotos })); e.target.value = ''; }} />
                    </label>
                  </div>
                  {subiendo && <div className="text-xs font-semibold text-blue-700">⏳ {subiendo}</div>}
                  {(t.fotos || []).length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {t.fotos.map((f, i) => (
                        <div key={f.ruta || f.url} className="relative shrink-0">
                          <img src={f.url} alt="" loading="lazy" onClick={() => setVisor({ fotos: t.fotos, indice: i })} className="w-20 h-20 object-cover rounded-lg border cursor-pointer bg-slate-100" />
                          <button onClick={() => { if (window.confirm('¿Quitar esta foto?')) cambiarMia(t.id, { fotos: t.fotos.filter((_, j) => j !== i) }); }} aria-label="Quitar foto" className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-600 text-xs leading-none shadow-sm">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 shrink-0">Mover a:</span>
                  <div className="flex gap-1 flex-1 overflow-x-auto">
                    {dias.map(dia => (
                      <button key={dia.id} disabled={t.fecha === dia.dateString}
                        onClick={() => { cambiarMia(t.id, { fecha: dia.dateString, dayId: dia.id }); cerrarMiTarea(); }}
                        className={`shrink-0 min-w-[44px] px-1.5 py-1.5 rounded-md font-bold text-xs border leading-tight ${t.fecha === dia.dateString ? 'bg-slate-200 text-slate-500 border-slate-200' : dia.esHoy ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white text-slate-700 border-slate-300'}`}>
                        {dia.id}<br />{dia.numeroDia}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                  <span className="text-xs text-slate-500">✓ Se guarda solo · Solo la ves tú</span>
                  <button onClick={() => quitarMia(t)} className="px-3 py-2 bg-white text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-50 text-sm">🗑️ Quitar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AÑADIR TAREAS A UN DÍA: finca → tarea (se pueden añadir varias) */}
      {nuevoDia && (() => {
        const fincaSel = nuevoFincaId ? getFincaData(nuevoFincaId) : null;
        const tareasFinca = nuevoFincaId ? [
          ...(paraMi ? miCatalogo.filter(t => t.fincaId === nuevoFincaId).sort(porUso) : []),
          ...catalog.filter(t => t.fincaId === nuevoFincaId).sort(porUso)
        ] : [];
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setNuevoDia(null)}>
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[85dvh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-3 border-b">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Añadir tarea al</div>
                  <h3 className="font-bold text-lg text-slate-800 leading-tight">{nuevoDia.name} {nuevoDia.numeroDia}</h3>
                </div>
                <button onClick={() => setNuevoDia(null)} aria-label="Cerrar" className="text-slate-500 text-2xl leading-none hover:bg-slate-100 w-9 h-9 flex items-center justify-center rounded-full">✕</button>
              </div>
              <button onClick={() => setParaMi(!paraMi)} className={`mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left ${paraMi ? 'border-slate-800 bg-slate-800 text-white' : 'border-dashed border-slate-300 bg-white text-slate-700'}`}>
                <span className={`w-10 h-6 rounded-full relative shrink-0 ${paraMi ? 'bg-emerald-400' : 'bg-slate-300'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${paraMi ? 'left-[18px]' : 'left-0.5'}`}></span></span>
                <span className="text-sm font-bold">👤 Para mí <span className="font-normal text-xs opacity-80">— tarea personal, solo la ves tú</span></span>
              </button>
              <div className="p-3 flex flex-wrap gap-1.5 border-b bg-slate-50">
                {fincas.map(f => {
                  const fd = getFincaData(f.id);
                  return (
                    <button key={f.id} onClick={() => setNuevoFincaId(f.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 ${nuevoFincaId === f.id ? `${fd.handleColor} text-white border-transparent` : `bg-white ${fd.color.split(' ')[1]} text-slate-800`}`}>
                      {fd.name}
                    </button>
                  );
                })}
              </div>
              <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                {!fincaSel && <div className="text-sm text-slate-500 text-center p-4">Elige una finca.</div>}
                {fincaSel && (
                  <form onSubmit={e => { e.preventDefault(); crearYAnadir(fincaSel.id, nuevoDia); }} className="flex gap-1.5 mb-1">
                    <input value={textoNueva} onChange={e => setTextoNueva(e.target.value)} placeholder={paraMi ? '＋ Nueva tarea tuya en esta finca…' : '＋ Nueva tarea en esta finca…'}
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-dashed border-slate-400 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button type="submit" disabled={!textoNueva.trim()} className="px-3 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-40 shrink-0">Crear</button>
                  </form>
                )}
                {fincaSel && tareasFinca.map(t => {
                  const veces = anadidas.filter(id => id === t.id).length;
                  return (
                    <button key={t.id} onClick={() => { if (paraMi) addMiTarea(t, nuevoDia); else addBoardTask(t, nuevoDia); setAnadidas([...anadidas, t.id]); }}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-left ${veces ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <span className={`w-1.5 self-stretch rounded-full shrink-0 ${fincaSel.handleColor}`}></span>
                      <span className="text-sm font-medium text-slate-800 flex-1">{t.mio && <span className="text-xs font-bold text-slate-600 bg-slate-100 px-1.5 rounded mr-1.5">👤</span>}{t.description}</span>
                      {veces > 0 && <span className="text-xs font-bold text-emerald-700 shrink-0">✓ Añadida{veces > 1 ? ` ×${veces}` : ''}</span>}
                      {t.mio && <span role="button" aria-label="Quitar de tu lista" onClick={e => { e.stopPropagation(); borrarDeMiCatalogo(t); }} className="text-slate-500 text-base leading-none px-1.5 shrink-0">✕</span>}
                    </button>
                  );
                })}
                {fincaSel && tareasFinca.length === 0 && <div className="text-sm text-slate-500 text-center p-4">Esta finca no tiene tareas. Escribe una arriba y pulsa «Crear».</div>}
              </div>
              <div className="p-3 border-t">
                <button onClick={() => setNuevoDia(null)} className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold text-sm">
                  {anadidas.length ? `Listo (${anadidas.length} añadida${anadidas.length > 1 ? 's' : ''})` : 'Cerrar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MENÚ TÁCTIL CATÁLOGO */}
      {touchMenu && (() => {
        const finca = getFincaData(touchMenu.item.fincaId);
        return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setTouchMenu(null)}>
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-base text-slate-800">Mover a la pizarra...</h3>
              <button aria-label="Cerrar" onClick={() => setTouchMenu(null)} className="p-1 bg-slate-100 rounded-full w-9 h-9 flex items-center justify-center">✕</button>
            </div>
            <div className={`mb-3 p-2 rounded border flex gap-2 items-center ${finca.color.replace('-100', '-50')}`}>
              <span className={`w-1.5 self-stretch rounded-full shrink-0 ${finca.handleColor}`}></span>
              <span className="font-medium text-sm text-slate-800">{touchMenu.item.description}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {dias.map(dia => (
                <button key={dia.id} onClick={() => { addBoardTask(touchMenu.item, dia); setTouchMenu(null); }} className={`py-2 rounded-lg font-bold border text-sm leading-tight ${dia.esHoy ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-emerald-50'}`}>
                  {dia.id} {dia.numeroDia}{dia.esHoy && <span className="block text-xs font-semibold">hoy</span>}
                </button>
              ))}
              {(() => { const hoy = dias.find(d => d.esHoy); return hoy && (
                <button onClick={() => { addMiTarea(touchMenu.item, hoy); setTouchMenu(null); }} className="py-2 rounded-lg font-bold border-2 border-dashed border-slate-400 bg-white text-slate-800 text-sm leading-tight hover:bg-slate-50">
                  👤 Mía<span className="block text-xs font-semibold text-slate-500">hoy</span>
                </button>
              ); })()}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
              <button onClick={() => { setEditingCatalogTask(touchMenu.item); setTouchMenu(null); }} className="flex-1 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">✏️ Editar</button>
              <button onClick={async () => { if (await deleteCatalogTask(touchMenu.item.id)) setTouchMenu(null); }} className="flex-1 py-2 rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50">🗑️ Borrar</button>
            </div>
          </div>
        </div>
      )})()}

      {apaisado && hoyStr && <CalendarioSemana boardTasks={boardTasks} historyTasks={historyTasks} fincas={fincas} hoyStr={hoyStr} user={user} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
  
