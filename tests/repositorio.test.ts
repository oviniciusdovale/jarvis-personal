import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Repositorio, versaoAtual } from "../src/armazenamento/repositorio.js";
import type { Plano } from "../src/dominio/plano.js";

const plano: Plano = {
  titulo: "Teste",
  objetivo: "Hipertrofia",
  nivel: "iniciante",
  frequenciaSemanal: 3,
  duracaoSemanas: 4,
  fichas: [{ letra: "A", nome: "Corpo todo", prescricoes: [{ exercicio: "Leg press", series: 3, repeticoes: "12", descansoSegundos: 60 }] }],
  orientacoes: [],
  alertas: [],
  justificativa: "Teste.",
};

let dir: string;
let repo: Repositorio;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "jarvis-"));
  repo = new Repositorio(dir);
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe("repositório", () => {
  it("versiona, desfaz e nunca remove a versão original", async () => {
    const criado = await repo.criarPlano("p1", "Ana", plano);
    const revisado = { ...plano, titulo: "Revisado" };
    await repo.adicionarVersao(criado.id, revisado, ["título"]);

    expect(versaoAtual((await repo.obterPlano(criado.id))!).plano.titulo).toBe("Revisado");

    const desfeito = await repo.desfazer(criado.id);
    expect(versaoAtual(desfeito!).plano.titulo).toBe("Teste");
    expect(await repo.desfazer(criado.id)).toBeUndefined();
  });

  it("não permite editar plano aprovado", async () => {
    const criado = await repo.criarPlano("p1", "Ana", plano);
    await repo.mudarStatus(criado.id, "aprovado");
    await expect(repo.adicionarVersao(criado.id, plano, ["x"])).rejects.toThrow("aprovado ou descartado");
  });
});
