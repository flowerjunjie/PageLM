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

import zhCommon from '../locales/zh-CN/common.json';
import zhNavigation from '../locales/zh-CN/navigation.json';
import zhChat from '../locales/zh-CN/chat.json';
import zhQuiz from '../locales/zh-CN/quiz.json';
import zhPlanner from '../locales/zh-CN/planner.json';
import zhTools from '../locales/zh-CN/tools.json';
import zhLanding from '../locales/zh-CN/landing.json';

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
      },
      'zh-CN': {
        common: zhCommon,
        navigation: zhNavigation,
        chat: zhChat,
        quiz: zhQuiz,
        planner: zhPlanner,
        tools: zhTools,
        landing: zhLanding,
      },
    },
    fallbackLng: 'en', // Use English if translation is missing
    defaultNS: 'common', // Default namespace
    ns: ['common', 'navigation', 'chat', 'quiz', 'planner', 'tools', 'landing'],
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
