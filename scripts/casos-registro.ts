import type { Plano } from "../src/dominio/plano.js";
import { exerciciosDeForca } from "../src/dominio/plano.js";
import type { ResultadoGeracao } from "../src/ia/gerador.js";
import { verificarRegras } from "../src/validacao/regras.js";
import { checklist as checklistAlunaJ } from "./checklist-aluna-j.js";

/**
 * Casos de teste: anamneses fictícias com perfis diferentes, cada uma com o que o rascunho
 * precisa cumprir. Servem para garantir que o gerador não foi ajustado só para um aluno.
 */

export type Item = [nome: string, teste: (p: Plano, r: ResultadoGeracao) => boolean];
export type Caso = { id: string; descricao: string; anamnese: string; checklist: Item[] };

const alertas = (p: Plano) => p.alertas.map((a) => a.mensagem).join("\n");
const paraAluno = (p: Plano) =>
  [
    ...p.orientacoesAluno,
    ...p.fichas.flatMap((f) =>
      f.blocos.flatMap((b) => (b.tipo === "combinado" ? [b.observacao, ...b.itens.map((i) => i.observacao)] : [b.observacao])),
    ),
  ]
    .filter(Boolean)
    .join("\n");
const todosExercicios = (p: Plano) =>
  p.fichas.flatMap((f) => [...exerciciosDeForca(f), ...f.blocos.filter((b) => b.tipo === "cardio").map((b) => b.exercicio)]);

const comuns: Item[] = [
  ["sem erros das regras de código", (p) => verificarRegras(p).length === 0],
  ["sem pendências da revisão", (_p, r) => r.pendentes.length === 0],
  [
    "sem raciocínio clínico na versão do aluno",
    (p) => !/relatad|hist[óo]rico de|anamnese|personal:|converse com (o|a) alun/i.test(paraAluno(p)),
  ],
];

const usouSkill = (nome: string): Item => [`usou a skill ${nome}`, (_p, r) => r.skills.some((s) => s.nome === nome)];
const frequencia = (min: number, max = min): Item => [
  `frequência ${min === max ? min : `${min} a ${max}`}x`,
  (p) => p.frequencia.minima === min && p.frequencia.maxima === max,
];

export const casos: Caso[] = [
  {
    id: "idoso-hipertensao",
    descricao: "Homem, 65 anos, hipertensão controlada, sedentário",
    anamnese: "tests/casos/idoso-hipertensao.md",
    checklist: [
      ...comuns,
      usouSkill("Hipertensão arterial"),
      frequencia(3),
      ["nível iniciante", (p) => p.nivel === "iniciante"],
      ["alerta sobre pressão/liberação", (p) => /press[ãa]o|hipertens/i.test(alertas(p)) && /libera/i.test(alertas(p))],
      ["sem intervalado de alta intensidade", (p) => !p.fichas.some((f) => f.blocos.some((b) => b.tipo === "cardio" && b.protocolo === "intervalado"))],
      ["orienta respiração (não prender o ar)", (p) => /respira|prender o ar|solte o ar|expir/i.test(paraAluno(p))],
      ["orienta parar diante de sintomas", (p) => /tontura|dor no peito|falta de ar/i.test(paraAluno(p))],
    ],
  },
  {
    id: "lombalgia",
    descricao: "Mulher, 40 anos, dor lombar crônica",
    anamnese: "tests/casos/lombalgia.md",
    checklist: [
      ...comuns,
      usouSkill("Dor lombar"),
      frequencia(3),
      ["alerta sobre a coluna com sinais de alerta", (p) => /lombar|coluna/i.test(alertas(p)) && /irradia|formig/i.test(alertas(p))],
      ["sem terra / bom-dia", (p) => !todosExercicios(p).some((e) => /terra|bom[- ]dia|good ?morning/i.test(e))],
      ["tem estabilização de tronco", (p) => todosExercicios(p).some((e) => /prancha|ponte|perdigueiro|bird|dead ?bug|pallof/i.test(e))],
    ],
  },
  {
    id: "treino-em-casa",
    descricao: "Homem, 28 anos, treina em casa com halteres e elásticos",
    anamnese: "tests/casos/treino-em-casa.md",
    checklist: [
      ...comuns,
      frequencia(4),
      [
        "só equipamento que ele tem (sem máquinas, banco, barra ou bike)",
        (p) =>
          !todosExercicios(p).some((e) =>
            /m[áa]quina|smith|polia|leg ?press|cadeira (extensora|flexora|abdutora|adutora)|pulley|cross ?over|graviton|bike|esteira|banco|barra fixa|supino (reto|inclinado) com barra|puxada (frente|alta)/i.test(e),
          ),
      ],
      [
        "pausa de 10s segue o vocabulário do personal (não vira isometria nem opcional)",
        (p) => !/segurando a contra[çc][ãa]o|isometri|se sentir necessidade/i.test(paraAluno(p)),
      ],
      ["cabe em 40 minutos (até 6 blocos por ficha)", (p) => p.fichas.every((f) => f.blocos.length <= 6)],
    ],
  },
  {
    id: "avancado",
    descricao: "Homem, 25 anos, avançado, 5x por semana",
    anamnese: "tests/casos/avancado.md",
    checklist: [
      ...comuns,
      frequencia(5),
      ["nível avançado", (p) => p.nivel === "avancado" || p.nivel === "intermediario_avancado"],
      ["pelo menos 4 fichas", (p) => p.fichas.length >= 4],
      ["volume de avançado (6+ blocos por ficha, em média)", (p) => p.fichas.reduce((t, f) => t + f.blocos.length, 0) / p.fichas.length >= 6],
    ],
  },
  {
    id: "aluna-j",
    descricao: "Mulher, 30 anos, lipedema e diástase (caso original)",
    anamnese: "tests/casos/aluna-j-anamnese.md",
    checklist: [...comuns, ...checklistAlunaJ.map(([nome, t]): Item => [nome, (p) => t(p)])],
  },
];
