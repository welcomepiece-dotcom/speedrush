// Torre Maluca — empilhe 6 tralhas com o guindaste doido. Fica mais rápido com o calor!
window.SR = window.SR || {};
window.SR.Mini_tower = {
  id: 'tower', name: 'Torre Maluca', duration: 15000,
  instruction: 'Solte a tralha bem no meio! ESPAÇO / clique / toque.',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const NEED = 6, PW = 120, PH = 28;
    const heat = api.heat || 0, SPD = api.speed || 1;
    const baseX = W / 2;
    let misses = 0, drops = 0;
    let craneT = 0, craneSpeed = 1.7 * SPD;
    let stack = [], falling = null;
    let wobble = 0, done = false, t = 0, endT = 0;
    let uh = 0;
    const parts = [];
    const FACES = ['happy', 'wow', 'happy', 'dizzy', 'happy', 'wow'];
    const COLS = [P.tomato, P.butter, P.sky, P.leaf, P.grape, P.orange];
    function craneX() {
      const range = (235 + heat * 40) - stack.length * 12;
      return baseX + Math.sin(craneT) * range;
    }
    function drop() {
      if (done || falling) return;
      falling = { x: craneX(), y: 70, vy: 430 * (1 + heat * 0.45), rot: (Math.random() - 0.5) * 0.3 };
      S.pop();
    }
    return {
      update(dt) {
        t += dt; craneT += dt * craneSpeed;
        U.stepParticles(parts, dt);
        uh = Math.max(0, uh - dt);
        if (done) { endT += dt; return; }
        if (falling) {
          falling.y += falling.vy * dt;
          const topY = H - 60 - stack.length * (PH + 2);
          if (falling.y >= topY) {
            const prevX = stack.length ? stack[stack.length - 1].x : baseX;
            const off = Math.abs(falling.x - prevX);
            drops++;
            if (off > PW * 0.62) {
              misses++; falling = null; wobble = 1; uh = 0.8; S.splat();
              api.progress(stack.length / NEED);
            } else {
              stack.push({ x: falling.x - (falling.x - prevX) * 0.15 });
              falling = null;
              craneSpeed = (1.7 + stack.length * 0.5) * SPD;
              U.burst(parts, stack[stack.length - 1].x, topY, COLS[(stack.length - 1) % 6], 10, 200);
              S.good();
              api.progress(stack.length / NEED);
              if (stack.length >= NEED) { done = true; S.taDa(); api.finish({ drops, misses }); }
            }
          }
        }
        wobble = Math.max(0, wobble - dt * 2);
      },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#BEE3F8'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#a5d6f3';
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(50 + i * 90, 70, 26, 0, 7); ctx.fill(); }
        // sol com óculos
        ctx.fillStyle = P.butter;
        ctx.beginPath(); ctx.arc(700, 80, 42, 0, 7); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.fillStyle = P.ink; ctx.fillRect(672, 66, 56, 10);
        U.face(ctx, 700, 82, 40, 'happy');
        // chão de grama
        ctx.fillStyle = P.leaf; ctx.fillRect(0, H - 46, W, 46);
        ctx.fillStyle = '#4a9e57';
        for (let i = 0; i < 16; i++) { ctx.fillRect(i * 55, H - 56, 26, 12); }
        // base
        ctx.fillStyle = P.choc;
        U.roundRect(ctx, baseX - 170, H - 66, 340, 24, 8); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        // tralhas empilhadas (com rostinho!)
        const pop = U.popScale(Math.min(t, 0.45));
        stack.forEach((s, i) => {
          const y = H - 66 - (i + 1) * (PH + 2);
          const wob = wobble * Math.sin(t * 30) * 7;
          ctx.save();
          ctx.translate(s.x + wob, y + PH / 2);
          ctx.fillStyle = 'rgba(58,43,31,0.18)';
          U.roundRect(ctx, -PW / 2 + 4, -PH / 2 + 5, PW, PH, 8); ctx.fill();
          ctx.fillStyle = COLS[i % 6];
          U.roundRect(ctx, -PW / 2, -PH / 2, PW, PH, 8); ctx.fill();
          ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
          U.face(ctx, 0, 2, 30, FACES[i % 6]);
          ctx.restore();
        });
        // guindaste
        const cx = craneX();
        ctx.strokeStyle = P.ink; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, 66); ctx.stroke();
        ctx.fillStyle = P.gum;
        U.roundRect(ctx, cx - PW / 2, 40, PW, PH, 8); ctx.fill();
        ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
        U.face(ctx, cx, 54, 26, 'wow');
        if (falling) {
          ctx.save();
          ctx.translate(falling.x, falling.y + PH / 2); ctx.rotate(falling.rot);
          ctx.fillStyle = COLS[stack.length % 6];
          U.roundRect(ctx, -PW / 2, -PH / 2, PW, PH, 8); ctx.fill();
          ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
          U.face(ctx, 0, 2, 30, 'wow');
          ctx.restore();
        }
        U.drawParticles(ctx, parts);
        // placar em adesivo
        U.sticker(ctx, 12, 10, 250, 44, 12, '#FFFDF6');
        ctx.fillStyle = P.ink; ctx.font = '900 21px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('🧱 ' + stack.length + '/' + NEED + '   💩 ' + misses, 26, 40);
        if (uh > 0) {
          ctx.save();
          ctx.translate(baseX, 200); ctx.rotate(-0.08);
          ctx.font = '900 54px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.lineWidth = 8; ctx.strokeStyle = P.ink;
          ctx.strokeText('UH! ERROU!', 0, 0);
          ctx.fillStyle = P.tomato; ctx.fillText('UH! ERROU!', 0, 0);
          ctx.restore();
        }
        if (done) U.powStar(ctx, baseX, 220, 110 + Math.sin(endT * 8) * 8, P.butter, 'EMPILHOU!');
      },
      onKey(code) { if (code === 'Space' || code === 'Enter') drop(); },
      onPointerDown() { drop(); }
    };
  }
};
