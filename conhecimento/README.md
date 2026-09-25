# Base de conhecimento (skills)

Cada arquivo é uma "skill": conhecimento específico que só entra no prompt quando a anamnese
menciona um dos gatilhos. Assim a regra certa aparece na hora certa, sem inflar o prompt de todo aluno.

## Formato

```
---
nome: Lipedema
gatilhos: lipedema, lipoedema
status: rascunho_a_validar | validado
validado_por:            # nome e registro do profissional (CREF/CREFITO/CRM)
---

## Considerar          → entra no prompt do gerador
## Alertas obrigatórios → o gerador DEVE registrar; o revisor confere cada um
## Evitar ou ajustar
## Perguntar ao aluno   → vira alerta de informação faltando quando a anamnese não responde
```

## Regra de responsabilidade

O conteúdo técnico destes arquivos precisa ser escrito ou revisado por um profissional habilitado.
Arquivos com `status: rascunho_a_validar` funcionam, mas o bot avisa o personal de que a orientação
ainda não foi validada.
