// SpeedRush — constantes globais e configuração de rede.
// Sinalização: PeerJS Cloud gratuito (0.peerjs.com). Sem servidor próprio.
window.SR = window.SR || {};
window.SR.Config = {
  PREFIX: 'speedrush-v1-',
  CODE_LEN: 4,
  CODE_ALPHABET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', // sem I,O,0,1 p/ evitar confusão
  TOTAL_ROUNDS: 12,
  MAX_PLAYERS: 8,
  COUNTDOWN_MS: 3000,
  SCOREBOARD_MS: 4500,   // placar inicial; o host encurta no fim da partida (caos!)
  SCOREBOARD_MIN_MS: 2400,
  PROGRESS_THROTTLE_MS: 250,
  // WebRTC: STUN público do Google. TURN opcional via localStorage.
  // Ex: localStorage.setItem('speedrush_turn', JSON.stringify([{urls:'turn:...',username:'u',credential:'p'}]))
  PEER_OPTIONS: function () {
    const ice = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ];
    try {
      const extra = JSON.parse(localStorage.getItem('speedrush_turn') || 'null');
      if (Array.isArray(extra) && extra.length) extra.forEach(s => ice.push(s));
    } catch (e) { /* sem TURN extra */ }
    return {
      host: '0.peerjs.com', port: 443, path: '/', secure: true, debug: 0,
      config: { iceServers: ice }
    };
  }
};
