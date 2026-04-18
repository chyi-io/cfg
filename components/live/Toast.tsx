interface Props {
  kind: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
}

const PALETTE: Record<Props["kind"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

export default function Toast({ kind, message, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      class={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        PALETTE[kind]
      }`}
    >
      <span class="flex-1 break-words">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          class="text-xs underline opacity-70 hover:opacity-100"
        >
          dismiss
        </button>
      )}
    </div>
  );
}
