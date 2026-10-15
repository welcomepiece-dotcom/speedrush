// Utilidades: RNG com seed, shuffle, helpers de canvas.
window.SR = window.SR || {};
(function () {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function makeCode(len) {
    const ab = window.SR.Config.CODE_ALPHABET;
    const rng = Math.random;
    let s = '';
    for (let i = 0; i < len; i++) s += ab[Math.floor(rng() * ab.length)];
    return s;
  }
  function fmtTime(ms) {
    if (ms == null) return '—';
    return (ms / 1000).toFixed(1) + 's';
  }
  // Partículas simples compartilhadas
  function burst(particles, x, y, color, n, speed) {
    n = n || 14; speed = speed || 260;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({ x, y, vx: Math.cos(a) * speed * (0.3 + Math.random() * 0.7), vy: Math.sin(a) * speed * (0.3 + Math.random() * 0.7), life: 0.6 + Math.random() * 0.4, t: 0, color, r: 2 + Math.random() * 4 });
    }
  }
  function stepParticles(particles, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt;
      if (p.t >= p.life) particles.splice(i, 1);
    }
  }
  function drawParticles(ctx, particles) {
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // ---- Identidade cartoon SpeedRush (papel + adesivo) ----
  const PAL = {
    cream: '#FFF6E9', paper: '#FCEFD8', ink: '#3A2B1F',
    tomato: '#E4572E', butter: '#FFC53D', sky: '#4FB6E8',
    leaf: '#58B368', lime: '#B5E048', orange: '#F98A2B',
    gum: '#F15BB5', grape: '#9B5DE5', choc: '#6B4A2F'
  };
  const ROUND_FONT = '"Baloo 2","Fredoka One","Fredoka","Nunito","Trebuchet MS","Comic Sans MS",cursive,sans-serif';
  // Cartão estilo adesivo: sombra dura deslocada + contorno marrom grosso.
  function sticker(ctx, x, y, w, h, r, fill) {
    ctx.fillStyle = 'rgba(58,43,31,0.18)';
    roundRect(ctx, x + 5, y + 7, w, h, r); ctx.fill();
    ctx.fillStyle = fill || PAL.cream;
    roundRect(ctx, x, y, w, h, r); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink;
    roundRect(ctx, x, y, w, h, r); ctx.stroke();
  }
  // Rostinho engraçado: mood = 'happy' | 'wow' | 'dizzy' | 'angry' | 'sleepy'
  function face(ctx, x, y, s, mood) {
    const e = s * 0.22, ey = y - s * 0.08;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - e, ey, s * 0.16, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + e, ey, s * 0.16, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.ink;
    const look = mood === 'dizzy' ? s * 0.05 : 0;
    if (mood === 'angry') {
      ctx.fillRect(x - e - 5, ey - 12, 16, 5);
      ctx.fillRect(x + e - 11, ey - 12, 16, 5);
    }
    ctx.beginPath(); ctx.arc(x - e + look, ey + 2, s * 0.07, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + e + look, ey + 2, s * 0.07, 0, 7); ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'happy') ctx.arc(x, y + s * 0.12, s * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood === 'wow') { ctx.fillStyle = PAL.ink; ctx.arc(x, y + s * 0.22, s * 0.11, 0, 7); ctx.fill(); return; }
    else if (mood === 'dizzy') { ctx.moveTo(x - s * 0.15, y + s * 0.2); ctx.lineTo(x + s * 0.15, y + s * 0.2); }
    else if (mood === 'angry') { ctx.moveTo(x - s * 0.14, y + s * 0.26); ctx.lineTo(x + s * 0.14, y + s * 0.14); }
    else ctx.arc(x, y + s * 0.3, s * 0.12, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  }
  // Escala elástica p/ entradas (t em segundos desde o início)
  function popScale(t, dur) {
    dur = dur || 0.45;
    const k = clamp(t / dur, 0, 1);
    const c = 1.7;
    const e = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); // easeOutBack
    return 0.3 + 0.7 * e;
  }
  // Estrela "POW!" de comemoração
  function powStar(ctx, x, y, r, fill, text) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = fill || PAL.butter;
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4;
    ctx.beginPath();
    const N = 10;
    for (let i = 0; i <= N * 2; i++) {
      const rr = (i % 2 === 0) ? r : r * 0.62;
      const a = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (text) {
      ctx.fillStyle = PAL.ink; ctx.font = '900 ' + Math.round(r * 0.42) + 'px ' + ROUND_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 2);
    }
    ctx.restore();
  }
  window.SR.Utils = { mulberry32, hashStr, shuffle, clamp, lerp, pick, makeCode, fmtTime, burst, stepParticles, drawParticles, roundRect, PAL, ROUND_FONT, sticker, face, popScale, powStar };
})();
