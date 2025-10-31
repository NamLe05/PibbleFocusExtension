import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useSettings } from './SettingsProvider'
import { createNotification } from '../utils/notifications'

export type LedgerEntry = {
    id: string
    type: 'earn' | 'spend'
    amount: number
    reason: string
    timestamp: number
    metadata?: Record<string, unknown>
}

export type RewardsState = {
    balance: number
    lifetimeEarned: number
    streak: {
        current: number
        longest: number
        lastDate: string // YYYY-MM-DD
    }
    ledger: LedgerEntry[]
}

type RewardsContextValue = {
    state: RewardsState
    earn: (amount: number, reason: string, metadata?: Record<string, unknown>) => void
    spend: (amount: number, reason: string, metadata?: Record<string, unknown>) => boolean
}

const DEFAULT_STATE: RewardsState = {
    balance: 0,
    lifetimeEarned: 0,
    streak: { current: 0, longest: 0, lastDate: '' },
    ledger: []
}

const STORAGE_KEY = 'pibble_rewards'

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

const RewardsContext = createContext<RewardsContextValue | null>(null)

export function RewardsProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSettings()
    const [state, setState] = useState<RewardsState>(DEFAULT_STATE)

    // Load state
    useEffect(() => {
        let mounted = true
            ; (async () => {
                const stored = await getStored<RewardsState>(STORAGE_KEY)
                if (mounted && stored) setState({ ...DEFAULT_STATE, ...stored })
            })()
        return () => { mounted = false }
    }, [])

    // Persist state
    useEffect(() => {
        setStored(STORAGE_KEY, state)
    }, [state])

    const earn = (amount: number, reason: string, metadata?: Record<string, unknown>) => {
        if (!settings.rewardsEnabled) return
        if (amount <= 0) return
        setState(prev => {
            const entry: LedgerEntry = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                type: 'earn', amount, reason, timestamp: Date.now(), metadata
            }
            const next: RewardsState = {
                ...prev,
                balance: prev.balance + amount,
                lifetimeEarned: prev.lifetimeEarned + amount,
                ledger: [entry, ...prev.ledger].slice(0, 500)
            }
            // Simple milestone notification
            if (settings.notifications.rewardUnlocks) {
                const milestones = [20, 50, 100, 200, 500]
                const crossed = milestones.find(m => prev.balance < m && next.balance >= m)
                if (crossed !== undefined) {
                    createNotification('pibble_reward_milestone', 'Milestone reached!', `You now have ${Math.floor(next.balance)} Pibbles!`)
                }
            }
            return next
        })
    }

    const spend = (amount: number, reason: string, metadata?: Record<string, unknown>) => {
        if (amount <= 0) return false
        let success = false
        setState(prev => {
            if (prev.balance < amount) return prev
            success = true
            const entry: LedgerEntry = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                type: 'spend', amount, reason, timestamp: Date.now(), metadata
            }
            return {
                ...prev,
                balance: prev.balance - amount,
                ledger: [entry, ...prev.ledger].slice(0, 500)
            }
        })
        return success
    }

    const value = useMemo<RewardsContextValue>(() => ({ state, earn, spend }), [state])

    return (
        <RewardsContext.Provider value={value}>
            {children}
        </RewardsContext.Provider>
    )
}

export function useRewards() {
    const ctx = useContext(RewardsContext)
    if (!ctx) throw new Error('useRewards must be used inside RewardsProvider')
    return ctx
}


