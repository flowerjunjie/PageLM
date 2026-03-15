/**
 * Language utility functions for internationalization
 */

export type SupportedLanguage = 'en' | 'zh-CN';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文' },
};

/**
 * Get the current language from localStorage
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  const stored = localStorage.getItem('pagelm_language');
  if (stored === 'en' || stored === 'zh-CN') {
    return stored;
  }
  return 'en'; // Default to English
};

/**
 * Set the current language and store in localStorage
 */
export const setCurrentLanguage = (lang: SupportedLanguage): void => {
  localStorage.setItem('pagelm_language', lang);
};

/**
 * Get the browser's preferred language
 */
export const getBrowserLanguage = (): SupportedLanguage => {
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
};

/**
 * Toggle between English and Chinese
 */
export const toggleLanguage = (): SupportedLanguage => {
  const current = getCurrentLanguage();
  const next: SupportedLanguage = current === 'en' ? 'zh-CN' : 'en';
  setCurrentLanguage(next);
  return next;
};

/**
 * Format a date according to the current language
 */
export const formatDate = (date: Date, language: SupportedLanguage): string => {
  return date.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format a number according to the current language
 */
export const formatNumber = (num: number, language: SupportedLanguage): string => {
  return num.toLocaleString(language === 'zh-CN' ? 'zh-CN' : 'en-US');
};
