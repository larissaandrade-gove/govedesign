# Logomarca oficial

Os arquivos oficiais da logomarca agora ficam em `brand/logos/` (símbolo e
logotipo, nas versões cor, roxo e branco), com a regra de aplicação por
contraste em `brand/logos.js`. Os tokens `logo` de `db/seed.js` apontam para
esses arquivos e o revisor os lê de lá (`LOGO_DIR`, sobrescrevível com a
variável de ambiente `GOVE_LOGO_DIR`).

Para gravar o sha256 de cada arquivo em `brand_tokens`:
`npm run db:init -- --hash-logos`.
