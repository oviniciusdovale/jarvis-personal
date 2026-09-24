import { z } from "zod";

/**
 * Prescrição: um exercício dentro de uma ficha.
 * Repetições e carga são texto porque o personal escreve "8-12", "até a falha", "RIR 2".
 */
export const PrescricaoSchema = z.object({
  exercicio: z.string().min(1).describe("Nome do exercício, preferindo os nomes que o personal já usa"),
  series: z.number().int().min(1).max(10),
  repeticoes: z.string().min(1).describe('Ex.: "10", "8-12", "30s", "até a falha"'),
  descansoSegundos: z.number().int().min(0).max(600),
  carga: z.string().optional().describe('Ex.: "moderada", "RIR 2", "60% 1RM"'),
  observacao: z.string().optional().describe("Técnica, cadência, bi-set, cuidado específico"),
});

/** Ficha: um dia de treino do plano ("Treino A"). */
export const FichaSchema = z.object({
  letra: z.string().min(1).max(2).describe('"A", "B", "C"...'),
  nome: z.string().min(1).describe('Ex.: "Inferiores com foco em glúteo"'),
  prescricoes: z.array(PrescricaoSchema).min(1),
});

export const AlertaSchema = z.object({
  tipo: z.enum(["restricao", "informacao_faltando", "atencao"]),
  mensagem: z.string().min(1),
});

/** Plano: o conjunto de fichas que o personal assina. Sempre nasce como rascunho. */
export const PlanoSchema = z.object({
  titulo: z.string().min(1),
  objetivo: z.string().min(1),
  nivel: z.enum(["iniciante", "intermediario", "avancado"]),
  frequenciaSemanal: z.number().int().min(1).max(7),
  duracaoSemanas: z.number().int().min(1).max(24),
  fichas: z.array(FichaSchema).min(1),
  orientacoes: z.array(z.string()).describe("Orientações gerais ao aluno: aquecimento, progressão, cuidados"),
  alertas: z.array(AlertaSchema).describe("O que o personal precisa conferir antes de assinar"),
  justificativa: z.string().describe("Por que o plano foi montado assim, em 2 a 4 frases, para o personal"),
});

export type Prescricao = z.infer<typeof PrescricaoSchema>;
export type Ficha = z.infer<typeof FichaSchema>;
export type Alerta = z.infer<typeof AlertaSchema>;
export type Plano = z.infer<typeof PlanoSchema>;

/** Resultado de uma revisão pedida pelo personal. */
export const RevisaoSchema = z.object({
  plano: PlanoSchema,
  mudancas: z.array(z.string()).min(1).describe('Cada mudança em uma linha curta. Ex.: "Treino A: Stiff 3x12 → Mesa flexora 4x12"'),
  entendimento: z.enum(["claro", "ambiguo"]),
  pergunta: z.string().optional().describe("Se ambíguo, a pergunta curta a fazer ao personal"),
});
export type Revisao = z.infer<typeof RevisaoSchema>;
