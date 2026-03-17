import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  tag?: string;
}

interface ReviewCardProps {
  flashcard: Flashcard;
  onRate: (quality: number) => void;
  currentIndex: number;
  totalCount: number;
}

export default function ReviewCard({
  flashcard,
  onRate,
  currentIndex,
  totalCount,
}: ReviewCardProps) {
  const { t } = useTranslation("review");
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleRate = (quality: number) => {
    onRate(quality);
    setIsFlipped(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4 text-sm text-stone-400">
        <span>
          {t("progress", { current: currentIndex + 1, total: totalCount })}
        </span>
        <div className="flex-1 mx-4 h-1 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
          />
        </div>
        <span>{Math.round(((currentIndex + 1) / totalCount) * 100)}%</span>
      </div>

      {/* Card Container */}
      <div
        className="relative h-80 sm:h-96 cursor-pointer perspective-1000"
        onClick={!isFlipped ? handleFlip : undefined}
      >
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-500 transform-style-preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 w-full h-full backface-hidden">
            <div className="w-full h-full bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center hover:border-stone-700 transition-colors">
              {flashcard.tag && (
                <span className="px-3 py-1 bg-stone-800 text-stone-400 text-xs rounded-full mb-4">
                  {flashcard.tag}
                </span>
              )}
              <h3 className="text-xl sm:text-2xl text-white text-center font-medium leading-relaxed">
                {flashcard.question}
              </h3>
              <p className="mt-6 text-stone-500 text-sm">
                {t("clickToFlip")}
              </p>
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
            <div className="w-full h-full bg-stone-800 border border-stone-700 rounded-2xl p-6 sm:p-8 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <p className="text-lg sm:text-xl text-stone-200 text-center leading-relaxed whitespace-pre-wrap">
                  {flashcard.answer}
                </p>
              </div>

              {/* Rating Buttons */}
              <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
                <button
                  onClick={() => handleRate(0)}
                  className="flex flex-col items-center p-2 sm:p-3 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 rounded-lg transition-colors"
                >
                  <span className="text-2xl mb-1">😵</span>
                  <span className="text-xs text-red-300">
                    {t("ratings.blackout")}
                  </span>
                </button>
                <button
                  onClick={() => handleRate(3)}
                  className="flex flex-col items-center p-2 sm:p-3 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-800/50 rounded-lg transition-colors"
                >
                  <span className="text-2xl mb-1">🤔</span>
                  <span className="text-xs text-yellow-300">
                    {t("ratings.hard")}
                  </span>
                </button>
                <button
                  onClick={() => handleRate(4)}
                  className="flex flex-col items-center p-2 sm:p-3 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/50 rounded-lg transition-colors"
                >
                  <span className="text-2xl mb-1">🙂</span>
                  <span className="text-xs text-blue-300">
                    {t("ratings.good")}
                  </span>
                </button>
                <button
                  onClick={() => handleRate(5)}
                  className="flex flex-col items-center p-2 sm:p-3 bg-green-900/30 hover:bg-green-900/50 border border-green-800/50 rounded-lg transition-colors"
                >
                  <span className="text-2xl mb-1">🎉</span>
                  <span className="text-xs text-green-300">
                    {t("ratings.easy")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      {isFlipped && (
        <div className="mt-4 flex justify-center gap-4 text-xs text-stone-500">
          <span>{t("legend.blackout")}</span>
          <span>{t("legend.hard")}</span>
          <span>{t("legend.good")}</span>
          <span>{t("legend.easy")}</span>
        </div>
      )}
    </div>
  );
}
