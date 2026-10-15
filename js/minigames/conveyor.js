// Esteira Enjoada — as caixas famintas querem SÓ a sua comida! 1/2/3 ou toque.
window.SR = window.SR || {};
window.SR.Mini_conveyor = {
  id: 'conveyor', name: 'Esteira Enjoada', duration: 15000,
  instruction: 'Mande cada peça p/ a caixa certa! Teclas 1/2/3 ou toque.',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const rng = api.rng;
    const heat = api.heat || 0;
    const BINS = [
      { key: '1', label: 'TOMATE ●', css: P.tomato, kind: 0 },
      { key: '2', label: 'CÉU ■', css: P.sky, kind: 1 },
      { key: '3', label: 'MATO ▲', css: P.leaf, kind: 2 }
    ];
    const NEED = 8;
    let good = 0, bad = 0, t = 0, done = false, endT = 0;
    let item = null, itemT = 0, deadline = 2.2;
    let flash = 0, flashOk = true;
    function next() {
      const kind = Math.floor(rng() * 3);
      item = { kind, x: W / 2, spin: 0 };
      deadline = Math.max(0.8, 2.3 - good * 0.15 - heat * 0.7);
      itemT = 0;
    }
    next();
    function choose(k) {
      if (done || !item) return;
      if (k === item.kind) { good++; S.good(); flash = 0.35; flashOk = true; api.progress(good / NEED); }
      else { bad++; S.splat(); flash = 0.35; flashOk = false; }
      if (good >= NEED) { done = true; S.taDa(); api.finish({ good, bad }); return; }
      next();
    }
    function binAt(x, y) {
      for (let i = 0; i < 3; i++) {
        const bx = 150 + i * 250;
        if (x >= bx - 105 && x <= bx + 105 && y >= 320 && y <= 480) return i;
      }
      return -1;
    }
    return {
      update(dt) {
        t += dt; flash = Math.max(0, flash - dt);
        if (done) { endT += dt; return; }
        itemT += dt;
        if (item) { item.x = W / 2 + Math.sin(t * (2 + heat * 2)) * (8 + heat * 10); item.spin += dt * (2 + heat * 4); }
        if (itemT >= deadline) { bad++; S.bad(); flash = 0.35; flashOk = false; next(); }
        if (api.input.consumePressed('Digit1') || api.input.consumePressed('Numpad1')) choose(0);
        if (api.input.consumePressed('Digit2') || api.input.consumePressed('Numpad2')) choose(1);
        if (api.input.consumePressed('Digit3') || api.input.consumePressed('Numpad3')) choose(2);
      },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#F3D9A4'; ctx.fillRect(0, 0, W, H);
        // esteira
        ctx.fillStyle = '#8a6f4d';
        U.roundRect(ctx, 50, 176, 700, 66, 16); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.fillStyle = '#a98f63';
        for (let i = 0; i < 14; i++) { const off = (t * (200 + heat * 200)) % 56; ctx.fillRect(58 + i * 56 - off, 182, 26, 54); }
        // engrenagens
        ctx.fillStyle = P.choc;
        [40, 760].forEach(ex => {
          ctx.save(); ctx.translate(ex, 209); ctx.rotate(t * (2 + heat * 3));
          for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-8, -30, 16, 60); }
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill();
          ctx.restore();
        });
        U.sticker(ctx, 12, 10, 300, 44, 12, '#FFFDF6');
        ctx.fillStyle = P.ink; ctx.font = '900 21px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('📦 ' + good + '/' + NEED + '   💩 ' + bad, 26, 40);
        if (item) {
          const b = BINS[item.kind];
          const ix = item.x, iy = 120;
          const jig = Math.sin(item.spin * 3) * 4;
          ctx.save(); ctx.translate(ix, iy + jig); ctx.rotate(Math.sin(item.spin) * 0.15);
          ctx.fillStyle = b.css;
          if (item.kind === 0) { ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.fill(); }
          else if (item.kind === 1) { U.roundRect(ctx, -28, -28, 56, 56, 10); ctx.fill(); }
          else { ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(30, 24); ctx.lineTo(-30, 24); ctx.closePath(); ctx.fill(); }
          ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
          U.face(ctx, 0, 0, 40, itemT / deadline > 0.7 ? 'wow' : 'happy');
          ctx.restore();
          const w = 300 * (1 - itemT / deadline);
          ctx.fillStyle = '#fff';
          U.roundRect(ctx, W / 2 - 152, 246, 304, 18, 9); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
          ctx.fillStyle = w > 100 ? P.butter : P.tomato;
          if (w > 6) { U.roundRect(ctx, W / 2 - 148, 249, Math.max(6, w - 8), 12, 6); ctx.fill(); }
        }
        if (flash > 0) {
          ctx.save(); ctx.translate(W / 2, 300); ctx.rotate(-0.06); ctx.scale(1 + flash, 1 + flash);
          ctx.font = '900 44px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.lineWidth = 8; ctx.strokeStyle = P.ink;
          ctx.strokeText(flashOk ? 'NHAM! 😋' : 'ECA! 🤢', 0, 0);
          ctx.fillStyle = flashOk ? P.leaf : P.tomato;
          ctx.fillText(flashOk ? 'NHAM! 😋' : 'ECA! 🤢', 0, 0);
          ctx.restore();
        }
        for (let i = 0; i < 3; i++) {
          const bx = 150 + i * 250, b = BINS[i];
          const chomp = (item && item.kind === i) ? Math.sin(t * 10) * 4 : 0;
          ctx.fillStyle = 'rgba(58,43,31,0.15)';
          U.roundRect(ctx, bx - 98, 348, 200, 118, 16); ctx.fill();
          ctx.fillStyle = b.css;
          U.roundRect(ctx, bx - 102, 340, 200, 118, 16); ctx.fill();
          ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
          // bocão da caixa
          ctx.fillStyle = P.ink;
          U.roundRect(ctx, bx - 60, 372 + chomp, 120, 26, 12); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '900 19px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.fillText(b.label, bx, 366);
          ctx.fillStyle = '#fff'; ctx.font = '800 15px ' + U.ROUND_FONT;
          ctx.fillText('tecla ' + b.key, bx, 448);
        }
        if (done) U.powStar(ctx, W / 2, 250, 100 + Math.sin(endT * 8) * 7, P.butter, 'ENCAIXOTOU!');
      },
      onPointerDown(x, y) { const b = binAt(x, y); if (b >= 0) choose(b); }
    };
  }
};
