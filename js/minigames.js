// Registro central de minigames — adicionar um novo = criar arquivo + 1 linha aqui.
window.SR = window.SR || {};
(function () {
  const ALL = [
    window.SR.Mini_tower,
    window.SR.Mini_vacuum,
    window.SR.Mini_typeword,
    window.SR.Mini_bridge,
    window.SR.Mini_domino,
    window.SR.Mini_laser,
    window.SR.Mini_conveyor,
    window.SR.Mini_code,
    window.SR.Mini_doors,
    window.SR.Mini_broken
  ].filter(Boolean);
  const byId = {};
  ALL.forEach(m => { byId[m.id] = m; });
  // Ordem da partida: embaralha com seed do host p/ todos jogarem a mesma sequência.
  function shuffledOrder(seed, total) {
    const rng = window.SR.Utils.mulberry32(seed);
    let pool = window.SR.Utils.shuffle(ALL.map(m => m.id), rng);
    const out = [];
    while (out.length < total) { out.push(...pool); pool = window.SR.Utils.shuffle(pool, rng); }
    return out.slice(0, total);
  }
  window.SR.Minigames = { ALL, byId, shuffledOrder };
})();
