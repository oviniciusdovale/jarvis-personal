import { verificarRegras } from "../src/validacao/regras.js";
import type { Plano } from "../src/dominio/plano.js";

/** Checklist do caso Aluna J. Usado por consistencia (gera e confere) e por checar (só confere, sem custo). */
const textoAlertas = (p: Plano) => p.alertas.map((a) => a.mensagem).join("\n");
const textoAluno = (p: Plano) =>
  [
    ...p.orientacoesAluno,
    ...p.fichas.flatMap((f) =>
      f.blocos.flatMap((b) => (b.tipo === "combinado" ? [b.observacao, ...b.itens.map((i) => i.observacao)] : [b.observacao])),
    ),
  ]
    .filter(Boolean)
    .join("\n");

export const checklist: Array<[string, (p: Plano) => boolean]> = [
  ["alerta de expectativa ligado ao lipedema", (p) => /lipedema/i.test(textoAlertas(p)) && /expectativ/i.test(textoAlertas(p))],
  ["alerta de fisioterapia pélvica (diástase)", (p) => /fisioterap/i.test(textoAlertas(p))],
  ["frequência 2 a 3", (p) => p.frequencia.minima === 2 && p.frequencia.maxima === 3],
  ["nível iniciante/intermediário", (p) => p.nivel === "iniciante_intermediario"],
  ["orienta semanas de 2 treinos", (p) => /2 (vezes|treinos)|duas vezes|só 2|apenas 2/i.test(p.orientacoesAluno.join("\n"))],
  ["sem erros das regras de código", (p) => verificarRegras(p).length === 0],
  ["sem jargão do personal sem explicação para o aluno", (p) => !/PAUSANDO 10"(?!\s*(=|:|\())/.test(textoAluno(p))],
  [
    "sem raciocínio clínico na versão do aluno",
    (p) => !/relatad|hist[óo]rico de|anamnese|personal:|converse com a aluna/i.test(textoAluno(p)),
  ],
];

