import React, { createContext, useContext, useEffect, useState } from 'react'

export type Settings = {
    notifications: {
        timerAlerts: boolean
        rewardUnlocks: boolean
        petSadReminders: boolean
    }
    rewardsEnabled: boolean
}

type SettingsContextValue = {
    settings: Settings
    setSettings: React.Dispatch<React.SetStateAction<Settings>>
}

const DEFAULT_SETTINGS: Settings = {
    notifications: {
        timerAlerts: true,
        rewardUnlocks: true,
        petSadReminders: true
    },
    rewardsEnabled: true
}

const STORAGE_KEY = 'pibble_settings'

async function getStored<T>(key: string): Promise<T | null> {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
            return new Promise((resolve) => {
                chrome.storage.sync.get([key], (res) => resolve(res[key] ?? null))
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
        if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
            return new Promise((resolve) => {
                chrome.storage.sync.set({ [key]: value }, () => resolve())
            })
        } else {
            localStorage.setItem(key, JSON.stringify(value))
        }
    } catch { }
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

    // Load settings
    useEffect(() => {
        let mounted = true
            ; (async () => {
                const stored = await getStored<Settings>(STORAGE_KEY)
                if (mounted && stored) setSettings({ ...DEFAULT_SETTINGS, ...stored })
            })()
        return () => { mounted = false }
    }, [])

    // Persist settings
    useEffect(() => {
        setStored(STORAGE_KEY, settings)
    }, [settings])

    // No theme switching for now

    return (
        <SettingsContext.Provider value={{ settings, setSettings }}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const ctx = useContext(SettingsContext)
    if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
    return ctx
}


