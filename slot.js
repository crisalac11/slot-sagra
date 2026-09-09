  // Per sostituire un simbolo con un'immagine, basta salvare il file in
  // images/slot/<chiave>.jpg (o .jpeg/.png/.webp): wild, bonus, gem, moneybag, king, queen, jack, ten.
  //
  // Per usare suoni tuoi al posto di quelli generati, salva i file in sounds/
  // (estensione mp3/ogg/wav/m4a) con questi nomi:
  //   sounds/bonus-music   -> musica di sottofondo durante i giri gratis (in loop)
  //   sounds/line5         -> quando fai una linea da 5+ simboli
  //   sounds/bonus-appear  -> quando appare un simbolo BONUS sullo schermo
  //   sounds/bonus-trigger -> quando trovi 3+ BONUS e vinci i giri gratis (anche i rilanci)
  //   sounds/big-win       -> quando la vincita e' >= 20 volte la puntata
  //   sounds/wild-event    -> quando parte la funzione WILD a rulli fermi
  const SYMBOLS = {
    wild:     { label: 'WILD',   glyph: '\u{1F451}' },
    bonus:    { label: 'BONUS',  glyph: '\u{1F4D6}' },
    moneybag: { label: 'Sacco',  glyph: '\u{1F4B0}' },
    gem:      { label: 'Gemma',  glyph: '\u{1F48E}' },
    king:     { label: 'K',      glyph: 'K' },
    queen:    { label: 'Q',      glyph: 'Q' },
    jack:     { label: 'J',      glyph: 'J' },
    ten:      { label: '10',     glyph: '10' },
  };

  const LUCKY_CANDIDATES = ['moneybag', 'gem', 'king', 'queen', 'jack', 'ten'];

  // pesi dei simboli: nel gioco base il BONUS e' un filo piu' raro di prima;
  // durante i giri gratis lo e' ancora di piu' (ri-bonus meno frequente)
  const WEIGHTS      = { ten: 24, jack: 24, queen: 15, king: 15, gem: 9, moneybag: 5, wild: 4, bonus: 4 };
  const WEIGHTS_FREE = { ten: 24, jack: 24, queen: 15, king: 15, gem: 9, moneybag: 5, wild: 4, bonus: 3 };

  // tabella vincite calibrata: RTP ~102% (fair, giocatore leggermente avvantaggiato).
  // Ogni simbolo ha valori DIVERSI e crescenti. Il grosso del ritorno arriva
  // dai giri gratis, quindi le linee base pagano poco.
  const PAYTABLE = {
    ten:      { 3: 1,   4: 2,   5: 8,   6: 23,   7: 61 },
    jack:     { 3: 1.5, 4: 3,   5: 12,  6: 37,   7: 93 },
    queen:    { 3: 2,   4: 5,   5: 20,  6: 49,   7: 122 },
    king:     { 3: 3,   4: 7,   5: 27,  6: 64,   7: 168 },
    gem:      { 3: 4,   4: 13,  5: 47,  6: 115,  7: 282 },
    moneybag: { 3: 6,   4: 29,  5: 127, 6: 293,  7: 675 },
    wild:     { 3: 12,  4: 59,  5: 515, 6: 1250, 7: 3010 },
  };

  const PAYLINES = [
    [1,1,1,1,1],
    [0,0,0,0,0],
    [2,2,2,2,2],
    [0,1,2,1,0],
    [2,1,0,1,2],
    [0,0,1,2,2],
    [2,2,1,0,0],
    [1,0,0,0,1],
    [1,2,2,2,1],
  ];

  function stretchLine(line, targetLen) {
    if (targetLen === line.length) return line.slice();
    const out = [];
    for (let i = 0; i < targetLen; i++) {
      const srcIndex = Math.round(i * (line.length - 1) / (targetLen - 1));
      out.push(line[srcIndex]);
    }
    return out;
  }
  const paylinesCache = {};
  function getPaylines(n) {
    if (!paylinesCache[n]) paylinesCache[n] = PAYLINES.map(l => stretchLine(l, n));
    return paylinesCache[n];
  }

  const BET_STEPS = [1,2,5,10,25,50,100,250,500,1000,2500,5000,10000];
  const ADD_STEPS = [10,25,50,100,250,500,1000,2500,5000,10000];
  const MAX_BALANCE = 1000000;
  const IMG_EXTS = ['png', 'jpg', 'jpeg', 'webp'];
  const BASE_REELS = 5, BONUS_REELS = 7, ROWS = 3;
  const BIG_WIN_MULT = 20;
  // schermate celebrative: vincita totale >= N volte la puntata
  const WIN_GRANDE_MULT = 30, WIN_SUPER_MULT = 75, WIN_RANU_MULT = 150;
  const WILD_EVENT_CHANCE = 0.12;   // funzione wild: piu' rara
  const DAVIS_PEEK_CHANCE = 0.15;      // "RANU" si affaccia dal bordo (comprende la full)
  const DAVIS_FULL_CHANCE = 0.02;      // base della funzione vera (0 sacchi in vista)
  const DAVIS_FULL_PER_SACK = 0.01;    // +1% per ogni SACCO presente sulla slot (solo gioco base)
  const DAVIS_FULL_MAX = 0.09;         // tetto della probabilita'
  const DAVIS_BONUS_CHANCE = 0.10;     // nel bonus (fisso), solo se il simbolo fortunato e' SACCO
  const REEL_BASE_DURATION = 1.1;
  const REEL_STAGGER = 0.4;

  // giri gratis assegnati in base a quanti simboli BONUS escono insieme
  function freeSpinsForBonusCount(count) {
    if (count >= 4) return 15;
    if (count === 3) return 10;
    if (count === 2) return 3;   // vale solo come RI-bonus, gia' dentro ai giri gratis
    return 0;
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  function placeholderFor(glyph) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>
      <defs>
        <radialGradient id='g' cx='50%' cy='38%' r='65%'>
          <stop offset='0%' stop-color='#fff6d5'/>
          <stop offset='55%' stop-color='#e8b923'/>
          <stop offset='100%' stop-color='#8a5a00'/>
        </radialGradient>
      </defs>
      <circle cx='70' cy='70' r='62' fill='url(#g)' stroke='#7a0d0d' stroke-width='6'/>
      <text x='50%' y='55%' font-size='54' font-family='Georgia, serif' font-weight='bold' fill='#5a1a1a' text-anchor='middle' dominant-baseline='central'>${glyph}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function setupImageFallback(imgEl, key) {
    let i = 0;
    imgEl.onerror = function () {
      if (i < IMG_EXTS.length) {
        imgEl.src = `images/slot/${key}.${IMG_EXTS[i]}`;
        i++;
      } else {
        imgEl.onerror = null;
        imgEl.src = placeholderFor(SYMBOLS[key].glyph);
      }
    };
    imgEl.onerror();
  }

  const TOTAL_WEIGHT      = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const TOTAL_WEIGHT_FREE = Object.values(WEIGHTS_FREE).reduce((a, b) => a + b, 0);
  function weightedRandomSymbol(isFree) {
    const table = isFree ? WEIGHTS_FREE : WEIGHTS;
    let roll = Math.random() * (isFree ? TOTAL_WEIGHT_FREE : TOTAL_WEIGHT);
    for (const key in table) {
      if (roll < table[key]) return key;
      roll -= table[key];
    }
    return 'ten';
  }

  // crediti sempre interi: niente centesimi da nessuna parte
  function fmt(n) {
    return Math.round(n).toLocaleString('it-IT');
  }

  // ---------- stato ----------
  let balance = parseFloat(localStorage.getItem('segraSlotBalance'));
  if (isNaN(balance)) balance = 1000;
  let betIndex = parseInt(localStorage.getItem('segraSlotBetIndex'), 10);
  if (isNaN(betIndex) || betIndex < 0 || betIndex >= BET_STEPS.length) betIndex = 3;
  let spinning = false;
  let bonus = null; // { spinsLeft, luckySymbol, totalWin, bet }
  let noWinStreak = 0;   // giri base di fila senza vincere nulla -> funzione PIERONZO
  const PIERONZO_TRIGGER = 5;

  const balanceValue = document.getElementById('balanceValue');
  const betValue = document.getElementById('betValue');
  const spinBtn = document.getElementById('spinBtn');
  const betMinus = document.getElementById('betMinus');
  const betPlus = document.getElementById('betPlus');
  const addCreditBtn = document.getElementById('addCreditBtn');
  const resetCreditBtn = document.getElementById('resetCreditBtn');
  const addAmountSlider = document.getElementById('addAmountSlider');
  const addAmountValue = document.getElementById('addAmountValue');

  function renderAddAmount() {
    addAmountValue.textContent = fmt(ADD_STEPS[parseInt(addAmountSlider.value, 10)]);
  }
  addAmountSlider.addEventListener('input', renderAddAmount);
  renderAddAmount();
  const winBanner = document.getElementById('winBanner');
  const linesList = document.getElementById('linesList');
  const reelsEl = document.getElementById('reels');
  const marqueeEl = document.getElementById('marquee');
  const bonusOverlay = document.getElementById('bonusOverlay');
  const modalBody = document.getElementById('modalBody');
  const freeSpinHud = document.getElementById('freeSpinHud');
  const goldFlashEl = document.getElementById('goldFlash');
  const toastEl = document.getElementById('toast');
  const bigWinEl = document.getElementById('bigWin');
  const bigWinTitle = document.getElementById('bigWinTitle');
  const bigWinAmount = document.getElementById('bigWinAmount');
  const bigWinSub = document.getElementById('bigWinSub');

  function saveState() {
    localStorage.setItem('segraSlotBalance', balance);
    localStorage.setItem('segraSlotBetIndex', betIndex);
  }

  function renderStats() {
    balanceValue.textContent = fmt(balance);
    betValue.textContent = fmt(BET_STEPS[betIndex]);
    const locked = spinning || !!bonus;
    betMinus.disabled = betIndex === 0 || locked;
    betPlus.disabled = betIndex === BET_STEPS.length - 1 || locked;
    addCreditBtn.disabled = locked;
    resetCreditBtn.disabled = locked;
    addAmountSlider.disabled = locked;
    spinBtn.disabled = spinning || (!bonus && balance < BET_STEPS[betIndex]);
    if (spinning) spinBtn.textContent = 'IN CORSO…';
    else spinBtn.textContent = bonus ? 'GIRA (gratis)' : 'GIRA';
  }

  betMinus.addEventListener('click', () => {
    if (betIndex > 0) { betIndex--; saveState(); renderStats(); }
  });
  betPlus.addEventListener('click', () => {
    if (betIndex < BET_STEPS.length - 1) { betIndex++; saveState(); renderStats(); }
  });

  addCreditBtn.addEventListener('click', () => {
    if (balance >= MAX_BALANCE) {
      addCreditBtn.classList.remove('flash');
      void addCreditBtn.offsetWidth;
      addCreditBtn.classList.add('flash');
      return;
    }
    balance = Math.min(MAX_BALANCE, balance + ADD_STEPS[parseInt(addAmountSlider.value, 10)]);
    saveState();
    renderStats();
  });

  resetCreditBtn.addEventListener('click', () => {
    balance = 0;
    saveState();
    renderStats();
  });

  // ---------- audio generato ----------
  let audioCtx;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function beep(freq, duration, type, vol, delay) {
    ensureAudio();
    const t0 = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  }
  function playBeepSequence(freqs, duration, type, vol, gap) {
    freqs.forEach((f, i) => beep(f, duration, type, vol, i * gap));
  }
  function reelStopSound() { beep(420, 0.09, 'triangle', 0.18); }
  function winSound() { playBeepSequence([523, 659, 784], 0.22, 'sine', 0.16, 0.09); }
  function line5FallbackSound() { playBeepSequence([660, 880, 1100, 1320], 0.18, 'triangle', 0.18, 0.07); }
  function bonusAppearFallbackSound() { beep(300, 0.12, 'square', 0.12); }
  function bonusTriggerFallbackSound() { playBeepSequence([392, 523, 659, 784, 988, 1175], 0.3, 'square', 0.12, 0.1); }
  function bigWinFallbackSound() { playBeepSequence([523, 659, 784, 1047, 1319, 1568, 2093], 0.25, 'sine', 0.17, 0.08); }

  // rumore filtrato per il rullo che gira: piu' morbido di un tono puro,
  // e si abbassa di volume ad ogni colonna che si ferma
  let noiseBuffer = null;
  function getNoiseBuffer() {
    ensureAudio();
    if (!noiseBuffer) {
      const len = audioCtx.sampleRate * 2;
      noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }
  let spinSource = null, spinGain = null;
  const SPIN_BASE_GAIN = 0.30;
  function startSpinSound() {
    ensureAudio();
    stopSpinSound(true);            // uccidi qualsiasi rumore rimasto da prima
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer();
    src.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.8;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.linearRampToValueAtTime(SPIN_BASE_GAIN, audioCtx.currentTime + 0.15);
    src.connect(filter).connect(gain).connect(audioCtx.destination);
    src.start();
    spinSource = src;
    spinGain = gain;
  }
  function duckSpinSound(remaining, total) {
    if (!spinSource) return;
    const t = audioCtx.currentTime;
    const target = Math.max(SPIN_BASE_GAIN * (remaining / total), 0.0001);
    spinGain.gain.cancelScheduledValues(t);
    spinGain.gain.setValueAtTime(spinGain.gain.value, t);
    spinGain.gain.linearRampToValueAtTime(target, t + 0.2);
  }
  function stopSpinSound(immediate) {
    if (!spinSource) return;
    const src = spinSource, gain = spinGain;
    spinSource = null; spinGain = null;
    try {
      const t = audioCtx.currentTime;
      const dt = immediate ? 0.03 : 0.2;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0.0001, t + dt);
      src.stop(t + dt + 0.05);
    } catch (e) { /* gia' fermato */ }
  }

  // ---------- suoni personalizzati (sounds/) ----------
  const SOUND_EXTS = ['mp3', 'ogg', 'wav', 'm4a', 'mpeg'];
  const SOUND_FILES = { bonusMusic: 'bonus-music', line5: 'line5', bonusAppear: 'bonus-appear', bonusTrigger: 'bonus-trigger', bigWin: 'big-win', wildEvent: 'wild-event' };
  const customSounds = Object.fromEntries(Object.keys(SOUND_FILES).map(k => [k, null]));

  function loadCustomAudio(key) {
    const audio = new Audio();
    let i = 0;
    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', () => { customSounds[key] = audio; }, { once: true });
    audio.addEventListener('error', () => {
      i++;
      if (i < SOUND_EXTS.length) audio.src = `sounds/${SOUND_FILES[key]}.${SOUND_EXTS[i]}`;
      else customSounds[key] = null;
    });
    audio.src = `sounds/${SOUND_FILES[key]}.${SOUND_EXTS[0]}`;
  }
  Object.keys(customSounds).forEach(loadCustomAudio);

  function playCustom(key, opts) {
    const a = customSounds[key];
    if (!a) return false;
    a.loop = !!(opts && opts.loop);
    try { a.currentTime = 0; } catch (e) {}
    a.play().catch(() => {});
    return true;
  }
  function stopCustom(key) {
    const a = customSounds[key];
    if (a) { a.pause(); try { a.currentTime = 0; } catch (e) {} }
  }
  function playSoundOr(key, fallbackFn) {
    if (!playCustom(key)) fallbackFn();
  }

  // ---------- suoni sintetizzati della funzione WILD ----------
  function wildChargeSound() {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    [0, 4, 7].forEach((semi) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      const f0 = 220 * Math.pow(2, semi / 12);
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(f0 * 3, t0 + 0.6);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.78);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + 0.82);
    });
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer();
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(400, t0);
    bp.frequency.exponentialRampToValueAtTime(6000, t0 + 0.7);
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.exponentialRampToValueAtTime(0.12, t0 + 0.5);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.82);
    src.connect(bp).connect(ng).connect(audioCtx.destination);
    src.start(t0);
    src.stop(t0 + 0.85);
  }
  function wildShotSound() {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1400, t0);
    o.frequency.exponentialRampToValueAtTime(320, t0 + 0.18);
    g.gain.setValueAtTime(0.13, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0);
    o.stop(t0 + 0.22);
  }
  function wildImpactSound() {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    [1047, 1319, 1568].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01 + i * 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + 0.55);
    });
    const thud = audioCtx.createOscillator();
    const tg = audioCtx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(160, t0);
    thud.frequency.exponentialRampToValueAtTime(60, t0 + 0.25);
    tg.gain.setValueAtTime(0.16, t0);
    tg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    thud.connect(tg).connect(audioCtx.destination);
    thud.start(t0);
    thud.stop(t0 + 0.32);
  }
  function wildFinaleSound() {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const s = t0 + i * 0.06;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.1, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.9);
      o.connect(g).connect(audioCtx.destination);
      o.start(s);
      o.stop(s + 0.95);
    });
  }
  function bigWinFanfare(tier) {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    const notes = tier === 'ranu'
      ? [262, 330, 392, 523, 659, 784, 1047, 1319]
      : tier === 'super'
        ? [330, 415, 523, 659, 831, 1047]
        : [392, 523, 659, 784];
    const step = tier === 'ranu' ? 0.1 : 0.13;
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const s = t0 + i * step;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.08, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.75);
      o.connect(g).connect(audioCtx.destination);
      o.start(s);
      o.stop(s + 0.8);
    });
    const sc = t0 + notes.length * step;
    [523, 659, 784, 1047].forEach((f) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, sc);
      g.gain.exponentialRampToValueAtTime(0.06, sc + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, sc + 1.5);
      o.connect(g).connect(audioCtx.destination);
      o.start(sc);
      o.stop(sc + 1.6);
    });
  }
  function davisSwishSound(intensity) {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    const k = intensity || 1;
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer();
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 4;
    bp.frequency.setValueAtTime(300, t0);
    bp.frequency.exponentialRampToValueAtTime(2200 * k, t0 + 0.28);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12 * k, t0 + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    src.connect(bp).connect(g).connect(audioCtx.destination);
    src.start(t0);
    src.stop(t0 + 0.45);
    if (k >= 1) {
      [392, 523, 659].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const og = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const s = t0 + 0.05 + i * 0.05;
        og.gain.setValueAtTime(0.0001, s);
        og.gain.exponentialRampToValueAtTime(0.07, s + 0.03);
        og.gain.exponentialRampToValueAtTime(0.0001, s + 0.5);
        o.connect(og).connect(audioCtx.destination);
        o.start(s);
        o.stop(s + 0.55);
      });
    }
  }

  // ---------- fregi agli angoli (le 4 copie sono identiche, generate una volta) ----------
  (function buildCorners() {
    const path = 'M6,94 C6,58 22,36 54,30 C38,42 27,58 27,84 C27,58 43,42 64,36 C48,52 42,68 47,90';
    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', `corner ${pos}`);
      svg.setAttribute('viewBox', '0 0 100 100');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', path);
      p.setAttribute('stroke', '#ffd35c');
      p.setAttribute('stroke-width', '5');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke-linecap', 'round');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', '54');
      c.setAttribute('cy', '30');
      c.setAttribute('r', '5');
      c.setAttribute('fill', '#c8102e');
      svg.appendChild(p);
      svg.appendChild(c);
      marqueeEl.appendChild(svg);
    });
  })();

  // ---------- lucine cornice ----------
  const lampsEl = document.getElementById('lamps');
  (function buildLamps() {
    const count = 28;
    for (let i = 0; i < count; i++) {
      const lamp = document.createElement('div');
      lamp.className = 'lamp';
      const t = i / count;
      const perimeter = 2 * (100 + 60);
      const dist = t * perimeter;
      let x, y;
      if (dist < 100) { x = dist; y = 0; }
      else if (dist < 100 + 60) { x = 100; y = dist - 100; }
      else if (dist < 200 + 60) { x = 100 - (dist - 160); y = 60; }
      else { x = 0; y = 60 - (dist - 260); }
      lamp.style.left = x + '%';
      lamp.style.top = y + '%';
      lamp.style.animationDelay = (t * 1.4).toFixed(2) + 's';
      lampsEl.appendChild(lamp);
    }
  })();

  // ---------- costruzione rulli (dinamica: 5 in gioco normale, 7 in bonus) ----------
  let reelStrips = [];
  function buildReels(n) {
    reelsEl.querySelectorAll('.reel').forEach(r => r.remove());
    reelsEl.style.setProperty('--reels', n);
    reelStrips = [];
    for (let c = 0; c < n; c++) {
      const reel = document.createElement('div');
      reel.className = 'reel';
      const strip = document.createElement('div');
      strip.className = 'reel-strip';
      reel.appendChild(strip);
      reelsEl.appendChild(reel);
      reelStrips.push(strip);
    }
    renderIdleReels();
  }

  function addWildTag(cell) {
    if (cell.querySelector('.wild-tag')) return;
    const tag = document.createElement('span');
    tag.className = 'wild-tag';
    tag.textContent = 'WILD';
    cell.appendChild(tag);
  }

  function makeCell(key, expanded) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (expanded ? ' expand-glow' : '');
    cell.dataset.symbol = key;
    const img = document.createElement('img');
    img.alt = SYMBOLS[key].label;
    setupImageFallback(img, key);
    cell.appendChild(img);
    if (key === 'wild') addWildTag(cell);
    return cell;
  }

  function renderIdleReels() {
    reelStrips.forEach(strip => {
      strip.innerHTML = '';
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      for (let r = 0; r < ROWS; r++) {
        strip.appendChild(makeCell(weightedRandomSymbol(), false));
      }
    });
  }

  buildReels(BASE_REELS);

  // ---------- linee di vincita lampeggianti ----------
  const lineOverlay = document.getElementById('lineOverlay');
  const LINE_COLORS = ['#00e5ff', '#39ff14', '#ff2fd0', '#ffffff', '#ff8c00', '#7cfc00', '#1e90ff', '#ff4d6d', '#ffd35c'];

  function cellCenter(col, row, reelsRect) {
    const strip = reelStrips[col];
    const cellEl = strip.children[strip.children.length - ROWS + row];
    const cellRect = cellEl.getBoundingClientRect();
    return {
      x: cellRect.left + cellRect.width / 2 - reelsRect.left,
      y: cellRect.top + cellRect.height / 2 - reelsRect.top,
    };
  }

  // ogni chiamata invalida qualunque sequenza di linee ancora in coda:
  // cosi' spinnando a raffica le linee della giocata precedente non
  // ricompaiono sopra quella nuova
  let lineSeq = 0;
  function clearLineOverlay() {
    lineSeq++;
    lineOverlay.innerHTML = '';
  }

  function drawLine(pattern, colorIndex, reelsRect) {
    lineOverlay.setAttribute('viewBox', `0 0 ${reelsRect.width} ${reelsRect.height}`);
    lineOverlay.innerHTML = '';
    const color = LINE_COLORS[colorIndex % LINE_COLORS.length];
    const points = pattern.map((row, c) => cellCenter(c, row, reelsRect));

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    poly.setAttribute('style', `stroke:${color}; color:${color}`);
    poly.classList.add('show');
    lineOverlay.appendChild(poly);

    points.forEach(p => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', p.x);
      dot.setAttribute('cy', p.y);
      dot.setAttribute('r', 6);
      dot.setAttribute('style', `fill:${color}; color:${color}`);
      dot.classList.add('show');
      lineOverlay.appendChild(dot);
    });
  }

  function showWinningLines(lineResults, paylinesActive) {
    clearLineOverlay();
    if (!lineResults.length) return;
    const seq = lineSeq;
    const reelsRect = reelsEl.getBoundingClientRect();
    let i = 0;
    function next() {
      if (seq !== lineSeq) return;           // una nuova giocata ha annullato la sequenza
      drawLine(paylinesActive[lineResults[i].lineIdx], i, reelsRect);
      i++;
      if (i < lineResults.length) setTimeout(next, 900);
      else setTimeout(() => { if (seq === lineSeq) lineOverlay.innerHTML = ''; }, 900);
    }
    next();
  }

  // ---------- valutazione linee ----------
  function evaluateLine(symbols) {
    let paySymbol = null;
    for (const s of symbols) {
      if (s !== 'wild') { paySymbol = s; break; }
    }
    if (paySymbol === null) paySymbol = 'wild';
    if (!PAYTABLE[paySymbol]) return null;
    let count = 0;
    for (const s of symbols) {
      if (s === paySymbol || s === 'wild') count++;
      else break;
    }
    if (count < 3) return null;
    const mult = PAYTABLE[paySymbol][count];
    if (!mult) return null;
    return { symbol: paySymbol, count };
  }

  // ---------- funzione WILD (parte a rulli fermi) ----------
  // sceglie 2..5 caselle a caso: queste NON vengono toccate durante lo spin,
  // ci arrivano le comete dell'emblema WILD dopo che i rulli si sono fermati.
  // NON tocca mai un simbolo BONUS, cosi' non puo' rubare un bonus.
  function pickWildPositions(n, grid) {
    const cells = [];
    for (let c = 0; c < n; c++) {
      for (let r = 0; r < ROWS; r++) {
        // mai sopra un BONUS (ruberebbe il bonus) ne' sopra un WILD gia' presente
        if (grid[c][r] !== 'bonus' && grid[c][r] !== 'wild') cells.push([c, r]);
      }
    }
    if (cells.length < 2) return null;
    const count = Math.min(2 + Math.floor(Math.random() * 4), cells.length);
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (cells.length - i));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells.slice(0, count).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  // elementi/timer volatili dell'animazione wild: tutto tracciato cosi'
  // clearWildFx() puo' ripulire di colpo se parte una nuova giocata
  let wildNodes = [];
  let wildTimers = [];
  function clearWildFx() {
    wildTimers.forEach(id => { clearTimeout(id); clearInterval(id); });
    wildTimers = [];
    wildNodes.forEach(n => n.remove());
    wildNodes = [];
    document.querySelectorAll('.wild-emblem, .wild-comet, .wild-spark, .wild-ring, .wild-burst, .wild-vignette, .davis, .green-wash')
      .forEach(n => n.remove());
    reelsEl.querySelectorAll('.cell.wild-born, .cell.gem-born').forEach(c => c.classList.remove('wild-born', 'gem-born'));
    document.body.classList.remove('davis-green');
  }

  function landedCell(col, row) {
    const strip = reelStrips[col];
    return strip.children[strip.children.length - ROWS + row];
  }

  function convertCellToWild(c, r, grid) {
    grid[c][r] = 'wild';
    const cellEl = landedCell(c, r);
    if (!cellEl) return;
    cellEl.dataset.symbol = 'wild';
    cellEl.classList.remove('expand-glow');
    void cellEl.offsetWidth;
    cellEl.classList.add('wild-born');
    const img = cellEl.querySelector('img');
    if (img) { img.className = ''; setupImageFallback(img, 'wild'); }
    addWildTag(cellEl);
  }

  function wildSparkAt(x, y, green) {
    const s = document.createElement('div');
    s.className = 'wild-spark' + (green ? ' gem' : '');
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    document.body.appendChild(s);
    wildNodes.push(s);
    wildTimers.push(setTimeout(() => s.remove(), 440));
  }

  function wildImpactAt(x, y, green) {
    const ring = document.createElement('div');
    ring.className = 'wild-ring' + (green ? ' gem' : '');
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    document.body.appendChild(ring);
    wildNodes.push(ring);
    wildTimers.push(setTimeout(() => ring.remove(), 640));

    const burst = document.createElement('div');
    burst.className = 'wild-burst';
    burst.style.left = x + 'px';
    burst.style.top = y + 'px';
    document.body.appendChild(burst);
    wildNodes.push(burst);
    wildTimers.push(setTimeout(() => burst.remove(), 520));

    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const d = 24 + Math.random() * 22;
      wildSparkAt(x + Math.cos(a) * d, y + Math.sin(a) * d, green);
    }
  }

  function fireComet(x1, y1, x2, y2, onHit, green) {
    const DUR = 380;
    const comet = document.createElement('div');
    comet.className = 'wild-comet' + (green ? ' gem' : '');
    comet.style.left = x1 + 'px';
    comet.style.top = y1 + 'px';
    comet.style.setProperty('--tx', (x2 - x1) + 'px');
    comet.style.setProperty('--ty', (y2 - y1) + 'px');
    document.body.appendChild(comet);
    wildNodes.push(comet);

    const start = performance.now();
    const trail = setInterval(() => {
      const p = Math.min((performance.now() - start) / DUR, 1);
      wildSparkAt(x1 + (x2 - x1) * p + (Math.random() * 10 - 5),
                  y1 + (y2 - y1) * p + (Math.random() * 10 - 5), green);
      if (p >= 1) clearInterval(trail);
    }, 22);
    wildTimers.push(trail);

    wildTimers.push(setTimeout(() => {
      clearInterval(trail);
      comet.remove();
      onHit(x2, y2);
    }, DUR));
  }

  function runWildEvent(positions, grid) {
    return new Promise((resolve) => {
      const hasCustom = !!customSounds.wildEvent;
      if (hasCustom) playCustom('wildEvent'); else wildChargeSound();

      const vign = document.createElement('div');
      vign.className = 'wild-vignette';
      document.body.appendChild(vign);
      wildNodes.push(vign);
      requestAnimationFrame(() => vign.classList.add('show'));

      const emblem = document.createElement('div');
      emblem.className = 'wild-emblem';
      emblem.innerHTML = '<div class="rays"></div><div class="ring"></div><div class="core"><span>Wild</span></div>';
      document.body.appendChild(emblem);
      wildNodes.push(emblem);

      const rr = reelsEl.getBoundingClientRect();
      const ex = rr.left + rr.width / 2;
      const ey = Math.max(rr.top + 6, 96);
      emblem.style.left = ex + 'px';
      emblem.style.top = ey + 'px';
      requestAnimationFrame(() => emblem.classList.add('in'));

      let i = 0;
      function nextShot() {
        if (i >= positions.length) {
          wildTimers.push(setTimeout(finale, 260));
          return;
        }
        const [c, r] = positions[i];
        const cellEl = landedCell(c, r);
        const cr = cellEl.getBoundingClientRect();
        const tx = cr.left + cr.width / 2;
        const ty = cr.top + cr.height / 2;
        if (!hasCustom) wildShotSound();
        fireComet(ex, ey, tx, ty, (hx, hy) => {
          wildImpactAt(hx, hy);
          convertCellToWild(c, r, grid);
          if (!hasCustom) wildImpactSound();
        });
        i++;
        wildTimers.push(setTimeout(nextShot, 180));
      }

      function finale() {
        if (!hasCustom) wildFinaleSound();
        emblem.classList.remove('in');
        emblem.classList.add('out');
        wildTimers.push(setTimeout(() => { clearWildFx(); resolve(); }, 380));
      }

      wildTimers.push(setTimeout(nextShot, 500));
    });
  }

  // ---------- funzione "RANU" ----------
  // immagine caricata dall'utente in images/slot/RANUSCATTER.<est>. E' legata
  // al simbolo SACCO: la versione vera riempie di SACCHI, anche nel bonus.
  function makeDavisImg() {
    const img = document.createElement('img');
    img.className = 'davis-img';
    let i = 0;
    img.onerror = function () {
      if (i < IMG_EXTS.length) { img.src = 'images/slot/RANUSCATTER.' + IMG_EXTS[i]; i++; }
      else {
        img.onerror = null;
        img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
          "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='260'><rect width='160' height='260' rx='18' fill='#123d1e'/><text x='50%' y='42%' font-size='70' text-anchor='middle' dominant-baseline='central'>👀</text></svg>");
      }
    };
    img.onerror();
    return img;
  }

  // "pozzo" che ritaglia l'immagine: si vede solo la parte che sbuca dal bordo
  // inferiore dei rulli. kind: 'peek' (piccola) | 'full' (piu' grande)
  function makeDavisEl(kind) {
    const d = document.createElement('div');
    d.className = 'davis';
    d.appendChild(makeDavisImg());
    const rr = reelsEl.getBoundingClientRect();
    const cell = rr.height / ROWS;
    const full = kind === 'full';
    // anche la funzione vera resta piccola: si affaccia dall'angolo, non copre la slot
    const wellW = (full ? cell * 1.15 : cell * 0.95);
    const wellH = (full ? cell * 2.3  : cell * 1.9);
    d.style.width = wellW + 'px';
    d.style.height = wellH + 'px';
    d.style.left = (rr.left + rr.width * 0.02) + 'px';
    d.style.top = (rr.bottom - wellH) + 'px';   // fondo del pozzo = fondo dei rulli
    document.body.appendChild(d);
    wildNodes.push(d);
    return d;
  }

  // ~13%: solo la testa sbuca dal bordo e si rinasconde, prima che i rulli si fermino
  function davisPeek() {
    const d = makeDavisEl('peek');
    davisSwishSound(0.4);
    requestAnimationFrame(() => d.classList.add('peek'));
    wildTimers.push(setTimeout(() => d.remove(), 1650));
  }

  // caselle libere (no BONUS, no WILD), con almeno una linea vincente garantita (base)
  function pickRanuPositions(n, grid, paylinesActive) {
    const free = [];
    for (let c = 0; c < n; c++) for (let r = 0; r < ROWS; r++) {
      if (grid[c][r] !== 'bonus' && grid[c][r] !== 'wild') free.push(c + '_' + r);
    }
    const freeSet = new Set(free);
    const chosen = new Set();
    for (let t = 0; t < 8; t++) {
      const line = paylinesActive[Math.floor(Math.random() * paylinesActive.length)];
      const trio = [[0, line[0]], [1, line[1]], [2, line[2]]];
      if (trio.every(([c, r]) => freeSet.has(c + '_' + r))) { trio.forEach(([c, r]) => chosen.add(c + '_' + r)); break; }
      // ripiego: converti solo le caselle libere del trio (un WILD nel trio aiuta comunque a pagare)
      if (t === 7) trio.forEach(([c, r]) => { if (freeSet.has(c + '_' + r)) chosen.add(c + '_' + r); });
    }
    const target = 3 + Math.floor(Math.random() * 6); // 3..8
    const pool = free.filter(k => !chosen.has(k));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    while (chosen.size < target && pool.length) chosen.add(pool.pop());
    return [...chosen].map(k => k.split('_').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  // nel bonus: 2..5 colonne intere di SACCO (prob. decrescente), nessuna garanzia.
  // NON tocca colonne che hanno gia' un SACCO.
  function pickRanuColumns(n, grid) {
    const avail = [];
    for (let c = 0; c < n; c++) if (!grid[c].includes('moneybag')) avail.push(c);
    if (avail.length < 2) return [];
    const weights = [0, 0, 50, 30, 15, 5];   // 2 colonne piu' probabile, 5 raro
    let roll = Math.random() * 100, count = 2;
    for (let k = 2; k <= 5; k++) { if (roll < weights[k]) { count = k; break; } roll -= weights[k]; }
    count = Math.min(count, avail.length);
    for (let i = 0; i < count; i++) { const j = i + Math.floor(Math.random() * (avail.length - i)); [avail[i], avail[j]] = [avail[j], avail[i]]; }
    const positions = [];
    avail.slice(0, count).forEach(c => { for (let r = 0; r < ROWS; r++) positions.push([c, r]); });
    return positions.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  function convertCellToSack(c, r, grid) {
    grid[c][r] = 'moneybag';
    const cellEl = landedCell(c, r);
    if (!cellEl) return;
    cellEl.dataset.symbol = 'moneybag';
    cellEl.classList.remove('expand-glow');
    const tag = cellEl.querySelector('.wild-tag');
    if (tag) tag.remove();
    void cellEl.offsetWidth;
    cellEl.classList.add('gem-born', 'ranu-glow');   // 'ranu-glow' resta fino al giro dopo
    const img = cellEl.querySelector('img');
    if (img) { img.className = ''; setupImageFallback(img, 'moneybag'); }
  }

  // versione "vera": RANU esce con calma, la schermata vira al verde, lancia i
  // SACCHI uno a uno godendosi il momento, poi si rinasconde piano
  function runRanuFeature(positions, grid) {
    return new Promise((resolve) => {
      const wash = document.createElement('div');
      wash.className = 'green-wash';
      document.body.appendChild(wash);
      wildNodes.push(wash);
      requestAnimationFrame(() => { wash.classList.add('show'); document.body.classList.add('davis-green'); });

      const d = makeDavisEl('full');
      davisSwishSound(1);
      requestAnimationFrame(() => d.classList.add('out'));

      // "poof" di scintille quando spunta dall'angolo
      const dr0 = d.getBoundingClientRect();
      wildTimers.push(setTimeout(() => {
        const px = dr0.left + dr0.width * 0.5;
        const py = reelsEl.getBoundingClientRect().bottom - dr0.height * 0.4;
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          const rad = 14 + Math.random() * 30;
          wildSparkAt(px + Math.cos(a) * rad, py + Math.sin(a) * rad - 6, true);
        }
      }, 260));

      // origine dei tiri: dalle "mani" di RANU (parte alta del pozzo)
      function origin() {
        const dr = d.getBoundingClientRect();
        return { x: dr.left + dr.width * 0.6, y: dr.top + dr.height * 0.42 };
      }

      let i = 0;
      function nextShot() {
        if (i >= positions.length) { wildTimers.push(setTimeout(finish, 520)); return; }
        const [c, r] = positions[i];
        const cellEl = landedCell(c, r);
        const cr = cellEl.getBoundingClientRect();
        const o = origin();
        wildShotSound();
        fireComet(o.x, o.y, cr.left + cr.width / 2, cr.top + cr.height / 2, (hx, hy) => {
          wildImpactAt(hx, hy, true);
          convertCellToSack(c, r, grid);
          wildImpactSound();
        }, true);
        i++;
        wildTimers.push(setTimeout(nextShot, 300));   // piu' lento, si gode il momento
      }

      function finish() {
        wildFinaleSound();
        d.classList.remove('out');
        d.classList.add('hide');
        wildTimers.push(setTimeout(() => {
          wash.classList.remove('show');
          document.body.classList.remove('davis-green');
          wildTimers.push(setTimeout(() => { clearWildFx(); resolve(); }, 520));
        }, 260));
      }

      // pausa iniziale: RANU sale col rimbalzo e si affaccia con comodo
      wildTimers.push(setTimeout(nextShot, 1150));
    });
  }

  // ---------- lampo dorato + toast ----------
  function triggerGoldFlash() {
    goldFlashEl.innerHTML = '';
    const sparkChars = ['✦', '✧', '⭐', '✨'];
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.textContent = sparkChars[i % sparkChars.length];
      const angle = (i / 10) * Math.PI * 2;
      const dist = 160 + Math.random() * 80;
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      s.style.animationDelay = (Math.random() * 0.15) + 's';
      goldFlashEl.appendChild(s);
    }
    goldFlashEl.classList.remove('show');
    void goldFlashEl.offsetWidth;
    goldFlashEl.classList.add('show');
    setTimeout(() => goldFlashEl.classList.remove('show'), 1400);
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
  }

  // ---------- schermata celebrativa GRANDE / SUPER / RANU ----------
  const BIG_WIN_CFG = {
    grande: { name: 'GRANDE VINCITA',            sub: '',             dur: 2600, coinGap: 110 },
    super:  { name: 'SUPER VINCITA',             sub: 'che colpo',    dur: 3800, coinGap: 70 },
    ranu:   { name: 'RANU VINCITA DELLA FICA',   sub: 'leggendario',  dur: 5200, coinGap: 42 },
  };
  const COIN_GLYPHS = ['\u{1F4B0}', '\u{1FA99}', '⭐', '✨', '\u{1F911}'];

  function showBigWin(tier, amount) {
    return new Promise((resolve) => {
      const cfg = BIG_WIN_CFG[tier] || BIG_WIN_CFG.grande;
      bigWinEl.querySelectorAll('.bigwin-coin').forEach(n => n.remove());
      bigWinEl.className = 'bigwin ' + tier;
      bigWinTitle.textContent = cfg.name;
      bigWinSub.textContent = cfg.sub;
      bigWinAmount.textContent = '0';
      void bigWinEl.offsetWidth;
      bigWinEl.classList.add('show');
      bigWinEl.setAttribute('aria-hidden', 'false');

      playSoundOr('bigWin', bigWinFallbackSound);
      bigWinFanfare(tier);

      const coinTimer = setInterval(() => {
        const el = document.createElement('div');
        el.className = 'bigwin-coin';
        el.textContent = COIN_GLYPHS[Math.floor(Math.random() * COIN_GLYPHS.length)];
        el.style.left = (30 + Math.random() * 40) + '%';
        el.style.top = (42 + Math.random() * 18) + '%';
        const ang = Math.random() * Math.PI * 2;
        const dist = 130 + Math.random() * 300;
        el.style.setProperty('--cx', Math.cos(ang) * dist + 'px');
        el.style.setProperty('--cy', (Math.sin(ang) * dist - 120) + 'px');
        el.style.setProperty('--cr', (Math.random() * 720 - 360) + 'deg');
        bigWinEl.appendChild(el);
        setTimeout(() => el.remove(), 1800);
      }, cfg.coinGap);

      const t0 = performance.now();
      const countDur = Math.min(cfg.dur * 0.6, 2200);
      function tick(now) {
        if (!bigWinEl.classList.contains('show')) return;
        const p = Math.min((now - t0) / countDur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        bigWinAmount.textContent = fmt(Math.round(amount * eased));
        if (p < 1) requestAnimationFrame(tick);
        else bigWinAmount.textContent = fmt(amount);
      }
      requestAnimationFrame(tick);

      setTimeout(() => {
        clearInterval(coinTimer);
        bigWinEl.classList.remove('show');
        bigWinEl.setAttribute('aria-hidden', 'true');
        resolve();
      }, cfg.dur);
    });
  }


  // ---------- modale generica ----------
  function showBonusModal(opts) {
    let html = `<h2>${opts.title}</h2>`;
    if (opts.symbolKey) html += `<img class="modal-symbol" id="modalSymbolImg" alt="">`;
    html += `<div class="amount">${opts.bodyHtml || ''}</div>`;
    html += `<button id="modalActionBtn">${opts.buttonLabel}</button>`;
    modalBody.innerHTML = html;
    if (opts.symbolKey) setupImageFallback(document.getElementById('modalSymbolImg'), opts.symbolKey);
    bonusOverlay.classList.add('show');
    document.getElementById('modalActionBtn').addEventListener('click', () => {
      bonusOverlay.classList.remove('show');
      if (opts.onClose) opts.onClose();
    }, { once: true });
  }

  function updateFreeSpinHud() {
    if (!bonus) { freeSpinHud.innerHTML = ''; return; }
    const sym = SYMBOLS[bonus.luckySymbol];
    freeSpinHud.innerHTML = `Giri gratis rimasti: <strong>${bonus.spinsLeft}</strong> &nbsp;&middot;&nbsp; Simbolo fortunato: <img class="lucky-icon" id="luckyIconImg" alt="${sym.label}"> ${sym.label} &nbsp;&middot;&nbsp; Vincita bonus: <strong>${fmt(bonus.totalWin)}</strong>`;
    const img = document.getElementById('luckyIconImg');
    if (img) setupImageFallback(img, bonus.luckySymbol);
  }

  // ---------- ciclo di spin (gioco normale e giri gratis) ----------
  function clearPresentation() {
    winBanner.className = 'win-banner';
    winBanner.textContent = '';
    linesList.innerHTML = '';
    reelsEl.querySelectorAll('.cell.win, .cell.ranu-glow').forEach(c => c.classList.remove('win', 'ranu-glow'));
    clearLineOverlay();
    clearWildFx();
    stopSpinSound(true);   // sicurezza: mai lasciare il rumore acceso
  }

  function performSpin(isFree) {
    if (spinning) return;
    const paylinesActive = getPaylines(reelStrips.length);
    const bet = isFree ? bonus.bet : BET_STEPS[betIndex];
    if (!isFree && balance < bet) return;

    spinning = true;
    if (!isFree) {
      balance = round2(balance - bet);
      saveState();
    }
    renderStats();
    clearPresentation();

    const n = reelStrips.length;
    const grid = [];
    const expandedReel = [];
    for (let c = 0; c < n; c++) {
      let col = [weightedRandomSymbol(isFree), weightedRandomSymbol(isFree), weightedRandomSymbol(isFree)];
      let didExpand = false;
      if (isFree && col.includes(bonus.luckySymbol)) {
        col = [bonus.luckySymbol, bonus.luckySymbol, bonus.luckySymbol];
        didExpand = true;
      }
      grid.push(col);
      expandedReel.push(didExpand);
    }

    // funzioni speciali a rulli FERMI (WILD e davis sono ESCLUSIVE tra loro)
    let wildEventPositions = null;
    let davisMode = null;       // 'peek' | 'full' | 'bonuscols'
    let ranuBonusCols = null;
    if (!isFree) {
      if (Math.random() < WILD_EVENT_CHANCE) {
        wildEventPositions = pickWildPositions(n, grid);
      }
      if (!wildEventPositions) {
        // piu' SACCHI sono in vista, piu' e' probabile la funzione vera (solo gioco base)
        const sacchi = grid.reduce((a, col) => a + col.filter(s => s === 'moneybag').length, 0);
        const fullChance = Math.min(DAVIS_FULL_CHANCE + sacchi * DAVIS_FULL_PER_SACK, DAVIS_FULL_MAX);
        const dr = Math.random();
        if (dr < fullChance) davisMode = 'full';
        else if (dr < DAVIS_PEEK_CHANCE) davisMode = 'peek';
      }
    } else if (bonus.luckySymbol === 'moneybag' && Math.random() < DAVIS_BONUS_CHANCE) {
      // nel bonus: solo colonne che NON hanno gia' un SACCO
      ranuBonusCols = pickRanuColumns(n, grid);
      if (ranuBonusCols.length) davisMode = 'bonuscols';
    }

    const FILLER = 14;
    // dimensione reale di una casella in px: NON leggibile da --cell, che ora
    // vale un'espressione min(...); si misura dal rullo gia' renderizzato
    const firstReel = reelsEl.querySelector('.reel');
    const CELL_PX = firstReel
      ? firstReel.getBoundingClientRect().height / ROWS
      : (parseInt(getComputedStyle(marqueeEl).getPropertyValue('--cell'), 10) || 80);
    let lastDuration = 0;

    startSpinSound();

    // teaser di davis: si affaccia e sparisce prima che i rulli si fermino
    if (davisMode === 'peek') wildTimers.push(setTimeout(davisPeek, 350));

    reelStrips.forEach((strip, c) => {
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.classList.add('spin-blur');
      strip.innerHTML = '';

      // una sola inserzione nel DOM invece di 17: piu' leggero per giro
      const frag = document.createDocumentFragment();
      for (let f = 0; f < FILLER; f++) frag.appendChild(makeCell(weightedRandomSymbol(isFree), false));
      for (let r = 0; r < ROWS; r++) frag.appendChild(makeCell(grid[c][r], expandedReel[c]));
      strip.appendChild(frag);

      void strip.offsetWidth;

      const duration = REEL_BASE_DURATION + c * REEL_STAGGER;
      lastDuration = Math.max(lastDuration, duration);
      strip.style.transition = `transform ${duration}s cubic-bezier(0.22, 0.61, 0.36, 1)`;
      strip.style.transform = `translateY(-${FILLER * CELL_PX}px)`;

      const onEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        strip.classList.remove('spin-blur');
        reelStopSound();
        duckSpinSound(n - 1 - c, n);
        if (c === n - 1) setTimeout(stopSpinSound, 60);
      };
      strip.addEventListener('transitionend', onEnd, { once: true });
    });

    setTimeout(() => {
      let chain;
      if (wildEventPositions) {
        chain = runWildEvent(wildEventPositions, grid);
      } else if (davisMode === 'full') {
        chain = runRanuFeature(pickRanuPositions(n, grid, paylinesActive), grid);
      } else if (davisMode === 'bonuscols') {
        chain = runRanuFeature(ranuBonusCols, grid);
      } else {
        chain = Promise.resolve();
      }
      chain.then(() => finishSpin(grid, bet, paylinesActive, isFree));
    }, lastDuration * 1000 + 160);
  }

  function finishSpin(grid, bet, paylinesActive, isFree) {
    stopSpinSound(true);   // sicurezza: il rumore di spin non deve sopravvivere ai rulli fermi
    const betPerLine = bet / paylinesActive.length;
    let totalWin = 0;
    const winningCells = [];
    const lineResults = [];

    paylinesActive.forEach((pattern, idx) => {
      const symbols = pattern.map((row, c) => grid[c][row]);
      const result = evaluateLine(symbols);
      if (result) {
        const mult = PAYTABLE[result.symbol][result.count];
        const amount = Math.round(mult * betPerLine);   // crediti interi
        if (amount > 0) {
          totalWin += amount;
          lineResults.push({ lineIdx: idx, symbol: result.symbol, count: result.count, amount });
          for (let c = 0; c < result.count; c++) winningCells.push([c, pattern[c]]);
        }
      }
    });

    let bonusCount = 0;
    grid.forEach(col => col.forEach(s => { if (s === 'bonus') bonusCount++; }));

    totalWin = Math.round(totalWin);
    balance = Math.round(balance + totalWin);
    saveState();
    renderStats();

    winningCells.forEach(([c, r]) => {
      const strip = reelStrips[c];
      const cellEl = strip.children[strip.children.length - ROWS + r];
      if (cellEl) cellEl.classList.add('win');
    });

    const winMult = bet > 0 ? totalWin / bet : 0;
    const isBigWin = totalWin >= bet * BIG_WIN_MULT;
    const hasBigLine = lineResults.some(r => r.count >= 5);
    let bigTier = null;
    if (winMult >= WIN_RANU_MULT) bigTier = 'ranu';
    else if (winMult >= WIN_SUPER_MULT) bigTier = 'super';
    else if (winMult >= WIN_GRANDE_MULT) bigTier = 'grande';

    if (totalWin > 0) {
      winBanner.textContent = (isBigWin ? 'GRANDE VINCITA! +' : 'VINCITA! +') + fmt(totalWin);
      winBanner.classList.add('show');
      linesList.innerHTML = lineResults.map(r =>
        `Linea ${r.lineIdx + 1} &mdash; ${SYMBOLS[r.symbol].label} x${r.count} &rarr; +${fmt(r.amount)}`
      ).join('<br>');
      if (!isFree) showWinningLines(lineResults, paylinesActive);
      if (isBigWin) playSoundOr('bigWin', bigWinFallbackSound);
      else winSound();
    }

    if (hasBigLine) playSoundOr('line5', line5FallbackSound);
    if (bonusCount > 0) playSoundOr('bonusAppear', bonusAppearFallbackSound);

    // giri gratis: base -> servono 3+ BONUS; dentro al bonus bastano 2 (ri-bonus)
    const award = isFree ? freeSpinsForBonusCount(bonusCount)
                         : (bonusCount >= 3 ? freeSpinsForBonusCount(bonusCount) : 0);
    if (award > 0) playSoundOr('bonusTrigger', bonusTriggerFallbackSound);

    if (isFree) bonus.totalWin = Math.round(bonus.totalWin + totalWin);

    const delay = totalWin > 0 ? 1400 : 500;

    // la conclusione del giro (bonus / autospin / fine bonus) parte solo DOPO
    // l'eventuale schermata celebrativa
    function conclude() {
      if (!isFree) {
        if (award > 0) {
          noWinStreak = 0;
          setTimeout(() => startBonusFeature(bet, award), delay);
        } else if (totalWin > 0) {
          noWinStreak = 0;
          spinning = false;
          renderStats();
          scheduleAuto(delay);
        } else {
          noWinStreak++;
          if (noWinStreak >= PIERONZO_TRIGGER) {
            noWinStreak = 0;
            setTimeout(() => {
              startPieronzo(bet).then(() => {
                spinning = false;
                renderStats();
                scheduleAuto(1200);
              });
            }, delay);
          } else {
            spinning = false;
            renderStats();
            scheduleAuto(delay);
          }
        }
      } else {
        if (award > 0) {
          bonus.spinsLeft += award;
          showToast('+' + award + ' GIRI GRATIS!');
        }
        bonus.spinsLeft -= 1;
        updateFreeSpinHud();
        spinning = false;
        if (bonus.spinsLeft > 0) {
          renderStats();
          scheduleAuto(delay);
        } else {
          setTimeout(() => endBonusFeature(), delay);
        }
      }
    }

    if (bigTier) showBigWin(bigTier, totalWin).then(conclude);
    else conclude();
  }

  // ---------- bonus: giri gratis con simbolo fortunato espandibile ----------
  function startBonusFeature(bet, award) {
    const spins = award || 10;
    const luckySymbol = LUCKY_CANDIDATES[Math.floor(Math.random() * LUCKY_CANDIDATES.length)];
    bonus = { spinsLeft: spins, luckySymbol, totalWin: 0, bet };

    triggerGoldFlash();

    showBonusModal({
      title: 'BONUS!',
      bodyHtml: `Hai vinto <strong>${spins} giri gratis</strong>!<br>Il tuo simbolo fortunato &egrave;:`,
      symbolKey: luckySymbol,
      buttonLabel: 'Inizia',
      onClose: () => {
        marqueeEl.classList.add('bonus-mode');
        document.body.classList.add('bonus-tint');
        buildReels(BONUS_REELS);
        freeSpinHud.classList.add('show');
        updateFreeSpinHud();
        playCustom('bonusMusic', { loop: true });
        spinning = false;
        renderStats();
        scheduleAuto(400);
      }
    });
  }

  function endBonusFeature() {
    stopCustom('bonusMusic');
    const totalWin = bonus.totalWin;
    showBonusModal({
      title: 'Bonus terminato!',
      bodyHtml: `Hai vinto in totale<br><span style="font-size:26px;color:#fff">${fmt(totalWin)} crediti</span>`,
      buttonLabel: 'Continua',
      onClose: () => {
        marqueeEl.classList.remove('bonus-mode');
        document.body.classList.remove('bonus-tint');
        freeSpinHud.classList.remove('show');
        buildReels(BASE_REELS);
        bonus = null;
        spinning = false;
        renderStats();
        scheduleAuto(400);
      }
    });
  }

  spinBtn.addEventListener('click', () => performSpin(!!bonus));

  // ---------- autospin ----------
  const autoBtn = document.getElementById('autoBtn');
  let autoSpin = false;
  let autoTimer = null;
  function stopAuto() {
    autoSpin = false;
    autoBtn.classList.remove('on');
    autoBtn.textContent = 'AUTO';
    clearTimeout(autoTimer);
  }
  function startAuto() {
    autoSpin = true;
    autoBtn.classList.add('on');
    autoBtn.textContent = 'STOP';
    scheduleAuto(150);
  }
  function scheduleAuto(delay) {
    if (!autoSpin) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(tryAutoSpin, delay);
  }
  function tryAutoSpin() {
    if (!autoSpin) return;
    if (spinning) { scheduleAuto(300); return; }
    if (bonusOverlay.classList.contains('show')
        || document.getElementById('paytableOverlay').classList.contains('show')) {
      scheduleAuto(500);
      return;
    }
    if (!bonus && balance < BET_STEPS[betIndex]) { stopAuto(); return; }
    performSpin(!!bonus);
  }
  autoBtn.addEventListener('click', () => { autoSpin ? stopAuto() : startAuto(); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (spinBtn.disabled) return;
    if (document.getElementById('paytableOverlay').classList.contains('show')) return;
    e.preventDefault();
    performSpin(!!bonus);
  });

  // ---------- pannello tabella vincite ----------
  const paytablePanel = document.getElementById('paytablePanel');
  const infoBtn = document.getElementById('infoBtn');
  function buildPaytablePanel() {
    let rows = '';
    Object.keys(PAYTABLE).forEach(key => {
      const p = PAYTABLE[key];
      rows += `<tr><td><div class="sym-cell"><img alt="${SYMBOLS[key].label}" data-key="${key}"> ${SYMBOLS[key].label}</div></td><td>${p[3]}x</td><td>${p[4]}x</td><td>${p[5]}x</td><td>${p[6]}x</td><td>${p[7]}x</td></tr>`;
    });
    paytablePanel.innerHTML = `
      <table>
        <tr><th>Simbolo</th><th>x3</th><th>x4</th><th>x5</th><th>x6</th><th>x7</th></tr>
        ${rows}
      </table>
      <div class="sub-note">Moltiplicatori riferiti alla puntata per linea (puntata totale / 9). Le colonne x6/x7 valgono solo durante il bonus (7 colonne). 3 simboli BONUS = 10 giri gratis, 4 = 15, con un simbolo fortunato che si espande su tutto il rullo. Durante i giri gratis: 2 BONUS = +3 giri, 3 = +10, 4 = +15.</div>
    `;
    paytablePanel.querySelectorAll('img[data-key]').forEach(img => setupImageFallback(img, img.dataset.key));
  }
  buildPaytablePanel();

  const paytableOverlay = document.getElementById('paytableOverlay');
  function openPaytable() { paytableOverlay.classList.add('show'); }
  function closePaytable() { paytableOverlay.classList.remove('show'); }
  infoBtn.addEventListener('click', openPaytable);
  document.getElementById('paytableClose').addEventListener('click', closePaytable);
  paytableOverlay.addEventListener('click', (e) => {
    if (e.target === paytableOverlay) closePaytable();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePaytable();
  });

  // ---------- telefono in orizzontale ----------
  const rotateHint = document.getElementById('rotateHint');
  document.getElementById('rotateDismiss').addEventListener('click', () => {
    rotateHint.classList.add('dismissed');
  });
  function tryLockLandscape() {
    try {
      const so = screen.orientation;
      if (so && so.lock) so.lock('landscape').catch(() => {});
    } catch (e) { /* non supportato o non in fullscreen: ci pensa il manifest */ }
  }
  tryLockLandscape();
  window.addEventListener('orientationchange', tryLockLandscape);

  // ---------- schermo intero (nasconde barre e tasti del telefono) ----------
  function enterFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (!req || document.fullscreenElement) return;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      try { req.call(el); } catch (e2) {}
    }
    tryLockLandscape();
  }
  // al primo tocco su un telefono: entra a schermo intero (richiede un gesto utente)
  if (window.matchMedia('(pointer: coarse)').matches) {
    window.addEventListener('pointerdown', function onFirstTap() {
      window.removeEventListener('pointerdown', onFirstTap);
      enterFullscreen();
    }, { once: true });
  }

  // ---------- X per uscire ----------
  // esce dallo schermo intero (fa ricomparire barre e tasti del telefono) e
  // prova a chiudere la finestra; se il sistema non lo permette, resta la slot
  // con l'interfaccia del telefono di nuovo visibile
  document.getElementById('exitBtn').addEventListener('click', async () => {
    stopAuto();
    try {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (document.fullscreenElement && exit) await exit.call(document);
    } catch (e) {}
    try { window.close(); } catch (e) {}
  });

  renderStats();
