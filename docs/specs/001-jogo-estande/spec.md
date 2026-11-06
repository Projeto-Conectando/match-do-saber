# Feature 001: Match do Saber — jogo de estande (MVP)

**Status:** Approved
**Version:** 8.2.0
**Created:** 2026-10-26
**Last Updated:** 2026-11-06
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
| 5.1.0 | 2026-10-28 | Configurações no canto superior direito: o botão vira "⚙" fixo no canto superior direito da tela de espera (AC-9.1) e o menu abre como painel lateral à direita (novo AC-9.18); o painel fecha também pelo "✕" (AC-9.3). Itens, teclas e regras do menu não mudam |
| 5.2.0 | 2026-10-28 | Adicionados Story 12 e FR-12: modo de diagnóstico, ligado só pelo endereço com `?diagnostico`, que mostra quadros por segundo, tempo de detecção da pose, pontos e confiança de pulsos, ombros e cabeça e os gestos recentes, e permite baixar um registro dos últimos 60 s. Serve para ajustar os limites dos gestos com dados do notebook real; o jogo normal não muda |
| 6.0.0 | 2026-10-29 | Modo Mão ganha mais dois jeitos de escolher o lado, além de levantar a mão: as duas mãos para um lado (AC-9.19) e arrastar uma mão do centro do peito para o lado (AC-9.20). A pausa por ausência (AC-5.3 a AC-5.5) passa a valer só no modo Corpo; nos modos Mão e Cabeça a partida ignora a ausência (AC-9.21). Causa: no modo Mão a câmera perdia a pessoa ao levantar a mão e a barra de tempo parava |
| 6.1.0 | 2026-10-29 | A dica de gestos do modo Mão (AC-9.14) passa a citar os três jeitos de escolher o lado da v6.0.0: levantar a mão, as duas mãos para o lado e arrastar para o lado. Os gestos não mudam |
| 7.0.0 | 2026-10-29 | Adicionados Story 13 e FR-13: o resumo mostra um card polaroid com uma foto da câmera tirada no meio da partida, guardada só na memória e apagada quando o resumo fecha. Reescritos a regra "Must not" de FR-2 (a foto do resumo é a única imagem da câmera guardada, só na memória), AC-9.1, AC-9.2, AC-9.4 e FR-9 (novo item "Foto no resumo" nas Configurações, ligado por padrão) |
| 7.1.0 | 2026-11-03 | Adicionado AC-5.7: o resumo mostra, abaixo do "N de M", uma mensagem conforme a proporção de acertos (de "Cuidado!" a "Imune a fake news!"); FR-5 ganha a regra das faixas |
| 8.0.0 | 2026-11-03 | O resumo deixa de mostrar a lista "Técnicas que você praticou": reescritos AC-5.1, AC-13.2 e FR-13. A técnica de cada notícia continua no feedback de cada card (AC-4.x) |
| 8.1.0 | 2026-11-03 | Modo Corpo ganha outro jeito de escolher o lado, além de deslocar o tronco: estender um braço para o lado (AC-2.7, AC-2.8). AC-2.4 passa a exigir também os braços de volta perto do corpo entre duas escolhas; AC-2.9 fixa a dica do modo Corpo; FR-2 ganha o gesto. Causa: no teste da responsável, a pessoa escolhia com os braços e o tronco ficava no centro, então nenhum card era escolhido |
| 8.2.0 | 2026-11-06 | Adicionado AC-4.8: o card ganha uma barra de tempo própria na parte de baixo, com os segundos, além da barra da base da tela (AC-4.6), que continua; FR-4 cita as duas barras |

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
- No fim da partida, o jogador vê um card polaroid com uma foto dele tirada no meio da partida; a foto some quando o resumo fecha.
- Jogadores com baixa mobilidade completam uma partida sem tocar no notebook, usando o modo Mão (levantar uma mão) ou o modo Cabeça (inclinar a cabeça), escolhido pelo operador.
- O operador ajusta o tempo por card ao público (de 10 a 30 s), liga ou desliga o som, e inicia ou encerra uma partida com um clique.

## Non-Goals

- Ranking, apelidos, contas de usuário ou qualquer dado de jogador salvo. (Os únicos valores guardados no notebook são as configurações do estande escolhidas pelo operador: modo de jogo, tempo por card, som e foto no resumo. Não são dados de jogador.)
- Levar a foto da partida: baixar, imprimir, enviar ou gerar QR code.
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
- [ ] **AC-2.4** Given o jogador acabou de fazer uma escolha When o próximo card aparece e o jogador ainda está deslocado para um lado ou com o braço estendido para um lado Then nenhuma nova escolha é aceita até ele voltar à área central com os dois punhos perto do corpo (a menos de 0,9 largura de ombro do meio do corpo).
- [ ] **AC-2.5** Given um card está na tela When o operador pressiona → ou ← (ou arrasta o card com mouse/toque para a direita ou esquerda) Then o resultado é o mesmo de AC-2.1 ou AC-2.2, respectivamente.
- [ ] **AC-2.6** Given a câmera está ativa durante a partida When o jogador olha para a tela Then ele vê uma prévia pequena e espelhada de si mesmo com o esqueleto detectado desenhado por cima.
- [ ] **AC-2.7** Given o modo Corpo e um card na tela When o jogador estende um braço (qualquer um, em qualquer altura) para o **próprio lado direito** até o punho passar de 1,2 largura de ombro do meio do corpo e segura por ~300 ms Then o card é registrado como "match" e sai pela direita; para o lado esquerdo, como "descarte" e sai pela esquerda. O tronco pode ficar no centro.
- [ ] **AC-2.8** Given o modo Corpo e um card na tela When os dois braços estão estendidos para lados opostos ao mesmo tempo, ou o tronco vai para um lado e o braço para o outro Then nenhuma escolha é registrada; com os dois punhos acima do nariz vale o "saiba mais" (AC-3.1), não uma escolha.
- [ ] **AC-2.9** Given o modo Corpo When a tela de calibração aparece Then a instrução mostra "Corpo ou braço para a direita: é verdade · Para a esquerda: é falsa · Duas mãos para cima: saiba mais".

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
- [ ] **AC-4.8** Given um card está na tela (inclusive com o "saiba mais" aberto) When o tempo passa Then, além da barra da base da tela (AC-4.6), o card mostra na parte de baixo, na largura do card, uma barra de tempo que diminui da direita para a esquerda na mesma proporção e mostra os mesmos segundos restantes (por exemplo, "12 s"); nos últimos 5 s ela fica vermelha junto com a barra da tela (AC-4.7). A barra do card não cobre título, descrição, imagem, dica nem o texto do "saiba mais", e o card continua cabendo na área de jogo (AC-4.5).

### Story 5: Ver o resumo e liberar o estande

**As a** jogador que terminou a partida
**I want** ver como fui
**So that** eu saia sabendo se preciso checar melhor as notícias, e a fila ande

**Acceptance criteria:**

- [ ] **AC-5.1** Given o último card da partida teve seu feedback concluído When a partida termina Then a tela de resumo mostra os pontos no formato "N de M" e a mensagem da faixa de acertos (AC-5.7). (Até a v7.1.0 mostrava também a lista das técnicas da partida; removida na v8.0.0.)
- [ ] **AC-5.7** Given a tela de resumo de uma partida com N acertos em M cards When ela aparece Then, logo abaixo do "N de M", aparece uma mensagem conforme a proporção N/M: menos de 0,5 (0 a 4 de 10) — "Cuidado! Você precisa verificar melhor as manchetes."; de 0,5 até menos de 0,8 (5 a 7 de 10) — "Você consegue se proteger, mas ainda pode melhorar."; de 0,8 até menos de 1 (8 e 9 de 10) — "Parabéns! Você checa muito bem as notícias."; todos certos (10 de 10) — "Imune a fake news!". A mensagem aparece com ou sem a foto (AC-13.2), sem cortar nada em 1366×768 (FR-4).
- [ ] **AC-5.2** Given a tela de resumo está aberta When o tempo passa sem ação do operador Then o resumo continua na tela, sem limite de tempo, mesmo que o jogador saia do quadro.
- [ ] **AC-5.6** Given a tela de resumo está aberta When o operador pressiona Enter (iniciar nova partida) Then o resumo fecha, nada da partida anterior é guardado e o jogo vai para a calibração da nova partida (ou inicia direto pela entrada alternativa, se a câmera estiver indisponível).
- [ ] **AC-5.3** Given uma partida no modo Corpo, iniciada pela calibração, está em andamento When ninguém é detectado na câmera Then o cronômetro pausa e aparece a mensagem "Volte para o centro".
- [ ] **AC-5.4** Given a mensagem "Volte para o centro" está na tela (só no modo Corpo, AC-5.3) When a pessoa volta ao quadro antes de 10 s Then a partida continua do mesmo card, com o cronômetro retomando de onde parou.
- [ ] **AC-5.5** Given a mensagem "Volte para o centro" está na tela (só no modo Corpo, AC-5.3) When se passam 10 s sem ninguém no quadro Then a partida é encerrada sem resumo e o jogo volta à tela de espera e permanece nela, mesmo que a pessoa volte ao quadro depois (AC-1.1).

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

- [ ] **AC-9.1** Given o jogo está na tela de espera When o operador pressiona M (ou clica no botão "⚙" fixo no canto superior direito da tela, de nome acessível "Configurações") Then abre o menu "Configurações" com quatro itens e os valores atuais marcados: "Modo de jogo" (Corpo, Mão, Cabeça), "Tempo por card" (10, 15, 20, 25 ou 30 s), "Som" (Ligado, Desligado) e "Foto no resumo" (Ligada, Desligada).
- [ ] **AC-9.2** Given o menu "Configurações" está aberto When o operador muda um valor (↑/↓ escolhem o item, ←/→ mudam o valor; ou clique no valor) Then o valor muda na hora, fica guardado, e a tela de espera passa a mostrar o resumo "Modo: <modo> · Tempo por card: <N> s · Som: <ligado|desligado> · Foto: <ligada|desligada>".
- [ ] **AC-9.3** Given o menu está aberto When o operador pressiona Esc, M ou Enter, ou clica no "✕" do painel (nome acessível "Fechar") Then o menu fecha mantendo os valores escolhidos, e nenhuma partida começa.
- [ ] **AC-9.4** Given nada foi configurado antes neste notebook When o jogo é aberto Then as configurações são: modo Corpo, 15 s por card, som ligado e foto no resumo ligada.
- [ ] **AC-9.5** Given o operador mudou as configurações When o jogo é fechado e reaberto, inclusive sem internet Then as mesmas configurações continuam ativas.
- [ ] **AC-9.6** Given o jogo não está na tela de espera When o operador pressiona M Then nada acontece: as configurações só mudam entre partidas.
- [ ] **AC-9.7** Given o modo Mão e um card na tela When o jogador mantém a **própria mão direita** acima do ombro por ~300 ms Then o card é registrado como "match" e sai pela direita; com a **mão esquerda**, como "descarte" e sai pela esquerda.
- [ ] **AC-9.8** Given o modo Mão e um card na tela When o jogador mantém as duas mãos acima dos ombros por ~500 ms Then o "saiba mais" abre (ou fecha, se já estiver aberto) e nenhuma escolha é registrada.
- [ ] **AC-9.9** Given o modo Mão e o jogador acabou de fazer uma escolha When o próximo card aparece com a mão ainda levantada Then nenhuma nova escolha é aceita até ele baixar as duas mãos.
- [ ] **AC-9.10** Given o modo Cabeça e um card na tela When o jogador inclina a cabeça para o **próprio lado direito** (~15° em relação à posição registrada na calibração) e mantém por ~300 ms Then o card é registrado como "match" e sai pela direita; para o lado esquerdo, como "descarte" e sai pela esquerda.
- [ ] **AC-9.11** Given o modo Cabeça e um card na tela When o jogador levanta o queixo (olha para cima) e mantém por ~500 ms Then o "saiba mais" abre (ou fecha, se já estiver aberto) e nenhuma escolha é registrada.
- [ ] **AC-9.12** Given o modo Cabeça e o jogador acabou de fazer uma escolha When o próximo card aparece com a cabeça ainda inclinada Then nenhuma nova escolha é aceita até ele voltar a cabeça ao centro.
- [ ] **AC-9.13** Given o modo Cabeça e um card na tela When o jogador inclina a cabeça sem atingir o limiar Then o card fica parado (AC-2.3) e nenhuma escolha é registrada.
- [ ] **AC-9.14** Given o modo Mão ou Cabeça When a tela de calibração ou um card aparece Then as instruções mostram os gestos do modo ativo: Mão — "É verdade: mão direita para cima, as duas mãos para a direita ou arraste para a direita · É falsa: o mesmo para a esquerda · Duas mãos para cima: saiba mais"; Cabeça — "Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais".
- [ ] **AC-9.15** Given o modo Mão ou Cabeça e um jogador sentado diante da câmera, com ombros e rosto visíveis When ele fica no centro por 2 s Then a calibração conclui e a partida começa.
- [ ] **AC-9.16** Given qualquer modo de jogo When o operador usa as setas, Enter ou o mouse/toque Then a entrada alternativa funciona exatamente como em FR-3.
- [ ] **AC-9.17** Given o tempo por card configurado em N s When um card aparece Then o cronômetro começa em N s e o tempo esgota depois de N s; no menu, ← em 10 s e → em 30 s não mudam o valor.
- [ ] **AC-9.18** Given a tela de espera When o menu "Configurações" abre Then ele aparece como um painel encostado na borda direita, com a altura da tela inteira e largura de até 26rem, sobre o restante da tela escurecido; o título "Configurações" e o "✕" ficam no topo do painel, e o botão "▶ Iniciar" continua no mesmo lugar.
- [ ] **AC-9.19** Given o modo Mão e um card na tela When o jogador leva as duas mãos juntas, abaixo da altura dos ombros, para o **próprio lado direito** até os dois punhos passarem da linha do ombro direito (mais de 0,5 largura de ombro do meio do corpo) e segura por ~300 ms Then o card é registrado como "match"; para o lado esquerdo, como "descarte".
- [ ] **AC-9.20** Given o modo Mão e um card na tela When o jogador arrasta uma mão (qualquer uma) do centro do peito (a menos de 0,5 largura de ombro do meio do corpo) para o **próprio lado direito**, andando pelo menos 1 largura de ombro em até ~0,8 s Then o card é registrado como "match"; para o lado esquerdo, como "descarte".
- [ ] **AC-9.21** Given o modo Mão ou Cabeça e uma partida iniciada pela calibração When a câmera deixa de detectar a pessoa por qualquer tempo durante o card Then o cronômetro continua correndo, "Volte para o centro" não aparece e a partida não é encerrada por ausência.
- [ ] **AC-9.22** Given o modo Mão e o jogador acabou de escolher por qualquer um dos três gestos (AC-9.7, AC-9.19, AC-9.20) When o próximo card aparece Then nenhuma nova escolha é aceita até ele baixar as mãos e desfazer a posição de "duas mãos para um lado"; uma nova escolha por arraste precisa partir de novo do centro do peito.

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


### Story 12: Medir o rastreio no notebook real (adicionado v5.2.0)

**As a** equipe técnica
**I want** ver e registrar, no notebook do estande, o desempenho da detecção de pose e o que ela enxerga das mãos e da cabeça
**So that** os limites dos gestos sejam ajustados com dados reais, e não por tentativa

**Acceptance criteria:**

- [ ] **AC-12.1** Given o jogo é aberto sem `?diagnostico` no endereço When qualquer tela aparece Then nenhum painel de diagnóstico é mostrado e nada é registrado.
- [ ] **AC-12.2** Given o jogo é aberto com `?diagnostico` no endereço When qualquer tela aparece Then um painel "Diagnóstico" aparece no canto superior esquerdo, abaixo do lugar do "✕ Sair", sem cobrir o card (FR-4), e se atualiza pelo menos 2 vezes por segundo.
- [ ] **AC-12.3** Given o painel de diagnóstico está na tela When a câmera está ativa Then ele mostra: quadros por segundo do último segundo; tempo médio e máximo da detecção de pose no último segundo, em ms; número de pessoas detectadas; modo de jogo e tela atuais; para punho direito, punho esquerdo, ombro direito e ombro esquerdo, a altura (y) e a confiança; se cada mão está acima do ombro pela regra do modo Mão e o deslocamento lateral de cada punho, em larguras de ombro; a inclinação da cabeça em graus e a medida do queixo; e os gestos reconhecidos nos últimos 5 s. Sem câmera, a linha da detecção mostra "sem câmera".
- [ ] **AC-12.4** Given o painel de diagnóstico está na tela When o operador clica em "Baixar registro (60 s)" Then o navegador salva no notebook um arquivo `match-do-saber-diagnostico-<data e hora>.json` com as medições, quadro a quadro, dos últimos 60 s: horário, intervalo do quadro, tempo de detecção, pessoas, modo, tela, os pontos nariz, orelhas, ombros e punhos (x, y, confiança), as medidas das mãos e da cabeça e os gestos reconhecidos.
- [ ] **AC-12.5** Given o modo de diagnóstico está ligado When o jogo roda Then nenhuma medição sai do notebook nem fica guardada no navegador; o arquivo só existe se o operador clicar em "Baixar registro", e nenhuma imagem da câmera entra no registro.
- [ ] **AC-12.6** Given o modo de diagnóstico está ligado When uma partida acontece Then o jogo se comporta exatamente como sem ele: mesmos tempos, gestos, pontos e telas.

### Story 13: Ver minha foto no fim da partida (adicionado v7.0.0)

**As a** jogador
**I want** ver no resumo uma foto minha jogando, no estilo de um card polaroid
**So that** o fim da partida fique mais divertido e dê vontade de jogar de novo

**Acceptance criteria:**

- [ ] **AC-13.1** Given a câmera está ativa e "Foto no resumo" está Ligada When a escolha (ou o tempo esgotado) do card do meio da partida é registrada (o card ⌈M/2⌉, ou seja, o 5º numa partida de 10) Then o jogo guarda na memória um quadro da câmera daquele instante, sem som, aviso ou pausa.
- [ ] **AC-13.2** Given uma foto foi guardada na partida When a tela de resumo aparece Then, junto com os pontos e a mensagem (AC-5.1, AC-5.7), aparece um card no estilo polaroid com a foto, espelhada como a prévia (AC-2.6) e sem o esqueleto, e a faixa "Match do Saber · N de M"; nada do resumo fica cortado ou coberto em 1366×768 (FR-4).
- [ ] **AC-13.3** Given a câmera estava indisponível ou não autorizada no card do meio, "Foto no resumo" está Desligada, ou a captura falhou When a tela de resumo aparece Then ela fica como sem a foto (AC-5.1): sem polaroid e sem espaço vazio no lugar dele.
- [ ] **AC-13.4** Given há uma foto guardada When o operador inicia uma nova partida pelo resumo (Enter), usa "✕ Sair" ou Esc, ou a partida termina sem resumo Then a foto é apagada da memória e não aparece em nenhuma partida seguinte.
- [ ] **AC-13.5** Given "Foto no resumo" está Ligada When uma partida acontece, com ou sem `?diagnostico` Then a foto não aparece em nenhuma requisição de rede, no armazenamento do navegador nem no registro do diagnóstico.

## Functional Requirements

### FR-1: Fluxo de estados da partida

O jogo passa por estes estados: espera → calibração → card → (saiba mais) → feedback → … → resumo → espera, além do estado "Volte para o centro" durante a partida.

**Must:**
- Começar a partida só por ação do operador: Enter ou "▶ Iniciar" na espera (AC-1.6, AC-1.7), ou Enter na calibração (AC-1.8). Com a câmera ativa, a partida só começa depois de 2 s contínuos de calibração, a menos que o operador pule a calibração.
- Ter o tempo por card configurado (padrão 15 s, FR-9), 3 s de feedback, e 10 s de tolerância sem pessoa no quadro.
- Encerrar a partida a qualquer momento pelo botão "✕ Sair" ou por Esc (FR-10).
- Manter o resumo na tela até o operador iniciar uma nova partida (Enter).
- Pausar o cronômetro do card só durante "Volte para o centro", e só no modo Corpo (AC-5.3, AC-9.21); com o "saiba mais" aberto o cronômetro continua correndo.
- Manter o "saiba mais" aberto até o jogador fechá-lo (gesto ou ↑), fazer uma escolha ou o tempo esgotar; ele não fecha sozinho.

**Must not:**
- Iniciar a calibração ou a partida por causa da câmera: a presença de uma pessoa no quadro nunca tira o jogo da tela de espera.
- Guardar qualquer informação da partida depois de uma nova partida começar ou de o jogo voltar à tela de espera.
- Aceitar uma escolha durante o feedback, o resumo ou a calibração.

### FR-2: Entrada por movimento do corpo (modo Corpo)

Este é o modo padrão (FR-9). Os modos Mão e Cabeça estão em FR-9.

**Must:**
- Reconhecer três gestos: tronco deslocado para a própria direita (match), para a própria esquerda (descarte) e dois punhos acima do nariz (saiba mais), com os tempos de permanência de AC-2.1, AC-2.2 e AC-3.1.
- Aceitar também um braço estendido para o lado como match ou descarte (AC-2.7), medido em larguras de ombro a partir do meio do corpo, sem depender da calibração; sinais contrários de tronco e braço, ou de um braço para cada lado, não escolhem (AC-2.8).
- Tomar "direita" e "esquerda" do ponto de vista do jogador, coerentes com a prévia espelhada e com as setas do teclado.
- Medir o deslocamento em relação à posição central registrada na calibração da partida.
- Exigir retorno à área central, com os dois punhos perto do corpo, entre duas escolhas (AC-2.4).
- Seguir só a pessoa mais central e maior no quadro.
- Mostrar a prévia espelhada com esqueleto. O card não acompanha o movimento do jogador (AC-2.3).

**Must not:**
- Gravar ou transmitir imagens ou vídeo da câmera, ou guardá-los em disco ou no navegador. A única imagem da câmera guardada é a foto do resumo (FR-13), só na memória e só até o resumo fechar.
- Registrar duas escolhas para um mesmo card.

### FR-3: Entrada alternativa

**Must:**
- Aceitar, a qualquer momento: → (match), ← (descarte), ↑ (abrir/fechar saiba mais), Enter (iniciar partida, inclusive a partir do resumo), e arrastar o card com mouse ou toque para a direita ou a esquerda.
- Permitir jogar uma partida inteira só com a entrada alternativa, inclusive quando a câmera não está disponível ou não foi autorizada.

### FR-4: Conteúdo do card e do feedback

**Must:**
- Mostrar no card: imagem, título e descrição curta da notícia, e uma indicação de como abrir o "saiba mais".
- Mostrar o tempo restante numa barra grande na base da tela, com os segundos dentro (AC-4.6), e também numa barra na parte de baixo do card, com os mesmos segundos (AC-4.8); destacar os últimos 5 s com as duas barras vermelhas e o card pulsando em vermelho (AC-4.7).
- Mostrar no "saiba mais" o texto expandido da notícia.
- Mostrar no feedback, para todo resultado: selo ("Acertou!", "Errou", "Tempo esgotado"), veredito, explicação e técnica de checagem.
- Mostrar todos os textos em português do Brasil.
- Centralizar o card na vertical da área de jogo (a tela menos a barra de tempo), parado ou saindo (AC-4.5).

**Must not:**
- Cortar título ou descrição do card: todo o texto cadastrado aparece por inteiro numa tela de 1366×768 ou maior.

### FR-5: Pontuação e sorteio

**Must:**
- Somar +1 por acerto e 0 por erro ou tempo esgotado.
- Escolher a mensagem do resumo pela proporção de acertos N/M (AC-5.7): < 0,5, de 0,5 a < 0,8, de 0,8 a < 1, e 1. Assim uma partida com menos de 10 cards usa as mesmas faixas, e "Imune a fake news!" só aparece com todos certos.
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
- Oferecer, na tela de espera, o menu "Configurações" (tecla M ou botão "⚙" no canto superior direito, de nome acessível "Configurações"), aberto como painel lateral à direita (AC-9.18), com quatro itens:
  - "Modo de jogo": Corpo (padrão, FR-2), Mão ou Cabeça.
  - "Tempo por card": 10, 15 (padrão), 20, 25 ou 30 s.
  - "Som": Ligado (padrão) ou Desligado.
  - "Foto no resumo": Ligada (padrão) ou Desligada (FR-13).
- Navegar no menu com ↑/↓ (item) e ←/→ (valor), ou com clique; fechar com Esc, M, Enter ou o "✕" do painel ("Fechar"), sem iniciar partida.
- Mostrar na tela de espera o resumo "Modo: <modo> · Tempo por card: <N> s · Som: <ligado|desligado> · Foto: <ligada|desligada>".
- Aplicar o tempo por card a todos os cards da partida (AC-1.2, AC-4.4, AC-9.17).
- Guardar as quatro configurações no próprio notebook e reaplicá-las ao reabrir o jogo, inclusive offline; valor ausente ou inválido usa o padrão daquele item.
- Modo Mão: escolher o lado de três jeitos, qualquer um vale: (1) própria mão direita acima do ombro (~300 ms) = match, mão esquerda = descarte (AC-9.7); (2) as duas mãos, abaixo dos ombros, levadas juntas para um lado além da linha do ombro (~300 ms) (AC-9.19); (3) arrastar uma mão do centro do peito para um lado, ≥ 1 largura de ombro em até ~0,8 s (AC-9.20). As duas mãos acima dos ombros (~500 ms) = saiba mais. Entre duas escolhas, exigir desfazer o gesto (AC-9.22). Medir as distâncias em larguras de ombro, para valer perto ou longe da câmera.
- Nos modos Mão e Cabeça, ignorar a ausência da pessoa durante o card (AC-9.21); a calibração continua exigindo a pessoa no centro.
- Modo Cabeça: inclinar a cabeça para o próprio lado direito (~15°, medido em relação à calibração, ~300 ms) = match; para o esquerdo = descarte; levantar o queixo (~500 ms) = saiba mais; exigir voltar a cabeça ao centro entre duas escolhas; manter o card parado até a escolha (AC-2.3, AC-9.13).
- Nos modos Mão e Cabeça, detectar presença e centralização pela parte de cima do corpo (ombros e rosto), para que um jogador sentado consiga calibrar.
- Mostrar nas instruções da calibração e do card os gestos do modo ativo (AC-9.14).
- Manter, em todos os modos, a entrada alternativa (FR-3), os demais tempos (FR-1), a pontuação e o sorteio (FR-5) e a seleção da pessoa mais central e maior no quadro (FR-2).
- Ignorar a câmera (presença e gestos) enquanto o menu estiver aberto.

**Must not:**
- Mudar qualquer configuração durante uma partida.
- Guardar no notebook qualquer coisa além das quatro configurações.
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


### FR-12: Modo de diagnóstico (adicionado v5.2.0)

**Must:**
- Ligar o modo só quando o endereço tiver `?diagnostico`; sem isso, nada muda (AC-12.1).
- Mostrar o painel com as medidas de AC-12.3, atualizado ao menos 2 vezes por segundo, sem cobrir o card.
- Guardar em memória só os últimos 60 s de medições e oferecer "Baixar registro (60 s)" em JSON (AC-12.4).
- Calcular as medidas das mãos e da cabeça com as mesmas regras que o jogo usa para reconhecer os gestos.

**Must not:**
- Enviar medições pela rede, gravá-las no navegador ou incluir imagens da câmera.
- Mudar o comportamento do jogo (AC-12.6).

### FR-13: Foto polaroid no resumo (adicionado v7.0.0)

**Must:**
- Com a câmera ativa e "Foto no resumo" Ligada, guardar na memória um quadro da câmera no instante em que a escolha (ou o tempo esgotado) do card ⌈M/2⌉ é registrada (AC-13.1).
- Mostrar no resumo um card polaroid com a foto espelhada, sem esqueleto, e a faixa "Match do Saber · N de M", ao lado dos pontos e da mensagem, sem cortar nada em 1366×768 (AC-13.2).
- Mostrar o resumo sem polaroid quando não houver foto (AC-13.3).
- Apagar a foto ao iniciar nova partida, ao sair (Sair ou Esc) e em qualquer fim de partida sem resumo (AC-13.4).

**Must not:**
- Salvar a foto em disco ou no navegador, enviá-la pela rede ou incluí-la no registro do diagnóstico (AC-13.5).
- Oferecer download, impressão, envio ou QR code da foto.
- Atrasar ou pausar a partida para tirar a foto.

## Non-Functional Requirements

### Performance

- O gesto é confirmado em até 1 s depois de o jogador atingir a posição (já contando o tempo de permanência), num notebook comum com webcam de 720p, em qualquer modo de jogo.
- A prévia da câmera e a barra de tempo atualizam a pelo menos 15 quadros por segundo nesse notebook.
- Com o conteúdo já em cache, o jogo vai do clique no ícone à tela de espera em até 5 s.
- A transição de um card para o próximo (depois do feedback) leva menos de 300 ms, sem imagem carregando visivelmente.

### Security

- Nenhuma requisição de rede contém imagem ou vídeo da câmera ou dados do jogador, o que é verificável pelo registro de rede do navegador durante uma partida.
- A foto do resumo (FR-13) existe só na memória da página, enquanto o resumo daquela partida não fecha.
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
| Jogador sai do quadro durante a partida | No modo Corpo: pausa com "Volte para o centro"; retoma se ele voltar em até 10 s; senão encerra sem resumo e volta à espera (AC-5.3 a AC-5.5). Nos modos Mão e Cabeça: o tempo continua e nada aparece (AC-9.21). |
| Iluminação ruim impede a detecção | A calibração não conclui e a mensagem "Fique no centro" continua; o operador pressiona Enter para pular a calibração e joga pelas setas (AC-1.8). |
| Jogador sai do quadro, partida termina ou operador usa Sair, e alguém continua no quadro | O jogo fica na tela de espera até o operador iniciar de novo (AC-1.1, AC-10.3). |
| Várias pessoas no quadro | Só a pessoa mais central e maior controla (AC-1.5). |
| Nenhuma notícia publicada | Tela de espera com "Nenhuma notícia publicada"; não inicia partida (AC-6.4). |
| Linha da planilha incompleta, em rascunho, com `id` duplicado ou com imagem inacessível | A linha não é publicada e aparece no resumo com o motivo (AC-7.3, FR-7). |
| Planilha inacessível na publicação | A publicação falha com mensagem no resumo; o jogo publicado continua com o conteúdo anterior (AC-7.5). |
| Jogo aberto offline antes de qualquer abertura online | Tela "Conecte à internet uma vez para baixar o jogo". |
| Jogo offline com versão antiga | Joga normalmente com o conteúdo em cache; atualiza na próxima abertura online. |
| Configuração guardada ausente, inválida ou armazenamento do navegador indisponível | O jogo abre com o padrão daquele item (Corpo, 15 s, som ligado, foto ligada); o menu continua funcionando, e a escolha vale até o jogo ser fechado. |
| Navegador bloqueia o som até a primeira interação com a página | O jogo funciona normalmente, sem som, até o primeiro clique ou tecla; a partir daí os sons tocam (o operador clica uma vez ao abrir o jogo). |
| Câmera indisponível no card do meio, ou a captura da foto falha | O resumo aparece sem polaroid (AC-13.3); a partida não é afetada. |
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

Decisões da v5.1.0, confirmadas pela responsável pelo projeto em 2026-10-28:
- O botão das configurações fica no canto superior direito da tela de espera, só com o ícone "⚙".
- O menu abre como painel lateral à direita, com a altura da tela; o resto da tela fica escurecido atrás.

Decisões da v5.2.0, confirmadas em 2026-10-28 (a responsável pediu para preparar o diagnóstico e deixou a variante a critério da equipe):
- O diagnóstico inclui o painel na tela e o botão "Baixar registro (60 s)", porque um arquivo com dados do notebook real é o que permite ajustar os limites dos gestos sem tentativa.
- Ele só liga com `?diagnostico` no endereço; o operador do evento usa o endereço normal.

Decisões da v6.0.0, confirmadas pela responsável pelo projeto em 2026-10-29:
- No modo Mão valem três gestos para escolher o lado: levantar a mão, as duas mãos para um lado e arrastar do centro para o lado.
- Regras de partida: punhos abaixo do ombro e além da linha do ombro (> 0,5 largura de ombro do meio do corpo) por ~300 ms; arraste a partir de < 0,5 largura de ombro do meio, andando ≥ 1 largura de ombro em até ~0,8 s. Ajustáveis com o registro do diagnóstico.
- Nos modos Mão e Cabeça a partida nunca pausa nem termina por ausência; no modo Corpo continua como antes.

Decisões da v6.1.0, confirmadas pela responsável pelo projeto em 2026-10-29:
- A dica do modo Mão agrupa os gestos por resultado: "É verdade: mão direita para cima, as duas mãos para a direita ou arraste para a direita · É falsa: o mesmo para a esquerda · Duas mãos para cima: saiba mais".
- A dica continua nos mesmos lugares (calibração, ao lado do card e no menu Configurações) e não pode cobrir o card nem o painel de diagnóstico.

Decisões da v7.0.0, confirmadas pela responsável pelo projeto em 2026-10-29:
- O resumo ganha um card polaroid com uma foto da câmera tirada no meio da partida (card ⌈M/2⌉), com a faixa "Match do Saber · N de M".
- A foto fica só na tela: guardada na memória e apagada quando o resumo fecha; nada é salvo, baixado ou enviado. Por isso o Princípio 3 (privacidade por padrão) não precisa de emenda: nenhum dado de jogador é coletado.
- O operador pode desligar a foto no menu Configurações ("Foto no resumo", ligada por padrão), por exemplo quando uma escola ou um responsável pedir.

Decisões da v7.1.0, confirmadas pela responsável pelo projeto em 2026-11-03:
- O resumo ganha uma mensagem por faixa de acertos, abaixo do "N de M": 0–4 "Cuidado! Você precisa verificar melhor as manchetes."; 5–7 "Você consegue se proteger, mas ainda pode melhorar."; 8–9 "Parabéns! Você checa muito bem as notícias."; 10 "Imune a fake news!". Os textos evitam marcar gênero.
- Em partidas com menos de 10 cards, a faixa sai da proporção de acertos (por exemplo, 3 de 6 vale como 5 de 10).

Decisões da v8.0.0, confirmadas pela responsável pelo projeto em 2026-11-03:
- O resumo não mostra mais "Técnicas que você praticou" nem a lista, com ou sem foto. O resumo fica: "Fim de jogo!", "N de M", a mensagem da faixa, o polaroid (se houver) e a dica do operador.
- O Princípio 2 (ensinar o método) continua atendido: a técnica de checagem aparece no feedback de cada card (AC-4.1 a AC-4.3).

Decisões da v8.1.0, confirmadas pela responsável pelo projeto em 2026-11-03:
- No modo Corpo, estender um braço para o lado também escolhe, além de deslocar o tronco. O limite é 1,2 largura de ombro do punho ao meio do corpo, com ~300 ms de permanência. A liberação entre escolhas pede os dois punhos a menos de 0,9 largura de ombro.
- Os limites saíram de uma estimativa a olho nos quadros do vídeo de teste da responsável (braços soltos ~0,8; braço estendido de 1,7 a 2,6 larguras de ombro) e podem ser ajustados com a linha "mãos (L)" do diagnóstico (FR-12).
- O deslocamento do tronco, o "saiba mais", os modos Mão e Cabeça, o cronômetro e a pausa por ausência não mudam.

Decisões da v8.2.0, confirmadas pela responsável pelo projeto em 2026-11-06:
- O card ganha uma barra de tempo na parte de baixo, com os segundos, para o tempo ficar perto de onde o jogador olha. A barra grande da base da tela continua.
- As duas barras mostram o mesmo cronômetro: mesma proporção, mesmos segundos, vermelhas juntas nos últimos 5 s e paradas juntas em "Volte para o centro".

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
