import { useTranslation } from 'react-i18next';
import { setCurrentLanguage, toggleLanguage, SUPPORTED_LANGUAGES } from '../i18n/utils';
import type { SupportedLanguage } from '../i18n/utils';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as SupportedLanguage;

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleToggle = () => {
    const newLang = toggleLanguage();
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-800/50 hover:bg-stone-700/50 transition-colors text-sm"
      title={`Switch to ${currentLang === 'en' ? '中文' : 'English'}`}
    >
      <span className="text-stone-400">
        {currentLang === 'en' ? '🇺🇸' : '🇨🇳'}
      </span>
      <span className="text-stone-300 font-medium">
        {currentLang === 'en' ? 'EN' : '中文'}
      </span>
    </button>
  );
}
