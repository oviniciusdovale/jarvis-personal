import { z } from "zod";

/**
 * Metodologia: o estilo do personal, extraído dos planos que ele já usa
 * e confirmado com ele numa entrevista curta.
 */

export const TermoSchema = z.object({
  termo: z.string().min(1).describe('Como aparece no plano. Ex.: "PAUSANDO 10\\"", "exercícios combinados"'),
  significado: z.string().min(1).describe("O que o personal quer dizer com isso"),
});

export const DuvidaSchema = z.object({
  pergunta: z.string().min(1).describe("Pergunta curta e direta ao personal, em português, uma coisa só"),
  trecho: z.string().describe("O trecho do plano que gerou a dúvida, para ele lembrar do contexto"),
  opcoes: z
    .array(z.string().min(1))
    .describe("Até 3 respostas prováveis, com no máximo 40 caracteres cada (viram botões). Vazio se a resposta for aberta."),
});

export const MetodologiaSchema = z.object({
  resumo: z.string().describe("Como esse personal monta treinos, em 3 a 6 frases"),
  divisoesPreferidas: z.array(z.string()).describe('Ex.: "ABC para 3x", "Superior/Inferior para 4x"'),
  exerciciosFrequentes: z.array(z.string()).describe("Nomes de exercícios exatamente como o personal escreve"),
  padroesPrescricao: z.string().describe("Faixas típicas de séries, repetições, descanso e métodos (bi-set, drop-set...)"),
  estiloOrientacoes: z.string().describe("Como ele escreve observações e orientações ao aluno"),
  glossario: z
    .array(TermoSchema)
    .describe("Termos e abreviações do personal com significado CONFIRMADO. Não coloque aqui o que ainda é dúvida."),
  regras: z
    .array(z.string())
    .describe('Regras de prescrição confirmadas. Ex.: "Na panturrilha, se tiver máquina, usar a máquina".'),
  duvidas: z
    .array(DuvidaSchema)
    .describe("No máximo 5. " + "O que não dá para entender com certeza pelos planos. As mais importantes primeiro. Vazio se não houver."),
});

export type Termo = z.infer<typeof TermoSchema>;
export type Duvida = z.infer<typeof DuvidaSchema>;
export type Metodologia = z.infer<typeof MetodologiaSchema>;

export type RespostaEntrevista = { duvida: Duvida; resposta: string };

/**
 * Limites de apresentação aplicados em código, não no schema: se o modelo passar do limite,
 * cortamos em vez de falhar a chamada inteira.
 */
export function limitarDuvidas(m: Metodologia, maxDuvidas = 5, maxOpcoes = 3): Metodologia {
  return {
    ...m,
    duvidas: (m.duvidas ?? []).slice(0, maxDuvidas).map((d) => ({ ...d, opcoes: d.opcoes.slice(0, maxOpcoes) })),
  };
}
