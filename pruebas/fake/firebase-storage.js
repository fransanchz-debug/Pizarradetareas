const guardadas = {};
export const getStorage = () => ({});
export const ref = (s, ruta) => ({ ruta });
export const uploadBytes = async (r, blob, meta) => { (window.__subidas = window.__subidas || []).push({ ruta: r.ruta, kb: Math.round(blob.size / 1024), tipo: meta.contentType }); guardadas[r.ruta] = blob; };
export const getDownloadURL = async (r) => URL.createObjectURL(guardadas[r.ruta]);
