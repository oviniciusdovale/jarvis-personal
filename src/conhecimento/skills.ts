import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Anexo } from "../ia/entrada.js";

/**
 * Skills: conhecimento específico (condições de saúde, métodos) que só entra no prompt
 * quando a anamnese menciona um dos gatilhos. Os arquivos ficam em /conhecimento.
 */

export type Skill = {
  arquivo: string;
  nome: string;
  gatilhos: string[];
  validada: boolean;
  validadoPor?: string;
  considerar: string;
  alertasObrigatorios: string[];
  evitar: string;
  perguntar: string[];
};

const PASTA_PADRAO = fileURLToPath(new URL("../../conhecimento", import.meta.url));

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function secao(corpo: string, titulo: string): string {
  const partes = corpo.split(/^## /m);
  const alvo = partes.find((p) => normalizar(p).startsWith(normalizar(titulo)));
  return alvo ? alvo.slice(alvo.indexOf("\n") + 1).trim() : "";
}

function itens(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

export function interpretarSkill(arquivo: string, conteudo: string): Skill {
  const match = conteudo.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Skill ${arquivo} sem cabeçalho (---).`);
  const [, cabecalho, corpo] = match as unknown as [string, string, string];
  const campos = Object.fromEntries(
    cabecalho.split("\n").map((linha) => {
      const i = linha.indexOf(":");
      return [linha.slice(0, i).trim(), linha.slice(i + 1).trim()];
    }),
  );
  if (!campos.nome || !campos.gatilhos) throw new Error(`Skill ${arquivo} sem nome ou gatilhos.`);
  return {
    arquivo,
    nome: campos.nome,
    gatilhos: campos.gatilhos.split(",").map((g: string) => normalizar(g.trim())).filter(Boolean),
    validada: campos.status === "validado",
    validadoPor: campos.validado_por || undefined,
    considerar: secao(corpo, "Considerar"),
    alertasObrigatorios: itens(secao(corpo, "Alertas obrigatórios")),
    evitar: secao(corpo, "Evitar ou ajustar"),
    perguntar: itens(secao(corpo, "Perguntar ao aluno")),
  };
}

export async function carregarSkills(pasta = PASTA_PADRAO): Promise<Skill[]> {
  const skills: Skill[] = [];
  for (const sub of ["condicoes", "metodos"]) {
    let arquivos: string[] = [];
    try {
      arquivos = (await readdir(join(pasta, sub))).filter((a) => a.endsWith(".md"));
    } catch {
      continue;
    }
    for (const arquivo of arquivos) {
      skills.push(interpretarSkill(`${sub}/${arquivo}`, await readFile(join(pasta, sub, arquivo), "utf8")));
    }
  }
  return skills;
}

/**
 * Escolhe as skills cujos gatilhos aparecem no texto da anamnese.
 * Limitação: anamnese em foto ou PDF não tem texto aqui; nesse caso nada é selecionado
 * (próximo passo: uma chamada barata de classificação para esses casos).
 */
export function selecionarSkills(skills: Skill[], anamnese: Anexo[], extra?: string): Skill[] {
  const texto = normalizar(
    [...anamnese.filter((a) => a.tipo === "texto").map((a) => a.conteudo), extra ?? ""].join("\n"),
  );
  return skills.filter((s) => s.gatilhos.some((g) => texto.includes(g)));
}

/** Bloco para o prompt do gerador. */
export function skillsParaGerador(skills: Skill[]): string {
  if (skills.length === 0) return "";
  const blocos = skills.map((s) =>
    [
      `### ${s.nome}`,
      s.considerar && `Considerar:\n${s.considerar}`,
      s.alertasObrigatorios.length > 0 &&
        `Alertas OBRIGATÓRIOS (registre cada um em "alertas"):\n${s.alertasObrigatorios.map((a) => `- ${a}`).join("\n")}`,
      s.evitar && `Evitar ou ajustar:\n${s.evitar}`,
      s.perguntar.length > 0 &&
        `Se a anamnese não responder, registre como informação faltando:\n${s.perguntar.map((p) => `- ${p}`).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return `Conhecimento específico para as condições deste aluno:\n\n${blocos.join("\n\n")}`;
}

/** Checklist para o revisor: cada alerta obrigatório precisa estar no plano. */
export function skillsParaRevisor(skills: Skill[]): string {
  const itensChecklist = skills.flatMap((s) => s.alertasObrigatorios.map((a) => `- [${s.nome}] ${a}`));
  if (itensChecklist.length === 0) return "";
  return `Alertas obrigatórios para as condições deste aluno. Confira um a um se existe alerta equivalente no plano; se faltar algum, é problema a corrigir:\n${itensChecklist.join("\n")}`;
}
