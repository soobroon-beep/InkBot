/* INKBOT ⇄ NEURAL BRAIN — el «cerebro de tatuaje» que aprende de ti.
   - Cada cosa que haces en InkBot (👍/👎 a historias y al diccionario, reels creados, 🔥👍👎 a reels,
     vistas, cambios que pides) se guarda como recuerdo en tu cerebro «Tatuaje» de Neural Brain:
       users/{uid}/brains/tatuaje/inkbot/{id}   (solo tú lo ves; reglas actuales de Neural Brain)
   - El cerebro aprende solo (cada noche en el servidor, y aquí mismo una vez al día si hay recuerdos nuevos)
     y escribe «Lo que sé de ti». InkBot lo lee y lo usa en TODO lo que genera la IA.
   - Misma cuenta de Google que Neural Brain. Si ya entraste allí en este celular, se conecta solo. */
(function () {
  'use strict';
  var CFG = { apiKey: 'AIzaSyA2DWrIlysRhhzQoBwDWGNmon7uCD6yFMM', authDomain: 'neural-brain-148a4.firebaseapp.com', projectId: 'neural-brain-148a4', storageBucket: 'neural-brain-148a4.firebasestorage.app', messagingSenderId: '150945061630', appId: '1:150945061630:web:75babe8d8b88a1b48023af' };
  var FBV = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var BID = 'tatuaje', KEY = 'inkbot-brain-v1', NB_URL = '../Neural-Brain-Claude/';
  var st = load(), m = null, app = null, auth = null, db = null, user = null, known = false, unsub = null, learning = false, subs = [];
  function load() { try { return Object.assign({ queue: [], learned: null, off: false, lastAuto: 0 }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { queue: [], learned: null, off: false, lastAuto: 0 }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function clip(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function changed() { subs.forEach(function (f) { try { f(api.status()); } catch (e) {} }); }

  var _p = null;
  function boot() {
    if (_p) return _p;
    _p = Promise.all([import(FBV + 'firebase-app.js'), import(FBV + 'firebase-auth.js'), import(FBV + 'firebase-firestore.js')]).then(function (r) {
      m = { A: r[0], Au: r[1], F: r[2] };
      // Como app «[DEFAULT]» comparte la sesión que Neural Brain guarda en este mismo sitio (soobroon-beep.github.io)
      var apps = m.A.getApps(), def = apps.filter(function (a) { return a.name === '[DEFAULT]'; })[0];
      if (def && def.options.projectId === CFG.projectId) app = def;
      else if (!def) app = m.A.initializeApp(CFG);
      else app = apps.filter(function (a) { return a.name === 'neural-brain'; })[0] || m.A.initializeApp(CFG, 'neural-brain');
      auth = m.Au.getAuth(app); db = m.F.getFirestore(app);
      m.Au.onAuthStateChanged(auth, function (u) {
        known = true; user = u || null;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
        if (user) attach();
        changed();
      });
    }).catch(function (e) { console.warn('[Cerebro] no cargó', e && e.message); known = true; changed(); });
    return _p;
  }
  function bref() { return m.F.doc(db, 'users', user.uid, 'brains', BID); }

  function attach() {
    var F = m.F, ref = bref();
    // el cerebro «Tatuaje» existe y escucha a InkBot
    F.getDoc(ref).then(function (d) {
      if (!d.exists()) return F.setDoc(ref, { name: 'Tatuaje', icon: 'ink', color: '#f2c46d', desc: 'Ideas, estilo, clientes y lo que aprendo del oficio. Aprende de InkBot: lo que te gusta y lo que no de tu contenido.', sources: ['inkbot'], toVortex: false, order: 2, createdAt: Date.now() }, { merge: true });
      var s = (d.data() || {}).sources || [];
      if (s.indexOf('inkbot') < 0) return F.updateDoc(ref, { sources: F.arrayUnion('inkbot') });
    }).catch(function (e) { console.warn('[Cerebro]', e && e.message); });
    unsub = F.onSnapshot(ref, function (d) {
      var l = d.exists() && d.data().learned;
      if (l && l.text && (!st.learned || st.learned.at !== l.at)) { st.learned = { text: String(l.text), at: l.at || Date.now(), by: l.by || '' }; save(); changed(); }
    }, function () {});
    flush();
    setTimeout(autoLearn, 8000);
  }

  var flushing = false;
  function flush() {
    if (!user || flushing || !st.queue.length || st.off) return Promise.resolve();
    flushing = true;
    var F = m.F, batch = F.writeBatch(db), items = st.queue.slice(0, 200), col = F.collection(bref(), 'inkbot');
    items.forEach(function (e) { batch.set(F.doc(col, e.id), e); });
    return batch.commit().then(function () {
      var ids = {}; items.forEach(function (e) { ids[e.id] = 1; });
      st.queue = st.queue.filter(function (e) { return !ids[e.id]; }); save(); changed();
    }).catch(function (e) { console.warn('[Cerebro] no guardó', e && e.message); }).then(function () { flushing = false; if (st.queue.length && user) setTimeout(flush, 1500); });
  }

  // recuerdo: {act:'le gustó', type:'reel', title, text}
  function send(ev) {
    if (st.off || !ev) return;
    var e = { app: 'inkbot', act: clip(ev.act, 40), type: clip(ev.type, 40), title: clip(ev.title, 180), text: clip(ev.text, 900), at: Date.now() };
    e.id = 'ib_' + e.at.toString(36) + Math.random().toString(36).slice(2, 7);
    st.queue.push(e); st.queue = st.queue.slice(-400); save();
    if (user) flush(); else boot();
  }

  // ── aprender: usa el mismo «cerebro» de Neural Brain (brain-learn.js) ──
  var Lp = null;
  function lib() {
    if (window.BrainLearn) return Promise.resolve(window.BrainLearn);
    if (Lp) return Lp;
    function add(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = function () { window.BrainLearn ? res(window.BrainLearn) : rej(new Error('sin BrainLearn')); }; s.onerror = function () { rej(new Error('No cargó ' + src)); }; document.head.appendChild(s); }); }
    Lp = add(NB_URL + 'brain-learn.js').catch(function () { return add('vendor/brain-learn.js'); });
    Lp.catch(function () { Lp = null; });
    return Lp;
  }
  function learnNow(opts) {
    opts = opts || {};
    if (!user) return Promise.reject(new Error('Conecta tu cerebro primero'));
    if (learning) return Promise.reject(new Error('Ya está aprendiendo'));
    learning = true; changed();
    var F = m.F, ref = bref();
    return flush().then(function () {
      return Promise.all([lib(), F.getDoc(ref), F.getDocs(F.query(F.collection(ref, 'inkbot'), F.orderBy('at', 'desc'), F.limit(400))), F.getDocs(F.collection(ref, 'notes')).catch(function () { return { docs: [] }; })]);
    }).then(function (r) {
      var L = r[0], brain = Object.assign({ id: BID, name: 'Tatuaje', sources: ['inkbot'] }, r[1].data() || {});
      if ((brain.sources || []).indexOf('inkbot') < 0) brain.sources = (brain.sources || []).concat('inkbot');
      var evs = r[2].docs.map(function (d) { return Object.assign({ id: d.id, app: 'inkbot' }, d.data()); }).reverse();
      var notes = r[3].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      if (opts.auto && evs.length < 3 && !notes.length) throw new Error('Todavía pocos recuerdos');
      var name = (user.displayName || 'Payi').split(' ')[0];
      return L.chat(L.learnMessages(brain, notes, L.brainEvents(brain, evs), name), { maxTokens: 1500, timeout: 120000 }).then(function (res) {
        var learned = { text: res.text, at: Date.now(), by: 'InkBot · ' + res.model, events: evs.length, notes: notes.length };
        st.learned = { text: learned.text, at: learned.at, by: learned.by }; save();
        return F.setDoc(ref, { learned: learned }, { merge: true }).then(function () { return learned; });
      });
    }).finally(function () { learning = false; changed(); });
  }
  // se mejora solo: una vez al día, si llegaron recuerdos nuevos desde lo último que aprendió
  function autoLearn() {
    if (!user || learning || Date.now() - (st.lastAuto || 0) < 20 * 3600e3) return;
    var F = m.F, since = (st.learned && st.learned.at) || 0;
    F.getDocs(F.query(F.collection(bref(), 'inkbot'), F.where('at', '>', since), F.limit(3))).then(function (s) {
      if (s.size < 3) return;
      st.lastAuto = Date.now(); save();
      return learnNow({ auto: true });
    }).catch(function () {});
  }

  function login() {
    return boot().then(function () {
      var pr = new m.Au.GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
      return m.Au.signInWithPopup(auth, pr);
    });
  }
  function logout() { return boot().then(function () { return m.Au.signOut(auth); }); }

  // Lo que la IA de InkBot recibe en cada pedido
  function context() {
    if (st.off || !st.learned || !st.learned.text) return '';
    return '\n\nCEREBRO DE TATUAJE DEL USUARIO (lo que aprendió de sus gustos en InkBot y en Neural Brain; síguelo, sobre todo sus «Reglas para su próximo contenido» y evita lo que NO le gusta; nunca lo menciones):\n' + clip(st.learned.text, 2200);
  }
  function ago(t) { var s = (Date.now() - t) / 1000; if (s < 90) return 'hace un momento'; if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; return 'hace ' + Math.round(s / 86400) + ' días'; }

  var api = {
    send: send, context: context, login: login, logout: logout, learnNow: learnNow, boot: boot,
    learned: function () { return st.learned; },
    setOff: function (v) { st.off = !!v; save(); changed(); },
    onChange: function (f) { subs.push(f); },
    nbUrl: NB_URL,
    status: function () {
      return { known: known, user: user ? { name: user.displayName || '', email: user.email || '' } : null, pending: st.queue.length, learning: learning, off: st.off,
        learnedAt: st.learned && st.learned.at, ago: st.learned && st.learned.at ? ago(st.learned.at) : '' };
    }
  };
  window.BRAIN = api;
  // arranca sin estorbar: después de que cargue la app
  if (document.readyState === 'complete') setTimeout(boot, 1500); else window.addEventListener('load', function () { setTimeout(boot, 1500); });
  window.addEventListener('online', function () { flush(); });
})();
