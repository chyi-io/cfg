interface BottomBarProps {
  vendorLabel: string;
  deviceLabel: string;
  compatibleParams: number;
  incompatibleParams: number;
  totalErrors: number;
  downloading: boolean;
  onDownload: () => void;
}

const BottomBar = ({
  vendorLabel,
  deviceLabel,
  compatibleParams,
  incompatibleParams,
  totalErrors,
  downloading,
  onDownload,
}: BottomBarProps) => (
  <div class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 py-3 z-50">
    <div class="px-4 flex items-center justify-between">
      <div class="text-sm text-gray-500">
        {vendorLabel} {deviceLabel} &middot; {compatibleParams} params
        {incompatibleParams > 0 && (
          <span class="text-amber-500 ml-1">&middot; {incompatibleParams} incompatible</span>
        )}
        {totalErrors > 0 ? (
          <span class="text-red-500 font-medium ml-1">
            &middot; {totalErrors} error{totalErrors > 1 ? "s" : ""}
          </span>
        ) : (
          <span class="text-green-600 ml-1">&middot; Ready</span>
        )}
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-5 rounded-lg flex items-center gap-2 transition-colors shadow-md text-sm"
      >
        {downloading ? (
          <>
            <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Generating...
          </>
        ) : (
          <>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </>
        )}
      </button>
    </div>
  </div>
);

export default BottomBar;
