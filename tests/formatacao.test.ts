import { describe, expect, it } from "vitest";
import type { Plano } from "../src/dominio/plano.js";
import { PlanoSchema } from "../src/dominio/plano.js";
import {
  dividirMensagem,
  formatarCabecalho,
  formatarDescanso,
  formatarFicha,
  formatarParaAluno,
} from "../src/formatacao/texto.js";
import { schemaDaFerramenta } from "../src/ia/cliente.js";

const plano: Plano = {
  titulo: "Hipertrofia 4x – glúteo",
  objetivo: "Hipertrofia",
  nivel: "intermediario",
  frequenciaSemanal: 4,
  duracaoSemanas: 6,
  fichas: [
    {
      letra: "A",
      nome: "Inferior com ênfase em glúteo",
      prescricoes: [
        { exercicio: "Elevação pélvica na máquina", series: 4, repeticoes: "8-10", descansoSegundos: 90, observacao: "Segurar 1s no topo" },
        { exercicio: "Mesa flexora", series: 3, repeticoes: "12", descansoSegundos: 60 },
      ],
    },
  ],
  orientacoes: ["Aquecer 5 min antes"],
  alertas: [
    { tipo: "informacao_faltando", mensagem: "Confirmar equipamentos" },
    { tipo: "restricao", mensagem: "Joelho direito: evitei agachamento profundo" },
  ],
  justificativa: "Divisão superior/inferior para 4x.",
};

describe("formatação", () => {
  it("formata descanso em segundos e minutos", () => {
    expect(formatarDescanso(0)).toBe("sem descanso");
    expect(formatarDescanso(45)).toBe("45s");
    expect(formatarDescanso(90)).toBe("1min30s");
    expect(formatarDescanso(120)).toBe("2min");
  });

  it("formata a ficha com observação", () => {
    const texto = formatarFicha(plano.fichas[0]!);
    expect(texto).toContain("Treino A: Inferior com ênfase em glúteo");
    expect(texto).toContain("1. Elevação pélvica na máquina: 4x8-10 · 1min30s");
    expect(texto).toContain("↳ Segurar 1s no topo");
  });

  it("mostra restrições antes de informações faltando", () => {
    const texto = formatarCabecalho(plano, "Ana");
    expect(texto.indexOf("Joelho")).toBeLessThan(texto.indexOf("equipamentos"));
  });

  it("versão do aluno não mostra alertas nem justificativa", () => {
    const texto = formatarParaAluno(plano);
    expect(texto).not.toContain("Joelho");
    expect(texto).not.toContain("Divisão superior");
    expect(texto).toContain("Aquecer 5 min antes");
  });

  it("divide mensagens longas sem cortar linhas", () => {
    const linhas = Array.from({ length: 50 }, (_, i) => `linha ${i} ${"x".repeat(80)}`);
    const partes = dividirMensagem(linhas.join("\n"), 1000);
    expect(partes.length).toBeGreaterThan(1);
    expect(partes.every((p) => p.length <= 1000)).toBe(true);
    expect(partes.join("\n")).toBe(linhas.join("\n"));
  });
});

describe("schema do plano", () => {
  it("aceita um plano válido", () => {
    expect(PlanoSchema.safeParse(plano).success).toBe(true);
  });

  it("recusa ficha sem exercícios", () => {
    const invalido = { ...plano, fichas: [{ letra: "A", nome: "Vazia", prescricoes: [] }] };
    expect(PlanoSchema.safeParse(invalido).success).toBe(false);
  });

  it("gera input_schema de ferramenta do tipo objeto, sem $schema", () => {
    const schema = schemaDaFerramenta(PlanoSchema) as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(schema).not.toHaveProperty("$schema");
  });
});
