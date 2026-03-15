import { useTranslation } from "react-i18next";

type Props = {
  status?: "connecting" | "thinking" | "generating" | "analyzing";
};

export default function LoadingIndicator({ status = "thinking" }: Props) {
  const { t } = useTranslation("chat");

  const statusLabels = {
    connecting: t("loadingIndicator.connecting"),
    thinking: t("loadingIndicator.thinking"),
    generating: t("loadingIndicator.generating"),
    analyzing: t("loadingIndicator.analyzing"),
  };

  return (
    <div className="w-full max-w-4xl rounded-2xl p-6 border border-stone-900 bg-stone-950">
      <div className="flex items-center gap-4">
        <div className="relative h-5 w-5">
          <span className="absolute inset-0 rounded-full border-2 border-stone-700 animate-ping" />
          <span className="absolute inset-0 rounded-full border-2 border-stone-500 animate-[ping_1s_ease-in-out_infinite]" />
          <span className="absolute inset-0 rounded-full bg-sky-500/20 animate-[pulse_2s_ease-in-out_infinite]" />
        </div>
        <div className="text-stone-300">{statusLabels[status]}</div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="h-3 rounded bg-stone-800/60 animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-stone-800/60 animate-pulse" style={{ animationDelay: "0.1s" }} />
        <div className="h-3 w-2/3 rounded bg-stone-800/60 animate-pulse" style={{ animationDelay: "0.2s" }} />
      </div>
    </div>
  );
}