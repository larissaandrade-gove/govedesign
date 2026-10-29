import { checkContrast } from "./contrast";
import { isLorem } from "./lorem";
import { backgroundBehind } from "./tree";
import type { PageContent } from "./types";
import { resolveButtonLink } from "./anchors";
import { highlightColors } from "./blockStyle";
import { parseRich } from "./richText";
import { colorOf, colorParts, isNewBlock, textSize } from "./blockColors";

export type AuditSeverity = "error" | "warning";

export interface AuditIssue {
  id: string;
  severity: AuditSeverity;
  rule: string;
  message: string;
  nodeId?: string;
}

const MIN_FONT_SIZE = 16;

/** Checagem de acessibilidade executada antes da exportação da LP. */
export function auditPage(page: PageContent): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let hasRdForm = false;
  let index = 0;

  for (const section of page.sections) {
    for (const row of section.children) {
      for (const col of row.columns) {
        for (const leaf of col.children) {
          index += 1;
          const key = `${leaf.id}-${index}`;
          const bg = backgroundBehind(page, leaf.id);

          if (leaf.type === "rdform") hasRdForm = true;

          // Blocos novos: tamanho mínimo e contraste de cada cor de texto (sobre o fundo próprio da parte).
          if (isNewBlock(leaf)) {
            const size = textSize(leaf);
            if (size !== null && size < MIN_FONT_SIZE)
              issues.push({
                id: `size-${key}`,
                nodeId: leaf.id,
                severity: "error",
                rule: "Tamanho de texto",
                message: `Texto com ${size}px — o mínimo é ${MIN_FONT_SIZE}px.`,
              });
            for (const part of colorParts(leaf)) {
              if (part.role !== "text") continue;
              const on = part.on ? colorOf(leaf, part.on) : bg;
              const result = checkContrast(colorOf(leaf, part.key), on, size ?? MIN_FONT_SIZE, !!part.bold);
              if (result.ratio !== null && result.ratio < 4.5)
                issues.push({
                  id: `contrast-${key}-${part.key}`,
                  nodeId: leaf.id,
                  severity: "error",
                  rule: "Contraste",
                  message: `Contraste de ${result.ratio.toFixed(2)}:1${part.part} — o mínimo exigido é 4.5:1.`,
                });
            }
            if (leaf.type === "person" && leaf.photo && !leaf.name.trim())
              issues.push({
                id: `alt-${key}`,
                nodeId: leaf.id,
                severity: "error",
                rule: "Texto alternativo",
                message: "Card de pessoa com foto e sem nome (o nome é o texto alternativo da foto).",
              });
            // Área de clique: links do menu/rodapé têm 44px (12px + 20px + 12px); o botão do cabeçalho é o M.
            if (leaf.type === "navbar" && leaf.ctaLabel.trim()) {
              const height = Math.round(14 * 2 + leaf.size * 1.2);
              if (height < 44)
                issues.push({
                  id: `target-${key}`,
                  nodeId: leaf.id,
                  severity: "warning",
                  rule: "Área de clique",
                  message: `Botão do cabeçalho com cerca de ${height}px de altura — o recomendado é 44px ou mais.`,
                });
            }
          }

          if (leaf.type === "image") {
            if (leaf.src && !leaf.alt.trim()) {
              issues.push({
                id: `alt-${key}`,
                nodeId: leaf.id,
                severity: "error",
                rule: "Texto alternativo",
                message: "Imagem sem texto alternativo (alt).",
              });
            }
            continue;
          }

          if (leaf.type === "text" || leaf.type === "button" || leaf.type === "card") {
            // Tamanho responsivo: vale o menor (celular).
            const smallest = leaf.type === "text" && leaf.sizeMin ? Math.min(leaf.size, leaf.sizeMin) : leaf.size;
            if (smallest < MIN_FONT_SIZE) {
              issues.push({
                id: `size-${key}`,
                nodeId: leaf.id,
                severity: "error",
                rule: "Tamanho de texto",
                message: `Texto com ${smallest}px${smallest !== leaf.size ? " no celular" : ""} — o mínimo é ${MIN_FONT_SIZE}px.`,
              });
            }
            const fgBg =
              leaf.type === "button" && (leaf.variant === "filled" || leaf.variant === "elevated")
                ? leaf.bgColor
                : leaf.type === "card"
                  ? leaf.bgColor
                  : bg;
            const result = checkContrast(leaf.color, fgBg, leaf.size, "weight" in leaf && leaf.weight === "bold");
            if (result.ratio !== null && result.ratio < 4.5) {
              issues.push({
                id: `contrast-${key}`,
                nodeId: leaf.id,
                severity: "error",
                rule: "Contraste",
                message: `Contraste de ${result.ratio.toFixed(2)}:1 — o mínimo exigido é 4.5:1.`,
              });
            }
          }

          // Destaque ==texto== (degradê): as duas cores precisam de contraste.
          if (leaf.type === "text" && parseRich(leaf.content).some((line) => line.some((s) => s.highlight))) {
            const { from, to } = highlightColors(leaf);
            const worst = Math.min(
              ...[from, to].map((c) => checkContrast(c, bg, leaf.size, leaf.weight === "bold").ratio ?? 21),
            );
            if (worst < 4.5)
              issues.push({
                id: `contrast-hl-${key}`,
                nodeId: leaf.id,
                severity: "error",
                rule: "Contraste",
                message: `Destaque em degradê com contraste de ${worst.toFixed(2)}:1 — o mínimo exigido é 4.5:1.`,
              });
          }

          // Área de clique: botão P (10×20) fica abaixo de 44px de altura.
          if (leaf.type === "button" && leaf.variant !== "text") {
            const pad = leaf.btnSize === "sm" ? 10 : leaf.btnSize === "md" ? 14 : 16;
            const height = Math.round(pad * 2 + leaf.size * 1.2);
            if (height < 44)
              issues.push({
                id: `target-${key}`,
                nodeId: leaf.id,
                severity: "warning",
                rule: "Área de clique",
                message: `Botão "${leaf.label}" com cerca de ${height}px de altura — o recomendado é 44px ou mais (use o tamanho M ou G).`,
              });
          }

          if (leaf.type === "text" && isLorem(leaf.content)) {
            issues.push({
              id: `lorem-${key}`,
              nodeId: leaf.id,
              severity: "error",
              rule: "Conteúdo",
              message: "Bloco de texto ainda com lorem ipsum não editado.",
            });
          }

          if (leaf.type === "card" && (isLorem(leaf.title) || isLorem(leaf.description))) {
            issues.push({
              id: `lorem-card-${key}`,
              nodeId: leaf.id,
              severity: "error",
              rule: "Conteúdo",
              message: "Card ainda com texto lorem ipsum não editado.",
            });
          }

          if (leaf.type === "button") {
            const link = resolveButtonLink(page, leaf);
            if (link.missing) {
              issues.push({
                id: `anchor-${key}`,
                nodeId: leaf.id,
                severity: "warning",
                rule: "Link do botão",
                message: `Botão "${leaf.label}" apontava para uma seção excluída — agora leva para: ${link.label}.`,
              });
            }
          }

          if (leaf.type === "rdform" && !leaf.snippet.trim()) {
            issues.push({
              id: `rd-empty-${key}`,
              nodeId: leaf.id,
              severity: "error",
              rule: "Formulário RD Station",
              message: "Bloco de formulário RD Station sem snippet colado.",
            });
          }

          if (leaf.type === "video" && !leaf.title.trim()) {
            issues.push({
              id: `video-title-${key}`,
              nodeId: leaf.id,
              severity: "error",
              rule: "Vídeo",
              message: "Vídeo sem título acessível (title do iframe).",
            });
          }

          if (leaf.type === "countdown") {
            const numbers = checkContrast(leaf.color, leaf.bgColor, leaf.size, true);
            const labels = checkContrast(leaf.accentColor, leaf.bgColor, 16, true);
            const worst = Math.min(numbers.ratio ?? 21, labels.ratio ?? 21);
            if (worst < 4.5) {
              issues.push({
                id: `countdown-contrast-${key}`,
                nodeId: leaf.id,
                severity: "error",
                rule: "Contraste",
                message: `Contagem regressiva com contraste de ${worst.toFixed(2)}:1 — o mínimo é 4.5:1.`,
              });
            }
          }
        }
      }
    }
  }

  if (!hasRdForm) {
    issues.push({
      id: "rd-missing",
      severity: "error",
      rule: "Formulário RD Station",
      message: "A landing page não possui um bloco de formulário RD Station.",
    });
  }

  return issues;
}
