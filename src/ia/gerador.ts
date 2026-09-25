import type { Metodologia } from "../dominio/metodologia.js";
import { PlanoSchema, RevisaoSchema, type Plano, type Revisao } from "../dominio/plano.js";
import { verificarRegras, type Problema } from "../validacao/regras.js";
import { chamarComFerramenta, type Uso } from "./cliente.js";
import { paraBlocos, type Anexo } from "./entrada.js";
import { planoComoTexto, sistemaGerador, sistemaRevisao } from "./prompts.js";
import { revisarCoerencia } from "./revisor.js";
import { carregarSkills, selecionarSkills, skillsParaGerador, type Skill } from "../conhecimento/skills.js";

type EntradaGeracao = {
  anamnese: Anexo[];
  metodologia?: Metodologia;
  instrucoesExtras?: string;
  /** Skills já selecionadas para este aluno (condições de saúde, métodos). */
  skills?: Skill[];
};

function somarUso(...usos: Uso[]): Uso {
  return usos.reduce((acc, u) => ({ entrada: acc.entrada + u.entrada, saida: acc.saida + u.saida }), {
    entrada: 0,
    saida: 0,
  });
}

/** Gera o rascunho do plano a partir da anamnese (texto, fotos ou PDF). */
export async function gerarRascunho(
  entrada: EntradaGeracao & { correcoes?: { plano: Plano; problemas: Problema[] } },
): Promise<{ plano: Plano; uso: Uso }> {
  const conteudo = [
    { type: "text" as const, text: "Anamnese do aluno:" },
    ...paraBlocos(entrada.anamnese),
  ];
  if (entrada.instrucoesExtras) {
    conteudo.push({ type: "text", text: `Pedido do personal: ${entrada.instrucoesExtras}` });
  }
  if (entrada.correcoes) {
    conteudo.push({
      type: "text",
      text: [
        "Uma versão anterior deste rascunho foi revisada e tem problemas. Gere o plano de novo corrigindo TODOS eles.",
        "Mantenha tudo o que não está na lista: não remova alertas, orientações ou blocos que estavam certos.",
        "Se mudar o plano, atualize a justificativa e os alertas para descreverem exatamente a nova versão.",
        "Problemas:",
        ...entrada.correcoes.problemas.map((p) => `- ${p.descricao}`),
        "",
        `Versão anterior:\n${planoComoTexto(entrada.correcoes.plano)}`,
      ].join("\n"),
    });
  }

  const { resultado, uso } = await chamarComFerramenta({
    sistema: [sistemaGerador(entrada.metodologia), skillsParaGerador(entrada.skills ?? [])].filter(Boolean).join("\n\n"),
    conteudo,
    ferramenta: {
      nome: "salvar_rascunho",
      descricao: "Salva o rascunho do plano de treino para revisão do personal.",
      schema: PlanoSchema,
    },
  });
  return { plano: resultado, uso };
}

/** Regras por código + revisor de IA. */
export async function conferirRascunho(entrada: EntradaGeracao & { plano: Plano }) {
  const regras = verificarRegras(entrada.plano);
  const { problemas: doRevisor, uso } = await revisarCoerencia(entrada);
  return { problemas: [...regras, ...doRevisor], uso };
}

export type ResultadoGeracao = {
  plano: Plano;
  /** Problemas da primeira versão que motivaram a nova tentativa (vazio se não houve). */
  corrigidos: Problema[];
  /** O que continua errado na versão escolhida. O personal precisa ver. */
  pendentes: Problema[];
  /** Sugestões opcionais do revisor. */
  sugestoes: Problema[];
  tentativas: number;
  /** true quando a nova tentativa ficou pior e mantivemos a primeira versão. */
  mantevePrimeira: boolean;
  /** Skills usadas neste aluno. */
  skills: Skill[];
  uso: Uso;
};

const aCorrigir = (problemas: Problema[]) => problemas.filter((p) => p.gravidade === "corrigir");
const sugestoesDe = (problemas: Problema[]) => problemas.filter((p) => p.gravidade === "sugestao");

/**
 * A nova tentativa às vezes corrige uns pontos e cria outros. Fica com a versão que tem menos
 * problemas a corrigir; os erros apontados pelas regras de código pesam mais, porque são certeiros.
 * Em caso de empate, fica com a segunda, que tratou os problemas conhecidos.
 */
export function escolherVersao(problemas1: Problema[], problemas2: Problema[]): 1 | 2 {
  const peso = (ps: Problema[]) => aCorrigir(ps).reduce((t, p) => t + (p.origem === "regra" ? 2 : 1), 0);
  return peso(problemas2) <= peso(problemas1) ? 2 : 1;
}

/**
 * Fluxo completo: gera, confere e, se houver problema a corrigir, gera de novo uma vez.
 * Mostra a melhor das duas versões. O que sobrar vai para o personal: nunca escondemos um problema conhecido.
 */
export async function gerarRascunhoRevisado(
  entrada: EntradaGeracao,
  aoProgredir?: (etapa: "revisando" | "corrigindo") => Promise<void>,
): Promise<ResultadoGeracao> {
  const skills = entrada.skills ?? selecionarSkills(await carregarSkills(), entrada.anamnese, entrada.instrucoesExtras);
  entrada = { ...entrada, skills };
  const primeira = await gerarRascunho(entrada);
  await aoProgredir?.("revisando");
  const conferencia1 = await conferirRascunho({ ...entrada, plano: primeira.plano });
  const aCorrigir1 = aCorrigir(conferencia1.problemas);

  if (aCorrigir1.length === 0) {
    return {
      plano: primeira.plano,
      corrigidos: [],
      pendentes: [],
      sugestoes: sugestoesDe(conferencia1.problemas),
      tentativas: 1,
      mantevePrimeira: false,
      skills,
      uso: somarUso(primeira.uso, conferencia1.uso),
    };
  }

  await aoProgredir?.("corrigindo");
  const segunda = await gerarRascunho({ ...entrada, correcoes: { plano: primeira.plano, problemas: aCorrigir1 } });
  const conferencia2 = await conferirRascunho({ ...entrada, plano: segunda.plano });
  const uso = somarUso(primeira.uso, conferencia1.uso, segunda.uso, conferencia2.uso);

  if (escolherVersao(conferencia1.problemas, conferencia2.problemas) === 1) {
    return {
      plano: primeira.plano,
      corrigidos: [],
      pendentes: aCorrigir1,
      sugestoes: sugestoesDe(conferencia1.problemas),
      tentativas: 2,
      mantevePrimeira: true,
      skills,
      uso,
    };
  }

  return {
    plano: segunda.plano,
    corrigidos: aCorrigir1,
    pendentes: aCorrigir(conferencia2.problemas),
    sugestoes: sugestoesDe(conferencia2.problemas),
    tentativas: 2,
    mantevePrimeira: false,
    skills,
    uso,
  };
}

/** Aplica ao plano uma alteração pedida em linguagem natural ("troca o stiff por mesa flexora"). */
export async function revisarRascunho(entrada: {
  plano: Plano;
  pedido: string;
  metodologia?: Metodologia;
}): Promise<{ revisao: Revisao; uso: Uso }> {
  const { resultado, uso } = await chamarComFerramenta({
    sistema: sistemaRevisao(entrada.metodologia),
    conteudo: [
      { type: "text", text: `Plano atual:\n${planoComoTexto(entrada.plano)}` },
      { type: "text", text: `Pedido do personal: ${entrada.pedido}` },
    ],
    ferramenta: {
      nome: "aplicar_alteracao",
      descricao: "Devolve o plano com a alteração aplicada e a lista de mudanças.",
      schema: RevisaoSchema,
    },
  });
  return { revisao: resultado, uso };
}
