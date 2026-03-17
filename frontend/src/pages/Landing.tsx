import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PromptRail from "../components/Landing/PromptRail";
import PromptBox from "../components/Landing/PromptBox";
import ExploreTopics from "../components/Landing/ExploreTopics";
import LearningModeSelector from "../components/LearningModeSelector";
import ReviewReminder from "../components/ReviewReminder";
import ErrorAlert from "../components/ErrorAlert";
import { chatJSON } from "../lib/api";

export default function Landing() {
  const { t } = useTranslation('landing');
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ type: string; message?: string } | null>(null);
  const [showQuickInput, setShowQuickInput] = useState(false);
  const navigate = useNavigate();

  const onSend = async (override?: string) => {
    if (busy) return;
    const q = (override ?? prompt).trim();
    if (!q) return;

    setError(null);
    setBusy(true);
    try {
      const r = await chatJSON({ q });
      navigate(`/chat?chatId=${encodeURIComponent(r.chatId)}&q=${encodeURIComponent(q)}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      // 判断错误类型
      let errorType = "unknown";
      if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
        errorType = "network";
      } else if (errorMessage.includes("http 5")) {
        errorType = "server";
      }
      setError({ type: errorType, message: errorMessage });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        {/* Review Reminder - Shown when there are due reviews */}
        <div className="pt-4">
          <ReviewReminder />
        </div>

        {/* Header Section */}
        <div className="pt-8 sm:pt-12 md:pt-16 pb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white font-semibold pl-3 border-l-2 border-sky-500 leading-tight tracking-wide">
            {t('hero.title')}
          </h1>
          <p className="text-stone-400 mt-3 pl-3 text-sm sm:text-base">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Learning Mode Selector - Main Feature */}
        <LearningModeSelector />

        {/* Quick Input Toggle */}
        <div className="flex justify-center mt-6 mb-4">
          <button
            onClick={() => setShowQuickInput(!showQuickInput)}
            className="text-stone-500 hover:text-stone-300 text-sm flex items-center gap-2 transition-colors duration-200"
          >
            <span>{showQuickInput ? t('quickInput.hide') : t('quickInput.show')}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`w-4 h-4 transition-transform duration-200 ${showQuickInput ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* Quick Input Section (Collapsible) */}
        {showQuickInput && (
          <div className="max-w-2xl mx-auto w-full px-2 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
            {error && (
              <ErrorAlert
                type={error.type as any}
                message={error.message}
                onRetry={() => onSend()}
                onDismiss={() => setError(null)}
                className="mb-4"
              />
            )}

            <PromptBox
              value={prompt}
              onChange={setPrompt}
              onSend={() => onSend()}
              busy={busy}
            />

            <PromptRail onSend={(p) => onSend(p)} />
          </div>
        )}

        {/* Explore Topics Section */}
        <ExploreTopics busy={busy} />
      </div>
    </div>
  );
}