import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface GeneratedMaterialRef {
  flashcards: { id: string; question: string; answer: string; tags: string[] }[];
  notes: { id: string; title: string; summary: string };
  quiz: { id: string; questionCount: number };
}

type Props = {
  materials: GeneratedMaterialRef;
  onViewFlashcards?: () => void;
  onReviewFlashcards?: () => void;
  onViewNotes?: () => void;
  onExportNotes?: () => void;
  onTakeQuiz?: () => void;
};

export default function GeneratedMaterials({
  materials,
  onViewFlashcards,
  onReviewFlashcards,
  onViewNotes,
  onExportNotes,
  onTakeQuiz,
}: Props) {
  const { t } = useTranslation("chat");
  const [expanded, setExpanded] = useState<string | null>(null);

  const hasFlashcards = materials.flashcards?.length > 0;
  const hasNotes = materials.notes?.id;
  const hasQuiz = materials.quiz?.questionCount > 0;

  if (!hasFlashcards && !hasNotes && !hasQuiz) return null;

  return (
    <div className="mt-4 mb-2 animate-[fadeIn_400ms_ease-out]">
      <div className="bg-gradient-to-r from-stone-900/80 to-stone-950/80 border border-stone-800/60 rounded-2xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-emerald-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
          <span className="text-sm font-medium text-stone-300">
            {t("materials.generatedForYou")}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Flashcards */}
          {hasFlashcards && (
            <div
              className={`flex-1 min-w-[200px] bg-stone-950/60 rounded-xl p-3 border transition-all duration-200 ${
                expanded === "flashcards"
                  ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                  : "border-stone-800/60 hover:border-stone-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4 text-emerald-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-200">
                      {t("materials.flashcardsCount", { count: materials.flashcards.length })}
                    </p>
                    <p className="text-xs text-stone-500">{t("materials.flashcardsDesc")}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(expanded === "flashcards" ? null : "flashcards")}
                  className="text-stone-500 hover:text-stone-300 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className={`w-5 h-5 transition-transform ${expanded === "flashcards" ? "rotate-180" : ""}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {expanded === "flashcards" && (
                <div className="mt-3 pt-3 border-t border-stone-800/60 space-y-2 animate-[fadeIn_200ms_ease-out]">
                  {materials.flashcards.slice(0, 3).map((card) => (
                    <div key={card.id} className="bg-stone-900/50 rounded-lg p-2.5 text-sm">
                      <p className="text-stone-300 font-medium">{card.question}</p>
                      <p className="text-stone-500 text-xs mt-1">{card.answer.slice(0, 60)}...</p>
                    </div>
                  ))}
                  {materials.flashcards.length > 3 && (
                    <p className="text-xs text-stone-500 text-center">
                      +{materials.flashcards.length - 3} {t("materials.more")}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={onViewFlashcards}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
                    >
                      {t("materials.viewAll")}
                    </button>
                    <button
                      onClick={onReviewFlashcards}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-stone-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors"
                    >
                      {t("materials.startReview")}
                    </button>
                  </div>
                </div>
              )}

              {expanded !== "flashcards" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={onViewFlashcards}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
                  >
                    {t("materials.view")}
                  </button>
                  <button
                    onClick={onReviewFlashcards}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-stone-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors"
                  >
                    {t("materials.review")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {hasNotes && (
            <div
              className={`flex-1 min-w-[200px] bg-stone-950/60 rounded-xl p-3 border transition-all duration-200 ${
                expanded === "notes"
                  ? "border-blue-500/50 ring-1 ring-blue-500/20"
                  : "border-stone-800/60 hover:border-stone-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4 text-blue-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-200">{t("materials.notesTitle")}</p>
                    <p className="text-xs text-stone-500 truncate max-w-[120px]">{materials.notes.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(expanded === "notes" ? null : "notes")}
                  className="text-stone-500 hover:text-stone-300 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className={`w-5 h-5 transition-transform ${expanded === "notes" ? "rotate-180" : ""}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {expanded === "notes" && (
                <div className="mt-3 pt-3 border-t border-stone-800/60 animate-[fadeIn_200ms_ease-out]">
                  <p className="text-sm text-stone-300 font-medium">{materials.notes.title}</p>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-3">{materials.notes.summary}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={onViewNotes}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
                    >
                      {t("materials.view")}
                    </button>
                    <button
                      onClick={onExportNotes}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-stone-950 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors"
                    >
                      {t("materials.export")}
                    </button>
                  </div>
                </div>
              )}

              {expanded !== "notes" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={onViewNotes}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
                  >
                    {t("materials.view")}
                  </button>
                  <button
                    onClick={onExportNotes}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-stone-950 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors"
                  >
                    {t("materials.export")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quiz */}
          {hasQuiz && (
            <div
              className={`flex-1 min-w-[200px] bg-stone-950/60 rounded-xl p-3 border transition-all duration-200 ${
                expanded === "quiz"
                  ? "border-amber-500/50 ring-1 ring-amber-500/20"
                  : "border-stone-800/60 hover:border-stone-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4 text-amber-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-200">
                      {t("materials.quizCount", { count: materials.quiz.questionCount })}
                    </p>
                    <p className="text-xs text-stone-500">{t("materials.quizDesc")}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(expanded === "quiz" ? null : "quiz")}
                  className="text-stone-500 hover:text-stone-300 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className={`w-5 h-5 transition-transform ${expanded === "quiz" ? "rotate-180" : ""}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {expanded === "quiz" && (
                <div className="mt-3 pt-3 border-t border-stone-800/60 animate-[fadeIn_200ms_ease-out]">
                  <p className="text-sm text-stone-300">{t("materials.quizReady")}</p>
                  <p className="text-xs text-stone-500 mt-1">{t("materials.quizHint")}</p>
                  <button
                    onClick={onTakeQuiz}
                    className="w-full mt-3 px-3 py-2 text-sm font-medium text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                      />
                    </svg>
                    {t("materials.startQuiz")}
                  </button>
                </div>
              )}

              {expanded !== "quiz" && (
                <button
                  onClick={onTakeQuiz}
                  className="w-full mt-3 px-3 py-1.5 text-xs font-medium text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
                >
                  {t("materials.testNow")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
