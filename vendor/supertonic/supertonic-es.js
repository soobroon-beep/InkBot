// Voz natural gratis en el navegador: Supertonic 3 (Supertone, licencia MIT del código / OpenRAIL-M del modelo)
// Corre en el celular con ONNX Runtime Web. Modelo int8 (exportado por sherpa-onnx) servido desde la misma página.
const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.mjs';
const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
const BASE = new URL('../../voz/st3/', import.meta.url).href;
const FILES = {
  dp: ['duration_predictor.int8.onnx'],
  te: ['text_encoder.int8.onnx.part0', 'text_encoder.int8.onnx.part1'],
  ve: ['vector_estimator.int8.onnx.part0', 'vector_estimator.int8.onnx.part1', 'vector_estimator.int8.onnx.part2', 'vector_estimator.int8.onnx.part3'],
  vo: ['vocoder.int8.onnx.part0', 'vocoder.int8.onnx.part1']
};
const CACHE = 'inkbot-voz-st3-v1';
// voces de voice.bin: 0-4 = femeninas, 5-9 = masculinas
export const VOICES = { mujer: 1, hombre: 9 };

// ── números a palabras ──
const U = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
const D = ['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const C = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
function num(n) {
  n = Math.floor(n);
  if (n < 30) return U[n];
  if (n < 100) return D[Math.floor(n / 10)] + (n % 10 ? ' y ' + U[n % 10] : '');
  if (n === 100) return 'cien';
  if (n < 1000) return C[Math.floor(n / 100)] + (n % 100 ? ' ' + num(n % 100) : '');
  if (n < 2000) return 'mil' + (n % 1000 ? ' ' + num(n % 1000) : '');
  if (n < 1e6) return num(Math.floor(n / 1000)) + ' mil' + (n % 1000 ? ' ' + num(n % 1000) : '');
  return String(n);
}
export function prepare(text) {
  let t = String(text || '')
    .replace(/@\S+/g, ' ')
    .replace(/(\d+)\s*%/g, (m, a) => num(+a) + ' por ciento')
    .replace(/\$\s*(\d+)/g, (m, a) => num(+a) + ' pesos')
    .replace(/\d+/g, (m) => num(+m))
    .normalize('NFKD')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/gu, '')
    .replace(/[–‑—]/g, '-').replace(/[_\[\]|\/#→←*~]/g, ' ')
    .replace(/[“”]/g, '"').replace(/[‘’´`]/g, "'")
    .replace(/[♥☆♡©\\]/g, '')
    .replace(/ ([,.!?;:'])/g, '$1')
    .replace(/\s+/g, ' ').trim();
  if (t && !/[.!?;:,'")\]}…»]$/.test(t)) t += '.';
  return '<es>' + t + '</es>';
}

let ort = null, sesP = null, indexer = null, voiceBuf = null, cfg = null;
async function getBytes(name, onp, label, done, total) {
  let cache = null;
  const url = BASE + name;
  try { cache = await caches.open(CACHE); const hit = await cache.match(url); if (hit) return new Uint8Array(await hit.arrayBuffer()); } catch (e) {}
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo descargar la voz (' + r.status + ')');
  let u;
  if (r.body && onp) {
    const rd = r.body.getReader(), chunks = []; let got = 0;
    for (;;) { const { done: d, value } = await rd.read(); if (d) break; chunks.push(value); got += value.length; onp(label + ' · ' + Math.min(99, Math.round((done + got) / total * 100)) + '%'); }
    u = new Uint8Array(got); let o = 0; for (const c of chunks) { u.set(c, o); o += c.length; }
  } else u = new Uint8Array(await r.arrayBuffer());
  try { if (cache) await cache.put(url, new Response(u.slice(0), { headers: { 'Content-Type': 'application/octet-stream' } })); } catch (e) {}
  return u;
}
const SIZES = { 'duration_predictor.int8.onnx': 3700147, 'text_encoder.int8.onnx.part0': 24e6, 'text_encoder.int8.onnx.part1': 12416150, 'vector_estimator.int8.onnx.part0': 24e6, 'vector_estimator.int8.onnx.part1': 24e6, 'vector_estimator.int8.onnx.part2': 24e6, 'vector_estimator.int8.onnx.part3': 6400833, 'vocoder.int8.onnx.part0': 24e6, 'vocoder.int8.onnx.part1': 1991073 };
export function load(onp) {
  if (sesP) return sesP;
  sesP = (async () => {
    ort = await import(ORT_URL);
    ort.env.wasm.wasmPaths = ORT_WASM;
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    const label = 'Descargando la voz natural (solo la primera vez)';
    const total = Object.values(SIZES).reduce((a, b) => a + b, 0);
    let done = 0;
    async function model(key) {
      const parts = [];
      for (const n of FILES[key]) { parts.push(await getBytes(n, onp, label, done, total)); done += SIZES[n] || 0; }
      const len = parts.reduce((a, p) => a + p.length, 0), all = new Uint8Array(len); let o = 0;
      for (const p of parts) { all.set(p, o); o += p.length; }
      return all;
    }
    const [cfgR, idx, vb] = await Promise.all([fetch(BASE + 'tts.json'), fetch(BASE + 'unicode_indexer.bin'), fetch(BASE + 'voice.bin')]);
    cfg = await cfgR.json(); indexer = new Int32Array(await idx.arrayBuffer()); voiceBuf = await vb.arrayBuffer();
    const opt = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
    const dp = await ort.InferenceSession.create(await model('dp'), opt);
    const te = await ort.InferenceSession.create(await model('te'), opt);
    const ve = await ort.InferenceSession.create(await model('ve'), opt);
    const vo = await ort.InferenceSession.create(await model('vo'), opt);
    if (onp) onp('Voz lista');
    return { dp, te, ve, vo };
  })().catch((e) => { sesP = null; throw e; });
  return sesP;
}
function style(sid) {
  // voice.bin: cabecera int64 [n,50,256,n,8,16] y luego ttl[n,50,256] + dp[n,8,16]
  const h = Array.from(new BigInt64Array(voiceBuf, 0, 6), Number), n = h[0], ttlN = h[1] * h[2], dpN = h[4] * h[5];
  const f = new Float32Array(voiceBuf, 48), s = Math.min(sid, n - 1);
  return {
    ttl: new ort.Tensor('float32', f.slice(s * ttlN, (s + 1) * ttlN), [1, h[1], h[2]]),
    dp: new ort.Tensor('float32', f.slice(n * ttlN + s * dpN, n * ttlN + (s + 1) * dpN), [1, h[4], h[5]])
  };
}
function gauss() { const u1 = Math.max(1e-4, Math.random()), u2 = Math.random(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
// texto → { pcm: Float32Array, rate }
export async function speak(text, opt) {
  opt = opt || {};
  const S = await load(opt.onProgress), st = style(opt.sid != null ? opt.sid : VOICES.hombre);
  const t = prepare(text), ids = [];
  for (const ch of t) { const cp = ch.codePointAt(0); ids.push(cp < indexer.length ? indexer[cp] : -1); }
  const L = ids.length;
  const textIds = new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, L]);
  const textMask = new ort.Tensor('float32', new Float32Array(L).fill(1), [1, 1, L]);
  const dur = (await S.dp.run({ text_ids: textIds, style_dp: st.dp, text_mask: textMask })).duration.data[0] / (opt.speed || 1.05);
  const emb = (await S.te.run({ text_ids: textIds, style_ttl: st.ttl, text_mask: textMask })).text_emb;
  const sr = cfg.ae.sample_rate, chunk = cfg.ae.base_chunk_size * cfg.ttl.chunk_compress_factor, ld = cfg.ttl.latent_dim * cfg.ttl.chunk_compress_factor;
  const wavLen = Math.floor(dur * sr), lat = Math.max(1, Math.ceil(wavLen / chunk));
  let xt = new Float32Array(ld * lat); for (let i = 0; i < xt.length; i++) xt[i] = gauss();
  const latMask = new ort.Tensor('float32', new Float32Array(lat).fill(1), [1, 1, lat]);
  const steps = opt.steps || 6, total = new ort.Tensor('float32', new Float32Array([steps]), [1]);
  for (let s = 0; s < steps; s++) {
    if (opt.onStep) opt.onStep(s + 1, steps);
    const out = await S.ve.run({ noisy_latent: new ort.Tensor('float32', xt, [1, ld, lat]), text_emb: emb, style_ttl: st.ttl, latent_mask: latMask, text_mask: textMask,
      current_step: new ort.Tensor('float32', new Float32Array([s]), [1]), total_step: total });
    xt = out.denoised_latent.data;
  }
  const wav = (await S.vo.run({ latent: new ort.Tensor('float32', xt, [1, ld, lat]) })).wav_tts.data;
  return { pcm: wav.slice(0, Math.min(wav.length, wavLen)), rate: sr };
}
