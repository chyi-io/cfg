import { useEffect, useState } from "preact/hooks";
import type { ConfigData } from "../components/types.ts";
import ConfigEditor from "./ConfigEditor.tsx";

export default function ConfigPageIsland() {
  const [data, setData] = useState<ConfigData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("hw-config");
    if (!raw) {
      setError(true);
      return;
    }
    try {
      setData(JSON.parse(raw));
    } catch (_e) {
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-800 mb-4">
            No configuration loaded
          </h1>
          <a href="/" class="text-blue-600 hover:underline">
            Go back to upload
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
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
