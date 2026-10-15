// Código Maluco — decore a sequência e repita! Fica maior e mais rápido com o calor.
window.SR = window.SR || {};
window.SR.Mini_code = {
  id: 'code', name: 'Código Maluco', duration: 15000,
  instruction: 'Decore e repita! Setas do teclado ou toque nos botões.',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const rng = api.rng;
    const heat = api.heat || 0, SPD = api.speed || 1;
    const SYMS = [
      { k: '⬆', code: 'ArrowUp', css: P.tomato },
      { k: '⬇', code: 'ArrowDown', css: P.sky },
      { k: '⬅', code: 'ArrowLeft', css: P.butter },
      { k: '➡', code: 'ArrowRight', css: P.leaf }
    ];
    const N = 5 + (heat > 0.35 ? 1 : 0) + (heat > 0.7 ? 1 : 0);
    const seq = [];
    for (let i = 0; i < N; i++) seq.push(Math.floor(rng() * 4));
    const SHOW_MS = Math.max(1300, 2500 / SPD);
    let t = 0, idx = 0, done = false, endT = 0, errors = 0, flash = 0, flashOk = true;
    function press(s) {
      if (done || t * 1000 < SHOW_MS) return;
      if (s === seq[idx]) {
        idx++; S.pop(); flash = 0.15; flashOk = true;
        api.progress(idx / N);
        if (idx >= N) { done = true; S.taDa(); api.finish({ errors }); }
      } else { errors++; S.splat(); flash = 0.35; flashOk = false; }
    }
    function btnAt(x, y) {
      for (let i = 0; i < 4; i++) {
        const bx = 170 + i * 155;
        if (x >= bx - 68 && x <= bx + 68 && y >= 316 && y <= 448) return i;
      }
      return -1;
    }
    const keyMap = { ArrowUp: 0, ArrowDown: 1, ArrowLeft: 2, ArrowRight: 3, KeyW: 0, KeyS: 1, KeyA: 2, KeyD: 3 };
    return {
      update(dt) { t += dt; flash = Math.max(0, flash - dt); if (done) endT += dt; },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#E7D9F5'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#d7c4ee';
        for (let i = 0; i < 20; i++) {
          ctx.save(); ctx.translate((i * 211) % W, (i * 137) % H); ctx.rotate(0.5);
          ctx.fillRect(-8, -8, 16, 16); ctx.restore();
        }
        const showing = t * 1000 < SHOW_MS;
        U.sticker(ctx, 12, 10, 300, 44, 12, '#FFFDF6');
        ctx.fillStyle = P.ink; ctx.font = '900 21px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('🧠 ' + idx + '/' + N + '   💩 ' + errors, 26, 40);
        ctx.textAlign = 'center';
        const cw = N <= 5 ? 118 : N === 6 ? 104 : 92;
        const x0 = W / 2 - ((N - 1) * cw) / 2;
        if (showing) {
          U.sticker(ctx, W / 2 - 190, 56, 380, 52, 14, P.grape);
          ctx.fillStyle = '#fff'; ctx.font = '900 25px ' + U.ROUND_FONT;
          ctx.fillText('👀 DECORE! (' + Math.ceil((SHOW_MS - t * 1000) / 1000) + 's)', W / 2, 92);
          for (let i = 0; i < N; i++) {
            const x = x0 + i * cw;
            const j = Math.sin(t * 8 + i) * 4;
            ctx.fillStyle = 'rgba(58,43,31,0.15)';
            U.roundRect(ctx, x - 46, 134 + j, 92, 96, 16); ctx.fill();
            ctx.fillStyle = SYMS[seq[i]].css;
            U.roundRect(ctx, x - 50, 130 + j, 92, 96, 16); ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
            U.face(ctx, x, 152 + j, 40, 'wow');
            ctx.fillStyle = P.ink; ctx.font = '900 44px ' + U.ROUND_FONT;
            ctx.fillText(SYMS[seq[i]].k, x, 212 + j);
          }
        } else {
          U.sticker(ctx, W / 2 - 190, 56, 380, 52, 14, P.leaf);
          ctx.fillStyle = '#fff'; ctx.font = '900 25px ' + U.ROUND_FONT;
          ctx.fillText('✍️ REPITA AÍ!', W / 2, 92);
          for (let i = 0; i < N; i++) {
            const x = x0 + i * cw;
            const filled = i < idx;
            ctx.fillStyle = filled ? SYMS[seq[i]].css : '#FFFDF6';
            U.roundRect(ctx, x - 50, 130, 92, 96, 16); ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
            if (filled) {
              ctx.fillStyle = P.ink; ctx.font = '900 44px ' + U.ROUND_FONT;
              ctx.fillText(SYMS[seq[i]].k, x, 200);
            } else {
              U.face(ctx, x, 178, 44, 'sleepy');
            }
          }
          if (flash > 0 && !flashOk) {
            ctx.font = '900 40px ' + U.ROUND_FONT;
            ctx.lineWidth = 7; ctx.strokeStyle = P.ink;
            ctx.strokeText('OPS! 🤪', W / 2, 285);
            ctx.fillStyle = P.tomato; ctx.fillText('OPS! 🤪', W / 2, 285);
          }
          for (let i = 0; i < 4; i++) {
            const bx = 170 + i * 155;
            ctx.fillStyle = 'rgba(58,43,31,0.15)';
            U.roundRect(ctx, bx - 64, 320, 132, 124, 18); ctx.fill();
            ctx.fillStyle = SYMS[i].css;
            U.roundRect(ctx, bx - 68, 316, 132, 124, 18); ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
            ctx.fillStyle = P.ink; ctx.font = '900 54px ' + U.ROUND_FONT;
            ctx.fillText(SYMS[i].k, bx, 408);
          }
        }
        if (done) U.powStar(ctx, W / 2, 258, 92 + Math.sin(endT * 8) * 6, P.butter, 'CÉREBRO DE AÇO!');
      },
      onKey(code) { if (keyMap[code] !== undefined) press(keyMap[code]); },
      onPointerDown(x, y) { const b = btnAt(x, y); if (b >= 0) press(b); }
    };
  }
};
