# ⚡ SpeedRush — Minigames frenéticos multiplayer online (2–8 jogadores)

Jogo completo em **HTML5 + CSS3 + JavaScript puro + Canvas 2D**, estilo WarioWare:
12 minigames sorteados por partida, pontuação competitiva (100/80/60/30/0),
lobby com código de 4 letras, sincronização de countdown e placar em tempo real.

**Multiplayer online real** via **WebRTC DataChannels (P2P)** com sinalização
gratuita **PeerJS Cloud (`0.peerjs.com`)**. Nenhum servidor próprio. Nenhum bot
fingindo ser jogador online: o lobby só lista conexões WebRTC reais.

> **Identidade atual: festa cartoon indie** — papel creme, adesivos com contorno
> de chocolate, rostinhos bobos, sem neon/cyberpunk. A partida esquenta de
> `TRANQUILO x1.0` até `CAOS TOTAL x2.0`, com marchinha procedural que acelera
> junto (Web Audio, sem arquivos).

---

## 0. O que muda conforme a partida esquenta 🌶️

O **host** calcula o calor oficial `t = round/(total-1)` e envia na mensagem
`round` (`heat`, `speed`, `word`). Todos jogam **idêntico**:

| Fase | Calor | Velocidade | Música | Exemplos |
|------|-------|-----------|--------|----------|
| TRANQUILO 🙂 | 0–25% | x1.0–x1.25 | ~104–123 BPM, leve | palavras curtas (GATO, BOLA) |
| ESQUENTANDO 😬 | 25–50% | x1.25–x1.5 | +caixa | sequência de 6 símbolos |
| FERVENDO 🥵 | 50–75% | x1.5–x1.75 | +apito maluco | ponte com 6 colunas, portas que TROCAM de lugar! |
| CAOS TOTAL 🤯 | 75–100% | x1.75–x2.0 | ~182 BPM, tudo junto | LIQUIDIFICADOR, prazos curtíssimos |

Cada minigame escala **individualmente** (velocidade de objetos, prazos,
tamanho de sequência/palavra, troca de controles) — nunca só cortando o relógio.
O placar entre rounds também acelera (4,5s → 2,4s). Ver `js/heat.js`.

---

## 1. Como executar localmente

Opção A — só abrir o arquivo (funciona p/ modo local, mas WebRTC prefere HTTP):

```
cd speedrush
python -m http.server 8000
# abra http://localhost:8000
```

Opção B — VS Code "Live Server", ou qualquer estático. Não precisa build.

> `file://` direto também abre, mas alguns navegadores restringem WebRTC sem
> contexto seguro — prefira `http://localhost`.

## 2. Como publicar (HTTPS obrigatório p/ WebRTC entre computadores)

Qualquer hospedagem estática com HTTPS funciona (o jogo é 100% frontend):

- **GitHub Pages**: suba a pasta → Settings → Pages → Deploy from branch.
- **Netlify**: arraste a pasta em app.netlify.com/drop (HTTPS automático).
- **Vercel**: `vercel --prod` na pasta (ou importe o repo).
- **Cloudflare Pages / Render Static / Neocities**: igual, só sirva os arquivos.

Nada para configurar no servidor. É só HTML/CSS/JS + CDN do PeerJS.

## 3. Como funciona o multiplayer (arquitetura real)

```
 Jogador B ──┐
             ├─(WebRTC DataChannel)─> HOST (autoridade: sorteia minigames,
 Jogador C ──┘                        countdown, valida tempos, soma pontos,
                        ^             distribui placar)
                        │
              PeerJS Cloud (0.peerjs.com)
              só troca a "apresentação" inicial (SDP/ICE).
              O jogo em si trafega P2P, sem passar pelo servidor.
```

- **Criar sala**: o host ganha um Peer ID `speedrush-v1-XXXX` (XXXX = código).
- **Entrar**: o cliente cria um Peer aleatório e abre `DataConnection` com o host.
- **Protocolo** (`js/network.js`): `hello/welcome/lobby/ready/match-start/
  round/progress/finish/opp-progress/opp-finished/round-end/match-end/host-left`.
- **Topologia estrela** (host ↔ cada cliente). Host anuncia `round {gameId, seed,
  durationMs, startAt}`; todos geram o **mesmo puzzle** a partir da `seed`
  (RNG `mulberry32`), então o desafio é idêntico e justo.
- **Sincronização**: `startAt = Date.now() + 3000` + countdown local de 3s.
  Mede-se duração com relógio monotônico (`performance.now()`), não com
  `Date.now()` — imune a ajuste de relógio no meio da rodada.
- **Validação anti-absurdo (host)**: tempo precisa estar em `[0, duração+2s]`;
  fora disso vira DNF (0 pts). Tempos iguais dentro de 120 ms = empate
  (mesmos pontos). Desempate determinístico por `peerId`.
- **Biblioteca externa (única)**: `PeerJS 1.5.4` via CDN
  `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js`
  (fallback automático p/ cdnjs). Carregada com `<script>` clássico.

### STUN / TURN

- Padrão: STUN público `stun:stun.l.google.com:19302` (+ Twilio STUN).
- Funciona na maioria das redes domésticas/4G.
- NAT simétrico restrito / firewall corporativo pode exigir TURN. O jogo
  **mostra o erro** ("tempo esgotado ao entrar… Tente outra rede ou configure
  TURN") em vez de fingir que conectou. Para configurar TURN gratuito:
  1. Crie conta gratuita no **Metered.ca** (ou outro provedor TURN) e pegue as credenciais.
  2. No navegador, abra o console (F12) e rode **uma vez**:
     ```js
     localStorage.setItem('speedrush_turn', JSON.stringify(
       [{ urls: 'turn:xxx.metered.ca:80', username: 'SEU_USER', credential: 'SUA_SENHA' }]));
     ```
  3. Recarregue. O próximo Peer usará seu TURN além do STUN.

## 4. Como testar uma partida real pela internet (2 computadores)

1. Publique numa URL **HTTPS** (seção 2) ou use `ngrok http 8000` p/ teste rápido.
2. **PC 1 (host)**: abra a URL → nome + cor → **Criar sala** → anote o código (ex: `K7QZ`).
3. **PC 2 (cliente, outra rede de preferência)**: abra a mesma URL → **Entrar em sala** → digite o código.
4. Ambos aparecem no lobby. Cliquem **Estou pronto**. Host clica **Iniciar partida**.
5. Jogam 12 minigames sincronizados; placar entre rodadas; pódio no final.

Também dá p/ testar sozinho: **2 abas anônimas diferentes** (ou 2 navegadores)
na mesma máquina simulam 2 peers reais via internet (vale p/ lógica, mas usa a
mesma rede — o teste de fogo é em redes diferentes).

## 5. Checklist de verificação

| # | Teste | Esperado |
|---|-------|----------|
| 1 | Criar sala sem internet | Erro claro de rede (não entra em lobby vazio) |
| 2 | Criar sala online | Código de 4 letras + status `online · host` |
| 3 | Entrar com código errado | `Sala não encontrada` (não entra fingindo) |
| 4 | 2 jogadores no lobby | Lista mostra os 2 nomes/cores + `pronto` |
| 5 | Host inicia com 1 jogador | Botão desabilitado `Aguardando jogadores…` |
| 6 | Countdown | Ambos veem 3-2-1-JÁ e começam juntos (~1s de tolerância) |
| 7 | Terminar em 1º/2º | Toast `X terminou!` no adversário + overlay de progresso |
| 8 | Pontuação | 1º=100, 2º=80, 3º=60, concluiu=30, DNF=0; empate divide pontos |
| 9 | Timeout | Quem não termina recebe 0 e a partida continua |
| 10 | Cliente fecha a aba | Host vê `X saiu` e a partida continua |
| 11 | Host fecha a aba | Clientes veem `O HOST SAIU` (sem travar) |
| 12 | Modo local | `Jogar sozinho` roda 12 rounds sem rede |
| 13 | Mobile | Toque funciona nos 10 minigames; canvas responsivo |

## 6. Limitações conhecidas (honestas)

- **Sinalização depende do PeerJS Cloud gratuito** (0.peerjs.com): tem limite de
  uso e pode ficar instável. Se cair, ninguém cria/entra em sala (erro visível).
  Alternativa: hospede seu próprio PeerServer (1 container) e troque `host/port`
  em `js/config.js`.
- **Sem TURN por padrão**: ~85–90% das redes conectam só com STUN; NATs
  simétricos/firewalls UDP-bloqueado falham (mensagem clara; configure TURN).
- **Host é jogador, não servidor confiável**: tempos são medidos localmente e
  enviados ao host; validação é básica (faixa + empate). Um cliente modificado
  pode mentir o tempo dentro da faixa. Mitigação real exigiria servidor
  autoritativo — fora do escopo "sem servidor próprio".
- **Sem migração de host**: se o host sai, a partida encerra (volta ao lobby).
- **Sem reconexão mid-match**: quem cai no meio da partida volta como DNF
  naquela rodada; pode reentrar na próxima partida.
- **Relógios**: usa `Date.now()+3s` p/ início + countdown; skew > 2s entre
  aparelhos causa largada levemente dessincronizada (tolerável p/ casual).
- **Áudio**: sintetizado via WebAudio; alguns mobile exigem 1 toque antes
  (o jogo inicializa no primeiro clique).

## 7. Estrutura do projeto (módulos separados)

```
index.html            telas: home / lobby / jogo / placar / final
style.css             visual arcade responsivo (desktop + mobile)
js/config.js          constantes + PeerJS/STUN/TURN
js/utils.js           RNG com seed, helpers cartoon (adesivo, rostos, POW!)
js/heat.js            calor oficial, palavras do DIGITA LOGO!, piadas
js/audio.js           SFX + marchinha procedural que acelera (sem arquivos)
js/input.js           teclado + mouse + toque unificados (+fila de texto)
js/scoring.js         100/80/60/30/0 + empates determinísticos
js/network.js         WebRTC P2P estrela via PeerJS (salas reais) — INTOCADO
js/minigames.js       registro (adicionar jogo novo = +1 linha)
js/minigames/*.js     10 minigames cartoon com calor progressivo
js/game.js            motor da partida (countdown, loop, timeout, placar)
js/lobby.js           telas + orquestração host/cliente/local
js/main.js            bootstrap
```

**Adicionar um minigame novo**: copie `js/minigames/tower.js` como modelo,
exporte `window.SR.Mini_meujogo = { id, name, instruction, duration, create(api) }`,
inclua o `<script>` no `index.html` e registre em `js/minigames.js`.

## 8. Controles e som

- **PC**: WASD/setas + mouse; `Espaço/Enter` = ação; `1/2/3` onde indicado.
  No **DIGITA LOGO!**, digite no teclado (uma caixa de texto aparece) ou toque nela.
- **Mobile**: toque/arrastar; botões grandes no canvas; no DIGITA LOGO!,
  toque na caixa para abrir o teclado.
- Cada rodada mostra 1 frase de instrução + capa com o nome do jogo.
- **Som** (barra inferior, vale p/ todos): botão mudo, volume da música e dos
  efeitos (salvos no navegador). A música **só começa depois do 1º clique**
  (regra de autoplay) e acelera sem reiniciar.

## 9. Minigames (10)

Torre Maluca · Papa-Tudo · **DIGITA LOGO!** (palavra oficial do host, sem
acento obrigatório) · Ponte do Pânico · Dominó da Fofoca · Raio Laser Maluco ·
Esteira Enjoada · Código Maluco · Porta dos Desesperados · Controle Pirado.

Divirta-se! ⚡🎪
