/**
 * Roda os casos de teste com perfis diferentes, UMA vez cada, e confere o checklist de cada um.
 *
 * Uso: npm run casos                          (todos, menos aluna-j, que já tem o teste de consistência)
 *      npm run casos -- lombalgia avancado    (só os casos indicados)
 * Custo: cerca de US$ 0,10 a 0,25 por caso.
 * Para conferir de novo os resultados salvos sem gastar nada: npm run checar
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gerarRascunhoRevisado } from "../src/ia/gerador.js";
import { metodologiaDeExemplo } from "./metodologia-exemplo.js";
import { casos } from "./casos-registro.js";

const pedidos = process.argv.slice(2);
const selecionados = pedidos.length > 0 ? casos.filter((c) => pedidos.includes(c.id)) : casos.filter((c) => c.id !== "aluna-j");
if (selecionados.length === 0) {
  console.log(`Nenhum caso encontrado. Disponíveis: ${casos.map((c) => c.id).join(", ")}`);
  process.exit(1);
}

const { metodologia, origem } = await metodologiaDeExemplo();
console.log(`Metodologia: ${origem}`);
await mkdir("data/casos", { recursive: true });

const resumo: string[] = [];
for (const caso of selecionados) {
  const anamnese = await readFile(caso.anamnese, "utf8");
  const inicio = Date.now();
  const r = await gerarRascunhoRevisado({ anamnese: [{ tipo: "texto", conteudo: anamnese }], metodologia });
  const segundos = Math.round((Date.now() - inicio) / 1000);
  await writeFile(`data/casos/${caso.id}.json`, JSON.stringify(r, null, 2));

  const resultados = caso.checklist.map(([nome, teste]) => [nome, teste(r.plano, r)] as const);
  const ok = resultados.filter(([, passou]) => passou).length;
  console.log(
    `\n${caso.id} · ${caso.descricao}\n${segundos}s · ${r.tentativas} tentativa(s) · skills: ${r.skills.map((s) => s.nome).join(", ") || "nenhuma"} · tokens ${r.uso.entrada}/${r.uso.saida}`,
  );
  for (const [nome, passou] of resultados) console.log(`  ${passou ? "✅" : "❌"} ${nome}`);
  for (const p of r.pendentes) console.log(`     pendente: ${p.descricao}`);
  resumo.push(`${ok}/${resultados.length}  ${caso.id}`);
}

console.log(`\n=== Resumo ===\n${resumo.join("\n")}\n\nRascunhos salvos em data/casos/. Para ler um: npm run ver -- <caso>`);
