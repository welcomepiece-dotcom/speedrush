// Áudio SpeedRush: SFX cartunescos + música procedural que acelera com o calor.
// Tudo sintetizado via WebAudio, sem arquivos. A música usa um sequenciador
// com lookahead: setHeat() muda o BPM dos PRÓXIMOS passos, sem reiniciar a faixa.
window.SR = window.SR || {};
(function () {
  let ctx = null, sfxGain = null, musicGain = null, noiseBuf = null;
  let vol = { sfx: 0.8, music: 0.7, muted: false };
  try {
    vol.sfx = parseFloat(localStorage.getItem('sr_vol_sfx') ?? '0.8');
    vol.music = parseFloat(localStorage.getItem('sr_vol_music') ?? '0.7');
    vol.muted = localStorage.getItem('sr_muted') === '1';
  } catch (e) {}

  function ac() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.connect(ctx.destination);
        applyVol();
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function applyVol() {
    if (!ctx) return;
    const m = vol.muted ? 0 : 1;
    sfxGain.gain.value = vol.sfx * m;
    musicGain.gain.value = vol.music * 0.5 * m;
  }
  function tone(freq, dur, type, v, when, slideTo, dest) {
    const c = ac(); if (!c) return;
    dur = dur || 0.12; type = type || 'square'; v = v == null ? 0.12 : v; when = when || 0;
    const t0 = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, v, when, filterFreq, type, dest) {
    const c = ac(); if (!c || !noiseBuf) return;
    when = when || 0;
    const t0 = c.currentTime + when;
    const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = filterFreq || 6000;
    const g = c.createGain();
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  // ============ SFX (API antiga preservada + novos) ============
  const S = {
    unlock() { ac(); },
    getVolumes() { return { ...vol }; },
    setSfxVolume(v) { vol.sfx = Math.min(1, Math.max(0, v)); try { localStorage.setItem('sr_vol_sfx', String(vol.sfx)); } catch (e) {} applyVol(); },
    setMusicVolume(v) { vol.music = Math.min(1, Math.max(0, v)); try { localStorage.setItem('sr_vol_music', String(vol.music)); } catch (e) {} applyVol(); },
    setMuted(m) { vol.muted = !!m; try { localStorage.setItem('sr_muted', vol.muted ? '1' : '0'); } catch (e) {} applyVol(); },
    click() { tone(600, 0.06, 'square', 0.10); },
    drop() { tone(300, 0.08, 'square', 0.12, 0, 150); },
    pop() { tone(500, 0.07, 'square', 0.12, 0, 950); },
    boing() { tone(140, 0.28, 'sine', 0.20, 0, 520); tone(520, 0.2, 'triangle', 0.08, 0.05, 180); },
    splat() { noise(0.18, 0.20, 0, 900, 'lowpass'); tone(220, 0.15, 'sawtooth', 0.10, 0, 60); },
    good() { tone(660, 0.1, 'square', 0.14); tone(880, 0.12, 'square', 0.14, 0.09); },
    bad() { tone(200, 0.2, 'sawtooth', 0.12, 0, 90); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'square', 0.13, i * 0.1)); },
    taDa() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, 'triangle', 0.16, i * 0.08)); },
    count(n) { tone(n === 0 ? 880 : 440, n === 0 ? 0.3 : 0.12, 'square', 0.15); },
    wake() { tone(150, 0.4, 'sawtooth', 0.16, 0, 600); },
    zap() { tone(1200, 0.08, 'sawtooth', 0.09, 0, 200); },
    fanfare(bigWin) {
      if (bigWin) {
        [523, 523, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.14, i * 0.12));
        noise(0.5, 0.08, 0.7, 7000);
      } else {
        [392, 370, 349, 311].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.10, i * 0.22, f * 0.94));
      }
    }
  };

  // ============ MÚSICA: marchinha maluca em Dó maior ============
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> freq
  // Melodia de 32 semicolcheias (midi, -1 = pausa). Saltitante e boba.
  const LEAD = [72, -1, 76, -1, 79, -1, 76, -1, 81, -1, 79, 76, 74, -1, 72, -1,
                72, -1, 76, -1, 79, -1, 81, -1, 84, 81, 79, 76, 74, -1, 72, -1];
  const BASSROOT = [48, 43, 45, 41]; // C G A F por compasso (2 compassos de 16)
  const M = {
    playing: false, step: 0, nextT: 0, timer: null,
    bpm: 112, targetBpm: 112, heat: 0, bar: 0
  };
  function setHeat(h) {
    M.heat = Math.min(1, Math.max(0, h || 0));
    M.targetBpm = 104 + M.heat * 78; // 104 ... 182
  }
  function schedStep() {
    const c = ctx; if (!c) return;
    const heat = M.heat;
    const s16 = M.step % 16, bar16 = M.step % 32;
    const bar = Math.floor(M.step / 32);
    const t = M.nextT - c.currentTime;
    // Baixo oom-pah: tônica no 0 e 8, quinta no 4 e 12
    const root = BASSROOT[Math.floor(bar16 / 8) % 4];
    if (s16 % 8 === 0) tone(N(root), 0.22, 'triangle', 0.30, t, 0, musicGain);
    if (s16 % 8 === 4) tone(N(root + 7), 0.18, 'triangle', 0.22, t, 0, musicGain);
    // Bumbo de brinquedo nos tempos
    if (s16 % 4 === 0) tone(120, 0.1, 'sine', 0.28, t, 45, musicGain);
    // Caixa (ruído) no 2 e 4 quando esquenta
    if (heat > 0.3 && (s16 === 4 || s16 === 12)) noise(0.09, 0.16, t, 1800, 'bandpass', musicGain);
    // Chimbal: colcheias; semicolcheias no calor; contratempo extra no caos
    if (s16 % 2 === 0) noise(0.04, heat > 0.75 ? 0.12 : 0.08, t, 8000, 'highpass', musicGain);
    else if (heat > 0.5) noise(0.03, 0.06, t, 8500, 'highpass', musicGain);
    // Melodia solta e alegre
    const mel = LEAD[bar16];
    if (mel > 0) {
      const oct = heat > 0.8 && (bar16 % 8 === 6) ? 12 : 0; // gritinho no caos
      tone(N(mel + oct), 0.14, 'square', 0.11, t, 0, musicGain);
      tone(N(mel + oct), 0.14, 'triangle', 0.08, t, 0, musicGain);
    }
    // Apito de slide a cada 4 compassos quando ferve
    if (heat > 0.55 && bar16 === 0 && (bar % 2 === 0)) {
      tone(600, 0.5, 'sine', 0.10, t, 1400, musicGain);
    }
    // Avança com o BPM atual (interpola p/ o alvo: sem tranco)
    M.bpm += (M.targetBpm - M.bpm) * 0.25;
    M.nextT += 60 / M.bpm / 4;
    M.step++;
  }
  function startMusic() {
    if (!ac()) return;
    if (M.playing) return;
    M.playing = true;
    M.step = 0; M.nextT = ctx.currentTime + 0.08;
    M.timer = setInterval(() => {
      if (!M.playing) return;
      while (M.nextT < ctx.currentTime + 0.18) schedStep();
    }, 42);
  }
  function stopMusic() {
    M.playing = false;
    if (M.timer) { clearInterval(M.timer); M.timer = null; }
  }
  S.startMusic = startMusic; S.stopMusic = stopMusic; S.setHeat = setHeat;
  S.musicPlaying = () => M.playing;

  window.SR.Audio = S;
})();
