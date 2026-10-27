---
name: mvp-status-fase7
description: MVP 001-jogo-estande (spec v2.0.0: modos, Configurações, Iniciar/Sair, sons) está na main; verificação manual das Fases 7, 9 e 11 e setup do GitHub/Google pendentes; prazo 2026-11-09
metadata:
  type: project
---

O MVP 001-jogo-estande foi mergeado na `main` em 2026-10-27 (revisão SDD Mode B: SPEC-ALIGNED). Prazo de entrega: 2026-11-09.

Pendente (Fase 7, manual — ver `docs/specs/001-jogo-estande/plan.md`):
- Teste no notebook real com webcam a 1,5–2 m (gestos, sair do quadro, 2ª pessoa, "saiba mais"); ajustar `CONFIG_GESTOS` se preciso.
- Partida iniciada por Enter com câmera ligada; câmera negada/desconectada; instalação + offline; desempenho (≥15 fps, gesto ≤1 s); 8 h de operação; confirmar que o auto-update do SW não recarrega no meio de uma partida.
- Planilha real ponta a ponta (inclusive o separador `;` da fórmula em `apps-script/Code.gs`).
- (v1.1.0, mergeado em 2026-10-27) Fase 9: testar os modos Mão e Cabeça sentado no notebook real, de preferência com uma pessoa com baixa mobilidade; ajustar `margemMaoOmbro`, `limiarCabecaGraus`, `retornoCabecaGraus` e `limiarQueixo` em `CONFIG_GESTOS`; conferir que o menu aberto bloqueia a calibração.
- (v2.0.0, mergeado em 2026-10-27) Fase 11: ouvir os sons no barulho do evento (ajustar `volume` em `src/app/audio.ts`), layout na TV, tempos de 10 s e 30 s com o público, "✕ Sair" sobre a faixa "Câmera indisponível" e recalibração logo após Sair com o jogador ainda no quadro.
- O repositório não tem remoto: criar repo no GitHub, conta de serviço Google, secrets/variables e token do Apps Script conforme `docs/operacao.md`.

**Why:** o código só foi verificado sem câmera e sem contas reais; nada foi publicado.
**How to apply:** em sessões futuras, não tratar o MVP como entregue até esses itens serem confirmados; começar por eles antes de novas features.
