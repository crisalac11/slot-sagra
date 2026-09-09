/* Funzione PIERONZO — slot 5x5 "collect" dopo 5 giri base a vuoto.
   Caricato DOPO slot.js: usa variabili/funzioni globali definite li'
   (audioCtx, ensureAudio, beep, getNoiseBuffer, IMG_EXTS, reelsEl,
    BASE_REELS, fmt, balance, saveState, buildReels, renderStats,
    setupImageFallback). */

  function pieronzoQuakeSound() {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer();
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, t0);
    lp.frequency.exponentialRampToValueAtTime(90, t0 + 0.85);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.35, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    src.connect(lp).connect(g).connect(audioCtx.destination);
    src.start(t0); src.stop(t0 + 0.95);
    const o = audioCtx.createOscillator(), og = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(80, t0);
    o.frequency.exponentialRampToValueAtTime(30, t0 + 0.8);
    og.gain.setValueAtTime(0.3, t0);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
    o.connect(og).connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + 0.9);
  }
  function pieronzoSpinTick() {
    ensureAudio();
    beep(520, 0.05, 'square', 0.06);
    beep(390, 0.05, 'square', 0.05, 0.05);
  }
  function pieronzoFanfare() {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    [392, 523, 659, 784, 1047].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const s = t0 + i * 0.09;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.08, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.7);
      o.connect(g).connect(audioCtx.destination);
      o.start(s); o.stop(s + 0.75);
    });
  }
  function pieronzoSadSound() {
    ensureAudio();
    const t0 = audioCtx.currentTime;
    [440, 392, 330, 262].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const s = t0 + i * 0.16;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.1, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5);
      o.connect(g).connect(audioCtx.destination);
      o.start(s); o.stop(s + 0.55);
    });
  }

  // ---------- funzione PIERONZO: slot 5x5 "collect" dopo 5 giri a vuoto ----------
  // simboli in images/slot/PIERONZO1..8.<est> (per valore crescente), + MOLTIPLICATORE, TASSAPIERONZO
  const PZ_CHOOSABLE = [  // dal meno pagante (piu' comune) al piu' pagante (piu' raro)
    { key: 'PIERONZO3', val: 0.32, weight: 30 },
    { key: 'PIERONZO4', val: 0.5,  weight: 21 },
    { key: 'PIERONZO5', val: 0.75, weight: 14 },
    { key: 'PIERONZO6', val: 1.15, weight: 9 },
    { key: 'PIERONZO7', val: 1.8,  weight: 5 },
    { key: 'PIERONZO8', val: 2.8,  weight: 3 },
  ];
  const PZ_COMMON = [{ key: 'PIERONZO1' }, { key: 'PIERONZO2' }];  // non selezionabili
  const PZ_COMMON_WEIGHT = 24;
  const PZ_MULT_KEY = 'MOLTIPLICATORE', PZ_TAX_KEY = 'TASSAPIERONZO';
  const PZ_MULT_WEIGHT = 0.5, PZ_TAX_WEIGHT = 0.06;   // moltiplicatore raro, tassa molto rara
  const PZ_MULT_FACTORS = [{ f: 2, w: 52 }, { f: 3, w: 30 }, { f: 5, w: 14 }, { f: 10, w: 4 }];
  const PZ_MULT_CAP = 12;
  const PZ_WIN_CAP_MULT = 300;   // tetto vincita funzione = 300x la puntata
  const PZ_SPINS = 5, PZ_TOTAL = 25;
  const PZ_PLACEHOLDER = {
    PIERONZO1: ['#5b5b5b', '1'], PIERONZO2: ['#6d6d6d', '2'], PIERONZO3: ['#3a6ea5', '3'],
    PIERONZO4: ['#3f8f4f', '4'], PIERONZO5: ['#b58a24', '5'], PIERONZO6: ['#c8102e', '6'],
    PIERONZO7: ['#7a1fa2', '7'], PIERONZO8: ['#0d0d0d', '8'],
    MOLTIPLICATORE: ['#ff8c00', '×'], TASSAPIERONZO: ['#7a0000', '€'],
  };
  function pzPlaceholder(key) {
    const [c, t] = PZ_PLACEHOLDER[key] || ['#444', '?'];
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' rx='16' fill='" + c +
      "'/><text x='50%' y='55%' font-size='66' font-weight='bold' fill='#fff' text-anchor='middle' dominant-baseline='central'>" + t + "</text></svg>");
  }
  function pzImg(key) {
    const img = document.createElement('img');
    let i = 0;
    img.onerror = function () {
      if (i < IMG_EXTS.length) { img.src = 'images/slot/' + key + '.' + IMG_EXTS[i]; i++; }
      else { img.onerror = null; img.src = pzPlaceholder(key); }
    };
    img.onerror();
    return img;
  }
  function pzWeighted(arr) {
    const tot = arr.reduce((a, x) => a + x.weight, 0);
    let r = Math.random() * tot;
    for (const x of arr) { if (r < x.weight) return x; r -= x.weight; }
    return arr[arr.length - 1];
  }

  function startPieronzo(bet) {
    return new Promise((resolve) => {
      const ov = document.getElementById('pieronzoOverlay');
      const ids = ['pzIntro', 'pzAward', 'pzPick', 'pzPlay', 'pzEnd'];
      const show = (id) => ids.forEach(x => { document.getElementById(x).hidden = (x !== id); });
      const once = (id, fn) => {
        const el = document.getElementById(id);
        const h = () => { el.removeEventListener('click', h); fn(); };
        el.addEventListener('click', h);
      };

      // --- la slot normale trema e si sbriciola ---
      document.body.classList.add('pz-quake');
      pieronzoQuakeSound();
      reelsEl.querySelectorAll('.cell').forEach((c, i) => {
        c.style.setProperty('--dx', (Math.random() * 420 - 210) + 'px');
        c.style.setProperty('--dy', (200 + Math.random() * 320) + 'px');
        c.style.setProperty('--dr', (Math.random() * 720 - 360) + 'deg');
        c.style.animationDelay = (i * 12) + 'ms';
        c.classList.add('crumble');
      });
      setupImageFallback(document.getElementById('pzBossImg'), 'ten');

      setTimeout(() => {
        document.body.classList.remove('pz-quake');
        show('pzIntro');
        ov.classList.add('show');
        ov.setAttribute('aria-hidden', 'false');
      }, 900);

      once('pzIntroNext', () => show('pzAward'));
      once('pzAwardNext', () => { buildPicker(); show('pzPick'); });

      function buildPicker() {
        const g = document.getElementById('pzPickGrid');
        g.innerHTML = '';
        PZ_CHOOSABLE.forEach((s, idx) => {
          const card = document.createElement('button');
          card.type = 'button';
          card.className = 'pz-card';
          card.appendChild(pzImg(s.key));
          const v = document.createElement('div');
          v.className = 'pz-card-val';
          v.textContent = 'x' + s.val;
          card.appendChild(v);
          const rar = document.createElement('div');
          rar.className = 'pz-card-rar';
          rar.textContent = '★'.repeat(idx + 1);
          card.appendChild(rar);
          card.addEventListener('click', () => startPlay(s), { once: true });
          g.appendChild(card);
        });
        // i due simboli comuni NON vengono mostrati qui (restano solo come riempitivi in griglia)
      }

      let chosen = null;
      let cells = new Array(PZ_TOTAL).fill(null);  // 'held' | 'mult' | null
      let mults = [];
      let total = 0;              // in unita' di puntata (x bet per i crediti)
      let spinsLeft = PZ_SPINS;
      let taxed = false, fullpageDone = false;

      // i moltiplicatori NON si moltiplicano tra loro: si sommano (1 + somma dei bonus)
      function multProduct() {
        if (!mults.length) return 1;
        return Math.min(1 + mults.reduce((a, f) => a + (f - 1), 0), PZ_MULT_CAP);
      }

      function startPlay(sym) {
        chosen = sym;
        show('pzPlay');
        const gEl = document.getElementById('pzGrid');
        gEl.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < PZ_TOTAL; i++) {
          const cell = document.createElement('div');
          cell.className = 'pz-cell';
          frag.appendChild(cell);
        }
        gEl.appendChild(frag);
        const ci = pzImg(chosen.key); ci.id = 'pzChosenImg';
        document.getElementById('pzChosenImg').replaceWith(ci);
        document.getElementById('pzChosenVal').textContent = 'x' + chosen.val;
        updateHud();
        // niente auto-play: si gira col tasto SPIN
        const spinBtn = document.getElementById('pzSpinBtn');
        spinBtn.disabled = false;
        spinBtn.onclick = () => { spinBtn.disabled = true; doSpin(); };
      }

      function updateHud() {
        document.getElementById('pzSpinsLeft').textContent = spinsLeft;
        document.getElementById('pzTotal').textContent = fmt(Math.round(total * bet));
        const mb = document.getElementById('pzMultBox');
        if (mults.length) { mb.hidden = false; document.getElementById('pzMult').textContent = 'x' + multProduct(); }
        else mb.hidden = true;
      }
      function bumpTotal() {
        const el = document.getElementById('pzTotal');
        el.classList.remove('pz-total-bump'); void el.offsetWidth; el.classList.add('pz-total-bump');
      }

      function rollCell() {
        const others = PZ_CHOOSABLE.filter(s => s.key !== chosen.key);
        const pool = [
          { t: 'chosen', weight: chosen.weight },
          ...others.map(s => ({ t: 'other', key: s.key, weight: s.weight * 0.5 })),
          { t: 'common', key: PZ_COMMON[0].key, weight: PZ_COMMON_WEIGHT },
          { t: 'common', key: PZ_COMMON[1].key, weight: PZ_COMMON_WEIGHT },
          { t: 'mult', weight: PZ_MULT_WEIGHT },
          { t: 'tax', weight: PZ_TAX_WEIGHT },
        ];
        return pzWeighted(pool);
      }

      function applyResult(i, res, cell) {
        // ripulisci lo stato del giro precedente (una casella riempitiva puo'
        // diventare bloccata al giro dopo: senza reset resterebbe sbiadita)
        cell.className = 'pz-cell';
        cell.innerHTML = '';
        if (res.t === 'tax') {
          cell.appendChild(pzImg(PZ_TAX_KEY));
          cell.classList.add('pz-tax', 'pz-pop');
          taxed = true;
        } else if (res.t === 'chosen') {
          cell.appendChild(pzImg(chosen.key));
          cell.classList.add('pz-held', 'pz-pop');
          cells[i] = 'held';
        } else if (res.t === 'mult') {
          const mf = pzWeighted(PZ_MULT_FACTORS.map(m => ({ f: m.f, weight: m.w }))).f;
          cell.appendChild(pzImg(PZ_MULT_KEY));
          const tag = document.createElement('span');
          tag.className = 'pz-mult-tag';
          tag.textContent = 'x' + mf;
          cell.appendChild(tag);
          cell.classList.add('pz-held', 'pz-mult-cell', 'pz-pop');
          cells[i] = 'mult';
          mults.push(mf);
        } else {
          cell.appendChild(pzImg(res.key));
          cell.classList.add('pz-filler');
        }
      }

      function doSpin() {
        const nodes = document.getElementById('pzGrid').children;
        const toRoll = [];
        for (let i = 0; i < PZ_TOTAL; i++) if (!cells[i]) toRoll.push(i);
        if (!toRoll.length) { setTimeout(afterSpin, 300); return; }
        const results = toRoll.map(() => rollCell());
        pieronzoSpinTick();
        // fase 1: le caselle libere "girano" per un momento
        toRoll.forEach(i => nodes[i].classList.add('spinning'));
        setTimeout(() => {
          // fase 2: atterrano una a una, con calma
          let landed = 0;
          toRoll.forEach((i, k) => {
            setTimeout(() => {
              nodes[i].classList.remove('spinning');
              applyResult(i, results[k], nodes[i]);
              if (k % 3 === 0) pieronzoSpinTick();
              if (++landed === toRoll.length) setTimeout(afterSpin, 560);
            }, k * 55);
          });
        }, 700);
      }

      function afterSpin() {
        if (taxed) { finishFeature(true); return; }
        const heldChosen = cells.filter(x => x === 'held').length;
        total += heldChosen * chosen.val;
        spinsLeft--;
        updateHud();
        bumpTotal();
        if (cells.every(x => x) && !fullpageDone) { fullpageDone = true; pzFullPage(heldChosen); return; }
        if (spinsLeft <= 0) { setTimeout(() => finishFeature(false), 900); return; }
        // riabilita il tasto SPIN per il giro successivo
        document.getElementById('pzSpinBtn').disabled = false;
      }

      function pzFullPage(heldChosen) {
        const fp = document.getElementById('pzFullpage');
        total += heldChosen * chosen.val * spinsLeft;   // i giri restanti pagano tutti la full page
        spinsLeft = 0;
        updateHud();
        document.getElementById('pzFpAmount').textContent = fmt(Math.min(Math.round(total * multProduct() * bet), bet * PZ_WIN_CAP_MULT));
        fp.classList.add('show');
        pieronzoFanfare();
        setTimeout(() => { fp.classList.remove('show'); finishFeature(false); }, 3400);
      }

      function finishFeature(byTax) {
        const finalWin = byTax ? 0 : Math.min(Math.round(total * multProduct() * bet), bet * PZ_WIN_CAP_MULT);
        const et = document.getElementById('pzEndTitle');
        const ea = document.getElementById('pzEndAmount');
        if (byTax) {
          et.textContent = 'TASSA PIERONZO!';
          et.className = 'pz-headline pz-sad';
          pieronzoSadSound();
        } else {
          et.textContent = 'Il Pieronzo e’ soddisfatto';
          et.className = 'pz-headline';
          pieronzoFanfare();
        }
        ea.textContent = fmt(finalWin);
        balance = Math.round(balance + finalWin);
        saveState();
        show('pzEnd');
        once('pzEndNext', () => {
          ov.classList.remove('show');
          ov.setAttribute('aria-hidden', 'true');
          reelsEl.querySelectorAll('.cell').forEach(c => { c.classList.remove('crumble'); c.style.animationDelay = ''; });
          buildReels(BASE_REELS);
          renderStats();
          resolve(finalWin);
        });
      }
    });
  }
