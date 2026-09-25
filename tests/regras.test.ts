import { describe, expect, it } from "vitest";
import type { Plano } from "../src/dominio/plano.js";
import {
  verificarCardio,
  verificarCargaZero,
  verificarRegras,
  verificarRepetidosNaFicha,
  verificarRepeticoes,
  verificarVariedade,
} from "../src/validacao/regras.js";
import { rascunhoAlunaJ } from "./casos/aluna-j-rascunho-v1.js";
import { planoBase } from "./fixtures.js";

describe("regras do caso Aluna J", () => {
  it("aponta aquecimento escrito como bloco repetido (Treino A)", () => {
    const problemas = verificarRepetidosNaFicha(rascunhoAlunaJ);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]!.descricao).toContain("Treino A");
    expect(problemas[0]!.descricao).toContain("Leg Press 45");
  });

  it("aponta cargas 0 kg, inclusive dentro de combinados", () => {
    expect(verificarCargaZero(rascunhoAlunaJ)).toHaveLength(1);
  });

  it("não acusa falta de variedade entre fichas diferentes", () => {
    expect(verificarVariedade(rascunhoAlunaJ)).toHaveLength(0);
  });
});

describe("regras gerais", () => {
  it("plano bem formado passa sem problemas", () => {
    expect(verificarRegras(planoBase)).toHaveLength(0);
  });

  it("acusa fichas que só trocam a ordem, ignorando maiúsculas e acentos", () => {
    const plano: Plano = {
      ...planoBase,
      fichas: [
        {
          letra: "A",
          nome: "Inferior",
          blocos: ["Leg press", "Mesa flexora", "Elevação pélvica"].map((exercicio) => ({
            tipo: "simples" as const,
            exercicio,
            series: 3,
            repeticoes: "10",
            descansoSegundos: 60,
          })),
        },
        {
          letra: "C",
          nome: "Inferior 2",
          blocos: ["Mesa Flexora", "Leg Press", "Elevacao pelvica"].map((exercicio) => ({
            tipo: "simples" as const,
            exercicio,
            series: 4,
            repeticoes: "12",
            descansoSegundos: 60,
          })),
        },
      ],
    };
    expect(verificarVariedade(plano)).toHaveLength(1);
  });

  it("acusa cardio intervalado sem tiros e contínuo sem duração", () => {
    const plano: Plano = {
      ...planoBase,
      fichas: [
        {
          letra: "A",
          nome: "Cardio",
          blocos: [
            { tipo: "cardio", exercicio: "Bike", protocolo: "intervalado", intensidade: "forte" },
            { tipo: "cardio", exercicio: "Esteira", protocolo: "continuo", intensidade: "leve" },
          ],
        },
      ],
    };
    expect(verificarCardio(plano)).toHaveLength(2);
  });
});

describe("repetições", () => {
  const comRepeticoes = (repeticoes: string): Plano => ({
    ...planoBase,
    fichas: [
      {
        letra: "A",
        nome: "X",
        blocos: [{ tipo: "simples", exercicio: "Leg Press 45", series: 3, repeticoes, descansoSegundos: 60 }],
      },
    ],
  });

  it("acusa séries escritas dentro das repetições", () => {
    expect(verificarRepeticoes(comRepeticoes("1x20 / 2x10"))).toHaveLength(1);
    expect(verificarRepeticoes(comRepeticoes("3 X 10"))).toHaveLength(1);
  });

  it("aceita faixas, pirâmide, tempo e falha", () => {
    for (const r of ["10", "8-12", "12/10/8", "30s", "3 min", "até a falha"]) {
      expect(verificarRepeticoes(comRepeticoes(r))).toHaveLength(0);
    }
  });
});
