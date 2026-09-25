# Contexto e linguagem

Produto para personal trainers que vendem consultoria online em volume (tráfego pago ou orgânico). A IA faz o trabalho mecânico; o personal decide e aprova.

## Regra que não se quebra

Nada gerado pela IA chega ao aluno sem aprovação do personal. Toda alteração mostra o que muda e pede confirmação.

## Termos

| Termo | Significado | Evitar |
| --- | --- | --- |
| Personal | Profissional com CREF que usa o bot e aprova os planos | usuário, treinador |
| Aluno | Quem recebe o treino | cliente |
| Metodologia | O estilo do personal, extraído de planos antigos | template |
| Anamnese | Informações do aluno que originam o plano | formulário |
| Rascunho | Plano gerado pela IA, ainda não aprovado | sugestão, prévia |
| Plano | Conjunto de fichas com objetivo, nível, frequência e duração | programa |
| Ficha | Um dia de treino ("Treino A") | sessão, dia |
| Bloco | Parte da ficha: simples (um exercício), combinado (sequência por voltas) ou cardio | item |
| Aquecimento | Séries leves antes das séries de trabalho do mesmo exercício (ex.: 1x20) | ativação como exercício separado |
| Orientações ao aluno | O que vai para o aluno; nunca contém recado ao personal | observações |
| Versão | Foto do plano após cada alteração; permite desfazer | revisão |
| Alerta | Algo que o personal precisa conferir antes de aprovar | aviso |

## Decisões

- Telegram como canal do personal no piloto; WhatsApp depois.
- Armazenamento em JSON no piloto; Postgres (Docker na VPS) na sequência.
- Saída da IA sempre estruturada (ferramenta com schema Zod), nunca texto livre.
- A anamnese não é persistida.
