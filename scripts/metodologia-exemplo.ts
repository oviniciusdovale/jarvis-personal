import { readFile } from "node:fs/promises";
import type { Metodologia } from "../src/dominio/metodologia.js";
import { extrairMetodologia } from "../src/ia/metodologia.js";

/**
 * Metodologia dos scripts de teste: usa a salva pela entrevista (npm run entrevista),
 * ou extrai do plano de exemplo sem perguntas.
 */
export async function metodologiaDeExemplo(): Promise<{ metodologia: Metodologia; origem: string }> {
  try {
    const salva = JSON.parse(await readFile("data/metodologia-exemplo.json", "utf8")) as Metodologia;
    return { metodologia: salva, origem: "data/metodologia-exemplo.json (com entrevista)" };
  } catch {
    const plano = await readFile("exemplos/plano-real-adaptacao.md", "utf8");
    const { metodologia } = await extrairMetodologia([{ tipo: "texto", conteudo: plano }]);
    return { metodologia, origem: "extraída agora, sem entrevista" };
  }
}
