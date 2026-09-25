import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Metodologia } from "../dominio/metodologia.js";
import type { Plano } from "../dominio/plano.js";

/**
 * Armazenamento do piloto em arquivos JSON.
 * A interface é a mesma que o Postgres vai implementar depois; só esta classe muda.
 *
 * A anamnese NÃO é guardada: é dado de saúde e só é usada para gerar o rascunho.
 */

export type Versao = {
  numero: number;
  plano: Plano;
  origem: "ia" | "revisao";
  mudancas?: string[];
  criadaEm: string;
};

export type RegistroPlano = {
  id: string;
  personalId: string;
  aluno: string;
  status: "rascunho" | "aprovado" | "descartado";
  versoes: Versao[];
  criadoEm: string;
  aprovadoEm?: string;
};

export type Evento = {
  tipo:
    | "metodologia_extraida"
    | "metodologia_refinada"
    | "rascunho_gerado"
    | "revisao_pedida"
    | "revisao_aplicada"
    | "revisao_recusada"
    | "desfeito"
    | "aprovado"
    | "descartado";
  personalId: string;
  planoId?: string;
  tokensEntrada?: number;
  tokensSaida?: number;
  detalhe?: string;
};

export function versaoAtual(registro: RegistroPlano): Versao {
  const versao = registro.versoes.at(-1);
  if (!versao) throw new Error(`Plano ${registro.id} sem versões.`);
  return versao;
}

export class Repositorio {
  constructor(private readonly dir: string) {}

  private caminho(...partes: string[]) {
    return join(this.dir, ...partes);
  }

  private async lerJson<T>(caminho: string): Promise<T | undefined> {
    try {
      return JSON.parse(await readFile(caminho, "utf8")) as T;
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw erro;
    }
  }

  /** Escreve em arquivo temporário e renomeia, para não corromper o JSON se o processo cair no meio. */
  private async escreverJson(caminho: string, dados: unknown) {
    await mkdir(dirname(caminho), { recursive: true });
    const temporario = `${caminho}.tmp`;
    await writeFile(temporario, JSON.stringify(dados, null, 2));
    await rename(temporario, caminho);
  }

  async salvarMetodologia(personalId: string, metodologia: Metodologia) {
    await this.escreverJson(this.caminho("personais", personalId, "metodologia.json"), metodologia);
  }

  obterMetodologia(personalId: string) {
    return this.lerJson<Metodologia>(this.caminho("personais", personalId, "metodologia.json"));
  }

  async criarPlano(personalId: string, aluno: string, plano: Plano): Promise<RegistroPlano> {
    const agora = new Date().toISOString();
    const registro: RegistroPlano = {
      id: randomUUID(),
      personalId,
      aluno,
      status: "rascunho",
      versoes: [{ numero: 1, plano, origem: "ia", criadaEm: agora }],
      criadoEm: agora,
    };
    await this.salvarPlano(registro);
    return registro;
  }

  obterPlano(id: string) {
    return this.lerJson<RegistroPlano>(this.caminho("planos", `${id}.json`));
  }

  private salvarPlano(registro: RegistroPlano) {
    return this.escreverJson(this.caminho("planos", `${registro.id}.json`), registro);
  }

  private async exigirRascunho(id: string): Promise<RegistroPlano> {
    const registro = await this.obterPlano(id);
    if (!registro) throw new Error(`Plano ${id} não encontrado.`);
    if (registro.status !== "rascunho") throw new Error("Esse plano já foi aprovado ou descartado.");
    return registro;
  }

  async adicionarVersao(id: string, plano: Plano, mudancas: string[]): Promise<RegistroPlano> {
    const registro = await this.exigirRascunho(id);
    registro.versoes.push({
      numero: versaoAtual(registro).numero + 1,
      plano,
      origem: "revisao",
      mudancas,
      criadaEm: new Date().toISOString(),
    });
    await this.salvarPlano(registro);
    return registro;
  }

  /** Volta para a versão anterior. A primeira versão (a da IA) nunca é removida. */
  async desfazer(id: string): Promise<RegistroPlano | undefined> {
    const registro = await this.exigirRascunho(id);
    if (registro.versoes.length <= 1) return undefined;
    registro.versoes.pop();
    await this.salvarPlano(registro);
    return registro;
  }

  async mudarStatus(id: string, status: "aprovado" | "descartado"): Promise<RegistroPlano> {
    const registro = await this.exigirRascunho(id);
    registro.status = status;
    if (status === "aprovado") registro.aprovadoEm = new Date().toISOString();
    await this.salvarPlano(registro);
    return registro;
  }

  /** Métricas do piloto: uma linha JSON por evento. */
  async registrarEvento(evento: Evento) {
    const caminho = this.caminho("eventos.jsonl");
    await mkdir(dirname(caminho), { recursive: true });
    await appendFile(caminho, `${JSON.stringify({ ...evento, em: new Date().toISOString() })}\n`);
  }
}
