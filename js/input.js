// Input unificado: teclado + mouse + toque (pointer events no canvas).
window.SR = window.SR || {};
(function () {
  function createInput(canvas) {
    const state = {
      keys: {},           // code -> bool
      pressed: {},         // code -> acabou de pressionar (consumível)
      pointer: { x: 0, y: 0, down: false, justPressed: false, justReleased: false },
      textQueue: [],       // caracteres digitados (p/ minigame de digitação)
      // joystick virtual p/ minigame da bolinha no mobile
      joyActive: false
    };
    function canvasPos(e) {
      const r = canvas.getBoundingClientRect();
      const cx = (e.clientX - r.left) * (canvas.width / r.width);
      const cy = (e.clientY - r.top) * (canvas.height / r.height);
      return { x: cx, y: cy };
    }
    window.addEventListener('keydown', (e) => {
      const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if (!typing && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!state.keys[e.code]) state.pressed[e.code] = true;
      state.keys[e.code] = true;
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (state.textQueue.length < 32) state.textQueue.push(e.key);
      }
    });
    window.addEventListener('keyup', (e) => { state.keys[e.code] = false; });
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = canvasPos(e);
      state.pointer.x = p.x; state.pointer.y = p.y;
      state.pointer.down = true; state.pointer.justPressed = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = canvasPos(e);
      state.pointer.x = p.x; state.pointer.y = p.y;
    });
    const up = (e) => {
      const p = canvasPos(e);
      state.pointer.x = p.x; state.pointer.y = p.y;
      state.pointer.down = false; state.pointer.justReleased = true;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    // Vetor de movimento normalizado (WASD/setas)
    state.axis = function () {
      let x = 0, y = 0;
      if (state.keys['ArrowLeft'] || state.keys['KeyA']) x -= 1;
      if (state.keys['ArrowRight'] || state.keys['KeyD']) x += 1;
      if (state.keys['ArrowUp'] || state.keys['KeyW']) y -= 1;
      if (state.keys['ArrowDown'] || state.keys['KeyS']) y += 1;
      if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
      return { x, y };
    };
    state.consumePressed = function (code) {
      if (state.pressed[code]) { state.pressed[code] = false; return true; }
      return false;
    };
    state.consumePointer = function () {
      const j = state.pointer.justPressed;
      state.pointer.justPressed = false;
      return j;
    };
    state.endFrame = function () {
      state.pressed = {};
      state.textQueue = [];
      state.pointer.justPressed = false;
      state.pointer.justReleased = false;
    };
    state.destroy = function () { /* listeners são globais leves; canvas é reutilizado */ };
    return state;
  }
  window.SR.createInput = createInput;
})();
