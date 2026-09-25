/**
 * Fluxo completo com revisão para o caso Aluna J, usando a metodologia do plano real de exemplo.
 * Uso: npm run gerar:caso  (precisa de ANTHROPIC_API_KEY)
 */
import { readFile } from "node:fs/promises";
import { gerarRascunhoRevisado } from "../src/ia/gerador.js";
import { metodologiaDeExemplo } from "./metodologia-exemplo.js";
import { formatarCabecalho, formatarFicha, formatarParaAluno, formatarRevisaoAutomatica } from "../src/formatacao/texto.js";

const anamnese = await readFile("tests/casos/aluna-j-anamnese.md", "utf8");

const { metodologia, origem } = await metodologiaDeExemplo();
console.log(`Metodologia: ${origem}`);

console.time("geração + revisão");
const r = await gerarRascunhoRevisado({ anamnese: [{ tipo: "texto", conteudo: anamnese }], metodologia }, async (etapa) =>
  console.log(`… ${etapa}`),
);
console.timeEnd("geração + revisão");

console.log(`\nSkills: ${r.skills.map((s) => s.nome).join(", ") || "nenhuma"}`);
console.log(`Tentativas: ${r.tentativas}${r.mantevePrimeira ? " (manteve a primeira versão)" : ""}`);
for (const p of r.corrigidos) console.log(`corrigido: ${p.descricao}`);
console.log(`\n${formatarRevisaoAutomatica(r) ?? "Revisão sem apontamentos."}\n`);
console.log(formatarCabecalho(r.plano, "Aluna J"));
for (const f of r.plano.fichas) console.log(`\n${formatarFicha(f)}`);
console.log(`\n=== Versão que vai para o aluno ===\n\n${formatarParaAluno(r.plano)}`);
console.log(`\nTokens (tudo): ${r.uso.entrada} entrada, ${r.uso.saida} saída`);
