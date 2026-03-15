import { marked } from "marked";
import { jsonResponse } from "../../../lib/http.ts";
import { define } from "../../../utils.ts";
import { readDocFile } from "../docs.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const { slug } = ctx.params;
    const doc = await readDocFile(slug);

    if (!doc) {
      return jsonResponse({ error: "Document not found" }, 404);
    }

    const html = await marked.parse(doc.markdown, { gfm: true });
    return jsonResponse({ slug, title: doc.title, html });
  },
});
