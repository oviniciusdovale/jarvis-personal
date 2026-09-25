import type { Bloco, Plano } from "../../src/dominio/plano.js";

/**
 * Primeiro rascunho real gerado para a Aluna J, reescrito no formato v2 (sem nome).
 * Problemas conhecidos que a revisão precisa apontar:
 * - aquecimento escrito como bloco separado (Leg Press 45 aparece duas vezes no Treino A);
 * - alerta diz "priorizei ativação de core leve", mas não há exercício de core;
 * - frequência fixa em 3 sem orientação para semanas de 2 treinos;
 * - nível "iniciante" quando a anamnese diz entre iniciante e intermediária, com 2 anos de treino;
 * - cargas "0kg";
 * - sem alerta de expectativa (lipedema + IMC ~20 com objetivo de reduzir gordura);
 * - recado para o personal dentro das orientações do aluno.
 */
const s = (exercicio: string, series: number, repeticoes: string, descansoSegundos: number, carga?: string): Bloco => ({
  tipo: "simples",
  exercicio,
  series,
  repeticoes,
  descansoSegundos,
  ...(carga ? { carga } : {}),
});

const bike: Bloco = {
  tipo: "cardio",
  exercicio: "Bike Spinning Sentado",
  protocolo: "continuo",
  duracao: "5 min",
  intensidade: "leve a moderada",
  observacao: "Substitui o TABATA",
};

export const rascunhoAlunaJ: Plano = {
  titulo: "Plano de Treino",
  objetivo: "Redução de gordura corporal com ganho de massa muscular",
  nivel: "iniciante",
  frequencia: { minima: 3, maxima: 3 },
  duracaoSemanas: 6,
  fichas: [
    {
      letra: "A",
      nome: "Inferiores",
      blocos: [
        s("Leg Press 45", 1, "20", 60, "0kg - leve (ativação)"),
        s("Leg Press 45", 3, "10", 60, "0kg - a definir"),
        s("Cadeira Extensora", 3, "10", 60, "0kg - a definir"),
        s("Cadeira Flexora", 3, "10", 60, "0kg - a definir"),
        s("Adução de Quadril Máquina", 3, "10", 10, "0kg - a definir"),
        s("Abdução de Quadril Máquina", 3, "10", 10, "0kg - a definir"),
        s("Panturrilha no Step", 3, "10", 60, "0kg - a definir"),
        bike,
      ],
    },
    {
      letra: "B",
      nome: "Superiores",
      blocos: [
        {
          tipo: "combinado",
          voltas: 3,
          descansoEntreItensSegundos: 0,
          descansoAoFimDaVoltaSegundos: 60,
          itens: [
            { exercicio: "Puxada Neutra triangulo", repeticoes: "10", carga: "0kg - a definir" },
            { exercicio: "Remada Baixa Triangulo", repeticoes: "10", carga: "0kg - a definir" },
          ],
        },
        s("Desenvolvimento com Halteres (Pegada Neutra)", 3, "10", 60, "0kg - a definir"),
        s("Elevação Lateral com Halteres", 3, "10", 60, "0kg - a definir"),
        {
          tipo: "combinado",
          voltas: 3,
          descansoEntreItensSegundos: 0,
          descansoAoFimDaVoltaSegundos: 60,
          itens: [
            { exercicio: "Tríceps Barra Encostado na Polia", repeticoes: "10", carga: "0kg - a definir" },
            { exercicio: "Rosca Direta na Polia (Barra Reta)", repeticoes: "10", carga: "0kg - a definir" },
          ],
        },
        bike,
      ],
    },
    {
      letra: "C",
      nome: "Superiores/Inferiores combinado",
      blocos: [
        { ...s("Agachamento Smith", 3, "10", 60, "0kg - a definir"), aquecimento: { series: 1, repeticoes: "20", observacao: "leve" } } as Bloco,
        s("Afundo no Smith", 3, "10", 60, "0kg - a definir"),
        s("Puxada Fechada barra reta", 3, "10", 60, "0kg - a definir"),
        s("Remada Baixa Supinada", 3, "10", 60, "0kg - a definir"),
        s("Rosca Martelo com Halteres", 3, "10", 60, "0kg - a definir"),
        s("Panturrilha no Step", 3, "10", 60, "0kg - a definir"),
        bike,
      ],
    },
  ],
  orientacoesAluno: [
    "Aqueça 5 minutos antes de começar.",
    "Personal: confirmar as cargas presencialmente com a aluna antes de liberar o plano.",
  ],
  alertas: [
    { tipo: "restricao", mensagem: "Por conta do lipedema sem detalhamento, evitei alto impacto e substituí o TABATA por bike contínua leve." },
    { tipo: "informacao_faltando", mensagem: "Lipedema: faltam grau, membros afetados, dor/hematomas e uso de compressão." },
    {
      tipo: "informacao_faltando",
      mensagem:
        "Diástase abdominal pós-cesárea: evitar flexão de tronco intensa até avaliação. Priorizei ativação de core leve e estabilização, sem sobrecarga direta em reto abdominal.",
    },
    { tipo: "informacao_faltando", mensagem: "PAR-Q não respondido; confirmar liberação médica." },
  ],
  justificativa:
    "3 fichas seguindo o padrão de ativação 1x20 + 3x10, respeitando os 50 minutos. Evitei trabalho direto de core pela diástase. Cargas mantidas em 0kg para ajuste presencial, como de costume.",
};
