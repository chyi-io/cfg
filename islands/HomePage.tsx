import { useState, useEffect } from "preact/hooks";

interface VendorDevice {
  id: string;
  name: string;
  vendorId: string;
  categoryCount: number;
  paramCount: number;
}

interface VendorInfo {
  id: string;
  name: string;
  fileExtensions: string[];
  devices: VendorDevice[];
}

export default function HomePage() {
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/vendors")
      .then((r) => r.json())
      .then((data) => setVendors(data.vendors ?? []))
      .catch(() => setError("Failed to load vendors"))
      .finally(() => setLoading(false));
  }, []);

  const handleFileSelect = async (file: File) => {
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const err = await response.json();
        setError(err.error || "Failed to parse configuration file");
        setUploading(false);
        return;
      }
      const data = await response.json();
      sessionStorage.setItem("hw-config", JSON.stringify(data));
      window.location.href = `/config/${data.vendorId}/${data.deviceId}`;
    } catch (_err) {
      setError("Failed to upload file");
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInput = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleCreateNew = async (vendorId: string, deviceId: string) => {
    setError("");
    setCreating(`${vendorId}:${deviceId}`);
    try {
      const response = await fetch(`/api/defaults?vendor=${vendorId}&device=${deviceId}`);
      if (!response.ok) {
        const err = await response.json();
        setError(err.error || "Failed to create new configuration");
        setCreating("");
        return;
      }
      const data = await response.json();
      sessionStorage.setItem("hw-config", JSON.stringify(data));
      window.location.href = `/config/${vendorId}/${deviceId}`;
    } catch (_err) {
      setError("Failed to create new configuration");
      setCreating("");
    }
  };

  const allExts = vendors.flatMap((v) => v.fileExtensions).join(", ");
  const q = search.toLowerCase();
  const filteredVendors = vendors.map((v) => ({
    ...v,
    devices: v.devices.filter(
      (d) =>
        !q ||
        v.name.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q),
    ),
  })).filter((v) => v.devices.length > 0);

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div class="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero */}
        <div class="text-center mb-10">
          <img src="/chyi-icon.png" alt="CHYI" class="w-16 h-16 mx-auto mb-5" />
          <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Chyi Hardware Configurator
          </h1>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">
            Edit config files offline, or talk to a real device on your network in real time.
          </p>
        </div>

        {/* Mode picker */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-900">Edit a config file</h2>
            </div>
            <p class="text-sm text-gray-600 mb-3">
              Upload a Teltonika, Ruptela, or Chafon config file. Edit parameters in a structured UI. Download the result.
            </p>
            <p class="text-xs text-gray-400">No device required — works fully offline in your browser.</p>
          </div>

          <a
            href="/live"
            class="block rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Live device control
              </h2>
              <span class="ml-auto text-emerald-600 group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <p class="text-sm text-gray-600 mb-3">
              Read and write live device parameters over the network: work mode, remote server, whitelist, more.
            </p>
            <p class="text-xs text-emerald-700 font-medium">
              Requires the chyi-cfg-agent installed on a Linux box on the device's LAN.
            </p>
          </a>
        </div>

        {error && (
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
            <span class="font-medium">Error:</span> {error}
            <button type="button" onClick={() => setError("")} class="ml-auto text-xs underline">Dismiss</button>
          </div>
        )}

        {/* Upload */}
        <div class="mb-12">
          <div
            onDrop={handleDrop}
            onDragOver={(e: DragEvent) => e.preventDefault()}
            class="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer bg-white/60 backdrop-blur-sm shadow-sm"
          >
            <input
              type="file"
              accept=".cfg,.rcfg,.txt,.ini"
              onChange={handleFileInput}
              class="hidden"
              id="file-upload"
            />
            <label for="file-upload" class="cursor-pointer">
              {uploading ? (
                <div class="flex flex-col items-center gap-3">
                  <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
                  <p class="text-gray-600 font-medium">Detecting device and parsing...</p>
                </div>
              ) : (
                <div class="flex flex-col items-center gap-3">
                  <div class="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-gray-800 font-semibold">Drop a config file here or click to browse</p>
                    <p class="text-xs text-gray-400 mt-1">
                      Supported formats: {allExts || ".cfg, .rcfg, .txt, .ini"}
                    </p>
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Search + Vendor Grid */}
        <div class="mb-6 flex items-center gap-3">
          <h2 class="text-lg font-bold text-gray-800 flex-shrink-0">Create New</h2>
          <div class="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search vendors or devices..."
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVendors.flatMap((vendor) =>
              vendor.devices.map((device) => {
                const key = `${vendor.id}:${device.id}`;
                const isCreating = creating === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!!creating}
                    onClick={() => handleCreateNew(vendor.id, device.id)}
                    class="text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50 group"
                  >
                    <div class="flex items-start justify-between mb-3">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {vendor.name}
                      </span>
                      {isCreating ? (
                        <div class="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                      ) : (
                        <svg class="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </div>
                    <h3 class="font-bold text-gray-800 mb-1">{device.name}</h3>
                    <div class="flex items-center gap-3 text-[11px] text-gray-400">
                      <span>{device.paramCount} params</span>
                      <span>{device.categoryCount} categories</span>
                    </div>
                  </button>
                );
              }),
            )}
          </div>
        )}

        {!loading && filteredVendors.length === 0 && search && (
          <p class="text-center text-gray-400 py-8 text-sm">No devices match "{search}"</p>
        )}

        <footer class="mt-14 flex flex-col items-center gap-3 text-xs text-gray-400">
          <div class="flex items-center gap-4">
            <a href="/docs" class="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Documentation
            </a>
            <a href="https://github.com/chyi-io/cfg" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
          </div>
          <p>Built with Deno &amp; Fresh | <a href="https://github.com/mutasimissa" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">mutasimissa</a></p>
        </footer>
      </div>
    </div>
  );
}
