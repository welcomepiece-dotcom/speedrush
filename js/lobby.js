// Lobby + orquestração de telas + fluxo online (host/cliente) e local.
window.SR = window.SR || {};
(function () {
  const $ = (id) => document.getElementById(id);
  const U = () => window.SR.Utils;

  const Screens = {
    show(name) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      $('screen-' + name).classList.add('active');
    }
  };

  function toast(msg) {
    const stack = $('toast-stack');
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = msg;
    stack.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 2200);
    while (stack.children.length > 3) stack.firstChild.remove();
  }

  function banner(text, ms) {
    const b = $('banner');
    b.textContent = text; b.classList.remove('hidden');
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.add('hidden'), ms || 1600);
  }

  function countdown(n, cb) {
    const el = $('countdown');
    el.classList.remove('hidden');
    let i = n;
    const step = () => {
      if (i > 0) { el.textContent = i; window.SR.Audio.count(i); i--; setTimeout(step, 700); }
      else { el.textContent = 'VAI! 🏁'; window.SR.Audio.count(0); setTimeout(() => { el.classList.add('hidden'); cb(); }, 500); }
    };
    step();
  }

  class App {
    constructor() {
      this.net = new window.SR.Net();
      this.match = null;
      this.input = window.SR.createInput($('game-canvas'));
      this.profile = { name: 'Jogador' + Math.floor(Math.random() * 100), color: '#ffde59' };
      this.order = []; this.seeds = [];
      this.net.onEvent = (e) => this.onNet(e);
      this._wireHome();
      this._wireLobbyButtons();
      this._wireAudio();
      this._paintColors();
      this.setConn('offline', '● offline');
    }
    setConn(st, label) {
      const el = $('conn-status');
      el.className = 'conn ' + st; el.textContent = label;
    }
    _paintColors() {
      const cols = ['#ffde59', '#ff5d8f', '#59d8ff', '#3ddc84', '#c58bff', '#ff9d2e', '#ffffff', '#ff7b00'];
      const box = $('color-picker'); box.innerHTML = '';
      cols.forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'color-dot' + (i === 0 ? ' sel' : '');
        d.style.background = c;
        d.onclick = () => {
          window.SR.Audio.unlock(); window.SR.Audio.click();
          box.querySelectorAll('.color-dot').forEach(x => x.classList.remove('sel'));
          d.classList.add('sel'); this.profile.color = c;
        };
        box.appendChild(d);
      });
      this.profile.color = cols[0];
      const saved = (localStorage.getItem('sr_name') || '').slice(0, 12);
      if (saved) { this.profile.name = saved; $('player-name').value = saved; }
    }
    _readProfile() {
      const n = ($('player-name').value || '').trim().slice(0, 12);
      this.profile.name = n || this.profile.name;
      localStorage.setItem('sr_name', this.profile.name);
      return { ...this.profile };
    }
    _wireHome() {
      $('btn-join-show').onclick = () => { $('join-box').classList.toggle('hidden'); };
      $('btn-create').onclick = () => {
        window.SR.Audio.unlock();
        const p = this._readProfile();
        $('home-error').textContent = '';
        $('btn-create').disabled = true;
        this.setConn('busy', '● criando sala…');
        this.net.createRoom(p, (err) => {
          $('btn-create').disabled = false;
          if (err) { this.setConn('offline', '● offline'); $('home-error').textContent = '❌ ' + err.message; return; }
          this.setConn('online', '● online · sala ' + this.net.code);
          this.enterLobby();
        });
      };
      $('btn-join').onclick = () => {
        window.SR.Audio.unlock();
        const p = this._readProfile();
        const code = ($('room-code').value || '').trim().toUpperCase();
        $('home-error').textContent = '';
        $('btn-join').disabled = true;
        this.setConn('busy', '● conectando…');
        this.net.joinRoom(code, p, (err) => {
          $('btn-join').disabled = false;
          if (err) {
            // NÃO finge que entrou: mostra erro real e permanece offline.
            this.setConn('offline', '● offline');
            $('home-error').textContent = '❌ ' + err.message;
            try { this.net.leave(); } catch (e) {}
            return;
          }
          this.setConn('online', '● online · sala ' + this.net.code);
          this.enterLobby();
        });
      };
      $('btn-local').onclick = () => {
        window.SR.Audio.unlock();
        const p = this._readProfile();
        this.startLocal(p);
      };
      $('room-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-join').click(); });
      // link de convite ?room=XXXX
      const q = new URLSearchParams(location.search);
      if (q.get('room')) { $('room-code').value = q.get('room').toUpperCase(); $('join-box').classList.remove('hidden'); }
    }
    _wireAudio() {
      const A = window.SR.Audio;
      const v = A.getVolumes();
      const vm = $('vol-music'), vs = $('vol-sfx'), mb = $('btn-mute');
      if (vm) vm.value = Math.round(v.music * 100);
      if (vs) vs.value = Math.round(v.sfx * 100);
      const paintMute = () => { if (mb) mb.textContent = A.getVolumes().muted ? '🔇 Mudo' : '🔊 Som on'; };
      paintMute();
      if (vm) vm.oninput = () => { A.unlock(); A.setMusicVolume(vm.value / 100); };
      if (vs) vs.oninput = () => { A.unlock(); A.setSfxVolume(vs.value / 100); A.click(); };
      if (mb) mb.onclick = () => { A.unlock(); A.setMuted(!A.getVolumes().muted); paintMute(); A.click(); };
    }
    _wireLobbyButtons() {
      $('btn-copy').onclick = async () => {
        try { await navigator.clipboard.writeText(this.net.code || ''); toast('Código copiado! 📋'); }
        catch (e) { toast('Código: ' + (this.net.code || '')); }
      };
      $('btn-copy-link').onclick = async () => {
        const url = location.origin + location.pathname + '?room=' + (this.net.code || '');
        try { await navigator.clipboard.writeText(url); toast('Link copiado! 🔗'); }
        catch (e) { toast(url); }
      };
      $('btn-ready').onclick = () => {
        const me = this.net.myPlayer();
        const r = !(me && me.ready);
        this.net.setReady(r);
        window.SR.Audio.click();
      };
      $('btn-start').onclick = () => this.hostStartMatch();
      $('btn-leave').onclick = () => {
        try { if (this.match) this.match.stop(); } catch (e) {}
        this.match = null;
        window.SR.Audio.stopMusic();
        this.net.leave();
        Screens.show('home');
        this.setConn('offline', '● offline');
      };
      $('btn-again').onclick = () => {
        if (this.net.peer) { // online: volta ao lobby p/ host reiniciar
          Screens.show('lobby');
        } else this.startLocal(this.profile);
      };
      $('btn-to-lobby').onclick = () => {
        if (this.net.peer) Screens.show('lobby');
        else { Screens.show('home'); }
      };
    }

    enterLobby() {
      Screens.show('lobby');
      this.renderLobby();
    }
    renderLobby(players) {
      players = players || this.net.lobbyList();
      $('lobby-code').textContent = this.net.code || '----';
      $('lobby-count').textContent = players.length;
      const isHost = this.net.isHost;
      $('lobby-role').textContent = isHost
        ? 'Você é o HOST ⭐ Compartilhe o código ' + (this.net.code || '') + ' e clique em Iniciar.'
        : 'Aguarde o host iniciar a partida…';
      $('btn-start').classList.toggle('hidden', !isHost);
      const ul = $('player-list'); ul.innerHTML = '';
      players.forEach(p => {
        const li = document.createElement('li');
        const dot = '<span class="dot" style="background:' + p.color + '"></span>';
        const tags = (p.peerId === this.net.myId ? ' <span class="pill">você</span>' : '')
          + (p.host ? ' <span class="pill host">HOST</span>' : '')
          + (p.ready ? ' <span class="pill ready">pronto ✔</span>' : ' <span class="pill">aguardando…</span>')
          + (p.connected === false ? ' <span class="pill">offline</span>' : '');
        li.innerHTML = dot + '<span>' + escapeHtml(p.name) + '</span>' + tags;
        ul.appendChild(li);
      });
      const me = players.find(p => p.peerId === this.net.myId);
      if (me) $('btn-ready').textContent = me.ready ? '✖ Não estou pronto' : '✔ Estou pronto';
      // host só inicia com 2+ jogadores conectados
      if (isHost) {
        const n = players.filter(p => p.connected !== false).length;
        $('btn-start').disabled = n < 2;
        $('btn-start').textContent = n < 2 ? '▶ Aguardando jogadores… (mín 2)' : '▶ Iniciar partida (' + n + ' jogadores)';
      }
    }

    // ================= FLUXO ONLINE =================
    onNet(e) {
      switch (e.type) {
        case 'status': this.setConn(e.st, '● ' + e.label); break;
        case 'lobby': this.renderLobby(e.players); break;
        case 'toast': toast(e.message); break;
        case 'log': break;
        case 'net-error': toast('⚠ Rede: ' + e.message); break;
        case 'gone': case 'host-left':
          toast('💨 ' + (e.reason || 'Desconectado.'));
          if (!this.net.isHost && this.match) {
            // host saiu no meio da partida: encerra com mensagem clara (sem migração automática)
            try { this.match.stop(); } catch (err) {}
            this.match = null;
            window.SR.Audio.stopMusic();
            banner('O HOST FUGIU! 💨');
            setTimeout(() => { Screens.show('lobby'); }, 1800);
          }
          if (!this.match) { /* já no lobby */ }
          break;
        case 'match-start':
          this.clientMatchStart(e); break;
        case 'round':
          this.clientRound(e); break;
        case 'opp-progress':
          if (this.match) {
            this.match.remoteProgress[e.from] = e.p;
            this.renderHudScores();
          }
          break;
        case 'opp-finished':
          if (this.match && e.round === this.match.roundIndex) {
            this.match.remoteFinished[e.from || e.peerId] = true;
            toast('⚡ ' + (e.name || 'Alguém') + ' terminou!');
            window.SR.Audio.good();
          }
          break;
        case 'client-finish':
          // só o host recebe: valida e contabiliza
          if (this.net.isHost && this.match && e.round === this.match.roundIndex) {
            // No DIGITA LOGO!, confere se a palavra é a oficial (anti-chute).
            if (e.gameId === 'typeword') {
              const got = (e.detail && e.detail.word) || null;
              if (got !== this.expectedWord) break; // resultado inválido: ignora
            }
            this.match.hostNoteFinish(e.from, e.timeMs);
            this.match.remoteFinished[e.from] = true;
            const p = this.net.players.get(e.from);
            toast('⚡ ' + (p ? p.name : 'Jogador') + ' terminou!');
            this.renderHudScores();
          }
          break;
        case 'round-end':
          this.onRoundEnd(e.table, e.scores, e.round, e.nextIn);
          break;
        case 'match-end':
          this.onMatchEnd(e.scores, e.table);
          break;
      }
    }

    _playersForMatch() {
      return this.net.lobbyList()
        .filter(p => p.connected !== false)
        .map(p => ({ peerId: p.peerId, name: p.name, color: p.color }));
    }

    hostStartMatch() {
      const players = this._playersForMatch();
      if (players.length < 2) { $('lobby-error').textContent = 'Chame pelo menos 1 amigo (mín 2 jogadores).'; return; }
      $('lobby-error').textContent = '';
      const { order, seeds } = window.SR.Match.makeOrderAndSeeds();
      this.order = order; this.seeds = seeds;
      this.net.matchState = 'playing';
      this.net.hostBroadcast({ t: 'match-start', order, seeds, total: order.length, players });
      this.beginMatch(players, true);
      window.SR.Audio.startMusic();
      window.SR.Audio.setHeat(0);
      this.hostNextRound();
    }

    beginMatch(players, isHost) {
      try { if (this.match) this.match.stop(); } catch (e) {}
      this.match = new window.SR.Match({
        net: this.net, isLocal: false, canvas: $('game-canvas'), input: this.input,
        players, myId: this.net.myId, isHost,
        ui: this.matchUI()
      });
      this.match.totalRounds = this.order.length;
      players.forEach(p => { this.match.scores[p.peerId] = (this.net.players.get(p.peerId) || {}).score || 0; });
      Screens.show('game');
      this.match.start();
      this.renderHudScores();
    }

    hostNextRound() {
      const i = (this.match ? this.match.roundIndex : -1) + 1;
      if (i >= this.order.length) { this.hostEndMatch(); return; }
      const gameId = this.order[i], seed = this.seeds[i];
      const def = window.SR.Minigames.byId[gameId];
      // Calor OFICIAL: calculado aqui no host e enviado a todos. Todos jogam igual.
      const heat = window.SR.Heat.heatForRound(i, this.order.length);
      const word = (gameId === 'typeword') ? window.SR.Heat.pickWord(seed, heat.t) : null;
      this.expectedWord = word;
      this.match.resetRoundFlag();
      const startAt = Date.now() + window.SR.Config.COUNTDOWN_MS;
      this.net.hostBroadcast({ t: 'round', round: i, gameId, seed, durationMs: def.duration, startAt, players: this._playersForMatch(), heat: heat.t, speed: heat.speed, word });
      this.announceAndPlay(i, gameId, seed, def.duration, startAt, { heat: heat.t, speed: heat.speed, word });
    }

    announceAndPlay(i, gameId, seed, durationMs, startAt, extra) {
      const def = window.SR.Minigames.byId[gameId];
      extra = extra || {};
      const heatT = (typeof extra.heat === 'number') ? extra.heat : window.SR.Heat.heatForRound(i, this.order.length).t;
      const heat = window.SR.Heat.heatForRound(i, this.order.length);
      heat.t = heatT; heat.speed = (typeof extra.speed === 'number') ? extra.speed : (1 + heatT);
      Screens.show('game');
      // Congela o loop do round anterior p/ a capa não ser sobrescrita
      if (this.match) this.match.current = null;
      $('hud-round').textContent = 'Rodada ' + (i + 1) + '/' + this.order.length;
      $('hud-game').textContent = '🎲 ' + def.name;
      $('hud-heat').textContent = heat.face + ' ' + heat.label + ' · x' + heat.speed.toFixed(1);
      banner((heatT > 0.5 ? '🔥 ' : '🎲 ') + def.name + '!');
      this.match.ui.onHint(def.instruction);
      // Capa cartoon: papel + adesivo + rostinho
      const ctx = this.match.ctx;
      const UU = window.SR.Utils;
      ctx.fillStyle = UU.PAL.paper; ctx.fillRect(0, 0, 800, 500);
      ctx.fillStyle = '#f3dfb8';
      for (let yy = 20; yy < 500; yy += 56) for (let xx = ((yy / 56) % 2) * 28; xx < 800; xx += 56) {
        ctx.beginPath(); ctx.arc(xx + 14, yy + 10, 5, 0, 7); ctx.fill();
      }
      const accents = [UU.PAL.tomato, UU.PAL.sky, UU.PAL.leaf, UU.PAL.grape, UU.PAL.orange, UU.PAL.gum];
      const accent = accents[UU.hashStr(gameId) % accents.length];
      UU.sticker(ctx, 130, 110, 540, 260, 26, '#FFFDF6');
      ctx.fillStyle = accent;
      UU.roundRect(ctx, 130, 110, 540, 54, 26); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 30px ' + UU.ROUND_FONT; ctx.textAlign = 'center';
      ctx.fillText('🎲 ' + def.name.toUpperCase(), 400, 148);
      UU.face(ctx, 400, 225, 56, heatT > 0.5 ? 'wow' : 'happy');
      ctx.fillStyle = UU.PAL.ink; ctx.font = '800 21px ' + UU.ROUND_FONT;
      const words = def.instruction.split(' ');
      let line = '', ly = 285;
      words.forEach(w => {
        if ((line + ' ' + w).length > 44) { ctx.fillText(line, 400, ly); ly += 28; line = w; }
        else line = (line ? line + ' ' : '') + w;
      });
      ctx.fillText(line, 400, ly);
      ctx.fillStyle = '#fff'; ctx.font = '900 20px ' + UU.ROUND_FONT;
      UU.sticker(ctx, 270, 395, 260, 48, 16, heatT > 0.5 ? UU.PAL.tomato : UU.PAL.butter);
      ctx.fillStyle = heatT > 0.5 ? '#fff' : UU.PAL.ink;
      ctx.fillText(heat.face + ' ' + heat.label + ' x' + heat.speed.toFixed(1), 400, 426);
      const wait = Math.max(0, startAt - Date.now());
      setTimeout(() => {
        if (!this.match) return;
        countdown(3, () => {
          if (!this.match) return;
          this.match.resetRoundFlag();
          this.match.playRound(i, gameId, seed, durationMs, extra);
          this.renderHudScores();
        });
      }, wait);
    }

    clientMatchStart(e) {
      this.order = e.order; this.seeds = e.seeds;
      this.beginMatch(e.players, false);
      window.SR.Audio.startMusic();
      toast('A festa começou! 🎪 ' + e.total + ' minigames');
    }
    clientRound(e) {
      // sincroniza lista de jogadores (caso alguém tenha caído)
      if (e.players) { /* nomes p/ overlay */ }
      // Palavra oficial do host; fallback determinístico se ausente.
      let word = e.word || null;
      if (e.gameId === 'typeword' && !word) {
        const h = (typeof e.heat === 'number') ? e.heat : 0;
        word = window.SR.Heat.pickWord(e.seed, h);
      }
      this.announceAndPlay(e.round, e.gameId, e.seed, e.durationMs, e.startAt, { heat: e.heat, speed: e.speed, word });
    }

    onRoundEnd(table, scores, round, nextIn) {
      if (this.match) this.match.current = null; // congela canvas atrás do placar
      Object.assign(this.match ? this.match.scores : {}, scores || {});
      this.renderHudScores();
      window.SR.Audio.win();
      Screens.show('score');
      const heat = window.SR.Heat.heatForRound(round, this.order.length);
      const qrng = window.SR.Utils.mulberry32((round * 2654435761) >>> 0);
      $('score-title').textContent = '🏁 Rodada ' + (round + 1) + ' — ' + (window.SR.Minigames.byId[this.order[round]] || {}).name;
      const ol = $('score-list'); ol.innerHTML = '';
      const medals = ['🥇', '🥈', '🥉'];
      table.forEach((r, i) => {
        const medal = medals[i] || (r.timeMs == null ? '💤' : '🏃');
        const li = document.createElement('li');
        const extra = (i === 0) ? ' — ' + window.SR.Heat.quip(qrng, window.SR.Heat.WIN_QUIPS) : '';
        li.innerHTML = medal + ' <span style="color:' + r.color + '">●</span> ' + escapeHtml(r.name) +
          ' — ' + (r.timeMs == null ? 'dormiu no ponto 😴 +0' : U().fmtTime(r.timeMs)) +
          ' · +' + r.points + ' pts · total ' + r.total + extra;
        ol.appendChild(li);
      });
      // atualiza score oficial no lobby-map do host também
      if (this.net.isHost) table.forEach(r => { const p = this.net.players.get(r.peerId); if (p) p.score = r.total; });
      const totalMs = (typeof nextIn === 'number' && nextIn > 800) ? nextIn : window.SR.Heat.scoreboardMs(round, this.order.length);
      let n = Math.max(2, Math.round(totalMs / 1000));
      $('score-count').textContent = n;
      $('score-next').firstChild.textContent = heat.t > 0.6 ? 'Corre que o próximo já vem! 🏃‍♂️💨 em ' : 'Próxima bagunça em ';
      clearInterval(this._scoreTimer);
      this._scoreTimer = setInterval(() => {
        n--; $('score-count').textContent = n;
        if (n <= 0) {
          clearInterval(this._scoreTimer);
          Screens.show('game');
          if (this.net.isHost) {
            if (round + 1 >= this.order.length) this.hostEndMatch();
            else this.hostNextRound();
          }
          // cliente: apenas aguarda o próximo 'round' do host (não avança sozinho)
        }
      }, 1000);
    }

    hostEndMatch() {
      const scores = this.match.scores;
      const table = Object.entries(scores).map(([peerId, total]) => {
        const p = this.net.players.get(peerId) || { name: '?', color: '#fff' };
        return { peerId, name: p.name, color: p.color, total };
      }).sort((a, b) => b.total - a.total);
      this.net.hostBroadcast({ t: 'match-end', scores, table });
      this.net.matchState = 'lobby';
      // reseta prontidão
      this.net.players.forEach(p => { p.ready = (p.peerId === this.net.myId); });
      this.net._broadcastLobby();
      this.onMatchEnd(scores, table);
    }

    onMatchEnd(scores, table) {
      try { if (this.match) this.match.stop(); } catch (e) {}
      window.SR.Audio.stopMusic();
      Screens.show('final');
      const me = this.net.myId || 'local';
      window.SR.Audio.fanfare(table.length > 0 && table[0].peerId === me);
      const ol = $('final-list'); ol.innerHTML = '';
      const qrng = window.SR.Utils.mulberry32((table.length ? table[0].total : 7) >>> 0);
      const title = window.SR.Heat.quip(qrng, window.SR.Heat.FINAL_TITLES);
      table.forEach((r, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] || '🏃';
        const li = document.createElement('li');
        let line = medal + ' <span style="color:' + r.color + '">●</span> ' + escapeHtml(r.name) + ' — ' + r.total + ' pts';
        if (i === 1) line += ' · quase lá! 😤';
        if (i === 2) line += ' · honroso! 🍪';
        if (i > 2) line += ' · ' + window.SR.Heat.quip(qrng, window.SR.Heat.LOSE_QUIPS);
        li.innerHTML = line;
        ol.appendChild(li);
      });
      $('podium').innerHTML = table.length
        ? '<span class="champ">👑 ' + escapeHtml(table[0].name) + ' VENCEU!</span>'
        : '';
      $('final-quip').textContent = table.length ? '✨ ' + title : '';
      // Chuva de confetes de papel
      const zone = $('confetti-zone'); zone.innerHTML = '';
      const cols = ['#E4572E', '#FFC53D', '#4FB6E8', '#58B368', '#F15BB5', '#F98A2B'];
      for (let i = 0; i < 60; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = (Math.random() * 100) + '%';
        c.style.background = cols[i % cols.length];
        c.style.animationDuration = (1.6 + Math.random() * 1.8) + 's';
        c.style.animationDelay = (Math.random() * 0.9) + 's';
        c.style.borderRadius = (i % 3 === 0) ? '50%' : '2px';
        zone.appendChild(c);
        setTimeout(() => c.remove(), 4500);
      }
    }

    // ================= MODO LOCAL =================
    startLocal(profile) {
      const me = { peerId: 'local', name: profile.name, color: profile.color };
      const { order, seeds } = window.SR.Match.makeOrderAndSeeds();
      this.order = order; this.seeds = seeds;
      try { if (this.match) this.match.stop(); } catch (e) {}
      this.match = new window.SR.Match({
        net: null, isLocal: true, canvas: $('game-canvas'), input: this.input,
        players: [me], myId: 'local', isHost: true,
        ui: this.matchUI()
      });
      this.match.totalRounds = this.order.length;
      Screens.show('game');
      this.match.start();
      window.SR.Audio.startMusic();
      window.SR.Audio.setHeat(0);
      this.localNextRound();
    }
    localNextRound() {
      const i = this.match.roundIndex + 1;
      if (this.match) this.match.current = null;
      if (i >= this.order.length) {
        const total = this.match.scores['local'] || 0;
        Screens.show('final');
        $('podium').innerHTML = '<span class="champ">🏁 Fim do treino!</span>';
        $('final-quip').textContent = '✨ Treino de respeito! Chame os amigos p/ a festa de verdade.';
        $('final-list').innerHTML = '<li>🥇 ' + escapeHtml(this.profile.name) + ' — ' + total + ' pts</li>';
        window.SR.Audio.stopMusic();
        window.SR.Audio.fanfare(true);
        return;
      }
      const gameId = this.order[i], seed = this.seeds[i];
      const def = window.SR.Minigames.byId[gameId];
      const heat = window.SR.Heat.heatForRound(i, this.order.length);
      const word = (gameId === 'typeword') ? window.SR.Heat.pickWord(seed, heat.t) : null;
      this.expectedWord = word;
      $('hud-round').textContent = 'Treino ' + (i + 1) + '/' + this.order.length;
      $('hud-game').textContent = '🎲 ' + def.name;
      $('hud-heat').textContent = heat.face + ' ' + heat.label + ' · x' + heat.speed.toFixed(1);
      banner((heat.t > 0.5 ? '🔥 ' : '🎲 ') + def.name + '!');
      countdown(3, () => {
        if (!this.match) return;
        this.match.resetRoundFlag();
        this.match.playRound(i, gameId, seed, def.duration, { heat: heat.t, speed: heat.speed, word });
      });
    }

    // ================= UI do Match =================
    matchUI() {
      const self = this;
      return {
        onRound(i, total, def) {
          $('hud-round').textContent = (self.match && self.match.isLocal ? 'Treino ' : 'Rodada ') + (i + 1) + '/' + total;
          $('hud-game').textContent = '🎲 ' + def.name;
          if (self.match && typeof self.match.heatT === 'number') {
            const h = window.SR.Heat.heatForRound(i, total);
            $('hud-heat').textContent = h.face + ' ' + h.label + ' · x' + (1 + self.match.heatT).toFixed(1);
          }
          self.renderHudScores();
        },
        onTimer(leftMs) {
          const el = $('hud-timer');
          el.textContent = '⏱ ' + (leftMs / 1000).toFixed(1);
          el.classList.toggle('low', leftMs < 3000);
        },
        onHint(t) { $('game-hint').textContent = '📢 ' + t; },
        onToast(m) { toast(m); },
        onBanner(m) { banner(m); },
        onCountdown(n, cb) { countdown(n, cb); },
        onLocalRoundDone(timeMs, detail) {
          if (self.match) self.match.current = null;
          // pontuação local: concluiu = 100 - penalidade por tempo? simples: 100 se top, proporcional.
          const def = self.match.currentDef;
          let pts = 0;
          if (timeMs != null) {
            const ratio = 1 - (timeMs / def.duration) * 0.5;
            pts = Math.max(30, Math.round(100 * ratio));
          }
          self.match.scores['local'] = (self.match.scores['local'] || 0) + pts;
          Screens.show('score');
          $('score-title').textContent = '🏁 Treino — ' + def.name;
          $('score-list').innerHTML = '<li>' + (timeMs == null ? '💤 Não concluiu · +0' : '⚡ ' + U().fmtTime(timeMs) + ' · +' + pts + ' pts') + ' · total ' + self.match.scores['local'] + '</li>';
          let n = 3; $('score-count').textContent = n;
          clearInterval(self._scoreTimer);
          self._scoreTimer = setInterval(() => {
            n--; $('score-count').textContent = n;
            if (n <= 0) { clearInterval(self._scoreTimer); Screens.show('game'); self.localNextRound(); }
          }, 1000);
        },
        onScoreboard(round, def, table) {
          const ni = window.SR.Heat.scoreboardMs(round, self.order.length);
          self.onRoundEnd(table, self.match.scores, round, ni);
        },
        onEnd() {},
        onScoreboardFinal() {},
        onFinal() {}
      };
    }

    renderHudScores() {
      const box = $('hud-scores');
      if (!this.match) { box.innerHTML = ''; return; }
      const rows = (this.match.players || []).map(p => ({
        name: p.name, color: p.color,
        pts: this.match.scores[p.peerId] || 0,
        fin: this.match.remoteFinished[p.peerId] || (p.peerId === this.match.myId && this.match.finishedLocal)
      })).sort((a, b) => b.pts - a.pts);
      box.innerHTML = rows.map(r =>
        '<span class="sc"><span style="color:' + r.color + '">●</span> ' + escapeHtml(r.name) + ' ' + r.pts + (r.fin ? ' ✔' : '') + '</span>'
      ).join('');
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  window.escapeHtml = escapeHtml;
  window.SR.Screens = Screens;
  window.SR.App = App;
})();
