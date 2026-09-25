import type { Anexo } from "../ia/entrada.js";
import type { Plano } from "../dominio/plano.js";
import type { Metodologia, RespostaEntrevista } from "../dominio/metodologia.js";

/**
 * Estado da conversa com cada personal. Fica em memória: se o bot reiniciar,
 * a conversa em andamento se perde, mas os planos salvos continuam no disco.
 */
export type Sessao =
  | { modo: "livre" }
  | { modo: "metodologia"; anexos: Anexo[] }
  /** Perguntas sobre o que ficou ambíguo nos planos. A pergunta atual é a de índice respostas.length. */
  | { modo: "entrevista"; metodologia: Metodologia; respostas: RespostaEntrevista[] }
  | { modo: "anamnese"; aluno: string; anexos: Anexo[] }
  | { modo: "revisando"; planoId: string; pendente?: { plano: Plano; mudancas: string[] } };

const sessoes = new Map<number, Sessao>();

export function obterSessao(chatId: number): Sessao {
  return sessoes.get(chatId) ?? { modo: "livre" };
}

export function definirSessao(chatId: number, sessao: Sessao) {
  sessoes.set(chatId, sessao);
}
