import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatJSON } from "../../lib/api";
import { useTranslation } from "react-i18next";

export default function ExploreTopics({ busy: externalBusy = false }: { busy?: boolean }) {
  const { t } = useTranslation('landing');
  const [open, setOpen] = useState(false);
  const [internalBusy, setInternalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const busy = externalBusy || internalBusy;

  const moreRows = useMemo(
    () => [
      [{ key: "history" }, { key: "geography" }, { key: "music" }],
      [{ key: "art" }, { key: "technology" }, { key: "philosophy" }],
    ],
    []
  );

  const mainTopics = [
    { key: "mathematics" },
    { key: "literature" },
    { key: "science" },
  ];

  const imgSrc = (key: string) => `/pictures/${encodeURIComponent(key.toLocaleLowerCase())}.png`;

  const promptFor = (topicKey: string, topicName: string) => {
    // Use a default English prompt template that will be sent to the AI
    return `Give me a clear, beginner-friendly lesson on ${topicName}`;
  };

  const startTopic = async (topicKey: string) => {
    if (busy) return;
    setError(null);
    try {
      setInternalBusy(true);
      const topicName = t(`exploreTopics.${topicKey}`);
      const q = promptFor(topicKey, topicName);
      const r = await chatJSON({ q });
      if (r.ok) {
        navigate(`/chat?chatId=${encodeURIComponent(r.chatId)}&q=${encodeURIComponent(q)}`, {
          state: { chatId: r.chatId, q },
        });
      } else {
        setError(t('exploreTopics.error', { defaultValue: 'Failed to start chat' }));
      }
    } catch (err) {
      console.error('Failed to start topic:', err);
      setError(t('exploreTopics.error', { defaultValue: 'Network error. Please try again.' }));
    } finally {
      setInternalBusy(false);
    }
  };

  const Card = ({ topicKey, extra }: { topicKey: string; extra?: string }) => {
    const title = t(`exploreTopics.${topicKey}`);
    const startLabel = busy ? t('promptRail.starting') : t('exploreTopics.starting', { title });
    return (
      <button
        type="button"
        onClick={() => startTopic(topicKey)}
        disabled={busy}
        className={`w-full h-48 relative rounded-3xl border border-stone-900 bg-stone-950
                    hover:scale-105 transition-transform duration-200 ease-out
                    focus:outline-none focus:ring-2 focus:ring-stone-700 disabled:opacity-60 ${extra || ""}`}
        title={startLabel}
      >
        <img src={imgSrc(topicKey)} alt={title} className="w-full h-full rounded-3xl object-cover" draggable={false} />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-transparent to-black" />
        <div className="absolute right-0 bottom-0 pr-4 pb-4 text-stone-200 text-xl sm:text-2xl">{title}</div>
      </button>
    );
  };

  return (
    <div className="mt-auto pb-4 pt-4 relative">
      <div className="w-fit flex flex-col items-center mx-auto mb-8 cursor-pointer select-none" onClick={() => setOpen((v) => !v)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-6"
          style={{
            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path
            fillRule="evenodd"
            d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm">{busy ? t('promptRail.starting') : t('exploreTopics.title').toUpperCase()}</span>
      </div>

      <div className="w-full max-w-4xl mx-auto overflow-hidden">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200 text-sm text-center">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-300 hover:text-red-100 underline"
            >
              {t('common.close')}
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <Card key={mainTopics[0].key} topicKey={mainTopics[0].key} />
          <Card key={mainTopics[1].key} topicKey={mainTopics[1].key} />
          <Card key={mainTopics[2].key} topicKey={mainTopics[2].key} extra="col-span-1 sm:col-span-2 lg:col-span-1" />
        </div>

        <div
          className="overflow-hidden"
          style={{
            transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            maxHeight: open ? 1000 : 0
          }}
        >
          {moreRows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {row.map((topic) => (
                <Card key={topic.key} topicKey={topic.key} extra={topic === row[2] ? "col-span-1 sm:col-span-2 lg:col-span-1" : ""} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute w-full h-full bottom-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none"
        style={{
          transition: "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: open ? 0 : 1
        }}
      />
    </div>
  );
}