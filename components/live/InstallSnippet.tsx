import CopyButton from "../../islands/live/CopyButton.tsx";

interface Props {
  host: string;
  scheme: "http" | "https";
}

export default function InstallSnippet({ host, scheme }: Props) {
  const cmd = `curl -fSL ${scheme}://${host}/install.sh | bash`;
  return (
    <div class="rounded-lg border border-gray-200 bg-gray-900 text-gray-50 px-3 py-2 font-mono text-xs flex items-center gap-2">
      <span class="text-emerald-400 select-none">$</span>
      <span class="flex-1 break-all">{cmd}</span>
      <CopyButton text={cmd} />
    </div>
  );
}
