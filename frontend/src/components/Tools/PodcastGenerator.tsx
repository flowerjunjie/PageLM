import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { podcastStart, connectPodcastStream, type PodcastEvent } from "../../lib/api"
import ErrorAlert from "../ErrorAlert"

export default function PodcastGenerator() {
  const { t } = useTranslation('tools')
  const location = useLocation()
  const [topic, setTopic] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [audioFile, setAudioFile] = useState<string | null>(null)
  const [audioFilename, setAudioFilename] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string } | null>(null)

  useEffect(() => {
    // Check if we were navigated here with a podcast already started
    if (location.state?.podcastPid) {
      const { podcastPid, podcastTopic } = location.state
      setTopic(podcastTopic || "")
      setBusy(true)
      setStatus(t('podcastGenerator.status.connecting'))

      // Connect to the existing podcast stream
      const { close } = connectPodcastStream(podcastPid, (ev: PodcastEvent) => {
        if (ev.type === "ready") {
          setStatus(t('podcastGenerator.status.connected'))
        }
        if (ev.type === "phase") {
          setStatus(`${t('podcastGenerator.status.status')}: ${ev.value}`)
        }
        if (ev.type === "script") {
          setStatus(t('podcastGenerator.status.scriptGenerated'))
        }
        if (ev.type === "audio") {
          const audioUrl = ev.file || ev.staticUrl || ""
          setAudioFile(audioUrl)
          setAudioFilename(ev.filename || "podcast.mp3")
          setStatus(t('podcastGenerator.status.audioReady'))
        }
        if (ev.type === "done") {
          setStatus(t('podcastGenerator.status.done'))
          setBusy(false)
          setTimeout(() => {
            close()
          }, 1000)
        }
        if (ev.type === "error") {
          setError({ message: ev.error || t('podcastGenerator.status.failed') })
          setStatus(t('podcastGenerator.status.error'))
          close()
          setBusy(false)
        }
      })

      const timeout = setTimeout(() => {
        setError({ message: t('podcastGenerator.status.timeout') })
        setStatus(t('podcastGenerator.status.error'))
        setBusy(false)
        close()
      }, 120000)

      return () => {
        clearTimeout(timeout)
        close()
      }
    }
  }, [location.state, t])

  const onGenerate = async () => {
    if (!topic.trim() || busy) return

    setError(null)
    setBusy(true)
    setStatus(t('podcastGenerator.status.starting'))
    setAudioFile(null)
    setAudioFilename(null)

    try {
      const { pid } = await podcastStart({ topic })

      await new Promise(resolve => setTimeout(resolve, 100))

      const { close } = connectPodcastStream(pid, (ev: PodcastEvent) => {
        if (ev.type === "ready") {
          setStatus(t('podcastGenerator.status.connected'))
        }
        if (ev.type === "phase") {
          setStatus(`${t('podcastGenerator.status.status')}: ${ev.value}`)
        }
        if (ev.type === "script") {
          setStatus(t('podcastGenerator.status.scriptGenerated'))
        }
        if (ev.type === "audio") {
          const audioUrl = ev.file || ev.staticUrl || ""

          setAudioFile(audioUrl)
          setAudioFilename(ev.filename || "podcast.mp3")
          setStatus(t('podcastGenerator.status.audioReady'))
        }
        if (ev.type === "done") {
          setStatus(t('podcastGenerator.status.done'))
          setBusy(false)
          setTimeout(() => {
            close()
          }, 1000)
        }
        if (ev.type === "error") {
          setError({ message: ev.error || t('podcastGenerator.status.failed') })
          setStatus(t('podcastGenerator.status.error'))
          close()
          setBusy(false)
        }
      })

      const timeout = setTimeout(() => {
        setError({ message: t('podcastGenerator.status.timeout') })
        setStatus(t('podcastGenerator.status.error'))
        setBusy(false)
        close()
      }, 120000)

      const originalClose = close
      const closeWithCleanup = () => {
        clearTimeout(timeout)
        originalClose()
      }

      return { close: closeWithCleanup }
    } catch (e: unknown) {
      setStatus((e as Error).message || t('podcastGenerator.status.failed'))
      setBusy(false)
    }
  }

  return (
    <div className="group rounded-2xl bg-stone-950 border border-zinc-800 p-4 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs uppercase tracking-wide text-purple-400 font-semibold">{t('podcastGenerator.tag')}</div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse"></div>
          </div>
          <div className="text-white font-semibold text-xl mb-2">{t('podcastGenerator.title')}</div>
          <div className="text-stone-300 text-sm leading-relaxed">
            {t('podcastGenerator.description')}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('podcastGenerator.topicPlaceholder')}
              className="w-full px-4 py-3 pr-16 rounded-xl bg-stone-900/70 border border-zinc-700 text-white placeholder-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-300"
              onKeyDown={(e) => e.key === "Enter" && onGenerate()}
            />
          </div>
          <button
            onClick={onGenerate}
            disabled={busy || !topic.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all duration-300 flex items-center gap-2"
          >
            {busy ? (
              <>
                <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('podcastGenerator.generating')}
              </>
            ) : (
              t('podcastGenerator.generate')
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
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-200 font-medium">
            {status}
            <div className="text-xs mt-2 opacity-70">
              {t('podcastGenerator.debug.audioFile')}: {audioFile ? t('podcastGenerator.debug.set') : t('podcastGenerator.debug.notSet')} |
              {t('podcastGenerator.debug.busy')}: {busy ? t('podcastGenerator.debug.yes') : t('podcastGenerator.debug.no')}
            </div>
          </div>
        )}

        {audioFile && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-stone-900/70 border border-zinc-700">
              <div className="text-sm text-stone-400 mb-2">{t('podcastGenerator.play')}:</div>
              <audio
                controls
                className="w-full"
                src={audioFile}
              >
                {t('podcastGenerator.noAudioSupport')}
              </audio>
            </div>

            <a
              href={audioFile}
              download={audioFilename || "podcast.mp3"}
              className="block p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-center transition-all duration-300 shadow-lg hover:shadow-emerald-500/20"
            >
              {t('podcastGenerator.download')}
            </a>
          </div>
        )}

        {!audioFile && !busy && (
          <div className="text-xs text-stone-500 text-center p-2">
            {t('podcastGenerator.clickToGenerate')}
          </div>
        )}
      </div>
    </div>
  )
}