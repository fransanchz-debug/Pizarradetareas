const { useState, useEffect } = React;

// --- IDENTIFICADOR DE LA PIZARRA ---
const APP_ID = "ecologicos-almeria-v1"; 

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
        <h1 className="text-xl font-bold text-slate-800 text-center">Tareas de Hoy</h1>
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

// ===== AVISOS DE «TAREAS LISTAS» EN ESTE APARATO =====
const VAPID_PUBLICA = "BAh47kyd20EM3ia-K5WnVTT6xlRLoI4lHCJbq744AtAK9iVGoHX8Xm8F-BoR59JJLFu_xXLziz-7Y3jxXKGSN6E";
const clavePush = (b64) => {
  const raw = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const appInstalada = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

function AvisosEspejo({ user, miAviso }) {
  const [estado, setEstado] = useState('cargando'); // cargando | activo | inactivo | instalar | denegado | noSoportado
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setEstado(esIOS() && !appInstalada() ? 'instalar' : 'noSoportado'); return; }
      if (Notification.permission === 'denied') { setEstado('denegado'); return; }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg && await reg.pushManager.getSubscription();
        setEstado(sub && ((miAviso && miAviso.subs) || []).some(x => x.endpoint === sub.endpoint) ? 'activo' : (esIOS() && !appInstalada() ? 'instalar' : 'inactivo'));
      } catch (e) { setEstado('inactivo'); }
    })();
  }, [miAviso]);
  const activar = async () => {
    setOcupado(true); setError(null);
    try {
      const permiso = await Notification.requestPermission(); // debe ser lo primero: el iPhone lo exige al tocar el botón
      if (permiso !== 'granted') { setEstado(permiso === 'denied' ? 'denegado' : 'inactivo'); return; }
      const reg = await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clavePush(VAPID_PUBLICA) });
      const j = sub.toJSON();
      const otras = ((miAviso && miAviso.subs) || []).filter(x => x.endpoint !== j.endpoint);
      const aparato = esIOS() ? 'iPhone/iPad' : /android/i.test(navigator.userAgent) ? 'Android' : 'Ordenador';
      const { db, setDoc, doc } = window.FirebaseAPI;
      await setDoc(doc(db, 'artifacts', APP_ID, 'avisos', user.uid), { subs: [...otras, { endpoint: j.endpoint, keys: j.keys, creada: Date.now(), confirmada: false, aparato }] }, { merge: true });
      setEstado('activo');
    } catch (e) { console.error('Error al activar las notificaciones:', e); setError('No se han podido activar. Comprueba la conexión y vuelve a intentarlo.'); }
    finally { setOcupado(false); }
  };
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm space-y-2">
      <div className="font-bold text-slate-800">🔔 Avisos de las tareas</div>
      {estado === 'cargando' && <p className="text-sm text-slate-500">Comprobando…</p>}
      {estado === 'activo' && <>
        <p className="text-sm text-emerald-700 font-bold">✅ Activados. Te avisaremos cuando las tareas estén listas o cambien.</p>
        {((miAviso && miAviso.subs) || []).some(x => !x.confirmada) && <p className="text-sm text-amber-700">⏳ En un par de minutos te llegará un aviso de confirmación.</p>}
      </>}
      {estado === 'inactivo' && <>
        <p className="text-sm text-slate-600">Para enterarte cuando estén listas las tareas o cambien.</p>
        <button onClick={activar} disabled={ocupado} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg text-base">{ocupado ? 'Activando…' : 'Activar avisos'}</button>
      </>}
      {estado === 'instalar' && <p className="text-sm text-slate-700">En el iPhone, primero pon la app en la pantalla de inicio (arriba) y ábrela desde el icono. Después vuelve aquí y pulsa «Activar avisos».</p>}
      {estado === 'denegado' && <p className="text-sm text-slate-700">Los avisos están bloqueados. Actívalos en el móvil: <b>iPhone</b> → Ajustes → Notificaciones → esta app. <b>Android</b> → mantén pulsado el icono → Información → Notificaciones.</p>}
      {estado === 'noSoportado' && <p className="text-sm text-slate-700">Este navegador no admite avisos. Prueba con Safari (iPhone) o Chrome (Android) y la app en la pantalla de inicio.</p>}
      {error && <p className="text-sm text-red-700 font-semibold">{error}</p>}
    </div>
  );
}
// ===== FIN AVISOS =====

function App() {
  const [user, setUser] = useState(null);
  const [fincas, setFincas] = useState([]);
  const [boardTasks, setBoardTasks] = useState([]);
  const [workers, setWorkers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [diaHoy, setDiaHoy] = useState(null);
  const [vista, setVista] = useState('hoy'); // 'hoy' o 'manana'
  const [verInstalar, setVerInstalar] = useState(false);
  const [publicados, setPublicados] = useState({}); // fecha -> {publicadoEn, cambios, quitadas...}; sin documento = día sin publicar
  const [publicadosListos, setPublicadosListos] = useState({});
  const [miAviso, setMiAviso] = useState(null);

  
  const [viewTaskMenu, setViewTaskMenu] = useState(null);
  const [visor, setVisor] = useState(null); // { fotos, indice }
  const [fbLoaded, setFbLoaded] = useState(!!window.FirebaseAPI);
  
  useEffect(() => {
    if (window.FirebaseAPI) setFbLoaded(true);
    else {
      const handleLoad = () => setFbLoaded(true);
      window.addEventListener('firebase-modules-loaded', handleLoad);
      return () => window.removeEventListener('firebase-modules-loaded', handleLoad);
    }
  }, []);

  // LÓGICA DE DETECCIÓN DEL DÍA DE HOY
  useEffect(() => {
    const calculateToday = () => {
      const today = new Date();
      let currentDayOfWeek = today.getDay();
      if (currentDayOfWeek === 0) currentDayOfWeek = 7; // Domingo es 7

      const diasBase = [
        { id: 'L', name: 'Lunes', index: 1 }, { id: 'M', name: 'Martes', index: 2 },
        { id: 'X', name: 'Miércoles', index: 3 }, { id: 'J', name: 'Jueves', index: 4 },
        { id: 'V', name: 'Viernes', index: 5 }, { id: 'S', name: 'Sábado', index: 6 },
        { id: 'D', name: 'Domingo', index: 7 }
      ];

      const fecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hoy = diasBase.find(d => d.index === currentDayOfWeek);
      const manana = new Date(today); manana.setDate(today.getDate() + 1);
      const idxManana = currentDayOfWeek === 7 ? 1 : currentDayOfWeek + 1;
      setDiaHoy({
        hoy: { ...hoy, numeroDia: today.getDate(), fecha: fecha(today) },
        manana: { ...diasBase.find(d => d.index === idxManana), numeroDia: manana.getDate(), fecha: fecha(manana) },
      });
    };

    calculateToday();
    const interval = setInterval(calculateToday, 3600000); // Revisa cada hora
    return () => clearInterval(interval);
  }, []);

  // AUTENTICACIÓN
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

  // CARGA DE DATOS EN TIEMPO REAL
  useEffect(() => {
    if (!user || !window.FirebaseAPI) return;
    setLoading(true);

    const { db, collection, query, onSnapshot } = window.FirebaseAPI;

    const unsubFincas = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'fincas')), (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
      setFincas(items.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt));
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
    const unsubMiAviso = onSnapshot(doc(db, 'artifacts', APP_ID, 'avisos', user.uid), (snap) => setMiAviso(snap.exists() ? snap.data() : null), () => {});

    return () => { unsubFincas(); unsubBoard(); unsubWorkers(); unsubMiAviso(); };
  }, [user]);

  // Qué días ha publicado Fran (y qué ha cambiado desde entonces)
  const fechaHoy = diaHoy && diaHoy.hoy.fecha, fechaManana = diaHoy && diaHoy.manana.fecha;
  useEffect(() => {
    if (!user || !window.FirebaseAPI || !fechaHoy) return;
    const { db, doc, onSnapshot } = window.FirebaseAPI;
    const bajas = [fechaHoy, fechaManana].map(f => onSnapshot(doc(db, 'artifacts', APP_ID, 'publicados', f), (snap) => {
      setPublicados(p => ({ ...p, [f]: snap.exists() ? snap.data() : null }));
      setPublicadosListos(p => ({ ...p, [f]: true }));
    }, () => setPublicadosListos(p => ({ ...p, [f]: true }))));
    return () => bajas.forEach(b => b());
  }, [user, fechaHoy, fechaManana]);

  // Mismo patrón de nombres que la pizarra («Finca 1y2» → «Finca 1 y 2», etiqueta «F1-2»)
  const nombreFinca = (n) => (n || '?').replace(/\s*y\s*/gi, ' y ').replace(/\s+/g, ' ').trim();
  const getFincaData = (fincaId) => { const f = fincas.find(f => f.id === fincaId); return f ? { ...f, name: nombreFinca(f.name) } : { name: '?', color: 'bg-gray-100 border-gray-400', handleColor: 'bg-gray-400' }; };
  const getFincaTag = (fincaName) => 'F' + nombreFinca(fincaName).replace(/^finca\s*/i, '').replace(/ y /g, '-').replace(/\s+/g, '');

  if (!user && !loading) return <LoginScreen />;
  if (loading) return <div className="flex items-center justify-center h-[100dvh] bg-slate-50 font-bold text-slate-500 text-xl">⏳ Cargando Tareas...</div>;

  // Tareas del día elegido (hoy o mañana), por fecha
  const dia = diaHoy ? diaHoy[vista] : null;
  const tareasDelDia = dia ? boardTasks.filter(t => (t.targetDateStr || t.dateString) ? (t.targetDateStr || t.dateString) === dia.fecha : t.dayId === dia.id).sort((a, b) => (a.order || 0) - (b.order || 0)) : [];

  const pub = dia ? publicados[dia.fecha] : null;
  const diaPublicado = !!pub;
  const cambiosDia = (pub && pub.cambios) || {};
  const quitadasDia = (pub && pub.quitadas) || [];
  const horaDe = (ms) => new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-100">
      
      {/* CABECERA (Lectura - Tareas de Hoy) */}
      <header className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center shrink-0 z-20 relative">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {[['hoy', 'Hoy'], ['manana', 'Mañana']].map(([v, texto]) => (
            <button key={v} onClick={() => setVista(v)}
              className={`px-4 py-1.5 rounded-lg text-base font-bold ${vista === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
              {texto}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
        <button onClick={() => setVerInstalar(true)} className="bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg text-sm text-slate-700" title="Poner la app en la pantalla del móvil y activar los avisos">📲</button>
        <button onClick={() => { if (confirm('¿Cerrar sesión en este dispositivo?')) window.FirebaseAPI.signOut(window.FirebaseAPI.auth); }} className="bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg text-sm text-slate-700" title="Cerrar sesión">
          🚪
        </button>
        </div>
      </header>
      {verInstalar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setVerInstalar(false)}>
          <div className="bg-slate-50 rounded-xl p-3 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <InstalarApp />
            <AvisosEspejo user={user} miAviso={miAviso} />
            <button onClick={() => setVerInstalar(false)} className="w-full bg-slate-200 hover:bg-slate-300 font-bold py-2 rounded-lg">Cerrar</button>
          </div>
        </div>
      )}

      {/* TABLERO CENTRAL ÚNICO (Ocupa el 100% de la pantalla para ver solo hoy) */}
      <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-100">
        {dia && (
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl flex flex-col h-full shadow-lg overflow-hidden">
            
            {/* Cabecera gigante del Día Actual */}
            <div className={`border-b p-4 text-center sticky top-0 z-10 shadow-sm ${vista === 'hoy' ? 'border-emerald-200 bg-emerald-100' : 'border-blue-200 bg-blue-100'}`}>
              <span className="font-black text-3xl text-slate-800">
                {dia.name} <span className={vista === 'hoy' ? 'text-emerald-700' : 'text-blue-700'}>{dia.numeroDia}</span>
              </span>
              <div className={`text-sm font-bold mt-1 uppercase tracking-widest ${vista === 'hoy' ? 'text-emerald-800' : 'text-blue-800'}`}>
                {vista === 'hoy' ? 'Jornada en curso' : 'Planificación de mañana'}
              </div>
              {diaPublicado && pub.cambiosEn && <div className="text-xs font-bold mt-1 text-amber-800">✏️ Cambios avisados a las {horaDe(pub.cambiosEn)}</div>}
            </div>
            
            {/* Lista de Tareas de Hoy */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto pb-6 bg-slate-50/50">
              {!diaPublicado && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                  <span className="text-4xl mb-3">{publicadosListos[dia.fecha] ? '⏳' : '…'}</span>
                  <span className="text-lg font-bold text-slate-600">{publicadosListos[dia.fecha] ? `Aún no están publicadas las tareas de ${vista === 'hoy' ? 'hoy' : 'mañana'}` : 'Cargando…'}</span>
                  {publicadosListos[dia.fecha] && <span className="text-sm mt-1">Te avisaremos cuando estén listas.</span>}
                </div>
              )}
              {diaPublicado && quitadasDia.length > 0 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-sm text-red-900">
                  <div className="font-black">🗑️ Tareas quitadas:</div>
                  {quitadasDia.map((q, i) => <div key={i} className="line-through">{q}</div>)}
                </div>
              )}
              {diaPublicado && tareasDelDia.map(task => {
                const finca = getFincaData(task.fincaId);
                const hasNotes = task.notes && task.notes.trim().length > 0;
                const taskWorkers = workers.filter(w => (task.workerIds || []).includes(w.id));
                const hasStars = task.stars > 0;
                const fincaEtiqueta = getFincaTag(finca.name);

                return (
                  <div key={task.id} onClick={() => setViewTaskMenu(task)}
                    className={`flex flex-col bg-white border-2 ${finca.color.split(' ')[1]} rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all overflow-hidden active:scale-[0.98]`}
                  >
                    <div className="flex items-stretch min-h-[56px]">
                      <div className={`w-3 ${finca.handleColor} shrink-0`}></div>
                      <div className="p-3 flex-1 flex flex-col justify-center">
                         <div className="flex justify-between items-center mb-1.5">
                           <div className="flex gap-2 items-center">
                             <span className={`text-xs font-black px-2 py-0.5 rounded bg-white border shadow-sm text-slate-700 ${finca.color.split(' ')[1]}`}>{fincaEtiqueta}</span>
                             {cambiosDia[task.id] && <span className={`text-xs font-black px-2 py-0.5 rounded shadow-sm text-white ${cambiosDia[task.id] === 'nueva' ? 'bg-emerald-600' : 'bg-amber-500'}`}>{cambiosDia[task.id] === 'nueva' ? 'NUEVA' : 'CAMBIADA'}</span>}
                           </div>
                           <span className="flex items-center gap-2">
                             {(task.fotos || []).length > 0 && <span className="text-sm font-bold text-slate-600">📷 {task.fotos.length}</span>}
                             {hasStars && <span className="text-2xl drop-shadow-[0_2px_4px_rgba(251,191,36,0.9)]">{`⭐`.repeat(task.stars)}</span>}
                           </span>
                         </div>
                         <span className="text-base font-bold text-slate-800 leading-tight">{task.description}</span>
                      </div>
                    </div>
                    
                    {taskWorkers.length > 0 && (
                      <div className="bg-blue-50/80 border-t border-blue-100 p-2 px-3 flex flex-wrap gap-1.5">
                        {taskWorkers.map(w => (
                          <span key={w.id} className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded shadow-sm">{w.name}</span>
                        ))}
                      </div>
                    )}

                    {hasNotes && (
                      <div className="bg-yellow-50/80 border-t border-yellow-200 p-2 px-3 text-sm font-medium flex gap-2 items-start text-slate-800">
                        <span className="opacity-80 mt-0.5">📝</span> <span className="line-clamp-2 leading-tight">{task.notes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {diaPublicado && tareasDelDia.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                  <span className="text-4xl mb-3">🏖️</span>
                  <span className="text-lg font-bold text-slate-500">No hay tareas asignadas para {vista === 'hoy' ? 'hoy' : 'mañana'}</span>
                  <span className="text-sm">{vista === 'hoy' ? 'Aún no se ha planificado esta jornada.' : 'Todavía no está planificado. Vuelve a mirar más tarde.'}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE SOLO LECTURA PARA VER DETALLES DE LA TAREA */}
      {viewTaskMenu && (() => {
        const finca = getFincaData(viewTaskMenu.fincaId);
        const taskWorkers = workers.filter(w => (viewTaskMenu.workerIds || []).includes(w.id));
        const hasNotes = viewTaskMenu.notes && viewTaskMenu.notes.trim().length > 0;

        return (
          <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewTaskMenu(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden max-h-[92dvh]" onClick={e => e.stopPropagation()}>
              
              {/* Cabecera */}
              <div className={`p-4 text-white ${finca.handleColor} flex justify-between items-start`}>
                <div>
                  <div className="text-xs font-bold opacity-90 mb-1 tracking-wide uppercase">{finca.name} - {viewTaskMenu.dayId}</div>
                  <h3 className="font-black text-xl flex items-start gap-2 leading-tight">
                    <span>{viewTaskMenu.description}</span>
                  </h3>
                </div>
                <button aria-label="Cerrar" onClick={() => setViewTaskMenu(null)} className="text-white text-2xl leading-none bg-black/10 hover:bg-black/20 w-9 h-9 flex items-center justify-center rounded-full transition-colors">✕</button>
              </div>
              
              {/* Cuerpo */}
              <div className="p-5 flex flex-col gap-4 bg-slate-50 overflow-y-auto flex-1">
                
                {/* Estrellas */}
                {viewTaskMenu.stars > 0 && (
                  <div className="bg-white p-3 rounded-lg border shadow-sm flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500 uppercase">Prioridad:</span>
                    <span className="text-2xl drop-shadow-md">{`⭐`.repeat(viewTaskMenu.stars)}</span>
                  </div>
                )}

                {/* Trabajadores (Lista) */}
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-3">👥 Cuadrilla Asignada</span>
                  {taskWorkers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {taskWorkers.map(w => (
                        <div key={w.id} className="bg-blue-100 text-blue-800 border border-border-200 px-3 py-1.5 rounded-md font-bold text-sm shadow-sm flex items-center gap-1.5">
                          👤 {w.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500 italic">No hay trabajadores asignados.</span>
                  )}
                </div>

                {/* Anotaciones */}
                {hasNotes && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 shadow-sm">
                    <span className="block text-xs font-bold text-yellow-700 uppercase mb-2">📝 Anotaciones extra</span>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap font-medium leading-relaxed">{viewTaskMenu.notes}</p>
                  </div>
                )}

                {/* Fotos explicativas */}
                {(viewTaskMenu.fotos || []).length > 0 && (
                  <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <span className="block text-xs font-bold text-slate-600 uppercase mb-2">📷 Fotos de la tarea (toca para ampliar)</span>
                    <div className="grid grid-cols-2 gap-2">
                      {viewTaskMenu.fotos.map((f, i) => (
                        <img key={f.ruta || f.url} src={f.url} alt="" loading="lazy" onClick={() => setVisor({ fotos: viewTaskMenu.fotos, indice: i })} className="w-full h-36 object-cover rounded-lg border cursor-pointer bg-slate-100" />
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
              <div className="p-4 bg-white border-t text-center">
                <button onClick={() => setViewTaskMenu(null)} className="w-full py-3 bg-slate-200 text-slate-700 rounded-lg font-black text-base hover:bg-slate-300 transition-colors shadow-sm">
                  Entendido, Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {visor && <VisorFotos fotos={visor.fotos} indice={visor.indice} onCambiar={(i) => setVisor({ ...visor, indice: i })} onCerrar={() => setVisor(null)} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
  
