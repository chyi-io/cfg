import DocsIsland from "../../islands/DocsIsland.tsx";
import { DOC_PAGES } from "../api/docs.ts";
import { define } from "../../utils.ts";

export default define.page(function DocsSlugPage(ctx) {
  const { slug } = ctx.params;
  return <DocsIsland initialSlug={slug} pages={DOC_PAGES} />;
});
