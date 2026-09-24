import type { Alerta, Ficha, Plano, Prescricao } from "../dominio/plano.js";

const LIMITE_TELEGRAM = 4000;

const ICONE_ALERTA: Record<Alerta["tipo"], string> = {
  atencao: "🚨",
  restricao: "⚠️",
  informacao_faltando: "❓",
};

const NIVEL: Record<Plano["nivel"], string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export function formatarDescanso(segundos: number): string {
  if (segundos === 0) return "sem descanso";
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return seg === 0 ? `${min}min` : `${min}min${seg}s`;
}

export function formatarPrescricao(p: Prescricao, indice: number): string {
  const partes = [`${p.series}x${p.repeticoes}`, formatarDescanso(p.descansoSegundos)];
  if (p.carga) partes.push(p.carga);
  const linha = `${indice + 1}. ${p.exercicio}: ${partes.join(" · ")}`;
  return p.observacao ? `${linha}\n   ↳ ${p.observacao}` : linha;
}

export function formatarFicha(ficha: Ficha): string {
  const linhas = ficha.prescricoes.map(formatarPrescricao);
  return `Treino ${ficha.letra}: ${ficha.nome}\n${linhas.join("\n")}`;
}

/** Resumo para o personal: cabeçalho, alertas e justificativa. As fichas vão em mensagens separadas. */
export function formatarCabecalho(plano: Plano, aluno: string): string {
  const linhas = [
    `📋 ${aluno}: ${plano.titulo}`,
    `${plano.objetivo} · ${NIVEL[plano.nivel]} · ${plano.frequenciaSemanal}x/semana · ${plano.duracaoSemanas} semanas`,
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
    `${plano.frequenciaSemanal}x por semana · ${plano.duracaoSemanas} semanas`,
    ...plano.fichas.map(formatarFicha),
  ];
  if (plano.orientacoes.length > 0) {
    blocos.push(["Orientações:", ...plano.orientacoes.map((o) => `• ${o}`)].join("\n"));
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
