import { MetodologiaSchema, type Metodologia } from "../dominio/metodologia.js";
import { chamarComFerramenta, type Uso } from "./cliente.js";
import { paraBlocos, type Anexo } from "./entrada.js";
import { SISTEMA_METODOLOGIA } from "./prompts.js";

/** Lê planos antigos do personal (texto, fotos, PDFs) e extrai o estilo dele. */
export async function extrairMetodologia(planosExemplo: Anexo[]): Promise<{ metodologia: Metodologia; uso: Uso }> {
  const { resultado, uso } = await chamarComFerramenta({
    sistema: SISTEMA_METODOLOGIA,
    conteudo: [{ type: "text", text: "Planos de exemplo do personal:" }, ...paraBlocos(planosExemplo)],
    ferramenta: {
      nome: "salvar_metodologia",
      descricao: "Salva a metodologia extraída dos planos do personal.",
      schema: MetodologiaSchema,
    },
    maxTokens: 3000,
  });
  return { metodologia: resultado, uso };
}
