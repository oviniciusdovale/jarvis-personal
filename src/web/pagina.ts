import {
  CONSENTIMENTO_ID,
  FORMULARIO,
  LIMITE_TEXTO,
  TEXTO_CONSENTIMENTO,
  type Campo,
  type Respostas,
} from "../dominio/anamnese.js";

/** Páginas do formulário de anamnese. HTML gerado no servidor, sem dependência externa. */

export function escapar(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const ESTILO = `
:root{--fundo:#f6f5f2;--cartao:#fff;--texto:#1d1d1b;--suave:#6b6a66;--borda:#dcdad4;--marca:#1f6f5c;--marca-clara:#e3f0ec;--erro:#b3261e;--erro-claro:#fbeaea}
@media (prefers-color-scheme:dark){:root{--fundo:#141413;--cartao:#1f1f1d;--texto:#f0efea;--suave:#a3a29c;--borda:#3a3a36;--marca:#5fbfa3;--marca-clara:#1d3530;--erro:#f2b8b5;--erro-claro:#3a1f1e}}
*{box-sizing:border-box}
body{margin:0;background:var(--fundo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:640px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:1.5rem;margin:0 0 8px}
h2{font-size:1.1rem;margin:0 0 4px}
p{margin:0 0 12px}
.suave{color:var(--suave);font-size:.93rem}
section{background:var(--cartao);border:1px solid var(--borda);border-radius:12px;padding:20px 16px;margin:16px 0}
.campo{margin-top:18px}
.rotulo{display:block;font-weight:600;margin-bottom:6px}
.obrig{color:var(--marca)}
input[type=text],input[type=number],textarea{width:100%;padding:10px 12px;border:1px solid var(--borda);border-radius:8px;background:var(--cartao);color:var(--texto);font:inherit}
textarea{min-height:76px;resize:vertical}
input:focus-visible,textarea:focus-visible,.opcao input:focus-visible+span{outline:2px solid var(--marca);outline-offset:2px}
.num{display:flex;align-items:center;gap:8px}.num input{max-width:140px}
.opcoes{display:flex;flex-wrap:wrap;gap:8px}
.opcao{position:relative}
.opcao input{position:absolute;opacity:0;inset:0;margin:0}
.opcao span{display:inline-block;padding:8px 14px;border:1px solid var(--borda);border-radius:999px;cursor:pointer;user-select:none}
.opcao input:checked+span{background:var(--marca);border-color:var(--marca);color:#fff}
.erro-campo{color:var(--erro);font-size:.9rem;margin-top:6px}
.tem-erro input[type=text],.tem-erro input[type=number],.tem-erro textarea{border-color:var(--erro)}
.aviso-erro{background:var(--erro-claro);color:var(--erro);border-radius:8px;padding:12px 14px;margin:16px 0}
.consentimento{display:flex;gap:10px;align-items:flex-start}
.consentimento input{width:20px;height:20px;margin-top:3px;flex:none}
button{width:100%;padding:14px;border:0;border-radius:10px;background:var(--marca);color:#fff;font:600 1rem/1 inherit;cursor:pointer}
button:disabled{opacity:.6}
.centro{text-align:center;padding-top:48px}
.selo{display:inline-block;background:var(--marca-clara);color:var(--marca);border-radius:999px;padding:4px 12px;font-size:.85rem;margin-bottom:12px}
`;

function documento(titulo: string, corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapar(titulo)}</title>
<style>${ESTILO}</style>
</head>
<body><main>${corpo}</main></body>
</html>`;
}

function valor(respostas: Respostas, id: string): string {
  const v = respostas[id];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function marcado(respostas: Respostas, id: string, opcao: string): boolean {
  const v = respostas[id];
  return Array.isArray(v) ? v.includes(opcao) : v === opcao;
}

function campoHtml(campo: Campo, respostas: Respostas, erro?: string): string {
  const obrig = campo.obrigatorio ? ' <span class="obrig" aria-hidden="true">*</span>' : "";
  const ajuda = campo.ajuda ? `<p class="suave">${escapar(campo.ajuda)}</p>` : "";
  const msgErro = erro ? `<div class="erro-campo" id="erro-${campo.id}">${escapar(erro)}</div>` : "";
  const descr = erro ? ` aria-describedby="erro-${campo.id}" aria-invalid="true"` : "";
  const req = campo.obrigatorio ? " required" : "";
  const classe = `campo${erro ? " tem-erro" : ""}`;

  switch (campo.tipo) {
    case "texto":
    case "textarea": {
      const ph = campo.placeholder ? ` placeholder="${escapar(campo.placeholder)}"` : "";
      const entrada =
        campo.tipo === "texto"
          ? `<input type="text" id="${campo.id}" name="${campo.id}" maxlength="${LIMITE_TEXTO}" value="${escapar(valor(respostas, campo.id))}"${ph}${req}${descr}>`
          : `<textarea id="${campo.id}" name="${campo.id}" maxlength="${LIMITE_TEXTO}"${ph}${req}${descr}>${escapar(valor(respostas, campo.id))}</textarea>`;
      return `<div class="${classe}"><label class="rotulo" for="${campo.id}">${escapar(campo.rotulo)}${obrig}</label>${ajuda}${entrada}${msgErro}</div>`;
    }
    case "numero": {
      const passo = campo.decimal ? "any" : "1";
      const unidade = campo.unidade ? `<span class="suave">${escapar(campo.unidade)}</span>` : "";
      return `<div class="${classe}"><label class="rotulo" for="${campo.id}">${escapar(campo.rotulo)}${obrig}</label>${ajuda}<div class="num"><input type="number" inputmode="decimal" id="${campo.id}" name="${campo.id}" min="${campo.min}" max="${campo.max}" step="${passo}" value="${escapar(valor(respostas, campo.id))}"${req}${descr}>${unidade}</div>${msgErro}</div>`;
    }
    case "opcoes":
    case "simnao": {
      const tipo = campo.tipo === "opcoes" && campo.multipla ? "checkbox" : "radio";
      const opcoes: [string, string][] =
        campo.tipo === "simnao" ? [["sim", "Sim"], ["nao", "Não"]] : campo.opcoes.map((o) => [o, o]);
      const itens = opcoes
        .map(
          ([v, rotulo], i) =>
            `<label class="opcao"><input type="${tipo}" name="${campo.id}" value="${escapar(v)}"${marcado(respostas, campo.id, v) ? " checked" : ""}${req && i === 0 && tipo === "radio" ? " required" : ""}><span>${escapar(rotulo)}</span></label>`,
        )
        .join("");
      return `<fieldset class="${classe}" style="border:0;padding:0;margin-left:0;margin-right:0"${descr}><legend class="rotulo">${escapar(campo.rotulo)}${obrig}</legend>${ajuda}<div class="opcoes">${itens}</div>${msgErro}</fieldset>`;
    }
  }
}

export function paginaFormulario(opcoes: {
  aluno: string;
  acao: string;
  respostas?: Respostas;
  erros?: Record<string, string>;
}): string {
  const respostas = opcoes.respostas ?? {};
  const erros = opcoes.erros ?? {};
  const qtdErros = Object.keys(erros).length;
  const avisoErro =
    qtdErros > 0
      ? `<div class="aviso-erro" role="alert">Faltou ${qtdErros === 1 ? "1 resposta" : `${qtdErros} respostas`}. Os campos estão marcados abaixo.</div>`
      : "";

  const secoes = FORMULARIO.map(
    (secao) =>
      `<section><h2>${escapar(secao.titulo)}</h2>${secao.descricao ? `<p class="suave">${escapar(secao.descricao)}</p>` : ""}${secao.campos
        .map((c) => campoHtml(c, respostas, erros[c.id]))
        .join("")}</section>`,
  ).join("");

  const erroConsent = erros[CONSENTIMENTO_ID]
    ? `<div class="erro-campo">${escapar(erros[CONSENTIMENTO_ID])}</div>`
    : "";

  const corpo = `
<h1>Oi, ${escapar(opcoes.aluno)}!</h1>
<p>Seu personal vai montar seu treino a partir destas respostas. Leva uns 5 minutos.</p>
<p class="suave">Perguntas com <span class="obrig">*</span> são obrigatórias. Não precisa colocar nome completo nem contato.</p>
${avisoErro}
<form method="post" action="${escapar(opcoes.acao)}" onsubmit="this.querySelector('button').disabled=true">
${secoes}
<section>
<label class="consentimento"><input type="checkbox" name="${CONSENTIMENTO_ID}" value="sim" required${valor(respostas, CONSENTIMENTO_ID) === "sim" ? " checked" : ""}><span>${escapar(TEXTO_CONSENTIMENTO)}</span></label>
${erroConsent}
</section>
<button type="submit">Enviar para meu personal</button>
</form>`;
  return documento("Anamnese", corpo);
}

export function paginaMensagem(titulo: string, texto: string, selo?: string): string {
  return documento(
    titulo,
    `<div class="centro">${selo ? `<span class="selo">${escapar(selo)}</span>` : ""}<h1>${escapar(titulo)}</h1><p>${escapar(texto)}</p></div>`,
  );
}
