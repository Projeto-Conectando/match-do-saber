---
date: 2026-10-27
spec: "001"
tags: [ui, tempos, revisao]
---

# Lesson: Animação nova soma ao tempo da spec, nunca desconta

## Context

Correção do desvio D2 (card precisa sair pela direita/esquerda) na revisão Mode B da feature 001-jogo-estande.

## What happened

A animação de saída de 250 ms foi encaixada dentro dos 3 s de feedback ("ruling" do controlador). A rodada seguinte da revisão detectou o desvio D4: o resultado ficava 2,75 s na tela, contra "por 3 s" da spec. Foi preciso uma terceira rodada para corrigir (`TEMPOS.saidaMs` somado ao feedback).

## What to do next time

Ao adicionar transição/animação a uma tela com duração definida na spec, some a duração da animação ao tempo especificado e escreva teste de fronteira no reducer (ex.: ainda em feedback a 3249 ms, próximo card a 3250 ms).

## Signals to watch for

Qualquer "desconta do tempo X" numa decisão de UI; ACs com "por N s"; correções de revisão que mexem em telas temporizadas.
