import { limitarDuvidas, MetodologiaSchema, type Metodologia, type RespostaEntrevista } from "../dominio/metodologia.js";
import { chamarComFerramenta, type Uso } from "./cliente.js";
import { paraBlocos, type Anexo } from "./entrada.js";
import { SISTEMA_METODOLOGIA, SISTEMA_REFINAR_METODOLOGIA } from "./prompts.js";

/**
 * Lê planos antigos do personal (texto, fotos, PDFs), extrai o estilo dele
 * e lista o que ficou ambíguo, para perguntar em vez de chutar.
 */
export async function extrairMetodologia(planosExemplo: Anexo[]): Promise<{ metodologia: Metodologia; uso: Uso }> {
  const { resultado, uso } = await chamarComFerramenta({
    sistema: SISTEMA_METODOLOGIA,
    conteudo: [{ type: "text", text: "Planos de exemplo do personal:" }, ...paraBlocos(planosExemplo)],
    ferramenta: {
      nome: "salvar_metodologia",
      descricao: "Salva a metodologia extraída dos planos do personal, com as dúvidas a perguntar.",
      schema: MetodologiaSchema,
    },
    maxTokens: 4000,
  });
  return { metodologia: limitarDuvidas(resultado), uso };
}

/** Incorpora as respostas do personal: dúvidas viram glossário e regras confirmadas. */
export async function refinarMetodologia(
  metodologia: Metodologia,
  respostas: RespostaEntrevista[],
): Promise<{ metodologia: Metodologia; uso: Uso }> {
  const texto = respostas
    .map((r, i) => `${i + 1}. Pergunta: ${r.duvida.pergunta}\n   Trecho: ${r.duvida.trecho}\n   Resposta do personal: ${r.resposta}`)
    .join("\n");

  const { resultado, uso } = await chamarComFerramenta({
    sistema: SISTEMA_REFINAR_METODOLOGIA,
    conteudo: [
      { type: "text", text: `Metodologia atual:\n${JSON.stringify(metodologia, null, 2)}` },
      { type: "text", text: `Respostas do personal:\n${texto}` },
    ],
    ferramenta: {
      nome: "salvar_metodologia",
      descricao: "Salva a metodologia atualizada com as respostas do personal.",
      schema: MetodologiaSchema,
    },
    maxTokens: 4000,
  });
  return { metodologia: limitarDuvidas(resultado), uso };
}
