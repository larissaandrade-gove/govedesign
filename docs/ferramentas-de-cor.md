# Ferramentas de cor (Gove Design System)

Etapa **4 · Ferramentas** da Bússola de cores (seção Cores): paletas e tons,
mistura, gradientes, extração de paleta de imagem e simulação de daltonismo.
Toda cor gerada mostra a **cor oficial Gove mais próxima** — nas peças, use só
as 10 cores da marca.

## Núcleo (`design-system/src/lib/color/`)

Funções puras, sem UI, testadas em `test/color-core.test.js`.

```ts
import { harmony, shades, themeFrom, mix, steps, toCss, meshSvg,
  extractPalette, simulate, confusable, nearestBrand, toCssVars, toTailwind } from '@/lib/color';

harmony('#3D0099', 'triade');        // ['#3d0099', '#993d00', '#00993d']
shades('#3D0099');                   // [{ step: 50, hex: '#f3f3ff' }, … { step: 950, hex: '#1b0b45' }]
themeFrom('#3D0099').light.primary;  // primária com contraste ≥ 4,5:1 sobre branco
mix('#3D0099', '#FFC72C', 0.5, 'oklch');
steps('#3D0099', '#FFC72C', 7, 'hsl');
toCss({ kind: 'linear', angle: 135, space: 'oklch', stops: [{ hex: '#3d0099', at: 0 }, { hex: '#ffc72c', at: 100 }] });
extractPalette(imageData.data, 6);   // cores dominantes, da mais frequente à menos
simulate('#d62728', 'deuteranopia');
nearestBrand('#ffc000');             // { name: 'Amarelo', deltaE: …, exact: false }
toTailwind({ name: 'Roxo', shades: shades('#3D0099') });
```

| Módulo | Faz |
| --- | --- |
| `convert` | HEX (curto, com alpha) ↔ RGB, HSL, HSV, CMYK (sem ICC), Lab, OKLCH; ΔE 2000; cor oficial mais próxima |
| `palettes` | harmonias, escala 50–950, tema claro/escuro, contraste WCAG 2.1 |
| `mix` | mistura e passos em RGB, HSL (matiz pelo caminho curto) e OKLCH |
| `gradient` | CSS linear/radial/cônico, mesh (CSS com cor de fallback + SVG), texto com gradiente |
| `extract` | paleta a partir de pixels RGBA (corte por caixas, até 10 mil amostras) |
| `vision` | protanopia, deuteranopia, tritanopia, acromatopsia; pares que se confundem |
| `export` | variáveis CSS, JSON, trecho do Tailwind, SVG de amostras |

## Decisões

- **culori** (MIT) para conversões, ΔE, interpolação e daltonismo (modelo de
  Machado et al., 2009). O `@fyipedia/colorfyi` foi avaliado, mas a versão
  publicada no npm (0.1.3) vem sem os arquivos compilados.
- **Harmonias no círculo HSL** (o círculo cromático clássico, o mesmo da
  Bússola). Girar o matiz em OKLCH com a mesma luminosidade gerava complementos
  turvos (o complementar do Roxo virava verde-oliva escuro).
- **Escala e monocromática em OKLCH**: luminosidade percebida uniforme e matiz
  estável; o passo mais próximo da base recebe a própria cor.
- **Gradientes em HSL/OKLCH** viram paradas intermediárias em sRGB: o resultado
  é o mesmo em qualquer navegador, sem depender de `in oklch` no CSS.
- **Extração no navegador**: a imagem é reduzida a 128 px num Canvas e não sai
  do computador; limite de 10 MB.
- Recurso isolado pela flag `FEATURES.colorTools` (`src/data/features.ts`).

## Limitações

- Sem contraste **APCA** (fora do escopo desta entrega; a biblioteca de
  referência não tem licença aberta).
- CMYK aqui é só referência (sem perfil ICC). Para impressos, o Print Studio
  converte com o perfil da gráfica.
- O mesh é aproximado (manchas radiais desfocadas), não um mesh de malha real.
- A simulação de daltonismo é de dicromacia completa; casos parciais variam.
