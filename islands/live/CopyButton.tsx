import { useState } from "preact/hooks";

interface Props {
  text: string;
}

export default function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers; do nothing.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      class="rounded border border-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-300 hover:bg-gray-800 transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
