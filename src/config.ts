import { config as carregarEnv } from "dotenv";

// Lê .env.local primeiro (seus segredos locais) e depois .env. O que vier antes tem prioridade.
carregarEnv({ path: [".env.local", ".env"], quiet: true });

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida. Veja o .env.example.`);
  return valor;
}

export const config = {
  get anthropicApiKey() {
    return obrigatoria("ANTHROPIC_API_KEY");
  },
  get telegramToken() {
    return obrigatoria("TELEGRAM_BOT_TOKEN");
  },
  modelo: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  dataDir: process.env.DATA_DIR ?? "./data",
  /** Porta do formulário de anamnese. */
  porta: Number(process.env.PORT ?? 3000),
  /** Endereço que o aluno abre. Local: http://localhost:3000. Na VPS: o domínio com https. */
  urlPublica: (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, ""),
  idsAutorizados: new Set(
    (process.env.ALLOWED_TELEGRAM_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  ),
};
