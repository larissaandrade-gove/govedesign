# Componentes Gove

Guia condensado dos componentes base do Gove Design System (React + Tailwind). Use como especificação para telas, protótipos e peças geradas por IA.

## Regras gerais

- Grade de 8 px; alvos de toque e clique com no mínimo 44 × 44 px.
- Raios: 4 px (campos e tags), 8 px (botões), 16 px (cards e modais), circular (avatares e pílulas).
- Foco visível em todo elemento interativo: contorno de 2 px na cor de destaque, afastado 2 px.
- Movimento: entrada com fade + subida de 20 px em 600 ms (cubic-bezier 0.16, 1, 0.3, 1); estados em 200–300 ms; respeitar "reduzir movimento".

## Botão

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

## Campo de texto

- Rótulo sempre visível acima (14 px, semibold); dica ou erro abaixo.
- Altura 48 px, raio 8 px, borda sutil; foco com borda Roxo Gove e brilho roxo.
- Placeholder em Cinza Azulado — nunca no lugar do rótulo.

```tsx
<Input label="E-mail profissional" type="email" placeholder="nome@prefeitura.gov.br" />
```

## Card

- Superfície (Gelo no claro, Grafite no escuro), borda sutil, raio 16 px, padding 24 px.
- Hover em cards clicáveis: sobe 4 px, borda Lilás e sombra média.
- Um ícone em placa de 48 px, título H3 e no máximo duas linhas de texto.

## Navegação

- Computador: barra lateral recolhível (248 px aberta, 76 px só com ícones e dica).
- Celular: barra de abas inferior com até 5 itens, ícone 24 px + nome curto.
- Abas de seção: controle segmentado; abaixo de 900 px, só ícones.

## Listas, tabelas e status

- Status com ícone + texto (ok, atenção, erro); cor nunca é a única pista.
- Tabelas largas rolam dentro de uma caixa; cabeçalhos podem virar ícones com texto para leitor de tela.
- Detalhes secundários recolhidos (progressive disclosure).

## Instruções para IA

```text
Componentes Gove: botões de 48–56 px de altura e raio 8 px — um único botão de ação amarelo (#FFC72C, texto #20133D) por tela, primário roxo (#3D0099, texto branco), secundário em contorno; ícones lineares de 2 px em áreas de 44 × 44 px com rótulo acessível.
Campos com rótulo visível acima, 48 px de altura, foco roxo. Cards com raio 16 px, padding 24 px, superfície #F4F4F4 (claro) ou #2F3539 (escuro).
Grade de 8 px, foco visível, status com ícone + texto, detalhes secundários recolhidos.
```
