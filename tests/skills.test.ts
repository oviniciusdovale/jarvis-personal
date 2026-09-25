import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  carregarSkills,
  interpretarSkill,
  selecionarSkills,
  skillsParaGerador,
  skillsParaRevisor,
} from "../src/conhecimento/skills.js";

describe("skills", () => {
  it("carrega as skills da pasta conhecimento", async () => {
    const skills = await carregarSkills();
    const nomes = skills.map((s) => s.nome);
    expect(nomes).toContain("Lipedema");
    expect(nomes).toContain("Diástase abdominal");
    for (const s of skills) {
      expect(s.gatilhos.length).toBeGreaterThan(0);
      expect(s.alertasObrigatorios.length).toBeGreaterThan(0);
    }
  });

  it("seleciona pelas palavras da anamnese, ignorando acentos e maiúsculas", async () => {
    const skills = await carregarSkills();
    const anamnese = await readFile("tests/casos/aluna-j-anamnese.md", "utf8");
    const escolhidas = selecionarSkills(skills, [{ tipo: "texto", conteudo: anamnese }]).map((s) => s.nome);
    expect(escolhidas).toEqual(expect.arrayContaining(["Lipedema", "Diástase abdominal"]));

    const semCondicao = selecionarSkills(skills, [{ tipo: "texto", conteudo: "Homem, 40 anos, sem dores." }]);
    expect(semCondicao).toHaveLength(0);

    const semAcento = selecionarSkills(skills, [{ tipo: "texto", conteudo: "tem DIASTASE" }]);
    expect(semAcento.map((s) => s.nome)).toEqual(["Diástase abdominal"]);
  });

  it("interpreta cabeçalho, status e seções", () => {
    const skill = interpretarSkill(
      "condicoes/teste.md",
      `---
nome: Teste
gatilhos: foo, Bar
status: validado
validado_por: Fulano CREF 123
---

## Considerar
Algo.

## Alertas obrigatórios
- Alerta um
- Alerta dois

## Perguntar ao aluno
- Pergunta
`,
    );
    expect(skill.gatilhos).toEqual(["foo", "bar"]);
    expect(skill.validada).toBe(true);
    expect(skill.validadoPor).toBe("Fulano CREF 123");
    expect(skill.alertasObrigatorios).toEqual(["Alerta um", "Alerta dois"]);
    expect(skill.perguntar).toEqual(["Pergunta"]);
  });

  it("gera blocos para gerador e revisor só quando há skills", async () => {
    expect(skillsParaGerador([])).toBe("");
    expect(skillsParaRevisor([])).toBe("");
    const skills = await carregarSkills();
    expect(skillsParaGerador(skills)).toContain("Alertas OBRIGATÓRIOS");
    expect(skillsParaRevisor(skills)).toContain("[Lipedema]");
  });
});
