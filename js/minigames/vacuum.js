// Papa-Tudo — o aspirador faminto só come a cor-alvo! Não dê comida estragada!
window.SR = window.SR || {};
window.SR.Mini_vacuum = {
  id: 'vacuum', name: 'Papa-Tudo', duration: 15000,
  instruction: 'Alimente o bichão SÓ com a cor-alvo! Mouse / setas / arrastar.',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const COLORS = [['red', P.tomato, '🍅'], ['blue', P.sky, '🫐'], ['green', P.leaf, '🍏'], ['gold', P.butter, '🍋']];
    const rng = api.rng;
    const heat = api.heat || 0, SPD = api.speed || 1;
    const target = COLORS[Math.floor(rng() * COLORS.length)];
    const NEED = 6;
    let collected = 0, errors = 0, t = 0, done = false, endT = 0;
    let vac = { x: W / 2, y: H - 70, squash: 0, mood: 'happy' };
    let items = [], spawnT = 0, shake = 0;
    const parts = [];
    function spawn() {
      const c = COLORS[Math.floor(rng() * COLORS.length)];
      const dir = rng() < 0.5 ? 1 : -1;
      items.push({
        x: dir > 0 ? -30 : W + 30,
        y: 90 + rng() * 260,
        vx: dir * (120 + rng() * 120) * SPD,
        r: 17 + rng() * 8,
        color: c[0], css: c[1], emoji: c[2],
        wob: rng() * 6
      });
    }
    for (let i = 0; i < 5; i++) spawn();
    return {
      update(dt) {
        t += dt; shake = Math.max(0, shake - dt);
        vac.squash = Math.max(0, vac.squash - dt * 3);
        U.stepParticles(parts, dt);
        if (done) { endT += dt; return; }
        const ax = api.input.axis();
        vac.x += ax.x * 540 * dt;
        const p = api.input.pointer;
        if (p.down) vac.x += (p.x - vac.x) * Math.min(1, dt * 10);
        vac.x = U.clamp(vac.x, 55, W - 55);
        spawnT -= dt;
        if (spawnT <= 0 && items.length < 9 + heat * 3) { spawn(); spawnT = 0.55 / SPD; }
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.x += it.vx * dt; it.y += Math.sin(t * 3 + it.wob) * 34 * dt;
          if ((it.vx > 0 && it.x > W + 40) || (it.vx < 0 && it.x < -40)) { items.splice(i, 1); continue; }
          const d = Math.hypot(it.x - vac.x, it.y - (vac.y - 46));
          if (d < 72) {
            items.splice(i, 1);
            if (it.color === target[0]) {
              collected++; vac.squash = 1; vac.mood = 'happy';
              S.good();
              U.burst(parts, vac.x, vac.y - 60, it.css, 12, 220);
              api.progress(collected / NEED);
              if (collected >= NEED) { done = true; S.taDa(); api.finish({ collected, errors }); }
            } else {
              errors++; shake = 0.5; vac.mood = 'dizzy';
              S.splat();
              U.burst(parts, vac.x, vac.y - 60, P.tomato, 8, 200);
            }
          }
        }
      },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        const shx = shake > 0 ? Math.sin(t * 50) * 8 * shake : 0;
        ctx.save(); ctx.translate(shx, 0);
        ctx.fillStyle = '#D8F0FD'; ctx.fillRect(-20, 0, W + 40, H);
        // nuvens
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) {
          const nx = ((t * 20 * SPD + i * 260) % (W + 200)) - 100;
          ctx.beginPath(); ctx.arc(nx, 60 + (i % 2) * 40, 26, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(nx + 24, 60 + (i % 2) * 40, 20, 0, 7); ctx.fill();
        }
        // grama
        ctx.fillStyle = P.leaf; ctx.fillRect(-20, H - 40, W + 40, 40);
        // pedido em adesivo
        U.sticker(ctx, 12, 10, 330, 52, 14, '#FFFDF6');
        ctx.fillStyle = P.ink; ctx.font = '900 22px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('QUERO SÓ: ', 26, 44);
        ctx.fillStyle = target[1];
        ctx.beginPath(); ctx.arc(196, 36, 16, 0, 7); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.fillStyle = P.ink; ctx.font = '900 22px ' + U.ROUND_FONT;
        ctx.fillText(collected + '/' + NEED + '  💩' + errors, 222, 44);
        // comidinhas (com carinha!)
        for (const it of items) {
          ctx.fillStyle = it.css;
          ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, 7); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
          U.face(ctx, it.x, it.y, it.r * 1.1, it.color === target[0] ? 'happy' : 'dizzy');
          if (it.color === target[0]) {
            ctx.strokeStyle = P.butter; ctx.lineWidth = 3;
            ctx.setLineDash([6, 5]);
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 7, t * 3, t * 3 + 5); ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        // bichão papa-tudo
        const sq = vac.squash;
        const bw = 110 + sq * 22, bh = 64 - sq * 14;
        ctx.fillStyle = 'rgba(58,43,31,0.15)';
        ctx.beginPath(); ctx.ellipse(vac.x, vac.y + 30, 60, 12, 0, 0, 7); ctx.fill();
        ctx.fillStyle = P.orange;
        U.roundRect(ctx, vac.x - bw / 2, vac.y - bh / 2, bw, bh, 20); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        // bocão aberto
        ctx.fillStyle = P.ink;
        ctx.beginPath(); ctx.ellipse(vac.x, vac.y - bh / 2 + 6, 30 + sq * 10, 16, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ff8f9e';
        ctx.beginPath(); ctx.ellipse(vac.x, vac.y - bh / 2 + 12, 14, 7, 0, 0, 7); ctx.fill();
        U.face(ctx, vac.x, vac.y + 8, 52, vac.mood);
        // funil
        ctx.fillStyle = P.sky;
        ctx.beginPath();
        ctx.moveTo(vac.x - 26, vac.y - bh / 2); ctx.lineTo(vac.x + 26, vac.y - bh / 2);
        ctx.lineTo(vac.x + 52, vac.y - bh / 2 - 90); ctx.lineTo(vac.x - 52, vac.y - bh / 2 - 90);
        ctx.closePath(); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        U.drawParticles(ctx, parts);
        ctx.restore();
        ctx.fillStyle = P.ink; ctx.font = '800 15px ' + U.ROUND_FONT; ctx.textAlign = 'center';
        ctx.fillText('Cuidado: comida errada dá dor de barriga!', W / 2, H - 8);
        if (done) U.powStar(ctx, W / 2, 220, 115 + Math.sin(endT * 8) * 8, P.butter, 'BARRIGA CHEIA!');
      }
    };
  }
};
