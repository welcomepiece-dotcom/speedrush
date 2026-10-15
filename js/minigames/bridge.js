// Ponte do Pânico — gire as tábuas e ligue a ENTRADA à SAÍDA antes que o jacaré acorde.
window.SR = window.SR || {};
window.SR.Mini_bridge = {
  id: 'bridge', name: 'Ponte do Pânico', duration: 15000,
  instruction: 'Toque nas tábuas p/ GIRAR e montar o caminho! 🐊',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const rng = api.rng;
    const heat = api.heat || 0;
    const COLS = heat > 0.55 ? 6 : 5, ROWS = 3;
    const cell = COLS === 6 ? 90 : 105;
    const gx = COLS === 6 ? 118 : 170, gy = 130;
    const path = [];
    let r = Math.floor(rng() * ROWS);
    const startR = r;
    for (let c = 0; c < COLS; c++) {
      path.push({ c, r });
      if (c < COLS - 1 && rng() < 0.45 + heat * 0.15) {
        const nr = U.clamp(r + (rng() < 0.5 ? -1 : 1), 0, ROWS - 1);
        if (nr !== r) { r = nr; path.push({ c, r }); }
      }
    }
    const key = (c, rr) => c + ',' + rr;
    const pathSet = new Set(path.map(p => key(p.c, p.r)));
    function neighbors(p) {
      const n = [];
      [{ c: p.c - 1, r: p.r, d: 'L' }, { c: p.c + 1, r: p.r, d: 'R' }, { c: p.c, r: p.r - 1, d: 'U' }, { c: p.c, r: p.r + 1, d: 'D' }]
        .forEach(k => { if (pathSet.has(key(k.c, k.r))) n.push(k.d); });
      return n;
    }
    const grid = [];
    for (let c = 0; c < COLS; c++) {
      grid[c] = [];
      for (let rr = 0; rr < ROWS; rr++) {
        let conns;
        if (pathSet.has(key(c, rr))) conns = new Set(neighbors({ c, r: rr }));
        else {
          const kinds = [['U', 'D'], ['L', 'R'], ['U', 'R'], ['L', 'U'], ['U', 'R', 'D'], ['R', 'D', 'L']];
          conns = new Set(kinds[Math.floor(rng() * kinds.length)]);
        }
        let rot = Math.floor(rng() * 4);
        if (pathSet.has(key(c, rr)) && rot === 0) rot = 1 + Math.floor(rng() * 3);
        grid[c][rr] = { base: Array.from(conns), rot, wig: rng() * 6 };
      }
    }
    function rotated(conns, rot) {
      const order = ['U', 'R', 'D', 'L'];
      const out = new Set();
      conns.forEach(d => out.add(order[(order.indexOf(d) + rot) % 4]));
      return out;
    }
    function connected() {
      const seen = new Set(); const q = [{ c: 0, r: startR }];
      seen.add('0,' + startR);
      const D = { U: [0, -1, 'D'], D: [0, 1, 'U'], L: [-1, 0, 'R'], R: [1, 0, 'L'] };
      while (q.length) {
        const cur = q.pop();
        if (cur.c === COLS - 1) return true;
        const cc = rotated(grid[cur.c][cur.r].base, grid[cur.c][cur.r].rot);
        for (const d of cc) {
          const dd = D[d];
          const nc = cur.c + dd[0], nr = cur.r + dd[1];
          if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
          if (!rotated(grid[nc][nr].base, grid[nc][nr].rot).has(dd[2])) continue;
          const k = nc + ',' + nr;
          if (!seen.has(k)) { seen.add(k); q.push({ c: nc, r: nr }); }
        }
      }
      return false;
    }
    let done = false, moves = 0, t = 0, endT = 0;
    function cellAt(x, y) {
      for (let c = 0; c < COLS; c++) for (let rr = 0; rr < ROWS; rr++) {
        const X = gx + c * cell, Y = gy + rr * cell;
        if (x >= X && x <= X + cell && y >= Y && y <= Y + cell) return { c, r: rr };
      }
      return null;
    }
    function rotateAt(x, y) {
      if (done) return;
      const cl = cellAt(x, y); if (!cl) return;
      grid[cl.c][cl.r].rot = (grid[cl.c][cl.r].rot + 1) % 4;
      moves++; S.click();
      if (connected()) { done = true; S.taDa(); api.finish({ moves }); }
      else api.progress(Math.min(0.9, 0.1 + moves * 0.03));
    }
    return {
      update(dt) { t += dt; if (done) endT += dt; },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#C9ECF7'; ctx.fillRect(0, 0, W, H);
        // rio com jacaré
        ctx.fillStyle = P.sky; ctx.fillRect(0, gy - 24, W, ROWS * cell + 48);
        ctx.fillStyle = '#8fd4ef';
        for (let i = 0; i < 20; i++) {
          const wx = ((t * (40 + heat * 60) + i * 170) % (W + 100)) - 50;
          ctx.beginPath(); ctx.ellipse(wx, gy + ((i * 53) % (ROWS * cell)), 34, 9, 0, 0, 7); ctx.fill();
        }
        // jacaré faminto
        const gx2 = W / 2, gy2 = gy + ROWS * cell + 66;
        ctx.fillStyle = P.leaf;
        U.roundRect(ctx, gx2 - 120, gy2 - 26, 240, 52, 22); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
        U.face(ctx, gx2 - 70, gy2, 44, done ? 'dizzy' : 'angry');
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(gx2 + 20 + i * 16, gy2 - 20); ctx.lineTo(gx2 + 28 + i * 16, gy2 - 34); ctx.lineTo(gx2 + 36 + i * 16, gy2 - 20);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = P.ink; ctx.font = '800 15px ' + U.ROUND_FONT; ctx.textAlign = 'center';
        ctx.fillText(done ? 'o jacaré ficou a ver navios! 😴' : 'o jacaré tá com fome! 😱', gx2, gy2 + 44);
        const ok = done || connected();
        U.sticker(ctx, 12, 10, 250, 44, 12, '#FFFDF6');
        ctx.fillStyle = P.ink; ctx.font = '900 21px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('🔧 ' + moves + ' giros', 26, 40);
        for (let c = 0; c < COLS; c++) for (let rr = 0; rr < ROWS; rr++) {
          const X = gx + c * cell, Y = gy + rr * cell;
          const cx = X + cell / 2, cy = Y + cell / 2;
          const wig = heat > 0.4 ? Math.sin(t * 5 + grid[c][rr].wig) * 2 : 0;
          const isStart = (c === 0 && rr === startR);
          ctx.fillStyle = 'rgba(58,43,31,0.15)';
          U.roundRect(ctx, X + 7, Y + 10, cell - 12, cell - 12, 14); ctx.fill();
          ctx.fillStyle = isStart ? '#8fd18f' : '#E8B06B';
          U.roundRect(ctx, X + 5 + wig, Y + 5, cell - 12, cell - 12, 14); ctx.fill();
          ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
          // veios da madeira
          ctx.strokeStyle = '#b57e3e'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(X + 14 + wig, Y + 24); ctx.lineTo(X + cell - 16 + wig, Y + 24); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(X + 14 + wig, Y + cell - 24); ctx.lineTo(X + cell - 16 + wig, Y + cell - 24); ctx.stroke();
          // canos
          const cc = rotated(grid[c][rr].base, grid[c][rr].rot);
          ctx.strokeStyle = ok ? P.leaf : P.grape; ctx.lineWidth = 11; ctx.lineCap = 'round';
          ctx.beginPath();
          if (cc.has('U')) { ctx.moveTo(cx + wig, cy); ctx.lineTo(cx + wig, Y + 10); }
          if (cc.has('D')) { ctx.moveTo(cx + wig, cy); ctx.lineTo(cx + wig, Y + cell - 10); }
          if (cc.has('L')) { ctx.moveTo(cx + wig, cy); ctx.lineTo(X + 10 + wig, cy); }
          if (cc.has('R')) { ctx.moveTo(cx + wig, cy); ctx.lineTo(X + cell - 10 + wig, cy); }
          ctx.stroke();
          ctx.fillStyle = P.butter;
          ctx.beginPath(); ctx.arc(cx + wig, cy, 11, 0, 7); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
          if (isStart) {
            ctx.fillStyle = P.ink; ctx.font = '900 14px ' + U.ROUND_FONT; ctx.textAlign = 'center';
            ctx.fillText('ENTRADA', cx + wig, Y + cell - 16);
          }
        }
        ctx.fillStyle = P.tomato;
        U.roundRect(ctx, gx + COLS * cell + 4, gy + startR * cell + 18, 86, 64, 12); ctx.fill();
        ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '900 15px ' + U.ROUND_FONT; ctx.textAlign = 'center';
        ctx.fillText('SAÍDA', gx + COLS * cell + 47, gy + startR * cell + 46);
        ctx.fillText('🏁', gx + COLS * cell + 47, gy + startR * cell + 66);
        if (done) U.powStar(ctx, W / 2, 90, 80 + Math.sin(endT * 8) * 6, P.butter, 'PASSOU!');
      },
      onPointerDown(x, y) { rotateAt(x, y); }
    };
  }
};
