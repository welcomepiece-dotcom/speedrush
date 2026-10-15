// DIGITA LOGO! — todos recebem a MESMA palavra oficial do host. Digite voando!
window.SR = window.SR || {};
window.SR.Mini_typeword = {
  id: 'typeword', name: 'DIGITA LOGO!', duration: 15000,
  instruction: 'Digite a palavra IGUALZINHA! Use o teclado ou toque na caixa.',
  create(api) {
    const U = window.SR.Utils, S = window.SR.Audio, P = U.PAL;
    const W = 800, H = 500;
    const heat = api.heat || 0;
    // Palavra OFICIAL: veio do host na mensagem 'round' (igual p/ todos).
    const word = (api.word && /^[A-Z]+$/.test(api.word))
      ? api.word
      : window.SR.Heat.pickWord(api.seed || 1, heat);
    let typed = '', errors = 0, t = 0, done = false, endT = 0;
    let shake = 0, pop = 0;
    const boom = [];
    function correctCount() {
      let n = 0;
      while (n < typed.length && n < word.length && typed[n] === word[n]) n++;
      return n;
    }
    function receive(raw) {
      if (done) return;
      const clean = window.SR.Heat.normWord(raw).slice(0, word.length);
      const before = correctCount();
      typed = clean;
      const now = correctCount();
      if (now < before) {
        // apagou letra certa? conta como tropeço leve, sem punição dura
      }
      if (clean.length > 0 && clean !== word.slice(0, clean.length)) {
        // tem letra errada no fim
        if (shake <= 0) { errors++; shake = 0.45; S.splat(); }
      } else if (now > before) {
        S.pop();
        pop = 0.25;
      }
      api.progress(now / word.length);
      if (clean === word) {
        done = true;
        for (let i = 0; i < word.length; i++) {
          boom.push({ ch: word[i], x: 150 + i * (500 / word.length), y: 210, vx: (Math.random() - 0.5) * 500, vy: -200 - Math.random() * 300, rot: 0, vr: (Math.random() - 0.5) * 10 });
        }
        S.taDa();
        api.finish({ word, errors });
      }
    }
    return {
      wantsTypeBox: true,
      update(dt) {
        t += dt; shake = Math.max(0, shake - dt); pop = Math.max(0, pop - dt);
        U.stepParticles([], dt);
        if (done) {
          endT += dt;
          boom.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 900 * dt; b.rot += b.vr * dt; });
          return;
        }
      },
      draw(ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#FFE9B8'; ctx.fillRect(0, 0, W, H);
        // raios de sol girando devagar
        ctx.save(); ctx.translate(W / 2, 190); ctx.rotate(t * 0.15);
        ctx.fillStyle = '#ffd97a';
        for (let i = 0; i < 12; i++) {
          ctx.rotate(Math.PI / 6);
          ctx.fillRect(120, -14, 260, 28);
        }
        ctx.restore();
        // cartaz da palavra
        const shx = shake > 0 ? Math.sin(t * 60) * 10 * shake : 0;
        ctx.save(); ctx.translate(W / 2 + shx, 0);
        const scale = U.popScale(Math.min(t, 0.45));
        ctx.translate(0, 200); ctx.scale(scale, scale); ctx.translate(0, -200);
        U.sticker(ctx, W / 2 - 320, 110, 640, 180, 24, '#FFFDF6');
        // letras
        const n = word.length;
        const fs = n <= 6 ? 64 : n <= 10 ? 50 : n <= 14 ? 40 : 32;
        ctx.font = '900 ' + fs + 'px ' + U.ROUND_FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const okN = correctCount();
        const startX = W / 2 - ((n - 1) * fs * 0.72) / 2;
        for (let i = 0; i < n; i++) {
          const x = startX + i * fs * 0.72, y = 200;
          const bounce = (i === okN - 1 && pop > 0) ? -pop * 40 : Math.sin(t * 4 + i * 0.7) * 3;
          const ch = word[i];
          const isOk = i < typed.length && typed[i] === ch;
          const isBad = i < typed.length && typed[i] !== ch;
          ctx.lineWidth = 6; ctx.strokeStyle = P.ink;
          ctx.strokeText(ch, x, y + bounce);
          ctx.fillStyle = isOk ? P.leaf : isBad ? P.tomato : '#D9C9A8';
          ctx.fillText(ch, x, y + bounce);
        }
        ctx.restore();
        ctx.textBaseline = 'alphabetic';
        // placar + erros
        U.sticker(ctx, 12, 10, 300, 44, 12, '#FFFDF6');
        ctx.fillStyle = P.ink; ctx.font = '900 21px ' + U.ROUND_FONT; ctx.textAlign = 'left';
        ctx.fillText('⌨️ ' + okN + '/' + n + '   💩 ' + errors, 26, 40);
        ctx.fillStyle = P.ink; ctx.font = '800 17px ' + U.ROUND_FONT; ctx.textAlign = 'center';
        ctx.fillText('digite igualzinho! acento NÃO precisa 👀', W / 2, 330);
        ctx.fillText('📱 no celular, toque na caixa abaixo p/ abrir o teclado', W / 2, 356);
        if (shake > 0) {
          ctx.font = '900 40px ' + U.ROUND_FONT;
          ctx.lineWidth = 7; ctx.strokeStyle = P.ink;
          ctx.strokeText('IH, ERROU! kkk', W / 2, 420);
          ctx.fillStyle = P.tomato; ctx.fillText('IH, ERROU! kkk', W / 2, 420);
        }
        if (done) {
          // letrinhas explodindo
          ctx.font = '900 44px ' + U.ROUND_FONT;
          boom.forEach(b => {
            ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
            ctx.lineWidth = 6; ctx.strokeStyle = P.ink;
            ctx.strokeText(b.ch, 0, 0);
            ctx.fillStyle = P.grape; ctx.fillText(b.ch, 0, 0);
            ctx.restore();
          });
          U.powStar(ctx, W / 2, 400, 95 + Math.sin(endT * 8) * 7, P.butter, 'DEDOS DE FOGO!');
        }
      },
      onText(v) { receive(String(v == null ? '' : v)); }
    };
  }
};
