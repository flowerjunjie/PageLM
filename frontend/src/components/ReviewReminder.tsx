import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getReviewStats, getDueReviews } from "../lib/api";

interface ReviewStats {
  totalCards: number;
  dueToday: number;
  completedToday: number;
  streak: number;
  averageEasiness: number;
}

export default function ReviewReminder() {
  const { t } = useTranslation("review");
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Refresh every minute
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await getReviewStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to load review stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // Schedule notification check
        scheduleNotificationCheck();
      }
    }
  };

  const scheduleNotificationCheck = async () => {
    try {
      const response = await getDueReviews();
      if (response.success && response.data.length > 0) {
        const dueCount = response.data.length;
        if (dueCount > 0) {
          new Notification(t("notification.title"), {
            body: t("notification.body", { count: dueCount }),
            icon: "/favicon.ico",
            tag: "review-reminder",
          });
        }
      }
    } catch (error) {
      console.error("Notification check failed:", error);
    }
  };

  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      requestNotificationPermission();
    }

    // Check for due reviews every 30 minutes
    const notificationInterval = setInterval(() => {
      if ("Notification" in window && Notification.permission === "granted") {
        scheduleNotificationCheck();
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(notificationInterval);
  }, []);

  if (loading) {
    return (
      <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-stone-800 rounded w-1/3"></div>
      </div>
    );
  }

  if (!stats || stats.dueToday === 0) {
    return null;
  }

  return (
    <div
      onClick={() => navigate("/review")}
      className="bg-gradient-to-r from-sky-900/30 to-purple-900/30 border border-sky-800/50 rounded-xl p-4 cursor-pointer hover:from-sky-900/40 hover:to-purple-900/40 transition-all duration-300 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-sky-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium">{t("reminder.title")}</h3>
            <p className="text-sm text-stone-400">
              {t("reminder.dueToday", { count: stats.dueToday })}
              {stats.completedToday > 0 &&
                ` · ${t("reminder.completed", { count: stats.completedToday })}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {stats.streak > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-orange-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">
                {t("reminder.streak", { count: stats.streak })}
              </span>
            </div>
          )}

          <button className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors group-hover:shadow-lg group-hover:shadow-sky-500/20">
            {t("reminder.start")}
          </button>
        </div>
      </div>
    </div>
  );
}
