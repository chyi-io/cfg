import { useState, useEffect } from "preact/hooks";
import type { ConfigData } from "../components/types.ts";
import ConfigEditor from "./ConfigEditor.tsx";

interface ConfigLoaderProps {
  vendorId: string;
  deviceId: string;
}

export default function ConfigLoaderIsland({ vendorId, deviceId }: ConfigLoaderProps) {
  const [data, setData] = useState<ConfigData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check sessionStorage first (from upload flow)
    const raw = sessionStorage.getItem("hw-config");
    if (raw) {
      try {
        const parsed: ConfigData = JSON.parse(raw);
        if (parsed.vendorId === vendorId && parsed.deviceId === deviceId) {
          setData(parsed);
          sessionStorage.removeItem("hw-config");
          return;
        }
      } catch (_e) { /* ignore */ }
    }

    // Otherwise fetch defaults from API
    fetch(`/api/defaults?vendor=${vendorId}&device=${deviceId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load defaults");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }, [vendorId, deviceId]);

  if (error) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-800 mb-2">Configuration Error</h1>
          <p class="text-gray-500 mb-4">{error}</p>
          <a href="/" class="text-blue-600 hover:underline">Go back</a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
          <p class="text-sm text-gray-500">Loading {vendorId} {deviceId} configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <ConfigEditor
      vendorId={data.vendorId}
      deviceId={data.deviceId}
      initialConfig={data.config}
      structured={data.structured}
      categories={data.categories}
      paramMetas={data.paramMetas}
    />
  );
}
