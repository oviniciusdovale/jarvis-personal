import type { Metodologia } from "../dominio/metodologia.js";
import { PlanoSchema, RevisaoSchema, type Plano, type Revisao } from "../dominio/plano.js";
import { chamarComFerramenta, type Uso } from "./cliente.js";
import { paraBlocos, type Anexo } from "./entrada.js";
import { planoComoTexto, sistemaGerador, sistemaRevisao } from "./prompts.js";

/** Gera o rascunho do plano a partir da anamnese (texto, fotos ou PDF). */
export async function gerarRascunho(entrada: {
  anamnese: Anexo[];
  metodologia?: Metodologia;
  instrucoesExtras?: string;
}): Promise<{ plano: Plano; uso: Uso }> {
  const conteudo = [
    { type: "text" as const, text: "Anamnese do aluno:" },
    ...paraBlocos(entrada.anamnese),
  ];
  if (entrada.instrucoesExtras) {
    conteudo.push({ type: "text", text: `Pedido do personal: ${entrada.instrucoesExtras}` });
  }

  const { resultado, uso } = await chamarComFerramenta({
    sistema: sistemaGerador(entrada.metodologia),
    conteudo,
    ferramenta: {
      nome: "salvar_rascunho",
      descricao: "Salva o rascunho do plano de treino para revisão do personal.",
      schema: PlanoSchema,
    },
  });
  return { plano: resultado, uso };
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
