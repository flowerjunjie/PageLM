import { useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  url?: string;
};

export default function ShareModal({ isOpen, onClose, title, description, url }: Props) {
  const { t } = useTranslation("share");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareTitle = title || t("defaultTitle");
  const shareDescription = description || t("defaultDescription");
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const weiboUrl = `https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}&pic=&appkey=&ralateUid=`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error("Failed to copy");
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-950 border border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">{t("title")}</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 transition-colors"
            aria-label={t("close")}
          >
            <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview Card */}
        <div className="mb-6 p-4 bg-stone-900/50 rounded-xl border border-stone-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{shareTitle}</p>
              <p className="text-stone-400 text-sm mt-1 line-clamp-2">{shareDescription}</p>
              <p className="text-stone-500 text-xs mt-2 truncate">{shareUrl}</p>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <a
            href={weiboUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full p-3 bg-stone-900/50 hover:bg-stone-900 border border-stone-800 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
              <svg className="size-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.098 20c-1.153 1.696-2.388 2.556-3.695 2.556-3.363 0-5.55-2.788-5.55-6.67 0-3.905 2.22-6.684 5.567-6.684 1.3 0 2.544.398 3.697 1.165.516-3.454 2.22-6.074 5.143-7.376 1.62.732 3.393 1.13 5.138 1.13zm6.926-6.14c-1.093 1.673-2.357 2.556-3.68 2.556-3.39 0-5.57-2.788-5.57-6.67 0-3.905 2.22-6.684 5.567-6.684 1.3 0 2.544.398 3.696 1.165.517-3.454 2.22-6.074 5.144-7.376 1.62.732 3.393 1.13 5.138 1.13z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium group-hover:text-orange-300 transition-colors">{t("weibo")}</p>
              <p className="text-stone-400 text-sm">{t("weiboShare")}</p>
            </div>
          </a>

          {/* WeChat - shows QR code info */}
          <div className="flex items-center gap-3 w-full p-3 bg-stone-900/50 border border-stone-800 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
              <svg className="size-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.653c0 2.684 1.193 5.082 3.057 6.484-.137.461-.22.925-.268-1.388-.007-.146-.007-.292 0-.438.217-3.066.95-5.996-3.967-5.996-3.967zm8.693 3.024c-1.083-.673-2.16-1.351-3.225-2.031-1.382-.876-2.745-1.755-4.08-2.636.688-.434 1.372-.868 2.047-1.308.744-.467 1.484-.934 2.215-1.412.701-.442 1.396-.887 2.079-1.336.669-.423 1.332-.848 1.986-1.277.639-.403 1.27-.809 1.89-1.219.577-.36 1.148-.723 1.702-1.092.505-.32 1.003-.642 1.487-.967.441-.299.874-.6 1.283-.906.377-.27.744-.543 1.094-.819.306-.236.604-.475.895-.719.23-.221.453-.444.664-.673.175-.19.343-.383.494-.592.114-.168.223-.339.322-.518.078-.132.154-.265.218-.403.227-.202.349-.401.477-.605.075-.132.148-.266.212-.402.072-.19.144-.383.198-.597.073-.283.145-.568.211-.857.078-.351.156-.704.223-1.063.084-.45.168-.902.248-1.363.101-.547.202-1.095.299-1.646.128-.684.256-1.371.379-2.065.15-.828.3-1.658.445-2.497.191-1.05.407-2.093.607-3.148.305-1.277.654-2.55 1.292-3.835.42-1.067.839-2.135 1.25-3.209.496-.1.992-.198-1.99.291-2.994.123-1.194.246-2.389.366-3.597.158-1.416.316-2.833.469-4.263.195-1.653.39-3.313.577-4.986.248-1.88.496-3.763.983-5.656 1.683-.294.091-.587.182-.876.277-.336.209-.671.417-1.003.633-.37.248-.738.496-1.101.752-.43.345-.859.69-1.283 1.051-.501 1.002-1.002 1.502-1.509.048-.005.095-.011.19-.011.286 0 .298.004.595.011.89.019.495.04.991.121 1.482.206.28.07.566.141.842.215.128.364.256.725.389 1.089.164.455.329.912.49 1.374.055.256.11.51.221.767.339.445.182.119.364.237.549.359.997.267.498.535.749.806zm-2.322 4.61c-.246.135-.5.266-.761-.393-1.018-.162-.31-.321-.621-.477-.931-.19-.363-.378-.723-.535-1.079-.183-.407-.363-.812-.535-1.214-.19-.483-.375-.964-.535-1.443-.184-.587-.361-1.172-.521-1.756-.179-.684-.352-1.368-.506-2.055-.167-.778-.327-1.557-.471-2.34-.157-.904-.309-1.81-.44-2.722-.142-.994-.28-1.989-.391-2.989-.125-1.142-.247-2.287-.351-3.437-.114-1.293-.227-2.588-.319-3.887-.105-1.464-.21-2.928-.296-4.4-.092-1.661-.183-3.323-.251-4.991-.078-1.839-.156-3.682-.209-5.528-.061-2.049-.123-4.101-.17-6.157-.055-2.253-.11-4.508-.141-6.769-.036-2.411-.072-4.826-.081-7.246-.012-2.771-.024-5.543.015-8.32.029-3.097.084-6.19.201-6.337-9.309-.101-2.022-.202-4.041-.28-6.062-.09-2.266-.18-4.533-.237-6.806-.063-2.604-.127-5.209-.165-7.819-.042-3.004-.085-6.009-.092-9.019-.009-3.263.059-6.522.158-9.773.092-3.625.21-7.246.47-10.86.13-3.297.299-6.591.68-9.88 1.126-3.16.51-6.309 1.146-9.462 1.993-2.868.743-5.724 1.49-8.563 2.58-2.637.965-5.26 1.921-7.879 3.387-2.409 1.266-4.801 2.521-7.18 4.192-2.223 1.508-4.423 3.006-6.6 4.888-2.022 1.677-4.02 3.342-5.991 5.343-1.808 1.797-3.593 3.578-5.354 5.711-1.586 1.848-3.148 3.683-4.67 5.827-1.395 1.871-2.771 3.732-4.124 7.17-.878 2.912-1.736 5.814-2.568 8.77-.896 3.339-1.77 6.668-2.618 10.026-.781 3.006-1.539 6.01-2.276 9.044-.588 2.691-1.157 5.379-1.691 8.092-.337 2.158-.659 4.308-.962 6.474-.165 1.9-.323 3.797-.467 5.704-.085 3.152-.159 6.301-.218 9.46-.042 4.66-.076 9.321-.09 13.986-.006 4.013.045 8.018.121 12.022.061 3.381.128 6.758.215 10.137.269 15.133.046 3.91.093 7.804.144 11.703.191 17.539.032 4.582.054 9.147.063 13.71.063 20.541.004 5.422.018 10.833.022 16.25.002 3.585-.091 7.162-.172 10.746-.24 16.126.05 4.859.083 9.706.1 14.559.098 21.335.001 5.37-.012 10.733-.025 16.096.073 3.902.194 7.795.289 11.687.348 1.89.073 3.779.14 5.663.196 8.489.046 2.324.085 4.639.114 6.952.156 10.372.028 2.789.106 5.571.167 8.343.218 12.508.024 2.96.056 5.912.073 8.854.101 13.251.012 2.886.071 5.763.115 8.637.141 12.938.013 2.962.1 5.914.172 8.858.199 13.265.011 2.895.12 5.783.212 8.666.281 12.973.028 2.543.163 5.079.274 7.608.376 11.346.048 2.872.15 5.731.266 8.579.354 12.839.037 2.75.159 5.484.275 8.22.378 12.311.046 3.097.127 6.183.182 9.263.208 13.883.012 3.185.137 6.357.237 9.521.304 14.254.022 2.946.118 5.876.199 8.795.253 13.16.005 3.896.16 7.777.237 11.638.288 16.443.002 4.377.165 8.74.224 13.093.265 19.714.051 5.364.184 10.715.27 16.047.326 23.812.072 4.998.158 9.983.227 14.951.269 22.405.005 5.453.07 10.896.12 16.327.157 24.438z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{t("wechat")}</p>
              <p className="text-stone-400 text-sm">{t("wechatShare")}</p>
            </div>
          </div>

          {/* Copy Link */}
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-3 w-full p-3 bg-stone-900/50 hover:bg-stone-900 border border-stone-800 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center flex-shrink-0">
              <svg className="size-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.856l-2.007-2.007M8.518 19.811A4.5 4.5 0 0 1 15.25 15.25M16.5 20a4.5 4.5 0 0 1-9-4.5 4.5 0 0 1 4.5-4.5" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">{copied ? t("copied") : t("copyLink")}</p>
              <p className="text-stone-500 text-sm truncate">{shareUrl}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
