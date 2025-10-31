import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useSettings } from './SettingsProvider'
import { createNotification } from '../utils/notifications'
import { useRewards } from './RewardsProvider'

type TimerState = 'idle' | 'focus' | 'break'

type PomodoroData = {
    state: TimerState
    focusDuration: number
    breakDuration: number
    timeRemaining: number
    isRunning: boolean
}

type PomodoroContextValue = {
    pomodoro: PomodoroData
    setFocusDuration: (minutes: number) => void
    setBreakDuration: (minutes: number) => void
    startTimer: () => void
    pauseTimer: () => void
    resetTimer: () => void
    skipToBreak: () => void
    setExactSession: (state: 'focus' | 'break', seconds: number) => void
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null)
const STORAGE_KEY = 'pomodoroState'

async function getStored<T>(key: string): Promise<T | null> {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            return new Promise((resolve) => {
                chrome.storage.local.get([key], (res) => resolve(res[key] ?? null))
            })
        } else {
            const raw = localStorage.getItem(key)
            return raw ? (JSON.parse(raw) as T) : null
        }
    } catch {
        return null
    }
}

async function setStored<T>(key: string, value: T): Promise<void> {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: value }, () => resolve())
            })
        } else {
            localStorage.setItem(key, JSON.stringify(value))
        }
    } catch { }
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSettings()
    const { earn } = useRewards()
    const [pomodoro, setPomodoro] = useState<PomodoroData>({
        state: 'idle',
        focusDuration: 25,
        breakDuration: 5,
        timeRemaining: 25 * 60,
        isRunning: false
    })

    const intervalRef = useRef<number | null>(null)

    useEffect(() => {
        let mounted = true
            ; (async () => {
                const stored = await getStored<PomodoroData>(STORAGE_KEY)
                if (mounted && stored) {
                    setPomodoro(stored)
                }
            })()
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        setStored(STORAGE_KEY, pomodoro)
    }, [pomodoro])

    useEffect(() => {
        if (pomodoro.isRunning) {
            intervalRef.current = window.setInterval(() => {
                setPomodoro((prev) => {
                    if (prev.timeRemaining <= 1) {
                        if (prev.state === 'focus') {
                            // Earn tokens on focus completion
                            if (settings.rewardsEnabled) {
                                const sessionMinutes = prev.focusDuration
                                const tokens = Math.max(1, Math.round(sessionMinutes / 5)) // ~1 per 5 minutes
                                earn(tokens, 'focus_session_complete', { minutes: sessionMinutes })
                            }
                            if (settings.notifications.timerAlerts) {
                                createNotification('pibble_timer_focus_done', 'Focus complete', 'Great work! Time for a break.')
                            }
                            return {
                                ...prev,
                                state: 'break',
                                timeRemaining: prev.breakDuration * 60,
                                isRunning: false
                            }
                        } else if (prev.state === 'break') {
                            if (settings.notifications.timerAlerts) {
                                createNotification('pibble_timer_break_done', 'Break ended', 'Ready to start your next focus session?')
                            }
                            return {
                                ...prev,
                                state: 'idle',
                                timeRemaining: prev.focusDuration * 60,
                                isRunning: false
                            }
                        }
                    }
                    return {
                        ...prev,
                        timeRemaining: prev.timeRemaining - 1
                    }
                })
            }, 1000)
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [pomodoro.isRunning])

    const setFocusDuration = (minutes: number) => {
        setPomodoro((prev) => ({
            ...prev,
            focusDuration: minutes,
            timeRemaining: prev.state === 'idle' ? minutes * 60 : prev.timeRemaining
        }))
    }

    const setBreakDuration = (minutes: number) => {
        setPomodoro((prev) => ({
            ...prev,
            breakDuration: minutes
        }))
    }

    const startTimer = () => {
        setPomodoro((prev) => {
            if (prev.state === 'idle') {
                return {
                    ...prev,
                    state: 'focus',
                    timeRemaining: prev.focusDuration * 60,
                    isRunning: true
                }
            }
            return { ...prev, isRunning: true }
        })
    }

    const pauseTimer = () => {
        setPomodoro((prev) => ({ ...prev, isRunning: false }))
    }

    const resetTimer = () => {
        setPomodoro((prev) => ({
            ...prev,
            state: 'idle',
            timeRemaining: prev.focusDuration * 60,
            isRunning: false
        }))
    }

    const skipToBreak = () => {
        setPomodoro((prev) => ({
            ...prev,
            state: 'break',
            timeRemaining: prev.breakDuration * 60,
            isRunning: false
        }))
    }

    const setExactSession = (state: 'focus' | 'break', seconds: number) => {
        setPomodoro(prev => {
            const max = state === 'focus' ? prev.focusDuration * 60 : prev.breakDuration * 60
            const clamped = Math.max(1, Math.min(seconds, max))
            return { ...prev, state, timeRemaining: clamped, isRunning: false }
        })
    }

    return (
        <PomodoroContext.Provider
            value={{
                pomodoro,
                setFocusDuration,
                setBreakDuration,
                startTimer,
                pauseTimer,
                resetTimer,
                skipToBreak,
                setExactSession
            }}
        >
            {children}
        </PomodoroContext.Provider>
    )
}

export function usePomodoro() {
    const ctx = useContext(PomodoroContext)
    if (!ctx) throw new Error('usePomodoro must be used inside PomodoroProvider')
    return ctx
}