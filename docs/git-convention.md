---
branch_pattern: "^[0-9]+-[a-z0-9-]+$"
ticket_prefix: "CU-"
commit_format: "<type>(<scope>): <message>"
allowed_types:
  - feat
  - fix
  - docs
  - chore
  - refactor
  - test
---

# Git Convention

This file is read by SDD skills to enforce branch naming and commit message standards.
To change these settings, edit this file directly.

## Examples

### Branch names
- `001-tela-de-partida`
- `002-banco-de-noticias`

### Commit messages
- `feat(partida): adiciona cronômetro por rodada`
- `fix(gabarito): corrige explicação da técnica de busca reversa de imagem (CU-86a1b2c3)`
