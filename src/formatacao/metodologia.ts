import type { Duvida, Metodologia } from "../dominio/metodologia.js";

export function formatarPergunta(duvida: Duvida, indice: number, total: number): string {
  return [`Pergunta ${indice + 1} de ${total}`, "", duvida.pergunta, duvida.trecho ? `\nNo seu plano: "${duvida.trecho}"` : ""]
    .join("\n")
    .trim();
}

export function formatarResumoMetodologia(m: Metodologia): string {
  const linhas = [
    "Entendi assim o seu jeito de montar treino:",
    "",
    m.resumo,
    "",
    `Divisões: ${m.divisoesPreferidas.join("; ")}`,
    `Padrões: ${m.padroesPrescricao}`,
  ];
  const glossario = m.glossario ?? [];
  if (glossario.length > 0) {
    linhas.push("", "Seu vocabulário:", ...glossario.map((t) => `• "${t.termo}": ${t.significado}`));
  }
  const regras = m.regras ?? [];
  if (regras.length > 0) {
    linhas.push("", "Suas regras:", ...regras.map((r) => `• ${r}`));
  }
  linhas.push("", "Se algo estiver errado, rode /metodologia de novo. Agora já dá para usar /novo.");
  return linhas.join("\n");
}
