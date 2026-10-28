# Feature 001: Match do Saber — jogo de estande (MVP)

**Status:** Approved
**Version:** 5.0.0
**Created:** 2026-10-26
**Last Updated:** 2026-10-27
**Branch:** `001-jogo-estande`
**Origem:** [prd.md](prd.md) · ADRs: [frontend-stack](../../adr/001-frontend-stack.md), [motion-input](../../adr/001-motion-input.md), [content-pipeline](../../adr/001-content-pipeline.md)

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-10-26 | Spec inicial aprovada |
| 1.1.0 | 2026-10-27 | Adicionados Story 9 e FR-9: menu "Modo de jogo" com modos acessíveis Mão e Cabeça (Corpo continua padrão); FR-2 passa a ser o modo Corpo |
| 2.0.0 | 2026-10-27 | Reescritos Story 9 e FR-9: o menu "Modo de jogo" vira "Configurações" (modo, tempo por card de 10 a 30 s, som); o tempo por card deixa de ser fixo em 15 s (FR-1, AC-1.2, AC-4.4). Adicionados Story 10/FR-10 (botões Iniciar e Sair), Story 11/FR-11 (sons) e AC-4.5 (card centralizado na vertical) |
| 3.0.0 | 2026-10-27 | Início só manual: a câmera deixa de iniciar a partida sozinha (reescritos AC-1.1, AC-1.6, AC-10.1, FR-1 e a linha "Iluminação ruim" dos erros; ajustados AC-1.4 e AC-10.3; acrescentados AC-1.7 e AC-1.8). Causa: depois de uma partida, de Sair ou de a pessoa sair do quadro, o jogo recomeçava sozinho se alguém continuasse no quadro |
| 4.0.0 | 2026-10-27 | Card parado até a escolha: reescritos AC-2.3 e AC-9.13 (o card não inclina mais com o corpo ou a cabeça, porque tremia com a captura da câmera; rastreio e gestos não mudam). Cronômetro reescrito em FR-4: sai o número em cima do card, entra uma barra grande na base da tela, com os segundos (AC-4.6), e nos últimos 5 s o card pulsa em vermelho (AC-4.7). AC-4.5 passa a medir a área de jogo sem a barra |
| 5.0.0 | 2026-10-28 | O tempo do card não pausa mais com o "saiba mais" aberto: reescritos AC-3.1, AC-3.2, AC-4.7 e FR-1; removido AC-3.5 (o "saiba mais" não fecha mais sozinho). Só "Volte para o centro" pausa o cronômetro. Causa: a barra de tempo e sua animação ficavam paradas com o "saiba mais" aberto, porque a regra pausava o cronômetro |

---

## Problem Statement

Estudantes do ensino médio e jovens adultos recebem o tempo todo notícias com imagens exageradas e títulos chamativos, e raramente param para checar antes de acreditar ou compartilhar. Faltam experiências curtas e divertidas que pratiquem técnicas reais de checagem (fonte, data, imagem, contexto) em vez de só dizer "isso é fake". O Match do Saber leva essa prática a estandes de eventos, num formato de "match" com notícias que qualquer pessoa entende em segundos e que o público ao redor consegue acompanhar.

## Goals

- Um jogador completa uma partida de até 10 cards usando só movimentos do corpo, sem tocar em teclado, mouse ou tela.
- Todo card jogado termina com o veredito, a explicação e a técnica de checagem da notícia, qualquer que seja o resultado.
- O jogo roda uma partida completa, com imagens, sem conexão com a internet, depois de ter sido aberto online uma vez após a última publicação.
- O jogo pode ser instalado no notebook e aberto por um ícone, como um aplicativo.
- Uma pessoa não programadora publica ou altera notícias sem ajuda técnica, e só notícias aprovadas, com fonte e revisor, chegam ao jogo.
- Nenhuma imagem da câmera e nenhum dado de jogador sai do notebook ou fica salvo.
- Jogadores com baixa mobilidade completam uma partida sem tocar no notebook, usando o modo Mão (levantar uma mão) ou o modo Cabeça (inclinar a cabeça), escolhido pelo operador.
- O operador ajusta o tempo por card ao público (de 10 a 30 s), liga ou desliga o som, e inicia ou encerra uma partida com um clique.

## Non-Goals

- Ranking, apelidos, contas de usuário ou qualquer dado de jogador salvo. (Os únicos valores guardados no notebook são as configurações do estande escolhidas pelo operador: modo de jogo, tempo por card e som. Não são dados de jogador.)
- Modo para celular individual ou para sala de aula.
- Multiplayer ou várias pessoas jogando ao mesmo tempo.
- Painel administrativo próprio: a planilha de conteúdo é o painel.
- Atualização do conteúdo durante uma partida em andamento.

## Users and Context

**Primary users:** jogadores, que são estudantes do ensino médio e jovens adultos (muitos menores de idade) jogando um por vez num estande de evento. Inclui jogadores com baixa mobilidade, que podem jogar sentados (por exemplo, em cadeira de rodas) e movimentar só um braço ou só a cabeça.
**Secondary users:**
- Operador do estande: liga o notebook, abre o jogo e intervém pelo teclado se a detecção de movimento falhar.
- Equipe de conteúdo (não programadora): cadastra, revisa e publica as notícias numa planilha on-line. Tem acesso de leitura ao repositório para ver o resumo de cada publicação.
**Usage context:** feira, gincana ou festival, com fila e público assistindo. O jogador fica de pé a ~1,5–2 m de um notebook com webcam, às vezes ligado a uma TV. O Wi-Fi do evento é instável.
**User mental model:** "é tipo Tinder de notícia": arrastar para a direita é dar match (acredito que é verdadeira), para a esquerda é descartar (acho que é falsa). Vocabulário: card, match, descartar, saiba mais, verdadeira, falsa, fonte.

## User Stories

### Story 1: Começar uma partida pelo movimento

**As a** jogador na fila do estande
**I want** que o jogo perceba que cheguei e me prepare para jogar
**So that** eu comece sem precisar de ajuda nem tocar no notebook

**Acceptance criteria:**

- [ ] **AC-1.1** Given o jogo está na tela de espera When uma pessoa entra no quadro, fica nele ou sai e volta Then nada acontece: o jogo continua na tela de espera, sem calibração e sem partida. A câmera nunca inicia nada sozinha.
- [ ] **AC-1.2** Given a tela de calibração When a pessoa permanece na área central por 2 s contínuos Then a partida começa e o primeiro card aparece com o cronômetro no tempo por card configurado (padrão 15 s, FR-9).
- [ ] **AC-1.3** Given a tela de calibração When a pessoa sai da área central antes de 2 s Then a contagem de calibração reinicia do zero.
- [ ] **AC-1.4** Given a tela de calibração When ninguém é detectado por 10 s Then o jogo volta à tela de espera e permanece nela, mesmo que alguém entre no quadro depois (AC-1.1).
- [ ] **AC-1.5** Given há duas ou mais pessoas no quadro When a calibração ou a partida acontece Then apenas a pessoa mais central e maior no quadro controla o jogo, e os movimentos das demais não geram escolhas.
- [ ] **AC-1.6** Given a tela de espera, há notícias publicadas e a câmera está indisponível ou não foi autorizada When o operador pressiona Enter (ou clica em "▶ Iniciar") Then a partida começa na hora, sem calibração, controlada por teclado e mouse/toque.
- [ ] **AC-1.7** Given a tela de espera, há notícias publicadas e a câmera está ativa When o operador pressiona Enter (ou clica em "▶ Iniciar") Then abre a calibração com a instrução "Fique no centro" (AC-1.2), e a partida só começa depois de 2 s contínuos na área central.
- [ ] **AC-1.8** Given a tela de calibração When o operador pressiona Enter Then a calibração é pulada e a partida começa na hora, controlada por teclado e mouse/toque (AC-1.6).

### Story 2: Escolher match ou descarte com o corpo

**As a** jogador
**I want** dar match ou descartar um card deslocando o corpo para um lado
**So that** eu jogue de forma divertida e visível para quem está assistindo

**Acceptance criteria:**

- [ ] **AC-2.1** Given um card está na tela When o jogador desloca o tronco para a **própria direita** além do limiar e se mantém por ~300 ms Then o card é registrado como "match" (resposta "verdadeira") e sai pela direita da tela.
- [ ] **AC-2.2** Given um card está na tela When o jogador desloca o tronco para a **própria esquerda** além do limiar e se mantém por ~300 ms Then o card é registrado como "descarte" (resposta "falsa") e sai pela esquerda da tela.
- [ ] **AC-2.3** Given um card está na tela When o jogador se move (inclina o tronco, mexe os braços ou a cabeça) sem completar um gesto Then o card fica parado, sem inclinar nem tremer, e nenhuma escolha é registrada; ele só se move ao sair pela direita ou pela esquerda depois de uma escolha (AC-2.1, AC-2.2).
- [ ] **AC-2.4** Given o jogador acabou de fazer uma escolha When o próximo card aparece e o jogador ainda está deslocado para um lado Then nenhuma nova escolha é aceita até ele voltar à área central.
- [ ] **AC-2.5** Given um card está na tela When o operador pressiona → ou ← (ou arrasta o card com mouse/toque para a direita ou esquerda) Then o resultado é o mesmo de AC-2.1 ou AC-2.2, respectivamente.
- [ ] **AC-2.6** Given a câmera está ativa durante a partida When o jogador olha para a tela Then ele vê uma prévia pequena e espelhada de si mesmo com o esqueleto detectado desenhado por cima.

### Story 3: Ver "saiba mais" antes de decidir

**As a** jogador em dúvida
**I want** abrir o texto completo de uma notícia
**So that** eu tenha mais pistas antes de escolher

**Acceptance criteria:**

- [ ] **AC-3.1** Given um card está na tela When o jogador mantém os dois punhos acima da cabeça (acima do nariz) por ~500 ms Then o texto "saiba mais" do card é exibido e o cronômetro continua correndo, com a barra de tempo diminuindo normalmente (AC-4.6, AC-4.7).
- [ ] **AC-3.2** Given o "saiba mais" está aberto When o jogador repete o gesto de duas mãos para cima (ou o operador pressiona ↑) Then o "saiba mais" fecha e o cronômetro segue do ponto em que está, sem ter parado.
- [ ] **AC-3.3** Given o "saiba mais" está aberto When o jogador faz o gesto de match ou de descarte Then o "saiba mais" fecha e a escolha é registrada normalmente.
- [ ] **AC-3.4** Given um card está na tela When o operador pressiona ↑ Then o resultado é o mesmo de AC-3.1.

> AC-3.5 (o "saiba mais" fechar sozinho após 5 s) foi removido na v5.0.0 e o número não é reutilizado. O "saiba mais" só fecha por AC-3.2, AC-3.3 ou quando o tempo esgota (AC-4.3).

### Story 4: Aprender com cada resposta

**As a** jogador
**I want** saber logo depois de cada card se acertei e por quê
**So that** eu aprenda a técnica de checagem, não só o resultado

**Acceptance criteria:**

- [ ] **AC-4.1** Given o jogador escolheu um card When a escolha corresponde ao veredito da notícia Then aparece por 3 s o selo "Acertou!" com o veredito (verdadeira/falsa), a explicação e a técnica de checagem da notícia, e o placar soma +1.
- [ ] **AC-4.2** Given o jogador escolheu um card When a escolha não corresponde ao veredito Then aparece por 3 s o selo "Errou" com o veredito, a explicação e a técnica, e o placar não muda.
- [ ] **AC-4.3** Given um card está na tela When o cronômetro chega a 0 sem escolha Then aparece por 3 s o selo "Tempo esgotado" com o veredito, a explicação e a técnica, e o placar não muda.
- [ ] **AC-4.4** Given o feedback de um card terminou When ainda há cards na partida Then o próximo card aparece com o cronômetro no tempo por card configurado.
- [ ] **AC-4.5** Given um card está na tela (parado ou saindo) When a tela tem 1366×768 ou 1920×1080 Then o card fica centralizado na vertical: o centro do card fica a no máximo 8 px do centro da área de jogo, que é a tela menos a barra de tempo (AC-4.6), sem cortar texto (FR-4) e sem ficar atrás da barra.
- [ ] **AC-4.6** Given um card está na tela When o tempo passa Then uma barra de tempo grossa, com a largura da tela e colada na base, diminui da direita para a esquerda na proporção do tempo restante e mostra dentro dela os segundos restantes (por exemplo, "12 s"); não há mais número de tempo em cima do card.
- [ ] **AC-4.7** Given um card está na tela com o cronômetro correndo (inclusive com o "saiba mais" aberto) When faltam 5 s ou menos Then a barra fica vermelha e o card ganha borda e brilho vermelhos que pulsam cerca de 1 vez por segundo, crescendo levemente; com o cronômetro pausado ("Volte para o centro") o card não pulsa.

### Story 5: Ver o resumo e liberar o estande

**As a** jogador que terminou a partida
**I want** ver como fui e o que aprendi
**So that** eu saia sabendo o que praticar, e a fila ande

**Acceptance criteria:**

- [ ] **AC-5.1** Given o último card da partida teve seu feedback concluído When a partida termina Then a tela de resumo mostra os pontos no formato "N de M" e a lista das técnicas de checagem que apareceram na partida, sem repetição.
- [ ] **AC-5.2** Given a tela de resumo está aberta When o tempo passa sem ação do operador Then o resumo continua na tela, sem limite de tempo, mesmo que o jogador saia do quadro.
- [ ] **AC-5.6** Given a tela de resumo está aberta When o operador pressiona Enter (iniciar nova partida) Then o resumo fecha, nada da partida anterior é guardado e o jogo vai para a calibração da nova partida (ou inicia direto pela entrada alternativa, se a câmera estiver indisponível).
- [ ] **AC-5.3** Given uma partida está em andamento When ninguém é detectado na câmera Then o cronômetro pausa e aparece a mensagem "Volte para o centro".
- [ ] **AC-5.4** Given a mensagem "Volte para o centro" está na tela When a pessoa volta ao quadro antes de 10 s Then a partida continua do mesmo card, com o cronômetro retomando de onde parou.
- [ ] **AC-5.5** Given a mensagem "Volte para o centro" está na tela When se passam 10 s sem ninguém no quadro Then a partida é encerrada sem resumo e o jogo volta à tela de espera e permanece nela, mesmo que a pessoa volte ao quadro depois (AC-1.1).

### Story 6: Montar uma partida equilibrada

**As a** equipe de conteúdo
**I want** que cada partida tenha uma mistura justa de notícias verdadeiras e falsas
**So that** o jogador não ganhe chutando sempre o mesmo lado

**Acceptance criteria:**

- [ ] **AC-6.1** Given há pelo menos 5 notícias verdadeiras e 5 falsas publicadas When uma partida começa Then ela tem 10 cards, 5 verdadeiros e 5 falsos, sem repetição, em ordem aleatória.
- [ ] **AC-6.2** Given há menos de 5 notícias de um dos lados e pelo menos 10 publicadas no total When uma partida começa Then ela tem 10 cards, com todas as notícias do lado menor e o restante completado com o outro lado.
- [ ] **AC-6.3** Given há entre 1 e 9 notícias publicadas When uma partida começa Then ela usa todas as notícias disponíveis, em ordem aleatória.
- [ ] **AC-6.4** Given não há nenhuma notícia publicada When o jogo é aberto Then a tela de espera mostra "Nenhuma notícia publicada" e nenhuma partida pode começar.

### Story 7: Publicar notícias pela planilha

**As a** pessoa da equipe de conteúdo, não programadora
**I want** cadastrar notícias numa planilha e publicá-las com um clique
**So that** o jogo tenha conteúdo novo sem depender de programador

**Acceptance criteria:**

- [ ] **AC-7.1** Given a planilha de conteúdo está aberta When a pessoa preenche uma linha Then as colunas `veredito`, `tecnica` e `status` só aceitam os valores das listas (`verdadeira`/`falsa`; `fonte`/`data`/`imagem`/`contexto`; `rascunho`/`aprovada`), e cada campo obrigatório vazio aparece destacado.
- [ ] **AC-7.2** Given a planilha tem linhas com `status = aprovada` e todos os campos obrigatórios preenchidos When a pessoa escolhe o menu "Publicar no jogo" Then a planilha confirma que a publicação foi iniciada e, quando ela termina, essas notícias estão no jogo publicado.
- [ ] **AC-7.3** Given uma linha com `status = rascunho`, ou sem `fonte_url`, sem `revisado_por`, com imagem inacessível ou com qualquer campo obrigatório vazio When a publicação roda Then essa notícia não entra no jogo e aparece no resumo da publicação com o `id` e o motivo.
- [ ] **AC-7.4** Given a publicação terminou When o notebook do estande abre ou recarrega o jogo com internet Then em até ~10 min o jogo passa a mostrar o conteúdo novo, sem nenhuma ação técnica.
- [ ] **AC-7.5** Given a publicação falhou (por exemplo, planilha inacessível) When a pessoa consulta o resumo da publicação Then vê a mensagem de erro, e o jogo publicado continua com o conteúdo anterior.

### Story 8: Jogar offline no estande

**As a** operador do estande
**I want** que o jogo funcione mesmo sem internet
**So that** a queda do Wi-Fi do evento não pare o estande

**Acceptance criteria:**

- [ ] **AC-8.1** Given o jogo foi aberto online uma vez depois da última publicação When o notebook fica sem internet e o operador abre o jogo Then uma partida completa roda com todas as imagens e com a detecção de movimento funcionando.
- [ ] **AC-8.2** Given o navegador do notebook oferece instalação When o operador instala o jogo Then ele abre por um ícone, em janela própria e em tela cheia, sem barra de endereço.
- [ ] **AC-8.3** Given o jogo está aberto sem internet When o operador recarrega a página Then o jogo volta a abrir normalmente, sem tela de erro de conexão.

### Story 9: Configurar o jogo — modo acessível, tempo e som (reescrito v2.0.0)

**As a** operador do estande
**I want** um menu de configurações com o modo de jogo (Corpo, Mão, Cabeça), o tempo por card e o som
**So that** jogadores com baixa mobilidade ou leitura mais lenta também consigam jogar, e o estande se adapte ao ambiente

**Acceptance criteria:**

- [ ] **AC-9.1** Given o jogo está na tela de espera When o operador pressiona M (ou clica em "⚙ Configurações") Then abre o menu "Configurações" com três itens e os valores atuais marcados: "Modo de jogo" (Corpo, Mão, Cabeça), "Tempo por card" (10, 15, 20, 25 ou 30 s) e "Som" (Ligado, Desligado).
- [ ] **AC-9.2** Given o menu "Configurações" está aberto When o operador muda um valor (↑/↓ escolhem o item, ←/→ mudam o valor; ou clique no valor) Then o valor muda na hora, fica guardado, e a tela de espera passa a mostrar o resumo "Modo: <modo> · Tempo por card: <N> s · Som: <ligado|desligado>".
- [ ] **AC-9.3** Given o menu está aberto When o operador pressiona Esc, M ou Enter, ou clica em "Fechar" Then o menu fecha mantendo os valores escolhidos, e nenhuma partida começa.
- [ ] **AC-9.4** Given nada foi configurado antes neste notebook When o jogo é aberto Then as configurações são: modo Corpo, 15 s por card e som ligado.
- [ ] **AC-9.5** Given o operador mudou as configurações When o jogo é fechado e reaberto, inclusive sem internet Then as mesmas configurações continuam ativas.
- [ ] **AC-9.6** Given o jogo não está na tela de espera When o operador pressiona M Then nada acontece: as configurações só mudam entre partidas.
- [ ] **AC-9.7** Given o modo Mão e um card na tela When o jogador mantém a **própria mão direita** acima do ombro por ~300 ms Then o card é registrado como "match" e sai pela direita; com a **mão esquerda**, como "descarte" e sai pela esquerda.
- [ ] **AC-9.8** Given o modo Mão e um card na tela When o jogador mantém as duas mãos acima dos ombros por ~500 ms Then o "saiba mais" abre (ou fecha, se já estiver aberto) e nenhuma escolha é registrada.
- [ ] **AC-9.9** Given o modo Mão e o jogador acabou de fazer uma escolha When o próximo card aparece com a mão ainda levantada Then nenhuma nova escolha é aceita até ele baixar as duas mãos.
- [ ] **AC-9.10** Given o modo Cabeça e um card na tela When o jogador inclina a cabeça para o **próprio lado direito** (~15° em relação à posição registrada na calibração) e mantém por ~300 ms Then o card é registrado como "match" e sai pela direita; para o lado esquerdo, como "descarte" e sai pela esquerda.
- [ ] **AC-9.11** Given o modo Cabeça e um card na tela When o jogador levanta o queixo (olha para cima) e mantém por ~500 ms Then o "saiba mais" abre (ou fecha, se já estiver aberto) e nenhuma escolha é registrada.
- [ ] **AC-9.12** Given o modo Cabeça e o jogador acabou de fazer uma escolha When o próximo card aparece com a cabeça ainda inclinada Then nenhuma nova escolha é aceita até ele voltar a cabeça ao centro.
- [ ] **AC-9.13** Given o modo Cabeça e um card na tela When o jogador inclina a cabeça sem atingir o limiar Then o card fica parado (AC-2.3) e nenhuma escolha é registrada.
- [ ] **AC-9.14** Given o modo Mão ou Cabeça When a tela de calibração ou um card aparece Then as instruções mostram os gestos do modo ativo: Mão — "Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais"; Cabeça — "Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais".
- [ ] **AC-9.15** Given o modo Mão ou Cabeça e um jogador sentado diante da câmera, com ombros e rosto visíveis When ele fica no centro por 2 s Then a calibração conclui e a partida começa.
- [ ] **AC-9.16** Given qualquer modo de jogo When o operador usa as setas, Enter ou o mouse/toque Then a entrada alternativa funciona exatamente como em FR-3.
- [ ] **AC-9.17** Given o tempo por card configurado em N s When um card aparece Then o cronômetro começa em N s e o tempo esgota depois de N s; no menu, ← em 10 s e → em 30 s não mudam o valor.

### Story 10: Iniciar e sair com um clique (adicionado v2.0.0)

**As a** operador do estande
**I want** botões para iniciar e para encerrar uma partida
**So that** eu controle a fila sem depender do teclado ou de esperar o fim da partida

**Acceptance criteria:**

- [ ] **AC-10.1** Given o jogo está na tela de espera e há notícias publicadas When o operador clica em "▶ Iniciar" Then acontece o mesmo que com Enter na espera (AC-1.6 sem câmera, AC-1.7 com câmera ativa).
- [ ] **AC-10.2** Given não há notícias publicadas When a tela de espera aparece Then o botão "▶ Iniciar" está desativado.
- [ ] **AC-10.3** Given o jogo está na calibração, num card (com ou sem "saiba mais"), no feedback ou no resumo When o operador clica em "✕ Sair" ou pressiona Esc Then a partida termina na hora, sem resumo, nada dela é guardado e o jogo volta à tela de espera e permanece nela, mesmo que o jogador continue no quadro (AC-1.1).
- [ ] **AC-10.4** Given a tela de espera, sem menu aberto When o operador pressiona Esc Then nada acontece.
- [ ] **AC-10.5** Given uma partida em andamento When o botão "✕ Sair" aparece Then ele fica num canto da tela, não cobre o card nem o texto da notícia (FR-4) e tem o nome acessível "Sair da partida".

### Story 11: Ouvir a escolha e o resultado (adicionado v2.0.0)

**As a** jogador
**I want** sons curtos quando escolho e quando vejo o resultado
**So that** o jogo fique mais divertido e o resultado chame a atenção do público

**Acceptance criteria:**

- [ ] **AC-11.1** Given o som está ligado When uma escolha é registrada (por gesto, tecla ou arraste) Then toca um som curto de "deslizar" enquanto o card sai.
- [ ] **AC-11.2** Given o som está ligado When o feedback "Acertou!" aparece Then toca um som positivo.
- [ ] **AC-11.3** Given o som está ligado When o feedback "Errou" ou "Tempo esgotado" aparece Then toca um som de erro, diferente do som positivo.
- [ ] **AC-11.4** Given o som está desligado nas configurações When qualquer escolha ou feedback acontece Then nenhum som toca.
- [ ] **AC-11.5** Given o jogo está sem internet When um som deve tocar Then ele toca normalmente: os sons não dependem de rede.

## Functional Requirements

### FR-1: Fluxo de estados da partida

O jogo passa por estes estados: espera → calibração → card → (saiba mais) → feedback → … → resumo → espera, além do estado "Volte para o centro" durante a partida.

**Must:**
- Começar a partida só por ação do operador: Enter ou "▶ Iniciar" na espera (AC-1.6, AC-1.7), ou Enter na calibração (AC-1.8). Com a câmera ativa, a partida só começa depois de 2 s contínuos de calibração, a menos que o operador pule a calibração.
- Ter o tempo por card configurado (padrão 15 s, FR-9), 3 s de feedback, e 10 s de tolerância sem pessoa no quadro.
- Encerrar a partida a qualquer momento pelo botão "✕ Sair" ou por Esc (FR-10).
- Manter o resumo na tela até o operador iniciar uma nova partida (Enter).
- Pausar o cronômetro do card só durante "Volte para o centro"; com o "saiba mais" aberto o cronômetro continua correndo.
- Manter o "saiba mais" aberto até o jogador fechá-lo (gesto ou ↑), fazer uma escolha ou o tempo esgotar; ele não fecha sozinho.

**Must not:**
- Iniciar a calibração ou a partida por causa da câmera: a presença de uma pessoa no quadro nunca tira o jogo da tela de espera.
- Guardar qualquer informação da partida depois de uma nova partida começar ou de o jogo voltar à tela de espera.
- Aceitar uma escolha durante o feedback, o resumo ou a calibração.

### FR-2: Entrada por movimento do corpo (modo Corpo)

Este é o modo padrão (FR-9). Os modos Mão e Cabeça estão em FR-9.

**Must:**
- Reconhecer três gestos: tronco deslocado para a própria direita (match), para a própria esquerda (descarte) e dois punhos acima do nariz (saiba mais), com os tempos de permanência de AC-2.1, AC-2.2 e AC-3.1.
- Tomar "direita" e "esquerda" do ponto de vista do jogador, coerentes com a prévia espelhada e com as setas do teclado.
- Medir o deslocamento em relação à posição central registrada na calibração da partida.
- Exigir retorno à área central entre duas escolhas.
- Seguir só a pessoa mais central e maior no quadro.
- Mostrar a prévia espelhada com esqueleto. O card não acompanha o movimento do jogador (AC-2.3).

**Must not:**
- Gravar, armazenar ou transmitir imagens ou vídeo da câmera.
- Registrar duas escolhas para um mesmo card.

### FR-3: Entrada alternativa

**Must:**
- Aceitar, a qualquer momento: → (match), ← (descarte), ↑ (abrir/fechar saiba mais), Enter (iniciar partida, inclusive a partir do resumo), e arrastar o card com mouse ou toque para a direita ou a esquerda.
- Permitir jogar uma partida inteira só com a entrada alternativa, inclusive quando a câmera não está disponível ou não foi autorizada.

### FR-4: Conteúdo do card e do feedback

**Must:**
- Mostrar no card: imagem, título e descrição curta da notícia, e uma indicação de como abrir o "saiba mais".
- Mostrar o tempo restante numa barra grande na base da tela, com os segundos dentro (AC-4.6), e destacar os últimos 5 s com a barra vermelha e o card pulsando em vermelho (AC-4.7).
- Mostrar no "saiba mais" o texto expandido da notícia.
- Mostrar no feedback, para todo resultado: selo ("Acertou!", "Errou", "Tempo esgotado"), veredito, explicação e técnica de checagem.
- Mostrar todos os textos em português do Brasil.
- Centralizar o card na vertical da área de jogo (a tela menos a barra de tempo), parado ou saindo (AC-4.5).

**Must not:**
- Cortar título ou descrição do card: todo o texto cadastrado aparece por inteiro numa tela de 1366×768 ou maior.

### FR-5: Pontuação e sorteio

**Must:**
- Somar +1 por acerto e 0 por erro ou tempo esgotado.
- Sortear os cards conforme AC-6.1 a AC-6.4, sem repetição dentro da partida.

### FR-6: Planilha de conteúdo

Uma linha por notícia, com as colunas: `id`, `titulo`, `descricao`, `saiba_mais`, `imagem` (link de compartilhamento de arquivo), `veredito`, `explicacao`, `tecnica`, `fonte_url`, `revisado_por`, `status`.

**Must:**
- Ter todas as colunas obrigatórias.
- Restringir `veredito`, `tecnica` e `status` às listas de valores de AC-7.1.
- Destacar visualmente campos obrigatórios vazios.
- Oferecer o menu "Publicar no jogo".

### FR-7: Publicação e validação do conteúdo

**Must:**
- Publicar apenas linhas com `status = aprovada` e todos os campos obrigatórios preenchidos, com `fonte_url` sendo um link válido e a imagem acessível.
- Listar no resumo da publicação cada linha descartada, com `id` e motivo.
- Embutir no jogo publicado as imagens das notícias, de forma que elas não dependam do serviço de origem durante o jogo.
- Manter o conteúdo anteriormente publicado se a publicação falhar.

**Must not:**
- Publicar notícia com `id` duplicado: todas as linhas com o mesmo `id` são descartadas e listadas no resumo.
- Exigir que a pessoa de conteúdo edite código ou arquivos do jogo.

### FR-8: Instalação e funcionamento offline

**Must:**
- Ser instalável no navegador do notebook e abrir em janela própria.
- Funcionar sem internet, com app, notícias, imagens e detecção de movimento, depois de uma abertura online.
- Atualizar sozinho para a versão publicada mais recente quando aberto com internet.

### FR-9: Configurações do estande — modos acessíveis, tempo e som (reescrito v2.0.0)

**Must:**
- Oferecer, na tela de espera, o menu "Configurações" (tecla M ou botão "⚙ Configurações") com três itens:
  - "Modo de jogo": Corpo (padrão, FR-2), Mão ou Cabeça.
  - "Tempo por card": 10, 15 (padrão), 20, 25 ou 30 s.
  - "Som": Ligado (padrão) ou Desligado.
- Navegar no menu com ↑/↓ (item) e ←/→ (valor), ou com clique; fechar com Esc, M, Enter ou "Fechar", sem iniciar partida.
- Mostrar na tela de espera o resumo "Modo: <modo> · Tempo por card: <N> s · Som: <ligado|desligado>".
- Aplicar o tempo por card a todos os cards da partida (AC-1.2, AC-4.4, AC-9.17).
- Guardar as três configurações no próprio notebook e reaplicá-las ao reabrir o jogo, inclusive offline; valor ausente ou inválido usa o padrão daquele item.
- Modo Mão: própria mão direita acima do ombro (~300 ms) = match; mão esquerda = descarte; as duas mãos acima dos ombros (~500 ms) = saiba mais; exigir baixar as mãos entre duas escolhas.
- Modo Cabeça: inclinar a cabeça para o próprio lado direito (~15°, medido em relação à calibração, ~300 ms) = match; para o esquerdo = descarte; levantar o queixo (~500 ms) = saiba mais; exigir voltar a cabeça ao centro entre duas escolhas; manter o card parado até a escolha (AC-2.3, AC-9.13).
- Nos modos Mão e Cabeça, detectar presença e centralização pela parte de cima do corpo (ombros e rosto), para que um jogador sentado consiga calibrar.
- Mostrar nas instruções da calibração e do card os gestos do modo ativo (AC-9.14).
- Manter, em todos os modos, a entrada alternativa (FR-3), os demais tempos (FR-1), a pontuação e o sorteio (FR-5) e a seleção da pessoa mais central e maior no quadro (FR-2).
- Ignorar a câmera (presença e gestos) enquanto o menu estiver aberto.

**Must not:**
- Mudar qualquer configuração durante uma partida.
- Guardar no notebook qualquer coisa além das três configurações.
- Usar outra fonte de imagem além da câmera já autorizada, nem enviar imagens para fora do notebook.

### FR-10: Iniciar e sair (adicionado v2.0.0)

**Must:**
- Mostrar na tela de espera o botão "▶ Iniciar", com o mesmo efeito de Enter na espera (AC-1.6, AC-1.7), desativado quando não há notícias.
- Mostrar durante a calibração, o card, o feedback e o resumo o botão "✕ Sair" (nome acessível "Sair da partida"), num canto da tela, sem cobrir o card.
- Encerrar a partida na hora com "✕ Sair" ou Esc, sem resumo, e voltar à tela de espera.

**Must not:**
- Guardar qualquer informação da partida encerrada.
- Pedir confirmação para sair.

### FR-11: Sons (adicionado v2.0.0)

**Must:**
- Tocar um som curto de "deslizar" quando uma escolha é registrada, por qualquer entrada.
- Tocar um som positivo quando o feedback "Acertou!" aparece, e um som de erro, diferente, quando aparece "Errou" ou "Tempo esgotado".
- Gerar os sons no próprio jogo, sem baixar arquivos nem depender de rede.
- Respeitar a configuração "Som: Desligado" (FR-9).

**Must not:**
- Tocar sons fora desses três momentos (sem música de fundo).
- Atrasar a troca de tela por causa de um som.

## Non-Functional Requirements

### Performance

- O gesto é confirmado em até 1 s depois de o jogador atingir a posição (já contando o tempo de permanência), num notebook comum com webcam de 720p, em qualquer modo de jogo.
- A prévia da câmera e a barra de tempo atualizam a pelo menos 15 quadros por segundo nesse notebook.
- Com o conteúdo já em cache, o jogo vai do clique no ícone à tela de espera em até 5 s.
- A transição de um card para o próximo (depois do feedback) leva menos de 300 ms, sem imagem carregando visivelmente.

### Security

- Nenhuma requisição de rede contém imagem ou vídeo da câmera ou dados do jogador, o que é verificável pelo registro de rede do navegador durante uma partida.
- O jogo não usa cookies, rastreadores nem scripts de análise de terceiros.
- O acesso de leitura à planilha e o direito de disparar a publicação ficam em credenciais guardadas fora do código do jogo. O jogo publicado não contém nenhuma credencial.
- A câmera só é ativada depois de o navegador pedir e o operador autorizar.

### Reliability

- Uma queda de internet durante a partida não interrompe nem altera a partida.
- Se a câmera ficar indisponível durante a partida, o jogo mostra o aviso "Câmera indisponível — use as setas" e continua aceitando a entrada alternativa.
- O jogo roda 8 h seguidas de evento, com partidas consecutivas, sem precisar ser reaberto.

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Operador nega a permissão da câmera | A tela de espera mostra "Câmera desativada — jogue pelas setas (Enter para começar)"; o jogo funciona só com a entrada alternativa. |
| Nenhuma webcam no notebook | Mesmo comportamento da permissão negada. |
| Câmera desconectada no meio da partida | Aviso "Câmera indisponível — use as setas"; a partida continua e o cronômetro não pausa. |
| Jogador sai do quadro durante a partida | Pausa com "Volte para o centro"; retoma se ele voltar em até 10 s; senão encerra sem resumo e volta à espera (AC-5.3 a AC-5.5). |
| Iluminação ruim impede a detecção | A calibração não conclui e a mensagem "Fique no centro" continua; o operador pressiona Enter para pular a calibração e joga pelas setas (AC-1.8). |
| Jogador sai do quadro, partida termina ou operador usa Sair, e alguém continua no quadro | O jogo fica na tela de espera até o operador iniciar de novo (AC-1.1, AC-10.3). |
| Várias pessoas no quadro | Só a pessoa mais central e maior controla (AC-1.5). |
| Nenhuma notícia publicada | Tela de espera com "Nenhuma notícia publicada"; não inicia partida (AC-6.4). |
| Linha da planilha incompleta, em rascunho, com `id` duplicado ou com imagem inacessível | A linha não é publicada e aparece no resumo com o motivo (AC-7.3, FR-7). |
| Planilha inacessível na publicação | A publicação falha com mensagem no resumo; o jogo publicado continua com o conteúdo anterior (AC-7.5). |
| Jogo aberto offline antes de qualquer abertura online | Tela "Conecte à internet uma vez para baixar o jogo". |
| Jogo offline com versão antiga | Joga normalmente com o conteúdo em cache; atualiza na próxima abertura online. |
| Configuração guardada ausente, inválida ou armazenamento do navegador indisponível | O jogo abre com o padrão daquele item (Corpo, 15 s, som ligado); o menu continua funcionando, e a escolha vale até o jogo ser fechado. |
| Navegador bloqueia o som até a primeira interação com a página | O jogo funciona normalmente, sem som, até o primeiro clique ou tecla; a partir daí os sons tocam (o operador clica uma vez ao abrir o jogo). |
| No modo Mão ou Cabeça, o jogador não consegue fazer o gesto | O operador troca o modo entre partidas, ou joga pelas setas (FR-3). |

## Open Questions

Nenhuma pendente. Decisões que o PRD não fixava, confirmadas pela responsável pelo projeto em 2026-10-26:
- (Substituída na v5.0.0) O "saiba mais" fechava sozinho após 5 s sem gesto nem tecla; deixou de existir.
- O resumo fica na tela até o operador iniciar uma nova partida com Enter (AC-5.2, AC-5.6).
- A partida pode começar por Enter, sem câmera (AC-1.6).
- A tela de referência é 1366×768 (FR-4).
- Linhas com `id` duplicado são descartadas (FR-7).
- A meta de 8 h de operação contínua (Reliability).

Decisões da v1.1.0, confirmadas pela responsável pelo projeto em 2026-10-27:
- Mão e Cabeça são dois modos separados, além de Corpo (padrão).
- Modo Mão: mão direita = match, esquerda = descarte, as duas = saiba mais.
- Modo Cabeça: inclinar para direita/esquerda; levantar o queixo = saiba mais.
- O operador escolhe o modo, e a escolha vale até ser trocada.
- Os limiares (~15° de inclinação, "acima do ombro") e os tempos de permanência são pontos de partida, ajustados no teste com pessoas reais (Fase 7).

Decisões da v2.0.0, confirmadas pela responsável pelo projeto em 2026-10-27:
- O menu passa a se chamar "Configurações" e reúne modo de jogo, tempo por card (10–30 s, de 5 em 5, padrão 15 s) e som (ligado/desligado, padrão ligado).
- "▶ Iniciar" faz o mesmo que Enter; "✕ Sair" (ou Esc) encerra a partida na hora, sem confirmação e sem resumo.
- Sons: deslizar na escolha; positivo no acerto; erro no erro e no tempo esgotado.
- O card fica centralizado na vertical.

Decisões da v3.0.0, confirmadas pela responsável pelo projeto em 2026-10-27:
- A câmera nunca inicia a partida: só "▶ Iniciar" ou Enter (AC-1.1).
- Com câmera ativa, Iniciar/Enter leva à calibração de 2 s e depois à partida (AC-1.7); sem câmera, começa direto (AC-1.6).
- Enter na calibração pula a calibração e joga pelas setas (AC-1.8): mantém o caminho para iluminação ruim.
- Depois de Sair, do fim por ausência de 10 s ou da calibração sem ninguém, o jogo fica na espera.

Decisões da v4.0.0, confirmadas pela responsável pelo projeto em 2026-10-27:
- O card fica parado até a escolha: não inclina com o corpo nem com a cabeça. O rastreio da câmera e os gestos não mudam.
- O cronômetro vira uma barra grossa na base da tela, com os segundos dentro; o número em cima do card sai.
- Nos últimos 5 s: barra vermelha e card com borda e brilho vermelhos pulsando (~1 vez/s, crescendo levemente); pausado, não pulsa.

Decisões da v5.0.0, confirmadas pela responsável pelo projeto em 2026-10-28:
- O tempo do card continua correndo com o "saiba mais" aberto: ler mais informação custa tempo.
- O "saiba mais" não fecha mais sozinho: fecha por gesto, ↑, escolha ou tempo esgotado.
- Só "Volte para o centro" pausa o cronômetro.

## Out of Scope (Future Considerations)

- Ranking (do dia ou on-line), apelidos e contas.
- Modo celular individual e modo sala de aula.
- Gestos de dedo (por exemplo, joinha ou mão aberta).
- Ajuste de sensibilidade dos gestos pelo menu, ou modos além de Corpo, Mão e Cabeça.
- Volume ajustável, música de fundo ou sons escolhidos pelo operador.
- Configurar número de cards, tempo de feedback ou outros tempos além do tempo por card.
- Relatório de validação escrito de volta na planilha.
- Configuração editável de número de cards e tempos pela planilha.
- Telemetria e estatísticas de uso.
- CMS próprio ou painel administrativo.
