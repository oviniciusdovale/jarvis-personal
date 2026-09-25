import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config } from "../config.js";

let cliente: Anthropic | undefined;
function obterCliente(): Anthropic {
  cliente ??= new Anthropic({ apiKey: config.anthropicApiKey });
  return cliente;
}

export type Uso = { entrada: number; saida: number };

/** Converte um schema Zod no formato de input_schema de ferramenta. */
export function schemaDaFerramenta(schema: z.ZodType): Anthropic.Tool.InputSchema {
  const { $schema: _ignorado, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
  return json as Anthropic.Tool.InputSchema;
}

/**
 * Chama o modelo forçando uma ferramenta, e valida a saída com Zod.
 * É assim que garantimos plano estruturado em vez de texto livre.
 * Se a saída vier fora do formato, devolve o erro ao modelo e tenta mais uma vez.
 */
export async function chamarComFerramenta<T>(opcoes: {
  sistema: string;
  conteudo: Anthropic.ContentBlockParam[];
  ferramenta: { nome: string; descricao: string; schema: z.ZodType<T> };
  maxTokens?: number;
  tentativas?: number;
}): Promise<{ resultado: T; uso: Uso }> {
  const mensagens: Anthropic.MessageParam[] = [{ role: "user", content: opcoes.conteudo }];
  const uso: Uso = { entrada: 0, saida: 0 };
  const maxTentativas = opcoes.tentativas ?? 2;
  let ultimoErro = "";

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const resposta = await obterCliente().messages.create({
      model: config.modelo,
      max_tokens: opcoes.maxTokens ?? 8000,
      system: opcoes.sistema,
      messages: mensagens,
      tools: [
        {
          name: opcoes.ferramenta.nome,
          description: opcoes.ferramenta.descricao,
          input_schema: schemaDaFerramenta(opcoes.ferramenta.schema),
        },
      ],
      tool_choice: { type: "tool", name: opcoes.ferramenta.nome },
    });
    uso.entrada += resposta.usage.input_tokens;
    uso.saida += resposta.usage.output_tokens;

    const bloco = resposta.content.find((b) => b.type === "tool_use");
    if (!bloco || bloco.type !== "tool_use") {
      throw new Error("O modelo não devolveu a ferramenta esperada.");
    }

    const validado = opcoes.ferramenta.schema.safeParse(bloco.input);
    if (validado.success) return { resultado: validado.data, uso };

    ultimoErro = validado.error.message;
    mensagens.push(
      { role: "assistant", content: resposta.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: bloco.id,
            is_error: true,
            content: `A saída não passou na validação. Corrija só estes pontos e chame a ferramenta de novo:\n${ultimoErro}`,
          },
        ],
      },
    );
  }

  throw new Error(`Saída do modelo fora do formato: ${ultimoErro}`);
}
