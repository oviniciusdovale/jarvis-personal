/**
 * Testa a entrevista da metodologia no Terminal, sem Telegram.
 * Lê o plano de exemplo, mostra as dúvidas, você responde como se fosse o personal,
 * e a metodologia final fica salva em data/metodologia-exemplo.json
 * (usada depois por gerar:caso e consistencia).
 *
 * Uso: npm run entrevista
 *      npm run entrevista -- caminho/do/plano.md
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { extrairMetodologia, refinarMetodologia } from "../src/ia/metodologia.js";
import { formatarPergunta, formatarResumoMetodologia } from "../src/formatacao/metodologia.js";
import type { RespostaEntrevista } from "../src/dominio/metodologia.js";

const caminho = process.argv[2] ?? "exemplos/plano-real-adaptacao.md";
const plano = await readFile(caminho, "utf8");

console.log(`Lendo ${caminho}...`);
const { metodologia } = await extrairMetodologia([{ tipo: "texto", conteudo: plano }]);
const duvidas = metodologia.duvidas ?? [];

let final = metodologia;
if (duvidas.length === 0) {
  console.log("\nNenhuma dúvida: o plano foi claro o suficiente.");
} else {
  console.log(`\n${duvidas.length} pergunta(s). Responda com o número da opção ou escreva a resposta. Enter vazio = pular.\n`);
  const rl = createInterface({ input: stdin, output: stdout });
  const respostas: RespostaEntrevista[] = [];
  for (const [i, duvida] of duvidas.entries()) {
    console.log(formatarPergunta(duvida, i, duvidas.length));
    duvida.opcoes.forEach((o, j) => console.log(`  ${j + 1}) ${o}`));
    const entrada = (await rl.question("> ")).trim();
    const opcao = duvida.opcoes[Number(entrada) - 1];
    respostas.push({ duvida, resposta: entrada === "" ? "Não sei / tanto faz" : (opcao ?? entrada) });
    console.log("");
  }
  rl.close();
  console.log("Atualizando a metodologia com as respostas...");
  final = (await refinarMetodologia(metodologia, respostas)).metodologia;
}

await mkdir("data", { recursive: true });
await writeFile("data/metodologia-exemplo.json", JSON.stringify(final, null, 2));
console.log(`\n${formatarResumoMetodologia(final)}\n\nSalvo em data/metodologia-exemplo.json (gerar:caso e consistencia vão usar).`);
