import { useState, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { chatAskOnce } from "../../lib/api"

interface HomeworkCameraProps {
    onClose: () => void
    onCapture: (result: { text: string; parsedHomework?: any }) => void
}

export default function HomeworkCamera({ onClose, onCapture }: HomeworkCameraProps) {
    const { t } = useTranslation('planner')
    const [mode, setMode] = useState<'camera' | 'upload'>('upload')
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [ocrResult, setOcrResult] = useState<string | null>(null)
    const [parsedResult, setParsedResult] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
            setMode('camera')
        } catch (err) {
            setError(t('camera.errorNoCamera', { defaultValue: '无法访问相机，请使用上传功能' }))
            setMode('upload')
        }
    }, [t])

    // Stop camera
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }, [stream])

    // Capture photo from camera
    const capturePhoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
                setPreview(dataUrl)
                stopCamera()
            }
        }
    }, [stopCamera])

    // Handle file upload
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError(t('camera.errorFileTooLarge', { defaultValue: '文件大小不能超过10MB' }))
                return
            }
            const reader = new FileReader()
            reader.onload = (event) => {
                setPreview(event.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    // Perform OCR on the image
    const performOCR = async () => {
        if (!preview) return

        setLoading(true)
        setError(null)

        try {
            // Convert data URL to file
            const response = await fetch(preview)
            const blob = await response.blob()
            const file = new File([blob], 'homework.jpg', { type: 'image/jpeg' })

            // Use AI to extract text from image
            const result = await chatAskOnce({
                q: t('camera.ocrPrompt', {
                    defaultValue: '请识别这张作业图片中的所有文字内容，包括题目、要求、截止时间等信息。请以纯文本格式返回识别结果，保持原有格式。'
                }),
                files: [file]
            })

            setOcrResult(result.answer)

            // Parse the homework
            await parseHomework(result.answer)
        } catch (err) {
            setError(t('camera.errorOCR', { defaultValue: '识别失败，请重试' }))
        } finally {
            setLoading(false)
        }
    }

    // Parse homework using backend API
    const parseHomework = async (text: string) => {
        try {
            const response = await fetch('/api/planner/parse-homework', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            })

            if (!response.ok) {
                throw new Error('Failed to parse homework')
            }

            const data = await response.json()
            if (data.ok) {
                setParsedResult(data)
            }
        } catch (err) {
            console.error('Parse homework error:', err)
        }
    }

    // Create task from parsed homework
    const createTask = async () => {
        if (!parsedResult?.homework) return

        setLoading(true)
        try {
            const hw = parsedResult.homework
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `${hw.title} - ${hw.description || ''}`,
                    title: hw.title,
                    subject: hw.subject,
                    type: hw.type,
                    dueAt: hw.dueAt,
                    estMins: hw.estMins,
                    priority: hw.priority === 'high' ? 5 : hw.priority === 'medium' ? 3 : 1,
                    relatedTopics: hw.relatedTopics
                })
            })

            if (!response.ok) {
                throw new Error('Failed to create task')
            }

            const data = await response.json()
            if (data.ok) {
                onCapture({ text: ocrResult || '', parsedHomework: parsedResult })
            }
        } catch (err) {
            setError(t('camera.errorCreateTask', { defaultValue: '创建任务失败' }))
        } finally {
            setLoading(false)
        }
    }

    // Retake photo
    const retake = () => {
        setPreview(null)
        setOcrResult(null)
        setParsedResult(null)
        setError(null)
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-zinc-100 font-medium">
                        {t('camera.title', { defaultValue: '拍照添加作业' })}
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {!preview ? (
                        // Camera/Upload selection
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setMode('upload')}
                                    className={`flex-1 py-3 rounded-lg border ${mode === 'upload' ? 'bg-zinc-800 border-zinc-600' : 'border-zinc-700'}`}
                                >
                                    <div className="text-2xl mb-1">📁</div>
                                    <div className="text-zinc-300 text-sm">{t('camera.upload', { defaultValue: '上传图片' })}</div>
                                </button>
                                <button
                                    onClick={startCamera}
                                    className={`flex-1 py-3 rounded-lg border ${mode === 'camera' ? 'bg-zinc-800 border-zinc-600' : 'border-zinc-700'}`}
                                >
                                    <div className="text-2xl mb-1">📷</div>
                                    <div className="text-zinc-300 text-sm">{t('camera.takePhoto', { defaultValue: '拍照' })}</div>
                                </button>
                            </div>

                            {mode === 'camera' && stream ? (
                                <div className="relative">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full rounded-lg bg-black"
                                    />
                                    <button
                                        onClick={capturePhoto}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-zinc-300"
                                    />
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-500"
                                >
                                    <div className="text-4xl mb-2">📄</div>
                                    <div className="text-zinc-300">
                                        {t('camera.dropzone', { defaultValue: '点击或拖拽上传作业图片' })}
                                    </div>
                                    <div className="text-zinc-500 text-sm mt-1">
                                        {t('camera.supportedFormats', { defaultValue: '支持 JPG, PNG, WEBP 格式' })}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        // Preview and OCR results
                        <div className="space-y-4">
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Captured homework"
                                    className="w-full rounded-lg max-h-64 object-contain bg-black"
                                />
                                <button
                                    onClick={retake}
                                    className="absolute top-2 right-2 px-3 py-1 bg-zinc-800/90 rounded text-sm text-zinc-200"
                                >
                                    {t('camera.retake', { defaultValue: '重拍' })}
                                </button>
                            </div>

                            {!ocrResult ? (
                                <button
                                    onClick={performOCR}
                                    disabled={loading}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                                >
                                    {loading
                                        ? t('camera.recognizing', { defaultValue: '识别中...' })
                                        : t('camera.startRecognition', { defaultValue: '开始识别' })
                                    }
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-zinc-800 rounded-lg p-3">
                                        <div className="text-zinc-400 text-xs mb-2">
                                            {t('camera.recognizedText', { defaultValue: '识别结果' })}
                                        </div>
                                        <div className="text-zinc-200 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                                            {ocrResult}
                                        </div>
                                    </div>

                                    {parsedResult?.homework && (
                                        <div className="bg-zinc-800 rounded-lg p-3">
                                            <div className="text-zinc-400 text-xs mb-2">
                                                {t('camera.parsedInfo', { defaultValue: '解析信息' })}
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">{t('task.title', { defaultValue: '标题' })}</span>
                                                    <span className="text-zinc-200">{parsedResult.homework.title}</span>
                                                </div>
                                                {parsedResult.homework.subject && (
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-500">{t('task.subject', { defaultValue: '科目' })}</span>
                                                        <span className="text-zinc-200">{parsedResult.homework.subject}</span>
                                                    </div>
                                                )}
                                                {parsedResult.homework.dueAt && (
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-500">{t('task.due', { defaultValue: '截止时间' })}</span>
                                                        <span className="text-zinc-200">
                                                            {new Date(parsedResult.homework.dueAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {parsedResult.homework.estMins && (
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-500">{t('task.estimatedTime', { defaultValue: '预估时间' })}</span>
                                                        <span className="text-zinc-200">{parsedResult.homework.estMins} 分钟</span>
                                                    </div>
                                                )}
                                                {parsedResult.homework.priority && (
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-500">{t('task.priority', { defaultValue: '优先级' })}</span>
                                                        <span className={`${
                                                            parsedResult.homework.priority === 'high' ? 'text-red-400' :
                                                            parsedResult.homework.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                                                        }`}>
                                                            {parsedResult.homework.priority === 'high' ? '高' :
                                                             parsedResult.homework.priority === 'medium' ? '中' : '低'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {parsedResult.schedule && parsedResult.schedule.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-zinc-700">
                                                    <div className="text-zinc-400 text-xs mb-2">
                                                        {t('camera.suggestedSchedule', { defaultValue: '建议学习计划' })}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {parsedResult.schedule.map((item: any, i: number) => (
                                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                                <span className="text-zinc-500">{item.date}</span>
                                                                <span className="text-zinc-400">{item.timeRange}</span>
                                                                <span className="text-zinc-300 flex-1">{item.task}</span>
                                                                <span className="text-zinc-500">{item.estimatedMinutes}m</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={createTask}
                                        disabled={loading || !parsedResult?.homework}
                                        className="w-full py-3 bg-green-600 text-white rounded-lg disabled:opacity-50"
                                    >
                                        {loading
                                            ? t('camera.creating', { defaultValue: '创建中...' })
                                            : t('camera.createTask', { defaultValue: '创建任务' })
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    )
}
