import { describe, expect, it } from "vitest";
import { MetodologiaSchema, type Metodologia } from "../src/dominio/metodologia.js";
import { formatarPergunta, formatarResumoMetodologia } from "../src/formatacao/metodologia.js";
import { sistemaGerador } from "../src/ia/prompts.js";

const metodologia: Metodologia = {
  resumo: "Divide em inferiores, superiores e misto.",
  divisoesPreferidas: ["ABC para 3x"],
  exerciciosFrequentes: ["Leg Press 45"],
  padroesPrescricao: "3x10, 60s",
  estiloOrientacoes: "Direto.",
  glossario: [{ termo: 'PAUSANDO 10"', significado: "10 segundos de descanso entre as séries" }],
  regras: ["Na panturrilha, se tiver máquina, usar a máquina"],
  duvidas: [
    {
      pergunta: 'O que significa "PAUSANDO 10""?',
      trecho: '5 X 10 PAUSANDO 10"',
      opcoes: ["Descanso de 10s", "Isometria de 10s"],
    },
  ],
};

describe("metodologia", () => {
  it("schema aceita metodologia com glossário, regras e dúvidas", () => {
    expect(MetodologiaSchema.safeParse(metodologia).success).toBe(true);
  });

  it("formata a pergunta com número e trecho do plano", () => {
    const texto = formatarPergunta(metodologia.duvidas[0]!, 0, 3);
    expect(texto).toContain("Pergunta 1 de 3");
    expect(texto).toContain('No seu plano: "5 X 10 PAUSANDO 10""');
  });

  it("resumo mostra vocabulário e regras confirmadas", () => {
    const texto = formatarResumoMetodologia(metodologia);
    expect(texto).toContain('"PAUSANDO 10"": 10 segundos de descanso entre as séries');
    expect(texto).toContain("Na panturrilha, se tiver máquina");
  });

  it("gerador recebe o vocabulário confirmado", () => {
    const prompt = sistemaGerador(metodologia);
    expect(prompt).toContain("Vocabulário do personal");
    expect(prompt).toContain("10 segundos de descanso entre as séries");
    expect(prompt).toContain("Regras confirmadas pelo personal");
  });

  it("aceita metodologia antiga, salva sem glossário e regras", () => {
    const antiga = { ...metodologia } as Partial<Metodologia>;
    delete antiga.glossario;
    delete antiga.regras;
    expect(() => sistemaGerador(antiga as Metodologia)).not.toThrow();
  });
});
