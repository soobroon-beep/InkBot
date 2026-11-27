/* NEURAL BRAIN · cómo aprende un cerebro (lo usan la app y el trabajo nocturno del servidor).
   Junta lo que le enseñaste (notas, reglas, estrategias) y tus recuerdos (lo que hiciste en Nova Hub y VORTEX)
   y le pide a una IA gratuita que escriba «Lo que sé de ti». Funciones puras + una llamada a la IA. */
(function (root) {
  'use strict';
  const GEN_URL = 'https://gen.pollinations.ai/v1/chat/completions';
  const POLLEN_KEY = 'sk_1XvEYtOmiFixsgMve0FAqQz5ghhy7FFT'; // clave gratuita de la app (la misma de VORTEX): nadie escribe claves
  const NH = 'https://nova-hub-push.soobroon.workers.dev/ai'; // 1) servidor de NOVA HUB: Groq / Cloudflare Workers AI (modelos abiertos, gratis)
  const VX = 'https://vortex-push.soobroon.workers.dev/ai'; // 2) servidor de VORTEX: su propia cadena Groq → Workers AI → Pollinations
  const APP_ORIGIN = 'https://soobroon-beep.github.io'; // origen permitido (cuando se llama desde el servidor nocturno)
  const FREE_URL = 'https://text.pollinations.ai/openai';
  const APPS = { novahub: 'Nova Hub', vortex: 'VORTEX', neural: 'Neural Brain', inkbot: 'InkBot' };
  const KINDS = { nota: 'Nota', regla: 'Regla', estrategia: 'Estrategia', trader: 'Trader', leccion: 'Lección' };

  const clip = (s, n) => { s = String(s == null ? '' : s).trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const fmtDay = ms => { try { return new Date(ms).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'America/Mexico_City' }); } catch { return ''; } };
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  /* Una línea legible por recuerdo: «10 nov 26 · VORTEX · Cerró operación: LONG BTCUSDT · 50 USD — detalle…» */
  function eventLine(e, detail) {
    const head = `${fmtDay(e.at)} · ${APPS[e.app] || e.app} · ${cap(e.act || '')} ${e.type || ''}${e.title ? ': ' + clip(e.title, 140) : ''}`;
    return detail && e.text && e.text !== e.title ? head + ' — ' + clip(e.text.replace(/\s+/g, ' '), detail) : head;
  }
  const botRef = id => new RegExp('^(?:b|br|bx|bv|bp):' + String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?::|$)');
  const brainEvents = (brain, events) => { // un cerebro de bot solo ve lo de SU bot (versiones, resultados, experimentos, paper)
    if (brain.kind === 'bot' && brain.bot && brain.bot.id) { const re = botRef(brain.bot.id); return (events || []).filter(e => e.app === 'vortex' && re.test(e.ref || '')); }
    return (events || []).filter(e => (brain.sources || []).includes(e.app));
  };

  function noteLine(n) { return `- ${n.master ? '[REGLA MAESTRA] ' : ''}${n.kind && n.kind !== 'nota' ? '[' + (KINDS[n.kind] || n.kind) + (n.author ? ' · ' + n.author : '') + '] ' : ''}${clip(String(n.text || '').replace(/\s+/g, ' '), 450)}`; }
  function notesBlock(notes, max) {
    const arr = (notes || []).filter(n => n && String(n.text || '').trim()).slice().sort((a, b) => (b.master ? 1 : 0) - (a.master ? 1 : 0) || (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    let out = '', used = 0; for (const n of arr) { const l = noteLine(n); if (used + l.length > max) break; out += l + '\n'; used += l.length; }
    return out.trim();
  }
  function eventsBlock(events, max) {
    const arr = (events || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0)); let out = [], used = 0;
    for (const e of arr) { const l = eventLine(e, 220); if (used + l.length > max) break; out.push(l); used += l.length + 1; }
    return out.reverse().join('\n');
  }

  function learnMessages(brain, notes, events, name) {
    const who = name || 'el usuario';
    const content = (brain.sources || []).includes('inkbot');
    const sys = content ? `Eres el «cerebro de tatuaje» de ${who}: tatuador profesional que crea contenido para Instagram y TikTok con su app InkBot (historias, reels, diccionario de símbolos). Respondes SIEMPRE en español.
Tu tarea: leer lo que te enseñó y sus RECUERDOS de InkBot (qué historias y reels creó, qué le GUSTÓ 👍🔥 y qué RECHAZÓ 👎, qué cambios pidió a sus reels, cuántas vistas tuvieron, qué estilos y ganchos usó) y escribir «Lo que sé de ti» para que la IA de InkBot le haga contenido cada vez mejor y más a su gusto.
REGLAS: solo afirma lo que se desprende de los datos; si algo es suposición, dilo. Nada de relleno. Conserva lo valioso del aprendizaje anterior y corrígelo si los datos nuevos lo contradicen. Usa datos concretos (formatos, ganchos, temas, duraciones, vistas).
FORMATO (markdown, máximo ~380 palabras, viñetas cortas):
### Su estilo y su marca
### Contenido que le funciona (formatos, ganchos, temas, ritmo, voz, duración)
### Lo que NO le gusta (evitar)
### Reglas para su próximo contenido (5-8 reglas concretas que la IA de InkBot debe seguir)
### Ideas para probar` : brain.kind === 'bot' ? `Eres el «cerebro» del bot de trading «${(brain.bot && brain.bot.name) || brain.name}» de ${who}. Respondes SIEMPRE en español.
Cada noche el servidor prueba ideas para mejorar el bot (consejos del entrenador, ideas tuyas y el optimizador) con velas reales; la que gana FUERA DE MUESTRA sin más caída se aplica sola A PRUEBA en la simulación en vivo, y si ahí rinde peor que la anterior se descarta, vuelve la anterior y ese cambio no se repite (cuenta como «no funcionó»). Tu tarea: leer sus reglas, las versiones del bot, los experimentos y el paper trading, y escribir «Lo que sé de este bot». La próxima noche se usa para decidir qué probar.
REGLAS: solo afirma lo que dicen los datos; usa números concretos. Nunca sugieras subir riesgo, tamaño ni apalancamiento ni romper sus reglas maestras.
FORMATO (markdown, máximo ~350 palabras, viñetas cortas):
### Cómo va el bot (versión principal, fuera de muestra, paper trading)
### Lo que ya funcionó
### Lo que ya probamos y NO funcionó (no repetir)
### Próximos experimentos (2-4 ideas concretas: salidas, filtros, horarios, confirmaciones)
### Reglas que no se pueden romper` : `Eres el «cerebro» personal de ${who}: una memoria que lo va conociendo con el tiempo. Respondes SIEMPRE en español.
Tu tarea: leer lo que te enseñó y sus RECUERDOS (lo que hizo en sus apps: notas, proyectos, tareas, operaciones de trading, bots, alertas, ideas Long/Short, actualizaciones de sus apps) y escribir «Lo que sé de ti» para el cerebro «${brain.name}».
REGLAS: solo afirma lo que se desprende de los datos; si algo es una suposición, dilo («parece que…»). Nada de relleno ni frases genéricas. Conserva lo valioso del aprendizaje anterior y corrígelo si los datos nuevos lo contradicen. Usa números concretos cuando los haya (aciertos, horarios, monedas, temporalidades).
FORMATO (markdown, máximo ~380 palabras, viñetas cortas), con estas secciones:
### En qué estás ahora
### Cómo trabajas / cómo operas (patrones, horarios, monedas, temporalidades, gestión de riesgo, herramientas)
### Lo que te funciona
### Lo que repites y te cuesta (errores, reglas que rompes, cosas que dejas a medias)
### Para mejorar (3-5 sugerencias concretas basadas en SUS datos y SUS reglas)`;
    const user = [
      brain.instructions ? 'CÓMO QUIERE QUE LO AYUDE ESTE CEREBRO:\n' + clip(brain.instructions, 800) : '',
      brain.learned && brain.learned.text ? 'LO QUE YA SABÍAS (aprendizaje anterior):\n' + clip(brain.learned.text, 2500) : '',
      'LO QUE TE ENSEÑÓ (reglas, estrategias, traders que sigue, lecciones, notas):\n' + (notesBlock(notes, 6000) || '(todavía nada)'),
      'SUS RECUERDOS RECIENTES (de lo más viejo a lo más nuevo):\n' + (eventsBlock(events, 9000) || '(todavía no llegan recuerdos de sus apps)')
    ].filter(Boolean).join('\n\n');
    return [{ role: 'system', content: sys }, { role: 'user', content: user }];
  }

  /* Para preguntarle al cerebro: contexto compacto + recuerdos que tengan que ver con la pregunta. */
  function relevant(events, q, n) {
    const words = String(q || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 3);
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const scored = (events || []).map(e => { const t = norm(e.title + ' ' + e.text + ' ' + e.type); let s = 0; for (const w of words) if (t.includes(w)) s++; return [e, s]; });
    const hits = scored.filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || (b[0].at || 0) - (a[0].at || 0)).slice(0, n).map(x => x[0]);
    const recent = (events || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, Math.max(0, n - hits.length));
    const seen = new Set(), out = []; for (const e of hits.concat(recent)) { const k = e.id || e.ref + e.at; if (!seen.has(k)) { seen.add(k); out.push(e); } }
    return out.sort((a, b) => (a.at || 0) - (b.at || 0));
  }
  function askSystem(brain, notes, events, q, name) {
    return `Eres el cerebro «${brain.name}» de ${name || 'el usuario'}: lo conoces por lo que te enseñó y por lo que hace en sus apps (${(brain.sources || []).includes('inkbot') ? 'InkBot: su contenido de tatuajes, lo que le gusta y lo que no' : 'Nova Hub y VORTEX'}). Respondes SIEMPRE en español, directo y útil, como alguien que de verdad lo conoce. Si la respuesta no está en tus datos, dilo y responde con tu mejor criterio marcándolo como opinión. En trading: nunca prometas ganancias; habla de escenarios y de SUS reglas.
${brain.instructions ? '\nCÓMO QUIERE QUE LO AYUDES:\n' + clip(brain.instructions, 800) + '\n' : ''}
LO QUE SABES DE ÉL:\n${brain.learned && brain.learned.text ? clip(brain.learned.text, 2500) : '(todavía no has aprendido un resumen; usa lo de abajo)'}

LO QUE TE ENSEÑÓ:\n${notesBlock(notes, 5000) || '(nada todavía)'}

RECUERDOS RELACIONADOS:\n${relevant(events, q, 60).map(e => eventLine(e, 200)).join('\n') || '(sin recuerdos todavía)'}`;
  }

  function distillMessages(text, author) {
    return [{ role: 'system', content: 'Responde en español. Convierte el texto (transcripción, apuntes o explicación de una estrategia de trading o de un método) en una nota CLARA para un cerebro personal: título en una línea, luego viñetas con las reglas concretas (cuándo entrar, cuándo salir, stop, objetivo, temporalidad, indicadores, gestión de riesgo, errores a evitar). No inventes nada que no esté en el texto. Máximo ~220 palabras.' }, { role: 'user', content: (author ? 'Autor / trader: ' + author + '\n\n' : '') + clip(text, 14000) }];
  }

  /* Llamada a la IA gratuita, con varias IAs de respaldo (la misma idea que VORTEX):
     1) tu servidor NOVA HUB (Groq / Cloudflare Workers AI: gpt-oss, Llama 3.3, Llama 4, Mistral, Gemma…)
     2) el servidor de VORTEX, 3) Pollinations con la clave de la app, 4) Pollinations sin clave.
     Un servicio que contesta «sin créditos» o con un filtro en vez de la respuesta se salta en el acto. */
  const noCredit = t => String(t || '').length < 800 && /enough credits|top up|paid pollen|insufficient (balance|credits)|requires? (a )?paid|free limit reached|queue full/i.test(t);
  const looksBad = t => /^\s*(safety|categories)\s*:/i.test(t) || /^\s*(safe|unsafe)\s*$/i.test(t);
  const cleanT = t => String(t || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^[\s\S]*?<\/think>/, '').trim();
  async function chat(messages, o) {
    o = o || {}; const f = o.fetch || root.fetch, server = typeof document === 'undefined', end = Date.now() + (o.budget || 180000); let last, genDead = false;
    const routes = [[NH, '', 'openai', 'servidor NOVA HUB'], [VX, '', 'openai', 'servidor VORTEX']];
    for (const model of o.models || ['openai', 'mistral']) routes.push([GEN_URL, POLLEN_KEY, model, model]);
    routes.push([FREE_URL, '', 'openai', 'pollinations']);
    for (const [url, key, model, label] of routes) {
      if (Date.now() > end - 4000) break;
      if (url === GEN_URL && genDead) continue;
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ctl ? setTimeout(() => ctl.abort(), Math.min(o.timeout || 90000, end - Date.now())) : 0;
      try {
        const headers = Object.assign({ 'content-type': 'application/json' }, key ? { authorization: 'Bearer ' + key } : {}, server && !key ? { origin: APP_ORIGIN } : {});
        const r = await f(url, { method: 'POST', signal: ctl && ctl.signal, headers, body: JSON.stringify({ model, messages, max_tokens: o.maxTokens || 1400, temperature: o.temperature == null ? .5 : o.temperature }) });
        if (!r.ok) { last = new Error('La IA respondió ' + r.status); if (url === GEN_URL && (r.status === 402 || r.status === 401 || r.status === 403)) genDead = true; continue; }
        const j = await r.json(), text = cleanT(j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
        if (noCredit(text)) { last = new Error('Sin créditos en ' + label); if (url === GEN_URL) genDead = true; continue; }
        if (looksBad(text)) { last = new Error('Respuesta de filtro'); continue; }
        if (text && text.length > 5) return { text, model: (j && j.model) || label };
        last = new Error('Respuesta vacía');
      } catch (e) { last = e; } finally { clearTimeout(t); }
    }
    throw last || new Error('No hubo respuesta de la IA');
  }

  const api = { APPS, KINDS, eventLine, brainEvents, notesBlock, eventsBlock, learnMessages, askSystem, relevant, distillMessages, chat, clip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BrainLearn = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
