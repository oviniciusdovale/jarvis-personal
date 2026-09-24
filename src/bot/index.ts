import { Bot, InlineKeyboard, type Context } from "grammy";
import { config } from "../config.js";
import { Repositorio, versaoAtual, type RegistroPlano } from "../armazenamento/repositorio.js";
import { gerarRascunho, revisarRascunho } from "../ia/gerador.js";
import { extrairMetodologia } from "../ia/metodologia.js";
import {
  dividirMensagem,
  formatarCabecalho,
  formatarFicha,
  formatarMudancas,
  formatarParaAluno,
} from "../formatacao/texto.js";
import { extrairAnexo } from "./anexos.js";
import { definirSessao, obterSessao } from "./sessao.js";

const repo = new Repositorio(config.dataDir);
const bot = new Bot(config.telegramToken);

const AJUDA = `Oi! Eu monto o rascunho do treino no seu estilo e você ajusta conversando comigo.

1. /metodologia: me mande 2 ou 3 planos que você já usou (foto, PDF ou texto) e depois /pronto. Faço isso uma vez só.
2. /novo Nome do aluno: me mande a anamnese (texto, foto ou PDF) e depois /gerar.
3. Com o rascunho na tela, escreva o que quer mudar. Ex.: "troca o stiff por mesa flexora 4x12".
4. Quando estiver bom, toque em ✅ Aprovar e eu te devolvo o treino pronto para mandar ao aluno.

Dica: tire nome completo e contato do aluno da anamnese antes de me mandar.`;

// ---------- Acesso ----------

bot.use(async (ctx, next) => {
  const id = ctx.from?.id;
  if (id && config.idsAutorizados.has(String(id))) return next();
  await ctx.reply(`Este bot está em teste fechado. Seu ID do Telegram é ${id ?? "desconhecido"}; mande para o Vinicius liberar.`);
});

// ---------- Utilitários ----------

function chatId(ctx: Context): number {
  const id = ctx.chat?.id;
  if (id === undefined) throw new Error("Mensagem sem chat.");
  return id;
}

function personalId(ctx: Context): string {
  return String(ctx.from?.id);
}

/**
 * Chamadas à IA levam de 20 a 60 segundos. Rodamos fora do handler para não travar
 * as mensagens de outros personais, e avisamos se der erro.
 */
function emSegundoPlano(ctx: Context, tarefa: () => Promise<void>) {
  const id = chatId(ctx);
  const digitando = setInterval(() => void ctx.api.sendChatAction(id, "typing").catch(() => {}), 4500);
  void ctx.api.sendChatAction(id, "typing").catch(() => {});
  tarefa()
    .catch(async (erro: unknown) => {
      console.error(erro);
      await ctx.api.sendMessage(id, "Algo deu errado do meu lado. Tenta de novo em instantes; se repetir, avisa o Vinicius.");
    })
    .finally(() => clearInterval(digitando));
}

async function enviar(ctx: Context, texto: string, teclado?: InlineKeyboard) {
  const partes = dividirMensagem(texto);
  for (const [i, parte] of partes.entries()) {
    const ultima = i === partes.length - 1;
    await ctx.api.sendMessage(chatId(ctx), parte, ultima && teclado ? { reply_markup: teclado } : {});
  }
}

function tecladoRascunho(planoId: string) {
  return new InlineKeyboard()
    .text("✅ Aprovar", `aprovar:${planoId}`)
    .text("↩️ Desfazer", `desfazer:${planoId}`)
    .row()
    .text("🗑 Descartar", `descartar:${planoId}`);
}

async function mostrarRascunho(ctx: Context, registro: RegistroPlano) {
  const { plano } = versaoAtual(registro);
  await enviar(ctx, formatarCabecalho(plano, registro.aluno));
  for (const ficha of plano.fichas) await enviar(ctx, formatarFicha(ficha));
  await enviar(ctx, "Para ajustar, é só escrever o que mudar. Quando estiver bom, aprove.", tecladoRascunho(registro.id));
}

// ---------- Comandos ----------

bot.command(["start", "ajuda"], (ctx) => ctx.reply(AJUDA));

bot.command("metodologia", async (ctx) => {
  definirSessao(chatId(ctx), { modo: "metodologia", anexos: [] });
  await ctx.reply("Manda 2 ou 3 planos que você já usou com alunos (foto, PDF ou texto). Quando terminar, /pronto.");
});

bot.command("pronto", async (ctx) => {
  const sessao = obterSessao(chatId(ctx));
  if (sessao.modo !== "metodologia") return ctx.reply("Nada para processar agora. Use /metodologia para começar.");
  if (sessao.anexos.length === 0) return ctx.reply("Ainda não recebi nenhum plano. Manda pelo menos um.");

  await ctx.reply(`Lendo ${sessao.anexos.length} arquivo(s) para entender seu estilo...`);
  emSegundoPlano(ctx, async () => {
    const { metodologia, uso } = await extrairMetodologia(sessao.anexos);
    await repo.salvarMetodologia(personalId(ctx), metodologia);
    await repo.registrarEvento({
      tipo: "metodologia_extraida",
      personalId: personalId(ctx),
      tokensEntrada: uso.entrada,
      tokensSaida: uso.saida,
    });
    definirSessao(chatId(ctx), { modo: "livre" });
    await enviar(
      ctx,
      [
        "Entendi assim o seu jeito de montar treino:",
        "",
        metodologia.resumo,
        "",
        `Divisões: ${metodologia.divisoesPreferidas.join("; ")}`,
        `Padrões: ${metodologia.padroesPrescricao}`,
        "",
        "Se algo estiver errado, rode /metodologia de novo com outros planos. Agora já dá para usar /novo.",
      ].join("\n"),
    );
  });
});

bot.command("novo", async (ctx) => {
  const aluno = ctx.match.trim();
  if (!aluno) return ctx.reply('Diga um nome ou apelido para o aluno. Ex.: "/novo Ana"');
  definirSessao(chatId(ctx), { modo: "anamnese", aluno, anexos: [] });
  const temMetodologia = await repo.obterMetodologia(personalId(ctx));
  await ctx.reply(
    `Manda a anamnese de ${aluno} (texto, fotos ou PDF). Quando terminar, /gerar.` +
      (temMetodologia ? "" : "\n\nObs.: você ainda não mandou sua metodologia (/metodologia), então o rascunho vai sair num estilo genérico."),
  );
});

bot.command("gerar", async (ctx) => {
  const sessao = obterSessao(chatId(ctx));
  if (sessao.modo !== "anamnese") return ctx.reply("Comece com /novo Nome do aluno.");
  if (sessao.anexos.length === 0) return ctx.reply("Ainda não recebi a anamnese.");

  await ctx.reply(`Montando o rascunho de ${sessao.aluno}. Leva uns 30 segundos...`);
  emSegundoPlano(ctx, async () => {
    const metodologia = await repo.obterMetodologia(personalId(ctx));
    const { plano, uso } = await gerarRascunho({ anamnese: sessao.anexos, metodologia });
    const registro = await repo.criarPlano(personalId(ctx), sessao.aluno, plano);
    await repo.registrarEvento({
      tipo: "rascunho_gerado",
      personalId: personalId(ctx),
      planoId: registro.id,
      tokensEntrada: uso.entrada,
      tokensSaida: uso.saida,
    });
    // A anamnese sai da memória aqui: só o plano fica salvo.
    definirSessao(chatId(ctx), { modo: "revisando", planoId: registro.id });
    await mostrarRascunho(ctx, registro);
  });
});

bot.command("cancelar", async (ctx) => {
  definirSessao(chatId(ctx), { modo: "livre" });
  await ctx.reply("Ok, cancelei o que estava em andamento.");
});

// ---------- Botões ----------

bot.callbackQuery(/^(aprovar|desfazer|descartar|confirmar|recusar):(.+)$/, async (ctx) => {
  const [, acao, planoId] = ctx.match as RegExpMatchArray;
  await ctx.answerCallbackQuery();
  const id = chatId(ctx);
  const sessao = obterSessao(id);

  try {
    switch (acao) {
      case "aprovar": {
        const registro = await repo.mudarStatus(planoId!, "aprovado");
        await repo.registrarEvento({ tipo: "aprovado", personalId: personalId(ctx), planoId });
        definirSessao(id, { modo: "livre" });
        await ctx.editMessageReplyMarkup();
        await enviar(ctx, `✅ Aprovado. Aqui está o treino de ${registro.aluno} para você encaminhar:`);
        await enviar(ctx, formatarParaAluno(versaoAtual(registro).plano));
        break;
      }
      case "descartar": {
        await repo.mudarStatus(planoId!, "descartado");
        await repo.registrarEvento({ tipo: "descartado", personalId: personalId(ctx), planoId });
        definirSessao(id, { modo: "livre" });
        await ctx.editMessageReplyMarkup();
        await ctx.reply("Rascunho descartado. Se puder, me conta em uma frase o que estava ruim; isso ajuda muito no teste.");
        break;
      }
      case "desfazer": {
        const registro = await repo.desfazer(planoId!);
        if (!registro) {
          await ctx.reply("Esse já é o rascunho original, não há o que desfazer.");
          break;
        }
        await repo.registrarEvento({ tipo: "desfeito", personalId: personalId(ctx), planoId });
        definirSessao(id, { modo: "revisando", planoId: planoId! });
        await ctx.reply("Voltei para a versão anterior:");
        await mostrarRascunho(ctx, registro);
        break;
      }
      case "confirmar": {
        if (sessao.modo !== "revisando" || sessao.planoId !== planoId || !sessao.pendente) {
          await ctx.reply("Essa alteração expirou. Pode pedir de novo?");
          break;
        }
        const registro = await repo.adicionarVersao(planoId!, sessao.pendente.plano, sessao.pendente.mudancas);
        await repo.registrarEvento({ tipo: "revisao_aplicada", personalId: personalId(ctx), planoId });
        definirSessao(id, { modo: "revisando", planoId: planoId! });
        await ctx.editMessageReplyMarkup();
        await ctx.reply("Feito. Rascunho atualizado:");
        await mostrarRascunho(ctx, registro);
        break;
      }
      case "recusar": {
        await repo.registrarEvento({ tipo: "revisao_recusada", personalId: personalId(ctx), planoId });
        definirSessao(id, { modo: "revisando", planoId: planoId! });
        await ctx.editMessageReplyMarkup();
        await ctx.reply("Ok, não mudei nada. Pode pedir de outro jeito.");
        break;
      }
    }
  } catch (erro) {
    await ctx.reply((erro as Error).message);
  }
});

// ---------- Mensagens livres ----------

bot.on("message", async (ctx) => {
  const id = chatId(ctx);
  const sessao = obterSessao(id);

  if (ctx.message.voice || ctx.message.audio) {
    return ctx.reply("Áudio ainda não está ligado nesta versão de teste. Por enquanto, escreve para mim.");
  }

  // Coletando planos ou anamnese: acumula tudo até /pronto ou /gerar.
  if (sessao.modo === "metodologia" || sessao.modo === "anamnese") {
    const anexo = await extrairAnexo(ctx, config.telegramToken);
    if (!anexo) return ctx.reply("Esse tipo de arquivo eu ainda não leio. Manda como foto, PDF ou texto.");
    sessao.anexos.push(anexo);
    if (ctx.message.caption) sessao.anexos.push({ tipo: "texto", conteudo: ctx.message.caption });
    const fim = sessao.modo === "metodologia" ? "/pronto" : "/gerar";
    return ctx.reply(`Recebido (${sessao.anexos.length}). Manda mais ou use ${fim}.`);
  }

  // Revisando: o texto é um pedido de alteração.
  if (sessao.modo === "revisando" && ctx.message.text) {
    const pedido = ctx.message.text;
    const registro = await repo.obterPlano(sessao.planoId);
    if (!registro || registro.status !== "rascunho") {
      definirSessao(id, { modo: "livre" });
      return ctx.reply("Não há rascunho aberto. Use /novo para começar outro.");
    }
    await repo.registrarEvento({ tipo: "revisao_pedida", personalId: personalId(ctx), planoId: registro.id, detalhe: pedido });

    emSegundoPlano(ctx, async () => {
      const metodologia = await repo.obterMetodologia(personalId(ctx));
      const { revisao } = await revisarRascunho({ plano: versaoAtual(registro).plano, pedido, metodologia });
      if (revisao.entendimento === "ambiguo") {
        await ctx.api.sendMessage(id, revisao.pergunta ?? "Não entendi bem. Pode detalhar?");
        return;
      }
      definirSessao(id, { modo: "revisando", planoId: registro.id, pendente: { plano: revisao.plano, mudancas: revisao.mudancas } });
      await enviar(
        ctx,
        formatarMudancas(revisao.mudancas),
        new InlineKeyboard().text("✅ Sim", `confirmar:${registro.id}`).text("↩️ Não", `recusar:${registro.id}`),
      );
    });
    return;
  }

  return ctx.reply("Para começar um treino, use /novo Nome do aluno. Para ver os comandos, /ajuda.");
});

bot.catch((erro) => console.error("Erro no bot:", erro.error));

await bot.api.setMyCommands([
  { command: "novo", description: "Novo rascunho: /novo Nome do aluno" },
  { command: "gerar", description: "Gerar o rascunho com a anamnese enviada" },
  { command: "metodologia", description: "Ensinar seu estilo com planos antigos" },
  { command: "pronto", description: "Terminar o envio da metodologia" },
  { command: "cancelar", description: "Cancelar o que está em andamento" },
  { command: "ajuda", description: "Como usar" },
]);

console.log("Bot rodando. Ctrl+C para parar.");
await bot.start();
