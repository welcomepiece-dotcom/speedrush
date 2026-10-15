// Controle Pirado — leve a bolinha até a rosquinha! Os controles piram sozinhos!
window.SR = window.SR || {};
window.SR.Mini_broken = {
  id: 'broken', name: 'Controle Pirado', duration: 15000,
  instruction: 'Leve a bolinha à rosquinha! Os controles MUDAM sozinhos!',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const rng = api.rng;
    const heat = api.heat || 0, SPD = api.speed || 1;
    const MODES = [
      { name: 'NORMAL 🙂', css: P.leaf },
      { name: 'TUDO AO CONTRÁRIO 🙃', css: P.tomato },
      { name: 'GIRO LOUCO 🌀', css: P.butter },
      { name: 'EIXOS TROCKHADOS 🔀', css: P.grape }
    ];
    let ball = { x: 120, y: 390, vx: 0, vy: 0, face: 'happy' };
    const goal = { x: 640 + rng() * 70, y: 110 + rng() * 60, r: 30 };
    const walls = [
      { x: 300, y: 200, w: 200, h: 22 }, { x: 250, y: 330, w: 22, h: 120 },
      { x: 480, y: 300, w: 160, h: 22 }
    ];
    const MODE_T = 4 / SPD;
    let mode = 0, modeT = 0, t = 0, done = false, endT = 0, changes = 0, bump = 0;
    function mapVec(x, y) {
      if (mode === 0) return { x, y };
      if (mode === 1) return { x: -x, y: -y };
      if (mode === 2) return { x: -y, y: x };
      return { x: y, y: x };
    }
    return {
      update(dt) {
        t += dt; bump = Math.max(0, bump - dt);
        if (done) { endT += dt; return; }
        modeT += dt;
        if (modeT >= MODE_T) { modeT = 0; mode = (mode + 1) % MODES.length; changes++; S.boing(); api.progress(0.15); }
        let ax = api.input.axis();
        const p = api.input.pointer;
        if (p.down) {
          const dx = (p.x - W / 2) / 200, dy = (p.y - H / 2) / 150;
          if (Math.hypot(dx, dy) > 0.25) ax = { x: U.clamp(dx, -1, 1), y: U.clamp(dy, -1, 1) };
        }
        const m = mapVec(ax.x, ax.y);
        ball.vx += m.x * 1500 * dt; ball.vy += m.y * 1500 * dt;
        ball.vx *= (1 - dt * 3); ball.vy *= (1 - dt * 3);
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.x = U.clamp(ball.x, 26, W - 26); ball.y = U.clamp(ball.y, 76, H - 26);
        for (const wl of walls) {
          if (ball.x > wl.x - 14 && ball.x < wl.x + wl.w + 14 && ball.y > wl.y - 14 && ball.y < wl.y + wl.h + 14) {
            ball.vx *= -0.5; ball.vy *= -0.5; bump = 0.3; ball.face = 'dizzy'; S.bad();
          }
        }
        if (bump <= 0 && ball.face === 'dizzy' && Math.hypot(ball.vx, ball.vy) < 60) ball.face = 'happy';
        const d = Math.hypot(ball.x - goal.x, ball.y - goal.y);
        api.progress(Math.max(0, 1 - d / 700));
        if (d < goal.r + 12) { done = true; S.taDa(); api.finish({ changes }); }
      },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#D6F0C8'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#c2e5ae';
        for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) {
          if ((i + j) % 2 === 0) ctx.fillRect(i * 70, 60 + j * 56, 70, 56);
        }
        // cercadinho
        ctx.fillStyle = '#fff';
        U.roundRect(ctx, 14, 66, W - 28, H - 80, 18); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        // modo atual em adesivo
        U.sticker(ctx, 24, 78, 350, 42, 12, MODES[mode].css);
        ctx.fillStyle = (mode === 2) ? P.ink : '#fff';
        ctx.font = '900 19px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('🎮 ' + MODES[mode].name + ' (' + Math.ceil(MODE_T - modeT) + 's)', 38, 106);
        // obstáculos = cercas
        walls.forEach(wl => {
          ctx.fillStyle = '#B07B3F';
          U.roundRect(ctx, wl.x, wl.y, wl.w, wl.h, 8); ctx.fill();
          ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
          ctx.strokeStyle = '#7d5426'; ctx.lineWidth = 2;
          const n = Math.floor((wl.w > wl.h ? wl.w : wl.h) / 26);
          for (let i = 1; i < n; i++) {
            if (wl.w > wl.h) { ctx.beginPath(); ctx.moveTo(wl.x + i * 26, wl.y + 3); ctx.lineTo(wl.x + i * 26, wl.y + wl.h - 3); ctx.stroke(); }
            else { ctx.beginPath(); ctx.moveTo(wl.x + 3, wl.y + i * 26); ctx.lineTo(wl.x + wl.w - 3, wl.y + i * 26); ctx.stroke(); }
          }
        });
        // rosquinha pulsante
        const pu = 1 + Math.sin(t * 6) * 0.1;
        ctx.fillStyle = '#F2A7C3';
        ctx.beginPath(); ctx.arc(goal.x, goal.y, goal.r * pu, 0, 7); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.fillStyle = '#FFFDF6';
        ctx.beginPath(); ctx.arc(goal.x, goal.y, goal.r * 0.42, 0, 7); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
        U.face(ctx, goal.x, goal.y - goal.r - 16, 26, 'happy');
        // bolinha com rastro
        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > 120) {
          ctx.fillStyle = 'rgba(228,87,46,0.3)';
          ctx.beginPath(); ctx.arc(ball.x - ball.vx * 0.05, ball.y - ball.vy * 0.05, 13, 0, 7); ctx.fill();
        }
        const sq = 1 + Math.min(0.25, sp / 2000);
        ctx.save(); ctx.translate(ball.x, ball.y); ctx.scale(sq, 1 / sq);
        ctx.fillStyle = P.tomato;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        U.face(ctx, 0, 0, 30, bump > 0 ? 'dizzy' : 'happy');
        ctx.restore();
        if (bump > 0) {
          ctx.font = '900 30px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.lineWidth = 6; ctx.strokeStyle = P.ink;
          ctx.strokeText('AI! 😵', ball.x, ball.y - 30);
          ctx.fillStyle = P.butter; ctx.fillText('AI! 😵', ball.x, ball.y - 30);
        }
        ctx.fillStyle = P.ink; ctx.font = '800 15px ' + U.ROUND_FONT; ctx.textAlign = 'center';
        ctx.fillText('Setas/WASD ou arraste o dedo na tela', W / 2, H - 10);
        if (done) U.powStar(ctx, goal.x, goal.y - 90, 80 + Math.sin(endT * 8) * 6, P.butter, 'DOMADO!');
      }
    };
  }
};
