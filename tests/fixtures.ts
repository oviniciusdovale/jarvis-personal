import { CONSENTIMENTO_ID, type Respostas } from "../src/dominio/anamnese.js";
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

/** Formulário de anamnese preenchido, sem nenhuma condição de saúde. */
export const respostasValidas: Respostas = {
  idade: "34",
  sexo: "Feminino",
  peso: "62,5",
  altura: "165",
  objetivo: "Ganho de massa muscular",
  objetivo_detalhe: "Fortalecer glúteos e posterior",
  experiencia: "De 1 a 3 anos",
  frequencia: "3 a 4",
  tempo: "1 hora",
  local: "Academia completa",
  parq1: "nao",
  parq2: "nao",
  parq3: "nao",
  parq4: "nao",
  parq5: "nao",
  parq6: "nao",
  parq7: "nao",
  sono: "7",
  estresse: "Moderado",
  trabalho: "Sentado(a)",
  gosta: "Agachamento e remada",
  nao_gosta: "Corrida",
  cardio: "Faço se precisar",
  [CONSENTIMENTO_ID]: "sim",
};
