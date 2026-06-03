import { createFileRoute } from "@tanstack/react-router";
import { MapleApp } from "@/components/MapleApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maple — Settlement coach for students in Canada" },
      { name: "description", content: "An AI planner, tracker and reminder for international students starting life in Canada." },
      { property: "og:title", content: "Maple — Settlement coach for students in Canada" },
      { property: "og:description", content: "An AI planner, tracker and reminder for international students starting life in Canada." },
    ],
  }),
  component: Index,
});

function Index() {
  return <MapleApp />;
}
