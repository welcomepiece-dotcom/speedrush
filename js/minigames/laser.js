// Raio Laser Maluco — gire os espelhos e frite o alvo! 🔥
window.SR = window.SR || {};
window.SR.Mini_laser = {
  id: 'laser', name: 'Raio Laser Maluco', duration: 15000,
  instruction: 'Toque nos espelhos p/ girar e levar o raio até o alvo!',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const rng = api.rng;
    const heat = api.heat || 0;
    const N = 3;
    const gx = 250, gy = 110, cell = 110;
    const mirrors = [
      { c: 0, r: 1, sol: 1 }, { c: 1, r: 1, sol: 0 }, { c: 1, r: 0, sol: 1 }
    ];
    mirrors.forEach(m => {
      m.cur = m.sol;
      if (rng() < 0.85) m.cur = 1 - m.cur;
      m.spin = 0;
    });
    function solved() { return mirrors.every(m => m.cur === m.sol); }
    if (solved()) mirrors[0].cur = 1 - mirrors[0].cur;
    let done = false, moves = 0, t = 0, endT = 0;
    function trace() {
      let c = -1, r = 1, dx = 1, dy = 0;
      const pts = [{ x: gx - 30, y: gy + 1 * cell + cell / 2 }];
      for (let step = 0; step < 12; step++) {
        const nc = c + dx, nr = r + dy;
        if (nc < 0 || nr < 0 || nc >= N || nr >= N) {
          pts.push({ x: gx + (c + 0.5 + dx * 0.6) * cell, y: gy + (r + 0.5 + dy * 0.6) * cell, end: true });
          return { pts, hit: false };
        }
        c = nc; r = nr;
        const cx = gx + c * cell + cell / 2, cy = gy + r * cell + cell / 2;
        pts.push({ x: cx, y: cy });
        const m = mirrors.find(k => k.c === c && k.r === r);
        if (m) {
          if (m.cur === 0) { const ndx = -dy, ndy = -dx; dx = ndx; dy = ndy; }
          else { const ndx = dy, ndy = dx; dx = ndx; dy = ndy; }
        }
        if (c === 1 && r === 0 && dx === 0 && dy === -1) {
          pts.push({ x: gx + 1 * cell + cell / 2, y: gy - 24, end: true });
          return { pts, hit: true };
        }
      }
      return { pts, hit: false };
    }
    function clickAt(x, y) {
      if (done) return;
      for (const m of mirrors) {
        const cx = gx + m.c * cell + cell / 2, cy = gy + m.r * cell + cell / 2;
        if (Math.abs(x - cx) < cell / 2 && Math.abs(y - cy) < cell / 2) {
          m.cur = 1 - m.cur; m.spin = 0.3; moves++; S.zap();
          const tr = trace();
          if (tr.hit) { done = true; S.taDa(); api.finish({ moves }); }
          return;
        }
      }
    }
    return {
      update(dt) { t += dt; mirrors.forEach(m => { m.spin = Math.max(0, m.spin - dt); }); if (done) endT += dt; },
      draw(ctx) {
        const tr = trace();
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#2E2A4F'; ctx.fillRect(0, 0, W, H);
        // estrelinhas de papel de parede
        ctx.fillStyle = '#3d3770';
        for (let i = 0; i < 24; i++) {
          const sx = (i * 173) % W, sy = (i * 97) % H;
          ctx.fillRect(sx, sy, 5, 5);
        }
        // tapete
        ctx.fillStyle = '#463f7e';
        U.roundRect(ctx, gx - 70, gy - 60, N * cell + 140, N * cell + 130, 24); ctx.fill();
        U.sticker(ctx, 12, 10, 230, 44, 12, '#FFFDF6');
        ctx.fillStyle = P.ink; ctx.font = '900 21px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('🔁 Giros: ' + moves, 26, 40);
        for (let c = 0; c < N; c++) for (let rr = 0; rr < N; rr++) {
          const X = gx + c * cell, Y = gy + rr * cell;
          ctx.fillStyle = '#57509b';
          U.roundRect(ctx, X + 4, Y + 4, cell - 8, cell - 8, 12); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
        }
        // máquina de raio (com carinha brava!)
        ctx.fillStyle = P.tomato;
        U.roundRect(ctx, gx - 66, gy + 1 * cell + cell / 2 - 24, 58, 48, 10); ctx.fill();
        ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
        U.face(ctx, gx - 37, gy + 1 * cell + cell / 2 + 2, 34, 'angry');
        // alvo: rosquinha
        const tx = gx + 1 * cell + cell / 2, ty = gy - 6;
        const jig = tr.hit ? Math.sin(t * 20) * 4 : 0;
        ctx.fillStyle = tr.hit ? P.leaf : P.butter;
        ctx.beginPath(); ctx.arc(tx + jig, ty - 18, 24, 0, 7); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.fillStyle = '#FFFDF6';
        ctx.beginPath(); ctx.arc(tx + jig, ty - 18, 10, 0, 7); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
        U.face(ctx, tx + jig, ty - 48, 26, tr.hit ? 'dizzy' : 'happy');
        // espelhos com carinha
        for (const m of mirrors) {
          const cx = gx + m.c * cell + cell / 2, cy = gy + m.r * cell + cell / 2;
          ctx.save();
          ctx.translate(cx, cy); ctx.rotate(m.spin * 12); ctx.translate(-cx, -cy);
          ctx.strokeStyle = '#BFE9FF'; ctx.lineWidth = 10; ctx.lineCap = 'round';
          ctx.beginPath();
          if (m.cur === 0) { ctx.moveTo(cx + 32, cy - 32); ctx.lineTo(cx - 32, cy + 32); }
          else { ctx.moveTo(cx - 32, cy - 32); ctx.lineTo(cx + 32, cy + 32); }
          ctx.stroke();
          ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.stroke();
          ctx.restore();
          U.face(ctx, cx, cy + 34, 22, 'wow');
        }
        // raio tremelicante
        const wob = heat > 0.3 ? Math.sin(t * 30) * 3 : 0;
        ctx.strokeStyle = tr.hit ? P.leaf : P.tomato; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath();
        tr.pts.forEach((p, i) => {
          const ox = (i > 0 && i < tr.pts.length - 1) ? wob : 0;
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x + ox, p.y);
        });
        ctx.stroke();
        ctx.fillStyle = '#fff';
        tr.pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill(); });
        if (tr.hit) {
          for (let i = 0; i < 8; i++) {
            const a = t * 6 + i * 0.8;
            ctx.fillStyle = P.butter;
            ctx.beginPath(); ctx.arc(tx + Math.cos(a) * (30 + (t * 60) % 20), ty - 18 + Math.sin(a) * (30 + (t * 60) % 20), 5, 0, 7); ctx.fill();
          }
          U.powStar(ctx, W / 2, 452, 62 + Math.sin(endT * 8) * 5, P.butter, 'FRITOU!');
        } else {
          ctx.fillStyle = '#cfc3f5'; ctx.font = '800 16px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.fillText('Leve o raio vermelhinho até a rosquinha! 🍩', W / 2, 472);
        }
      },
      onPointerDown(x, y) { clickAt(x, y); }
    };
  }
};
