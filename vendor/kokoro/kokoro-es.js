// Voz natural gratis en el navegador: Kokoro-82M (Apache-2.0) en español, sin llaves ni cuentas.
// Incluye un lector de español (texto → fonemas IPA) hecho para pronunciar bien acentos, ñ, ll, etc.
const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/esm/ort.min.js';
const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
const HF = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/';
const MODEL_URL = HF + 'onnx/model_quantized.onnx';
const VOICE_URL = (v) => HF + 'voices/' + v + '.bin';
const VOCAB = {";": 1, ":": 2, ",": 3, ".": 4, "!": 5, "?": 6, "—": 9, "…": 10, "\"": 11, "(": 12, ")": 13, "“": 14, "”": 15, " ": 16, "̃": 17, "ʣ": 18, "ʥ": 19, "ʦ": 20, "ʨ": 21, "ᵝ": 22, "ꭧ": 23, "A": 24, "I": 25, "O": 31, "Q": 33, "S": 35, "T": 36, "W": 39, "Y": 41, "ᵊ": 42, "a": 43, "b": 44, "c": 45, "d": 46, "e": 47, "f": 48, "h": 50, "i": 51, "j": 52, "k": 53, "l": 54, "m": 55, "n": 56, "o": 57, "p": 58, "q": 59, "r": 60, "s": 61, "t": 62, "u": 63, "v": 64, "w": 65, "x": 66, "y": 67, "z": 68, "ɑ": 69, "ɐ": 70, "ɒ": 71, "æ": 72, "β": 75, "ɔ": 76, "ɕ": 77, "ç": 78, "ɖ": 80, "ð": 81, "ʤ": 82, "ə": 83, "ɚ": 85, "ɛ": 86, "ɜ": 87, "ɟ": 90, "ɡ": 92, "ɥ": 99, "ɨ": 101, "ɪ": 102, "ʝ": 103, "ɯ": 110, "ɰ": 111, "ŋ": 112, "ɳ": 113, "ɲ": 114, "ɴ": 115, "ø": 116, "ɸ": 118, "θ": 119, "œ": 120, "ɹ": 123, "ɾ": 125, "ɻ": 126, "ʁ": 128, "ɽ": 129, "ʂ": 130, "ʃ": 131, "ʈ": 132, "ʧ": 133, "ʊ": 135, "ʋ": 136, "ʌ": 138, "ɣ": 139, "ɤ": 140, "χ": 142, "ʎ": 143, "ʒ": 147, "ʔ": 148, "ˈ": 156, "ˌ": 157, "ː": 158, "ʰ": 162, "ʲ": 164, "↓": 169, "→": 171, "↗": 172, "↘": 173, "ᵻ": 177};

// ── Números a palabras (lo básico para reels: horas, años, precios) ──
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
export function normalize(t) {
  return String(t || '')
    .replace(/@\S+/g, ' ')
    .replace(/(\d+)\s*%/g, (m, a) => num(+a) + ' por ciento')
    .replace(/\\$\s*(\d+)/g, (m, a) => num(+a) + ' pesos')
    .replace(/\b(\d+)\s*h\b/gi, (m, a) => num(+a) + ' horas')
    .replace(/\d+/g, (m) => num(+m))
    .replace(/[#*_~\[\]{}<>|]/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}

// ── Español (México) → IPA, al estilo que Kokoro aprendió (espeak) ──
const UNSTRESSED = new Set('si a al de del el la las lo los le les me te se nos y e o u en con por para sin que mi mis tu tus su sus un una unos unas es'.split(' '));
const VOW = 'aeiouáéíóúü';
function isV(c) { return VOW.includes(c); }
function wordIPA(w, prevEnds) {
  // prevEnds: '' (inicio de frase) o último sonido de la palabra anterior
  const acc = /[áéíóú]/.test(w);
  const out = []; // {p, v(bool), strong, acc}
  let i = 0;
  const L = w.length;
  const at = (k) => w[k] || '';
  while (i < L) {
    const c = w[i], n = at(i + 1), n2 = at(i + 2);
    const push = (p, extra) => out.push(Object.assign({ p }, extra || {}));
    if (isV(c)) {
      const base = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u' }[c] || c;
      push(base, { v: true, strong: 'aeo'.includes(base), acc: 'áéíóú'.includes(c) });
      i++; continue;
    }
    if (c === 'c' && n === 'h') { push('ʧ'); i += 2; continue; }
    if (c === 'l' && n === 'l') { push('ʝ'); i += 2; continue; }
    if (c === 'r' && n === 'r') { push('r'); i += 2; continue; }
    if (c === 'q' && n === 'u') { push('k'); i += 2; continue; }
    if (c === 'g' && n === 'u' && 'eéií'.includes(n2)) { push('G'); i += 2; continue; }
    if (c === 'g' && n === 'ü') { push('G'); i += 1; continue; }
    if (c === 'c') { push('eéií'.includes(n) ? 's' : 'k'); i++; continue; }
    if (c === 'g') { push('eéií'.includes(n) ? 'x' : 'G'); i++; continue; }
    if (c === 'z') { push('s'); i++; continue; }
    if (c === 'j') { push('x'); i++; continue; }
    if (c === 'ñ') { push('ɲ'); i++; continue; }
    if (c === 'h') { i++; continue; }
    if (c === 'v' || c === 'b') { push('B'); i++; continue; }
    if (c === 'd') { push('D'); i++; continue; }
    if (c === 'y') {
      if (i === L - 1 || !isV(n)) push('i', { v: true, strong: false, acc: false, yv: true }); else push('ʝ');
      i++; continue;
    }
    if (c === 'x') { if (/^m[eé]xic|^oax|^xal/.test(w)) push('x'); else { push('k'); push('s'); } i++; continue; }
    if (c === 'r') { push(i === 0 || 'nls'.includes(w[i - 1]) ? 'r' : 'ɾ'); i++; continue; }
    if (c === 'w') { push('w'); i++; continue; }
    if ('ptkfslmnñ'.includes(c)) { push(c); i++; continue; }
    i++;
  }
  // núcleos silábicos: i/u débiles sin acento junto a otra vocal → semivocal j/w
  for (let k = 0; k < out.length; k++) {
    const s = out[k];
    if (!s.v || s.strong || s.acc) continue;
    const pv = out[k - 1], nv = out[k + 1];
    if (pv && pv.semi && !(nv && nv.v)) continue; // «ciudad»: la u es el núcleo
    if ((nv && nv.v) || (pv && pv.v && !s.yv)) {
      if (nv && nv.v && !nv.strong && !nv.acc && !(pv && pv.v)) { // iu / ui → la segunda es núcleo
        s.semi = true; continue;
      }
      if ((nv && nv.v) || (pv && pv.v)) s.semi = true;
    }
  }
  // grupos de vocales (sílabas)
  const nuclei = [];
  for (let k = 0; k < out.length; k++) {
    if (!out[k].v || out[k].semi) continue;
    if (nuclei.length && out[k - 1] && out[k - 1].v && !out[k - 1].semi && !out[k].strong && !out[k].acc) continue;
    nuclei.push(k);
  }
  // acento
  let st = -1;
  if (acc) st = out.findIndex((s) => s.acc);
  else if (nuclei.length && !UNSTRESSED.has(w)) {
    const last = w[w.length - 1];
    const idx = (isV(last) || 'ns'.includes(last)) && nuclei.length > 1 ? nuclei.length - 2 : nuclei.length - 1;
    st = nuclei[idx];
  }
  // alófonos b/d/g y armado
  let s = '', prev = prevEnds;
  out.forEach((x, k) => {
    let p = x.p;
    if (x.semi) p = (x.p === 'u') ? 'w' : 'j';
    if (p === 'B' || p === 'D' || p === 'G') {
      const after = prev;
      const stop = !after || after === 'm' || after === 'n' || after === 'ɲ' || (p === 'D' && after === 'l');
      p = p === 'B' ? (stop ? 'b' : 'β') : p === 'D' ? (stop ? 'd' : 'ð') : (stop ? 'ɡ' : 'ɣ');
    }
    if (k === st) s += 'ˈ';
    s += p; prev = p;
  });
  return { ipa: s, last: prev };
}
export function phonemize(text) {
  const t = normalize(text).toLowerCase().replace(/[¿¡"“”«»()]/g, '').replace(/[;:]/g, ',');
  let res = '', prev = '';
  const parts = t.match(/[a-záéíóúüñ]+|[.,!?…]+|\s+/g) || [];
  parts.forEach((p) => {
    if (/^\s+$/.test(p)) { res += ' '; return; }
    if (/^[.,!?…]+$/.test(p)) { res = res.replace(/\s+$/, '') + p[0] + ' '; prev = ''; return; }
    const w = wordIPA(p, prev); res += w.ipa; prev = w.last;
  });
  return res.replace(/\s+/g, ' ').trim();
}
export function tokenize(ipa) {
  const ids = [];
  for (const ch of ipa) { const id = VOCAB[ch]; if (id != null) ids.push(id); }
  return ids;
}

// ── Descarga con caché (solo la primera vez) ──
async function cached(url, onp, label) {
  let cache = null;
  try { cache = await caches.open('inkbot-voz-v1'); const hit = await cache.match(url); if (hit) return await hit.arrayBuffer(); } catch (e) {}
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo descargar la voz (' + r.status + ')');
  const total = +r.headers.get('content-length') || 0;
  let buf;
  if (r.body && total && onp) {
    const rd = r.body.getReader(), chunks = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; onp(label + ' · ' + Math.round(got / total * 100) + '%'); }
    const u = new Uint8Array(got); let o = 0; chunks.forEach((c) => { u.set(c, o); o += c.length; }); buf = u.buffer;
  } else buf = await r.arrayBuffer();
  try { if (cache) await cache.put(url, new Response(buf.slice(0), { headers: { 'Content-Type': 'application/octet-stream' } })); } catch (e) {}
  return buf;
}
let sessP = null, ortMod = null;
const voices = {};
export async function load(onp) {
  if (sessP) return sessP;
  sessP = (async () => {
    ortMod = await import(ORT_URL);
    ortMod.env.wasm.wasmPaths = ORT_WASM;
    ortMod.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    const bytes = await cached(MODEL_URL, onp, 'Descargando la voz natural (solo la primera vez)');
    if (onp) onp('Preparando la voz natural…');
    return ortMod.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
  })().catch((e) => { sessP = null; throw e; });
  return sessP;
}
async function voice(v, onp) {
  if (!voices[v]) voices[v] = cached(VOICE_URL(v), onp, 'Descargando la voz').then((b) => new Float32Array(b));
  return voices[v];
}
// texto → audio (Float32Array a 24 kHz)
export async function speak(text, opt) {
  opt = opt || {};
  const ses = await load(opt.onProgress), st = await voice(opt.voice || 'em_alex', opt.onProgress);
  let ids = tokenize(phonemize(text));
  if (ids.length > 500) ids = ids.slice(0, 500);
  const toks = [0].concat(ids, [0]);
  const row = Math.min(Math.max(toks.length - 2, 0), 509) * 256, style = st.slice(row, row + 256);
  const names = ses.inputNames, feeds = {};
  feeds[names.find((n) => /tok|input/.test(n)) || names[0]] = new ortMod.Tensor('int64', BigInt64Array.from(toks.map(BigInt)), [1, toks.length]);
  feeds[names.find((n) => /style/.test(n)) || names[1]] = new ortMod.Tensor('float32', style, [1, 256]);
  feeds[names.find((n) => /speed/.test(n)) || names[2]] = new ortMod.Tensor('float32', new Float32Array([opt.speed || 1]), [1]);
  const out = await ses.run(feeds);
  return { pcm: out[ses.outputNames[0]].data, rate: 24000 };
}
