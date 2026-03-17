import { useEffect, useState } from "react";
import { deleteFlashcard, listFlashcards, type SavedFlashcard } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function FlashCards() {
  const { t } = useTranslation("flashcards");
  const [items, setItems] = useState<SavedFlashcard[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setError(null);
      const { flashcards } = await listFlashcards();
      setItems((flashcards || []).sort((a, b) => b.created - a.created));
    } catch (e) {
      setError(t("errors.loadFailed") || "Failed to load flashcards");
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteFlashcard(id);
      await load();
    } catch (e) {
      setError(t("errors.deleteFailed") || "Failed to delete flashcard");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!items.length) return;
    setBusy(true);
    setError(null);
    try {
      await Promise.all(items.map((i) => deleteFlashcard(i.id).catch(() => {})));
      await load();
    } catch (e) {
      setError(t("errors.clearFailed") || "Failed to clear flashcards");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="max-w-6xl mx-auto pt-6 pb-14 px-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-stone-950 border border-zinc-800 hover:bg-stone-900"
              aria-label={t("ariaLabels.back")}
            >
              <svg viewBox="0 0 24 24" className="size-5 text-stone-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-2xl font-semibold text-white">{t("title")}</h1>
          </div>
          <button
            onClick={clearAll}
            disabled={busy || !items.length}
            className="px-4 py-2 rounded-2xl bg-red-900/20 border border-red-800 text-red-300 hover:bg-red-900/30 disabled:opacity-50"
          >
            {t("clearAll")}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-300">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl bg-stone-950 border border-zinc-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-stone-400 mb-1">
                    {it.tag === "note" ? t("note") : t("flashcard")}
                  </div>
                  <div className="text-white font-medium">{it.question}</div>
                </div>
                <button
                  onClick={() => remove(it.id)}
                  disabled={busy}
                  className="p-2 rounded-lg bg-stone-950 border border-zinc-800 hover:bg-stone-900 disabled:opacity-50"
                  aria-label={t("ariaLabels.delete")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-stone-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.75 9.75a.75.75 0 0 1 .75.75v6a.75.75 0 1 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.75.75a.75.75 0 0 0-1.5 0v6a.75.75 0 1 0 1.5 0v-6Z"/>
                    <path fillRule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h4.443A2.25 2.25 0 0 1 10.315 4.5h2.37A2.25 2.25 0 0 1 14.807 6H19.5a.75.75 0 0 1 0 1.5h-.708l-1.03 12.06A2.25 2.25 0 0 1 15.52 21H8.48a2.25 2.25 0 0 1-2.242-2.44L5.208 7.5H4.5A.75.75 0 0 1 3.75 6.75ZM9.75 6a.75.75 0 0 1 .671-.75h2.37a.75.75 0 0 1 .671.75H9.75Z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
              <div className="text-stone-300 text-sm mt-2 whitespace-pre-wrap">{it.answer}</div>
            </div>
          ))}
        </div>

        {!items.length && !error && (
          <div className="mt-16 text-center text-stone-400">
            {t("empty")}
          </div>
        )}
      </div>
    </div>
  );
}
