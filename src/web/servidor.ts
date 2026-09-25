import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Convite, Repositorio } from "../armazenamento/repositorio.js";
import { respostasDoFormulario, validarRespostas } from "../dominio/anamnese.js";
import { paginaFormulario, paginaMensagem } from "./pagina.js";

/**
 * Servidor do formulário de anamnese.
 *   GET  /a/:token  mostra o formulário
 *   POST /a/:token  valida, guarda e avisa o personal
 * Sem framework: são duas rotas.
 */

const LIMITE_CORPO = 64 * 1024;
const ROTA = /^\/a\/([A-Za-z0-9_-]{22})$/;

function responder(res: ServerResponse, status: number, html: string) {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
  });
  res.end(html);
}

function lerCorpo(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes: Buffer[] = [];
    req.on("data", (parte: Buffer) => {
      tamanho += parte.length;
      if (tamanho > LIMITE_CORPO) {
        reject(new Error("corpo grande demais"));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on("end", () => resolve(Buffer.concat(partes).toString("utf8")));
    req.on("error", reject);
  });
}

function paginaIndisponivel(convite: Convite | undefined): { status: number; html: string } {
  if (!convite) return { status: 404, html: paginaMensagem("Link não encontrado", "Confira o link com seu personal.") };
  if (convite.status === "expirado")
    return { status: 410, html: paginaMensagem("Este link venceu", "Peça um link novo ao seu personal.") };
  return {
    status: 409,
    html: paginaMensagem("Respostas já enviadas", "Seu personal já recebeu suas respostas. Se quiser mudar algo, fale com ele.", "✓ Recebido"),
  };
}

export function criarServidor(opcoes: {
  repo: Repositorio;
  /** Chamado depois que as respostas foram salvas. Erros aqui não afetam o aluno. */
  aoResponder: (convite: Convite) => Promise<void>;
}): Server {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/saude") {
        res.writeHead(200, { "content-type": "text/plain" }).end("ok");
        return;
      }
      const token = ROTA.exec(url.pathname)?.[1];
      if (!token) return responder(res, 404, paginaMensagem("Página não encontrada", "Confira o link com seu personal."));

      const convite = await opcoes.repo.obterConvite(token);
      if (!convite || convite.status !== "aguardando") {
        const { status, html } = paginaIndisponivel(convite);
        return responder(res, status, html);
      }

      const acao = `/a/${token}`;
      if (req.method === "GET") return responder(res, 200, paginaFormulario({ aluno: convite.aluno, acao }));
      if (req.method !== "POST") return responder(res, 405, paginaMensagem("Método não permitido", ""));

      const respostas = respostasDoFormulario(new URLSearchParams(await lerCorpo(req)));
      const erros = validarRespostas(respostas);
      if (Object.keys(erros).length > 0) {
        return responder(res, 422, paginaFormulario({ aluno: convite.aluno, acao, respostas, erros }));
      }

      const respondido = await opcoes.repo.registrarRespostas(token, respostas);
      responder(
        res,
        200,
        paginaMensagem("Pronto, obrigado!", "Suas respostas foram para o seu personal. Ele vai te mandar o treino.", "✓ Enviado"),
      );
      opcoes.aoResponder(respondido).catch((erro: unknown) => console.error("Erro ao avisar o personal:", erro));
    } catch (erro) {
      console.error("Erro no formulário:", erro);
      if (!res.headersSent) responder(res, 500, paginaMensagem("Algo deu errado", "Tente de novo em instantes."));
    }
  });
}
