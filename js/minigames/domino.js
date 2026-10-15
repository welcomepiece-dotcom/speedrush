// Dominó da Fofoca — só UMA peça espalha a fofoca p/ TODO MUNDO. Descubra qual!
window.SR = window.SR || {};
window.SR.Mini_domino = {
  id: 'domino', name: 'Dominó da Fofoca', duration: 12000,
  instruction: 'Siga os fios: só UMA peça fofoca p/ os 6 vizinhos!',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const rng = api.rng;
    const heat = api.heat || 0, SPD = api.speed || 1;
    const N_START = 5, N_TARG = 6;
    const correct = Math.floor(rng() * N_START);
    const reachCount = [];
    for (let i = 0; i < N_START; i++) reachCount[i] = (i === correct) ? N_TARG : 2 + Math.floor(rng() * 4);
    let tries = 0, lock = 0, done = false, anim = 0, chosen = -1, t = 0;
    const startY = 120, targY = 360;
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const pcols = [P.tomato, P.butter, P.sky, P.grape, P.orange];
    function startX(i) { return 110 + i * 145; }
    function targX(i) { return 90 + i * 112; }
    function clickAt(x, y) {
      if (done || lock > 0) return;
      for (let i = 0; i < N_START; i++) {
        if (Math.hypot(x - startX(i), y - startY) < 48) {
          if (i === correct) {
            chosen = i; done = true; anim = 0.001; S.taDa();
            api.progress(1);
          } else {
            tries++; lock = 1.6; S.splat();
          }
          return;
        }
      }
    }
    return {
      update(dt) {
        t += dt;
        if (lock > 0) lock -= dt;
        if (anim > 0) {
          anim += dt * SPD;
          api.progress(Math.min(1, anim / 1.2));
          if (anim >= 1.3) api.finish({ tries });
        }
      },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#F6E3C5'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#efd3ac';
        for (let i = 0; i < 30; i++) {
          ctx.beginPath(); ctx.arc((i * 137) % W, (i * 89) % H, 4, 0, 7); ctx.fill();
        }
        U.sticker(ctx, 12, 10, 330, 44, 12, '#FFFDF6');
        ctx.fillStyle = P.ink; ctx.font = '900 20px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('📢 Fofocas erradas: ' + tries + (lock > 0 ? ' 🤫(' + lock.toFixed(1) + ')' : ''), 26, 40);
        for (let i = 0; i < N_START; i++) {
          const sx = startX(i);
          const n = reachCount[i];
          for (let k = 0; k < N_TARG; k++) {
            const tx = targX(k);
            const broken = (i !== correct && k >= n);
            ctx.strokeStyle = broken ? '#c9a87f' : (i === correct ? P.leaf : '#9c8a70');
            ctx.lineWidth = 2.5;
            ctx.setLineDash([7, 6]);
            ctx.beginPath(); ctx.moveTo(sx, startY + 42);
            const wig = heat > 0.3 ? Math.sin(t * 6 + i * 2 + k) * 8 : 0;
            ctx.quadraticCurveTo((sx + tx) / 2 + wig, 248, tx, targY - 42); ctx.stroke();
            ctx.setLineDash([]);
            if (broken) {
              ctx.fillStyle = P.tomato; ctx.font = '900 22px ' + U.ROUND_FONT; ctx.textAlign = 'center';
              ctx.fillText('✕', (sx + tx) / 2 + wig, 252);
            }
          }
        }
        for (let i = 0; i < N_START; i++) {
          const x = startX(i);
          const sel = (i === chosen);
          ctx.save();
          ctx.translate(x, startY); ctx.rotate(sel ? 0.5 : Math.sin(t * 3 + i) * 0.06 - 0.1);
          ctx.fillStyle = 'rgba(58,43,31,0.15)';
          U.roundRect(ctx, -24, -36, 52, 80, 10); ctx.fill();
          ctx.fillStyle = lock > 0 && !sel ? '#c9bda6' : pcols[i];
          U.roundRect(ctx, -28, -42, 52, 80, 10); ctx.fill();
          ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
          U.face(ctx, -2, -8, 34, sel ? 'happy' : 'wow');
          ctx.restore();
          ctx.fillStyle = P.ink; ctx.font = '900 24px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          U.sticker(ctx, x - 20, startY + 46, 40, 36, 10, '#FFFDF6');
          ctx.fillStyle = P.ink;
          ctx.fillText(labels[i], x, startY + 73);
        }
        const fallN = done ? Math.min(N_TARG, Math.floor(anim / 1.2 * N_TARG) + 1) : 0;
        for (let k = 0; k < N_TARG; k++) {
          const x = targX(k);
          const fallen = done && k < fallN;
          if (fallen && k === fallN - 1 && Math.random() < 0.3) S.click();
          ctx.save(); ctx.translate(x, targY);
          if (fallen) ctx.rotate(1.25);
          ctx.fillStyle = 'rgba(58,43,31,0.15)';
          U.roundRect(ctx, -22, -36, 48, 80, 10); ctx.fill();
          ctx.fillStyle = fallen ? P.leaf : '#FFFDF6';
          U.roundRect(ctx, -26, -42, 48, 80, 10); ctx.fill();
          ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
          U.face(ctx, -2, -12, 32, fallen ? 'wow' : 'happy');
          ctx.fillStyle = fallen ? '#fff' : P.tomato; ctx.font = '900 20px ' + U.ROUND_FONT;
          ctx.fillText('📢', -2, 24);
          ctx.restore();
        }
        if (done) {
          ctx.save(); ctx.translate(W / 2, 58); ctx.rotate(-0.03);
          ctx.font = '900 32px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.lineWidth = 7; ctx.strokeStyle = P.ink;
          ctx.strokeText('⛓ A FOFOCA SE ESPALHOU!', 0, 0);
          ctx.fillStyle = P.leaf; ctx.fillText('⛓ A FOFOCA SE ESPALHOU!', 0, 0);
          ctx.restore();
        } else {
          ctx.fillStyle = P.ink; ctx.font = '800 16px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.fillText('Toque na peça que alcança os 6 vizinhos 👀', W / 2, 472);
        }
      },
      onPointerDown(x, y) { clickAt(x, y); }
    };
  }
};
