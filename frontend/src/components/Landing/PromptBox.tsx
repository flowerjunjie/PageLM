import React from "react";
import { useTranslation } from "react-i18next";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy?: boolean;
};

export default function PromptBox({
  value,
  onChange,
  onSend,
  busy,
}: Props) {
  const { t } = useTranslation('landing');

  return (
    <div
      className="rounded-3xl bg-stone-950 border border-stone-900 shadow-[inset_0_3px_15px] shadow-stone-900 flex items-start rounded-bl-none rounded-br-none md:rounded-br-3xl"
    >
      <div className="flex-1 p-3">
        <textarea
          rows={1}
          placeholder={t('hero.placeholder')}
          className="w-full text-stone-200 bg-transparent rounded-2xl p-2.5 outline-none resize-none leading-6 min-h-[40px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={busy}
          aria-label="Main prompt"
        />
      </div>

      <div className="h-full w-fit p-2">
        <button
          onClick={onSend}
          disabled={busy || !value.trim()}
          className="rounded-full bg-stone-900 hover:bg-stone-800 duration-300 transition-all hover:text-white p-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Send"
          title={busy ? t('promptRail.starting') : t('promptBox.send')}
        >
          {busy ? (
            <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}