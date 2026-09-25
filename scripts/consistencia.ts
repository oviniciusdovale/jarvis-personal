/**
 * Roda o fluxo completo várias vezes para o caso Aluna J e mede, em cada rodada,
 * se o rascunho final cumpre o checklist. Uma rodada boa não prova nada: a IA varia.
 *
 * Uso: npm run consistencia            (5 rodadas)
 *      npm run consistencia -- 3       (3 rodadas)
 * Custo: cerca de US$ 0,10 a 0,25 por rodada; leva 1 a 2 minutos cada.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { gerarRascunhoRevisado } from "../src/ia/gerador.js";
import { extrairMetodologia } from "../src/ia/metodologia.js";
import { verificarRegras } from "../src/validacao/regras.js";
import type { Plano } from "../src/dominio/plano.js";

const rodadas = Number(process.argv[2] ?? 5);
const planoReal = await readFile("exemplos/plano-real-adaptacao.md", "utf8");
const anamnese = await readFile("tests/casos/aluna-j-anamnese.md", "utf8");

const textoAlertas = (p: Plano) => p.alertas.map((a) => a.mensagem).join("\n");
const textoAluno = (p: Plano) =>
  [
    ...p.orientacoesAluno,
    ...p.fichas.flatMap((f) =>
      f.blocos.flatMap((b) => (b.tipo === "combinado" ? [b.observacao, ...b.itens.map((i) => i.observacao)] : [b.observacao])),
    ),
  ]
    .filter(Boolean)
    .join("\n");

const checklist: Array<[string, (p: Plano) => boolean]> = [
  ["alerta de expectativa ligado ao lipedema", (p) => /lipedema/i.test(textoAlertas(p)) && /expectativ/i.test(textoAlertas(p))],
  ["alerta de fisioterapia pélvica (diástase)", (p) => /fisioterap/i.test(textoAlertas(p))],
  ["frequência 2 a 3", (p) => p.frequencia.minima === 2 && p.frequencia.maxima === 3],
  ["nível iniciante/intermediário", (p) => p.nivel === "iniciante_intermediario"],
  ["orienta semanas de 2 treinos", (p) => /2 (vezes|treinos)|duas vezes|só 2|apenas 2/i.test(p.orientacoesAluno.join("\n"))],
  ["sem erros das regras de código", (p) => verificarRegras(p).length === 0],
  [
    "sem raciocínio clínico na versão do aluno",
    (p) => !/relatad|hist[óo]rico de|anamnese|personal:|converse com a aluna/i.test(textoAluno(p)),
  ],
];

const { metodologia } = await extrairMetodologia([{ tipo: "texto", conteudo: planoReal }]);
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
