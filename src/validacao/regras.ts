import { exerciciosDeForca, type Plano } from "../dominio/plano.js";

/**
 * Verificações feitas por código, sem IA. São baratas, determinísticas e pegam
 * erros estruturais que o modelo comete com frequência.
 */

export type Problema = {
  origem: "regra" | "revisor";
  gravidade: "corrigir" | "sugestao";
  descricao: string;
};

export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O mesmo exercício duas vezes na ficha costuma ser o aquecimento escrito como bloco separado
 * (ex.: "Agachamento 1x20" e depois "Agachamento 3x10"). O formato tem campo próprio para isso.
 */
export function verificarRepetidosNaFicha(plano: Plano): Problema[] {
  const problemas: Problema[] = [];
  for (const ficha of plano.fichas) {
    const vistos = new Set<string>();
    for (const nome of exerciciosDeForca(ficha)) {
      const chave = normalizarNome(nome);
      if (vistos.has(chave)) {
        problemas.push({
          origem: "regra",
          gravidade: "corrigir",
          descricao: `Treino ${ficha.letra}: "${nome}" aparece duas vezes. Se uma delas é aquecimento, use o campo aquecimento do exercício.`,
        });
      }
      vistos.add(chave);
    }
  }
  return problemas;
}

/** Fichas que repetem quase todos os exercícios de outra não variam o estímulo. */
export function verificarVariedade(plano: Plano, limite = 0.6): Problema[] {
  const conjuntos = plano.fichas.map((f) => ({
    letra: f.letra,
    nomes: new Set(exerciciosDeForca(f).map(normalizarNome)),
  }));
  const problemas: Problema[] = [];
  for (let i = 0; i < conjuntos.length; i++) {
    for (let j = i + 1; j < conjuntos.length; j++) {
      const a = conjuntos[i]!;
      const b = conjuntos[j]!;
      const menor = Math.min(a.nomes.size, b.nomes.size);
      if (menor === 0) continue;
      const comuns = [...a.nomes].filter((n) => b.nomes.has(n)).length;
      if (comuns / menor > limite) {
        problemas.push({
          origem: "regra",
          gravidade: "corrigir",
          descricao: `Treinos ${a.letra} e ${b.letra} repetem ${comuns} de ${menor} exercícios. Varie o estímulo entre eles.`,
        });
      }
    }
  }
  return problemas;
}

/** Carga "0 kg" costuma vir do app de onde o plano foi exportado, não do estilo do personal. */
export function verificarCargaZero(plano: Plano): Problema[] {
  const cargas = plano.fichas.flatMap((f) =>
    f.blocos.flatMap((b) => {
      if (b.tipo === "simples") return [b.carga];
      if (b.tipo === "combinado") return b.itens.map((i) => i.carga);
      return [];
    }),
  );
  const temZero = cargas.some((c) => c && /\b0\s*kg\b/i.test(c));
  return temZero
    ? [
        {
          origem: "regra",
          gravidade: "corrigir",
          descricao: 'Há cargas escritas como "0 kg". Deixe a carga em branco ou use uma indicação útil (ex.: "leve", "RIR 2").',
        },
      ]
    : [];
}

/** Cardio intervalado precisa dizer tiros e tempo de trabalho; contínuo precisa de duração. */
export function verificarCardio(plano: Plano): Problema[] {
  const problemas: Problema[] = [];
  for (const ficha of plano.fichas) {
    for (const b of ficha.blocos) {
      if (b.tipo !== "cardio") continue;
      if (b.protocolo === "intervalado" && (!b.tiros || b.trabalhoSegundos === undefined)) {
        problemas.push({
          origem: "regra",
          gravidade: "corrigir",
          descricao: `Treino ${ficha.letra}: "${b.exercicio}" é intervalado, mas falta o número de tiros ou o tempo de trabalho.`,
        });
      }
      if (b.protocolo === "continuo" && !b.duracao) {
        problemas.push({
          origem: "regra",
          gravidade: "corrigir",
          descricao: `Treino ${ficha.letra}: "${b.exercicio}" é contínuo, mas falta a duração.`,
        });
      }
    }
  }
  return problemas;
}

/**
 * O campo de repetições deve ter só repetições ("10", "8-12", "12/10/8", "30s", "3 min").
 * Algo como "3x1x20 / 2x10" mistura séries e aquecimento no mesmo texto e fica ilegível para o aluno.
 */
const SERIES_DENTRO = /\d\s*[x×]\s*\d/i;

export function verificarRepeticoes(plano: Plano): Problema[] {
  const problemas: Problema[] = [];
  const acusar = (letra: string, exercicio: string, valor: string) =>
    problemas.push({
      origem: "regra",
      gravidade: "corrigir",
      descricao: `Treino ${letra}: em "${exercicio}", as repetições ("${valor}") trazem séries dentro do texto. Use só as repetições; séries e aquecimento têm campos próprios.`,
    });
  for (const ficha of plano.fichas) {
    for (const b of ficha.blocos) {
      if (b.tipo === "simples") {
        if (SERIES_DENTRO.test(b.repeticoes)) acusar(ficha.letra, b.exercicio, b.repeticoes);
        if (b.aquecimento && SERIES_DENTRO.test(b.aquecimento.repeticoes)) {
          acusar(ficha.letra, `${b.exercicio} (aquecimento)`, b.aquecimento.repeticoes);
        }
      }
      if (b.tipo === "combinado") {
        for (const item of b.itens) if (SERIES_DENTRO.test(item.repeticoes)) acusar(ficha.letra, item.exercicio, item.repeticoes);
      }
    }
  }
  return problemas;
}

export function verificarFrequencia(plano: Plano): Problema[] {
  const { minima, maxima } = plano.frequencia;
  return minima > maxima
    ? [{ origem: "regra", gravidade: "corrigir", descricao: `Frequência mínima (${minima}) maior que a máxima (${maxima}).` }]
    : [];
}

export function verificarRegras(plano: Plano): Problema[] {
  return [
    ...verificarRepetidosNaFicha(plano),
    ...verificarVariedade(plano),
    ...verificarCargaZero(plano),
    ...verificarCardio(plano),
    ...verificarRepeticoes(plano),
    ...verificarFrequencia(plano),
  ];
}
