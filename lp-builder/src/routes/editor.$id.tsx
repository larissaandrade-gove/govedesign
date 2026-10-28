import { createFileRoute } from "@tanstack/react-router";
import { Editor } from "@/components/gove/Editor";

export const Route = createFileRoute("/editor/$id")({
  head: () => ({
    meta: [
      { title: "Editor — GOVE LP Builder" },
      {
        name: "description",
        content: "Monte a landing page com seções, blocos e presets do design system GOVE.",
      },
      { property: "og:title", content: "Editor — GOVE LP Builder" },
      {
        property: "og:description",
        content: "Monte a landing page com seções, blocos e presets do design system GOVE.",
      },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  const { id } = Route.useParams();
  return <Editor kind="page" id={id} />;
}
