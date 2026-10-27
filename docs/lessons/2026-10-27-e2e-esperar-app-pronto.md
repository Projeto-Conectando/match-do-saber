---
date: 2026-10-27
spec: "001"
tags: [e2e, playwright, testes]
---

# Lesson: Em E2E, esperar o app ficar pronto antes de enviar teclas

## Context

Fase 5 da feature 001-jogo-estande: testes Playwright da partida pelo teclado.

## What happened

Três testes do plano apertavam Enter logo após `page.goto`. O catálogo ainda estava carregando, o listener de teclado não existia e a tecla se perdia — sem card na tela. O app não tem como corrigir isso: tecla anterior ao código da página é perdida.

## What to do next time

Antes de qualquer `keyboard.press` em E2E, espere um texto que só aparece quando a tela está pronta (aqui: "Câmera desativada — jogue pelas setas (Enter para começar)").

## Signals to watch for

E2E intermitente ou "elemento não encontrado" logo depois de uma tecla no início do teste.
