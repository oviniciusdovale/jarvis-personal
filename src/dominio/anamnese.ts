/**
 * Formulário de anamnese que o aluno preenche pelo link.
 * A definição é dado: a página, a validação e o texto enviado à IA saem daqui.
 * O nome do aluno NÃO é perguntado: o personal já sabe quem é, e a IA não precisa saber.
 */

type Base = { id: string; rotulo: string; ajuda?: string; obrigatorio?: boolean };

export type Campo =
  | (Base & { tipo: "texto" | "textarea"; placeholder?: string })
  | (Base & { tipo: "numero"; min: number; max: number; unidade?: string; decimal?: boolean })
  | (Base & { tipo: "opcoes"; opcoes: string[]; multipla?: boolean })
  | (Base & { tipo: "simnao"; resumo: string });

export type Secao = { titulo: string; descricao?: string; campos: Campo[] };

export type Respostas = Record<string, string | string[]>;

export const LIMITE_TEXTO = 1000;

export const FORMULARIO: Secao[] = [
  {
    titulo: "Sobre você",
    campos: [
      { id: "idade", tipo: "numero", rotulo: "Idade", min: 12, max: 100, unidade: "anos", obrigatorio: true },
      { id: "sexo", tipo: "opcoes", rotulo: "Sexo", opcoes: ["Feminino", "Masculino", "Prefiro não informar"], obrigatorio: true },
      { id: "peso", tipo: "numero", rotulo: "Peso", min: 25, max: 300, unidade: "kg", decimal: true },
      { id: "altura", tipo: "numero", rotulo: "Altura", min: 100, max: 230, unidade: "cm" },
    ],
  },
  {
    titulo: "Objetivo",
    campos: [
      {
        id: "objetivo",
        tipo: "opcoes",
        rotulo: "Qual o seu objetivo principal?",
        opcoes: ["Emagrecimento", "Ganho de massa muscular", "Condicionamento físico", "Força", "Saúde e qualidade de vida", "Outro"],
        obrigatorio: true,
      },
      {
        id: "objetivo_detalhe",
        tipo: "textarea",
        rotulo: "Conte mais sobre o que você quer alcançar",
        placeholder: "Ex.: fortalecer as pernas, melhorar a postura, voltar a correr...",
      },
    ],
  },
  {
    titulo: "Experiência",
    campos: [
      {
        id: "experiencia",
        tipo: "opcoes",
        rotulo: "Há quanto tempo você treina musculação?",
        opcoes: ["Nunca treinei", "Menos de 6 meses", "De 6 meses a 1 ano", "De 1 a 3 anos", "Mais de 3 anos"],
        obrigatorio: true,
      },
      {
        id: "experiencia_detalhe",
        tipo: "textarea",
        rotulo: "Está treinando agora? Se parou, há quanto tempo?",
        placeholder: "Ex.: treinei 2 anos, parei há 4 meses",
      },
    ],
  },
  {
    titulo: "Sua rotina de treino",
    campos: [
      {
        id: "frequencia",
        tipo: "opcoes",
        rotulo: "Quantos dias por semana você consegue treinar?",
        opcoes: ["2", "2 a 3", "3", "3 a 4", "4", "5", "6"],
        obrigatorio: true,
      },
      {
        id: "tempo",
        tipo: "opcoes",
        rotulo: "Quanto tempo você tem por treino?",
        opcoes: ["30 min", "40 min", "50 min", "1 hora", "1h15", "1h30 ou mais"],
        obrigatorio: true,
      },
      {
        id: "local",
        tipo: "opcoes",
        rotulo: "Onde você vai treinar?",
        opcoes: ["Academia completa", "Academia pequena ou de condomínio", "Em casa", "Ao ar livre"],
        obrigatorio: true,
      },
      {
        id: "equipamentos",
        tipo: "textarea",
        rotulo: "Se não for academia completa: que equipamentos você tem?",
        placeholder: "Ex.: um par de halteres de 5 kg, faixa elástica, colchonete",
      },
    ],
  },
  {
    titulo: "Saúde",
    descricao:
      "Estas perguntas são o questionário PAR-Q, usado para saber se é seguro começar a treinar. Responda com calma.",
    campos: [
      {
        id: "parq1",
        tipo: "simnao",
        rotulo: "Algum médico já disse que você tem problema de coração e só deveria fazer atividade física com supervisão?",
        resumo: "tem problema de coração e recomendação médica de atividade supervisionada",
        obrigatorio: true,
      },
      { id: "parq2", tipo: "simnao", rotulo: "Você sente dor no peito quando faz atividade física?", resumo: "sente dor no peito na atividade física", obrigatorio: true },
      {
        id: "parq3",
        tipo: "simnao",
        rotulo: "No último mês, você teve dor no peito sem estar fazendo atividade física?",
        resumo: "teve dor no peito em repouso no último mês",
        obrigatorio: true,
      },
      {
        id: "parq4",
        tipo: "simnao",
        rotulo: "Você perde o equilíbrio por tontura ou já desmaiou?",
        resumo: "tem tontura com perda de equilíbrio ou desmaio",
        obrigatorio: true,
      },
      {
        id: "parq5",
        tipo: "simnao",
        rotulo: "Você tem algum problema nos ossos ou articulações que pode piorar com atividade física?",
        resumo: "tem problema ósseo ou articular que pode piorar com atividade física",
        obrigatorio: true,
      },
      {
        id: "parq6",
        tipo: "simnao",
        rotulo: "Você toma remédio para pressão ou para o coração?",
        resumo: "toma medicamento para pressão arterial (anti-hipertensivo) ou para o coração",
        obrigatorio: true,
      },
      {
        id: "parq7",
        tipo: "simnao",
        rotulo: "Existe algum outro motivo para você não fazer atividade física?",
        resumo: "relata outro motivo para não fazer atividade física",
        obrigatorio: true,
      },
      {
        id: "dores",
        tipo: "textarea",
        rotulo: "Você sente alguma dor ou tem alguma lesão?",
        ajuda: "Diga onde, quando dói (ex.: ao agachar) e se já tem diagnóstico.",
        placeholder: "Ex.: dor no joelho direito quando agacho fundo, sem diagnóstico",
      },
      { id: "cirurgias", tipo: "textarea", rotulo: "Já fez alguma cirurgia? Qual e quando?" },
      {
        id: "condicoes",
        tipo: "textarea",
        rotulo: "Tem alguma condição de saúde diagnosticada?",
        placeholder: "Ex.: pressão alta, diabetes, hérnia de disco, lipedema",
      },
      { id: "medicamentos", tipo: "textarea", rotulo: "Toma algum medicamento de uso contínuo?" },
      {
        id: "gestacao",
        tipo: "textarea",
        rotulo: "Está grávida ou teve filho nos últimos 2 anos? Se sim, parto normal ou cesárea?",
        ajuda: "Deixe em branco se não se aplica.",
      },
    ],
  },
  {
    titulo: "Hábitos",
    campos: [
      { id: "sono", tipo: "numero", rotulo: "Quantas horas você dorme por noite, em média?", min: 2, max: 14, unidade: "horas", decimal: true },
      { id: "estresse", tipo: "opcoes", rotulo: "Como está seu nível de estresse?", opcoes: ["Baixo", "Moderado", "Alto"] },
      {
        id: "trabalho",
        tipo: "opcoes",
        rotulo: "No trabalho, você passa a maior parte do tempo...",
        opcoes: ["Sentado(a)", "Em pé", "Alternando", "Com esforço físico"],
      },
    ],
  },
  {
    titulo: "Preferências",
    campos: [
      { id: "gosta", tipo: "textarea", rotulo: "Exercícios que você gosta de fazer" },
      { id: "nao_gosta", tipo: "textarea", rotulo: "Exercícios que você não gosta ou não consegue fazer" },
      {
        id: "cardio",
        tipo: "opcoes",
        rotulo: "E o cardio?",
        opcoes: ["Gosto", "Faço se precisar", "Prefiro evitar"],
      },
      { id: "observacoes", tipo: "textarea", rotulo: "Quer contar mais alguma coisa ao seu personal?" },
    ],
  },
];

export const CAMPOS: Campo[] = FORMULARIO.flatMap((s) => s.campos);

/** Consentimento exigido pela LGPD para dado de saúde. Fica fora do texto que vai para a IA. */
export const CONSENTIMENTO_ID = "consentimento";
export const TEXTO_CONSENTIMENTO =
  "Autorizo meu personal a usar estas informações, inclusive as de saúde, para montar meu treino. Sei que um assistente de IA ajuda a preparar o rascunho e que as respostas são apagadas depois que o rascunho é gerado.";

function valorUnico(respostas: Respostas, id: string): string {
  const v = respostas[id];
  return (Array.isArray(v) ? v.join(", ") : (v ?? "")).trim();
}

/** Devolve os erros por campo (vazio se estiver tudo certo). */
export function validarRespostas(respostas: Respostas): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const campo of CAMPOS) {
    const bruto = respostas[campo.id];
    const valores = (Array.isArray(bruto) ? bruto : bruto === undefined ? [] : [bruto]).map((v) => v.trim()).filter(Boolean);
    if (valores.length === 0) {
      if (campo.obrigatorio) erros[campo.id] = "Responda esta pergunta.";
      continue;
    }
    switch (campo.tipo) {
      case "texto":
      case "textarea":
        if (valores[0]!.length > LIMITE_TEXTO) erros[campo.id] = `Use no máximo ${LIMITE_TEXTO} caracteres.`;
        break;
      case "numero": {
        const n = Number(valores[0]!.replace(",", "."));
        if (!Number.isFinite(n) || n < campo.min || n > campo.max) erros[campo.id] = `Informe um número entre ${campo.min} e ${campo.max}.`;
        else if (!campo.decimal && !Number.isInteger(n)) erros[campo.id] = "Use um número inteiro.";
        break;
      }
      case "opcoes":
        if (valores.some((v) => !campo.opcoes.includes(v))) erros[campo.id] = "Escolha uma das opções.";
        if (!campo.multipla && valores.length > 1) erros[campo.id] = "Escolha só uma opção.";
        break;
      case "simnao":
        if (valores.length > 1 || !["sim", "nao"].includes(valores[0]!)) erros[campo.id] = "Responda sim ou não.";
        break;
    }
  }
  if (valorUnico(respostas, CONSENTIMENTO_ID) !== "sim") erros[CONSENTIMENTO_ID] = "Sem essa autorização o personal não pode usar suas respostas.";
  return erros;
}

/**
 * Converte as respostas no texto que a IA lê (e o personal confere no Telegram).
 * Sem nome do aluno. Perguntas em branco ficam de fora.
 */
export function anamneseParaTexto(respostas: Respostas): string {
  const linhas: string[] = ["Anamnese preenchida pelo aluno no formulário."];
  for (const secao of FORMULARIO) {
    const doBloco: string[] = [];
    const parq = secao.campos.filter((c): c is Extract<Campo, { tipo: "simnao" }> => c.tipo === "simnao");
    if (parq.length > 0) {
      const sim = parq.filter((c) => valorUnico(respostas, c.id) === "sim");
      doBloco.push(
        sim.length === 0
          ? 'PAR-Q: todas as respostas "não".'
          : `PAR-Q: respondeu "sim" em ${sim.length} de ${parq.length}: ${sim.map((c) => c.resumo).join("; ")}.`,
      );
    }
    for (const campo of secao.campos) {
      if (campo.tipo === "simnao") continue;
      const valor = valorUnico(respostas, campo.id);
      if (!valor) continue;
      const texto = campo.tipo === "numero" && campo.unidade ? `${valor.replace(",", ".")} ${campo.unidade}` : valor;
      doBloco.push(`${campo.rotulo.replace(/[?:]$/, "")}: ${texto}`);
    }
    if (doBloco.length > 0) linhas.push("", `## ${secao.titulo}`, ...doBloco);
  }
  return linhas.join("\n");
}

/** Converte o corpo do POST (application/x-www-form-urlencoded) em respostas. */
export function respostasDoFormulario(corpo: URLSearchParams): Respostas {
  const respostas: Respostas = {};
  for (const campo of CAMPOS) {
    const valores = corpo.getAll(campo.id);
    if (valores.length === 0) continue;
    respostas[campo.id] = campo.tipo === "opcoes" && campo.multipla ? valores : valores[0]!;
  }
  const consentimento = corpo.get(CONSENTIMENTO_ID);
  if (consentimento) respostas[CONSENTIMENTO_ID] = consentimento;
  return respostas;
}
