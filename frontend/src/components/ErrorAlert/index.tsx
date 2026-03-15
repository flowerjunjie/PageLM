import { useTranslation } from "react-i18next";

type ErrorType = "network" | "server" | "validation" | "unknown" | "chat" | "quiz" | "tools";

type Props = {
  type?: ErrorType;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
};

export default function ErrorAlert({
  type = "unknown",
  message,
  onRetry,
  onDismiss,
  className = "",
}: Props) {
  const { t } = useTranslation('errors');

  const getErrorConfig = () => {
    switch (type) {
      case "network":
        return {
          title: t('network.title'),
          defaultMessage: t('network.message'),
        };
      case "server":
        return {
          title: t('server.title'),
          defaultMessage: t('server.message'),
        };
      case "validation":
        return {
          title: t('validation.title'),
          defaultMessage: t('validation.invalidFormat'),
        };
      case "chat":
        return {
          title: t('chat.generationFailed'),
          defaultMessage: t('chat.generationFailed'),
        };
      case "quiz":
        return {
          title: t('quiz.generationFailed'),
          defaultMessage: t('quiz.generationFailed'),
        };
      case "tools":
        return {
          title: t('tools.notesGenerationFailed'),
          defaultMessage: t('tools.notesGenerationFailed'),
        };
      default:
        return {
          title: t('unknown.title'),
          defaultMessage: t('unknown.message'),
        };
    }
  };

  const config = getErrorConfig();
  const displayMessage = message || config.defaultMessage;

  return (
    <div className={`p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200 ${className}`}>
      <div className="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5 mt-0.5 flex-shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="font-semibold">{config.title}</p>
          <p className="text-sm mt-1 text-red-300/80">{displayMessage}</p>

          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-900/70 border border-red-700/50 text-sm font-medium transition-colors"
                >
                  {t('network.retry')}
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-red-900/30 border border-red-700/30 text-sm font-medium transition-colors"
                >
                  {t('close')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
