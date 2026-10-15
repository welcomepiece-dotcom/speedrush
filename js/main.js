// Bootstrap: canvas responsivo, redimensionamento, fallback de CDN.
(function () {
  function fitCanvas() {
    const c = document.getElementById('game-canvas');
    // resolução lógica fixa 800x500; CSS cuida do responsivo.
    c.width = 800; c.height = 500;
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  function boot() {
    if (!window.SR || !window.SR.App) {
      document.getElementById('home-error').textContent = '❌ Falha ao carregar scripts do jogo. Recarregue a página.';
      return;
    }
    window.SR.app = new window.SR.App();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
