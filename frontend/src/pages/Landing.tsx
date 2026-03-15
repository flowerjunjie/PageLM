import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PromptRail from "../components/Landing/PromptRail";
import PromptBox from "../components/Landing/PromptBox";
import ExploreTopics from "../components/Landing/ExploreTopics";
import ErrorAlert from "../components/ErrorAlert";
import { chatJSON } from "../lib/api";

export default function Landing() {
  const { t } = useTranslation('landing');
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ type: string; message?: string } | null>(null);
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
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto my-20 md:my-4 w-full px-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white font-semibold pl-3 border-l-2 border-sky-500 mb-8">
          {t('hero.title')}
        </h1>

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

      <ExploreTopics busy={busy} />
    </div>
  );
}