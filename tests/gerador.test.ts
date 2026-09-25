import { describe, expect, it } from "vitest";
import { escolherVersao } from "../src/ia/gerador.js";
import type { Problema } from "../src/validacao/regras.js";

const revisor = (descricao: string): Problema => ({ origem: "revisor", gravidade: "corrigir", descricao });
const regra = (descricao: string): Problema => ({ origem: "regra", gravidade: "corrigir", descricao });
const sugestao = (descricao: string): Problema => ({ origem: "revisor", gravidade: "sugestao", descricao });

describe("escolherVersao", () => {
  it("fica com a segunda quando ela tem menos problemas", () => {
    expect(escolherVersao([revisor("a"), revisor("b"), revisor("c")], [revisor("x")])).toBe(2);
  });

  it("mantém a primeira quando a segunda piorou", () => {
    expect(escolherVersao([revisor("a")], [revisor("x"), revisor("y"), revisor("z")])).toBe(1);
  });

  it("empate fica com a segunda", () => {
    expect(escolherVersao([revisor("a")], [revisor("b")])).toBe(2);
  });

  it("erro de regra pesa mais que apontamento do revisor", () => {
    expect(escolherVersao([revisor("a"), revisor("b")], [regra("x"), regra("y")])).toBe(1);
  });

  it("sugestões não contam", () => {
    expect(escolherVersao([revisor("a")], [sugestao("x"), sugestao("y"), sugestao("z")])).toBe(2);
  });
});
