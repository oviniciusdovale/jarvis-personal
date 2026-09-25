/**
 * Mostra um rascunho salvo como o personal e o aluno veriam. Sem custo.
 * Uso: npm run ver -- lombalgia
 */
import { readFile } from "node:fs/promises";
import type { ResultadoGeracao } from "../src/ia/gerador.js";
import { formatarCabecalho, formatarFicha, formatarParaAluno, formatarRevisaoAutomatica } from "../src/formatacao/texto.js";

const id = process.argv[2];
if (!id) {
  console.log("Uso: npm run ver -- <caso>   (ex.: lombalgia, avancado, treino-em-casa, idoso-hipertensao)");
  process.exit(1);
}
const r = JSON.parse(await readFile(`data/casos/${id}.json`, "utf8")) as ResultadoGeracao;
console.log(formatarRevisaoAutomatica(r) ?? "");
console.log(`\n${formatarCabecalho(r.plano, id)}`);
for (const f of r.plano.fichas) console.log(`\n${formatarFicha(f)}`);
console.log(`\n=== Versão que vai para o aluno ===\n\n${formatarParaAluno(r.plano)}`);
