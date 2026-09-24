import type Anthropic from "@anthropic-ai/sdk";

/**
 * Material que o personal manda pelo chat: texto, foto ou PDF.
 * Tudo vira bloco de conteúdo para o modelo ler.
 */
export type Anexo =
  | { tipo: "texto"; conteudo: string }
  | { tipo: "imagem"; mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string }
  | { tipo: "pdf"; base64: string };

export function paraBlocos(anexos: Anexo[]): Anthropic.ContentBlockParam[] {
  return anexos.map((anexo): Anthropic.ContentBlockParam => {
    switch (anexo.tipo) {
      case "texto":
        return { type: "text", text: anexo.conteudo };
      case "imagem":
        return {
          type: "image",
          source: { type: "base64", media_type: anexo.mediaType, data: anexo.base64 },
        };
      case "pdf":
        return {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: anexo.base64 },
        };
    }
  });
}
