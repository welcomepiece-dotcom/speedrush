// Rede P2P real via WebRTC DataChannels + sinalização PeerJS Cloud (gratuita).
// Topologia estrela: host <-> cada cliente. Host é autoridade da partida.
// NENHUM bot é fingido como jogador online: a lista do lobby só contém
// conexões DataChannel reais (open) + o próprio host.
window.SR = window.SR || {};
(function () {
  const C = () => window.SR.Config;

  function ensurePeerLib(cb) {
    if (window.Peer) return cb(null);
    // Fallback CDN caso unpkg falhe
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js';
    s.onload = () => cb(window.Peer ? null : new Error('PeerJS indisponível'));
    s.onerror = () => cb(new Error('Não foi possível carregar a lib WebRTC (PeerJS). Verifique a internet.'));
    document.head.appendChild(s);
  }

  class Net {
    constructor() {
      this.peer = null;
      this.isHost = false;
      this.code = null;
      this.myId = null;         // peerId local
      this.hostId = null;       // peerId do host
      this.profile = { name: 'Jogador', color: '#ffde59' };
      this.players = new Map(); // peerId -> {peerId,name,color,ready,score,connected}
      this.conns = new Map();   // peerId -> DataConnection
      this.hostConn = null;     // conexão do cliente -> host
      this.onEvent = null;      // (evt) => void — lobby.js / game.js assinam
      this._msgSeen = new Set();
      this._ready = false;
    }
    emit(type, data) { if (this.onEvent) this.onEvent(Object.assign({ type }, data || {})); }
    setStatus(st, label) { this.emit('status', { st, label }); }

    peerIdFor(code) { return C().PREFIX + code.toUpperCase(); }

    // ---------- HOST: criar sala ----------
    createRoom(profile, cb) {
      this.profile = profile;
      ensurePeerLib((err) => {
        if (err) return cb(err);
        const code = window.SR.Utils.makeCode(C().CODE_LEN);
        let peer;
        try { peer = new window.Peer(this.peerIdFor(code), C().PEER_OPTIONS()); }
        catch (e) { return cb(e); }
        this.peer = peer; this.isHost = true; this.code = code;
        this._wirePeer(peer, cb, code);
      });
    }

    // ---------- CLIENTE: entrar ----------
    joinRoom(code, profile, cb) {
      code = (code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(code)) return cb(new Error('Código inválido. Use 4 letras/números.'));
      this.profile = profile;
      ensurePeerLib((err) => {
        if (err) return cb(err);
        let peer;
        try { peer = new window.Peer(C().PEER_OPTIONS()); } // id aleatório
        catch (e) { return cb(e); }
        this.peer = peer; this.isHost = false; this.code = code;
        this.hostId = this.peerIdFor(code);
        this._wirePeer(peer, (e) => {
          if (e) return cb(e);
          this._connectToHost(cb);
        }, null);
      });
    }

    _wirePeer(peer, cb, code) {
      const done = { v: false };
      const ok = (e) => { if (!done.v) { done.v = true; cb(e); } };
      peer.on('open', (id) => {
        this.myId = id;
        if (this.isHost) {
          this.players.set(id, { peerId: id, name: this.profile.name, color: this.profile.color, ready: true, score: 0, connected: true, host: true });
          this._ready = true;
          this.setStatus('online', 'online · host');
          this._broadcastLobby();
          ok(null);
        } else {
          ok(null);
        }
      });
      peer.on('connection', (conn) => {
        if (!this.isHost) return; // clientes não aceitam P2P entre si (estrela)
        this._wireHostConn(conn);
      });
      peer.on('disconnected', () => {
        // Reconexão à sinalização (não aos peers). Tenta religar.
        try { peer.reconnect(); } catch (e) {}
        this.setStatus('busy', 'reconhecendo sinalização…');
      });
      peer.on('close', () => { this.setStatus('offline', 'desconectado'); this.emit('gone', {}); });
      peer.on('error', (err) => {
        const t = err && err.type ? err.type : '';
        if (t === 'unavailable-id' || t === 'taken') return ok(new Error('Código em uso. Tente criar de novo.'));
        if (t === 'peer-unavailable') return ok(new Error('Sala não encontrada. Confira o código e tente de novo.'));
        if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') {
          if (!this._ready && !done.v) return ok(new Error('Falha de rede/sinalização. Verifique a internet e tente de novo.'));
          this.emit('net-error', { message: 'Instabilidade de rede: ' + t });
          return;
        }
        if (!done.v) return ok(new Error('Erro WebRTC: ' + (err.message || t)));
        this.emit('net-error', { message: (err && err.message) || t });
      });
    }

    // ---------- lado HOST: nova conexão entrante ----------
    _wireHostConn(conn) {
      conn.on('open', () => {
        // Aguarda 'hello' do cliente (30s timeout fora; simples)
        this.emit('log', { message: 'Nova conexão: ' + conn.peer });
      });
      conn.on('data', (msg) => this._onHostData(conn, msg));
      conn.on('close', () => this._onPeerGone(conn.peer));
      conn.on('error', () => this._onPeerGone(conn.peer));
      // guarda temporariamente; registra definitivo no hello
      this.conns.set(conn.peer, conn);
    }

    _onPeerGone(peerId) {
      this.conns.delete(peerId);
      const p = this.players.get(peerId);
      if (p) { p.connected = false; }
      // Remove desconectados após lobby? Mantém p/ placar, marca offline.
      this._broadcastLobby();
      this.emit('toast', { message: (p ? p.name : 'Jogador') + ' saiu 📤' });
    }

    _onHostData(conn, msg) {
      if (!msg || typeof msg !== 'object' || !msg.t) return;
      if (msg._id && this._msgSeen.has(msg._id)) return; // dedup
      if (msg._id) { this._msgSeen.add(msg._id); if (this._msgSeen.size > 500) this._msgSeen.clear(); }
      const pid = conn.peer;
      switch (msg.t) {
        case 'hello': {
          const name = String(msg.name || 'Jogador').slice(0, 12);
          const color = String(msg.color || '#ffde59');
          if (this.players.size >= C().MAX_PLAYERS && !this.players.has(pid)) {
            conn.send({ t: 'bye', reason: 'Sala cheia (máx 8).' });
            setTimeout(() => { try { conn.close(); } catch (e) {} }, 500);
            return;
          }
          this.players.set(pid, { peerId: pid, name, color, ready: false, score: 0, connected: true });
          conn.send({ t: 'welcome', yourId: pid, hostId: this.myId, code: this.code });
          this._broadcastLobby();
          this.emit('toast', { message: name + ' entrou! 🎉' });
          window.SR.Audio.good();
          break;
        }
        case 'ready':
          { const p = this.players.get(pid); if (p) { p.ready = !!msg.ready; this._broadcastLobby(); } break; }
        case 'progress':
          // retransmite progresso aos demais (throttle natural pelo cliente)
          this._broadcast({ t: 'opp-progress', from: pid, round: msg.round, p: msg.p }, pid);
          this.emit('opp-progress', { from: pid, round: msg.round, p: msg.p });
          break;
        case 'finish':
          this.emit('client-finish', { from: pid, round: msg.round, gameId: msg.gameId, timeMs: msg.timeMs, detail: msg.detail });
          // avisa aos OUTROS que alguém terminou (não ecoa p/ quem terminou)
          { const p = this.players.get(pid); if (p) this._broadcast({ t: 'opp-finished', from: pid, name: p.name, round: msg.round }, pid); }
          break;
        case 'ping': conn.send({ t: 'pong', ts: msg.ts }); break;
      }
    }

    // ---------- lado CLIENTE ----------
    _connectToHost(cb) {
      const conn = this.peer.connect(this.hostId, { reliable: true });
      if (!conn) return cb(new Error('Não foi possível abrir conexão com o host.'));
      this.hostConn = conn;
      const timer = setTimeout(() => cb(new Error('Tempo esgotado ao entrar na sala. O host pode estar inacessível (NAT/firewall). Tente outra rede ou configure TURN.')), 15000);
      conn.on('open', () => {
        conn.send({ t: 'hello', name: this.profile.name, color: this.profile.color, _id: 'h' + Date.now() });
      });
      conn.on('data', (msg) => {
        if (!msg || !msg.t) return;
        switch (msg.t) {
          case 'welcome':
            clearTimeout(timer);
            this.myId = msg.yourId; this.hostId = msg.hostId;
            this._ready = true;
            this.setStatus('online', 'online · sala ' + this.code);
            cb(null);
            break;
          case 'bye': clearTimeout(timer); cb(new Error(msg.reason || 'Conexão recusada.')); break;
          case 'lobby': this._onLobbyMsg(msg); break;
          case 'match-start': this.emit('match-start', msg); break;
          case 'round': this.emit('round', msg); break;
          case 'opp-progress': this.emit('opp-progress', msg); break;
          case 'opp-finished': {
            this.emit('opp-finished', msg);
            this.emit('toast', { message: msg.name + ' terminou! ⚡' });
            break;
          }
          case 'round-end': this.emit('round-end', msg); break;
          case 'match-end': this.emit('match-end', msg); break;
          case 'toast': this.emit('toast', msg); break;
          case 'host-left': this.emit('host-left', msg); break;
          case 'pong': break;
        }
      });
      conn.on('close', () => {
        this.setStatus('offline', 'host saiu / desconectado');
        this.emit('host-left', { reason: 'O host saiu ou a conexão caiu.' });
      });
      conn.on('error', () => {
        clearTimeout(timer);
        cb(new Error('Falha ao conectar no host. Verifique o código, a internet e tente de novo.'));
      });
    }

    _onLobbyMsg(msg) {
      this.players.clear();
      (msg.players || []).forEach(p => this.players.set(p.peerId, p));
      this.emit('lobby', { players: msg.players, matchState: msg.matchState });
    }

    // ---------- HOST helpers ----------
    _lobbySnapshot() {
      return Array.from(this.players.values()).map(p => ({ peerId: p.peerId, name: p.name, color: p.color, ready: !!p.ready, score: p.score || 0, connected: p.connected !== false, host: p.peerId === this.myId }));
    }
    _broadcast(obj, exceptPeerId) {
      const s = JSON.stringify(obj);
      this.conns.forEach((c, pid) => {
        if (pid === exceptPeerId) return;
        try { if (c.open) c.send(JSON.parse(s)); } catch (e) {}
      });
    }
    _broadcastLobby() {
      if (!this.isHost) return;
      const snap = this._lobbySnapshot();
      this._broadcast({ t: 'lobby', players: snap, matchState: this.matchState || 'lobby' });
      this.emit('lobby', { players: snap, matchState: this.matchState || 'lobby' });
    }
    sendToHost(obj) {
      if (this.isHost) return;
      try { if (this.hostConn && this.hostConn.open) this.hostConn.send(obj); } catch (e) {}
    }
    setReady(ready) {
      if (this.isHost) {
        const p = this.players.get(this.myId); if (p) p.ready = ready;
        this._broadcastLobby();
      } else this.sendToHost({ t: 'ready', ready });
    }
    // Chamadas do host durante a partida:
    hostBroadcast(obj) { this._broadcast(obj); if (obj.t === 'lobby') return; }
    hostToast(message) { this._broadcast({ t: 'toast', message }); this.emit('toast', { message }); }

    lobbyList() { return Array.from(this.players.values()); }
    myPlayer() { return this.players.get(this.myId); }

    leave() {
      try {
        if (this.isHost) {
          this._broadcast({ t: 'host-left', reason: 'O host encerrou a sala.' });
          this.conns.forEach(c => { try { c.close(); } catch (e) {} });
        } else {
          try { if (this.hostConn) this.hostConn.close(); } catch (e) {}
        }
        if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
      } catch (e) {}
      this.peer = null; this.conns.clear(); this.players.clear();
      this._ready = false; this.isHost = false;
      this.setStatus('offline', 'offline');
    }
  }

  window.SR.Net = Net;
})();
