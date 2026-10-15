// Motor da partida: countdown sincronizado, loop do minigame, timeout,
// envio/validação de resultados, placar. Funciona online (host/cliente) e local.
window.SR = window.SR || {};
(function () {
  const U = () => window.SR.Utils;
  const TOTAL = () => window.SR.Config.TOTAL_ROUNDS;

  class Match {
    constructor(opts) {
      this.net = opts.net || null;          // Net ou null (local)
      this.isLocal = !!opts.isLocal;
      this.canvas = opts.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.input = opts.input;
      this.ui = opts.ui; // {onRound,onTimer,onHint,onScores,onToast,onBanner,onCountdown,onEnd,onScoreboard,onFinal}
      this.players = opts.players || [];    // [{peerId,name,color}]
      this.scores = {};                     // peerId -> pts
      this.players.forEach(p => { this.scores[p.peerId] = 0; });
      this.myId = opts.myId;
      this.isHost = !!opts.isHost;
      this.roundIndex = -1;
      this.order = opts.order || [];
      this.seeds = opts.seeds || [];
      this.running = false;
      this.finishedLocal = false;
      this.finishedTime = null;
      this.roundStartPerf = 0;
      this.duration = 10000;
      this.current = null; this.currentDef = null;
      this.lastProgressSent = 0;
      this.remoteProgress = {}; // peerId -> 0..1
      this.remoteFinished = {}; // peerId -> true
      this._raf = 0; this._lastTs = 0;
      this.hostResults = [];    // host coleta finishes do round atual
      this.roundGameId = null;
    }

    // ===== HOST: inicia sequência =====
    static makeOrderAndSeeds() {
      const seedBase = (Math.random() * 0xffffffff) >>> 0;
      const order = window.SR.Minigames.shuffledOrder(seedBase, TOTAL());
      const seeds = order.map((_, i) => (seedBase ^ U().hashStr('r' + i)) >>> 0);
      return { order, seeds, seedBase };
    }

    start() {
      this.running = true;
      this._lastTs = performance.now();
      const loop = (ts) => {
        if (!this.running) return;
        const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
        this._lastTs = ts;
        this.tick(dt, ts);
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }
    stop() { this.running = false; cancelAnimationFrame(this._raf); this._typeBox(false); if (this.current && this.current.destroy) try { this.current.destroy(); } catch (e) {} }

    // ===== controla UMA rodada (chamado pelo host via broadcast, ou local) =====
    // extra: {heat, speed, word} — calor oficial vindo do host (mesmo p/ todos).
    playRound(roundIndex, gameId, seed, durationMs, extra) {
      this.roundIndex = roundIndex;
      this.roundGameId = gameId;
      this.duration = durationMs;
      extra = extra || {};
      // O valor oficial é o enviado pelo host; o fallback determinístico usa os
      // mesmos roundIndex/total, então dá o mesmo resultado de qualquer jeito.
      const heatInfo = window.SR.Heat.heatForRound(roundIndex, TOTAL());
      this.heatT = (typeof extra.heat === 'number') ? extra.heat : heatInfo.t;
      this.speed = (typeof extra.speed === 'number') ? extra.speed : (1 + this.heatT);
      this.word = extra.word || null;
      this.finishedLocal = false; this.finishedTime = null;
      this.remoteProgress = {}; this.remoteFinished = {};
      this.hostResults = [];
      const def = window.SR.Minigames.byId[gameId];
      this.currentDef = def;
      const rng = U().mulberry32(seed);
      const api = {
        rng,
        input: this.input,
        progress: (p) => this._sendProgress(p),
        finish: (detail) => this._finishLocal(detail),
        heat: this.heatT,
        speed: this.speed,
        word: this.word,
        seed
      };
      if (this.current && this.current.destroy) try { this.current.destroy(); } catch (e) {}
      this.current = def.create(api);
      this._typeBox(!!this.current.wantsTypeBox);
      window.SR.Audio.setHeat(this.heatT);
      this.roundStartPerf = performance.now();
      this.ui.onRound(roundIndex, TOTAL(), def);
      this.ui.onHint(def.instruction);
    }

    _typeBox(on) {
      try {
        const box = document.getElementById('type-box');
        if (!box) return;
        if (on) {
          box.value = '';
          box.classList.remove('hidden');
          // foca sem rolar a página (abre o teclado no celular)
          setTimeout(() => { try { box.focus({ preventScroll: true }); } catch (e) { try { box.focus(); } catch (e2) {} } }, 60);
          if (!this._typeWired || this._typeInst !== this.current) {
            this._typeWired = true; this._typeInst = this.current;
            box.oninput = () => {
              const inst = this._typeInst;
              if (inst && inst.onText) { try { inst.onText(box.value); } catch (e) { console.error(e); } }
            };
          } else {
            this._typeInst = this.current;
          }
        } else {
          box.classList.add('hidden');
          try { box.blur(); } catch (e) {}
        }
      } catch (e) {}
    }

    _sendProgress(p) {
      const now = performance.now();
      p = U().clamp(p || 0, 0, 1);
      if (now - this.lastProgressSent < window.SR.Config.PROGRESS_THROTTLE_MS) return;
      this.lastProgressSent = now;
      if (this.isLocal) return;
      if (this.isHost) {
        // host retransmite o próprio progresso como oponente p/ clientes
        this.net.hostBroadcast({ t: 'opp-progress', from: this.myId, round: this.roundIndex, p });
      } else {
        this.net.sendToHost({ t: 'progress', round: this.roundIndex, p });
      }
    }

    _finishLocal(detail) {
      if (this.finishedLocal) return;
      this.finishedLocal = true;
      this._typeBox(false);
      this.finishedTime = performance.now() - this.roundStartPerf;
      window.SR.Audio.win();
      const t = Math.round(this.finishedTime);
      this._sendProgress(1);
      if (this.isLocal) {
        this.ui.onToast('Você terminou em ' + U().fmtTime(t) + '! ⚡');
        // host local resolve na hora
        setTimeout(() => this.ui.onLocalRoundDone(t, detail), 900);
      } else if (this.isHost) {
        this.hostResults.push({ peerId: this.myId, timeMs: this._validateTime(t), ok: true });
        this.net.hostBroadcast({ t: 'opp-finished', from: this.myId, name: this._myName(), round: this.roundIndex });
        this.ui.onToast('Você terminou em ' + U().fmtTime(t) + '! ⚡');
        this._hostMaybeCloseRound();
      } else {
        this.net.sendToHost({ t: 'finish', round: this.roundIndex, gameId: this.roundGameId, timeMs: t, detail: detail || {}, _id: 'f' + this.roundIndex + this.myId });
        this.ui.onToast('Você terminou em ' + U().fmtTime(t) + '! Aguarde os outros…');
        this.ui.onBanner('✅ ' + U().fmtTime(t));
      }
    }

    _validateTime(t) {
      // Anti-trapaça básico: tempo dentro de [0, duração+2s]; fora disso = DNF.
      if (typeof t !== 'number' || !(t >= 0) || t > this.duration + 2000) return null;
      return Math.round(t);
    }

    _myName() {
      const p = (this.players || []).find(x => x.peerId === this.myId);
      return p ? p.name : 'Você';
    }

    // ===== tick principal =====
    tick(dt, nowPerf) {
      if (this.roundIndex < 0 || !this.current) { this.input.endFrame(); return; }
      const elapsed = nowPerf - this.roundStartPerf;
      const left = this.duration - elapsed;
      this.ui.onTimer(Math.max(0, left), this.duration);
      // input por evento (teclas clicadas 1x)
      for (const code in this.input.pressed) {
        if (this.input.pressed[code] && this.current.onKey) {
          try { this.current.onKey(code); } catch (e) { console.error(e); }
        }
      }
      if (this.input.pointer.justPressed && this.current.onPointerDown) {
        try { this.current.onPointerDown(this.input.pointer.x, this.input.pointer.y); } catch (e) { console.error(e); }
        // No jogo de digitação, tocar no canvas devolve o foco ao teclado.
        if (this.current.wantsTypeBox) { try { document.getElementById('type-box').focus({ preventScroll: true }); } catch (e) {} }
      }
      // Teclas físicas só viram texto quando NÃO há caixa de digitação ativa
      // (com a caixa focada, o próprio input DOM é a fonte da verdade).
      if (!this.current.wantsTypeBox && this.current.onText && this.input.textQueue.length) {
        const s = this.input.textQueue.join('');
        try { this.current.onText(s); } catch (e) { console.error(e); }
      }
      if (this.current.onPointerMove && this.input.pointer.down && this.current.onPointerMove) {
        try { this.current.onPointerMove(this.input.pointer.x, this.input.pointer.y); } catch (e) {}
      }
      try { this.current.update(dt); } catch (e) { console.error(e); }
      try { this.current.draw(this.ctx); } catch (e) { console.error(e); }
      this._drawRemoteOverlays();
      this.input.endFrame();
      // timeout
      if (left <= 0 && !this._timedOut) {
        this._timedOut = true;
        this._typeBox(false);
        if (this.isLocal) {
          if (!this.finishedLocal) this.ui.onToast('⏰ Tempo esgotado!');
          setTimeout(() => this.ui.onLocalRoundDone(this.finishedLocal ? Math.round(this.finishedTime) : null, {}), 600);
        } else if (this.isHost) {
          this._hostCloseRound(); // quem não enviou = DNF
        } else {
          if (!this.finishedLocal) this.ui.onToast('⏰ Tempo esgotado! Aguarde o placar…');
        }
      }
      if (left > 0) this._timedOut = false;
    }

    _drawRemoteOverlays() {
      // Balõezinhos de progresso dos oponentes no topo do canvas
      const ctx = this.ctx;
      const ids = Object.keys(this.remoteProgress);
      if (!ids.length) return;
      ctx.save();
      ctx.font = '800 13px ' + U().ROUND_FONT;
      ids.slice(0, 7).forEach((pid, i) => {
        const p = (this.players || []).find(x => x.peerId === pid);
        if (!p || pid === this.myId) return;
        const y = 44 + i * 22;
        ctx.fillStyle = 'rgba(255,253,246,0.92)';
        U().roundRect(ctx, 8, y - 14, 190, 18, 9); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = U().PAL.ink;
        U().roundRect(ctx, 8, y - 14, 190, 18, 9); ctx.stroke();
        ctx.fillStyle = p.color || '#E4572E';
        U().roundRect(ctx, 11, y - 11, 184 * U().clamp(this.remoteProgress[pid] || 0, 0, 1), 12, 5); ctx.fill();
        ctx.fillStyle = U().PAL.ink; ctx.textAlign = 'left';
        const mark = this.remoteFinished[pid] ? ' ✔' : '';
        ctx.fillText(String(p.name).slice(0, 10) + ' ' + Math.round((this.remoteProgress[pid] || 0) * 100) + '%' + mark, 204, y + 2);
      });
      ctx.restore();
    }

    // ===== HOST: coleta e fecha rodada =====
    hostNoteFinish(peerId, timeMs) {
      if (this.hostResults.find(r => r.peerId === peerId)) return; // dedup
      const v = this._validateTime(timeMs);
      this.hostResults.push({ peerId, timeMs: v, ok: v != null });
      this._hostMaybeCloseRound();
    }
    _hostMaybeCloseRound() {
      // fecha cedo se TODOS terminaram
      const ids = this.players.map(p => p.peerId);
      const got = new Set(this.hostResults.map(r => r.peerId));
      if (ids.every(id => got.has(id))) this._hostCloseRound();
    }
    _hostCloseRound() {
      if (this._roundClosed) return;
      this._roundClosed = true;
      const ids = this.players.map(p => p.peerId);
      const got = new Set(this.hostResults.map(r => r.peerId));
      ids.forEach(id => { if (!got.has(id)) this.hostResults.push({ peerId: id, timeMs: null, ok: false }); });
      const placements = window.SR.Scoring.scoreRound(this.hostResults.map(r => ({ peerId: r.peerId, timeMs: r.timeMs, ok: r.ok })), ids.length);
      placements.forEach(pl => { this.scores[pl.peerId] = (this.scores[pl.peerId] || 0) + pl.points; });
      // nome + tempo p/ exibição
      const table = placements.map(pl => {
        const p = this.players.find(x => x.peerId === pl.peerId) || { name: '?', color: '#fff' };
        return { peerId: pl.peerId, name: p.name, color: p.color, timeMs: pl.timeMs, place: pl.place, points: pl.points, total: this.scores[pl.peerId] };
      });
      this._lastTable = table;
      const nextIn = window.SR.Heat.scoreboardMs(this.roundIndex, this.totalRounds || 12);
      if (this.isLocal) {
        this.ui.onScoreboard(this.roundIndex, this.currentDef, table);
      } else {
        this.net.hostBroadcast({ t: 'round-end', round: this.roundIndex, gameId: this.roundGameId, table, scores: this.scores, nextIn });
        this.ui.onScoreboard(this.roundIndex, this.currentDef, table);
      }
    }
    resetRoundFlag() { this._roundClosed = false; this._timedOut = false; }
  }

  window.SR.Match = Match;
})();
