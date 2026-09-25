import type { Alerta, Bloco, BlocoCardio, BlocoCombinado, BlocoSimples, Ficha, Plano } from "../dominio/plano.js";
import type { Problema } from "../validacao/regras.js";

const LIMITE_TELEGRAM = 4000;

const ICONE_ALERTA: Record<Alerta["tipo"], string> = {
  atencao: "🚨",
  restricao: "⚠️",
  informacao_faltando: "❓",
};

const NIVEL: Record<Plano["nivel"], string> = {
  iniciante: "Iniciante",
  iniciante_intermediario: "Iniciante/Intermediário",
  intermediario: "Intermediário",
  intermediario_avancado: "Intermediário/Avançado",
  avancado: "Avançado",
};

export function formatarDescanso(segundos: number): string {
  if (segundos === 0) return "sem descanso";
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return seg === 0 ? `${min}min` : `${min}min${seg}s`;
}

export function formatarFrequencia(f: Plano["frequencia"]): string {
  return f.minima === f.maxima ? `${f.maxima}x/semana` : `${f.minima} a ${f.maxima}x/semana`;
}

function comObservacao(linha: string, observacao?: string, recuo = "   "): string {
  return observacao ? `${linha}\n${recuo}↳ ${observacao}` : linha;
}

function formatarSimples(b: BlocoSimples, n: number): string {
  const partes = [`${b.series}x${b.repeticoes}`, formatarDescanso(b.descansoSegundos)];
  if (b.carga) partes.push(b.carga);
  let linha = `${n}. ${b.exercicio}: ${partes.join(" · ")}`;
  if (b.aquecimento) {
    const aq = `${b.aquecimento.series}x${b.aquecimento.repeticoes}`;
    linha += `\n   aquecimento: ${aq}${b.aquecimento.observacao ? ` (${b.aquecimento.observacao})` : ""}`;
  }
  return comObservacao(linha, b.observacao);
}

function formatarCombinado(b: BlocoCombinado, n: number): string {
  const descanso =
    b.descansoEntreItensSegundos === 0
      ? `sem descanso entre os exercícios, ${formatarDescanso(b.descansoAoFimDaVoltaSegundos)} ao fim da volta`
      : `${formatarDescanso(b.descansoEntreItensSegundos)} entre os exercícios, ${formatarDescanso(b.descansoAoFimDaVoltaSegundos)} ao fim da volta`;
  const titulo = `${n}. 🔁 ${b.nome ?? "Combinado"} · ${b.voltas} voltas · ${descanso}`;
  const itens = b.itens.map((item, i) => {
    const letra = String.fromCharCode(97 + i);
    const partes = [item.repeticoes, item.carga].filter(Boolean).join(" · ");
    return comObservacao(`   ${letra}) ${item.exercicio}: ${partes}`, item.observacao, "      ");
  });
  return comObservacao([titulo, ...itens].join("\n"), b.observacao);
}

export function formatarProtocoloCardio(b: BlocoCardio): string {
  if (b.protocolo === "intervalado" && b.tiros && b.trabalhoSegundos !== undefined) {
    return `${b.tiros}x ${b.trabalhoSegundos}" / ${b.pausaSegundos ?? 0}" de pausa`;
  }
  return b.duracao ?? "contínuo";
}

function formatarCardio(b: BlocoCardio, n: number): string {
  return comObservacao(`${n}. 🚴 ${b.exercicio}: ${formatarProtocoloCardio(b)} · ${b.intensidade}`, b.observacao);
}

export function formatarBloco(bloco: Bloco, n: number): string {
  switch (bloco.tipo) {
    case "simples":
      return formatarSimples(bloco, n);
    case "combinado":
      return formatarCombinado(bloco, n);
    case "cardio":
      return formatarCardio(bloco, n);
  }
}

export function formatarFicha(ficha: Ficha): string {
  const linhas = ficha.blocos.map((b, i) => formatarBloco(b, i + 1));
  return `Treino ${ficha.letra}: ${ficha.nome}\n${linhas.join("\n")}`;
}

/** Resumo para o personal: cabeçalho, alertas e justificativa. As fichas vão em mensagens separadas. */
export function formatarCabecalho(plano: Plano, aluno: string): string {
  const linhas = [
    `📋 ${aluno}: ${plano.titulo}`,
    `${plano.objetivo} · ${NIVEL[plano.nivel]} · ${formatarFrequencia(plano.frequencia)} · ${plano.duracaoSemanas} semanas`,
  ];
  if (plano.alertas.length > 0) {
    linhas.push("", "Confira antes de aprovar:");
    for (const alerta of ordenarAlertas(plano.alertas)) {
      linhas.push(`${ICONE_ALERTA[alerta.tipo]} ${alerta.mensagem}`);
    }
  }
  linhas.push("", `Por que assim: ${plano.justificativa}`);
  return linhas.join("\n");
}

export function formatarMudancas(mudancas: string[]): string {
  return ["Vou alterar:", ...mudancas.map((m) => `• ${m}`), "", "Confirma?"].join("\n");
}

/** Versão final, sem alertas nem justificativa, para o personal encaminhar ao aluno. */
export function formatarParaAluno(plano: Plano): string {
  const blocos = [
    `🏋️ ${plano.titulo}`,
    `${formatarFrequencia(plano.frequencia)} · ${plano.duracaoSemanas} semanas`,
    ...plano.fichas.map(formatarFicha),
  ];
  if (plano.orientacoesAluno.length > 0) {
    blocos.push(["Orientações:", ...plano.orientacoesAluno.map((o) => `• ${o}`)].join("\n"));
  }
  return blocos.join("\n\n");
}

export function ordenarAlertas(alertas: Alerta[]): Alerta[] {
  const peso: Record<Alerta["tipo"], number> = { atencao: 0, restricao: 1, informacao_faltando: 2 };
  return [...alertas].sort((a, b) => peso[a.tipo] - peso[b.tipo]);
}

/** Quebra um texto longo em partes que cabem numa mensagem do Telegram, sem cortar linhas. */
export function dividirMensagem(texto: string, limite = LIMITE_TELEGRAM): string[] {
  if (texto.length <= limite) return [texto];
  const partes: string[] = [];
  let atual = "";
  for (const linha of texto.split("\n")) {
    const candidato = atual ? `${atual}\n${linha}` : linha;
    if (candidato.length > limite && atual) {
      partes.push(atual);
      atual = linha;
    } else {
      atual = candidato;
    }
  }
  if (atual) partes.push(atual);
  return partes;
}

/**
 * Resumo da revisão automática para o personal. Pendentes vêm primeiro:
 * são problemas conhecidos que a nova tentativa não resolveu.
 */
export function formatarRevisaoAutomatica(r: {
  corrigidos: Problema[];
  pendentes: Problema[];
  sugestoes: Problema[];
  mantevePrimeira?: boolean;
  skills?: { nome: string; validada: boolean }[];
}): string | undefined {
  const blocos: string[] = [];
  if (r.skills && r.skills.length > 0) {
    const nomes = r.skills.map((s) => s.nome).join(", ");
    const pendentes = r.skills.some((s) => !s.validada);
    blocos.push(
      `📚 Usei a base de conhecimento sobre: ${nomes}.` +
        (pendentes ? " Atenção: esse conteúdo ainda não foi validado por um profissional." : ""),
    );
  }
  if (r.mantevePrimeira) {
    blocos.push("🔎 Tentei corrigir, mas a nova versão ficou pior. Mantive a primeira.");
  }
  if (r.pendentes.length > 0) {
    blocos.push(["🔎 Revisei e ainda não consegui resolver:", ...r.pendentes.map((p) => `• ${p.descricao}`)].join("\n"));
  }
  if (r.corrigidos.length > 0) {
    blocos.push(`🔎 Revisão automática: corrigi ${r.corrigidos.length} ponto(s) antes de te mostrar.`);
  }
  if (r.sugestoes.length > 0) {
    blocos.push(["💡 Sugestões para você avaliar:", ...r.sugestoes.map((p) => `• ${p.descricao}`)].join("\n"));
  }
  return blocos.length > 0 ? blocos.join("\n\n") : undefined;
}
