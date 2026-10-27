# Diretrizes de design Gove

Versão 1.1 (out/2026) · documento-base do Gove Design System. Vale para tudo o que a Gove produz — por pessoas ou por inteligência artificial: interfaces, apresentações, peças de mídia, impressos, e-mails e páginas. Ao gerar qualquer material com IA, cole este documento (ou a seção "Instruções para IA", no fim) como contexto.

## 1. Essência

- A Gove é a infraestrutura digital do **Governo Zero Clique**: o governo que sabe, antecipa e age — para facilitar a vida de quem precisa e de quem serve.
- Personalidade: tecnológica e sofisticada, institucional e confiável, dinâmica sem ser ruidosa.
- Dois públicos ao mesmo tempo: o cidadão e o servidor público.

## 2. Voz e texto

- Português do Brasil. Frases curtas, declarativas, com verbo de ação: "sabe, antecipa, age".
- Foque no benefício, não na tecnologia: "o serviço chega até o cidadão", não "API de integração de dados".
- Títulos e botões em sentence case ("Agendar demonstração"). Botões começam com verbo.
- Sem jargão burocrático, sem emoji, sem exclamações em sequência.
- Corte o que repete: cada tela ou peça diz uma coisa principal; um único chamado para ação por peça.

## 3. Cores

Use somente a paleta oficial. Nunca preto puro (#000000).

Quatro cores principais (Branco, Noite, Amarelo, Roxo) e seis secundárias, na assinatura do Mapa de Predominância de Cores. Na nova bússola, a marca é profunda, tranquila, tecnológica, equilibrada, confiável, otimista, sofisticada, incomum e intelectual.

| Nome | HEX | RGB | Papel |
|---|---|---|---|
| Branco (principal) | #F4F4F4 | 244 244 244 | Neutralidade e clareza; monta o palco. Superfícies no claro, texto no escuro |
| Noite (principal) | #20133D | 32 19 61 | Autoridade e o premium. Fundo do tema escuro, títulos no claro |
| Amarelo (principal) | #FFC72C | 255 199 44 | O negrito da história: uma ação principal por tela/peça, destaques, foco |
| Roxo (principal) | #3D0099 | 61 0 153 | Transformação digital. Marca, botões principais, títulos em fundo claro |
| Roxo profundo | #351F65 | 53 31 101 | Camada premium. Hover, bordas e fundos de blocos no escuro |
| Grafite | #2F3539 | 47 53 57 | Solidez. Texto de corpo no claro, superfícies no escuro |
| Lavanda | #A278DA | 162 120 218 | Humaniza. Apoio: ilustração, gráficos, bordas em hover; nunca texto pequeno |
| Cinza técnico | #5B6770 | 91 103 112 | Estrutura sem roubar a cena: desabilitado, placeholder, divisores |
| Ciano | #5AC2CD | 90 194 205 | A virada, a luz no fim do túnel. Links e itens ativos no escuro, gráficos |
| Azul confiança | #16499F | 22 73 159 | Afirmação e credibilidade. Blocos institucionais, gráficos |
| Branco puro | #FFFFFF | 255 255 255 | Só o fundo do tema claro das interfaces |

- **Equilíbrio:** escuros e claros em quantidades próximas; não monte telas inteiras só de roxos e grafite.
- **Matiz:** para separar temas, alterne matizes distantes (Ciano, Amarelo, Lavanda), não tons vizinhos de roxo.
- **Hierarquia:** Lavanda e Cinza técnico são cores de apoio, com menor predominância visual.

**Pares de contraste aprovados** (fundo → texto pequeno; entre parênteses, só texto grande, 24 px+ ou 19 px+ negrito)

| Fundo | Texto |
|---|---|
| Branco | Noite, Roxo, Roxo profundo, Grafite, Azul confiança (Cinza técnico) |
| Noite | Branco, Amarelo, Ciano (Lavanda) |
| Amarelo | Noite, Roxo, Roxo profundo, Grafite (Azul confiança) |
| Roxo, Roxo profundo, Grafite | Branco, Amarelo (Ciano) |
| Lavanda | (Noite) |
| Cinza técnico | (Branco) |
| Ciano | Noite (Roxo, Roxo profundo, Grafite) |
| Azul confiança | Branco (Amarelo) |

**Colorimetria em pauta (predominância por assunto)**

Antes de escolher cores, responda: Pessoa (público, idade, dores), Situação (assunto, período, importância) e Lugar (conversa pública ou privada, eixo social). Depois use a predominância da pauta — a primeira cor é a dominante; o Branco equilibra os tons escuros. O mapa se baseia na Gestalt e na psicologia das cores e pode variar por região e cultura:

| Pauta | Predominância |
|---|---|
| Cidadania, direitos e políticas sociais | Lavanda 46%, Branco 38%, Grafite 16% |
| Saúde, meio ambiente e sustentabilidade | Ciano 45%, Branco 28%, Roxo 14%, Noite 13% |
| Educação, cultura, ciência e tecnologia | Lavanda 46%, Branco 38%, Ciano 16% |
| Economia, trabalho e desenvolvimento | Azul confiança 53%, Amarelo 21%, Branco 14%, Grafite 12% |
| Segurança, justiça e instituições | Noite 53%, Cinza técnico 21%, Branco 14%, Ciano 12% |
| Gestão pública, infraestrutura e território | Branco 41%, Roxo profundo 31%, Amarelo 14%, Azul confiança 13% |

Tons (nova bússola): Sofisticada e Profunda → Noite e Roxo profundo; Incomum → Lavanda; Intelectual e Tecnológica → Roxo, Azul confiança e Ciano; Tranquila → Ciano e Branco; Equilibrada → Cinza técnico e Branco; Confiável → Azul confiança e Grafite; Otimista → Amarelo.

**Temas**

- Claro (padrão das interfaces): fundo Branco puro, superfícies Branco, títulos Noite, corpo Grafite, links Roxo.
- Escuro (Noturno, o tema da marca em peças imersivas): fundo Noite, superfícies Grafite, títulos e corpo Branco, links Ciano, destaque e foco Amarelo. A hierarquia vem de tamanho e peso, não de um segundo branco.
- Gráficos sobre Noite: séries em Ciano, Amarelo, Lavanda e Branco, com rótulo direto. Sobre Branco: Noite, Roxo, Roxo profundo, Grafite, Lavanda, Cinza técnico e Azul confiança.

**Contraste**

- Texto: mínimo 4,5:1 com o fundo (3:1 só para títulos a partir de 24 pt/px).
- Texto sobre Amarelo: sempre Noite. Texto sobre Roxo: sempre Branco.
- Amarelo e Lavanda não são cor de texto sobre fundo claro; Cinza técnico não é cor de texto sobre escuro.
- Daltonismo: nunca diferencie séries ou estados só por matiz; some rótulo, ícone ou diferença de luminosidade.

**Gradientes e fotos**

- Gradientes só entre cores da paleta e só como fundo; nunca atrás de texto pequeno sem garantir 4,5:1 no ponto mais claro.
- Fotos são apoio: pessoas reais em contexto de serviço público; nunca texto direto sobre área clara da foto.

## 4. Tipografia

| Uso | Fonte | Pesos |
|---|---|---|
| Títulos e destaques | Montserrat | SemiBold 600, Bold 700 |
| Corpo, interface, legendas | Inter | Regular 400, Medium 500, SemiBold 600 |
| Reserva (impresso, sem as fontes) | Helvetica, depois Arial | — |

Escala Major Third (1,250) — telas em px; em documentos use o mesmo valor em pt:

| Estilo | Tamanho | Altura de linha |
|---|---|---|
| Display (um por página, no hero) — Bold | 64 | 1,1 |
| H1 — Bold | 48 | 1,2 |
| H2 — SemiBold | 32 | 1,3 |
| H3 — SemiBold | 24 | 1,4 |
| Corpo grande | 18 | 1,6 |
| Corpo | 16–17 | 1,5 |
| Legenda | 14 | 1,4 |

**Tamanhos mínimos (Human Interface Guidelines)**

- Nenhum texto abaixo de 11 pt/px em nenhum meio.
- Corpo de texto em telas: 17 px recomendado (16 px aceitável em web densa).
- Alvos de toque e clique: mínimo 44 × 44 px.
- Impresso: corpo mínimo 9 pt em peças pequenas (adesivos), 11 pt nas demais.

## 5. Logomarca

Arquivos oficiais (fundo transparente), em `brand/logos/`:

| Arquivo | Uso |
|---|---|
| gove-logo-cor.webp | Logotipo colorido (roxo + arco amarelo) |
| gove-logo-roxo.webp | Logotipo monocromático roxo |
| gove-logo-branco.webp | Logotipo branco |
| gove-simbolo-cor.png | Símbolo colorido — espaços 1:1 |
| gove-simbolo-roxo.png | Símbolo roxo — espaços 1:1 |
| gove-simbolo-branco.png | Símbolo branco — espaços 1:1 |

Cores da logo: roxo #3E0099, amarelo #FEC526, branco.

**Regra de contraste (obrigatória):** toda cor presente na logo precisa de contraste mínimo de 4,5:1 com o fundo onde ela é aplicada.

| Fundo | Versão correta |
|---|---|
| Branco puro, Branco, Amarelo, verdes claros | Roxo |
| Noite, Roxo, Grafite, verdes escuros | Branco |
| Fundo que não passa com nenhuma versão | Coloque a logo sobre uma placa sólida que passe |

A versão colorida só é usada quando roxo e amarelo passam ao mesmo tempo — na prática, raramente.

**Formato:** símbolo em espaços quadrados (ícones, avatares, favicon, perfil); logotipo em espaços horizontais (cabeçalhos, rodapés, assinaturas).

**Área de proteção:** espaço livre em volta igual à altura do arco do símbolo. **Tamanho mínimo:** logotipo com 24 px de altura em tela / 8 mm em impresso; símbolo com 24 px / 8 mm.

**Nunca:** distorcer, girar, recolorir fora das versões oficiais, aplicar sombra ou contorno, colocar sobre foto sem placa, redesenhar.

## 6. Espaço, forma e elevação

- Grade de 8 px: 8, 16, 24, 32, 48, 64, 96.
- Raios: 4 (campos e tags), 8 (botões), 16 (cards e modais), circular (avatares e pílulas).
- Sombras suaves no tema claro; o brilho neon (glow lavanda nos botões principais, amarelo nos CTAs) fica só em botões e chamadas.
- Movimento: entrada com fade + subida de 20 px em 600 ms (ease-out exponencial), listas em cascata de 50–100 ms; hover de botão scale 1,02 com glow mais forte; cards sobem 4 px; estados entre 200 e 300 ms.

## 7. Iconografia

- Conjunto oficial: **Phosphor** (1.512 ícones). Use só esses ícones; sem emoji.
- Interfaces: apenas os pesos **regular** (padrão) e **fill**. O fill marca só o estado ativo ou selecionado (item de menu, aba, favorito), aplicado ícone a ícone, nunca como estilo geral.
- **Duotone: nunca.** Thin e light: nunca em apresentações nem em impressos.
- Outras peças: escolha o peso pelo suporte e tamanho, mas **um único peso por página**, slide ou peça.
- Tamanhos 16, 24 e 32 px. A cor segue o texto ao lado; em destaque, Amarelo (no escuro) ou Roxo (no claro).
- Ícone sozinho só quando o significado é óbvio — sempre com nome acessível e dica; em telas largas, ícone + nome.

## 8. Aplicação por meio

### Interfaces (web e apps)

- Tema claro por padrão, com opção de escuro (Noturno).
- Navegação no padrão Material Design 3:
  - computador: navigation drawer que recolhe para navigation rail (ícone + rótulo), com a ação principal como FAB no topo;
  - celular: top app bar com o título do destino (e seta de voltar nas telas internas), navigation bar com 3 a 5 destinos (ícone + rótulo, indicador em pílula e ícone fill no ativo), FAB para a ação principal e tabs para alternar visões dentro de um destino;
  - tocar de novo no destino ativo volta ao topo.
- Um botão amarelo por tela; demais ações em contorno ou só ícone.
- Detalhes secundários sob demanda (painéis "Sobre", seções recolhíveis).
- Foco do teclado visível: contorno amarelo de 2 px com 2 px de afastamento.

### Apresentações (PowerPoint, Google Slides, Keynote)

- Formato 16:9, 1920 × 1080 (33,867 × 19,05 cm).
- Margens: 96 px (5% da largura) em todos os lados; nada importante fora delas.
- Fontes: Montserrat nos títulos, Inter no corpo (incorpore as fontes ao salvar; reserva Arial).
- Tamanhos: título 40–48 pt; subtítulo 24–28 pt; corpo 18–24 pt; nunca abaixo de 14 pt em slide, nem de 11 pt em notas e rodapés.
- Uma ideia por slide; no máximo 6 linhas de texto.
- Capa e divisórias: fundo Noite ou Roxo, logotipo branco. Conteúdo: fundo Branco, títulos Noite, corpo Grafite.
- Logotipo pequeno no rodapé de todos os slides de conteúdo (versão pela regra de contraste); número da página em Inter 12 pt Cinza técnico.
- Gráficos: sobre Branco, séries em Roxo, Azul confiança, Grafite, Lavanda e Cinza técnico; sobre Noite, Ciano, Amarelo, Lavanda e Branco; rótulos diretos; sem 3D.
- Fotos com cantos de 16 px ou sangradas; nunca texto sobre foto sem placa.

### Mídia social e anúncios

- Formatos: 1080 × 1350 (4:5 feed), 1080 × 1080 (1:1), 1080 × 1920 (9:16 story), 1200 × 628 / 1920 × 1005 (LinkedIn), 1440 × 1080 (4:3 follow-up).
- Margem de segurança: 6% do menor lado (8% em story).
- Título até 60 caracteres, subtítulo até 90, CTA com verbo.
- Logomarca em todas as peças, pela regra de contraste.

### Follow-ups

- Atualização de produto: título curto, até 5 novidades em lista com ícones, versão/data, logo.
- Confirmação de evento: moldura circular para a foto da pessoa, nome, nome/descrição do evento, data e logo.
- Formatos 4:3 e 1:1.

### Impressos

- Cores em CMYK; perfil a combinar com a gráfica (validar sempre uma prova).
- Sangria de 5 mm e área de segurança de 5 mm para dentro do corte.
- Fontes incorporadas; reserva Helvetica.
- QR code sobre branco sólido, correção de erro H, lado mínimo de 20 mm, zona livre de 4 módulos.
- Imagens em 300 dpi no tamanho final.

### E-mails (HTML)

- Largura de 600 px, uma coluna, fundo Branco.
- Fontes: Inter com reserva Arial/Helvetica (e-mail não garante fontes web).
- Corpo 16 px, títulos 24–28 px, nada abaixo de 12 px (rodapé legal no mínimo 12 px).
- Botão principal amarelo com texto Noite, 44 px de altura mínima, texto do botão em HTML (não imagem).
- Logotipo no topo pela regra de contraste, com texto alternativo "Gove".

### Landing pages

- Mesmos tokens da interface; hero com um título (Display), uma frase e um botão.
- Seções com espaçamento de 96 px no computador e 48 px no celular.
- Tudo responsivo a partir de 360 px de largura, sem rolagem lateral.

## 9. Acessibilidade

- Contraste 4,5:1 em texto e na logomarca.
- Alvos de 44 × 44 px; foco visível; ordem de leitura lógica.
- Texto alternativo em toda imagem informativa; decorativas marcadas como decorativas.
- Cor nunca é a única pista (some ícone ou texto).
- Respeitar "reduzir movimento": desligar parallax e deslizamentos.

## 10. Checklist antes de publicar

- [ ] Só cores da paleta; nenhum preto puro.
- [ ] Texto com contraste ≥ 4,5:1.
- [ ] Logomarca oficial, na versão certa para o fundo (≥ 4,5:1), sem distorção, com área de proteção.
- [ ] Montserrat nos títulos, Inter no corpo.
- [ ] Nenhum texto abaixo de 11 pt/px; alvos ≥ 44 px.
- [ ] Um único chamado para ação.
- [ ] Sem textos repetidos ou desnecessários.
- [ ] Rodou no Revisor de identidade visual sem erros.

## Instruções para IA

Copie o bloco abaixo como instrução de sistema ao pedir qualquer material da Gove a uma ferramenta de IA.

```text
Você cria materiais para a Gove (Governo Zero Clique). Siga estritamente:
- Cores somente: #FFC72C, #3D0099, #351F65, #F4F4F4, #2F3539, #A278DA, #5B6770, #20133D, #5AC2CD, #16499F e #FFFFFF. Nunca #000000.
- Tema claro: fundo #FFFFFF, títulos #20133D, corpo #2F3539, links #3D0099. Tema escuro (Noturno): fundo #20133D, superfícies #2F3539, títulos e corpo #F4F4F4, links #5AC2CD, destaque e foco #FFC72C.
- Texto pequeno só nos pares aprovados (fundo → texto): #F4F4F4 → #20133D/#3D0099/#351F65/#2F3539/#16499F; #20133D → #F4F4F4/#FFC72C/#5AC2CD; #FFC72C → #20133D/#3D0099/#351F65/#2F3539; #3D0099, #351F65, #2F3539 → #F4F4F4/#FFC72C; #5AC2CD → #20133D; #16499F → #F4F4F4. #A278DA e #5B6770 nunca em texto pequeno.
- Contraste mínimo de 4,5:1 para texto e para cada cor da logomarca com o fundo.
- Logomarca: use apenas os arquivos oficiais (logotipo e símbolo, versões cor/roxo/branco). Em fundo claro, a versão roxa; em fundo escuro, a branca; a colorida só se roxo #3E0099 e amarelo #FEC526 tiverem 4,5:1 com o fundo. Símbolo em espaços 1:1, logotipo em espaços horizontais. Nunca distorcer, recolorir ou redesenhar.
- Tipografia: Montserrat (600–700) nos títulos, Inter (400–600) no corpo; reserva Helvetica/Arial. Nenhum texto abaixo de 11 pt/px; corpo de tela 17 px; alvos de toque ≥ 44 px.
- Grade de 8 px; raios 4/8/16; ícones do conjunto Phosphor: na interface só regular (padrão) e fill (estado ativo); nunca duotone; thin e light nunca em apresentações e impressos; um único peso por peça; sem emoji.
- Texto em português do Brasil, frases curtas com verbo de ação, foco no benefício, sentence case, um único chamado para ação, sem textos repetidos.
- Apresentações 16:9 com margem de 96 px, título 40–48 pt, corpo 18–24 pt, uma ideia por slide.
- Escolha a predominância de cor pela pauta (bússola de cores): Cidadania → Lavanda/Branco/Grafite; Educação e tecnologia → Lavanda/Branco/Ciano; Economia → Azul confiança/Amarelo/Branco/Grafite; Segurança e instituições → Noite/Cinza técnico/Branco/Ciano; Gestão pública → Branco/Roxo profundo/Amarelo/Azul confiança; Saúde e ambiente → Ciano/Branco/Roxo/Noite.
- Antes de entregar, confira o checklist: paleta, contraste, logomarca correta, fontes, tamanhos mínimos e um único CTA.
```
