// Calor da partida (intensidade oficial) + palavras do DIGITA LOGO! + piadas.
// Tudo aqui é determinístico a partir do estado oficial (round + seed):
// o HOST calcula e envia na mensagem 'round'; clientes usam o mesmo valor.
window.SR = window.SR || {};
(function () {
  // t: 0 (tranquilo) -> 1 (CAOS TOTAL). speed: 1.0x -> 2.0x.
  function heatForRound(roundIndex, total) {
    const t = total <= 1 ? 0 : Math.min(1, Math.max(0, roundIndex / (total - 1)));
    const speed = 1 + t; // 1.0x ... 2.0x
    const label = t < 0.25 ? 'TRANQUILO' : t < 0.5 ? 'ESQUENTANDO' : t < 0.75 ? 'FERVENDO' : 'CAOS TOTAL';
    const face = t < 0.25 ? '🙂' : t < 0.5 ? '😬' : t < 0.75 ? '🥵' : '🤯';
    return { t, speed, label, face };
  }
  function scoreboardMs(roundIndex, total) {
    const C = window.SR.Config;
    const k = total <= 1 ? 0 : roundIndex / (total - 1);
    return Math.round(C.SCOREBOARD_MS + (C.SCOREBOARD_MIN_MS - C.SCOREBOARD_MS) * k);
  }

  // Palavras ASCII (sem acento = sem briga com teclado). Escolha determinística.
  const WORDS = {
    easy: ['GATO', 'PATO', 'BOLO', 'SAPO', 'BOLA', 'PIPA', 'CASA', 'DADO', 'FACA', 'LATA', 'RATO', 'VACA', 'PATOCA', 'BANANA', 'PIPOCA', 'CAVALO'],
    mid: ['ABACAXI', 'BICICLETA', 'CACHORRO', 'ELEFANTE', 'GIRAFA', 'MELANCIA', 'PINGUIM', 'TARTARUGA', 'VENTILADOR', 'XICARA', 'JABUTICABA', 'PAMONHA'],
    hard: ['LIQUIDIFICADOR', 'PARABENS', 'PNEUMONIA', 'OTORRINOLARINGOLOGISTA', 'ELETROENCEFALOGRAMA', 'INCONSTITUCIONAL', 'DESENVOLVIMENTO', 'TRANSTORNADO', 'HIPOPOTAMO', 'CROCODILO']
  };
  function wordTier(heatT) { return heatT < 0.35 ? 'easy' : heatT < 0.7 ? 'mid' : 'hard'; }
  function pickWord(seed, heatT) {
    const list = WORDS[wordTier(heatT)];
    const rng = window.SR.Utils.mulberry32((seed ^ 0x9E3779B9) >>> 0);
    return list[Math.floor(rng() * list.length)];
  }
  function normWord(s) {
    return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');
  }

  // Piadas: vitória por round, derrota, pódio final.
  const WIN_QUIPS = ['DEDOS DE FOGO!', 'RAPIDÍSSIMO!', 'POW! DIRETO AO PONTO!', 'UM FOGUETE!', 'NEM VI PASSAR!', 'MONSTRO DA VELOCIDADE!'];
  const LOSE_QUIPS = ['foi derrotado por um pato.', 'tirou uma soneca no meio do jogo.', 'travou igual internet discada.', 'escorregou na casca de banana.', 'parou pra tomar um suco.'];
  const FINAL_TITLES = ['LENDÁRIO!', 'REI DA VELOCIDADE!', 'DEDOS MAIS RÁPIDOS DO PLANETA!', 'CAMPEÃO DA BAGUNÇA!', 'ÍDOLO DO CAOS!'];
  const FINAL_TAUNTS = ['QUASE! SÓ FALTARAM 3 MIL ANOS.', 'VOCÊ FOI DERROTADO POR UM PATO.', 'O PÓDIO SENTIU SUA FALTA (MENTIRA).', 'NA PRÓXIMA VAI! (TALVEZ).', 'ATÉ MINHA VÓ FOI MAIS RÁPIDA.'];
  function quip(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  window.SR.Heat = { heatForRound, scoreboardMs, WORDS, wordTier, pickWord, normWord, WIN_QUIPS, LOSE_QUIPS, FINAL_TITLES, FINAL_TAUNTS, quip };
})();
