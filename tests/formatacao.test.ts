import { describe, expect, it } from "vitest";
import { PlanoSchema } from "../src/dominio/plano.js";
import {
  dividirMensagem,
  formatarCabecalho,
  formatarDescanso,
  formatarFicha,
  formatarFrequencia,
  formatarParaAluno,
} from "../src/formatacao/texto.js";
import { schemaDaFerramenta } from "../src/ia/cliente.js";
import { planoBase } from "./fixtures.js";

describe("formatação", () => {
  it("formata descanso em segundos e minutos", () => {
    expect(formatarDescanso(0)).toBe("sem descanso");
    expect(formatarDescanso(45)).toBe("45s");
    expect(formatarDescanso(90)).toBe("1min30s");
    expect(formatarDescanso(120)).toBe("2min");
  });

  it("formata frequência fixa e variável", () => {
    expect(formatarFrequencia({ minima: 3, maxima: 3 })).toBe("3x/semana");
    expect(formatarFrequencia({ minima: 2, maxima: 3 })).toBe("2 a 3x/semana");
  });

  it("mostra aquecimento dentro do exercício, não como linha separada", () => {
    const texto = formatarFicha(planoBase.fichas[0]!);
    expect(texto).toContain("1. Agachamento Smith: 3x10 · 1min · moderada");
    expect(texto).toContain("aquecimento: 1x20 (leve)");
    expect(texto.match(/Agachamento Smith/g)).toHaveLength(1);
  });

  it("formata cardio intervalado", () => {
    expect(formatarFicha(planoBase.fichas[0]!)).toContain('3. 🚴 Bike Spinning: 8x 20" / 10" de pausa · forte');
  });

  it("formata combinado com voltas, descanso e itens", () => {
    const texto = formatarFicha(planoBase.fichas[1]!);
    expect(texto).toContain("1. 🔁 Circuito com bike · 3 voltas · sem descanso entre os exercícios, 1min ao fim da volta");
    expect(texto).toContain("   c) Bike Spinning: 3 min");
    expect(texto).toContain("2. 🚴 Esteira: 10 min · leve");
  });

  it("mostra restrições antes de informações faltando", () => {
    const texto = formatarCabecalho(planoBase, "Ana");
    expect(texto).toContain("Iniciante/Intermediário · 2 a 3x/semana");
    expect(texto.indexOf("Joelho")).toBeLessThan(texto.indexOf("equipamentos"));
  });

  it("versão do aluno não mostra alertas nem justificativa", () => {
    const texto = formatarParaAluno(planoBase);
    expect(texto).not.toContain("Joelho");
    expect(texto).not.toContain("circuito metabólico");
    expect(texto).toContain("Aqueça 5 minutos");
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
  it("aceita um plano válido com os três tipos de bloco", () => {
    expect(PlanoSchema.safeParse(planoBase).success).toBe(true);
  });

  it("recusa combinado com um item só", () => {
    const invalido = {
      ...planoBase,
      fichas: [{ letra: "A", nome: "X", blocos: [{ tipo: "combinado", voltas: 3, descansoEntreItensSegundos: 0, descansoAoFimDaVoltaSegundos: 60, itens: [{ exercicio: "Supino", repeticoes: "10" }] }] }],
    };
    expect(PlanoSchema.safeParse(invalido).success).toBe(false);
  });

  it("gera input_schema de ferramenta do tipo objeto, sem $schema", () => {
    const schema = schemaDaFerramenta(PlanoSchema) as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(schema).not.toHaveProperty("$schema");
  });
});
