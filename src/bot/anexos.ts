import type { Api, Context } from "grammy";
import type { Anexo } from "../ia/entrada.js";

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"] as const;
type TipoImagem = (typeof TIPOS_IMAGEM)[number];

async function baixarBase64(api: Api, token: string, fileId: string): Promise<string> {
  const arquivo = await api.getFile(fileId);
  if (!arquivo.file_path) throw new Error("O Telegram não devolveu o caminho do arquivo.");
  const resposta = await fetch(`https://api.telegram.org/file/bot${token}/${arquivo.file_path}`);
  if (!resposta.ok) throw new Error(`Falha ao baixar arquivo do Telegram (${resposta.status}).`);
  return Buffer.from(await resposta.arrayBuffer()).toString("base64");
}

/**
 * Converte a mensagem do personal (texto, foto, PDF ou imagem enviada como arquivo) em anexo.
 * Retorna undefined para tipos que ainda não tratamos (áudio, vídeo...).
 */
export async function extrairAnexo(ctx: Context, token: string): Promise<Anexo | undefined> {
  const mensagem = ctx.message;
  if (!mensagem) return undefined;

  if (mensagem.text) return { tipo: "texto", conteudo: mensagem.text };

  if (mensagem.photo?.length) {
    const maior = mensagem.photo.at(-1)!;
    return { tipo: "imagem", mediaType: "image/jpeg", base64: await baixarBase64(ctx.api, token, maior.file_id) };
  }

  const documento = mensagem.document;
  if (documento?.mime_type === "application/pdf") {
    return { tipo: "pdf", base64: await baixarBase64(ctx.api, token, documento.file_id) };
  }
  if (documento?.mime_type && (TIPOS_IMAGEM as readonly string[]).includes(documento.mime_type)) {
    return {
      tipo: "imagem",
      mediaType: documento.mime_type as TipoImagem,
      base64: await baixarBase64(ctx.api, token, documento.file_id),
    };
  }

  return undefined;
}
