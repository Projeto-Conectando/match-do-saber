# PRD: Match do Saber — jogo de estande (MVP)

**Date:** 2026-10-26
**Feature:** 001-jogo-estande

## Problem

Estudantes do ensino médio e jovens adultos recebem notícias com imagens exageradas e títulos chamativos o tempo todo, e raramente param para checar antes de acreditar ou compartilhar. Faltam experiências curtas e divertidas que pratiquem técnicas reais de checagem (fonte, data, imagem, contexto) em vez de só dizer "isso é fake".

## Users & Context

- **Jogadores:** estudantes do ensino médio e jovens adultos (muitos menores de idade) num **estande de evento** (feira, gincana, festival). Jogam um por vez, de pé a ~1,5–2 m de um notebook com webcam (às vezes ligado a uma TV), com fila e público assistindo.
- **Operador do estande:** liga o notebook, abre o app e intervém pelo teclado se a detecção falhar.
- **Equipe de conteúdo (não programadora):** cadastra e revisa as notícias numa Planilha Google e publica pelo menu da planilha. Premissa: essa pessoa tem acesso (leitura) ao repositório no GitHub para ver o resumo da publicação com as linhas descartadas.
- **Ambiente:** Wi-Fi de evento instável; o jogo precisa funcionar offline depois de carregado. É uma aplicação web instalável (PWA). Não há sistemas existentes: é o primeiro produto do repositório.

## Goals

- Jogo estilo Tinder: cada card mostra uma notícia com imagem exagerada, título chamativo e descrição curta, com opção **"saiba mais"**. O jogador dá **match** nas verdadeiras e **descarta** as falsas.
- Escolhas feitas por **movimento do corpo**: deslocar o tronco para a direita (match) ou esquerda (descarta) e levantar as duas mãos ("saiba mais"), conforme [001-motion-input](../../adr/001-motion-input.md).
- Fallback sempre ativo por teclado (← → ↑) e swipe de mouse/toque.
- Partida cronometrada: tela de espera → pessoa detectada → calibração (2 s no centro) → **10 cards de 15 s cada**, com cerca de metade verdadeiras → feedback de 3 s após cada card → resumo com pontos e técnicas aprendidas, que fica na tela até o operador iniciar uma nova partida.
- **Feedback por resultado** (princípio 2 da foundation: toda resposta explica o porquê): em qualquer resultado (acerto, erro ou tempo esgotado), o feedback mostra o veredito (verdadeira/falsa), a `explicacao` e a `tecnica` da notícia; muda só o selo ("Acertou!", "Errou", "Tempo esgotado").
- **Pontuação:** +1 por acerto; erro e tempo esgotado valem 0 (sem penalidade).
- **Sorteio dos cards:** 10 notícias aprovadas sorteadas sem repetição na partida, 5 verdadeiras e 5 falsas, em ordem aleatória. Se um lado tiver menos de 5, completa com o outro; se houver menos de 10 aprovadas, a partida usa todas as disponíveis.
- **Jogador sai do quadro:** o cronômetro pausa e aparece "volte para o centro"; sem pessoa detectada por 10 s, a partida é encerrada e volta à tela de espera.
- "Saiba mais" pausa o cronômetro e fecha sozinho após 5 s sem gesto; tempo esgotado conta como "sem resposta".
- Notícias mantidas numa **Planilha Google** (serviço de terceiro, fora do código) e publicadas por um menu "Publicar no jogo", que só deixa ir ao ar notícia com status `aprovada`, fonte e revisor.
- **Instalável e offline**: app, modelo de pose, notícias e imagens pré-cacheados.
- **Privacidade**: vídeo processado só no notebook, nunca gravado nem enviado; nenhum dado de jogador é salvo.
- Entrega em **2 semanas** (até 2026-11-09).

## Non-Goals

- Ranking, apelidos, contas de usuário ou qualquer dado de jogador salvo.
- Modo para celular individual ou sala de aula.
- Multiplayer ou várias pessoas jogando ao mesmo tempo.
- Painel administrativo próprio: a planilha é o painel.
- Atualização de conteúdo em tempo real durante o jogo.

## Success Criteria

- Num notebook comum com webcam, um jogador completa uma partida inteira de 10 cards só com movimentos do corpo, sem tocar no teclado.
- Com o Wi-Fi desligado, depois de uma abertura online, o app abre a partir do ícone instalado e roda uma partida completa com imagens.
- Uma pessoa não programadora edita uma notícia na planilha, clica em "Publicar no jogo" e, até ~10 min depois do fim do workflow, vê a mudança ao recarregar o app online, sem ajuda técnica (o PWA usa atualização automática do service worker, `registerType: 'autoUpdate'`).
- Uma linha sem `fonte_url`, sem `revisado_por` ou com `status = rascunho` nunca aparece no jogo e aparece no resumo da publicação com o motivo.
- Todo card jogado (verdadeiro ou falso, acertado, errado ou com tempo esgotado) mostra veredito, explicação e técnica de checagem; o resumo final lista as técnicas da partida.
- Nenhuma requisição de rede envia imagem da câmera ou dado de jogador (verificável na aba de rede do navegador).
- Em teste no estande, jogadores pedem para jogar de novo ou a fila se forma sozinha (princípio "diversão primeiro").

## Architecture Decisions

- [Stack do front-end e PWA](../../adr/001-frontend-stack.md) — Vite + React 18 + TypeScript + vite-plugin-pwa, hospedado no GitHub Pages; é o caminho mais rápido para um app instalável e offline em 2 semanas.
- [Captura de movimento e gestos](../../adr/001-motion-input.md) — MediaPipe Pose Landmarker lite, com modelo hospedado no app e gestos de corpo (tronco para a direita/esquerda, duas mãos para cima); é a opção confiável a 2 m, offline e sem enviar vídeo.
- [Pipeline de conteúdo](../../adr/001-content-pipeline.md) — Planilha Google lida no build pelo GitHub Actions, com imagens baixadas e validação de fonte/revisor/status, embutida no app; é a única opção que funciona offline e contorna CORS e as imagens do Drive.

## Out of Scope

- Gestos de mão/dedo (descartados por baixa confiabilidade a 2 m).
- Busca de notícias em tempo de execução via Apps Script ou CSV publicado (descartada por CORS, imagens do Drive e falta de offline).
- CMS headless (Sanity/Contentful), descartado para não exigir nova ferramenta da equipe de conteúdo.
- Svelte e Phaser como stack de UI.
- Relatório de validação escrito de volta na planilha, aba de configuração editável (número de cards e tempo) e telemetria de uso: podem virar features futuras.
