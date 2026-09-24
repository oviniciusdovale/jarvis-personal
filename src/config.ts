import "dotenv/config";

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
  idsAutorizados: new Set(
    (process.env.ALLOWED_TELEGRAM_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  ),
};
