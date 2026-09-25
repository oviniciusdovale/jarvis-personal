import type { Plano } from "../src/dominio/plano.js";

export const planoBase: Plano = {
  titulo: "Hipertrofia 3x – adaptação",
  objetivo: "Hipertrofia",
  nivel: "iniciante_intermediario",
  frequencia: { minima: 2, maxima: 3 },
  duracaoSemanas: 6,
  fichas: [
    {
      letra: "A",
      nome: "Inferiores",
      blocos: [
        {
          tipo: "simples",
          exercicio: "Agachamento Smith",
          series: 3,
          repeticoes: "10",
          descansoSegundos: 60,
          carga: "moderada",
          aquecimento: { series: 1, repeticoes: "20", observacao: "leve" },
        },
        { tipo: "simples", exercicio: "Cadeira Flexora", series: 3, repeticoes: "12", descansoSegundos: 60, observacao: "Segurar 1s na contração" },
        { tipo: "cardio", exercicio: "Bike Spinning", protocolo: "intervalado", tiros: 8, trabalhoSegundos: 20, pausaSegundos: 10, intensidade: "forte" },
      ],
    },
    {
      letra: "B",
      nome: "Superiores",
      blocos: [
        {
          tipo: "combinado",
          nome: "Circuito com bike",
          voltas: 3,
          descansoEntreItensSegundos: 0,
          descansoAoFimDaVoltaSegundos: 60,
          itens: [
            { exercicio: "Desenvolvimento com Halteres Sentado", repeticoes: "10" },
            { exercicio: "Elevação Lateral", repeticoes: "10" },
            { exercicio: "Bike Spinning", repeticoes: "3 min", observacao: "ritmo moderado" },
          ],
        },
        { tipo: "cardio", exercicio: "Esteira", protocolo: "continuo", duracao: "10 min", intensidade: "leve" },
      ],
    },
  ],
  orientacoesAluno: ["Aqueça 5 minutos antes de começar."],
  alertas: [
    { tipo: "informacao_faltando", mensagem: "Confirmar equipamentos" },
    { tipo: "restricao", mensagem: "Joelho direito: amplitude limitada no agachamento" },
  ],
  justificativa: "Divisão inferiores/superiores com circuito metabólico.",
};
