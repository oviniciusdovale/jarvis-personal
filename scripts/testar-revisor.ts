/**
 * Confere se o revisor encontra os problemas conhecidos do primeiro rascunho da Aluna J.
 * Uso: npm run testar:revisor  (precisa de ANTHROPIC_API_KEY)
 */
import { readFile } from "node:fs/promises";
import { conferirRascunho } from "../src/ia/gerador.js";
import { carregarSkills, selecionarSkills } from "../src/conhecimento/skills.js";
import { rascunhoAlunaJ } from "../tests/casos/aluna-j-rascunho-v1.js";

const anamnese = await readFile("tests/casos/aluna-j-anamnese.md", "utf8");

console.time("revisão");
const entrada = [{ tipo: "texto" as const, conteudo: anamnese }];
const skills = selecionarSkills(await carregarSkills(), entrada);
console.log(`skills: ${skills.map((s) => s.nome).join(", ") || "nenhuma"}`);
const { problemas, uso } = await conferirRascunho({ anamnese: entrada, plano: rascunhoAlunaJ, skills });
console.timeEnd("revisão");

for (const p of problemas) console.log(`[${p.origem} · ${p.gravidade}] ${p.descricao}`);

// Problemas que esperamos ver apontados (busca por palavras-chave no texto).
const esperados: Array<[string, RegExp]> = [
  ["core prometido e ausente", /core|abdom/i],
  ["aquecimento como bloco repetido", /aparece duas vezes/i],
  ["recado ao personal nas orientações do aluno", /orienta[çc][õo]es? (do|ao|para o) aluno|orientacoesAluno/i],
  ["frequência 2x sem orientação", /2 (vezes|treinos|dias)|duas vezes|frequ[êe]ncia/i],
  ["nível incoerente", /n[íi]vel|intermedi/i],
  ["expectativa ligada ao lipedema", /(expectativa[\s\S]*lipedema|lipedema[\s\S]*expectativa)/i],
  ["carga 0 kg", /0\s*kg/i],
];
// Cada verificação olha um problema por vez, para uma palavra solta não contar como acerto.
const encontrou = (regex: RegExp) => problemas.some((p) => regex.test(p.descricao));
console.log("\nChecklist:");
let acertos = 0;
for (const [nome, regex] of esperados) {
  const ok = encontrou(regex);
  if (ok) acertos++;
  console.log(`${ok ? "✅" : "❌"} ${nome}`);
}
console.log(`\n${acertos}/${esperados.length} encontrados · tokens: ${uso.entrada} entrada, ${uso.saida} saída (só o revisor de IA)`);
