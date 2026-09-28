# Logomarca oficial

TODO(gove): coloque aqui os dois arquivos oficiais da logomarca, com os nomes
cadastrados em `db/seed.js` (LOGOS):

- `gove-logo-branco-amarelo.png` — versão para fundo escuro
- `gove-logo-roxo.png` — versão para fundo claro

Depois rode `npm run db:init -- --hash-logos` para gravar o sha256 de cada
arquivo em `brand_tokens`. Com o hash cadastrado, o Modo A confere o conteúdo
exato das logos embutidas (data URL), não só o nome do arquivo.
