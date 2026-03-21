import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '../hooks/useTheme'
import Tooltip from './Tooltip'

export default function ThemeToggle() {
  const { t } = useTranslation('common')
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themes: { value: Theme; icon: string; label: string }[] = [
    {
      value: 'light',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
      </svg>`,
      label: t('lightMode')
    },
    {
      value: 'dark',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
        <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clip-rule="evenodd" />
      </svg>`,
      label: t('darkMode')
    },
    {
      value: 'auto',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
        <path fill-rule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436a.75.75 0 01-.912-1.186c3.355-2.602 5.546-6.483 5.946-10.722-4.24.4-8.12 2.591-10.722 5.946a.75.75 0 11-1.186-.912c.741-.954 1.585-1.817 2.506-2.574l-.734-.734a.75.75 0 011.06-1.06l.734.734zM7.068 17.25a.75.75 0 01-.72.548A8.97 8.97 0 013 12a9 9 0 019-9 8.97 8.97 0 015.798 3.348.75.75 0 01-.548.72 7.502 7.502 0 00-5.25 5.25.75.75 0 01-.548.548l-1.324.378a.75.75 0 00-.502.502l-.378 1.324z" clip-rule="evenodd" />
      </svg>`,
      label: t('auto')
    }
  ]

  const currentTheme = themes.find((t) => t.value === theme) || themes[2]

  return (
    <div className="relative">
      <Tooltip content={currentTheme.label} delay={500}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl duration-300 transition-all active:scale-95 hover:bg-stone-900/50 text-stone-400"
          aria-label={t('ariaLabels.theme', 'Theme')}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <span dangerouslySetInnerHTML={{ __html: currentTheme.icon }} />
        </button>
      </Tooltip>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div
            className="absolute bottom-full left-0 mb-2 z-50 bg-stone-950/95 backdrop-blur-xl border border-stone-800 rounded-xl shadow-xl overflow-hidden min-w-[140px]"
            role="menu"
            aria-label={t('ariaLabels.themeMenu', 'Theme menu')}
          >
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  theme === themeOption.value
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-400 hover:bg-stone-900/50 hover:text-stone-200'
                }`}
                role="menuitemradio"
                aria-checked={theme === themeOption.value}
              >
                <span dangerouslySetInnerHTML={{ __html: themeOption.icon }} />
                <span>{themeOption.label}</span>
                {theme === themeOption.value && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-4 ml-auto"
                  >
                    <path
                      fillRule="evenodd"
                      d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
