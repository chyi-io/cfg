import { jsonResponse } from "../../lib/http.ts";
import { define } from "../../utils.ts";

const DOC_DIR = new URL("../../docs/", import.meta.url);

const DOC_PAGES = [
  { slug: "getting-started", title: "Getting Started" },
  { slug: "architecture", title: "Architecture" },
  { slug: "add-vendor", title: "Adding a Vendor" },
  { slug: "add-device", title: "Adding a Device" },
  { slug: "file-formats", title: "File Formats" },
  { slug: "ui-components", title: "UI Components" },
  { slug: "testing", title: "Testing" },
];

export const handler = define.handlers({
  GET(_ctx) {
    return jsonResponse({ pages: DOC_PAGES });
  },
});

/** Read a markdown file from the docs directory. */
export const readDocFile = async (
  slug: string,
): Promise<{ title: string; markdown: string } | null> => {
  const page = DOC_PAGES.find((p) => p.slug === slug);
  if (!page) return null;

  try {
    const filePath = new URL(`${slug}.md`, DOC_DIR);
    const markdown = await Deno.readTextFile(filePath);
    return { title: page.title, markdown };
  } catch {
    return null;
  }
};

export { DOC_PAGES };
