import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
import enChat from '../locales/en/chat.json';
import enQuiz from '../locales/en/quiz.json';
import enPlanner from '../locales/en/planner.json';
import enTools from '../locales/en/tools.json';
import enLanding from '../locales/en/landing.json';
import enErrors from '../locales/en/errors.json';
import enOnboarding from '../locales/en/onboarding.json';
import enShare from '../locales/en/share.json';
import enShortcuts from '../locales/en/shortcuts.json';
import enDebate from '../locales/en/debate.json';
import enFlashcards from '../locales/en/flashcards.json';
import enExamlab from '../locales/en/examlab.json';
import enHelp from '../locales/en/help.json';
import enLearning from '../locales/en/learning.json';
import enReview from '../locales/en/review.json';
import enReports from '../locales/en/reports.json';

import zhCommon from '../locales/zh-CN/common.json';
import zhNavigation from '../locales/zh-CN/navigation.json';
import zhChat from '../locales/zh-CN/chat.json';
import zhQuiz from '../locales/zh-CN/quiz.json';
import zhPlanner from '../locales/zh-CN/planner.json';
import zhTools from '../locales/zh-CN/tools.json';
import zhLanding from '../locales/zh-CN/landing.json';
import zhErrors from '../locales/zh-CN/errors.json';
import zhOnboarding from '../locales/zh-CN/onboarding.json';
import zhShare from '../locales/zh-CN/share.json';
import zhShortcuts from '../locales/zh-CN/shortcuts.json';
import zhDebate from '../locales/zh-CN/debate.json';
import zhFlashcards from '../locales/zh-CN/flashcards.json';
import zhExamlab from '../locales/zh-CN/examlab.json';
import zhHelp from '../locales/zh-CN/help.json';
import zhLearning from '../locales/zh-CN/learning.json';
import zhReview from '../locales/zh-CN/review.json';
import zhReports from '../locales/zh-CN/reports.json';

// Configure i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: {
        common: enCommon,
        navigation: enNavigation,
        chat: enChat,
        quiz: enQuiz,
        planner: enPlanner,
        tools: enTools,
        landing: enLanding,
        errors: enErrors,
        onboarding: enOnboarding,
        share: enShare,
        shortcuts: enShortcuts,
        debate: enDebate,
        flashcards: enFlashcards,
        examlab: enExamlab,
        help: enHelp,
        learning: enLearning,
        review: enReview,
        reports: enReports,
      },
      'zh-CN': {
        common: zhCommon,
        navigation: zhNavigation,
        chat: zhChat,
        quiz: zhQuiz,
        planner: zhPlanner,
        tools: zhTools,
        landing: zhLanding,
        errors: zhErrors,
        onboarding: zhOnboarding,
        share: zhShare,
        shortcuts: zhShortcuts,
        debate: zhDebate,
        flashcards: zhFlashcards,
        examlab: zhExamlab,
        help: zhHelp,
        learning: zhLearning,
        review: zhReview,
        reports: zhReports,
      },
    },
    fallbackLng: 'en', // Use English if translation is missing
    defaultNS: 'common', // Default namespace
    ns: ['common', 'navigation', 'chat', 'quiz', 'planner', 'tools', 'landing', 'errors', 'onboarding', 'share', 'shortcuts', 'debate', 'flashcards', 'examlab', 'help', 'learning', 'review', 'reports'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'pagelm_language',
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for simpler integration
    },
  });

export default i18n;
