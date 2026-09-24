import { z } from "zod";

/**
 * Metodologia: o estilo do personal, extraído dos planos que ele já usa.
 * É o que faz o rascunho sair "no jeito dele" e não um treino genérico.
 */
export const MetodologiaSchema = z.object({
  resumo: z.string().describe("Como esse personal monta treinos, em 3 a 6 frases"),
  divisoesPreferidas: z.array(z.string()).describe('Ex.: "ABC para 3x", "Superior/Inferior para 4x"'),
  exerciciosFrequentes: z.array(z.string()).describe("Nomes de exercícios exatamente como o personal escreve"),
  padroesPrescricao: z.string().describe("Faixas típicas de séries, repetições, descanso e métodos (bi-set, drop-set...)"),
  estiloOrientacoes: z.string().describe("Como ele escreve observações e orientações ao aluno"),
});

export type Metodologia = z.infer<typeof MetodologiaSchema>;
