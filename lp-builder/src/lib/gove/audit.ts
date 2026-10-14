import { checkContrast } from "./contrast";
import { isLorem } from "./lorem";
import { backgroundBehind } from "./tree";
import type { PageContent } from "./types";

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
            if (leaf.size < MIN_FONT_SIZE) {
              issues.push({
                id: `size-${key}`,
                nodeId: leaf.id,
                severity: "error",
                rule: "Tamanho de texto",
                message: `Texto com ${leaf.size}px — o mínimo é ${MIN_FONT_SIZE}px.`,
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
