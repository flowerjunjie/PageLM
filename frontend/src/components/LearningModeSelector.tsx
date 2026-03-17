import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface LearningMode {
  id: string;
  icon: string;
  title: string;
  description: string;
  route: string;
  gradient: string;
}

export default function LearningModeSelector() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();

  const learningModes: LearningMode[] = [
    {
      id: 'preview',
      icon: '📖',
      title: t('learningModes.preview.title'),
      description: t('learningModes.preview.description'),
      route: '/preview',
      gradient: 'from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30',
    },
    {
      id: 'notes',
      icon: '📝',
      title: t('learningModes.notes.title'),
      description: t('learningModes.notes.description'),
      route: '/notes',
      gradient: 'from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30',
    },
    {
      id: 'quiz',
      icon: '🎯',
      title: t('learningModes.quiz.title'),
      description: t('learningModes.quiz.description'),
      route: '/quiz',
      gradient: 'from-rose-500/20 to-pink-600/20 hover:from-rose-500/30 hover:to-pink-600/30',
    },
    {
      id: 'podcast',
      icon: '📻',
      title: t('learningModes.podcast.title'),
      description: t('learningModes.podcast.description'),
      route: '/podcast',
      gradient: 'from-violet-500/20 to-purple-600/20 hover:from-violet-500/30 hover:to-purple-600/30',
    },
    {
      id: 'planner',
      icon: '📅',
      title: t('learningModes.planner.title'),
      description: t('learningModes.planner.description'),
      route: '/planner',
      gradient: 'from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30',
    },
    {
      id: 'chat',
      icon: '💬',
      title: t('learningModes.chat.title'),
      description: t('learningModes.chat.description'),
      route: '/chat',
      gradient: 'from-sky-500/20 to-indigo-600/20 hover:from-sky-500/30 hover:to-indigo-600/30',
    },
  ];

  const handleModeClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-xl sm:text-2xl text-stone-200 font-medium mb-3">
          {t('learningModes.heading')}
        </h2>
        <p className="text-stone-400 text-sm sm:text-base">
          {t('learningModes.subheading')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
        {learningModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeClick(mode.route)}
            className={`
              group relative flex flex-col items-center text-center p-4 sm:p-5 md:p-6
              rounded-2xl border border-stone-800/50
              bg-gradient-to-br ${mode.gradient}
              backdrop-blur-sm
              transition-all duration-300 ease-out
              hover:border-stone-700/50 hover:scale-[1.02] hover:-translate-y-1
              hover:shadow-lg hover:shadow-black/20
              active:scale-[0.98]
            `}
          >
            <span className="text-3xl sm:text-4xl mb-3 transform transition-transform duration-300 group-hover:scale-110">
              {mode.icon}
            </span>
            <h3 className="text-stone-200 font-semibold text-sm sm:text-base mb-1.5">
              {mode.title}
            </h3>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
              {mode.description}
            </p>

            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
