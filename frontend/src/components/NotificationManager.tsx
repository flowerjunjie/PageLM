import { useEffect, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"

interface NotificationSettings {
    browserEnabled: boolean
    reminderHoursBefore: number[]
    soundEnabled: boolean
}

export default function NotificationManager() {
    const { t } = useTranslation('common')
    const [permission, setPermission] = useState<NotificationPermission>("default")
    const [settings, setSettings] = useState<NotificationSettings>({
        browserEnabled: true,
        reminderHoursBefore: [24, 2],
        soundEnabled: true
    })
    const [showSettings, setShowSettings] = useState(false)
    const [notifications, setNotifications] = useState<Array<{
        id: string
        title: string
        message: string
        timestamp: number
    }>>([])

    // Check notification permission on mount
    useEffect(() => {
        if ("Notification" in window) {
            setPermission(Notification.permission)
        }
    }, [])

    // Request notification permission
    const requestPermission = useCallback(async () => {
        if (!("Notification" in window)) {
            return
        }

        try {
            const result = await Notification.requestPermission()
            setPermission(result)

            if (result === "granted") {
                // Show a test notification
                new Notification(t('notifications.enabled', { defaultValue: '通知已启用' }), {
                    body: t('notifications.testMessage', { defaultValue: '您将收到作业截止提醒' }),
                    icon: '/favicon.ico'
                })
            }
        } catch (error) {
            console.error("Failed to request notification permission:", error)
        }
    }, [t])

    // Test notification
    const testNotification = useCallback(() => {
        if (permission === "granted") {
            new Notification(t('notifications.testTitle', { defaultValue: '测试通知' }), {
                body: t('notifications.testBody', { defaultValue: '这是一条测试通知' }),
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            })
        }
    }, [permission, t])

    // Update settings
    const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
        setSettings(prev => {
            const newSettings = { ...prev, ...updates }
            // Save to localStorage
            localStorage.setItem('notificationSettings', JSON.stringify(newSettings))
            return newSettings
        })
    }, [])

    // Load settings from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('notificationSettings')
        if (saved) {
            try {
                setSettings(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse notification settings:", e)
            }
        }
    }, [])

    // Listen for browser notifications from WebSocket
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'browser.notification' && permission === 'granted') {
                    new Notification(data.title, {
                        body: data.message,
                        icon: '/favicon.ico',
                        badge: '/favicon.ico',
                        tag: data.taskId || 'default'
                    })

                    // Add to notification list
                    setNotifications(prev => [{
                        id: Date.now().toString(),
                        title: data.title,
                        message: data.message,
                        timestamp: Date.now()
                    }, ...prev.slice(0, 9)])

                    // Play sound if enabled
                    if (settings.soundEnabled) {
                        playNotificationSound()
                    }
                }
            } catch (e) {
                // Ignore non-JSON messages
            }
        }

        // This assumes the WebSocket is connected elsewhere and we can listen to it
        // In practice, you might want to pass the WebSocket instance as a prop
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [permission, settings.soundEnabled])

    // Play notification sound
    const playNotificationSound = () => {
        const audio = new Audio('/notification-sound.mp3')
        audio.volume = 0.5
        audio.play().catch(() => {
            // Ignore autoplay errors
        })
    }

    // If notifications are not supported
    if (!("Notification" in window)) {
        return (
            <div className="text-zinc-500 text-sm">
                {t('notifications.notSupported', { defaultValue: '您的浏览器不支持通知功能' })}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Permission Status */}
            <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                        permission === 'granted' ? 'bg-green-500' :
                        permission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                        <div className="text-zinc-200 text-sm">
                            {permission === 'granted'
                                ? t('notifications.statusEnabled', { defaultValue: '通知已启用' })
                                : permission === 'denied'
                                    ? t('notifications.statusDenied', { defaultValue: '通知被阻止' })
                                    : t('notifications.statusDefault', { defaultValue: '通知未启用' })}
                        </div>
                        <div className="text-zinc-500 text-xs">
                            {permission === 'granted'
                                ? t('notifications.enabledDescription', { defaultValue: '您将收到作业提醒' })
                                : permission === 'denied'
                                    ? t('notifications.deniedDescription', { defaultValue: '请在浏览器设置中允许通知' })
                                    : t('notifications.defaultDescription', { defaultValue: '启用通知以接收作业提醒' })}
                        </div>
                    </div>
                </div>
                {permission !== 'granted' && permission !== 'denied' && (
                    <button
                        onClick={requestPermission}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                        {t('notifications.enable', { defaultValue: '启用' })}
                    </button>
                )}
                {permission === 'granted' && (
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-200 text-sm rounded hover:bg-zinc-700"
                    >
                        {t('common.settings', { defaultValue: '设置', ns: 'common' })}
                    </button>
                )}
            </div>

            {/* Settings Panel */}
            {showSettings && permission === 'granted' && (
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 space-y-4">
                    <h4 className="text-zinc-200 font-medium">
                        {t('notifications.settings', { defaultValue: '通知设置' })}
                    </h4>

                    {/* Browser Notifications Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-zinc-300 text-sm">
                                {t('notifications.browserNotifications', { defaultValue: '浏览器通知' })}
                            </div>
                            <div className="text-zinc-500 text-xs">
                                {t('notifications.browserDescription', { defaultValue: '在浏览器中显示通知' })}
                            </div>
                        </div>
                        <button
                            onClick={() => updateSettings({ browserEnabled: !settings.browserEnabled })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                                settings.browserEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                settings.browserEnabled ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                        </button>
                    </div>

                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-zinc-300 text-sm">
                                {t('notifications.sound', { defaultValue: '提示音' })}
                            </div>
                            <div className="text-zinc-500 text-xs">
                                {t('notifications.soundDescription', { defaultValue: '收到通知时播放提示音' })}
                            </div>
                        </div>
                        <button
                            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                                settings.soundEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                        </button>
                    </div>

                    {/* Reminder Times */}
                    <div>
                        <div className="text-zinc-300 text-sm mb-2">
                            {t('notifications.reminderTimes', { defaultValue: '提醒时间' })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 6, 12, 24].map(hours => (
                                <button
                                    key={hours}
                                    onClick={() => {
                                        const current = settings.reminderHoursBefore
                                        const updated = current.includes(hours)
                                            ? current.filter(h => h !== hours)
                                            : [...current, hours].sort((a, b) => b - a)
                                        updateSettings({ reminderHoursBefore: updated })
                                    }}
                                    className={`px-3 py-1 rounded text-sm ${
                                        settings.reminderHoursBefore.includes(hours)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-zinc-800 text-zinc-400'
                                    }`}
                                >
                                    {hours} {t('notifications.hoursBefore', { defaultValue: '小时前' })}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Test Button */}
                    <button
                        onClick={testNotification}
                        className="w-full py-2 bg-zinc-800 text-zinc-200 rounded hover:bg-zinc-700"
                    >
                        {t('notifications.test', { defaultValue: '发送测试通知' })}
                    </button>
                </div>
            )}

            {/* Recent Notifications */}
            {notifications.length > 0 && (
                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                    <h4 className="text-zinc-200 font-medium text-sm mb-2">
                        {t('notifications.recent', { defaultValue: '最近通知' })}
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {notifications.map(notif => (
                            <div key={notif.id} className="bg-zinc-800 rounded p-2 text-sm">
                                <div className="text-zinc-200 font-medium">{notif.title}</div>
                                <div className="text-zinc-400 text-xs">{notif.message}</div>
                                <div className="text-zinc-500 text-[10px] mt-1">
                                    {new Date(notif.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Hook to use notification settings
export function useNotificationSettings() {
    const [settings, setSettings] = useState<NotificationSettings>({
        browserEnabled: true,
        reminderHoursBefore: [24, 2],
        soundEnabled: true
    })

    useEffect(() => {
        const saved = localStorage.getItem('notificationSettings')
        if (saved) {
            try {
                setSettings(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse notification settings:", e)
            }
        }
    }, [])

    return settings
}
