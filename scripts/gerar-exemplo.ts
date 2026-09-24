/**
 * Testa o gerador sem Telegram: extrai a metodologia do plano de exemplo,
 * gera o rascunho para a anamnese de exemplo e aplica uma revisão.
 *
 * Uso: npm run gerar:exemplo
 * Precisa só de ANTHROPIC_API_KEY no .env.
 */
import { readFile } from "node:fs/promises";
import { gerarRascunho, revisarRascunho } from "../src/ia/gerador.js";
import { extrairMetodologia } from "../src/ia/metodologia.js";
import { formatarCabecalho, formatarFicha, formatarMudancas } from "../src/formatacao/texto.js";

const planoAntigo = await readFile("exemplos/plano-antigo-exemplo.md", "utf8");
const anamnese = await readFile("exemplos/anamnese-exemplo.md", "utf8");

console.time("metodologia");
const { metodologia, uso: usoMetodologia } = await extrairMetodologia([{ tipo: "texto", conteudo: planoAntigo }]);
console.timeEnd("metodologia");
console.log("\n=== Metodologia ===\n", metodologia);

console.time("rascunho");
const { plano, uso: usoRascunho } = await gerarRascunho({ anamnese: [{ tipo: "texto", conteudo: anamnese }], metodologia });
console.timeEnd("rascunho");
console.log("\n=== Rascunho ===\n");
console.log(formatarCabecalho(plano, "Aluna A"));
for (const ficha of plano.fichas) console.log(`\n${formatarFicha(ficha)}`);

console.time("revisao");
const { revisao, uso: usoRevisao } = await revisarRascunho({
  plano,
  pedido: "troca a mesa flexora por stiff com halteres, 4 séries",
  metodologia,
});
console.timeEnd("revisao");
console.log(`\n=== Revisão (${revisao.entendimento}) ===\n`);
console.log(revisao.entendimento === "claro" ? formatarMudancas(revisao.mudancas) : revisao.pergunta);

const total = [usoMetodologia, usoRascunho, usoRevisao].reduce(
  (acc, u) => ({ entrada: acc.entrada + u.entrada, saida: acc.saida + u.saida }),
  { entrada: 0, saida: 0 },
);
console.log(`\nTokens: ${total.entrada} de entrada, ${total.saida} de saída. Multiplique pela tabela de preços do modelo para o custo.`);
