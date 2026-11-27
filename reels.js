/* ══════════════════════════════════════════════════════════════════════
   INKBOT · REELS VIRALES
   Sube tus clips y fotos del tatuaje → eliges (o la IA elige) un formato viral
   → sale el reel editado: cortes al ritmo, gancho en el primer segundo,
   voz narrando con subtítulos palabra por palabra, caption, hashtags y día.
   Todo corre en tu celular (WebCodecs → MP4). IA y voz gratis por defecto.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var R = window.REELS = {};
var W = 1080, H = 1920, FPS = 30, SR = 48000;
var LS = { cfg: 'reels-cfg-v1', hist: 'reels-hist-v1', tpl: 'reels-tpl-v1' };
var GOLD = '#E8B64A', RED = '#CC0000', JADE = '#00A86B';

/* ───────────────────────── utilidades ───────────────────────── */
function $(s, el) { return (el || document).querySelector(s); }
function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
function easeInOut(x) { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function pct(arr, p) { if (!arr.length) return 0; var a = arr.slice().sort(function (x, y) { return x - y; }); return a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))]; }
function withTimeout(p, ms, msg) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error(msg || 'Tiempo agotado')); }, ms); })]); }

/* ───────────────────────── configuración ───────────────────────── */
var CFG = Object.assign({
  handle: '@victortip', ciudad: 'Orizaba, Veracruz', estilo: 'neo-japonés',
  voz: 'auto', genero: 'hombre', elevenKey: '', cta: 'Agenda por DM 📩', marca: true
}, lsGet(LS.cfg, {}));
function saveCfg() { lsSet(LS.cfg, CFG); }

/* ───────────────────────── plantillas virales ─────────────────────────
   Cada plantilla es una receta: cómo se reparte el tiempo, a qué ritmo se corta,
   qué tan rápido va el proceso, si lleva voz y qué ganchos funcionan. */
var TPL = {
  revelacion: { name: 'Revelación al beat', emoji: '💥', dur: [12, 20], bpm: 100, voice: false,
    desc: 'Proceso rápido al ritmo y explota el resultado final.',
    hooks: ['Esperen al final 👀', 'De esto… a *esto*', 'Nadie esperaba este resultado', '{horas} horas en {seg} segundos', 'Dime que no es *arte*', 'Así quedó 🔥'] },
  pov: { name: 'POV en texto', emoji: '📱', dur: [14, 24], bpm: 90, voice: false,
    desc: 'Textos tipo POV que cuentan la historia mientras ves el proceso.',
    hooks: ['POV: llegaste por algo *pequeño*', 'POV: confiaste 100% en tu tatuador', 'POV: dijiste "haz lo que quieras"', 'POV: viajaste solo por este *diseño*'] },
  etapas: { name: 'Etapas del proceso', emoji: '🪜', dur: [14, 22], bpm: 96, voice: false,
    desc: 'Plantilla → línea → sombra → color → final, con etiquetas.',
    hooks: ['De plantilla a *obra de arte*', 'Cada etapa de este tatuaje', 'Así se construye un *{estilo}*', 'El proceso completo en segundos'] },
  narrado: { name: 'Proceso narrado', emoji: '🎙️', dur: [25, 60], bpm: 84, voice: true,
    desc: 'Una voz cuenta la historia del tatuaje con subtítulos palabra por palabra.',
    hooks: ['Te cuento cómo hice *este tatuaje*', 'La historia detrás de este *diseño*', 'Esto fue lo más difícil de este tatuaje'] },
  significado: { name: 'Significado del diseño', emoji: '📜', dur: [20, 45], bpm: 88, voice: true,
    desc: 'Dato verídico del símbolo (koi, hannya, dragón…) mientras ves el proceso.',
    hooks: ['¿Sabes qué significa un *koi*?', 'Nadie te dice esto del *hannya*', 'Antes de tatuarte esto, debes saber…'] },
  encuesta: { name: 'Pregunta al público', emoji: '❓', dur: [9, 14], bpm: 110, voice: false,
    desc: 'Corto y rápido; termina con una pregunta para que comenten.',
    hooks: ['¿Del 1 al 10?', '¿Te lo harías?', '¿Rojo o jade?', '¿Qué parte del cuerpo sigue?'] },
  asmr: { name: 'Satisfactorio', emoji: '🤤', dur: [12, 20], bpm: 76, voice: false,
    desc: 'Tomas lentas y nítidas de la aguja y el color. Muy relajante.',
    hooks: ['Satisfactorio 🤤', 'Ese color entrando…', 'Detalles que nadie ve', 'Míralo hasta el final'] },
  marca: { name: 'Marca personal', emoji: '🏮', dur: [20, 45], bpm: 90, voice: true,
    desc: 'Habla de ti: tu estilo, tu ciudad y cómo agendar contigo.',
    hooks: ['Tatuador de {ciudad} haciendo *{estilo}*', 'Años tatuando y esto sigo amando', 'Si eres de Veracruz, esto es para ti'] }
};
var BASES = Object.keys(TPL);
function customTpls() { return lsGet(LS.tpl, []); }
function getTpl(key) {
  if (TPL[key]) return Object.assign({ key: key, base: key }, TPL[key]);
  var c = customTpls().filter(function (t) { return t.id === key; })[0];
  if (!c) return Object.assign({ key: 'revelacion', base: 'revelacion' }, TPL.revelacion);
  var b = TPL[c.base] || TPL.revelacion;
  return Object.assign({}, b, { key: c.id, base: c.base in TPL ? c.base : 'revelacion', name: c.name, emoji: '⭐', desc: c.notes || b.desc,
    hooks: [c.hook].concat(b.hooks).filter(Boolean), voice: c.voice != null ? !!c.voice : b.voice,
    dur: c.seconds ? [Math.max(8, c.seconds - 4), c.seconds + 6] : b.dur, bpm: c.pace === 'rapido' ? b.bpm + 14 : c.pace === 'lento' ? b.bpm - 14 : b.bpm, lines: c.lines || [], custom: true,
    cuts: c.cuts || null, cloneDur: c.dur || 0, hasAudio: !!c.hasAudio, voice: c.cuts ? false : (c.voice != null ? !!c.voice : b.voice) });
}
function fillVars(s, extra) {
  var horas = (extra && extra.horas) || 6;
  return String(s || '').replace(/\{ciudad\}/g, (CFG.ciudad || '').split(',')[0]).replace(/\{estilo\}/g, CFG.estilo || 'tatuaje')
    .replace(/\{horas\}/g, horas).replace(/\{seg\}/g, (extra && extra.seg) || 15);
}

/* ───────────────────────── estado ───────────────────────── */
var S = { clips: [], desc: '', tpl: 'auto', hook: '', hooksAI: [], audio: 'trend', music: null, versions: 1, busy: false, results: [] };
var root = null;

/* ═══════════════════════ 1 · ANÁLISIS DE CLIPS ═══════════════════════
   Muestrea cada video en baja resolución y mide: movimiento, nitidez (para
   descartar tomas borrosas), brillo y el centro del movimiento (para encuadrar). */
function once(el, ev, ms) {
  return new Promise(function (res, rej) {
    var t = setTimeout(function () { cl(); rej(new Error('El video no cargó')); }, ms || 20000);
    function ok() { cl(); res(); } function bad() { cl(); rej(new Error('El navegador no pudo abrir este video')); }
    function cl() { clearTimeout(t); el.removeEventListener(ev, ok); el.removeEventListener('error', bad); }
    el.addEventListener(ev, ok); el.addEventListener('error', bad);
  });
}
function makeVideo(clip) {
  var v = document.createElement('video');
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = clip.url;
  return v;
}
// Abre un video con reintento; libera el reproductor si falla (los celulares tienen pocos decodificadores)
function release(v) { if (!v) return; try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} }
async function openVideo(clip, tries) {
  var last = null;
  for (var i = 0; i < (tries || 3); i++) {
    var v = makeVideo(clip);
    try { await once(v, 'loadeddata', 25000); return v; }
    catch (e) { last = e; release(v); await sleep(400 + i * 600); }
  }
  throw new Error((clip.name ? clip.name + ': ' : '') + (last ? last.message : 'no se pudo abrir'));
}
function seek(v, t) {
  return new Promise(function (res) {
    var target = clamp(t, 0, Math.max(0, (v.duration || 0) - 0.04)), done = false;
    function fin() { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); }
    v.addEventListener('seeked', fin);
    if (Math.abs(v.currentTime - target) < 0.001) { setTimeout(fin, 30); }
    v.currentTime = target; setTimeout(fin, 3000);
  });
}
function loadImage(clip) {
  return new Promise(function (res, rej) {
    var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('No se pudo abrir la foto')); }; im.src = clip.url;
  });
}
function measure(ctx, cw, ch, prev) {
  var d = ctx.getImageData(0, 0, cw, ch).data, n = cw * ch, g = new Float32Array(n), sum = 0;
  for (var i = 0, j = 0; i < n; i++, j += 4) { g[i] = d[j] * .299 + d[j + 1] * .587 + d[j + 2] * .114; sum += g[i]; }
  var sharp = 0, cnt = 0;
  for (var y = 1; y < ch - 1; y++) for (var x = 1; x < cw - 1; x++) { var k = y * cw + x; sharp += Math.abs(4 * g[k] - g[k - 1] - g[k + 1] - g[k - cw] - g[k + cw]); cnt++; }
  var motion = 0, mx = 0, my = 0, mw = 0;
  if (prev) {
    for (var q = 0; q < n; q++) { var df = Math.abs(g[q] - prev[q]); motion += df; if (df > 18) { mx += (q % cw) * df; my += Math.floor(q / cw) * df; mw += df; } }
    motion /= n;
  }
  return { g: g, bright: sum / n, sharp: sharp / Math.max(1, cnt), motion: motion, cx: mw > 0 ? mx / mw / cw : .5, cy: mw > 0 ? my / mw / ch : .5 };
}
async function analyzeClip(clip, onp) {
  if (clip.an) return clip.an;
  var cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
  if (clip.kind === 'image') {
    var im = await loadImage(clip); clip.el = im; clip.w = im.naturalWidth; clip.h = im.naturalHeight;
    cv.width = 72; cv.height = 128; ctx.drawImage(im, 0, 0, 72, 128);
    var m = measure(ctx, 72, 128, null);
    clip.an = { samples: [{ t: 0, motion: 0, sharp: m.sharp, bright: m.bright, cx: .5, cy: .5 }] };
    return clip.an;
  }
  var v = await openVideo(clip);
  clip.dur = v.duration; clip.w = v.videoWidth; clip.h = v.videoHeight;
  if (!isFinite(clip.dur) || clip.dur <= 0) throw new Error('No se pudo leer la duración de ' + clip.name);
  var cw = clip.w >= clip.h ? 128 : 72, ch = clip.w >= clip.h ? 72 : 128; cv.width = cw; cv.height = ch;
  var n = clamp(Math.floor(clip.dur / 0.5), 6, 90), step = clip.dur / n, samples = [], prev = null;
  for (var i = 0; i < n; i++) {
    var t = (i + .5) * step; await seek(v, t);
    ctx.drawImage(v, 0, 0, cw, ch);
    var r = measure(ctx, cw, ch, prev); prev = r.g;
    samples.push({ t: t, motion: r.motion, sharp: r.sharp, bright: r.bright, cx: r.cx, cy: r.cy });
    if (onp && i % 4 === 0) onp(i / n);
  }
  if (samples.length > 1) samples[0].motion = samples[1].motion;
  clip.an = { samples: samples, step: step };
  // Cuadro fijo nítido de respaldo, por si el celular no deja reabrir el video al crear
  try {
    var best = samples.reduce(function (a, x) { return x.sharp > a.sharp ? x : a; }, samples[0]);
    await seek(v, best.t);
    var sc = Math.min(1, 720 / Math.max(clip.w, clip.h)), st = document.createElement('canvas');
    st.width = Math.round(clip.w * sc); st.height = Math.round(clip.h * sc); st.getContext('2d').drawImage(v, 0, 0, st.width, st.height); clip.still = st;
  } catch (e) {}
  release(v);
  return clip.an;
}
// Normaliza contra todo el material para que los clips borrosos u oscuros pierdan
function globalStats(clips) {
  var mo = [], sh = [];
  clips.forEach(function (c) { if (c.an && c.kind === 'video') c.an.samples.forEach(function (s) { mo.push(s.motion); sh.push(s.sharp); }); });
  return { mo: Math.max(0.5, pct(mo, .9)), sh: Math.max(0.5, pct(sh, .9)), shLow: pct(sh, .3) };
}
function windowScore(clip, start, len, mode, st, used) {
  var ss = clip.an.samples, m = 0, s = 0, b = 0, cx = 0, cy = 0, n = 0;
  for (var i = 0; i < ss.length; i++) { var x = ss[i]; if (x.t >= start - 0.25 && x.t <= start + len + 0.25) { m += x.motion; s += x.sharp; b += x.bright; cx += x.cx; cy += x.cy; n++; } }
  if (!n) { var near = ss.reduce(function (a, x) { return Math.abs(x.t - start) < Math.abs(a.t - start) ? x : a; }, ss[0]); m = near.motion; s = near.sharp; b = near.bright; cx = near.cx; cy = near.cy; n = 1; }
  m /= n; s /= n; b /= n; cx /= n; cy /= n;
  var mo = clamp(m / st.mo, 0, 1.6), sh = clamp(s / st.sh, 0, 1.4), pos = (start + len / 2) / clip.dur, sc;
  if (mode === 'reveal') sc = sh * .55 + (1 - clamp(mo, 0, 1)) * .3 + pos * .2;
  else if (mode === 'detail') sc = sh * .75 + (1 - Math.abs(mo - .45)) * .25;
  else if (mode === 'hook') sc = sh * .5 + Math.min(mo, 1.1) * .5;
  else sc = sh * .45 + Math.min(mo, 1.1) * .55;
  if (mo > 1.25) sc -= (mo - 1.25) * .8;          // cámara moviéndose de más
  if (s < st.shLow) sc -= .35;                     // borroso
  if (b < 38) sc -= .35; if (b > 235) sc -= .2;    // muy oscuro / quemado
  if (start < 0.5 && mode !== 'reveal') sc -= .15; // el arranque del clip suele moverse
  if (used) used.forEach(function (u) { if (u.clip === clip && start < u.b && start + len > u.a) sc -= .6; });
  return { score: sc, cx: cx, cy: cy };
}
function candidates(clip, len, mode, st, used) {
  var out = [], maxStart = Math.max(0, clip.dur - len - 0.15);
  for (var t = Math.min(0.3, maxStart); t <= maxStart + 1e-6; t += 0.25) { var w = windowScore(clip, t, len, mode, st, used); out.push({ start: t, score: w.score, cx: w.cx, cy: w.cy }); }
  if (!out.length) { var w0 = windowScore(clip, 0, Math.min(len, clip.dur), mode, st, used); out.push({ start: 0, score: w0.score, cx: w0.cx, cy: w0.cy }); }
  return out.sort(function (a, b) { return b.score - a.score; });
}
function srcFor(clip, outDur, speed) {
  var avail = Math.max(0.2, clip.dur - 0.1), want = outDur * speed;
  if (want > avail) { speed = Math.max(0.5, avail / outDur); want = Math.min(avail, outDur * speed); }
  return { len: want, speed: speed };
}
function useShot(used, clip, a, len) { used.push({ clip: clip, a: a, b: a + len }); }
// La mejor toma de todo el material para un momento (gancho / final)
function bestShot(clips, outDur, speed, mode, st, used, r) {
  var best = null;
  clips.forEach(function (c) {
    var sf = srcFor(c, outDur, speed), cand = candidates(c, sf.len, mode, st, used)[0];
    if (cand && (!best || cand.score > best.cand.score)) best = { clip: c, cand: cand, sf: sf };
  });
  if (!best) return null;
  useShot(used, best.clip, best.cand.start, best.sf.len);
  return { kind: 'video', clip: best.clip, srcStart: best.cand.start, speed: best.sf.speed, cx: best.cand.cx, cy: best.cand.cy, outDur: outDur };
}
// Reparte tomas a lo largo de los clips en orden cronológico (el tatuaje "se va construyendo")
function chronoShots(specs, clips, st, used, r) {
  if (!specs.length) return [];
  if (!clips.length) return [];
  var total = clips.reduce(function (a, c) { return a + Math.max(1, c.dur); }, 0), assign = clips.map(function () { return []; });
  specs.forEach(function (sp, i) {
    var f = (i + .5) / specs.length * total, acc = 0, j = 0;
    for (; j < clips.length; j++) { acc += Math.max(1, clips[j].dur); if (f <= acc) break; }
    assign[Math.min(j, clips.length - 1)].push(i);
  });
  var out = new Array(specs.length);
  clips.forEach(function (c, ci) {
    var idx = assign[ci]; if (!idx.length) return;
    var L = 0, sp0 = specs[idx[0]];
    idx.forEach(function (i) { L = Math.max(L, srcFor(c, specs[i].outDur, specs[i].speed).len); });
    var cand = candidates(c, L, sp0.mode, st, used), chosen = [];
    for (var k = 0; k < cand.length && chosen.length < idx.length; k++) {
      var cd = cand[k], clash = chosen.some(function (x) { return cd.start < x.start + L + 0.2 && cd.start + L + 0.2 > x.start; });
      if (!clash) chosen.push(cd);
    }
    if (chosen.length < idx.length) {
      // no caben sin repetirse: parte el clip en tramos iguales y toma lo mejor de cada tramo (siempre avanza en el tiempo)
      chosen = []; var seg = Math.max(0.05, (c.dur - L) / idx.length);
      for (var q = 0; q < idx.length; q++) {
        var a0 = q * seg, a1 = a0 + seg, bestC = null;
        cand.forEach(function (cd) { if (cd.start >= a0 - 1e-6 && cd.start < a1 && (!bestC || cd.score > bestC.score)) bestC = cd; });
        chosen.push(bestC || { start: Math.min(a0, Math.max(0, c.dur - L)), score: 0, cx: .5, cy: .5 });
      }
    }
    chosen.sort(function (a, b) { return a.start - b.start; });
    idx.forEach(function (i, k) {
      var sf = srcFor(c, specs[i].outDur, specs[i].speed), cd = chosen[k];
      useShot(used, c, cd.start, sf.len);
      out[i] = { kind: 'video', clip: c, srcStart: Math.min(cd.start, Math.max(0, c.dur - sf.len - 0.05)), speed: sf.speed, cx: cd.cx, cy: cd.cy, outDur: specs[i].outDur, mode: specs[i].mode };
    });
  });
  return out;
}

/* ═══════════════════════ 2 · RITMO (beats) ═══════════════════════ */
function detectBeats(buf) {
  var sr = buf.sampleRate, ch0 = buf.getChannelData(0), ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
  var hop = 512, nF = Math.floor(ch0.length / hop), env = new Float32Array(nF), en = new Float32Array(nF), lp = 0, prevE = 0;
  for (var f = 0; f < nF; f++) {
    var e = 0, eb = 0;
    for (var i = f * hop, end = i + hop; i < end; i++) { var x = (ch0[i] + ch1[i]) * .5; lp += (x - lp) * .06; e += lp * lp; eb += x * x; }
    var le = Math.log(1 + 1000 * e); env[f] = Math.max(0, le - prevE); prevE = le; en[f] = eb;
  }
  var fps = sr / hop, best = 0, bestLag = Math.round(fps * 60 / 100);
  for (var bpm = 70; bpm <= 170; bpm += 0.5) {
    var lag = fps * 60 / bpm, s = 0, L = Math.floor(lag);
    for (var k = 0; k + lag < nF; k += 1) { var j = Math.floor(k + lag); s += env[k] * (env[j] * (1 - (k + lag - j)) + (env[j + 1] || 0) * (k + lag - j)); }
    s *= (bpm >= 82 && bpm <= 135) ? 1.15 : 1;
    if (s > best) { best = s; bestLag = lag; }
  }
  var bestPh = 0, bestS = -1;
  for (var ph = 0; ph < bestLag; ph++) { var sum = 0; for (var p = ph; p < nF; p += bestLag) sum += env[Math.floor(p)]; if (sum > bestS) { bestS = sum; bestPh = ph; } }
  var beats = []; for (var b = bestPh; b < nF; b += bestLag) beats.push(b / fps);
  // "drop": el mayor salto de energía (para que coincida con la revelación)
  var sec = Math.floor(fps), rms = [];
  for (var q = 0; q + sec <= nF; q += Math.floor(sec / 2)) { var t = 0; for (var u = q; u < q + sec; u++) t += en[u]; rms.push({ t: q / fps, v: t }); }
  var drop = 0, jump = 0;
  for (var z = 4; z < rms.length; z++) { var d = rms[z].v - (rms[z - 2].v + rms[z - 3].v + rms[z - 4].v) / 3; if (rms[z].t > 3 && d > jump) { jump = d; drop = rms[z].t; } }
  return { bpm: 60 * fps / bestLag, beats: beats, drop: drop, dur: buf.duration };
}
function gridFor(bpm, T, offset) { var bi = 60 / bpm, g = []; for (var t = offset || 0; t <= T + bi; t += bi) g.push(+t.toFixed(4)); return g; }
function snap(grid, t) { var b = grid[0], d = 1e9; for (var i = 0; i < grid.length; i++) { var x = Math.abs(grid[i] - t); if (x < d) { d = x; b = grid[i]; } } return b; }
// Corta un tramo [a,b] siguiendo el ritmo: k beats por toma (con variación natural)
function cutsBetween(grid, a, b, k, r, minLen) {
  minLen = minLen || 0.35;
  var bi = grid.length > 1 ? grid[1] - grid[0] : 0.6, out = [], t = a;
  while (t < b - 1e-3) {
    var kk = k >= 2 ? k + (r() < .25 ? -1 : r() < .2 ? 1 : 0) : k;
    var next = snap(grid, t + Math.max(minLen, kk * bi));
    if (next <= t + 1e-3) next = t + Math.max(minLen, kk * bi);
    if (b - next < minLen) next = b;
    out.push(next - t); t = next;
  }
  return out;
}

/* ═══════════════════════ 3 · ARMADO DEL REEL (EDL) ═══════════════════════ */
function buildEDL(o) {
  // o: {tpl, T, grid, plan, words, voiceStart, seed, clips}
  var tpl = o.tpl, T = o.T, g = o.grid, r = rng(o.seed), plan = o.plan, base = tpl.base;
  var vids = o.clips.filter(function (c) { return c.kind === 'video' && c.an; });
  var pics = o.clips.filter(function (c) { return c.kind === 'image'; });
  var st = globalStats(o.clips), used = [], shots = [], overlays = [];
  var bi = g.length > 1 ? g[1] - g[0] : 0.6;
  var beatsPer = bi < 0.45 ? 2 : 1;
  var voice = !!(o.words && o.words.length);
  var revealLen = clamp(T * (base === 'encuesta' ? .38 : base === 'revelacion' ? .3 : .2), 2.6, 6);
  if (!vids.length) revealLen = T;
  var R0 = snap(g, T - revealLen); if (R0 > T - 1.6) R0 = T - 2.2; if (R0 < 2) R0 = Math.min(T - 1.5, 2);
  var hookEnd = snap(g, base === 'pov' ? 3.2 : base === 'asmr' ? 3 : base === 'encuesta' ? 1.6 : 2.4);
  if (hookEnd >= R0) hookEnd = Math.max(0.8, R0 * .3);
  // Plantilla clonada de un video viral: se copian sus cortes exactos
  var cloneBody = null;
  if (tpl.cuts && tpl.cuts.length >= 3 && vids.length) {
    var cs = tpl.cuts.slice(), ri = cs.length - 1, acc = 0, tot = cs.reduce(function (a, b) { return a + b; }, 0);
    if (cs[ri] < 1 && cs.length > 3) { var tail = 0; while (ri > 2 && tail < tot * .15) { tail += cs[ri]; ri--; } ri++; }
    for (var ci = 0; ci < ri; ci++) acc += cs[ci];
    hookEnd = cs[0]; R0 = acc; cloneBody = cs.slice(1, ri);
  }
  function push(list, role) { list.forEach(function (s) { if (s) { s.role = role; shots.push(s); } }); }

  if (vids.length) {
    // Gancho: la toma más llamativa de todo el material
    var hk = bestShot(vids, hookEnd, base === 'asmr' ? .85 : 1.2, base === 'asmr' ? 'detail' : 'hook', st, used, r);
    if (hk) { hk.zoomA = 1.14; hk.zoomB = 1.04; push([hk], 'hook'); }
    var body = [];
    if (base === 'etapas' && !cloneBody) {
      var stages = vids.slice(0, 5), span = (R0 - hookEnd) / stages.length, t0 = hookEnd, prevB = hookEnd;
      var labels = (plan.lines && plan.lines.length >= stages.length ? plan.lines : defaultStages(stages.length));
      stages.forEach(function (c, i) {
        var a = prevB, b = i === stages.length - 1 ? R0 : snap(g, t0 + span * (i + 1));
        if (b <= a + .4) b = Math.min(R0, a + Math.max(.6, span)); prevB = b;
        var cuts = cutsBetween(g, a, b, beatsPer, r);
        var sh = chronoShots(cuts.map(function (d) { return { outDur: d, speed: 2, mode: 'action' }; }), [c], st, used, r);
        push(sh, 'process');
        overlays.push({ type: 'label', text: labels[i] || ('PASO ' + (i + 1)), from: a, to: b, n: i + 1, of: stages.length });
      });
    } else if (cloneBody) {
      body = chronoShots(cloneBody.map(function (d) { return { outDur: d, speed: d < .5 ? 2.2 : 1.6, mode: 'action' }; }), vids, st, used, r);
      push(body, 'process');
    } else {
      var k = base === 'asmr' ? 3 : (base === 'narrado' || base === 'significado' || base === 'marca') ? 2 : base === 'pov' ? 2 : beatsPer;
      var speed = base === 'asmr' ? .8 : base === 'narrado' ? 2.6 : base === 'significado' || base === 'marca' ? 2 : base === 'encuesta' ? 2.2 : 1.6;
      var mode = base === 'asmr' ? 'detail' : 'action';
      var accelFrom = base === 'revelacion' || base === 'encuesta' ? snap(g, R0 - Math.max(1.2, bi * 3)) : R0;
      if (accelFrom <= hookEnd) accelFrom = R0;
      var cuts1 = cutsBetween(g, hookEnd, accelFrom, k, r);
      var cuts2 = accelFrom < R0 ? cutsBetween(gridFor(60 / (bi / 2), T, g[0]), accelFrom, R0, 1, r, 0.25) : [];
      body = chronoShots(cuts1.concat(cuts2).map(function (d, i) { return { outDur: d, speed: i >= cuts1.length ? speed * 1.3 : speed, mode: mode }; }), vids, st, used, r);
      push(body, 'process');
    }
  }
  // Revelación: las fotos finales (con movimiento suave) o la toma más nítida y estable del último clip
  var revDur = T - (vids.length ? R0 : 0), rev = [];
  if (pics.length) {
    var ps = pics.slice(-3), each = revDur / ps.length;
    ps.forEach(function (p, i) { rev.push({ kind: 'image', clip: p, outDur: each, cx: .5, cy: .5, zoomA: i % 2 ? 1.12 : 1.02, zoomB: i % 2 ? 1.02 : 1.12 }); });
  } else if (vids.length) {
    var last = vids[vids.length - 1], rs = bestShot([last], revDur, 1, 'reveal', st, used, r) || bestShot(vids, revDur, 1, 'reveal', st, [], r);
    if (rs) { rs.zoomA = 1.0; rs.zoomB = 1.1; rev.push(rs); }
  }
  push(rev, 'reveal');
  if (rev[0] && vids.length) { rev[0].flash = true; rev[0].punch = true; }

  // Tiempos de salida + movimiento de cámara sutil
  var t = 0;
  shots.forEach(function (s, i) {
    s.outStart = t; s.outEnd = t + s.outDur; t = s.outEnd;
    if (s.zoomA == null) { var inw = r() < .5; s.zoomA = inw ? 1.04 : 1.1; s.zoomB = inw ? 1.1 : 1.04; }
    if (s.role === 'process' && r() < .3) s.punch = true;
  });
  if (shots.length) shots[shots.length - 1].outEnd = T;

  // Textos en pantalla
  var hook = fillVars(plan.hook || tpl.hooks[0]);
  overlays.push({ type: 'hook', text: hook, from: 0, to: Math.max(voice ? 2.8 : hookEnd, 1.8) });
  var lines = (plan.lines || []).filter(Boolean);
  if (base === 'pov' && lines.length) {
    var bodyA = hookEnd, bodyB = R0, n = Math.min(3, lines.length);
    for (var i = 0; i < n; i++) overlays.push({ type: 'pill', text: lines[i], from: bodyA + (bodyB - bodyA) * i / n, to: bodyA + (bodyB - bodyA) * (i + 1) / n - .1 });
    if (lines[n]) overlays.push({ type: 'pill', text: lines[n], from: R0 + .3, to: T - 1.6 });
  } else if (base === 'asmr' && lines[0] && !voice) {
    overlays.push({ type: 'pill', text: lines[0], from: hookEnd + .3, to: Math.min(R0, hookEnd + 3.5) });
  } else if ((base === 'revelacion') && lines[0] && !voice) {
    overlays.push({ type: 'pill', text: lines[0], from: R0 + .35, to: T - 1.7 });
  }
  if (base === 'encuesta') overlays.push({ type: 'big', text: plan.question || hook, from: R0 + .25, to: T });
  if (voice) overlays.push({ type: 'subs', words: o.words, offset: o.voiceStart || 0 });
  if (CFG.marca && base !== 'encuesta') overlays.push({ type: 'cta', text: plan.endText || CFG.cta, from: Math.max(R0 + .4, T - 1.9), to: T });
  overlays.push({ type: 'mark', from: 0, to: T });
  return { T: T, shots: shots, overlays: overlays, reveal: vids.length ? R0 : 0 };
}
function defaultStages(n) {
  var all = ['PLANTILLA', 'LÍNEA', 'SOMBRA', 'COLOR', 'DETALLES'];
  if (n <= 2) return ['LÍNEA', 'COLOR'];
  if (n === 3) return ['PLANTILLA', 'LÍNEA', 'COLOR'];
  if (n === 4) return ['PLANTILLA', 'LÍNEA', 'SOMBRA', 'COLOR'];
  return all.slice(0, n);
}

/* ═══════════════════════ 4 · DIBUJO DE CADA FRAME ═══════════════════════ */
var vignetteCv = null;
function vignette() {
  if (vignetteCv) return vignetteCv;
  vignetteCv = document.createElement('canvas'); vignetteCv.width = W; vignetteCv.height = H;
  var c = vignetteCv.getContext('2d'), g = c.createRadialGradient(W / 2, H * .45, H * .28, W / 2, H * .5, H * .78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  var t = c.createLinearGradient(0, 0, 0, H * .3); t.addColorStop(0, 'rgba(0,0,0,.35)'); t.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = t; c.fillRect(0, 0, W, H * .3);
  return vignetteCv;
}
function drawCover(ctx, src, sw, sh, cx, cy, zoom) {
  if (!sw || !sh) return;
  var sc = Math.max(W / sw, H / sh) * zoom, dw = sw * sc, dh = sh * sc;
  var x = W / 2 - cx * dw, y = H / 2 - cy * dh;
  x = clamp(x, W - dw, 0); y = clamp(y, H - dh, 0);
  ctx.drawImage(src, x, y, dw, dh);
}
function tokens(text) {
  var out = [], parts = String(text || '').split(/(\*[^*]+\*)/);
  parts.forEach(function (p) {
    if (!p) return; var em = /^\*.*\*$/.test(p); p = em ? p.slice(1, -1) : p;
    p.split(/\s+/).forEach(function (w) { if (w) out.push({ w: w, em: em }); });
  });
  return out;
}
function layoutLines(ctx, toks, maxW) {
  var lines = [], cur = [], cw = 0, sp = ctx.measureText(' ').width;
  toks.forEach(function (t) {
    var w = ctx.measureText(t.w).width;
    if (cur.length && cw + sp + w > maxW) { lines.push({ t: cur, w: cw }); cur = []; cw = 0; }
    cur.push({ w: t.w, em: t.em, width: w }); cw += (cur.length > 1 ? sp : 0) + w;
  });
  if (cur.length) lines.push({ t: cur, w: cw });
  return lines;
}
function fitText(ctx, text, fontFn, start, min, maxW, maxLines, upper) {
  var toks = tokens(upper ? String(text).toUpperCase() : text), size = start, lines;
  for (; size >= min; size -= 6) { ctx.font = fontFn(size); lines = layoutLines(ctx, toks, maxW); if (lines.length <= maxLines) break; }
  return { size: size, lines: lines };
}
function drawTextBlock(ctx, fit, fontFn, cy, opt) {
  opt = opt || {}; ctx.font = fontFn(fit.size); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  var lh = fit.size * (opt.lh || 1.02), top = cy - (fit.lines.length - 1) * lh / 2, sp = ctx.measureText(' ').width;
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  fit.lines.forEach(function (ln, i) {
    var x = W / 2 - ln.w / 2, y = top + i * lh;
    ln.t.forEach(function (t) {
      if (opt.stroke) { ctx.lineWidth = fit.size * opt.stroke; ctx.strokeStyle = 'rgba(0,0,0,.92)'; ctx.strokeText(t.w, x, y); }
      ctx.fillStyle = t.em ? (opt.em || GOLD) : (opt.color || '#fff'); ctx.fillText(t.w, x, y);
      x += t.width + sp;
    });
  });
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
var BEBAS = function (s) { return s + 'px "Bebas Neue", Impact, sans-serif'; };
var MONT = function (s) { return '900 ' + s + 'px Montserrat, "DM Sans", Arial, sans-serif'; };
var MONT8 = function (s) { return '800 ' + s + 'px Montserrat, "DM Sans", Arial, sans-serif'; };
var fitCache = {};
function cachedFit(ctx, key, fn) { if (!fitCache[key]) fitCache[key] = fn(); return fitCache[key]; }

function drawOverlays(ctx, edl, t) {
  edl.overlays.forEach(function (o) {
    if (o.type === 'subs') return drawSubs(ctx, o, t);
    if (t < o.from || t > o.to) return;
    var a = clamp((t - o.from) / 0.16, 0, 1) * clamp((o.to - t) / 0.16, 0, 1), pop = .94 + .06 * easeOut((t - o.from) / 0.18);
    if (o.from === 0 && o.type === 'hook') a = clamp((o.to - t) / 0.16, 0, 1); // el gancho ya está visible en el primer frame (miniatura)
    ctx.save(); ctx.globalAlpha = a;
    if (o.type === 'hook') {
      var f = cachedFit(ctx, 'h' + o.text, function () { return fitText(ctx, o.text, BEBAS, 150, 84, W * .84, 3, true); });
      ctx.translate(W / 2, H * .2); ctx.scale(pop, pop); ctx.translate(-W / 2, -H * .2);
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 24;
      drawTextBlock(ctx, f, BEBAS, H * .2, { stroke: .12, lh: .98 });
    } else if (o.type === 'big') {
      var fb = cachedFit(ctx, 'b' + o.text, function () { return fitText(ctx, o.text, BEBAS, 190, 100, W * .84, 3, true); });
      ctx.translate(W / 2, H * .42); ctx.scale(pop, pop); ctx.translate(-W / 2, -H * .42);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; drawTextBlock(ctx, fb, BEBAS, H * .42, { stroke: .1 });
    } else if (o.type === 'pill' || o.type === 'label') {
      var txt = o.type === 'label' ? o.text.toUpperCase() : o.text;
      var fp = cachedFit(ctx, 'p' + txt, function () { return fitText(ctx, txt, MONT8, 54, 34, W * .76, 3, false); });
      ctx.font = MONT8(fp.size);
      var lh = fp.size * 1.22, bw = Math.max.apply(null, fp.lines.map(function (l) { return l.w; })) + 64, bh = fp.lines.length * lh + 40, cy = o.type === 'label' ? H * .3 : H * .36;
      ctx.translate(W / 2, cy); ctx.scale(pop, pop); ctx.translate(-W / 2, -cy);
      ctx.fillStyle = 'rgba(8,8,8,.72)'; roundRect(ctx, W / 2 - bw / 2, cy - bh / 2, bw, bh, 26); ctx.fill();
      if (o.type === 'label') { ctx.fillStyle = RED; roundRect(ctx, W / 2 - bw / 2, cy - bh / 2, 12, bh, 6); ctx.fill(); }
      drawTextBlock(ctx, fp, MONT8, cy, { lh: 1.22 });
      if (o.type === 'label' && o.of > 1) {
        for (var i = 0; i < o.of; i++) { ctx.fillStyle = i < o.n ? GOLD : 'rgba(255,255,255,.3)'; ctx.fillRect(W / 2 - o.of * 26 + i * 52 + 6, cy + bh / 2 + 22, 40, 8); }
      }
    } else if (o.type === 'cta') {
      var fc = cachedFit(ctx, 'c' + o.text, function () { return fitText(ctx, o.text, BEBAS, 110, 70, W * .8, 2, true); });
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24;
      drawTextBlock(ctx, fc, BEBAS, H * .2 + (1 - easeOut((t - o.from) / .3)) * 40, { stroke: .1 });
      ctx.shadowBlur = 0; ctx.font = MONT8(46); ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText(CFG.handle || '', W / 2, H * .2 + fc.lines.length * fc.size * .55 + 50);
    } else if (o.type === 'mark' && CFG.handle) {
      ctx.globalAlpha = .55; ctx.font = MONT8(34); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 8; ctx.fillText(CFG.handle, W / 2, H * .745);
    }
    ctx.restore();
  });
}
// Subtítulos karaoke: grupos de 2-3 palabras; la palabra que suena va en dorado
function subGroups(words) {
  var g = [], cur = [];
  words.forEach(function (w, i) {
    cur.push(w);
    var endP = /[.,!?;:…]$/.test(w.w), next = words[i + 1];
    if (cur.length >= 3 || endP || (cur.length >= 2 && w.w.length > 7) || !next || next.start - w.end > .35) { g.push(cur); cur = []; }
  });
  return g;
}
function drawSubs(ctx, o, t) {
  if (!o.groups) o.groups = subGroups(o.words);
  var tt = t - o.offset, grp = null;
  for (var i = 0; i < o.groups.length; i++) { var G = o.groups[i], a = G[0].start, b = G[G.length - 1].end + .12; if (tt >= a - .04 && tt <= b) { grp = G; break; } }
  if (!grp) return;
  var text = grp.map(function (w) { return w.w; }).join(' ').toUpperCase(), key = 's' + text;
  var f = cachedFit(ctx, key, function () { return fitText(ctx, text, MONT, 78, 52, W * .82, 2, false); });
  ctx.save(); ctx.font = MONT(f.size); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  var lh = f.size * 1.12, cy = H * .63, top = cy - (f.lines.length - 1) * lh / 2, sp = ctx.measureText(' ').width, wi = 0;
  var pop = .9 + .1 * easeOut((tt - grp[0].start) / .12);
  ctx.translate(W / 2, cy); ctx.scale(pop, pop); ctx.translate(-W / 2, -cy);
  f.lines.forEach(function (ln, li) {
    var x = W / 2 - ln.w / 2, y = top + li * lh;
    ln.t.forEach(function (tk) {
      var w = grp[wi++] || grp[grp.length - 1], on = tt >= w.start && tt < w.end + .06;
      ctx.lineWidth = f.size * .2; ctx.strokeStyle = '#000'; ctx.strokeText(tk.w, x, y);
      ctx.fillStyle = on ? GOLD : '#fff'; ctx.fillText(tk.w, x, y); x += tk.width + sp;
    });
  });
  ctx.restore();
}
function shotAt(edl, t) { var s = edl.shots; for (var i = 0; i < s.length; i++) if (t < s[i].outEnd) return s[i]; return s[s.length - 1]; }
var useFilter = true;
function drawFrame(ctx, edl, t, srcEl) {
  var s = shotAt(edl, t);
  ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
  if (s) {
    var p = clamp((t - s.outStart) / Math.max(.01, s.outEnd - s.outStart), 0, 1), z = s.zoomA + (s.zoomB - s.zoomA) * easeInOut(p);
    if (s.punch) z *= 1 + .1 * (1 - easeOut((t - s.outStart) / .26));
    var el = srcEl || s.clip.el || s.clip.still, sw = s.kind === 'image' ? s.clip.w : (el && (el.videoWidth || el.width)), sh = s.kind === 'image' ? s.clip.h : (el && (el.videoHeight || el.height));
    if (useFilter) ctx.filter = 'contrast(1.07) saturate(1.12)';
    if (el) drawCover(ctx, el, sw, sh, s.cx == null ? .5 : clamp(s.cx, .2, .8), s.cy == null ? .5 : clamp(s.cy, .25, .75), z);
    ctx.filter = 'none';
  }
  ctx.drawImage(vignette(), 0, 0);
  if (s && s.flash) { var fa = .85 * (1 - (t - s.outStart) / .3); if (fa > 0) { ctx.fillStyle = 'rgba(255,248,235,' + fa + ')'; ctx.fillRect(0, 0, W, H); } }
  drawOverlays(ctx, edl, t);
}

/* ═══════════════════════ 5 · AUDIO: voz, beat y mezcla ═══════════════════════ */
var decodeCtx = null;
function decode(ab) {
  if (!decodeCtx) decodeCtx = new OfflineAudioContext(1, 1, SR);
  return new Promise(function (res, rej) { decodeCtx.decodeAudioData(ab.slice(0), res, rej); });
}
// Voz gratis que corre DENTRO del celular (Piper, español de México). Sin cuentas ni ventanas.
// La primera vez descarga la voz (~60 MB) y queda guardada en el teléfono.
var piperP = null, PIPER_VOICE = 'es_MX-claude-high';
function piperSession(onp) {
  if (piperP) return piperP;
  var base = (document.currentScript && document.currentScript.src) || location.href;
  piperP = import(new URL('vendor/piper/piper-tts-web.js', location.href).href).then(function (m) {
    m.TtsSession._instance = null;
    return m.TtsSession.create({ voiceId: PIPER_VOICE, progress: function (p) { if (onp && p && p.total) onp('Descargando la voz (solo la primera vez) · ' + Math.round(p.loaded / p.total * 100) + '%'); } });
  }).catch(function (e) { piperP = null; throw e; });
  return piperP;
}
var VOICES = { hombre: { eleven: 'pNInz6obpgDQGcFmaJgB' }, mujer: { eleven: 'EXAVITQu4vr4xnSDxMaL' } };
function ttsChain(onp) {
  var v = VOICES[CFG.genero] || VOICES.hombre, list = [];
  if (CFG.elevenKey) list.push({ id: 'mine', name: 'ElevenLabs (tu llave)', fn: function (tx) { return elevenDirect(tx, v.eleven); } });
  list.push({ id: 'piper', name: 'Voz gratis', fn: function (tx) {
    return piperSession(onp).then(function (ses) { if (onp) onp('Generando la voz…'); return ses.predict(tx); }).then(function (blob) { return blob.arrayBuffer(); }).then(function (ab) { return { ab: ab }; });
  } });
  return list;
}
function elevenDirect(text, voice) {
  return fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voice + '/with-timestamps', {
    method: 'POST', headers: { 'xi-api-key': CFG.elevenKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: .42, similarity_boost: .8, style: .35, use_speaker_boost: true } })
  }).then(function (r) { if (!r.ok) throw new Error('ElevenLabs ' + r.status); return r.json(); }).then(function (j) {
    var bin = atob(j.audio_base64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    var al = j.alignment || j.normalized_alignment, words = [];
    if (al && al.characters) {
      var cur = '', a = null, b = 0;
      al.characters.forEach(function (ch, k) {
        if (/\s/.test(ch)) { if (cur) words.push({ w: cur, start: a, end: b }); cur = ''; a = null; }
        else { if (a == null) a = al.character_start_times_seconds[k]; cur += ch; b = al.character_end_times_seconds[k]; }
      });
      if (cur) words.push({ w: cur, start: a, end: b });
    }
    return { ab: u.buffer, words: words };
  });
}
function speechBounds(buf) {
  var d = buf.getChannelData(0), win = Math.floor(buf.sampleRate * .01), a = 0, b = d.length;
  function rmsAt(i) { var s = 0; for (var k = i; k < Math.min(d.length, i + win); k++) s += d[k] * d[k]; return Math.sqrt(s / win); }
  for (var i = 0; i < d.length; i += win) if (rmsAt(i) > .02) { a = i; break; }
  for (var j = d.length - win; j > 0; j -= win) if (rmsAt(j) > .02) { b = j + win; break; }
  return { a: a / buf.sampleRate, b: Math.max(a + win, b) / buf.sampleRate };
}
function estimateWords(text, a, b) {
  var ws = text.split(/\s+/).filter(Boolean), wt = ws.map(function (w) { return w.replace(/[^\wáéíóúñü]/gi, '').length + 1.6 + (/[.,!?;:…]$/.test(w) ? 1.5 : 0); });
  var tot = wt.reduce(function (x, y) { return x + y; }, 0), t = a, out = [];
  ws.forEach(function (w, i) { var d = (b - a) * wt[i] / tot; out.push({ w: w, start: t, end: t + d * .92 }); t += d; });
  return out;
}
function splitSentences(text) {
  var s = String(text || '').replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]*/g) || [];
  var out = []; s.forEach(function (x) { x = x.trim(); if (!x) return; if (out.length && (out[out.length - 1].length < 25)) out[out.length - 1] += ' ' + x; else out.push(x); });
  return out;
}
async function narrate(text, onp) {
  var parts = splitSentences(text); if (!parts.length) return null;
  var chain = ttsChain(onp), lastErr = null;
  for (var c = 0; c < chain.length; c++) {
    try {
      var bufs = [];
      for (var i = 0; i < parts.length; i++) {
        if (onp) onp('Voz: ' + chain[c].name + ' · frase ' + (i + 1) + '/' + parts.length);
        var r = await withTimeout(chain[c].fn(parts[i]), i === 0 ? 240000 : 60000, 'La voz tardó demasiado');
        var buf = await decode(r.ab);
        bufs.push({ buf: buf, words: r.words && r.words.length ? r.words : null, text: parts[i] });
      }
      // une las frases con una pausa natural y calcula el tiempo de cada palabra
      var gap = .16, total = 0; bufs.forEach(function (x) { total += x.buf.duration + gap; });
      var out = new AudioBuffer({ length: Math.ceil(total * SR), numberOfChannels: 1, sampleRate: SR }), words = [], t = 0;
      bufs.forEach(function (x) {
        var src = x.buf.getChannelData(0), dst = out.getChannelData(0), off = Math.floor(t * SR);
        for (var k = 0; k < src.length && off + k < dst.length; k++) dst[off + k] = src[k];
        var ws = x.words || (function () { var bd = speechBounds(x.buf); return estimateWords(x.text, bd.a, bd.b); })();
        ws.forEach(function (w) { words.push({ w: w.w, start: w.start + t, end: w.end + t }); });
        t += x.buf.duration + gap;
      });
      return { buffer: out, words: words, engine: chain[c].name, dur: t - gap };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('No hubo voz disponible');
}
var noiseBuf = null;
function noise(oc) {
  if (noiseBuf && noiseBuf.sampleRate === oc.sampleRate) return noiseBuf;
  noiseBuf = oc.createBuffer(1, oc.sampleRate * 2, oc.sampleRate); var d = noiseBuf.getChannelData(0);
  for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return noiseBuf;
}
// Beat INKBOT: taiko + koto (escala hirajōshi) libre de derechos, con subida y golpe en la revelación
function makeBeat(oc, dest, bpm, T, R, hookEnd) {
  var bi = 60 / bpm, nb = noise(oc), scale = [220, 246.94, 261.63, 329.63, 349.23, 440, 493.88, 523.25], seed = rng(bpm * 7 + Math.round(T));
  function hit(t, f0, f1, dur, vol) { var o = oc.createOscillator(), g = oc.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * .6); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05); }
  function nz(t, type, f, dur, vol, q) { var s = oc.createBufferSource(), fl = oc.createBiquadFilter(), g = oc.createGain(); s.buffer = nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q || .8; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + .05); }
  function pluck(t, f, vol) { var o = oc.createOscillator(), o2 = oc.createOscillator(), g = oc.createGain(), fl = oc.createBiquadFilter(); o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.003; fl.type = 'lowpass'; fl.frequency.setValueAtTime(3200, t); fl.frequency.exponentialRampToValueAtTime(500, t + .5); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .9); var g2 = oc.createGain(); g2.gain.value = .25; o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(dest); o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1); }
  // colchón grave
  var pad = oc.createOscillator(), pg = oc.createGain(); pad.type = 'sine'; pad.frequency.value = 55; pg.gain.setValueAtTime(0, 0); pg.gain.linearRampToValueAtTime(.16, 1); pg.gain.setValueAtTime(.16, Math.max(1, T - 1.2)); pg.gain.linearRampToValueAtTime(0, T); pad.connect(pg); pg.connect(dest); pad.start(0); pad.stop(T);
  for (var b = 0, t = 0; t < T; b++, t = b * bi) {
    var beforeR = R > 0 && t >= R - bi * .99 && t < R, afterR = R > 0 && t >= R, intro = t < hookEnd;
    if (beforeR) continue; // silencio de un beat antes del golpe: tensión
    if (b % 2 === 0 || afterR) hit(t, 150, 48, .45, intro ? .55 : .85);
    if (!intro && b % 4 === 2) { nz(t, 'bandpass', 1700, .2, .5, 1.2); hit(t, 260, 180, .12, .2); }
    if (!intro) { nz(t, 'highpass', 7500, .05, .12); nz(t + bi / 2, 'highpass', 7500, .04, .08); }
    if (b % 2 === 1 || seed() < .35) pluck(t + (seed() < .3 ? bi / 2 : 0), scale[Math.floor(seed() * scale.length)] / (seed() < .3 ? 2 : 1), intro ? .1 : .14);
  }
  if (R > 0) {
    // subida (riser) y golpe
    var rs = oc.createBufferSource(), rf = oc.createBiquadFilter(), rg = oc.createGain(), a = Math.max(0, R - bi * 4);
    rs.buffer = nb; rs.loop = true; rf.type = 'bandpass'; rf.Q.value = 2; rf.frequency.setValueAtTime(400, a); rf.frequency.exponentialRampToValueAtTime(7000, R - .02);
    rg.gain.setValueAtTime(.0001, a); rg.gain.exponentialRampToValueAtTime(.35, R - .03); rg.gain.linearRampToValueAtTime(0, R);
    rs.connect(rf); rf.connect(rg); rg.connect(dest); rs.start(a); rs.stop(R + .05);
    hit(R, 90, 32, 1.8, 1); nz(R, 'lowpass', 900, 1.2, .5); nz(R, 'highpass', 4000, 1.6, .22);
  }
}
async function buildAudio(o) {
  // o: {T, voice, voiceStart, music:{buffer,offset}, beat:{bpm,R,hookEnd}}
  if (!o.voice && !o.music && !o.beat) return null;
  var oc = new OfflineAudioContext(2, Math.ceil(o.T * SR), SR);
  var comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.5; comp.attack.value = .005; comp.release.value = .2;
  var master = oc.createGain(); master.gain.value = .8; comp.connect(master); master.connect(oc.destination);
  var bed = oc.createGain(); bed.connect(comp);
  var duck = o.voice ? .22 : 1;
  var fadeAt = Math.max(0, o.T - 1.3), endLevel = 1;
  bed.gain.setValueAtTime(o.voice ? duck : 1, 0);
  if (o.voice) {
    var ve = (o.voiceStart || 0) + o.voice.dur;
    if (ve + .4 < fadeAt) { bed.gain.setValueAtTime(duck, ve); bed.gain.linearRampToValueAtTime(1, ve + .4); } else endLevel = duck;
  }
  bed.gain.setValueAtTime(endLevel, fadeAt); bed.gain.linearRampToValueAtTime(0.0001, o.T);
  if (o.music) {
    var ms = oc.createBufferSource(), mg = oc.createGain(); ms.buffer = o.music.buffer; mg.gain.setValueAtTime(0, 0); mg.gain.linearRampToValueAtTime(.9, .06);
    ms.connect(mg); mg.connect(bed); ms.start(0, o.music.offset || 0);
  }
  if (o.beat) makeBeat(oc, bed, o.beat.bpm, o.T, o.beat.R, o.beat.hookEnd);
  if (o.voice) {
    var vs = oc.createBufferSource(), hp = oc.createBiquadFilter(), vg = oc.createGain(); vs.buffer = o.voice.buffer; hp.type = 'highpass'; hp.frequency.value = 85; vg.gain.value = 1.15;
    vs.connect(hp); hp.connect(vg); vg.connect(comp); vs.start(o.voiceStart || 0);
  }
  return oc.startRendering();
}

/* ═══════════════════════ 6 · RENDER → MP4 (WebCodecs) ═══════════════════════ */
async function pickVideoConfig() {
  if (typeof VideoEncoder === 'undefined') throw new Error('Tu navegador no puede crear video. Abre INKBOT en Chrome actualizado.');
  var opts = [['avc1.640028', 7e6], ['avc1.4D0028', 6e6], ['avc1.42C028', 5e6], ['avc1.42E028', 5e6]];
  for (var i = 0; i < opts.length; i++) {
    var c = { codec: opts[i][0], width: W, height: H, bitrate: opts[i][1], framerate: FPS, avc: { format: 'avc' }, latencyMode: 'quality', bitrateMode: 'variable' };
    try { var s = await VideoEncoder.isConfigSupported(c); if (s.supported) return c; } catch (e) {}
    try { delete c.bitrateMode; var s2 = await VideoEncoder.isConfigSupported(c); if (s2.supported) return c; } catch (e) {}
  }
  throw new Error('Este celular no permite crear video H.264 desde el navegador.');
}
async function pickAudioConfig() {
  if (typeof AudioEncoder === 'undefined') return null;
  var opts = [{ codec: 'mp4a.40.2', mux: 'aac' }, { codec: 'opus', mux: 'opus' }];
  for (var i = 0; i < opts.length; i++) {
    var c = { codec: opts[i].codec, sampleRate: SR, numberOfChannels: 2, bitrate: 160000 };
    try { var s = await AudioEncoder.isConfigSupported(c); if (s.supported) return { cfg: c, mux: opts[i].mux }; } catch (e) {}
  }
  return null;
}
async function render(edl, audioBuf, onp, preview) {
  var vcfg = await pickVideoConfig(), acfg = audioBuf ? await pickAudioConfig() : null, warn = '';
  if (audioBuf && !acfg) warn = 'Tu navegador no pudo meter el audio: el video salió sin sonido.';
  if (acfg && acfg.mux === 'opus') warn = 'El audio salió en formato Opus; si Instagram no lo acepta, usa Chrome actualizado.';
  if (typeof Mp4Muxer === 'undefined') throw new Error('Falta el empaquetador MP4 (revisa tu conexión y recarga).');
  var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  var ctx = cv.getContext('2d', { alpha: false });
  var muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS },
    audio: acfg ? { codec: acfg.mux, numberOfChannels: 2, sampleRate: SR } : undefined, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  var encErr = null;
  // Audio primero (es instantáneo)
  if (acfg) {
    var aenc = new AudioEncoder({ output: function (c, m) { muxer.addAudioChunk(c, m); }, error: function (e) { encErr = e; } });
    aenc.configure(acfg.cfg);
    var L = audioBuf.length, c0 = audioBuf.getChannelData(0), c1 = audioBuf.getChannelData(1), N = 2048;
    for (var off = 0; off < L; off += N) {
      var n = Math.min(N, L - off), data = new Float32Array(n * 2);
      data.set(c0.subarray(off, off + n), 0); data.set(c1.subarray(off, off + n), n);
      var ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / SR * 1e6), data: data });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush(); aenc.close();
  }
  var venc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { encErr = e; } });
  venc.configure(vcfg);
  var total = Math.round(edl.T * FPS), fi = 0, t0 = performance.now(), slow = 0;
  emit._fi = function () { return fi; };
  async function drain() { while (venc.encodeQueueSize > 2) await sleep(8); }
  function emit(el) {
    if (encErr) throw encErr;
    var t = fi / FPS, a = performance.now();
    drawFrame(ctx, edl, t, el);
    var dt = performance.now() - a; if (useFilter && dt > 45 && ++slow > 20) useFilter = false;
    var vf = new VideoFrame(cv, { timestamp: Math.round(fi * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(vf, { keyFrame: fi % (FPS * 2) === 0 }); vf.close(); fi++;
    if (preview && fi % 6 === 0) { var pc = preview.getContext('2d'); pc.drawImage(cv, 0, 0, preview.width, preview.height); }
    if (onp && fi % 10 === 0) onp(fi / total, 'Creando video ' + Math.round(fi / FPS) + 's / ' + Math.round(edl.T) + 's');
  }
  var cur = null, curId = null;
  for (var si = 0; si < edl.shots.length; si++) {
    var s = edl.shots[si], endF = si === edl.shots.length - 1 ? total : Math.min(total, Math.round(s.outEnd * FPS));
    if (fi >= endF) continue;
    if (s.kind === 'image') {
      while (fi < endF) { emit(s.clip.el); if (venc.encodeQueueSize > 6) await drain(); if (fi % 15 === 0) await sleep(0); }
      continue;
    }
    if (curId !== s.clip.id) {
      release(cur); cur = null; curId = null;
      try { cur = await openVideo(s.clip); curId = s.clip.id; } catch (e) { cur = null; }
    }
    if (!cur) { // respaldo: cuadro fijo con movimiento suave
      var still = s.clip.still;
      while (fi < endF) { emit(still || null); if (venc.encodeQueueSize > 6) await drain(); if (fi % 15 === 0) await sleep(0); }
      continue;
    }
    await seek(cur, s.srcStart);
    cur.playbackRate = clamp(s.speed, .5, 4);
    await playShot(cur, s, endF, emit, venc, drain);
  }
  release(cur);
  while (fi < total) emit(null);
  await venc.flush(); venc.close();
  if (encErr) throw encErr;
  muxer.finalize();
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), warn: warn, secs: (performance.now() - t0) / 1000 };
}
// Reproduce la toma en tiempo real y saca cada frame según el tiempo real del video (no se desincroniza)
function playShot(v, s, endF, emit, venc, drain) {
  return new Promise(function (resolve, reject) {
    var lastCT = -1, stuck = 0, finished = false, busy = false, useRVFC = 'requestVideoFrameCallback' in v;
    function fin() {
      if (finished) return; finished = true; v.pause();
      try { while (getFi() < endF) emit(v); } catch (e) { return reject(e); }
      resolve();
    }
    function getFi() { return emit._fi(); }
    async function tick() {
      if (finished || busy) return; busy = true;
      try {
        var local = (v.currentTime - s.srcStart) / s.speed, tOut = s.outStart + local;
        while (getFi() < endF && getFi() / FPS <= tOut + 1e-4) {
          emit(v);
          if (venc.encodeQueueSize > 6) { v.pause(); await drain(); if (!finished) v.play().catch(function () {}); }
        }
        if (getFi() >= endF || v.ended) { busy = false; return fin(); }
        if (Math.abs(v.currentTime - lastCT) < 1e-4) { if (++stuck > 90) { busy = false; return fin(); } } else stuck = 0;
        lastCT = v.currentTime;
      } catch (e) { finished = true; v.pause(); return reject(e); }
      busy = false; schedule();
    }
    function schedule() { if (finished) return; if (useRVFC && !v.paused) { var done = false; v.requestVideoFrameCallback(function () { if (!done) { done = true; tick(); } }); setTimeout(function () { if (!done) { done = true; tick(); } }, 60); } else setTimeout(tick, 16); }
    v.play().then(function () { tick(); }).catch(function () {
      // si no deja reproducir, avanza buscando cuadro por cuadro (más lento pero funciona)
      (async function () {
        try {
          while (getFi() < endF) { var tl = getFi() / FPS - s.outStart; await seek(v, s.srcStart + tl * s.speed); emit(v); if (venc.encodeQueueSize > 6) await drain(); }
          resolve();
        } catch (e) { reject(e); }
      })();
    });
  });
}

/* ═══════════════════════ 7 · IA: plan del reel, ganchos y clonar virales ═══════════════════════ */
function ai() { return window.INKAI && window.INKAI.json ? window.INKAI : null; }
function history() { return lsGet(LS.hist, []); }
function perfSummary() {
  var h = history().filter(function (x) { return x.rating || x.views; });
  if (!h.length) return '';
  h.sort(function (a, b) { return score(b) - score(a); });
  var top = h.slice(0, 4).map(function (x) { return '"' + x.hook + '" (' + (TPL[x.tpl] ? TPL[x.tpl].name : x.tplName) + (x.views ? ', ' + x.views + ' vistas' : '') + ')'; });
  var bad = h.filter(function (x) { return score(x) < 0; }).slice(0, 3).map(function (x) { return '"' + x.hook + '"'; });
  return '\nLO QUE MEJOR LE HA FUNCIONADO: ' + top.join('; ') + (bad.length ? '\nLO QUE NO FUNCIONÓ (evítalo): ' + bad.join('; ') : '');
}
function score(x) { return (x.rating || 0) * 1.5 + (x.views ? Math.log10(1 + x.views) : 0); }
function materialSummary() {
  var v = S.clips.filter(function (c) { return c.kind === 'video'; }), p = S.clips.filter(function (c) { return c.kind === 'image'; });
  var secs = v.reduce(function (a, c) { return a + (c.dur || 0); }, 0);
  return v.length + ' clips de video (' + Math.round(secs) + ' s en total)' + (p.length ? ' y ' + p.length + ' foto(s) del resultado' : ' sin foto final');
}
async function aiPlan(tpl, voiceWanted, chosenHook) {
  var fb = localPlan(tpl, voiceWanted, chosenHook), I = ai();
  if (!I) return fb;
  var days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var p = 'TAREA: planea un REEL VIRAL de tatuaje para Instagram Reels y TikTok.\n'
    + 'TATUADOR: ' + (CFG.handle || '') + ', estilo ' + (CFG.estilo || '') + ', de ' + (CFG.ciudad || '') + ' (México). Escribe en español de México, natural, nada de "IA".\n'
    + 'TATUAJE: ' + (S.desc ? S.desc : '(no lo describió: habla del tatuaje sin inventar el diseño exacto ni datos del cliente)') + '\n'
    + 'MATERIAL: ' + materialSummary() + '\n'
    + 'FORMATO: ' + tpl.name + ' — ' + tpl.desc + '\n'
    + (tpl.custom && tpl.lines && tpl.lines.length ? 'TEXTOS DE REFERENCIA DEL VIRAL CLONADO: ' + tpl.lines.join(' | ') + '\n' : '')
    + (chosenHook ? 'GANCHO ELEGIDO (úsalo tal cual): ' + chosenHook + '\n' : 'Ejemplos de ganchos de este formato: ' + tpl.hooks.map(function (x) { return fillVars(x); }).join(' | ') + '\n')
    + 'HOY ES: ' + days[new Date().getDay()] + perfSummary() + '\n\n'
    + 'REGLAS:\n- El gancho es lo que se ve en el PRIMER segundo: máximo 8 palabras, que dé curiosidad o emoción. Marca 1 o 2 palabras clave con *asteriscos*.\n'
    + '- Nada de introducciones lentas. Nada de datos inventados: si mencionas significados o historia, que sean verídicos.\n'
    + (voiceWanted ? '- "narracion": guion para voz en off de ' + (tpl.base === 'marca' ? '20 a 35' : '20 a 45') + ' segundos (unas 2.6 palabras por segundo). La PRIMERA frase repite la idea del gancho. Frases cortas. Termina invitando a agendar o comentar.\n' : '- "narracion": "" (este formato va sin voz).\n')
    + (tpl.base === 'pov' ? '- "lineas": 3 o 4 textos cortos tipo POV que cuentan la historia en orden (máx 9 palabras cada uno); el último va con el resultado.\n'
      : tpl.base === 'etapas' ? '- "lineas": nombres cortos de cada etapa en orden (ej. PLANTILLA, LÍNEA, SOMBRA, COLOR).\n'
      : '- "lineas": 1 texto corto para el resultado final (máx 6 palabras).\n')
    + (tpl.base === 'encuesta' ? '- "pregunta": pregunta final corta para que comenten.\n' : '')
    + '- "segundos": duración ideal del reel para este formato hoy (número).\n'
    + '- "caption": 2 a 4 líneas con emojis, gancho + valor + llamada a agendar por DM.\n- "hashtags": 12 a 16, mezcla de grandes, de nicho (' + (CFG.estilo || '') + ') y locales (' + (CFG.ciudad || '') + ').\n'
    + '- "dia" y "hora": mejor día y hora para publicarlo (zona centro de México) en los próximos 7 días.\n'
    + '- "audio": qué tipo de audio en tendencia elegir en Instagram/TikTok para este reel (estilo, energía, si debe tener un golpe fuerte) en 1 frase.\n'
    + '- "cierre": texto final corto de llamada a la acción (máx 5 palabras).\n\n'
    + 'Responde SOLO JSON con estas claves: gancho, lineas, narracion, pregunta, segundos, caption, hashtags, dia, hora, audio, cierre.';
  try {
    var j = await withTimeout(I.json(p, { maxTokens: 1400, temperature: .9, verify: tpl.base === 'significado' }), 120000, 'La IA tardó demasiado');
    var tags = Array.isArray(j.hashtags) ? j.hashtags : String(j.hashtags || '').split(/[\s,]+/);
    tags = tags.map(function (x) { x = String(x).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return x ? (x[0] === '#' ? x : '#' + x) : ''; }).filter(Boolean);
    return {
      hook: chosenHook || String(j.gancho || fb.hook).trim(), lines: Array.isArray(j.lineas) ? j.lineas.map(String) : (j.lineas ? [String(j.lineas)] : fb.lines),
      narration: voiceWanted ? String(j.narracion || fb.narration).trim() : '', question: String(j.pregunta || '').trim() || fb.question,
      seconds: +j.segundos || fb.seconds, caption: String(j.caption || fb.caption).trim(), hashtags: tags.length ? tags : fb.hashtags,
      day: String(j.dia || fb.day), time: String(j.hora || fb.time), audioTip: String(j.audio || fb.audioTip), endText: String(j.cierre || '').trim() || fb.endText, ai: true
    };
  } catch (e) { fb.aiError = e.message; return fb; }
}
function localPlan(tpl, voiceWanted, chosenHook) {
  var r = Math.random, hooks = tpl.hooks.map(function (x) { return fillVars(x); });
  var hook = chosenHook || hooks[Math.floor(r() * hooks.length)];
  var d = S.desc || 'este tatuaje', city = (CFG.ciudad || '').split(',')[0];
  var narr = voiceWanted ? (hook.replace(/\*/g, '') + '. Este es ' + d + '. Cada línea y cada sombra está pensada para que dure toda la vida. Trabajo ' + (CFG.estilo || 'tatuaje') + ' desde ' + city + '. Si quieres el tuyo, mándame mensaje y lo diseñamos juntos.') : '';
  var tg = ['#tattoo', '#tatuajes', '#tattooartist', '#tattoomexico', '#inked', '#' + (CFG.estilo || 'tattoo').normalize('NFD').replace(/[^a-z]/gi, '').toLowerCase() + 'tattoo', '#neojapanese', '#japanesetattoo', '#colortattoo', '#tatuador', '#' + city.replace(/\s/g, '').toLowerCase(), '#veracruz', '#tattooideas', '#reels'];
  return { hook: hook, lines: tpl.base === 'etapas' ? defaultStages(Math.min(5, Math.max(1, S.clips.filter(function (c) { return c.kind === 'video'; }).length))) : tpl.base === 'pov' ? ['Le dije: confía en mí', 'Horas de línea y color', 'Cada detalle a mano', '…y así quedó 🔥'] : ['Resultado final ✨'],
    narration: narr, question: tpl.base === 'encuesta' ? hook : '', seconds: Math.round((tpl.dur[0] + tpl.dur[1]) / 2),
    caption: hook.replace(/\*/g, '') + ' 🔥\n' + (S.desc ? S.desc + '.\n' : '') + 'Agenda tu cita por DM 📩 ' + (CFG.handle || ''), hashtags: tg,
    day: ['martes', 'miércoles', 'jueves'][Math.floor(r() * 3)], time: '7:00 p. m.', audioTip: 'Un audio en tendencia con golpe fuerte que coincida con el final.', endText: CFG.cta, ai: false };
}
async function aiHooks() {
  var I = ai(), tpl = getTpl(S.tpl === 'auto' ? 'revelacion' : S.tpl);
  if (!I) return tpl.hooks.map(function (x) { return fillVars(x); });
  var p = 'TAREA: escribe 6 GANCHOS virales distintos para el primer segundo de un reel de tatuaje.\nTatuaje: ' + (S.desc || 'un tatuaje ' + CFG.estilo) + '. Tatuador de ' + CFG.ciudad + ', estilo ' + CFG.estilo + '.\nFormato: ' + tpl.name + ' (' + tpl.desc + ').\n'
    + 'Cada gancho: máximo 8 palabras, español de México, que dé curiosidad, emoción o polémica sana. Mezcla tipos: POV, pregunta, "esperen al final", dato verídico, reto. Marca la palabra clave con *asteriscos*.' + perfSummary() + '\nResponde SOLO JSON: {"ganchos":["…"]}';
  var j = await I.json(p, { maxTokens: 600, temperature: 1, verify: false });
  var g = (j.ganchos || j.hooks || []).map(String).filter(Boolean).slice(0, 8);
  return g.length ? g : tpl.hooks.map(function (x) { return fillVars(x); });
}
async function aiClone(link, what) {
  var I = ai(); if (!I) throw new Error('La IA no está disponible');
  var p = 'TAREA: convierte la descripción de un reel VIRAL en una plantilla reutilizable para reels de tatuaje.\nLINK (solo referencia): ' + (link || '—') + '\nQUÉ PASA EN EL VIDEO (lo describe el tatuador): ' + what + '\n'
    + 'Elige la base que más se parezca: revelacion (proceso rápido y explota el final), pov (textos POV), etapas (etiquetas por etapa), narrado (voz cuenta la historia), significado (voz explica un símbolo), encuesta (pregunta final), asmr (tomas lentas satisfactorias), marca (habla del tatuador).\n'
    + 'Responde SOLO JSON: {"nombre":"nombre corto de la plantilla","base":"una de las bases","gancho":"gancho adaptado a tatuajes, máx 8 palabras, palabra clave con *asteriscos*","lineas":["textos en pantalla adaptados"],"ritmo":"rapido|medio|lento","voz":true|false,"segundos":número,"notas":"1 frase de qué hace este formato"}';
  var j = await I.json(p, { maxTokens: 700, temperature: .7, verify: false });
  var base = BASES.indexOf(String(j.base)) >= 0 ? String(j.base) : 'revelacion';
  return { id: 'c_' + uid(), name: String(j.nombre || 'Viral clonado').slice(0, 40), base: base, hook: String(j.gancho || ''), lines: Array.isArray(j.lineas) ? j.lineas.map(String).slice(0, 5) : [],
    pace: String(j.ritmo || 'medio'), voice: !!j.voz, seconds: clamp(+j.segundos || 15, 8, 60), notes: String(j.notas || ''), link: link || '' };
}

/* ═══════════════ 7b · CLONAR DESDE EL VIDEO VIRAL (cortes + audio) ═══════════════ */
var IDB = {
  db: function () { if (this._p) return this._p; this._p = new Promise(function (res, rej) { var r = indexedDB.open('inkbot-reels', 1); r.onupgradeneeded = function () { r.result.createObjectStore('audio'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); return this._p; },
  op: function (mode, fn) { return this.db().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction('audio', mode), q = fn(t.objectStore('audio')); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); }); },
  get: function (k) { return this.op('readonly', function (s) { return s.get(k); }); },
  set: function (k, v) { return this.op('readwrite', function (s) { return s.put(v, k); }); },
  del: function (k) { return this.op('readwrite', function (s) { return s.delete(k); }).catch(function () {}); }
};
function toWav(buf, maxSec) {
  var n = Math.min(buf.length, Math.floor((maxSec || 90) * buf.sampleRate)), ch = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate;
  var ab = new ArrayBuffer(44 + n * ch * 2), v = new DataView(ab);
  function str(o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); }
  str(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * ch * 2, true);
  var cd = []; for (var c = 0; c < ch; c++) cd.push(buf.getChannelData(c));
  for (var i = 0, o = 44; i < n; i++) for (var k = 0; k < ch; k++, o += 2) { var x = clamp(cd[k][i], -1, 1); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return ab;
}
// Reproduce el viral (sin sonido) y detecta cada corte comparando cuadro contra cuadro
function detectCuts(file, onp) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file), v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.src = url;
    var cv = document.createElement('canvas'), cw = 48, chh = 86; cv.width = cw; cv.height = chh;
    var ctx = cv.getContext('2d', { willReadFrequently: true }), prevH = null, prevG = null, diffs = [], done = false;
    function frame() {
      ctx.drawImage(v, 0, 0, cw, chh);
      var d = ctx.getImageData(0, 0, cw, chh).data, hst = new Float32Array(48), g = new Float32Array(cw * chh);
      for (var i = 0, j = 0; i < d.length; i += 4, j++) { hst[d[i] >> 4]++; hst[16 + (d[i + 1] >> 4)]++; hst[32 + (d[i + 2] >> 4)]++; g[j] = (d[i] + d[i + 1] + d[i + 2]) / 3; }
      if (prevH) {
        var hd = 0, pd = 0, N = cw * chh;
        for (var k = 0; k < 48; k++) hd += Math.abs(hst[k] - prevH[k]); hd /= (N * 6);
        for (var q = 0; q < N; q++) pd += Math.abs(g[q] - prevG[q]); pd /= (N * 255);
        diffs.push({ t: v.currentTime, d: hd * .6 + pd * 1.4 });
      }
      prevH = hst; prevG = g;
    }
    function finish() {
      if (done) return; done = true; v.pause(); URL.revokeObjectURL(url);
      var dur = v.duration || (diffs.length ? diffs[diffs.length - 1].t : 0);
      var vals = diffs.map(function (x) { return x.d; }), med = pct(vals, .5), hi = pct(vals, .97);
      var thr = Math.max(.09, med * 4, Math.min(hi * .6, .25)), cuts = [0], last = 0;
      diffs.forEach(function (x, i) {
        var prev = diffs[i - 1] ? diffs[i - 1].d : 0, next = diffs[i + 1] ? diffs[i + 1].d : 0;
        if (x.d > thr && x.d >= prev && x.d >= next && x.t - last > .28) { cuts.push(x.t); last = x.t; }
      });
      var shots = []; for (var c = 1; c <= cuts.length; c++) { var end = c < cuts.length ? cuts[c] : dur; if (end - cuts[c - 1] > .05) shots.push(+(end - cuts[c - 1]).toFixed(3)); }
      resolve({ dur: dur, shots: shots });
    }
    v.onloadedmetadata = function () {
      if (!isFinite(v.duration) || v.duration <= 0) { reject(new Error('No se pudo leer el video')); return; }
      if (v.duration > 90) { reject(new Error('El video viral debe durar menos de 90 s')); return; }
      v.playbackRate = 2;
      var useR = 'requestVideoFrameCallback' in v;
      function loop() { if (done) return; frame(); if (onp) onp(v.currentTime / v.duration); if (v.ended) return finish(); if (useR) v.requestVideoFrameCallback(loop); else setTimeout(loop, 20); }
      v.onended = function () { setTimeout(finish, 100); };
      v.play().then(function () { if (useR) v.requestVideoFrameCallback(loop); else loop(); }).catch(function () { reject(new Error('El navegador no dejó reproducir el video')); });
    };
    v.onerror = function () { reject(new Error('El navegador no pudo abrir ese video')); };
    setTimeout(function () { if (!done) finish(); }, 200000);
  });
}
async function cloneFromVideo(file, link, what, onp) {
  onp && onp('Copiando los cortes del viral…');
  var cut = await detectCuts(file, function (f) { onp && onp('Copiando los cortes del viral… ' + Math.round(f * 100) + '%'); });
  if (cut.shots.length < 3) {
    // pocos cortes detectados: arma el ritmo con el beat del audio
    cut.fewCuts = true;
  }
  onp && onp('Copiando el audio y el ritmo…');
  var buf = null, beats = null;
  try { buf = await decode(await file.arrayBuffer()); beats = detectBeats(buf); } catch (e) { buf = null; }
  if (cut.fewCuts) {
    var bi = beats ? 60 / beats.bpm : .6, t = 0, sh = []; while (t < cut.dur - .1) { var d = Math.min(bi * 2, cut.dur - t); sh.push(d); t += d; } cut.shots = sh;
  }
  var id = 'c_' + uid(), info = { name: '', base: 'revelacion', hook: '', lines: [], notes: '' };
  if (what && ai()) { try { var t2 = await aiClone(link, what); info = { name: t2.name, base: t2.base, hook: t2.hook, lines: t2.lines, notes: t2.notes }; } catch (e) {} }
  if (buf) await IDB.set(id, toWav(buf, cut.dur + .5));
  var n = cut.shots.length;
  return { id: id, name: info.name || ('Viral · ' + n + ' cortes · ' + Math.round(cut.dur) + ' s'), base: BASES.indexOf(info.base) >= 0 ? info.base : 'revelacion',
    hook: info.hook, lines: info.lines, notes: info.notes || ('Copia los ' + n + ' cortes exactos' + (buf ? ' y el audio' : '') + ' del viral' + (beats ? ' (' + Math.round(beats.bpm) + ' BPM)' : '') + '.'),
    cuts: cut.shots, dur: +cut.dur.toFixed(2), hasAudio: !!buf, voice: false, link: link || '' };
}

/* ═══════════════════════ 8 · ORQUESTA: crear el reel ═══════════════════════ */
function autoTemplate(exclude) {
  var keys = BASES.concat(customTpls().map(function (c) { return c.id; })).filter(function (k) { return exclude.indexOf(k) < 0; });
  var h = history(), recent = h.slice(0, 2).map(function (x) { return x.tpl; });
  var vids = S.clips.filter(function (c) { return c.kind === 'video'; }), pics = S.clips.filter(function (c) { return c.kind === 'image'; });
  var secs = vids.reduce(function (a, c) { return a + (c.dur || 0); }, 0), r = Math.random;
  var w = keys.map(function (k) {
    var t = getTpl(k), b = t.base, x = 1;
    var mine = h.filter(function (e) { return e.tpl === k && (e.rating || e.views); });
    if (mine.length) x += mine.reduce(function (a, e) { return a + score(e); }, 0) / mine.length * .5;
    if (recent.indexOf(k) >= 0) x *= .35;
    if (b === 'revelacion' && pics.length) x += .6;
    if (b === 'etapas' && vids.length >= 3) x += .5; if (b === 'etapas' && vids.length < 2) x = .05;
    if ((b === 'narrado' || b === 'marca') && secs > 40) x += .3;
    if (b === 'significado') x *= S.desc ? 1.3 : .25;
    if (t.custom) x += .4;
    return Math.max(.02, x);
  });
  var tot = w.reduce(function (a, b) { return a + b; }, 0), pick = r() * tot;
  for (var i = 0; i < keys.length; i++) { pick -= w[i]; if (pick <= 0) return keys[i]; }
  return keys[0] || 'revelacion';
}
async function prepareMusic() {
  if (!S.musicFile) return null;
  if (S.music && S.music.file === S.musicFile) return S.music;
  var ab = await S.musicFile.arrayBuffer(), buf = await decode(ab), bt = detectBeats(buf);
  S.music = { file: S.musicFile, buffer: buf, beats: bt };
  return S.music;
}
async function createOne(tplKey, idx, step) {
  var tpl = getTpl(tplKey), voiceWanted = tpl.cuts ? false : CFG.voz === 'off' ? false : (tpl.voice || CFG.voz === 'siempre');
  step('plan', 'La IA está escribiendo el gancho, textos y caption…');
  var hookChoice = S.hook && idx === 0 ? S.hook : '';
  var plan = await aiPlan(tpl, voiceWanted, hookChoice);
  var voice = null, voiceErr = '';
  if (voiceWanted && plan.narration) {
    step('voz', 'Generando la voz…');
    try { voice = await narrate(plan.narration, function (m) { step('voz', m); }); } catch (e) { voiceErr = 'No se pudo generar la voz (' + e.message + '). El reel salió con textos en pantalla; revisa tu internet la primera vez (se descarga la voz).'; }
  }
  step('arma', 'Armando cortes al ritmo…');
  var vids = S.clips.filter(function (c) { return c.kind === 'video'; });
  var T = clamp(plan.seconds || tpl.dur[0], tpl.dur[0], tpl.dur[1]), voiceStart = .35;
  if (voice) T = clamp(voice.dur + voiceStart + 2.6, 12, 75);
  else if (voiceWanted) T = Math.min(T, 22); // sin voz, un reel narrado largo aburre
  if (!vids.length) T = Math.min(T, 12);
  if (tpl.cuts && vids.length) T = tpl.cloneDur;
  var music = null, grid, bpm = tpl.bpm, offset = 0, beat = null;
  if (S.audio === 'clone' && tpl.hasAudio) {
    var ab = await IDB.get(tpl.key);
    if (ab) { var cb = await decode(ab); music = { buffer: cb, beats: detectBeats(cb) }; bpm = music.beats.bpm; grid = music.beats.beats.slice(); if (!grid.length || grid[0] > .05) grid.unshift(0); }
  }
  if (S.audio === 'mine') {
    music = await prepareMusic();
    if (music) {
      bpm = music.beats.bpm;
      var revealGuess = T - clamp(T * .28, 2.6, 6);
      offset = Math.max(0, music.beats.drop - revealGuess);
      if (music.buffer.duration - offset < T) offset = Math.max(0, music.buffer.duration - T);
      if (!voice && music.buffer.duration < T) T = Math.max(8, music.buffer.duration - .2);
      grid = music.beats.beats.map(function (b) { return b - offset; }).filter(function (b) { return b >= 0; });
      if (grid.length < 4) grid = gridFor(bpm, T, 0); else if (grid[0] > 0.05) grid.unshift(0);
    }
  }
  if (!grid) grid = gridFor(bpm, T, 0);
  var edl = buildEDL({ tpl: tpl, T: T, grid: grid, plan: plan, words: voice ? voice.words : null, voiceStart: voiceStart, seed: Date.now() + idx * 977, clips: S.clips });
  if (S.audio === 'beat') beat = { bpm: bpm, R: edl.reveal, hookEnd: edl.overlays[0] ? edl.overlays.filter(function (o) { return o.type === 'hook'; })[0].to : 2 };
  R._t.lastEDL = edl.shots.map(function (x) { return [x.role, x.clip.name, +x.outDur.toFixed(2), +(x.srcStart || 0).toFixed(2), +(x.speed || 1).toFixed(2)]; });
  step('audio', 'Mezclando audio…');
  var audio = await buildAudio({ T: T, voice: voice, voiceStart: voiceStart, music: music ? { buffer: music.buffer, offset: offset } : null, beat: beat });
  step('render', 'Creando el video (deja la app abierta)…');
  var prev = $('#rv-live');
  var out = await render(edl, audio, function (f, m) { step('render', m, f); }, prev);
  var res = { id: uid(), date: Date.now(), tpl: tpl.key, tplName: tpl.name, emoji: tpl.emoji, hook: plan.hook, plan: plan, blob: out.blob, url: URL.createObjectURL(out.blob), T: T,
    warn: [out.warn, voiceErr, plan.aiError ? 'La IA no respondió (' + plan.aiError + '); usé textos de la plantilla.' : ''].filter(Boolean).join(' '), voice: voice ? voice.engine : '', audioMode: S.audio, secs: out.secs };
  var h = history(); h.unshift({ id: res.id, date: res.date, tpl: res.tpl, tplName: res.tplName, hook: res.hook, T: Math.round(T), rating: 0, views: 0 }); lsSet(LS.hist, h.slice(0, 80));
  return res;
}

/* ═══════════════════════ 9 · INTERFAZ (asistente paso a paso) ═══════════════════════ */
var CSS = '\
#reels-app{position:fixed;inset:0;z-index:99990;background:#0b0b0b;color:#f2f2f2;display:none;flex-direction:column;font-family:"DM Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}\
#reels-app.show{display:flex}\
#reels-app *{box-sizing:border-box}\
.rv-top{flex:none;display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #1b1b1b}\
.rv-ib{width:40px;height:40px;border-radius:12px;border:1px solid #232323;background:#131313;color:#ddd;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none}\
.rv-tt{flex:1;text-align:center;font-size:15px;font-weight:500;letter-spacing:.3px}\
.rv-steps{flex:none;display:flex;gap:6px;padding:12px 18px 4px;max-width:560px;width:100%;margin:0 auto}\
.rv-steps div{flex:1;text-align:center;font-size:11px;color:#666}\
.rv-steps div i{display:block;height:3px;border-radius:3px;background:#222;margin-bottom:6px}\
.rv-steps div.on{color:#E8B64A}.rv-steps div.on i,.rv-steps div.ok i{background:#E8B64A}.rv-steps div.ok{color:#aaa}\
.rv-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}\
.rv-page{max-width:560px;margin:0 auto;padding:18px 18px 28px;display:none}.rv-page.on{display:block}\
.rv-h1{font-size:24px;font-weight:500;margin:6px 0 6px;letter-spacing:-.2px}\
.rv-p{font-size:14px;color:#8d8d8d;line-height:1.5;margin:0 0 18px}\
.rv-up{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1.5px dashed #333;border-radius:18px;padding:28px 12px;cursor:pointer;color:#bbb;text-align:center}\
.rv-up b{font-size:16px;font-weight:500;color:#f2f2f2}.rv-up span{font-size:12.5px;color:#777}.rv-up .pl{width:46px;height:46px;border-radius:50%;background:#E8B64A;color:#000;font-size:26px;display:flex;align-items:center;justify-content:center;margin-bottom:4px}\
.rv-thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}\
.rv-th{position:relative;aspect-ratio:9/16;border-radius:12px;overflow:hidden;background:#151515}\
.rv-th img{width:100%;height:100%;object-fit:cover;display:block}\
.rv-th .n{position:absolute;left:6px;top:6px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.65);font-size:11px;display:flex;align-items:center;justify-content:center}\
.rv-th .k{position:absolute;left:6px;bottom:6px;font-size:10.5px;background:rgba(0,0,0,.65);padding:2px 6px;border-radius:6px}\
.rv-th .x{position:absolute;right:5px;top:5px;width:24px;height:24px;border-radius:50%;border:none;background:rgba(0,0,0,.65);color:#fff;font-size:12px;cursor:pointer}\
.rv-th .mv{position:absolute;right:5px;bottom:5px;display:flex;gap:3px}.rv-th .mv button{width:22px;height:22px;border-radius:6px;border:none;background:rgba(0,0,0,.65);color:#fff;font-size:11px;cursor:pointer;padding:0}\
.rv-th.load{display:flex;align-items:center;justify-content:center;color:#555;font-size:12px}\
.rv-lb{font-size:12.5px;color:#8d8d8d;margin:22px 0 8px}\
.rv-in{width:100%;background:#131313;border:1px solid #242424;border-radius:12px;color:#f2f2f2;padding:13px 14px;font:15px "DM Sans",sans-serif;outline:none}.rv-in:focus{border-color:#E8B64A}\
.rv-row{display:flex;gap:8px;align-items:center}\
.rv-list{display:flex;flex-direction:column;gap:8px}\
.rv-it{display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid #222;border-radius:14px;background:#121212;cursor:pointer;position:relative}\
.rv-it.on{border-color:#E8B64A;background:#17140c}\
.rv-it .e{font-size:22px;width:30px;text-align:center;flex:none}\
.rv-it .t{flex:1;min-width:0}.rv-it .t b{display:block;font-size:15px;font-weight:500}.rv-it .t span{display:block;font-size:12.5px;color:#868686;line-height:1.4;margin-top:2px}\
.rv-it .r{width:20px;height:20px;border-radius:50%;border:1.5px solid #444;flex:none}.rv-it.on .r{border:6px solid #E8B64A}\
.rv-it .del{position:absolute;right:42px;top:50%;transform:translateY(-50%);border:none;background:none;color:#666;font-size:14px;cursor:pointer}\
.rv-tag{display:inline-block;font-style:normal;font-size:10px;color:#000;background:#E8B64A;border-radius:6px;padding:1px 6px;margin-left:6px;vertical-align:2px;font-weight:600}\
.rv-more{margin-top:14px;border:1px solid #222;border-radius:14px;background:#101010}\
.rv-more>summary{list-style:none;cursor:pointer;padding:14px;font-size:14px;color:#cfcfcf;display:flex;justify-content:space-between}.rv-more>summary::-webkit-details-marker{display:none}.rv-more>summary:after{content:"+";color:#777}.rv-more[open]>summary:after{content:"–"}\
.rv-more .in{padding:0 14px 16px}\
.rv-seg{display:flex;background:#131313;border:1px solid #232323;border-radius:12px;padding:3px;gap:3px}.rv-seg button{flex:1;border:none;background:none;color:#999;padding:10px 4px;border-radius:9px;font:13.5px "DM Sans",sans-serif;cursor:pointer}.rv-seg button.on{background:#E8B64A;color:#000;font-weight:600}\
.rv-chips{display:flex;flex-wrap:wrap;gap:6px}.rv-chip{border:1px solid #262626;background:#131313;color:#ccc;border-radius:20px;padding:8px 12px;font:13px "DM Sans",sans-serif;cursor:pointer;text-align:left}.rv-chip.on{border-color:#E8B64A;color:#fff}.rv-chip em{color:#E8B64A;font-style:normal}\
.rv-link{background:none;border:none;color:#E8B64A;font:13.5px "DM Sans",sans-serif;padding:8px 0;cursor:pointer}\
.rv-foot{flex:none;border-top:1px solid #1b1b1b;padding:12px 16px calc(12px + env(safe-area-inset-bottom));display:flex;gap:10px;max-width:560px;width:100%;margin:0 auto}\
.rv-b{flex:1;border:none;border-radius:14px;padding:15px;font:600 15.5px "DM Sans",sans-serif;cursor:pointer;background:#E8B64A;color:#000}\
.rv-b:disabled{opacity:.35;cursor:default}.rv-b.g{background:#1a1a1a;color:#ddd;flex:0 0 auto;padding:15px 20px}\
.rv-b.full{width:100%;flex:none}\
.rv-mic{width:48px;height:48px;border-radius:12px;border:1px solid #242424;background:#131313;color:#E8B64A;font-size:18px;cursor:pointer;flex:none}.rv-mic.on{background:#CC0000;color:#fff}\
.rv-make{text-align:center}\
.rv-live{width:180px;height:320px;border-radius:16px;background:#000;display:block;margin:8px auto 18px;border:1px solid #222}\
.rv-bar{height:4px;background:#1f1f1f;border-radius:4px;overflow:hidden;margin:0 auto;max-width:320px}.rv-bar i{display:block;height:100%;width:0;background:#E8B64A;transition:width .3s}\
.rv-chk{list-style:none;padding:0;margin:18px auto 0;max-width:320px;text-align:left}.rv-chk li{font-size:14px;color:#555;padding:6px 0;display:flex;gap:10px;align-items:center}.rv-chk li:before{content:"";width:16px;height:16px;border-radius:50%;border:1.5px solid #333;flex:none}\
.rv-chk li.now{color:#f2f2f2}.rv-chk li.now:before{border-color:#E8B64A;border-top-color:transparent;animation:rvspin .8s linear infinite}.rv-chk li.ok{color:#9a9a9a}.rv-chk li.ok:before{content:"✓";border:none;background:#E8B64A;color:#000;font-size:11px;display:flex;align-items:center;justify-content:center}\
@keyframes rvspin{to{transform:rotate(360deg)}}\
.rv-msg{font-size:12.5px;color:#8a8a8a;margin-top:10px;min-height:18px}\
.rv-err{background:#1c1010;border:1px solid #3a1d1d;color:#f0b0a0;border-radius:14px;padding:14px;font-size:14px;line-height:1.5;margin:10px 0;text-align:left}\
.rv-res video{width:100%;max-height:62vh;border-radius:16px;background:#000;display:block}\
.rv-res+.rv-res{margin-top:28px;padding-top:22px;border-top:1px solid #1d1d1d}\
.rv-acts{display:flex;gap:8px;margin-top:12px}\
.rv-card{background:#121212;border:1px solid #1f1f1f;border-radius:14px;padding:13px 14px;margin-top:10px;font-size:13.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word}\
.rv-card .l{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#8a8a8a;margin-bottom:6px;white-space:normal}\
.rv-card .l button{background:#1d1d1d;border:none;color:#ddd;border-radius:8px;padding:5px 10px;font:12px "DM Sans",sans-serif;cursor:pointer}\
.rv-warn{font-size:12.5px;color:#d9a441;margin-top:10px;line-height:1.45}\
.rv-rate{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:13px;color:#8a8a8a}.rv-rate button{border:1px solid #262626;background:#131313;border-radius:10px;font-size:17px;padding:6px 11px;cursor:pointer}.rv-rate button.on{border-color:#E8B64A}\
.rv-sheet{position:absolute;inset:0;background:#0b0b0b;z-index:5;display:none;flex-direction:column}.rv-sheet.on{display:flex}\
.rv-sec{margin-bottom:26px}.rv-sec h3{font-size:16px;font-weight:500;margin:0 0 4px}\
.rv-hi{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px}.rv-hi .hk{flex:1;min-width:0}.rv-hi .hk small{display:block;color:#666;font-size:11.5px;margin-top:2px}.rv-hi input{width:86px;background:#131313;border:1px solid #242424;border-radius:8px;color:#eee;padding:7px;font-size:12.5px}\
.rv-a{color:#E8B64A;font-size:13.5px;line-height:1.9;text-decoration:none;display:block}\
.rv-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1d1d1d;color:#eee;padding:11px 16px;border-radius:12px;font-size:13.5px;z-index:99999;max-width:88%;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.5)}\
.rv-clone{margin-top:10px;padding:14px;border:1px solid #2a2414;background:#14110a;border-radius:14px;display:none}.rv-clone.on{display:block}\
.rv-clone ol{margin:0 0 12px;padding-left:18px;color:#b9b9b9;font-size:13px;line-height:1.6}\
';
var STEPS = ['Material', 'Estilo', 'Audio'];
function toast(m) { var t = document.createElement('div'); t.className = 'rv-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200); }
function hookHTML(s) { return esc(String(s)).replace(/\*([^*]+)\*/g, '<em>$1</em>'); }

function build() {
  if (root) return;
  var st = document.createElement('style'); st.id = 'reels-css'; st.textContent = CSS; document.head.appendChild(st);
  if (!document.querySelector('link[data-reels-font]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&display=swap'; l.setAttribute('data-reels-font', '1'); document.head.appendChild(l); }
  root = document.createElement('div'); root.id = 'reels-app';
  root.innerHTML = ''
    + '<div class="rv-top"><button class="rv-ib" id="rv-back" aria-label="Atrás">←</button><div class="rv-tt" id="rv-tt">Crear reel</div><button class="rv-ib" id="rv-gear" aria-label="Ajustes">⚙</button></div>'
    + '<div class="rv-steps" id="rv-steps">' + STEPS.map(function (x) { return '<div><i></i>' + x + '</div>'; }).join('') + '</div>'
    + '<div class="rv-body" id="rv-body">'
    // PASO 1
    + '<div class="rv-page" data-p="1"><div class="rv-h1">Sube tu tatuaje</div><p class="rv-p">Elige los clips del proceso y la foto del resultado. Se acomodan solos en el orden en que los grabaste.</p>'
    + '<label class="rv-up" for="rv-file"><div class="pl">＋</div><b>Elegir videos y fotos</b><span>Puedes elegir varios a la vez</span></label><input type="file" id="rv-file" accept="video/*,image/*" multiple hidden>'
    + '<div class="rv-thumbs" id="rv-clips"></div>'
    + '<div class="rv-lb">¿Qué tatuaje es? (opcional)</div><div class="rv-row"><input class="rv-in" id="rv-desc" placeholder="Ej. carpa koi con flor de cerezo"><button class="rv-mic" id="rv-mic" aria-label="Dictar">🎤</button></div></div>'
    // PASO 2
    + '<div class="rv-page" data-p="2"><div class="rv-h1">Elige el estilo</div><p class="rv-p">Si no sabes cuál, deja «Automático».</p>'
    + '<div class="rv-list" id="rv-tpls"></div>'
    + '<button class="rv-link" id="rv-cl-toggle">🔁 Copiar un video viral que te gustó</button>'
    + '<div class="rv-clone" id="rv-clone"><ol><li>Guarda el video en tu celular (TikTok: Compartir → Guardar video. Instagram: grabación de pantalla).</li><li>Súbelo aquí. La app copia sus cortes, su ritmo y su audio.</li></ol>'
    + '<label class="rv-up" for="rv-cl-file" style="padding:16px"><b id="rv-cl-fname">Subir el video viral</b><span>Máximo 90 segundos</span></label><input type="file" id="rv-cl-file" accept="video/*" hidden>'
    + '<div class="rv-lb">Link (opcional)</div><input class="rv-in" id="rv-cl-link" placeholder="Pega el link si quieres guardarlo">'
    + '<div class="rv-lb">¿Qué pasa en el video? (opcional, ayuda a los textos)</div><input class="rv-in" id="rv-cl-what" placeholder="Ej. texto POV y al final gira el brazo">'
    + '<button class="rv-b full" id="rv-cl-go" style="margin-top:14px">Copiar este viral</button><div class="rv-msg" id="rv-cl-st"></div></div></div>'
    // PASO 3
    + '<div class="rv-page" data-p="3"><div class="rv-h1">Música y voz</div><p class="rv-p">Los cortes siempre van al ritmo.</p>'
    + '<div class="rv-list" id="rv-audio">'
    + '<div class="rv-it" data-a="trend"><div class="e">🔥</div><div class="t"><b>Audio en tendencia<i class="rv-tag">MEJOR</i></b><span>Al subirlo a Instagram o TikTok le pones el audio que está pegando. El algoritmo te empuja más.</span></div><div class="r"></div></div>'
    + '<div class="rv-it" data-a="clone" id="rv-a-clone" style="display:none"><div class="e">🔁</div><div class="t"><b>Audio del viral</b><span>El mismo audio del video que copiaste.</span></div><div class="r"></div></div>'
    + '<div class="rv-it" data-a="mine"><div class="e">🎵</div><div class="t"><b>Mi canción</b><span id="rv-music-st">Sube un audio; los cortes caen en cada golpe.</span></div><div class="r"></div></div>'
    + '<div class="rv-it" data-a="beat"><div class="e">🥁</div><div class="t"><b>Música INKBOT</b><span>Música japonesa libre de derechos, con golpe en el resultado.</span></div><div class="r"></div></div>'
    + '</div><input type="file" id="rv-music" accept="audio/*,video/mp4" hidden>'
    + '<div class="rv-lb">Voz narrando</div><div class="rv-seg" id="rv-voz"><button data-v="auto">Automático</button><button data-v="siempre">Sí</button><button data-v="off">No</button></div>'
    + '<details class="rv-more"><summary>Más opciones</summary><div class="in">'
    + '<div class="rv-lb" style="margin-top:4px">Texto del primer segundo</div><div class="rv-chips" id="rv-hooks"></div>'
    + '<button class="rv-link" id="rv-hooks-ai">✨ Proponer textos con IA</button>'
    + '<input class="rv-in" id="rv-hook-own" placeholder="O escribe el tuyo (*palabra* = resaltada)">'
    + '<div class="rv-lb">¿Cuántas versiones?</div><div class="rv-seg" id="rv-ver"><button data-n="1">1</button><button data-n="2">2</button><button data-n="3">3</button></div>'
    + '</div></details></div>'
    // PASO 4 · crear / resultado
    + '<div class="rv-page rv-make" data-p="4"><div id="rv-making"><div class="rv-h1" id="rv-mk-t">Creando tu reel</div><p class="rv-p" style="margin-bottom:6px">Deja la app abierta. Tarda más o menos lo que dura el video.</p>'
    + '<canvas class="rv-live" id="rv-live" width="180" height="320"></canvas><div class="rv-bar"><i id="rv-bar"></i></div>'
    + '<ul class="rv-chk" id="rv-chk"><li data-k="analiza">Buscando los mejores momentos</li><li data-k="plan">Escribiendo gancho y caption</li><li data-k="voz">Grabando la voz</li><li data-k="arma">Armando los cortes al ritmo</li><li data-k="render">Creando el video</li></ul><div class="rv-msg" id="rv-msg"></div></div>'
    + '<div id="rv-results" style="text-align:left"></div></div>'
    + '</div>'
    + '<div class="rv-foot" id="rv-foot"><button class="rv-b g" id="rv-prev">Atrás</button><button class="rv-b" id="rv-next">Siguiente</button></div>'
    // HOJA DE AJUSTES
    + '<div class="rv-sheet" id="rv-sheet"><div class="rv-top"><span style="width:40px"></span><div class="rv-tt">Ajustes</div><button class="rv-ib" id="rv-sheet-x">✕</button></div><div class="rv-body"><div class="rv-page on">'
    + '<div class="rv-sec"><h3>Tus reels</h3><p class="rv-p">Pon las vistas cuando los publiques: la app aprende qué te funciona.</p><div id="rv-hist"></div></div>'
    + '<div class="rv-sec"><h3>Tu marca</h3>'
    + '<div class="rv-lb">Usuario</div><input class="rv-in" id="rv-c-handle"><div class="rv-lb">Ciudad</div><input class="rv-in" id="rv-c-ciudad"><div class="rv-lb">Estilo</div><input class="rv-in" id="rv-c-estilo"><div class="rv-lb">Texto final</div><input class="rv-in" id="rv-c-cta">'
    + '<div class="rv-lb">Mostrar usuario y texto final</div><div class="rv-seg" id="rv-c-marca"><button data-m="1">Sí</button><button data-m="0">No</button></div></div>'
    + '<div class="rv-sec"><h3>Voz</h3><p class="rv-p">La voz gratis se genera en tu celular (la primera vez descarga ~60 MB). Si tienes ElevenLabs, pega tu llave y se usa esa.</p><input class="rv-in" id="rv-c-eleven" type="password" placeholder="Llave de ElevenLabs (opcional)">'
    + '<div class="rv-lb">Voz de ElevenLabs</div><div class="rv-seg" id="rv-gen"><button data-g="hombre">Hombre</button><button data-g="mujer">Mujer</button></div></div>'
    + '<div class="rv-sec"><h3>IA de textos</h3><p class="rv-p" id="rv-ai-info"></p></div>'
    + '<div class="rv-sec"><h3>¿Qué está pegando?</h3><a class="rv-a" target="_blank" rel="noopener" href="https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/es">Canciones en tendencia de TikTok ↗</a><a class="rv-a" target="_blank" rel="noopener" href="https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/es">Hashtags en tendencia de TikTok ↗</a><p class="rv-p" style="margin-top:6px">En Instagram, los audios con la flechita ↗ son los que están en tendencia.</p></div>'
    + '<button class="rv-b full" id="rv-c-save">Guardar</button></div></div></div>';
  document.body.appendChild(root);
  wire();
}

var UI = { step: 1 };
function go(n) {
  UI.step = n;
  $$('.rv-page[data-p]', root).forEach(function (p) { p.classList.toggle('on', +p.dataset.p === n); });
  $$('#rv-steps div', root).forEach(function (d, i) { d.classList.toggle('on', i + 1 === n); d.classList.toggle('ok', i + 1 < n || n === 4); });
  $('#rv-steps').style.display = n === 4 ? 'none' : 'flex';
  $('#rv-tt').textContent = n === 4 ? (S.busy ? 'Creando…' : 'Tu reel') : 'Crear reel';
  footer(); $('#rv-body').scrollTop = 0;
}
function footer() {
  var prev = $('#rv-prev'), next = $('#rv-next'), n = UI.step;
  $('#rv-foot').style.display = n === 4 && S.busy ? 'none' : 'flex';
  prev.style.display = n === 1 ? 'none' : 'block';
  if (n === 1) { next.textContent = 'Siguiente'; next.disabled = !S.clips.length; }
  else if (n === 2) { next.textContent = 'Siguiente'; next.disabled = false; prev.textContent = 'Atrás'; }
  else if (n === 3) { next.textContent = S.versions > 1 ? 'Crear ' + S.versions + ' reels ⚡' : 'Crear reel ⚡'; next.disabled = false; prev.textContent = 'Atrás'; }
  else { prev.textContent = 'Nuevo tatuaje'; next.textContent = 'Otra versión'; next.disabled = false; }
}
function wire() {
  $('#rv-back').onclick = function () {
    if (S.busy) return toast('Espera a que termine el video');
    if (UI.step > 1 && UI.step < 4) return go(UI.step - 1);
    if (UI.step === 4) return go(3);
    var b = document.getElementById('btn-back'); if (b) b.click(); else R.hide();
  };
  $('#rv-prev').onclick = function () {
    if (UI.step === 4) { resetAll(); return go(1); }
    go(UI.step - 1);
  };
  $('#rv-next').onclick = function () {
    if (UI.step === 1) { if (!S.clips.length) return toast('Sube al menos un video o foto'); return go(2); }
    if (UI.step === 2) return go(3);
    if (UI.step === 3) return createAll();
    if (UI.step === 4) return go(2);
  };
  $('#rv-gear').onclick = function () { fillSettings(); $('#rv-sheet').classList.add('on'); };
  $('#rv-sheet-x').onclick = function () { $('#rv-sheet').classList.remove('on'); };
  $('#rv-file').onchange = function (e) { addFiles(e.target.files); e.target.value = ''; };
  $('#rv-desc').oninput = function (e) { S.desc = e.target.value.trim(); };
  $('#rv-mic').onclick = dictate;
  // clonar viral
  $('#rv-cl-toggle').onclick = function () { $('#rv-clone').classList.toggle('on'); };
  $('#rv-cl-file').onchange = function (e) { var f = e.target.files[0]; if (!f) return; S.cloneFile = f; $('#rv-cl-fname').textContent = '✓ ' + f.name; e.target.value = ''; };
  $('#rv-cl-go').onclick = function () {
    var what = $('#rv-cl-what').value.trim(), link = $('#rv-cl-link').value.trim(), b = this, file = S.cloneFile, st = $('#rv-cl-st');
    if (!file) return toast('Primero sube el video viral');
    b.disabled = true; b.textContent = 'Copiando…';
    cloneFromVideo(file, link, what, function (m) { st.textContent = m; }).then(function (t) {
      var c = customTpls(); c.unshift(t); lsSet(LS.tpl, c.slice(0, 30));
      S.tpl = t.id; if (t.hasAudio) S.audio = 'clone'; S.cloneFile = null;
      $('#rv-cl-fname').textContent = 'Subir el video viral'; $('#rv-cl-what').value = ''; $('#rv-cl-link').value = '';
      st.textContent = '✓ Copiado: ' + t.cuts.length + ' cortes' + (t.hasAudio ? ' y el audio' : '') + '. Ya está seleccionado arriba.';
      renderTpls(); renderAudio(); renderHooks();
    }).catch(function (e) { st.textContent = '⚠ ' + e.message; }).then(function () { b.disabled = false; b.textContent = 'Copiar este viral'; });
  };
  // audio
  $$('.rv-it', $('#rv-audio')).forEach(function (o) {
    o.onclick = function () { S.audio = o.dataset.a; renderAudio(); if (S.audio === 'mine' && !S.musicFile) $('#rv-music').click(); };
  });
  $('#rv-music').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return; S.musicFile = f; S.music = null; $('#rv-music-st').textContent = 'Leyendo el ritmo…';
    prepareMusic().then(function (m) { $('#rv-music-st').textContent = '✓ ' + f.name + ' · ' + Math.round(m.beats.bpm) + ' BPM'; })
      .catch(function () { S.musicFile = null; $('#rv-music-st').textContent = '⚠ No se pudo leer ese audio. Prueba con un MP3.'; });
  };
  segWire('#rv-voz', 'v', function (v) { CFG.voz = v; saveCfg(); }, function () { return ['auto', 'siempre', 'off'].indexOf(CFG.voz) >= 0 ? CFG.voz : 'auto'; });
  segWire('#rv-ver', 'n', function (v) { S.versions = +v; footer(); }, function () { return String(S.versions); });
  segWire('#rv-gen', 'g', function (v) { CFG.genero = v; saveCfg(); }, function () { return CFG.genero; });
  segWire('#rv-c-marca', 'm', function (v) { CFG.marca = v === '1'; saveCfg(); }, function () { return CFG.marca ? '1' : '0'; });
  $('#rv-hooks-ai').onclick = function () {
    var b = this; b.disabled = true; b.textContent = '✨ Escribiendo… (la IA gratis puede tardar ~1 min)';
    aiHooks().then(function (g) { S.hooksAI = g; S.hook = ''; renderHooks(); }).catch(function (e) { toast('IA: ' + e.message); })
      .then(function () { b.disabled = false; b.textContent = '✨ Proponer textos con IA'; });
  };
  $('#rv-hook-own').oninput = function (e) { S.hook = e.target.value.trim(); $$('.rv-chip', $('#rv-hooks')).forEach(function (c) { c.classList.toggle('on', !S.hook && c.dataset.h === ''); }); };
  $('#rv-c-save').onclick = function () {
    ['handle', 'ciudad', 'estilo', 'cta'].forEach(function (k) { CFG[k] = $('#rv-c-' + k).value.trim(); });
    CFG.elevenKey = $('#rv-c-eleven').value.trim(); saveCfg(); fitCache = {}; renderHooks(); toast('Guardado'); $('#rv-sheet').classList.remove('on');
  };
  renderTpls(); renderHooks(); renderAudio(); renderClips(); go(1);
}
function fillSettings() {
  ['handle', 'ciudad', 'estilo', 'cta'].forEach(function (k) { $('#rv-c-' + k).value = CFG[k] || ''; });
  $('#rv-c-eleven').value = CFG.elevenKey || '';
  var I = window.INKAI, own = I && I.getCfg && I.getCfg().provider !== 'auto';
  $('#rv-ai-info').textContent = own ? 'Usando tu IA: ' + (I.PROV[I.getCfg().provider] || {}).label + '. Se cambia en el menú principal de INKBOT.'
    : 'Gratis, sin cuentas ni ventanas (Pollinations). Responde más o menos 1 vez por minuto. Si quieres que sea instantánea, en el menú principal de INKBOT pon una llave gratis de Gemini o Groq.';
  renderHistory();
}
function segWire(sel, attr, onSet, getV) {
  var box = $(sel), btns = $$('button', box);
  function paint() { var v = getV(); btns.forEach(function (b) { b.classList.toggle('on', b.dataset[attr] === v); }); }
  btns.forEach(function (b) { b.onclick = function () { onSet(b.dataset[attr]); paint(); }; }); paint();
}
// Miniaturas como imagen (no se dejan videos abiertos: los celulares tienen pocos decodificadores)
var thumbQ = Promise.resolve();
function makeThumb(c) {
  thumbQ = thumbQ.then(async function () {
    if (c.thumb) return;
    if (c.kind === 'image') { c.thumb = c.url; renderClips(); return; }
    var v = null;
    try {
      v = await openVideo(c, 2); c.dur = v.duration; await seek(v, Math.min(1, v.duration / 3));
      var cv = document.createElement('canvas'), sc = 220 / Math.max(v.videoWidth, v.videoHeight); cv.width = Math.round(v.videoWidth * sc); cv.height = Math.round(v.videoHeight * sc);
      cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height); c.thumb = cv.toDataURL('image/jpeg', .7);
    } catch (e) { c.thumb = 'x'; c.thumbErr = true; }
    release(v); renderClips();
  });
}
function addFiles(list) {
  var files = Array.prototype.slice.call(list || []).filter(function (f) { return /^(video|image)\//.test(f.type) || /\.(mp4|mov|m4v|webm|3gp|jpe?g|png|webp|heic)$/i.test(f.name); });
  if (!files.length) return;
  files.forEach(function (f) { S.clips.push({ id: uid(), file: f, name: f.name, kind: /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name) ? 'image' : 'video', url: URL.createObjectURL(f), lm: f.lastModified || 0 }); });
  S.clips.sort(function (a, b) { if (a.kind !== b.kind) return a.kind === 'video' ? -1 : 1; return a.lm - b.lm; });
  renderClips(); S.clips.forEach(makeThumb);
}
function renderClips() {
  var box = $('#rv-clips'); if (!box) return;
  box.innerHTML = S.clips.map(function (c, i) {
    var inner = !c.thumb ? '<div class="rv-th load">…</div>' : null;
    if (inner) return inner;
    return '<div class="rv-th">' + (c.thumb === 'x' ? '<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:24px">🎬</div>' : '<img src="' + c.thumb + '" alt="">')
      + '<span class="n">' + (i + 1) + '</span><span class="k">' + (c.kind === 'video' ? (c.dur ? Math.round(c.dur) + ' s' : 'video') : 'foto') + '</span>'
      + '<button class="x" data-act="x" data-i="' + i + '">✕</button><div class="mv"><button data-act="u" data-i="' + i + '">‹</button><button data-act="d" data-i="' + i + '">›</button></div></div>';
  }).join('');
  $$('button', box).forEach(function (b) {
    b.onclick = function () {
      var i = +b.dataset.i, a = b.dataset.act;
      if (a === 'x') { URL.revokeObjectURL(S.clips[i].url); S.clips.splice(i, 1); }
      if (a === 'u' && i > 0) S.clips.splice(i - 1, 0, S.clips.splice(i, 1)[0]);
      if (a === 'd' && i < S.clips.length - 1) S.clips.splice(i + 1, 0, S.clips.splice(i, 1)[0]);
      renderClips();
    };
  });
  if (UI.step === 1) footer();
}
function renderTpls() {
  var box = $('#rv-tpls'), cs = customTpls();
  var items = [{ key: 'auto', emoji: '✨', name: 'Automático', desc: 'La app elige el mejor formato para tu material.', tag: 'RECOMENDADO' }]
    .concat(cs.map(function (c) { return { key: c.id, emoji: c.cuts ? '🔁' : '⭐', name: c.name, desc: c.notes || 'Plantilla copiada', custom: true }; }))
    .concat(BASES.map(function (k) { return { key: k, emoji: TPL[k].emoji, name: TPL[k].name, desc: TPL[k].desc }; }));
  box.innerHTML = items.map(function (t) { return '<div class="rv-it' + (S.tpl === t.key ? ' on' : '') + '" data-k="' + t.key + '"><div class="e">' + t.emoji + '</div><div class="t"><b>' + esc(t.name) + (t.tag ? '<i class="rv-tag">' + t.tag + '</i>' : '') + '</b><span>' + esc(t.desc) + '</span></div>' + (t.custom ? '<button class="del" data-del="' + t.key + '" aria-label="Borrar">✕</button>' : '') + '<div class="r"></div></div>'; }).join('');
  $$('.rv-it', box).forEach(function (el) {
    el.onclick = function (e) {
      if (e.target.dataset.del) { IDB.del(e.target.dataset.del); lsSet(LS.tpl, customTpls().filter(function (c) { return c.id !== e.target.dataset.del; })); if (S.tpl === e.target.dataset.del) S.tpl = 'auto'; if (S.audio === 'clone') S.audio = 'trend'; renderTpls(); renderAudio(); return; }
      S.tpl = el.dataset.k; S.hooksAI = []; S.hook = ''; var tt = S.tpl !== 'auto' && getTpl(S.tpl);
      if (tt && tt.hasAudio) S.audio = 'clone'; else if (S.audio === 'clone') S.audio = 'trend';
      renderTpls(); renderHooks(); renderAudio();
    };
  });
}
function renderHooks() {
  var box = $('#rv-hooks'); if (!box) return;
  var list = S.hooksAI.length ? S.hooksAI : (S.tpl === 'auto' ? [] : getTpl(S.tpl).hooks.map(function (x) { return fillVars(x); }));
  var own = $('#rv-hook-own'); if (own) own.value = '';
  box.innerHTML = '<button class="rv-chip' + (!S.hook ? ' on' : '') + '" data-h="">Automático</button>' + list.map(function (h) { return '<button class="rv-chip' + (S.hook === h ? ' on' : '') + '" data-h="' + esc(h) + '">' + hookHTML(h) + '</button>'; }).join('');
  $$('.rv-chip', box).forEach(function (c) { c.onclick = function () { S.hook = c.dataset.h; $$('.rv-chip', box).forEach(function (x) { x.classList.toggle('on', x === c); }); }; });
}
function renderAudio() {
  var tt = S.tpl !== 'auto' && getTpl(S.tpl), ca = $('#rv-a-clone'); if (ca) ca.style.display = tt && tt.hasAudio ? 'flex' : 'none';
  $$('.rv-it', $('#rv-audio')).forEach(function (o) { o.classList.toggle('on', o.dataset.a === S.audio); });
}
function resetAll() {
  S.clips.forEach(function (c) { try { URL.revokeObjectURL(c.url); } catch (e) {} });
  S.results.forEach(function (r) { try { URL.revokeObjectURL(r.url); } catch (e) {} });
  S.clips = []; S.results = []; S.desc = ''; $('#rv-desc').value = ''; $('#rv-results').innerHTML = ''; renderClips();
}
// Progreso con lista de pasos
function progress() {
  var bar = $('#rv-bar'), msg = $('#rv-msg'), order = ['analiza', 'plan', 'voz', 'arma', 'render'];
  var weights = { analiza: [0, 15], plan: [15, 25], voz: [25, 35], arma: [35, 37], audio: [37, 40], render: [40, 100], done: [100, 100] };
  $$('#rv-chk li').forEach(function (li) { li.className = ''; });
  return function (k, m, f) {
    if (k === 'audio') k = 'arma';
    var w = weights[k] || [0, 0], p = w[0] + (w[1] - w[0]) * (f == null ? 0 : clamp(f, 0, 1));
    if (k !== 'error') bar.style.width = (k === 'done' ? 100 : p) + '%';
    var idx = order.indexOf(k);
    if (idx >= 0) $$('#rv-chk li').forEach(function (li, i) { li.className = i < idx ? 'ok' : i === idx ? 'now' : (li.className === 'ok' && k === 'plan' ? '' : li.className === 'ok' ? 'ok' : ''); });
    if (k === 'done') $$('#rv-chk li').forEach(function (li) { li.className = 'ok'; });
    msg.textContent = m || '';
  };
}
async function createAll() {
  if (S.busy) return;
  if (!S.clips.length) { go(1); return toast('Primero sube tus videos o fotos'); }
  if (S.audio === 'mine' && !S.musicFile) return toast('Sube tu canción o elige otra opción de audio');
  S.busy = true; S.results.forEach(function (r) { try { URL.revokeObjectURL(r.url); } catch (e) {} }); S.results = [];
  $('#rv-results').innerHTML = ''; $('#rv-making').style.display = 'block'; $('#rv-mk-t').textContent = S.versions > 1 ? 'Creando ' + S.versions + ' reels' : 'Creando tu reel';
  go(4);
  var step = progress();
  try {
    try { await document.fonts.load('150px "Bebas Neue"'); await document.fonts.load('900 70px Montserrat'); await document.fonts.load('800 50px Montserrat'); } catch (e) {}
    await thumbQ;
    var bad = [];
    for (var i = 0; i < S.clips.length; i++) {
      var c = S.clips[i];
      step('analiza', 'Revisando ' + (i + 1) + ' de ' + S.clips.length + '…', i / S.clips.length);
      try { await analyzeClip(c, function (f) { step('analiza', 'Revisando ' + (i + 1) + ' de ' + S.clips.length + '…', (i + f) / S.clips.length); }); }
      catch (e) { c.bad = true; bad.push(c.name); }
    }
    S.clips = S.clips.filter(function (c) { return !c.bad; }); renderClips();
    if (!S.clips.length) throw new Error('El celular no pudo abrir ninguno de los archivos. Prueba con videos grabados con la cámara normal (no en HDR/8K) o vuelve a elegirlos.');
    var used = [];
    for (var v = 0; v < S.versions; v++) {
      var key = v === 0 ? (S.tpl === 'auto' ? autoTemplate([]) : S.tpl) : autoTemplate(used);
      used.push(key);
      if (S.versions > 1) $('#rv-mk-t').textContent = 'Reel ' + (v + 1) + ' de ' + S.versions + ' · ' + getTpl(key).name;
      var r = await createOne(key, v, step);
      if (bad.length) r.warn = (r.warn ? r.warn + ' ' : '') + 'No se pudo abrir: ' + bad.join(', ') + '.';
      S.results.push(r); renderResults();
    }
    step('done', '', 1);
    $('#rv-making').style.display = 'none';
  } catch (e) {
    console.error(e);
    $('#rv-making').style.display = 'none';
    $('#rv-results').innerHTML = (S.results.length ? $('#rv-results').innerHTML : '') + '<div class="rv-err">⚠ ' + esc(e && e.message ? e.message : e) + '</div>';
    if (S.results.length) renderResults();
  } finally { S.busy = false; go(4); renderHistory(); }
}
function renderResults() {
  var box = $('#rv-results'); if (!box) return;
  box.innerHTML = S.results.map(function (r, i) {
    var p = r.plan;
    return '<div class="rv-res" data-i="' + i + '">'
      + (S.results.length > 1 ? '<div class="rv-lb" style="margin-top:0">' + r.emoji + ' ' + esc(r.tplName) + '</div>' : '')
      + '<video src="' + r.url + '" controls playsinline preload="metadata"></video>'
      + '<div class="rv-acts"><button class="rv-b" data-act="share">Compartir a Instagram / TikTok</button><button class="rv-b g" data-act="dl" aria-label="Descargar">⬇</button></div>'
      + (r.warn ? '<div class="rv-warn">⚠ ' + esc(r.warn) + '</div>' : '')
      + '<div class="rv-card"><div class="l">Caption<button data-cp="1">Copiar</button></div>' + esc(p.caption + '\n\n' + p.hashtags.join(' ')) + '</div>'
      + '<div class="rv-card"><div class="l">Cuándo publicarlo</div>' + esc(cap(p.day) + ' · ' + p.time) + '</div>'
      + (r.audioMode === 'trend' ? '<div class="rv-card"><div class="l">Qué audio ponerle en IG / TikTok</div>' + esc(p.audioTip) + (r.voice ? '\nBaja ese audio a ~20 % para que se escuche la voz.' : '') + '</div>' : '')
      + '<div class="rv-rate">¿Te gustó? <button data-rate="2">🔥</button><button data-rate="1">👍</button><button data-rate="-1">👎</button></div></div>';
  }).join('');
  $$('.rv-res', box).forEach(function (el) {
    var r = S.results[+el.dataset.i];
    $$('button', el).forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.act === 'dl') download(r);
        else if (b.dataset.act === 'share') share(r);
        else if (b.dataset.cp) copy(r.plan.caption + '\n\n' + r.plan.hashtags.join(' '));
        else if (b.dataset.rate) { rate(r.id, +b.dataset.rate); $$('[data-rate]', el).forEach(function (x) { x.classList.toggle('on', x === b); }); }
      };
    });
  });
}
function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function fileName(r) { return 'reel-' + (r.tpl.replace(/^c_.*/, 'viral')) + '-' + new Date(r.date).toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.mp4'; }
function download(r) { var a = document.createElement('a'); a.href = r.url; a.download = fileName(r); document.body.appendChild(a); a.click(); a.remove(); }
function share(r) {
  var f = new File([r.blob], fileName(r), { type: 'video/mp4' }), text = r.plan.caption + '\n\n' + r.plan.hashtags.join(' ');
  copy(text, true);
  if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: text }).then(function () { toast('El caption ya está copiado: pégalo al publicar'); }).catch(function () {});
  else { download(r); toast('Se descargó el video. El caption ya está copiado.'); }
}
function copy(t, silent) {
  var done = function () { if (!silent) toast('Copiado'); };
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {});
  else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); }
}
function rate(id, v) { var h = history(); h.forEach(function (x) { if (x.id === id) x.rating = v; }); lsSet(LS.hist, h); }
function renderHistory() {
  var box = $('#rv-hist'); if (!box) return; var h = history();
  if (!h.length) { box.innerHTML = '<p class="rv-p" style="margin:0">Aún no has creado reels.</p>'; return; }
  box.innerHTML = h.slice(0, 15).map(function (x) {
    var t = TPL[x.tpl] ? TPL[x.tpl].emoji : '⭐';
    return '<div class="rv-hi"><span>' + t + '</span><div class="hk">' + hookHTML(x.hook) + '<small>' + new Date(x.date).toLocaleDateString('es-MX') + ' · ' + esc(x.tplName || '') + (x.rating ? ' · ' + (x.rating > 1 ? '🔥' : x.rating > 0 ? '👍' : '👎') : '') + '</small></div><input type="number" min="0" inputmode="numeric" placeholder="vistas" value="' + (x.views || '') + '" data-id="' + x.id + '"></div>';
  }).join('');
  $$('input', box).forEach(function (inp) { inp.onchange = function () { var hh = history(); hh.forEach(function (x) { if (x.id === inp.dataset.id) x.views = +inp.value || 0; }); lsSet(LS.hist, hh); toast('Guardado'); }; });
}
var rec = null;
function dictate() {
  var SRx = window.SpeechRecognition || window.webkitSpeechRecognition, b = $('#rv-mic');
  if (!SRx) return toast('Tu navegador no permite dictar aquí');
  if (rec) { rec.stop(); return; }
  rec = new SRx(); rec.lang = 'es-MX'; rec.interimResults = true; rec.continuous = false;
  var base = $('#rv-desc').value ? $('#rv-desc').value + ' ' : '';
  rec.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; $('#rv-desc').value = base + t; S.desc = $('#rv-desc').value.trim(); };
  rec.onend = function () { rec = null; b.classList.remove('on'); };
  rec.onerror = function () { toast('No se pudo dictar'); };
  b.classList.add('on'); rec.start();
}

R.open = function () { build(); root.classList.add('show'); if (!S.busy && UI.step === 4 && !S.results.length) go(1); document.body.style.overflow = 'hidden'; };
R.hide = function () { if (root) root.classList.remove('show'); document.body.style.overflow = ''; };
// Para pruebas automáticas
R._t = { S: S, CFG: CFG, TPL: TPL, UI: UI, go: go, getTpl: getTpl, analyzeClip: analyzeClip, buildEDL: buildEDL, gridFor: gridFor, detectBeats: detectBeats, buildAudio: buildAudio, render: render, aiPlan: aiPlan, localPlan: localPlan, createOne: createOne, addFiles: addFiles, narrate: narrate, detectCuts: detectCuts, cloneFromVideo: cloneFromVideo, estimateWords: estimateWords };
})();
