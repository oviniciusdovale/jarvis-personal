/**
 * Roda o fluxo completo várias vezes para o caso Aluna J e mede, em cada rodada,
 * se o rascunho final cumpre o checklist. Uma rodada boa não prova nada: a IA varia.
 *
 * Uso: npm run consistencia            (1 rodada)
 *      npm run consistencia -- 3       (3 rodadas, só em marcos importantes)
 * Custo: cerca de US$ 0,10 a 0,25 por rodada; leva 1 a 2 minutos cada.
 * Para conferir os rascunhos já salvos sem gastar nada: npm run checar
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { gerarRascunhoRevisado } from "../src/ia/gerador.js";
import { metodologiaDeExemplo } from "./metodologia-exemplo.js";
import { checklist } from "./checklist-aluna-j.js";

const rodadas = Number(process.argv[2] ?? 1);
const anamnese = await readFile("tests/casos/aluna-j-anamnese.md", "utf8");

const { metodologia, origem } = await metodologiaDeExemplo();
console.log(`Metodologia: ${origem}`);
const acertos = new Map<string, number>(checklist.map(([nome]) => [nome, 0]));
await mkdir("data/consistencia", { recursive: true });

for (let i = 1; i <= rodadas; i++) {
  const inicio = Date.now();
  const r = await gerarRascunhoRevisado({ anamnese: [{ tipo: "texto", conteudo: anamnese }], metodologia });
  const segundos = Math.round((Date.now() - inicio) / 1000);
  await writeFile(`data/consistencia/rodada-${i}.json`, JSON.stringify(r, null, 2));

  const linhas = checklist.map(([nome, teste]) => {
    const ok = teste(r.plano);
    if (ok) acertos.set(nome, (acertos.get(nome) ?? 0) + 1);
    return `  ${ok ? "✅" : "❌"} ${nome}`;
  });
  console.log(
    `\nRodada ${i}: ${segundos}s · ${r.tentativas} tentativa(s)${r.mantevePrimeira ? " (manteve a 1ª)" : ""} · ${r.pendentes.length} pendente(s) · tokens ${r.uso.entrada}/${r.uso.saida}`,
  );
  console.log(linhas.join("\n"));
}

console.log(`\n=== Resumo (${rodadas} rodadas) ===`);
for (const [nome] of checklist) console.log(`${acertos.get(nome)}/${rodadas}  ${nome}`);
console.log("\nRascunhos completos salvos em data/consistencia/.");
