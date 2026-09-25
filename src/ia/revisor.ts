import { z } from "zod";
import type { Plano } from "../dominio/plano.js";
import type { Problema } from "../validacao/regras.js";
import { chamarComFerramenta, type Uso } from "./cliente.js";
import { paraBlocos, type Anexo } from "./entrada.js";
import { planoComoTexto } from "./prompts.js";
import { skillsParaRevisor, type Skill } from "../conhecimento/skills.js";
import type { Metodologia } from "../dominio/metodologia.js";

const ResultadoRevisorSchema = z.object({
  verificacoes: z.array(
    z.object({
      verificacao: z
        .string()
        .describe("Primeiro: o que você conferiu e a evidência encontrada no plano e na anamnese. Pense aqui."),
      eProblema: z.boolean().describe("Depois de conferir: é mesmo um problema? Se concluiu que está correto, false."),
      gravidade: z
        .enum(["corrigir", "sugestao"])
        .describe('"corrigir": erro que o personal não deveria receber. "sugestao": melhoria opcional.'),
      descricao: z
        .string()
        .describe("Só se eProblema = true: uma frase final para o personal, dizendo onde está o problema e o que fazer. Sem raciocínio."),
    }),
  ),
});

const SISTEMA_REVISOR = `
Você é um revisor técnico de planos de treino. Um rascunho foi gerado por IA a partir da anamnese
de um aluno. Antes de ir para o personal (que tem CREF e assina o plano), confira:

1. Coerência interna: tudo que a justificativa, os alertas e as orientações dizem que foi feito
   está de fato nas fichas? (Ex.: "incluí ativação de core" sem nenhum exercício de core é erro.)
2. Cobertura da anamnese: cada condição, restrição, preferência e limite (tempo, frequência,
   equipamento) foi considerado no plano ou num alerta? Frequência variável (ex.: "2 a 3 vezes")
   precisa de orientação sobre o que fazer nas semanas com menos treinos.
3. Coerência com o aluno: compare o campo "nivel" do plano com o nível e o tempo de treino da
   anamnese. Se a anamnese diz algo entre dois níveis ou informa anos de treino, o nível escolhido
   precisa fazer sentido e o volume deve acompanhar. Objetivo e volume batem com a anamnese?
4. Expectativa: alguma condição de saúde ou dado da anamnese (ex.: IMC, diagnóstico) torna o objetivo
   pouco realista ou dependente de outros fatores? Se sim, falta um alerta para o personal alinhar
   isso com o aluno, citando a condição.
5. Pedidos do personal (se houver) foram atendidos.
7. Equipamento: cada exercício (e cada alternativa sugerida) usa só o equipamento e o local que o aluno
   informou, e o nome do exercício corresponde ao que ele vai de fato fazer.
8. Vocabulário do personal (se informado abaixo): as técnicas usadas no plano seguem o significado
   confirmado pelo personal. Técnica com outro significado ou tornada opcional é erro a corrigir.
6. Público certo: "orientacoesAluno" e as observações dos exercícios vão direto para o aluno.
   Recado ao personal ou raciocínio clínico ali (ex.: "converse com a aluna", "sem restrição relatada",
   "por causa do histórico de...") é erro a corrigir.

Regras:
- Aponte só problemas reais e específicos, citando a ficha ou o trecho. Não repita o que já está bem.
- Não avalie o estilo do personal: métodos e exercícios diferentes do que você faria não são erro.
- Não faça diagnóstico. Se algo depende de avaliação médica, o problema é a falta de alerta, não a conduta.
- Gravidade "corrigir" só para erros no plano de treino ou no que chega ao aluno. Hábitos fora do treino
  (hidratação, sono, alimentação) e detalhes de formato dos dados são no máximo "sugestao".
- Use "verificacao" para raciocinar e só marque eProblema = true quando confirmar o erro. Não liste itens
  que você mesmo concluiu estarem corretos.
- Se estiver tudo certo, devolva a lista vazia.
- Escreva em português do Brasil.
`.trim();

export async function revisarCoerencia(entrada: {
  anamnese: Anexo[];
  plano: Plano;
  instrucoesExtras?: string;
  skills?: Skill[];
  metodologia?: Metodologia;
}): Promise<{ problemas: Problema[]; uso: Uso }> {
  const glossario = entrada.metodologia?.glossario ?? [];
  const blocoVocabulario =
    glossario.length > 0
      ? `Vocabulário confirmado pelo personal:\n${glossario.map((t) => `- "${t.termo}": ${t.significado}`).join("\n")}`
      : "";
  const conteudo = [
    { type: "text" as const, text: "Anamnese do aluno:" },
    ...paraBlocos(entrada.anamnese),
    { type: "text" as const, text: `Rascunho gerado:\n${planoComoTexto(entrada.plano)}` },
  ];
  if (entrada.instrucoesExtras) {
    conteudo.push({ type: "text", text: `Pedido do personal: ${entrada.instrucoesExtras}` });
  }

  const { resultado, uso } = await chamarComFerramenta({
    sistema: [SISTEMA_REVISOR, skillsParaRevisor(entrada.skills ?? []), blocoVocabulario].filter(Boolean).join("\n\n"),
    conteudo,
    ferramenta: {
      nome: "registrar_revisao",
      descricao: "Registra os problemas encontrados no rascunho (lista vazia se estiver tudo certo).",
      schema: ResultadoRevisorSchema,
    },
    maxTokens: 4000,
  });

  return {
    problemas: resultado.verificacoes
      .filter((v) => v.eProblema && v.descricao.trim().length > 0)
      .map((v) => ({ origem: "revisor" as const, gravidade: v.gravidade, descricao: v.descricao })),
    uso,
  };
}
