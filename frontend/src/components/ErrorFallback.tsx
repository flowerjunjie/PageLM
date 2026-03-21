import { useTranslation } from 'react-i18next'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
}

export default function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const { t } = useTranslation('common')

  const handleReset = () => {
    if (resetError) {
      resetError()
    } else {
      window.location.reload()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="text-6xl mb-6" role="img" aria-label="Error icon">
          😵
        </div>

        {/* Error Heading */}
        <h1 className="text-2xl font-bold text-white mb-3">
          {t('errors.somethingWentWrong', 'Something went wrong')}
        </h1>

        {/* Error Description */}
        <p className="text-stone-400 mb-8">
          {t('errors.tryRefresh', 'Please try refreshing the page')}
        </p>

        {/* Error Details */}
        {error && (
          <details className="bg-stone-900/50 border border-stone-800 rounded-xl p-4 mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-stone-300 hover:text-white transition-colors select-none">
              {t('errors.showDetails', 'Show error details')}
            </summary>
            <div className="mt-3 p-3 bg-stone-950/50 rounded-lg overflow-x-auto">
              <p className="text-red-400 text-sm font-mono break-all whitespace-pre-wrap">
                {error.name}: {error.message}
              </p>
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-stone-950"
            aria-label={t('errors.retryAction', 'Try again')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-5"
            >
              <path
                fillRule="evenodd"
                d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
                clipRule="evenodd"
              />
            </svg>
            <span>{t('errors.refreshPage', 'Refresh Page')}</span>
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 focus:ring-offset-stone-950"
            aria-label={t('errors.goHome', 'Go to home page')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-5"
            >
              <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
              <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
            </svg>
            <span>{t('errors.goHome', 'Home')}</span>
          </a>
        </div>
      </div>
    </div>
  )
}
