import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Repositorio, type Convite } from "../src/armazenamento/repositorio.js";
import { criarServidor } from "../src/web/servidor.js";
import { respostasValidas } from "./fixtures.js";

let dir: string;
let repo: Repositorio;
let servidor: Server;
let base: string;
let avisados: Convite[];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "jarvis-web-"));
  repo = new Repositorio(dir);
  avisados = [];
  servidor = criarServidor({ repo, aoResponder: async (c) => void avisados.push(c) });
  await new Promise<void>((ok) => servidor.listen(0, ok));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise((ok) => servidor.close(ok));
  await rm(dir, { recursive: true, force: true });
});

const enviar = (url: string, dados: Record<string, string | string[]>) => {
  const corpo = new URLSearchParams();
  for (const [k, v] of Object.entries(dados)) for (const x of [v].flat()) corpo.append(k, x);
  return fetch(url, { method: "POST", body: corpo });
};

describe("servidor do formulário", () => {
  it("mostra o formulário com o nome escapado", async () => {
    const c = await repo.criarConvite({ personalId: "p1", chatId: 1, aluno: "<b>Ana</b>" });
    const res = await fetch(`${base}/a/${c.token}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Oi, &lt;b&gt;Ana&lt;/b&gt;!");
    expect(html).not.toContain("<b>Ana</b>");
  });

  it("recusa token inexistente ou fora do formato", async () => {
    expect((await fetch(`${base}/a/AAAAAAAAAAAAAAAAAAAAAA`)).status).toBe(404);
    expect((await fetch(`${base}/a/..%2F..%2Fetc`)).status).toBe(404);
  });

  it("devolve o formulário com erros e mantém o que foi preenchido", async () => {
    const c = await repo.criarConvite({ personalId: "p1", chatId: 1, aluno: "Ana" });
    const res = await enviar(`${base}/a/${c.token}`, { idade: "34", gosta: "Remada" });
    expect(res.status).toBe(422);
    const html = await res.text();
    expect(html).toContain("Responda esta pergunta.");
    expect(html).toContain('value="34"');
    expect(html).toContain(">Remada</textarea>");
    expect(avisados).toHaveLength(0);
  });

  it("salva, avisa o personal e não aceita segundo envio", async () => {
    const c = await repo.criarConvite({ personalId: "p1", chatId: 1, aluno: "Ana" });
    const res = await enviar(`${base}/a/${c.token}`, respostasValidas as Record<string, string>);
    expect(res.status).toBe(200);
    await new Promise((ok) => setTimeout(ok, 10));
    expect(avisados).toHaveLength(1);
    expect(avisados[0]!.respostas?.idade).toBe("34");

    expect((await fetch(`${base}/a/${c.token}`)).status).toBe(409);
    expect((await enviar(`${base}/a/${c.token}`, respostasValidas as Record<string, string>)).status).toBe(409);
  });
});

describe("convites no repositório", () => {
  it("apaga as respostas ao encerrar", async () => {
    const c = await repo.criarConvite({ personalId: "p1", chatId: 1, aluno: "Ana" });
    await repo.registrarRespostas(c.token, respostasValidas);
    const usado = await repo.encerrarConvite(c.token, "usado");
    expect(usado.respostas).toBeUndefined();
    expect((await repo.obterConvite(c.token))?.respostas).toBeUndefined();
  });

  it("link vencido não aceita resposta", async () => {
    const c = await repo.criarConvite({ personalId: "p1", chatId: 1, aluno: "Ana", validadeDias: -1 });
    expect((await repo.obterConvite(c.token))?.status).toBe("expirado");
    await expect(repo.registrarRespostas(c.token, respostasValidas)).rejects.toThrow();
  });

  it("limpa respostas paradas além do prazo", async () => {
    const c = await repo.criarConvite({ personalId: "p1", chatId: 1, aluno: "Ana" });
    await repo.registrarRespostas(c.token, respostasValidas);
    expect(await repo.limparConvitesVencidos(7)).toBe(0);
    expect(await repo.limparConvitesVencidos(-1)).toBe(1);
    const depois = await repo.obterConvite(c.token);
    expect(depois?.status).toBe("expirado");
    expect(depois?.respostas).toBeUndefined();
  });
});
