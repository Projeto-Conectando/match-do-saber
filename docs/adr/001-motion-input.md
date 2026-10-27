# ADR-001-motion-input: Captura de movimento e vocabulário de gestos

**Status:** Accepted
**Date:** 2026-10-26
**Feature:** 001-jogo-estande

## Context

O jogo é jogado num **estande de evento**: um jogador por vez, de pé a cerca de 1,5–2 m de uma webcam comum de notebook, com fila e público assistindo. A escolha de cada card (match = verdadeira, descarta = falsa) e a abertura do "saiba mais" devem ser feitas por movimento. O notebook pode estar offline. Pela foundation (princípio 3, privacidade), muitos jogadores são menores de idade, então a imagem da câmera não pode ser gravada nem enviada.

## Options Considered

### Option A: MediaPipe Pose Landmarker (lite) com gestos de corpo

`@mediapipe/tasks-vision`, modelo `pose_landmarker_lite.task` e arquivos WASM servidos pelo próprio app e pré-cacheados.

**Pros:** detecta corpo inteiro, o que é robusto a 1,5–2 m, onde mãos ocupam poucos pixels; roda inteiro no navegador (GPU com fallback para CPU), sem enviar vídeo; modelo e WASM podem ser hospedados localmente, permitindo uso offline; biblioteca mantida pelo Google com guia oficial para Web.
**Cons:** o download inicial é maior (modelo + WASM, alguns MB, cacheados depois); o desempenho depende da GPU do notebook e precisa ser medido no hardware real.

### Option B: TensorFlow.js + MoveNet (pose-detection)

**Pros:** MoveNet Lightning é rápido; também roda localmente.
**Cons:** puxa o runtime do TensorFlow.js inteiro (bundle maior); pacote com manutenção menos ativa que o MediaPipe Tasks; não traz vantagem funcional para os gestos escolhidos.

### Option C: MediaPipe Hand/Gesture Recognizer (gestos de mão)

**Pros:** gestos prontos (joinha, mão aberta), próximos da ideia de "swipe".
**Cons:** a 2 m a mão fica pequena numa webcam comum e a detecção fica frágil; movimentos rápidos borram; é menos visível para o público assistindo.

## Decision

**We chose Option A (MediaPipe Pose Landmarker lite, gestos de corpo)** porque é a única opção confiável à distância do estande e funciona offline com o modelo hospedado no app. Ela também processa tudo localmente, atendendo ao princípio de privacidade.

Vocabulário de gestos (calibrado no início de cada partida, com o jogador parado no centro por 2 s):
- **Match (verdadeira):** o centro do tronco (ponto médio dos ombros) se desloca para a **direita do próprio jogador** além do limiar e se mantém por ~300 ms. É o mesmo lado da seta → e do vídeo espelhado na tela; como as coordenadas cruas da câmera não são espelhadas, o módulo de gestos converte antes de comparar.
- **Descarta (falsa):** o mesmo, para a **esquerda**.
- **Saiba mais (abre/fecha):** os dois punhos acima do nariz por ~500 ms.
- Depois de cada gesto confirmado, o jogador precisa voltar ao centro antes que o próximo gesto seja aceito.
- Rastreia 1 pessoa: a mais central/maior no quadro. Para isso o detector roda com `numPoses` > 1 (ex.: 3) e o módulo de gestos escolhe a pose; não dá para usar o modo padrão de pose única.
- Sem pessoa detectada: o jogo pausa; após 10 s volta à tela de espera (ver PRD).

Feedback: vídeo espelhado pequeno com o esqueleto desenhado; o card inclina acompanhando o corpo antes de confirmar.

Fallback sempre ativo: setas ← (descarta), → (match) e ↑ (saiba mais) do teclado, e swipe de mouse/toque, para o operador do estande e para acessibilidade.

## Consequences

- A lógica de gesto (limiares, tempos de permanência, histerese de retorno ao centro) fica isolada num módulo puro que recebe landmarks e emite eventos. Assim ela é testável com sequências de landmarks gravadas, sem câmera.
- Os limiares e tempos (~300 ms, ~500 ms, deslocamento) são pontos de partida e precisam ser ajustados em teste com pessoas reais no estande.
- Iluminação ruim, roupas da mesma cor do fundo ou várias pessoas no quadro podem degradar a detecção. O fallback de teclado cobre o estande nesses casos.
- A câmera exige contexto seguro (HTTPS ou localhost) e permissão do navegador no notebook.
- Se no futuro o jogo for para celular individual, este ADR precisará ser revisto (gesto de cabeça/mão ou toque).

## Addendum (spec v1.1.0, 2026-10-27)

A spec ganhou os modos acessíveis Mão e Cabeça (FR-9). Eles continuam usando o MediaPipe Pose Landmarker lite desta decisão, sem modelo novo:
- **Modo Mão:** punhos (15/16) acima dos ombros (11/12).
- **Modo Cabeça:** inclinação calculada pelas orelhas (7/8) e "queixo para cima" pela posição do nariz (0) em relação às orelhas.

O Face Landmarker foi considerado e descartado para não dobrar o download e o processamento por quadro. Se a detecção da cabeça se mostrar imprecisa no teste com pessoas reais, esta é a alternativa a reavaliar.

