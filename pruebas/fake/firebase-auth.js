const user = { uid: 'seq3CISgWIdOMnRGH2QAXvSHDyw1', email: 'fran@example.com', isAnonymous: false };
export const getAuth = () => ({});
export const onAuthStateChanged = (a, cb) => { setTimeout(() => cb(window.__SIN_LOGIN ? null : user), 50); return () => {}; };
export const signInWithEmailAndPassword = async () => {};
export const sendPasswordResetEmail = async () => {};
export const signOut = async () => {};
export const signInAnonymously = async () => {};
