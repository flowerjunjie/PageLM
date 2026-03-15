import { useState } from "react"
import { useTranslation } from "react-i18next"
import { smartnotesStart, connectSmartnotesStream, type SmartNotesEvent } from "../../lib/api"
import ErrorAlert from "../ErrorAlert"

export default function SmartNotes() {
  const { t } = useTranslation('tools')
  const [topic, setTopic] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [filePath, setFilePath] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string } | null>(null)

  const onGenerate = async () => {
    if (!topic.trim() || busy) return
    setBusy(true)
    setError(null)
    setStatus(t('smartNotes.status.starting'))
    setFilePath(null)

    try {
      const { noteId } = await smartnotesStart({ topic })
      const { close } = connectSmartnotesStream(noteId, (ev: SmartNotesEvent) => {
        if (ev.type === "phase") setStatus(`${t('smartNotes.status.status')}: ${ev.value}`)
        if (ev.type === "file") { setFilePath(ev.file); setStatus(t('smartNotes.status.ready')) }
        if (ev.type === "done") { setStatus(t('smartNotes.status.done')); close(); setBusy(false) }
        if (ev.type === "error") {
          setError({ message: ev.error || t('smartNotes.status.failed') })
          setStatus(t('smartNotes.status.error'))
          close(); setBusy(false)
        }
      })
    } catch (e: any) {
      setError({ message: e.message || t('smartNotes.status.failed') })
      setBusy(false)
    }
  }

  return (
    <div className="group rounded-2xl bg-stone-950 border border-zinc-800 p-4 hover:border-sky-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs uppercase tracking-wide text-blue-400 font-semibold">{t('smartNotes.tag')}</div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 animate-pulse"></div>
          </div>
          <div className="text-white font-semibold text-xl mb-2">{t('smartNotes.title')}</div>
          <div className="text-stone-300 text-sm leading-relaxed">
            {t('smartNotes.description')}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('smartNotes.topicPlaceholder')}
              className="w-full px-4 py-3 pr-16 rounded-xl bg-stone-900/70 border border-zinc-700 text-white placeholder-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all duration-300"
              onKeyDown={(e) => e.key === "Enter" && onGenerate()}
              disabled={busy}
            />
          </div>
          <button
            onClick={onGenerate}
            disabled={busy || !topic.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all duration-300 flex items-center gap-2"
          >
            {busy ? (
              <>
                <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('smartNotes.generating')}
              </>
            ) : (
              t('smartNotes.generate')
            )}
          </button>
        </div>

        {error && (
          <ErrorAlert
            type="tools"
            message={error.message}
            onRetry={() => onGenerate()}
            onDismiss={() => setError(null)}
          />
        )}

        {status && !error && (
          <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/40 text-sky-200 font-medium">{status}</div>
        )}

        {filePath && (
          <a
            href={filePath}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-center"
          >
            {t('smartNotes.download')}
          </a>
        )}
      </div>
    </div>
  )
}