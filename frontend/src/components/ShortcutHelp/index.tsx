import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ShortcutHelp({ isOpen, onClose }: Props) {
  const { t } = useTranslation("shortcuts");

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: "shortcuts.openHelp.key", desc: "shortcuts.openHelp.description" },
    { key: "shortcuts.focusInput.key", desc: "shortcuts.focusInput.description" },
    { key: "shortcuts.sendMessage.key", desc: "shortcuts.sendMessage.description" },
    { key: "shortcuts.newLine.key", desc: "shortcuts.newLine.description" },
    { key: "shortcuts.closeModal.key", desc: "shortcuts.closeModal.description" },
  ];

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

        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between p-3 bg-stone-900/50 rounded-xl"
            >
              <span className="text-stone-300">{t(shortcut.desc)}</span>
              <kbd className="px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 font-mono min-w-[80px] text-center">
                {t(shortcut.key)}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-stone-500 text-sm text-center mt-6">{t("close")}</p>
      </div>
    </div>
  );
}
