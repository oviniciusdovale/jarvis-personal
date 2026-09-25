import { randomBytes, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Respostas } from "../dominio/anamnese.js";
import type { Metodologia } from "../dominio/metodologia.js";
import type { Plano } from "../dominio/plano.js";

/**
 * Armazenamento do piloto em arquivos JSON.
 * A interface é a mesma que o Postgres vai implementar depois; só esta classe muda.
 *
 * A anamnese só fica guardada enquanto espera o rascunho: a do formulário é apagada
 * assim que o rascunho é gerado, descartado ou o link vence. É dado de saúde.
 */

/**
 * Link de anamnese que o personal manda ao aluno.
 * - aguardando: o aluno ainda não respondeu
 * - respondido: respostas guardadas, esperando o personal gerar o rascunho
 * - usado / descartado / expirado: respostas já apagadas
 */
export type Convite = {
  token: string;
  personalId: string;
  chatId: number;
  aluno: string;
  status: "aguardando" | "respondido" | "usado" | "descartado" | "expirado";
  criadoEm: string;
  expiraEm: string;
  respondidoEm?: string;
  respostas?: Respostas;
};

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{22}$/;

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
    | "descartado"
    | "convite_criado"
    | "anamnese_recebida"
    | "anamnese_descartada";
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

  // ---------- Convites (anamnese por link) ----------

  private caminhoConvite(token: string) {
    return this.caminho("convites", `${token}.json`);
  }

  async criarConvite(dados: { personalId: string; chatId: number; aluno: string; validadeDias?: number }): Promise<Convite> {
    const agora = new Date();
    const convite: Convite = {
      token: randomBytes(16).toString("base64url"),
      personalId: dados.personalId,
      chatId: dados.chatId,
      aluno: dados.aluno,
      status: "aguardando",
      criadoEm: agora.toISOString(),
      expiraEm: new Date(agora.getTime() + (dados.validadeDias ?? 7) * 86_400_000).toISOString(),
    };
    await this.escreverJson(this.caminhoConvite(convite.token), convite);
    return convite;
  }

  /** Token fora do formato nunca vira caminho de arquivo. */
  async obterConvite(token: string): Promise<Convite | undefined> {
    if (!TOKEN_VALIDO.test(token)) return undefined;
    const convite = await this.lerJson<Convite>(this.caminhoConvite(token));
    if (convite && convite.status === "aguardando" && new Date(convite.expiraEm) < new Date()) {
      return this.encerrarConvite(token, "expirado");
    }
    return convite;
  }

  async registrarRespostas(token: string, respostas: Respostas): Promise<Convite> {
    const convite = await this.obterConvite(token);
    if (!convite) throw new Error("Link não encontrado.");
    if (convite.status !== "aguardando") throw new Error("Este link já foi usado ou venceu.");
    convite.status = "respondido";
    convite.respondidoEm = new Date().toISOString();
    convite.respostas = respostas;
    await this.escreverJson(this.caminhoConvite(token), convite);
    return convite;
  }

  /** Encerra o convite e apaga as respostas. Chamado depois de gerar o rascunho ou ao descartar. */
  async encerrarConvite(token: string, status: "usado" | "descartado" | "expirado"): Promise<Convite> {
    if (!TOKEN_VALIDO.test(token)) throw new Error("Link não encontrado.");
    const convite = await this.lerJson<Convite>(this.caminhoConvite(token));
    if (!convite) throw new Error("Link não encontrado.");
    const { respostas: _apagada, ...resto } = convite;
    const encerrado: Convite = { ...resto, status };
    await this.escreverJson(this.caminhoConvite(token), encerrado);
    return encerrado;
  }

  /**
   * Apaga respostas que ficaram paradas além do prazo (o personal nunca gerou o rascunho)
   * e encerra links que venceram sem resposta. Rodar na inicialização e uma vez por dia.
   */
  async limparConvitesVencidos(prazoRespondidoDias = 7): Promise<number> {
    let arquivos: string[];
    try {
      arquivos = await readdir(this.caminho("convites"));
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === "ENOENT") return 0;
      throw erro;
    }
    const agora = Date.now();
    let limpos = 0;
    for (const arquivo of arquivos.filter((a) => a.endsWith(".json"))) {
      const convite = await this.lerJson<Convite>(this.caminho("convites", arquivo));
      if (!convite) continue;
      const venceuSemResposta = convite.status === "aguardando" && new Date(convite.expiraEm).getTime() < agora;
      const respostaParada =
        convite.status === "respondido" &&
        new Date(convite.respondidoEm ?? convite.criadoEm).getTime() + prazoRespondidoDias * 86_400_000 < agora;
      if (venceuSemResposta || respostaParada) {
        await this.encerrarConvite(convite.token, "expirado");
        limpos++;
      }
    }
    return limpos;
  }

  /** Métricas do piloto: uma linha JSON por evento. */
  async registrarEvento(evento: Evento) {
    const caminho = this.caminho("eventos.jsonl");
    await mkdir(dirname(caminho), { recursive: true });
    await appendFile(caminho, `${JSON.stringify({ ...evento, em: new Date().toISOString() })}\n`);
  }
}
