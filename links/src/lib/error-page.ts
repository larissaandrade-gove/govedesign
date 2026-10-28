export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>A página não carregou — Gove Links</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 Inter, Arial, sans-serif; background: #f4f4f4; color: #2f3539; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-family: Montserrat, Arial, sans-serif; font-weight: 700; font-size: 1.375rem; color: #20133d; margin: 0 0 0.5rem; }
      p { color: #2f3539; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #ffc72c; color: #20133d; font-weight: 600; }
      .secondary { background: #fff; color: #20133d; border-color: #e3d8f3; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>A página não carregou</h1>
      <p>Algo deu errado do nosso lado. Tente de novo ou volte para o início.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar de novo</button>
        <a class="secondary" href="/">Voltar ao início</a>
      </div>
    </div>
  </body>
</html>`;
}
