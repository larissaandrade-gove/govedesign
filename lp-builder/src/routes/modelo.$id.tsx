import { createFileRoute } from "@tanstack/react-router";
import { Editor } from "@/components/gove/Editor";

export const Route = createFileRoute("/modelo/$id")({
  head: () => ({
    meta: [
      { title: "Modelo — GOVE Landing Pages" },
      {
        name: "description",
        content:
          "Edite e publique um modelo de landing page para o time usar como ponto de partida.",
      },
      { property: "og:title", content: "Modelo — GOVE Landing Pages" },
      {
        property: "og:description",
        content:
          "Edite e publique um modelo de landing page para o time usar como ponto de partida.",
      },
    ],
  }),
  component: TemplateEditorPage,
});

function TemplateEditorPage() {
  const { id } = Route.useParams();
  return <Editor kind="template" id={id} />;
}
