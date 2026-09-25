import { describe, expect, it } from "vitest";
import {
  anamneseParaTexto,
  CAMPOS,
  CONSENTIMENTO_ID,
  respostasDoFormulario,
  validarRespostas,
} from "../src/dominio/anamnese.js";
import { carregarSkills, selecionarSkills } from "../src/conhecimento/skills.js";
import { respostasValidas } from "./fixtures.js";



describe("formulário de anamnese", () => {
  it("aceita respostas completas", () => {
    expect(validarRespostas(respostasValidas)).toEqual({});
  });

  it("exige obrigatórias, consentimento e valores válidos", () => {
    const { idade: _i, [CONSENTIMENTO_ID]: _c, ...semIdade } = respostasValidas;
    const erros = validarRespostas({ ...semIdade, peso: "abc", local: "Na lua", parq3: "talvez" });
    expect(Object.keys(erros).sort()).toEqual([CONSENTIMENTO_ID, "idade", "local", "parq3", "peso"].sort());
  });

  it("limita o tamanho dos textos", () => {
    expect(validarRespostas({ ...respostasValidas, dores: "x".repeat(1001) })).toHaveProperty("dores");
  });

  it("ids dos campos são únicos", () => {
    const ids = CAMPOS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gera o texto para a IA sem campos vazios e com o PAR-Q resumido", () => {
    const texto = anamneseParaTexto(respostasValidas);
    expect(texto).toContain("Idade: 34 anos");
    expect(texto).toContain("Peso: 62.5 kg");
    expect(texto).toContain('PAR-Q: todas as respostas "não".');
    expect(texto).toContain("Quantos dias por semana você consegue treinar: 3 a 4");
    expect(texto).not.toContain("cirurgia");
    expect(texto).not.toContain(CONSENTIMENTO_ID);
  });

  it("detalha os 'sim' do PAR-Q", () => {
    const texto = anamneseParaTexto({ ...respostasValidas, parq5: "sim", parq6: "sim" });
    expect(texto).toContain('respondeu "sim" em 2 de 7');
    expect(texto).toContain("anti-hipertensivo");
  });

  it("perguntas do formulário não disparam skills sozinhas; as respostas disparam", async () => {
    const skills = await carregarSkills();
    const neutro = selecionarSkills(skills, [{ tipo: "texto", conteudo: anamneseParaTexto(respostasValidas) }]);
    expect(neutro).toHaveLength(0);

    const comCondicao = anamneseParaTexto({ ...respostasValidas, parq6: "sim", dores: "Dor lombar ao acordar" });
    const nomes = selecionarSkills(skills, [{ tipo: "texto", conteudo: comCondicao }]).map((s) => s.nome);
    expect(nomes.length).toBe(2);
  });

  it("lê o corpo do POST", () => {
    const corpo = new URLSearchParams({ idade: "40", sexo: "Masculino", [CONSENTIMENTO_ID]: "sim", intruso: "x" });
    expect(respostasDoFormulario(corpo)).toEqual({ idade: "40", sexo: "Masculino", [CONSENTIMENTO_ID]: "sim" });
  });
});
