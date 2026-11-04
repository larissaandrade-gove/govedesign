<!-- Cópia de skills/gove-design-system/SKILL.md (Design System Gove), sem o cabeçalho YAML. Para atualizar, copie de novo o arquivo de origem. -->


# Gove Design System — instruções para IA

Arquivo único com todas as instruções de **Apoio de IA** do Design System Gove. Gerado por `design-system/scripts/build-skill.mjs` a partir dos guias em `docs/` e dos dados do design system; não edite à mão.

## Como usar
- Antes de criar qualquer peça, identifique o tipo (mídia, apresentação, documento/e-mail, interface) e siga o prompt correspondente em "Prompts por tipo de peça".
- Use só as cores da paleta, as fontes e a regra da logomarca descritas aqui. Na dúvida, prefira o tom mais sóbrio e o contraste maior.
- Para revisar uma peça, use "Revisão de cores por pauta" com a pauta do assunto.

## Paleta institucional
| Cor | HEX | Grupo | Uso | Transmite |
| --- | --- | --- | --- | --- |
| Branco | #F4F4F4 | principal | Superfícies no tema claro; texto sobre fundos escuros. | Neutralidade, minimalismo e clareza — um branco acinzentado, sofisticado e moderno. |
| Noite | #20133D | principal | Fundo do tema escuro; títulos no tema claro. | Autoridade, mistério, seriedade e luxo — a noite, o universo. |
| Amarelo | #FFC72C | principal | Uma ação principal por tela, destaques e foco. Texto sobre ele: Noite. | Vibração, otimismo, energia, inovação e calor. |
| Roxo | #3D0099 | principal | Marca e botões principais; títulos e links no tema claro. Texto sobre ele: branco. | Criatividade, magia, realeza e inovação digital. |
| Roxo Profundo | #351F65 | secundária | Bordas e fundos secundários no tema escuro. | Mistério, luxo, realeza e profundidade infinita. |
| Grafite | #2F3539 | secundária | Texto de corpo no tema claro; superfícies no tema escuro. | Neutra, fria e densa: solidez, seriedade, maturidade e modernidade. |
| Cinza técnico | #5B6770 | secundária | Texto secundário no tema claro (5,8:1 no branco). | Técnica, equilibrada, neutra e prática. |
| Ciano | #5AC2CD | secundária | Informação e gráficos. | Frescor, clareza mental, fluidez, inovação e descoberta. |
| Lavanda | #A278DA | secundária | Links e realces no tema escuro; bordas em hover. Não usar como texto no claro. | Criatividade, sensibilidade, imaginação e acolhimento. |
| Azul confiança | #16499F | secundária | Links no tema claro e gráficos. | Confiança, segurança e autoridade. |

Branco puro #FFFFFF também é permitido. Preto puro (#000000) não entra nas peças (Diretrizes, seção 3).

## Colorimetria em pauta
| Pauta | Foco | Predominância |
| --- | --- | --- |
| Cidadania, direitos e políticas sociais | Garantia de direitos, inclusão, proteção social. | Lavanda 46% · Branco 38% · Grafite 16% |
| Saúde, meio ambiente e sustentabilidade | Qualidade de vida, prevenção, desenvolvimento sustentável. | Ciano 45% · Branco 28% · Roxo 14% · Noite 13% |
| Educação, cultura, ciência e tecnologia | Formação cidadã, acesso ao conhecimento, inclusão digital. | Lavanda 46% · Branco 38% · Ciano 16% |
| Economia, trabalho e desenvolvimento | Crescimento, geração de renda, justiça fiscal. | Azul confiança 53% · Amarelo 21% · Branco 14% · Grafite 12% |
| Segurança, justiça e instituições | Ordem democrática, combate à impunidade, cidadania. | Noite 53% · Cinza técnico 21% · Branco 14% · Ciano 12% |
| Gestão pública, infraestrutura e território | Eficiência do Estado, acesso a serviços, ocupação do território. | Branco 41% · Roxo Profundo 31% · Amarelo 14% · Azul confiança 13% |

Atributos da bússola e suas cores: Sofisticada (Noite, Roxo Profundo); Incomum (Lavanda, Roxo Profundo); Intelectual (Roxo, Azul confiança); Profunda (Noite, Roxo); Tranquila (Ciano, Branco); Tecnológica (Roxo, Ciano); Equilibrada (Cinza técnico, Branco); Confiável (Azul confiança, Grafite); Otimista (Amarelo).

Perguntas que orientam a escolha:
- **Pessoa:** Com qual público estamos conversando? Qual a idade dele? Quais as dores que o afetam?
- **Situação:** Qual assunto será tratado? Em que período será tratado? Qual a importância do assunto?
- **Lugar:** É uma conversa pública ou privada? Com qual eixo social se comunica?

## Prompts por tipo de peça

### Prompt de componentes
_Telas, protótipos e componentes de interface com os tokens do design system._

```text
Você cria componentes e telas de interface para a Gove (Governo Zero Clique): o governo que sabe, antecipa e age. Siga estritamente o Design System Gove abaixo.

## Tokens de cor (papel → HEX)
- Tema claro (padrão): background #FFFFFF, surface #F4F4F4, secondary #E3D8F3, text-primary #20133D, text-secondary #2F3539, text-muted #5B6770, primary #3D0099, accent #FFC72C, highlight #3D0099, link #3D0099, lilac #A278DA, cyan #5AC2CD, blue #16499F, on-primary #FFFFFF, on-accent #20133D, success #1E7A46, error #B42318.
- Tema escuro (Noturno): background #20133D, surface #2F3539, secondary #351F65, text-primary #F4F4F4, text-secondary #F4F4F4, text-muted #5B6770, primary #3D0099, accent #FFC72C, highlight #FFC72C, link #5AC2CD, lilac #A278DA, cyan #5AC2CD, blue #16499F, on-primary #F4F4F4, on-accent #20133D, success #75E0A7, error #FDA29B.
- Um único botão de ação (accent, Amarelo) por tela; texto sobre accent em on-accent, sobre primary em on-primary. Nunca preto puro (#000000).

## Tipografia
- Montserrat (600–700) nos títulos e destaques; Inter (400–600) no corpo e na interface; reserva Helvetica, depois Arial.
- Display: Montserrat 64 px, peso 700, altura de linha 1,1, tracking -0.02em
- H1: Montserrat 48 px, peso 700, altura de linha 1,2, tracking -0.015em
- H2: Montserrat 32 px, peso 600, altura de linha 1,3
- H3: Montserrat 24 px, peso 600, altura de linha 1,4
- Corpo grande: Inter 18 px, peso 400, altura de linha 1,6
- Corpo: Inter 16 px, peso 400, altura de linha 1,5
- Legenda: Inter 14 px, peso 500, altura de linha 1,4
- Nada abaixo de 11 px; corpo de tela 16–17 px.

## Espaço, forma e movimento
- Grade de 8 px: 8, 16, 24, 32, 48, 64, 96.
- Raios: 4 px (campos e tags), 8 px (botões), 16 px (cards e modais), circular (avatares e pílulas).
- Movimento: entrada com fade + subida de 20 px em 600 ms, cubic-bezier(0.16, 1, 0.3, 1); estados em 200–300 ms; cascata de 70 ms; respeitar "reduzir movimento".

## Componentes
- Botões de 48 px (md) ou 56 px (lg) de altura, raio 8 px: Ação (accent #FFC72C, texto #20133D), Primário (primary #3D0099, texto branco), Secundário (contorno sutil). Hover escala 1,02; desabilitado 40% de opacidade.
- Campo de texto: rótulo visível acima (14 px, semibold), 48 px de altura, raio 8 px, foco com borda primary; placeholder nunca substitui o rótulo.
- Card: superfície (surface), borda sutil, raio 16 px, padding 24 px; ícone em placa de 48 px, título H3, até duas linhas.
- Navegação Material Design 3: drawer que recolhe para rail no computador; top app bar + navigation bar (3 a 5 destinos) + FAB no celular; item ativo com indicador em pílula e ícone fill.
- Status com ícone + texto; detalhes secundários recolhidos.

## Acessibilidade
- Contraste de texto ≥ 4,5:1 (3:1 só a partir de 24 px); cor nunca é a única pista.
- Alvos de toque ≥ 44 × 44 px; foco visível com contorno de 2 px na cor highlight, afastado 2 px; ícone sozinho sempre com nome acessível.
- Responsivo a partir de 360 px, sem rolagem lateral.

## Ícones e texto
- Ícones só do conjunto Phosphor; nunca duotone; um único peso por peça (na interface, regular e fill só no item ativo).
- Português do Brasil; frases curtas e declarativas, com verbo de ação; foco no benefício, não na tecnologia.
- Títulos e botões em sentence case; botões começam com verbo; um único chamado para ação por peça ou tela.
- Sem emoji, sem jargão burocrático, sem exclamações em sequência, sem textos repetidos.

## Antes de entregar
Confira: tokens de cor, contraste, fontes, alvos de 44 px, foco visível e um único botão de ação por tela. Aponte qualquer desvio que não puder evitar.
```

### Prompt geral de mídias
_Peças sociais, anúncios, banners e imagens geradas por IA._

```text
Você cria peças de mídia (redes sociais, anúncios, banners e imagens) para a Gove (Governo Zero Clique): o governo que sabe, antecipa e age. Siga estritamente o Design System Gove abaixo.

## Paleta oficial (use só estas cores; nunca #000000)
- Branco #F4F4F4 (principal): Superfícies no tema claro; texto sobre fundos escuros.
- Noite #20133D (principal): Fundo do tema escuro; títulos no tema claro.
- Amarelo #FFC72C (principal): Uma ação principal por tela, destaques e foco. Texto sobre ele: Noite.
- Roxo #3D0099 (principal): Marca e botões principais; títulos e links no tema claro. Texto sobre ele: branco.
- Roxo Profundo #351F65 (secundária): Bordas e fundos secundários no tema escuro.
- Grafite #2F3539 (secundária): Texto de corpo no tema claro; superfícies no tema escuro.
- Cinza técnico #5B6770 (secundária): Texto secundário no tema claro (5,8:1 no branco).
- Ciano #5AC2CD (secundária): Informação e gráficos.
- Lavanda #A278DA (secundária): Links e realces no tema escuro; bordas em hover. Não usar como texto no claro.
- Azul confiança #16499F (secundária): Links no tema claro e gráficos.

## Pares de contraste aprovados (texto pequeno ≥ 4,5:1, calculados)
- Sobre Branco: Noite, Roxo, Roxo Profundo, Grafite, Azul confiança; só texto grande: Cinza técnico, Lavanda.
- Sobre Noite: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Amarelo: Noite, Roxo, Roxo Profundo, Grafite, Azul confiança; só texto grande: Cinza técnico.
- Sobre Roxo: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Roxo Profundo: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Grafite: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Cinza técnico: nenhuma em texto pequeno; só texto grande: Branco, Amarelo.
- Sobre Ciano: Noite, Roxo, Roxo Profundo, Grafite; só texto grande: Azul confiança.
- Sobre Lavanda: nenhuma em texto pequeno; só texto grande: Branco, Noite, Roxo, Roxo Profundo, Grafite.
- Sobre Azul confiança: Branco, Amarelo; só texto grande: Ciano.
- Lavanda #A278DA e Cinza técnico #5B6770 são cores de apoio: nunca em texto pequeno.
- Texto sobre Amarelo: Noite. Texto sobre Roxo: Branco. Gradientes só entre cores da paleta e nunca atrás de texto pequeno.

## Predominância de cor por pauta (a primeira é a dominante)
- Cidadania, direitos e políticas sociais: Lavanda 46%, Branco 38%, Grafite 16%
- Saúde, meio ambiente e sustentabilidade: Ciano 45%, Branco 28%, Roxo 14%, Noite 13%
- Educação, cultura, ciência e tecnologia: Lavanda 46%, Branco 38%, Ciano 16%
- Economia, trabalho e desenvolvimento: Azul confiança 53%, Amarelo 21%, Branco 14%, Grafite 12%
- Segurança, justiça e instituições: Noite 53%, Cinza técnico 21%, Branco 14%, Ciano 12%
- Gestão pública, infraestrutura e território: Branco 41%, Roxo Profundo 31%, Amarelo 14%, Azul confiança 13%

## Tipografia
- Montserrat (600–700) nos títulos e destaques; Inter (400–600) no corpo e na interface; reserva Helvetica, depois Arial.
- Títulos em Montserrat Bold; nada abaixo de 11 px; título até 60 caracteres, subtítulo até 90, CTA com verbo.

## Formatos e margens
- Feed 1080 × 1350 (4:5), quadrado 1080 × 1080 (1:1), story 1080 × 1920 (9:16), LinkedIn 1200 × 628 ou 1920 × 1005, follow-up 1440 × 1080 (4:3).
- Margem de segurança de 6% do menor lado (8% em story); nada importante fora dela.

## Logomarca (em todas as peças)
- Use só os arquivos oficiais: logotipo (gove-logo-cor.webp, gove-logo-branco-amarelo.webp, gove-logo-roxo.webp, gove-logo-branco.webp) e símbolo (gove-simbolo-cor.png, gove-simbolo-roxo.png, gove-simbolo-branco.png).
- Regra obrigatória: cada cor presente na logo precisa de contraste mínimo de 4,5:1 com o fundo. Cores da logo: roxo #3E0099, amarelo #FEC526, branco #FFFFFF.
- Versão do logotipo por fundo: Branco puro #FFFFFF → roxa; Branco #F4F4F4 → roxa; Amarelo #FFC72C → roxa; Ciano #5AC2CD → roxa; Roxo #3D0099 → branca com arco amarelo; Noite #20133D → branca com arco amarelo; Grafite #2F3539 → branca com arco amarelo; Azul confiança #16499F → branca com arco amarelo.
- Fundo que não passa com nenhuma versão (fotos, gradientes): coloque a logo sobre uma placa sólida que passe.
- Símbolo em espaços quadrados (ícones, avatares, perfil); logotipo em espaços horizontais (cabeçalhos, rodapés). Área de proteção igual à altura do arco do símbolo; mínimo de 24 px de altura em tela e 8 mm no impresso.
- Nunca distorcer, girar, recolorir fora das versões oficiais, aplicar sombra ou contorno, ou redesenhar.

## Imagens, ícones e texto
- Fotos são apoio: pessoas reais em contexto de serviço público; nunca texto direto sobre área clara da foto (use placa).
- Ícones só do conjunto Phosphor; nunca duotone; um único peso por peça (na interface, regular e fill só no item ativo).
- Português do Brasil; frases curtas e declarativas, com verbo de ação; foco no benefício, não na tecnologia.
- Títulos e botões em sentence case; botões começam com verbo; um único chamado para ação por peça ou tela.
- Sem emoji, sem jargão burocrático, sem exclamações em sequência, sem textos repetidos.

## Antes de entregar
Confira: paleta, contraste, versão da logo para o fundo, fontes, margem de segurança e um único CTA. Aponte qualquer desvio que não puder evitar.
```

### Prompt de apresentações
_Slides 16:9 no PowerPoint, Google Slides ou Keynote._

```text
Você cria apresentações (PowerPoint, Google Slides, Keynote) para a Gove (Governo Zero Clique): o governo que sabe, antecipa e age. Siga estritamente o Design System Gove abaixo.

## Formato
- 16:9, 1920 × 1080 px (33,867 × 19,05 cm); margem de 96 px em todos os lados.
- Uma ideia por slide; no máximo 6 linhas de texto.

## Tipografia
- Montserrat (600–700) nos títulos e destaques; Inter (400–600) no corpo e na interface; reserva Helvetica, depois Arial.
- Título 40–48 pt em Montserrat Bold; subtítulo 24–28 pt; corpo 18–24 pt em Inter; nunca abaixo de 14 pt no slide, nem de 11 pt em notas e rodapés.
- Incorpore as fontes ao salvar.

## Cores
- Capa e divisórias: fundo Noite #20133D ou Roxo #3D0099, títulos em Branco #F4F4F4, destaque em Amarelo #FFC72C.
- Conteúdo: fundo Branco #F4F4F4 (ou Branco puro #FFFFFF), títulos Noite #20133D, corpo Grafite #2F3539, links Roxo #3D0099.
- Gráficos sobre fundo claro: Roxo #3D0099, Azul confiança #16499F, Grafite #2F3539, Lavanda #A278DA, Cinza técnico #5B6770; sobre Noite: Ciano #5AC2CD, Amarelo #FFC72C, Lavanda #A278DA, Branco #F4F4F4. Rótulos diretos, sem 3D.
- Sobre Branco: Noite, Roxo, Roxo Profundo, Grafite, Azul confiança; só texto grande: Cinza técnico, Lavanda.
- Sobre Noite: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Amarelo: Noite, Roxo, Roxo Profundo, Grafite, Azul confiança; só texto grande: Cinza técnico.
- Sobre Roxo: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Roxo Profundo: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Grafite: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Cinza técnico: nenhuma em texto pequeno; só texto grande: Branco, Amarelo.
- Sobre Ciano: Noite, Roxo, Roxo Profundo, Grafite; só texto grande: Azul confiança.
- Sobre Lavanda: nenhuma em texto pequeno; só texto grande: Branco, Noite, Roxo, Roxo Profundo, Grafite.
- Sobre Azul confiança: Branco, Amarelo; só texto grande: Ciano.

## Logomarca
- Use só os arquivos oficiais: logotipo (gove-logo-cor.webp, gove-logo-branco-amarelo.webp, gove-logo-roxo.webp, gove-logo-branco.webp) e símbolo (gove-simbolo-cor.png, gove-simbolo-roxo.png, gove-simbolo-branco.png).
- Regra obrigatória: cada cor presente na logo precisa de contraste mínimo de 4,5:1 com o fundo. Cores da logo: roxo #3E0099, amarelo #FEC526, branco #FFFFFF.
- Versão do logotipo por fundo: Branco puro #FFFFFF → roxa; Branco #F4F4F4 → roxa; Amarelo #FFC72C → roxa; Ciano #5AC2CD → roxa; Roxo #3D0099 → branca com arco amarelo; Noite #20133D → branca com arco amarelo; Grafite #2F3539 → branca com arco amarelo; Azul confiança #16499F → branca com arco amarelo.
- Fundo que não passa com nenhuma versão (fotos, gradientes): coloque a logo sobre uma placa sólida que passe.
- Símbolo em espaços quadrados (ícones, avatares, perfil); logotipo em espaços horizontais (cabeçalhos, rodapés). Área de proteção igual à altura do arco do símbolo; mínimo de 24 px de altura em tela e 8 mm no impresso.
- Nunca distorcer, girar, recolorir fora das versões oficiais, aplicar sombra ou contorno, ou redesenhar.
- Logotipo pequeno no rodapé de todos os slides de conteúdo; número da página em Inter 12 pt Cinza técnico #5B6770.

## Imagens, ícones e texto
- Fotos com cantos de 16 px ou sangradas; nunca texto sobre foto sem placa.
- Ícones só do conjunto Phosphor; nunca duotone; um único peso por peça (na interface, regular e fill só no item ativo).
- Português do Brasil; frases curtas e declarativas, com verbo de ação; foco no benefício, não na tecnologia.
- Títulos e botões em sentence case; botões começam com verbo; um único chamado para ação por peça ou tela.
- Sem emoji, sem jargão burocrático, sem exclamações em sequência, sem textos repetidos.

## Antes de entregar
Confira: margens, tamanhos mínimos, paleta, contraste, versão da logo em cada fundo e uma ideia por slide. Aponte qualquer desvio que não puder evitar.
```

### Prompt de documentos e e-mails
_Documentos, PDFs e e-mails em HTML._

```text
Você cria documentos (Word, Google Docs, PDF) e e-mails em HTML para a Gove (Governo Zero Clique): o governo que sabe, antecipa e age. Siga estritamente o Design System Gove abaixo.

## Documentos
- Montserrat (600–700) nos títulos e destaques; Inter (400–600) no corpo e na interface; reserva Helvetica, depois Arial.
- Mesma escala das telas, em pt: H1 48, H2 32, H3 24, Corpo grande 18, Corpo 16, Legenda 14; nada abaixo de 11 pt.
- Títulos em Noite #20133D ou Roxo #3D0099; corpo em Grafite #2F3539; fundo branco.
- Logotipo no cabeçalho, na versão certa para o fundo.

## E-mails (HTML)
- 600 px de largura, uma coluna, fundo branco; Inter com reserva Arial/Helvetica.
- Corpo 16 px, títulos 24–28 px, nada abaixo de 12 px (rodapé legal no mínimo 12 px).
- Botão principal Amarelo #FFC72C com texto Noite #20133D, 44 px de altura mínima, texto em HTML (não imagem).
- Logotipo no topo pela regra de contraste, com texto alternativo "Gove".

## Paleta oficial (nunca #000000)
- Branco #F4F4F4 (principal): Superfícies no tema claro; texto sobre fundos escuros.
- Noite #20133D (principal): Fundo do tema escuro; títulos no tema claro.
- Amarelo #FFC72C (principal): Uma ação principal por tela, destaques e foco. Texto sobre ele: Noite.
- Roxo #3D0099 (principal): Marca e botões principais; títulos e links no tema claro. Texto sobre ele: branco.
- Roxo Profundo #351F65 (secundária): Bordas e fundos secundários no tema escuro.
- Grafite #2F3539 (secundária): Texto de corpo no tema claro; superfícies no tema escuro.
- Cinza técnico #5B6770 (secundária): Texto secundário no tema claro (5,8:1 no branco).
- Ciano #5AC2CD (secundária): Informação e gráficos.
- Lavanda #A278DA (secundária): Links e realces no tema escuro; bordas em hover. Não usar como texto no claro.
- Azul confiança #16499F (secundária): Links no tema claro e gráficos.

## Contraste (texto pequeno ≥ 4,5:1)
- Sobre Branco: Noite, Roxo, Roxo Profundo, Grafite, Azul confiança; só texto grande: Cinza técnico, Lavanda.
- Sobre Noite: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Amarelo: Noite, Roxo, Roxo Profundo, Grafite, Azul confiança; só texto grande: Cinza técnico.
- Sobre Roxo: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Roxo Profundo: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Grafite: Branco, Amarelo, Ciano; só texto grande: Lavanda.
- Sobre Cinza técnico: nenhuma em texto pequeno; só texto grande: Branco, Amarelo.
- Sobre Ciano: Noite, Roxo, Roxo Profundo, Grafite; só texto grande: Azul confiança.
- Sobre Lavanda: nenhuma em texto pequeno; só texto grande: Branco, Noite, Roxo, Roxo Profundo, Grafite.
- Sobre Azul confiança: Branco, Amarelo; só texto grande: Ciano.

## Logomarca
- Use só os arquivos oficiais: logotipo (gove-logo-cor.webp, gove-logo-branco-amarelo.webp, gove-logo-roxo.webp, gove-logo-branco.webp) e símbolo (gove-simbolo-cor.png, gove-simbolo-roxo.png, gove-simbolo-branco.png).
- Regra obrigatória: cada cor presente na logo precisa de contraste mínimo de 4,5:1 com o fundo. Cores da logo: roxo #3E0099, amarelo #FEC526, branco #FFFFFF.
- Versão do logotipo por fundo: Branco puro #FFFFFF → roxa; Branco #F4F4F4 → roxa; Amarelo #FFC72C → roxa; Ciano #5AC2CD → roxa; Roxo #3D0099 → branca com arco amarelo; Noite #20133D → branca com arco amarelo; Grafite #2F3539 → branca com arco amarelo; Azul confiança #16499F → branca com arco amarelo.
- Fundo que não passa com nenhuma versão (fotos, gradientes): coloque a logo sobre uma placa sólida que passe.
- Símbolo em espaços quadrados (ícones, avatares, perfil); logotipo em espaços horizontais (cabeçalhos, rodapés). Área de proteção igual à altura do arco do símbolo; mínimo de 24 px de altura em tela e 8 mm no impresso.
- Nunca distorcer, girar, recolorir fora das versões oficiais, aplicar sombra ou contorno, ou redesenhar.

## Texto
- Português do Brasil; frases curtas e declarativas, com verbo de ação; foco no benefício, não na tecnologia.
- Títulos e botões em sentence case; botões começam com verbo; um único chamado para ação por peça ou tela.
- Sem emoji, sem jargão burocrático, sem exclamações em sequência, sem textos repetidos.

## Antes de entregar
Confira: paleta, contraste, fontes, tamanhos mínimos, logo correta e um único chamado para ação. Aponte qualquer desvio que não puder evitar.
```

## Revisão de cores por pauta
Modelo de prompt (exemplo com a primeira pauta; troque pela pauta do assunto):

```text
Você é um revisor de identidade visual da Gove Digital. Revise o esquema de cores da peça que vou anexar (imagem, PDF, layout ou código) de acordo com a pauta abaixo, seguindo a Colorimetria em pauta do Design System Gove.

## Pauta: Cidadania, direitos e políticas sociais
Assuntos: Desigualdade, pobreza, assistência social, previdência, moradia, criança e adolescente, idoso, pessoa com deficiência, mulheres, racismo, LGBTQIA+, imigração.
Foco da comunicação: Garantia de direitos, inclusão, proteção social.

## Predominância de cores esperada (proporção aproximada da área)
- Lavanda #A278DA: 46%. Uso: Links e realces no tema escuro; bordas em hover. Não usar como texto no claro. Transmite: Criatividade, sensibilidade, imaginação e acolhimento. Na narrativa: Humaniza a interface: a marca não parece fria ou robótica.
- Branco #F4F4F4: 38%. Uso: Superfícies no tema claro; texto sobre fundos escuros. Transmite: Neutralidade, minimalismo e clareza — um branco acinzentado, sofisticado e moderno. Na narrativa: Não conta a história principal: cria o palco para as outras cores falarem alto.
- Grafite #2F3539: 16%. Uso: Texto de corpo no tema claro; superfícies no tema escuro. Transmite: Neutra, fria e densa: solidez, seriedade, maturidade e modernidade. Na narrativa: A base estrutural que deixa as cores vibrantes brilharem sem poluir.

Atributos da bússola ligados a estas cores: Incomum, Tranquila, Equilibrada, Confiável.

## Regras da marca
- Use apenas as cores oficiais: Branco #F4F4F4, Noite #20133D, Amarelo #FFC72C, Roxo #3D0099, Roxo Profundo #351F65, Grafite #2F3539, Cinza técnico #5B6770, Ciano #5AC2CD, Lavanda #A278DA, Azul confiança #16499F. Qualquer outra cor é desvio.
- Texto com contraste mínimo de 4,5:1 com o fundo (WCAG AA).
- Amarelo #FFC72C só para a ação principal e destaques pontuais; texto sobre Amarelo em Noite #20133D.
- Texto sobre Roxo #3D0099 em branco; Lavanda #A278DA não é usada como texto em fundo claro.

## Antes de revisar, considere
- Pessoa: Com qual público estamos conversando? Qual a idade dele? Quais as dores que o afetam?
- Situação: Qual assunto será tratado? Em que período será tratado? Qual a importância do assunto?
- Lugar: É uma conversa pública ou privada? Com qual eixo social se comunica?

## Responda em PT-BR com
1. Diagnóstico: a peça comunica a pauta? Por quê.
2. Proporções medidas: estimativa da área de cada cor presente, comparada à predominância esperada.
3. Desvios: cores fora da paleta, proporções distantes da pauta e falhas de contraste (com a razão calculada).
4. Sugestões: troca a troca, com o elemento, a cor atual e a cor oficial sugerida (nome e HEX).
```

## Diretrizes de design Gove

Versão 1.1 (out/2026) · documento-base do Gove Design System. Vale para tudo o que a Gove produz — por pessoas ou por inteligência artificial: interfaces, apresentações, peças de mídia, impressos, e-mails e páginas. Ao gerar qualquer material com IA, cole este documento (ou a seção "Instruções para IA", no fim) como contexto.

### 1. Essência

- A Gove é a infraestrutura digital do **Governo Zero Clique**: o governo que sabe, antecipa e age — para facilitar a vida de quem precisa e de quem serve.
- Personalidade: tecnológica e sofisticada, institucional e confiável, dinâmica sem ser ruidosa.
- Dois públicos ao mesmo tempo: o cidadão e o servidor público.

### 2. Voz e texto

- Português do Brasil. Frases curtas, declarativas, com verbo de ação: "sabe, antecipa, age".
- Foque no benefício, não na tecnologia: "o serviço chega até o cidadão", não "API de integração de dados".
- Títulos e botões em sentence case ("Agendar demonstração"). Botões começam com verbo.
- Sem jargão burocrático, sem emoji, sem exclamações em sequência.
- Corte o que repete: cada tela ou peça diz uma coisa principal; um único chamado para ação por peça.

### 3. Cores

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

### 4. Tipografia

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

### 5. Logomarca

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

### 6. Espaço, forma e elevação

- Grade de 8 px: 8, 16, 24, 32, 48, 64, 96.
- Raios: 4 (campos e tags), 8 (botões), 16 (cards e modais), circular (avatares e pílulas).
- Sombras suaves no tema claro; o brilho neon (glow lavanda nos botões principais, amarelo nos CTAs) fica só em botões e chamadas.
- Movimento: entrada com fade + subida de 20 px em 600 ms (ease-out exponencial), listas em cascata de 50–100 ms; hover de botão scale 1,02 com glow mais forte; cards sobem 4 px; estados entre 200 e 300 ms.

### 7. Iconografia

- Conjunto oficial: **Phosphor** (1.512 ícones). Use só esses ícones; sem emoji.
- Interfaces: apenas os pesos **regular** (padrão) e **fill**. O fill marca só o estado ativo ou selecionado (item de menu, aba, favorito), aplicado ícone a ícone, nunca como estilo geral.
- **Duotone: nunca.** Thin e light: nunca em apresentações nem em impressos.
- Outras peças: escolha o peso pelo suporte e tamanho, mas **um único peso por página**, slide ou peça.
- Tamanhos 16, 24 e 32 px. A cor segue o texto ao lado; em destaque, Amarelo (no escuro) ou Roxo (no claro).
- Ícone sozinho só quando o significado é óbvio — sempre com nome acessível e dica; em telas largas, ícone + nome.

### 8. Aplicação por meio

#### Interfaces (web e apps)

- Tema claro por padrão, com opção de escuro (Noturno).
- Navegação no padrão Material Design 3:
  - computador: navigation drawer que recolhe para navigation rail (ícone + rótulo), com a ação principal como FAB no topo;
  - celular: top app bar com o título do destino (e seta de voltar nas telas internas), navigation bar com 3 a 5 destinos (ícone + rótulo, indicador em pílula e ícone fill no ativo), FAB para a ação principal e tabs para alternar visões dentro de um destino;
  - tocar de novo no destino ativo volta ao topo.
- Um botão amarelo por tela; demais ações em contorno ou só ícone.
- Detalhes secundários sob demanda (painéis "Sobre", seções recolhíveis).
- Foco do teclado visível: contorno amarelo de 2 px com 2 px de afastamento.

#### Apresentações (PowerPoint, Google Slides, Keynote)

- Formato 16:9, 1920 × 1080 (33,867 × 19,05 cm).
- Margens: 96 px (5% da largura) em todos os lados; nada importante fora delas.
- Fontes: Montserrat nos títulos, Inter no corpo (incorpore as fontes ao salvar; reserva Arial).
- Tamanhos: título 40–48 pt; subtítulo 24–28 pt; corpo 18–24 pt; nunca abaixo de 14 pt em slide, nem de 11 pt em notas e rodapés.
- Uma ideia por slide; no máximo 6 linhas de texto.
- Capa e divisórias: fundo Noite ou Roxo, logotipo branco. Conteúdo: fundo Branco, títulos Noite, corpo Grafite.
- Logotipo pequeno no rodapé de todos os slides de conteúdo (versão pela regra de contraste); número da página em Inter 12 pt Cinza técnico.
- Gráficos: sobre Branco, séries em Roxo, Azul confiança, Grafite, Lavanda e Cinza técnico; sobre Noite, Ciano, Amarelo, Lavanda e Branco; rótulos diretos; sem 3D.
- Fotos com cantos de 16 px ou sangradas; nunca texto sobre foto sem placa.

#### Mídia social e anúncios

- Formatos: 1080 × 1350 (4:5 feed), 1080 × 1080 (1:1), 1080 × 1920 (9:16 story), 1200 × 628 / 1920 × 1005 (LinkedIn), 1440 × 1080 (4:3 follow-up).
- Margem de segurança: 6% do menor lado (8% em story).
- Título até 60 caracteres, subtítulo até 90, CTA com verbo.
- Logomarca em todas as peças, pela regra de contraste.

#### Follow-ups

- Atualização de produto: título curto, até 5 novidades em lista com ícones, versão/data, logo.
- Confirmação de evento: moldura circular para a foto da pessoa, nome, nome/descrição do evento, data e logo.
- Formatos 4:3 e 1:1.

#### Impressos

- Cores em CMYK; perfil a combinar com a gráfica (validar sempre uma prova).
- Sangria de 5 mm e área de segurança de 5 mm para dentro do corte.
- Fontes incorporadas; reserva Helvetica.
- QR code sobre branco sólido, correção de erro H, lado mínimo de 20 mm, zona livre de 4 módulos.
- Imagens em 300 dpi no tamanho final.

#### E-mails (HTML)

- Largura de 600 px, uma coluna, fundo Branco.
- Fontes: Inter com reserva Arial/Helvetica (e-mail não garante fontes web).
- Corpo 16 px, títulos 24–28 px, nada abaixo de 12 px (rodapé legal no mínimo 12 px).
- Botão principal amarelo com texto Noite, 44 px de altura mínima, texto do botão em HTML (não imagem).
- Logotipo no topo pela regra de contraste, com texto alternativo "Gove".

#### Landing pages

- Mesmos tokens da interface; hero com um título (Display), uma frase e um botão.
- Seções com espaçamento de 96 px no computador e 48 px no celular.
- Tudo responsivo a partir de 360 px de largura, sem rolagem lateral.

### 9. Acessibilidade

- Contraste 4,5:1 em texto e na logomarca.
- Alvos de 44 × 44 px; foco visível; ordem de leitura lógica.
- Texto alternativo em toda imagem informativa; decorativas marcadas como decorativas.
- Cor nunca é a única pista (some ícone ou texto).
- Respeitar "reduzir movimento": desligar parallax e deslizamentos.

### 10. Checklist antes de publicar

- [ ] Só cores da paleta; nenhum preto puro.
- [ ] Texto com contraste ≥ 4,5:1.
- [ ] Logomarca oficial, na versão certa para o fundo (≥ 4,5:1), sem distorção, com área de proteção.
- [ ] Montserrat nos títulos, Inter no corpo.
- [ ] Nenhum texto abaixo de 11 pt/px; alvos ≥ 44 px.
- [ ] Um único chamado para ação.
- [ ] Sem textos repetidos ou desnecessários.

### Instruções para IA

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

## Tipografia Gove

Guia condensado de tipografia do Gove Design System. Use como base para qualquer peça — feita por pessoas ou por IA.

### Famílias

| Uso | Fonte | Pesos | Reserva |
|---|---|---|---|
| Títulos, números e destaques | Montserrat | SemiBold 600, Bold 700 | Helvetica, Arial |
| Corpo, interface, legendas | Inter | Regular 400, Medium 500, SemiBold 600 | Helvetica, Arial |

- Ambas no Google Fonts. Em impressos, incorpore as fontes; sem elas, Helvetica.
- Nunca serifadas, scripts ou condensadas. Sem itálico em títulos.

### Escala (Major Third, 1.250)

| Estilo | Tela (px) | Documento (pt) | Altura de linha | Peso |
|---|---|---|---|---|
| Display | 64 | 64 | 1,1 | Montserrat 700 |
| H1 | 48 | 48 | 1,2 | Montserrat 700 |
| H2 | 32 | 32 | 1,3 | Montserrat 600 |
| H3 | 24 | 24 | 1,4 | Montserrat 600 |
| Corpo grande | 18 | 18 | 1,6 | Inter 400 |
| Corpo | 16–17 | 11–12 | 1,5 | Inter 400 |
| Legenda | 14 | 9–10 | 1,4 | Inter 500 |

- Um Display por página ou peça, no hero.
- Títulos em sentence case; tracking −2% no Display e −1,5% no H1.

### Tamanhos mínimos (Human Interface Guidelines)

- Nenhum texto abaixo de 11 pt/px.
- Corpo em telas: 17 px recomendado (16 px aceitável em web densa).
- Apresentações: título 40–48 pt, corpo 18–24 pt, nunca abaixo de 14 pt.
- E-mails: corpo 16 px, rodapé no mínimo 12 px.
- Impressos: corpo mínimo 9 pt em peças pequenas, 11 pt nas demais.

### Cor do texto

- Tema claro: títulos Noite #20133D, corpo Grafite #2F3539, secundário Cinza técnico #5B6770.
- Tema escuro (Noturno): títulos e corpo Branco #F4F4F4 — a hierarquia vem de tamanho e peso; links Ciano #5AC2CD; Cinza técnico só em desabilitado e placeholder.
- Sobre Amarelo, sempre Noite; sobre Roxo, sempre Branco.
- Contraste mínimo 4,5:1 (3:1 só para títulos a partir de 24 pt/px).

### Instruções para IA

```text
Tipografia Gove: Montserrat (600–700) para títulos, Inter (400–600) para corpo; reserva Helvetica/Arial.
Escala: 64 / 48 / 32 / 24 / 18 / 16 px (alturas de linha 1,1 / 1,2 / 1,3 / 1,4 / 1,6 / 1,5; pesos 700 / 700 / 600 / 600 / 400 / 400). Um Display por peça.
Nada abaixo de 11 pt/px; corpo de tela 17 px; slides: título 40–48 pt, corpo 18–24 pt.
Texto com contraste ≥ 4,5:1, cores somente #20133D, #2F3539, #5B6770, #FFFFFF, #F4F4F4 (e #3D0099 para links no claro).
```

## Componentes Gove

Guia condensado dos componentes base do Gove Design System (React + Tailwind). Use como especificação para telas, protótipos e peças geradas por IA.

### Regras gerais

- Grade de 8 px; alvos de toque e clique com no mínimo 44 × 44 px.
- Raios: 4 px (campos e tags), 8 px (botões), 16 px (cards e modais), circular (avatares e pílulas).
- Foco visível em todo elemento interativo: contorno de 2 px na cor de destaque, afastado 2 px.
- Movimento: entrada com fade + subida de 20 px em 600 ms (cubic-bezier 0.16, 1, 0.3, 1); estados em 200–300 ms; respeitar "reduzir movimento".

### Botão

| Variante | Uso | Cores | Tamanhos |
|---|---|---|---|
| Ação | A ação mais importante da tela (uma só) | Fundo #FFC72C, texto #20133D, brilho amarelo | 48 px (md) ou 56 px (lg) de altura |
| Primário | Ações principais | Fundo #3D0099, texto branco | 48 / 56 px |
| Secundário | Alternativas | Contorno sutil, texto forte, sem preenchimento | 48 / 56 px |
| Só ícone | Ações secundárias da barra de ferramentas | Ícone 20 px, área 44 × 44, `aria-label` e dica | 44 px |

- Texto do botão começa com verbo ("Agendar demonstração").
- Hover: escala 1.02 e brilho mais intenso; pressionado: 0.98; desabilitado: 40% de opacidade.

```tsx
<Button variant="action" size="lg">Agendar demonstração</Button>
<Button variant="primary">Conhecer a plataforma</Button>
<Button variant="secondary">Falar com um especialista</Button>
```

### Campo de texto

- Rótulo sempre visível acima (14 px, semibold); dica ou erro abaixo.
- Altura 48 px, raio 8 px, borda sutil; foco com borda Roxo e brilho roxo.
- Placeholder em Cinza técnico — nunca no lugar do rótulo.

```tsx
<Input label="E-mail profissional" type="email" placeholder="nome@prefeitura.gov.br" />
```

### Card

- Superfície (Branco no claro, Grafite no escuro), borda sutil, raio 16 px, padding 24 px.
- Hover em cards clicáveis: sobe 4 px, borda Lavanda e sombra média.
- Um ícone em placa de 48 px, título H3 e no máximo duas linhas de texto.

### Navegação

Padrão Material Design 3. Item ativo: indicador em pílula (cor `secondary`) e ícone Phosphor no peso **fill**; os demais no peso regular.

- Computador: navigation drawer (264 px) com seções e títulos de grupo; recolhe para navigation rail (88 px) com ícone + rótulo em cada destino. A ação principal fica no FAB do topo (amarelo, "Nova solicitação").
- Celular: top app bar (64 px) com o título do destino, seta de voltar nas telas internas e ações à direita (busca, tema); navigation bar (80 px) com 3 a 5 destinos, ícone 24 px + rótulo; FAB 16 px acima dela para a ação principal.
- Visões dentro de um destino: tabs primárias (indicador de 3 px sob o rótulo), fixas abaixo da top app bar.
- Tocar de novo no destino ativo volta ao topo.

### Listas, tabelas e status

- Status com ícone + texto (ok, atenção, erro); cor nunca é a única pista.
- Tabelas largas rolam dentro de uma caixa; cabeçalhos podem virar ícones com texto para leitor de tela.
- Detalhes secundários recolhidos (progressive disclosure).

### Instruções para IA

```text
Componentes Gove: botões de 48–56 px de altura e raio 8 px — um único botão de ação amarelo (#FFC72C, texto #20133D) por tela, primário roxo (#3D0099, texto branco), secundário em contorno; ícones Phosphor (regular; fill só no item ativo) em áreas de 44 × 44 px com rótulo acessível.
Campos com rótulo visível acima, 48 px de altura, foco roxo. Cards com raio 16 px, padding 24 px, superfície #F4F4F4 (claro) ou #2F3539 (escuro).
Grade de 8 px, foco visível, status com ícone + texto, detalhes secundários recolhidos.
Navegação Material Design 3: drawer/rail no computador; top app bar + navigation bar (3–5 destinos) + FAB no celular; indicador em pílula e ícone fill no ativo.
```
