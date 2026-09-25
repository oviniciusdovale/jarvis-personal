/**
 * Confere os rascunhos já salvos em data/consistencia/ com o checklist e as regras atuais.
 * Não chama a IA: custo zero. Útil depois de mudar uma regra, para ver se ela pega os erros antigos.
 *
 * Uso: npm run checar
 */
import { readdir, readFile } from "node:fs/promises";
import type { ResultadoGeracao } from "../src/ia/gerador.js";
import { verificarRegras } from "../src/validacao/regras.js";
import { checklist } from "./checklist-aluna-j.js";
import { casos } from "./casos-registro.js";

const pasta = "data/consistencia";
const arquivos = (await readdir(pasta).catch(() => [])).filter((a) => a.endsWith(".json")).sort();

for (const arquivo of arquivos) {
  const r = JSON.parse(await readFile(`${pasta}/${arquivo}`, "utf8")) as ResultadoGeracao;
  console.log(`\n${arquivo}`);
  for (const [nome, teste] of checklist) console.log(`  ${teste(r.plano) ? "✅" : "❌"} ${nome}`);
  for (const p of verificarRegras(r.plano)) console.log(`     regra: ${p.descricao}`);
}

// Casos com perfis diferentes (npm run casos)
for (const caso of casos) {
  let r: ResultadoGeracao;
  try {
    r = JSON.parse(await readFile(`data/casos/${caso.id}.json`, "utf8")) as ResultadoGeracao;
  } catch {
    continue;
  }
  console.log(`\ncasos/${caso.id}`);
  for (const [nome, teste] of caso.checklist) console.log(`  ${teste(r.plano, r) ? "✅" : "❌"} ${nome}`);
}
