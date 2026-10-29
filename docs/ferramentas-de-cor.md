# Ferramentas de cor (Gove Design System)

Etapa **4 · Ferramentas** da Bússola de cores (seção Cores): paletas e tons,
mistura, gradientes, extração de paleta de imagem e simulação de daltonismo.
As ferramentas são **travadas na paleta**: só dá para escolher as 10 cores
institucionais e o Branco puro (#FFFFFF) e o Preto puro (#000000), que servem
para peças com mais contraste (`TOOL_COLORS`, em `lib/color/allowed.ts`). Não
há campo de HEX livre. Transições de mistura e de gradiente aparecem como
"Fora da paleta · ≈ cor oficial".

## Núcleo (`design-system/src/lib/color/`)

Funções puras, sem UI, testadas em `test/color-core.test.js`.

```ts
import { TOOL_COLORS, brandHarmony, brandCombos, contrastPairs, brandTheme, mix, steps, toCss,
  meshSvg, extractPalette, simulate, visionAttention, nearestBrand, toCssVars, toTailwind } from '@/lib/color';

brandHarmony('#3D0099', 'complementar'); // ['#3d0099', '#ffc72c'] (Roxo → Amarelo)
brandCombos('#3D0099');                  // mixes das pautas e pares dos atributos da bússola
contrastPairs('#3D0099');                // base contra as outras 11 cores, com razão e nível WCAG
brandTheme('#3D0099').light.primary;     // tema claro/escuro só com cores da paleta
visionAttention(TOOL_COLORS.map((c) => c.hex), 'deuteranopia'); // pontos de atenção (×)
mix('#3D0099', '#FFC72C', 0.5, 'oklch');
steps('#3D0099', '#FFC72C', 7, 'hsl');
toCss({ kind: 'linear', angle: 135, space: 'oklch', stops: [{ hex: '#3d0099', at: 0 }, { hex: '#ffc72c', at: 100 }] });
extractPalette(imageData.data, 6);   // cores dominantes, da mais frequente à menos
simulate('#d62728', 'deuteranopia');
nearestBrand('#ffc000');             // { name: 'Amarelo', deltaE: …, exact: false }
toTailwind({ name: 'Roxo', colors: brandHarmony('#3D0099', 'analoga') });
```

| Módulo | Faz |
| --- | --- |
| `convert` | HEX (curto, com alpha) ↔ RGB, HSL, HSV, CMYK (sem ICC), Lab, OKLCH; ΔE 2000; cor permitida mais próxima (12 cores) |
| `allowed` | as 12 cores permitidas nas ferramentas (10 institucionais + branco e preto puros) |
| `palettes` | harmonias resolvidas na paleta, combinações da marca, pares de contraste, tema claro/escuro, contraste WCAG 2.1 |
| `mix` | mistura e passos em RGB, HSL (matiz pelo caminho curto) e OKLCH |
| `gradient` | CSS linear/radial/cônico, mesh (CSS com cor de fallback + SVG), texto com gradiente |
| `extract` | paleta a partir de pixels RGBA (corte por caixas, até 10 mil amostras) |
| `vision` | protanopia, deuteranopia, tritanopia, acromatopsia; pontos de atenção (ΔE OKLab < 11 com outra cor, ou par que perde 4,5:1) |
| `export` | variáveis CSS, JSON, trecho do Tailwind, SVG de amostras |

## Decisões

- **culori** (MIT) para conversões, ΔE, interpolação e daltonismo (modelo de
  Machado et al., 2009). O `@fyipedia/colorfyi` foi avaliado, mas a versão
  publicada no npm (0.1.3) vem sem os arquivos compilados.
- **Harmonias no círculo HSL** (o círculo cromático clássico, o mesmo da
  Bússola). Girar o matiz em OKLCH com a mesma luminosidade gerava complementos
  turvos (o complementar do Roxo virava verde-oliva escuro).
- **Harmonias na paleta**: cada posição do círculo vira a cor permitida de
  matiz mais próximo, sem repetir; bases neutras partem do Roxo. Monocromática
  usa as cores da paleta a até 35° da base (ou branco e preto puros).
- **Daltonismo**: o × marca só o que a deficiência tira — pares que já eram
  variações tonais na visão típica (Branco/Branco puro; Roxo Profundo com Noite
  e com Roxo) não recebem o ×.
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
