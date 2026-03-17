import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReviewCard from "../components/ReviewCard";
import {
  getDueReviews,
  submitReviewResult,
  getReviewStats,
  listFlashcards,
  type ReviewSchedule,
  type ReviewStats,
  type SavedFlashcard,
} from "../lib/api";

interface ReviewItem {
  schedule: ReviewSchedule;
  flashcard: SavedFlashcard;
}

export default function Review() {
  const { t } = useTranslation("review");
  const navigate = useNavigate();
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load due reviews and flashcards in parallel
      const [reviewsRes, flashcardsRes, statsRes] = await Promise.all([
        getDueReviews(),
        listFlashcards(),
        getReviewStats(),
      ]);

      if (!reviewsRes.success) {
        throw new Error("Failed to load reviews");
      }

      if (!flashcardsRes.ok) {
        throw new Error("Failed to load flashcards");
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // Match schedules with flashcards
      const flashcardMap = new Map(
        flashcardsRes.flashcards.map((fc) => [fc.id, fc])
      );

      const items: ReviewItem[] = [];
      for (const schedule of reviewsRes.data) {
        const flashcard = flashcardMap.get(schedule.flashcardId);
        if (flashcard) {
          items.push({ schedule, flashcard });
        }
      }

      setReviewItems(items);

      if (items.length === 0) {
        setCompleted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (quality: number) => {
    if (currentIndex >= reviewItems.length) return;

    const currentItem = reviewItems[currentIndex];

    try {
      await submitReviewResult(currentItem.schedule.flashcardId, quality);

      // Move to next card
      if (currentIndex < reviewItems.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // All cards reviewed
        setCompleted(true);
        // Refresh stats
        const statsRes = await getReviewStats();
        if (statsRes.success) {
          setStats(statsRes.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-stone-300 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-stone-300 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-red-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-xl text-white mb-2">{t("error.title")}</h2>
          <p className="text-stone-400 mb-6">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
          >
            {t("error.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (completed || reviewItems.length === 0) {
    return (
      <div className="min-h-screen bg-black text-stone-300 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-10 h-10 text-green-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl text-white mb-2">{t("completed.title")}</h1>
          <p className="text-stone-400 mb-2">{t("completed.message")}</p>
          {stats && (
            <div className="bg-stone-900 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-sky-400">
                    {stats.completedToday}
                  </p>
                  <p className="text-sm text-stone-500">
                    {t("stats.completedToday")}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-400">
                    {stats.streak}
                  </p>
                  <p className="text-sm text-stone-500">{t("stats.streak")}</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors"
          >
            {t("completed.back")}
          </button>
        </div>
      </div>
    );
  }

  const currentItem = reviewItems[currentIndex];

  return (
    <div className="min-h-screen bg-black text-stone-300 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl text-white font-semibold">
              {t("title")}
            </h1>
            {stats && (
              <p className="text-stone-400 text-sm mt-1">
                {t("header.stats", {
                  due: stats.dueToday,
                  completed: stats.completedToday,
                })}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/")}
            className="p-2 text-stone-400 hover:text-white transition-colors"
            title={t("close")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Review Card */}
        <ReviewCard
          flashcard={{
            id: currentItem.flashcard.id,
            question: currentItem.flashcard.question,
            answer: currentItem.flashcard.answer,
            tag: currentItem.flashcard.tag,
          }}
          onRate={handleRate}
          currentIndex={currentIndex}
          totalCount={reviewItems.length}
        />

        {/* Tips */}
        <div className="mt-8 text-center text-sm text-stone-500">
          <p>{t("tips.srs")}</p>
        </div>
      </div>
    </div>
  );
}
