interface MessageBannerProps {
  message: string;
  messageType: "success" | "error" | "";
  onDismiss: () => void;
}

const MessageBanner = ({ message, messageType, onDismiss }: MessageBannerProps) => {
  if (!message) return null;

  return (
    <div
      class={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${
        messageType === "success"
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      <span>{messageType === "success" ? "\u2705" : "\u274C"}</span>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} class="ml-auto text-xs underline">
        Dismiss
      </button>
    </div>
  );
};

export default MessageBanner;
