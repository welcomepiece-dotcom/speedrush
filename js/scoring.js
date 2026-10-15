// Pontuação: até 100 pts por minigame. Empates resolvidos de forma determinística.
window.SR = window.SR || {};
(function () {
  // finishes: [{peerId, timeMs|null (null = DNF), ok:bool}]
  // Retorna [{peerId, timeMs, place, points}]
  function scoreRound(finishes, totalPlayers) {
    const done = finishes.filter(f => f.ok && f.timeMs != null)
      .sort((a, b) => (a.timeMs - b.timeMs) || (a.peerId < b.peerId ? -1 : 1));
    const dnf = finishes.filter(f => !(f.ok && f.timeMs != null));
    const TIE_MS = 120;
    // Agrupa empates (diferença <= 120ms do primeiro do grupo)
    const groups = [];
    for (const f of done) {
      const last = groups[groups.length - 1];
      if (last && (f.timeMs - last[0].timeMs) <= TIE_MS) last.push(f);
      else groups.push([f]);
    }
    const out = [];
    let rank = 0; // índice 0-based do primeiro do grupo
    const base = [100, 80, 60];
    for (const g of groups) {
      const pts = rank < 3 ? base[rank] : 30;
      g.forEach((f, i) => out.push({ peerId: f.peerId, timeMs: f.timeMs, place: rank + 1, points: pts }));
      rank += g.length;
    }
    dnf.forEach(f => out.push({ peerId: f.peerId, timeMs: null, place: rank + 1, points: 0 }));
    // Ordena por pontos desc p/ exibição
    out.sort((a, b) => (b.points - a.points) || ((a.timeMs ?? 1e9) - (b.timeMs ?? 1e9)));
    return out;
  }
  window.SR.Scoring = { scoreRound };
})();
