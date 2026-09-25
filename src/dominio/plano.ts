import { z } from "zod";

/**
 * Formato do plano, versão 2.
 *
 * Uma ficha é feita de BLOCOS, porque planos reais não são uma lista de exercícios soltos:
 * - simples: um exercício com séries (e aquecimento opcional, como o "1x20 leve");
 * - combinado: exercícios feitos em sequência, por voltas (bi-set, tri-set, circuito com bike);
 * - cardio: contínuo ou intervalado (ex.: Tabata), que não cabe em "séries x repetições".
 *
 * Repetições e carga são texto porque o personal escreve "8-12", "até a falha", "RIR 2".
 */

export const NIVEIS = [
  "iniciante",
  "iniciante_intermediario",
  "intermediario",
  "intermediario_avancado",
  "avancado",
] as const;

const Nome = z.string().min(1).describe("Nome do exercício, preferindo os nomes que o personal já usa");
const Carga = z.string().describe('Ex.: "leve", "moderada", "RIR 2", "60% 1RM". Nunca "0 kg".');
const Observacao = z.string().describe("Técnica, cadência, amplitude, cuidado específico");

export const AquecimentoSchema = z.object({
  series: z.number().int().min(1).max(3),
  repeticoes: z.string().min(1),
  observacao: z.string().optional(),
});

export const BlocoSimplesSchema = z.object({
  tipo: z.literal("simples"),
  exercicio: Nome,
  series: z.number().int().min(1).max(10),
  repeticoes: z
    .string()
    .min(1)
    .describe('Só as repetições de cada série, sem número de séries. Ex.: "10", "8-12", "12/10/8", "30s", "até a falha"'),
  descansoSegundos: z.number().int().min(0).max(600),
  carga: Carga.optional(),
  observacao: Observacao.optional(),
  aquecimento: AquecimentoSchema.optional().describe(
    'Séries leves antes das séries de trabalho do MESMO exercício (ex.: 1x20 leve). Não crie outro bloco para isso.',
  ),
});

export const ItemCombinadoSchema = z.object({
  exercicio: Nome,
  repeticoes: z.string().min(1).describe('Por volta. Ex.: "10", "15", "3 min" (para cardio dentro do combinado)'),
  carga: Carga.optional(),
  observacao: Observacao.optional(),
});

export const BlocoCombinadoSchema = z.object({
  tipo: z.literal("combinado"),
  nome: z.string().optional().describe('Ex.: "Bi-set", "Circuito com bike". Opcional.'),
  voltas: z.number().int().min(1).max(10),
  descansoEntreItensSegundos: z.number().int().min(0).max(300).describe("0 = passa direto para o próximo item"),
  descansoAoFimDaVoltaSegundos: z.number().int().min(0).max(600),
  itens: z.array(ItemCombinadoSchema).min(2),
  observacao: Observacao.optional(),
});

export const BlocoCardioSchema = z.object({
  tipo: z.literal("cardio"),
  exercicio: Nome,
  protocolo: z.enum(["continuo", "intervalado"]),
  duracao: z.string().optional().describe('Para contínuo. Ex.: "5 min", "20-30 min"'),
  tiros: z.number().int().min(1).max(50).optional().describe("Para intervalado: número de tiros"),
  trabalhoSegundos: z.number().int().min(5).max(600).optional(),
  pausaSegundos: z.number().int().min(0).max(600).optional(),
  intensidade: z.string().describe('Ex.: "leve", "moderada", "forte", "PSE 7"'),
  observacao: Observacao.optional(),
});

export const BlocoSchema = z.union([BlocoSimplesSchema, BlocoCombinadoSchema, BlocoCardioSchema]);

/** Ficha: um dia de treino do plano ("Treino A"). */
export const FichaSchema = z.object({
  letra: z.string().min(1).max(2).describe('"A", "B", "C"...'),
  nome: z.string().min(1).describe('Ex.: "Inferiores com foco em glúteo"'),
  blocos: z.array(BlocoSchema).min(1),
});

export const AlertaSchema = z.object({
  tipo: z.enum(["restricao", "informacao_faltando", "atencao"]),
  mensagem: z.string().min(1),
});

/** Plano: o conjunto de fichas que o personal assina. Sempre nasce como rascunho. */
export const PlanoSchema = z.object({
  titulo: z.string().min(1).describe("Sem nome de pessoa"),
  objetivo: z.string().min(1),
  nivel: z.enum(NIVEIS),
  frequencia: z
    .object({ minima: z.number().int().min(1).max(7), maxima: z.number().int().min(1).max(7) })
    .describe('Treinos por semana. "2 a 3 vezes" = minima 2, maxima 3; fixo = valores iguais.'),
  duracaoSemanas: z.number().int().min(1).max(24),
  fichas: z.array(FichaSchema).min(1),
  orientacoesAluno: z
    .array(z.string())
    .describe(
      "Vão para o ALUNO, escritas para ele (\"você\"). Nunca coloque aqui instruções ao personal, alertas clínicos ou recados como \"converse com a aluna\".",
    ),
  alertas: z.array(AlertaSchema).describe("Só para o PERSONAL: o que ele precisa conferir ou conversar antes de assinar"),
  justificativa: z.string().describe("Para o PERSONAL: por que o plano foi montado assim, em 2 a 4 frases"),
});

export type Aquecimento = z.infer<typeof AquecimentoSchema>;
export type BlocoSimples = z.infer<typeof BlocoSimplesSchema>;
export type BlocoCombinado = z.infer<typeof BlocoCombinadoSchema>;
export type BlocoCardio = z.infer<typeof BlocoCardioSchema>;
export type Bloco = z.infer<typeof BlocoSchema>;
export type Ficha = z.infer<typeof FichaSchema>;
export type Alerta = z.infer<typeof AlertaSchema>;
export type Plano = z.infer<typeof PlanoSchema>;
export type Nivel = (typeof NIVEIS)[number];

/** Nomes de exercícios de força de uma ficha (simples e itens de combinado), na ordem. */
export function exerciciosDeForca(ficha: Ficha): string[] {
  return ficha.blocos.flatMap((b) => {
    if (b.tipo === "simples") return [b.exercicio];
    if (b.tipo === "combinado") return b.itens.map((i) => i.exercicio);
    return [];
  });
}

/** Resultado de uma alteração pedida pelo personal. */
export const RevisaoSchema = z.object({
  plano: PlanoSchema,
  mudancas: z.array(z.string()).min(1).describe('Cada mudança em uma linha curta. Ex.: "Treino A: Stiff 3x12 → Mesa flexora 4x12"'),
  entendimento: z.enum(["claro", "ambiguo"]),
  pergunta: z.string().optional().describe("Se ambíguo, a pergunta curta a fazer ao personal"),
});
export type Revisao = z.infer<typeof RevisaoSchema>;
