import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface ShareReportModalProps {
  isOpen: boolean
  onClose: () => void
  shareUrl: string
}

export default function ShareReportModal({ isOpen, onClose, shareUrl }: ShareReportModalProps) {
  const { t } = useTranslation('reports')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCopied(false)
    }
  }, [isOpen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h2 className="text-lg font-semibold text-stone-100">
            {t('share.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-stone-400 text-sm mb-4">
            {t('share.description')}
          </p>

          {/* Share URL */}
          <div className="mb-6">
            <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-300 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-stone-100 text-stone-900 hover:bg-stone-200'
                }`}
              >
                {copied ? t('share.copied') : t('share.copy')}
              </button>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="text-center">
            <label className="text-xs text-stone-500 uppercase tracking-wider mb-3 block">
              {t('share.qrCode')}
            </label>
            <div className="inline-block p-4 bg-white rounded-xl">
              {/* Simple QR code placeholder using CSS pattern */}
              <div className="w-32 h-32 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* QR Code pattern simulation */}
                  <rect x="0" y="0" width="30" height="30" fill="#000" />
                  <rect x="5" y="5" width="20" height="20" fill="#fff" />
                  <rect x="10" y="10" width="10" height="10" fill="#000" />

                  <rect x="70" y="0" width="30" height="30" fill="#000" />
                  <rect x="75" y="5" width="20" height="20" fill="#fff" />
                  <rect x="80" y="10" width="10" height="10" fill="#000" />

                  <rect x="0" y="70" width="30" height="30" fill="#000" />
                  <rect x="5" y="75" width="20" height="20" fill="#fff" />
                  <rect x="10" y="80" width="10" height="10" fill="#000" />

                  {/* Random data pattern */}
                  <rect x="35" y="5" width="5" height="5" fill="#000" />
                  <rect x="45" y="5" width="5" height="5" fill="#000" />
                  <rect x="55" y="10" width="5" height="5" fill="#000" />
                  <rect x="35" y="15" width="5" height="5" fill="#000" />
                  <rect x="50" y="20" width="5" height="5" fill="#000" />

                  <rect x="5" y="35" width="5" height="5" fill="#000" />
                  <rect x="15" y="40" width="5" height="5" fill="#000" />
                  <rect x="25" y="35" width="5" height="5" fill="#000" />
                  <rect x="10" y="50" width="5" height="5" fill="#000" />
                  <rect x="20" y="55" width="5" height="5" fill="#000" />

                  <rect x="35" y="35" width="30" height="30" fill="#000" />
                  <rect x="40" y="40" width="20" height="20" fill="#fff" />
                  <rect x="45" y="45" width="10" height="10" fill="#000" />

                  <rect x="75" y="35" width="5" height="5" fill="#000" />
                  <rect x="85" y="40" width="5" height="5" fill="#000" />
                  <rect x="70" y="50" width="5" height="5" fill="#000" />
                  <rect x="80" y="55" width="5" height="5" fill="#000" />

                  <rect x="35" y="70" width="5" height="5" fill="#000" />
                  <rect x="45" y="75" width="5" height="5" fill="#000" />
                  <rect x="55" y="70" width="5" height="5" fill="#000" />
                  <rect x="40" y="85" width="5" height="5" fill="#000" />
                  <rect x="50" y="80" width="5" height="5" fill="#000" />

                  <rect x="70" y="70" width="5" height="5" fill="#000" />
                  <rect x="80" y="75" width="5" height="5" fill="#000" />
                  <rect x="90" y="70" width="5" height="5" fill="#000" />
                  <rect x="75" y="85" width="5" height="5" fill="#000" />
                  <rect x="85" y="90" width="5" height="5" fill="#000" />
                </svg>
              </div>
            </div>
          </div>

          {/* Expiration notice */}
          <p className="text-center text-stone-500 text-xs mt-4">
            {t('share.expiresIn')}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm transition-colors"
          >
            {t('share.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
