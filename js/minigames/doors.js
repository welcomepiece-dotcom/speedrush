// Porta dos Desesperados — leia a pista e saia! No calor, as portas TROCAM de lugar!
window.SR = window.SR || {};
window.SR.Mini_doors = {
  id: 'doors', name: 'Porta dos Desesperados', duration: 12000,
  instruction: 'Leia a pista e escolha! Errar trava 2s. Cuidado com a troca!',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const rng = api.rng;
    const heat = api.heat || 0;
    const PUZZLES = [
      { clue: 'Quanto é 7 + 5?', doors: ['12', '11', '13'], correct: 0 },
      { clue: 'Qual número é PAR?', doors: ['7', '13', '28'], correct: 2 },
      { clue: 'Vermelho + Azul = ?', doors: ['Verde', 'Roxo', 'Laranja'], correct: 1 },
      { clue: 'Qual forma tem 3 lados?', doors: ['■ Quadrado', '● Círculo', '▲ Triângulo'], correct: 2 },
      { clue: 'Qual é o MAIOR?', doors: ['49', '94', '39'], correct: 1 },
      { clue: 'Qual bicho VOA?', doors: ['🐶 Cão', '🐦 Pássaro', '🐟 Peixe'], correct: 1 },
      { clue: 'Gelo é…?', doors: ['Quente', 'Frio', 'Morno'], correct: 1 },
      { clue: 'Oposto de DIA?', doors: ['Noite', 'Tarde', 'Manhã'], correct: 0 }
    ];
    const pz = PUZZLES[Math.floor(rng() * PUZZLES.length)];
    const order = U.shuffle([0, 1, 2], rng);
    const doors = order.map(o => ({ label: pz.doors[o], ok: o === pz.correct }));
    const SWAP_AT = heat > 0.55 ? 2.5 : 1e9; // mesmo instante p/ todos (tempo local do round)
    let swapped = false, swapWarn = 0;
    let tries = 0, lock = 0, done = false, picked = -1, shake = 0, t = 0, endT = 0;
    const dcols = [P.tomato, P.sky, P.grape];
    function clickAt(x, y) {
      if (done || lock > 0) return;
      for (let i = 0; i < 3; i++) {
        const dx = 160 + i * 240;
        if (x >= dx - 95 && x <= dx + 95 && y >= 160 && y <= 430) {
          if (doors[i].ok) { done = true; picked = i; S.taDa(); api.progress(1); api.finish({ tries }); }
          else { tries++; lock = 1.6; shake = 0.5; S.splat(); }
          return;
        }
      }
    }
    return {
      update(dt) {
        t += dt;
        lock = Math.max(0, lock - dt); shake = Math.max(0, shake - dt);
        swapWarn = Math.max(0, swapWarn - dt);
        if (!swapped && t >= SWAP_AT) {
          swapped = true; swapWarn = 1.4;
          // troca as duas primeiras de lugar (determinístico e igual p/ todos)
          const tmp = doors[0]; doors[0] = doors[2]; doors[2] = tmp;
          S.boing();
        }
        if (done) endT += dt;
      },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#D9ECF5'; ctx.fillRect(0, 0, W, H);
        // papel de parede listrado
        ctx.fillStyle = '#cde4f0';
        for (let i = 0; i < 10; i++) ctx.fillRect(i * 90, 0, 40, H);
        // chão
        ctx.fillStyle = '#C8A06B'; ctx.fillRect(0, H - 60, W, 60);
        // cartaz da pista
        U.sticker(ctx, 90, 16, 620, 100, 16, P.butter);
        ctx.fillStyle = P.ink; ctx.font = '900 27px ' + U.ROUND_FONT; ctx.textAlign = 'center';
        ctx.fillText('🧩 ' + pz.clue, W / 2, 58);
        ctx.font = '800 17px ' + U.ROUND_FONT;
        ctx.fillText(tries === 0 ? 'Escolha rápido! Teclas 1/2/3 ou toque' : '💩 Erros: ' + tries + (lock > 0 ? ' — calma, respira… ' + lock.toFixed(1) + 's' : ''), W / 2, 90);
        for (let i = 0; i < 3; i++) {
          const dx = 160 + i * 240;
          const isPicked = done && picked === i;
          const sh = (shake > 0 && !done) ? Math.sin(shake * 40) * 8 : 0;
          const pop = (!done && t < 0.45) ? U.popScale(t) : 1;
          ctx.save();
          ctx.translate(dx + sh, 300); ctx.scale(pop, pop); ctx.translate(-dx, -300);
          ctx.fillStyle = 'rgba(58,43,31,0.18)';
          U.roundRect(ctx, dx - 90, 176, 180, 250, 18); ctx.fill();
          ctx.fillStyle = isPicked ? P.leaf : dcols[i];
          U.roundRect(ctx, dx - 95, 170, 180, 250, 18); ctx.fill();
          ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
          // janelinha com carinha espiando
          ctx.fillStyle = '#FFFDF6';
          U.roundRect(ctx, dx - 55, 210, 110, 80, 12); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
          U.face(ctx, dx, 250, 56, isPicked ? 'happy' : (lock > 0 ? 'angry' : 'wow'));
          // maçaneta
          ctx.fillStyle = P.butter;
          ctx.beginPath(); ctx.arc(dx + 62, 330, 13, 0, 7); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
          // etiqueta da resposta
          U.sticker(ctx, dx - 78, 356, 156, 44, 10, '#FFFDF6');
          ctx.fillStyle = P.ink; ctx.font = '900 20px ' + U.ROUND_FONT;
          const lb = doors[i].label;
          ctx.fillText(lb.length > 11 ? lb.slice(0, 11) : lb, dx, 386);
          ctx.fillStyle = '#fff'; ctx.font = '900 24px ' + U.ROUND_FONT;
          ctx.fillText(String(i + 1), dx - 68, 200);
          ctx.restore();
        }
        if (swapWarn > 0 && !done) {
          ctx.save(); ctx.translate(W / 2, 140); ctx.rotate(-0.04);
          ctx.font = '900 38px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.lineWidth = 8; ctx.strokeStyle = P.ink;
          ctx.strokeText('IH, TROCOU! 😱', 0, 0);
          ctx.fillStyle = P.gum; ctx.fillText('IH, TROCOU! 😱', 0, 0);
          ctx.restore();
        }
        if (!swapped && SWAP_AT < 1e8 && !done) {
          ctx.fillStyle = P.ink; ctx.font = '800 15px ' + U.ROUND_FONT; ctx.textAlign = 'center';
          ctx.fillText('⚠️ as portas vão trocar de lugar já já…', W / 2, 462);
        }
        if (done) U.powStar(ctx, W / 2, 130, 80 + Math.sin(endT * 8) * 6, P.butter, 'SAIU!');
      },
      onKey(code) {
        if (code === 'Digit1' || code === 'Numpad1') clickAt(160, 300);
        if (code === 'Digit2' || code === 'Numpad2') clickAt(400, 300);
        if (code === 'Digit3' || code === 'Numpad3') clickAt(640, 300);
      },
      onPointerDown(x, y) { clickAt(x, y); }
    };
  }
};
