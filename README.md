# jarvis-personal

Assistente de IA para personal trainers. O personal conversa pelo Telegram: ensina o próprio estilo com planos antigos, manda a anamnese do aluno e recebe um **rascunho de treino no jeito dele**, que ajusta conversando ("troca o stiff por mesa flexora 4x12") e aprova.

Nada chega ao aluno sem a aprovação do personal.

> Nome provisório. Fase atual: **piloto com 2 ou 3 personais** (semana 1 do plano).

## O que já funciona

- `/metodologia` + `/pronto`: o personal manda 2 ou 3 planos antigos (foto, PDF ou texto) e a IA extrai o estilo dele.
- `/link Nome`: gera um link de anamnese para o aluno responder no celular (vale 7 dias, uma resposta). Quando ele envia, o bot manda as respostas ao personal com os botões **Gerar rascunho**, **Complementar antes** e **Descartar**.
- `/novo Nome` + `/gerar`: recebe a anamnese (texto, foto ou PDF) e gera o rascunho estruturado, com alertas de restrição e de informação faltando.
- Ajuste por conversa: o personal escreve o que quer mudar, o bot mostra as mudanças e pede confirmação.
- Desfazer, aprovar e descartar. Ao aprovar, o bot devolve o treino formatado para o personal encaminhar ao aluno.
- Métricas do piloto em `data/eventos.jsonl`: rascunhos gerados, revisões pedidas, aplicadas e recusadas, aprovações e tokens.

## Próximos passos

1. Subir na VPS com domínio e HTTPS, para o link funcionar fora da sua rede.
2. Áudio: transcrição dos pedidos de ajuste.
3. PDF ou link do treino para o aluno.
4. Troca do armazenamento em JSON por Postgres (a interface do `Repositorio` continua a mesma).

## Rodando localmente

Pré-requisitos: Node 22+, um bot criado no [@BotFather](https://t.me/BotFather) e uma chave da API da Anthropic.

```bash
npm install
cp .env.example .env   # preencha TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY e ALLOWED_TELEGRAM_IDS
npm run dev
```

O formulário de anamnese sobe junto, em `http://localhost:3000`. Para abrir o link no celular, deixe o celular na mesma rede Wi-Fi e use `PUBLIC_URL=http://IP-do-Mac:3000` no `.env`.

Para descobrir o ID do Telegram de alguém, basta a pessoa mandar uma mensagem ao bot: ele responde com o ID. Coloque o ID em `ALLOWED_TELEGRAM_IDS` e reinicie.

### Testar só o gerador, sem Telegram

```bash
npm run gerar:exemplo
```

Usa `exemplos/plano-antigo-exemplo.md` e `exemplos/anamnese-exemplo.md`, mostra o rascunho, uma revisão, o tempo de cada etapa e os tokens gastos.

### Revisão automática

Todo rascunho passa por uma conferência antes de chegar ao personal:

- **Regras por código:** ativação de exercício que não tem séries de trabalho, fichas que repetem os mesmos exercícios, cargas "0 kg".
- **Revisor de IA:** confere se justificativa e alertas batem com as fichas, se cada ponto da anamnese foi tratado (inclusive frequência variável) e se falta alerta de expectativa.

Se houver algo a corrigir, o gerador tenta de novo uma vez. O que continuar errado aparece para o personal como "ainda não consegui resolver".

```bash
npm run testar:revisor   # o revisor encontra os problemas conhecidos do caso Aluna J?
npm run gerar:caso       # fluxo completo (gera, revisa, corrige) para o caso Aluna J
```

### Verificação

```bash
npm run typecheck
npm test
```

## Estrutura

```
src/
  dominio/         schemas do plano e da metodologia (Zod)
  ia/              cliente Anthropic, prompts, gerador, revisão e extração de metodologia
  formatacao/      como o plano aparece no Telegram e para o aluno
  validacao/       regras por código que conferem o rascunho
  armazenamento/   repositório do piloto (JSON em disco, com versões)
  bot/             bot do Telegram (grammY)
  web/             formulário de anamnese por link (node:http, sem framework)
scripts/           gerar-exemplo.ts
exemplos/          anamnese e plano de exemplo
tests/
```

## Dados e privacidade

- Anamnese enviada pelo chat **não é salva**: é usada só para gerar o rascunho e sai da memória em seguida.
- Anamnese do formulário fica em `data/convites/` só até o rascunho ser gerado ou descartado (no máximo 7 dias); depois as respostas são apagadas. O aluno dá consentimento explícito no formulário (LGPD, dado de saúde).
- O texto enviado à IA não leva o nome do aluno.
- Peça aos personais que tirem nome completo e contato do aluno antes de enviar.
- `.env` e `data/` estão no `.gitignore`.
