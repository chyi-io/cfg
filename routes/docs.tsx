import DocsIsland from "../islands/DocsIsland.tsx";
import { DOC_PAGES } from "./api/docs.ts";

export default function DocsPage() {
  return <DocsIsland pages={DOC_PAGES} />;
}
