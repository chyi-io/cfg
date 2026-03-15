import type { ParseResult } from "../../lib/types.ts";

/**
 * Parse a gzip-compressed Teltonika `.cfg` file into a flat key-value map.
 * Format: semicolon-separated `key:value` pairs, gzip-compressed.
 *
 * @param buffer - Raw gzip-compressed file bytes.
 * @returns Parsed config or error.
 *
 * @example
 * ```ts
 * const result = await parseCfgFile(fileBytes);
 * if (result.success) console.log(result.config);
 * ```
 */
export const parseCfgFile = async (
  buffer: Uint8Array,
): Promise<ParseResult> => {
  try {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(buffer);
        controller.close();
      },
    }).pipeThrough(new DecompressionStream("gzip"));

    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const decompressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    const content = new TextDecoder().decode(decompressed);

    const config: Record<string, string> = {};
    const pairs = content.split(";").filter((pair) => pair.trim());

    for (const pair of pairs) {
      const [key, value] = pair.split(":");
      if (key) {
        config[key.trim()] = value ? value.trim() : "";
      }
    }

    return { success: true, config };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Generate a gzip-compressed Teltonika `.cfg` file from a flat config map.
 *
 * @param config - Flat key-value config map.
 * @returns Gzip-compressed file bytes.
 *
 * @example
 * ```ts
 * const bytes = await generateCfgFile({ "2004": "server.example.com" });
 * ```
 */
export const generateCfgFile = async (
  config: Record<string, string>,
): Promise<Uint8Array> => {
  const pairs = Object.entries(config).map(([key, value]) => `${key}:${value}`);
  const content = pairs.join(";") + ";";

  const textBuffer = new TextEncoder().encode(content);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(textBuffer);
      controller.close();
    },
  }).pipeThrough(new CompressionStream("gzip"));

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const compressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  return compressed;
};
