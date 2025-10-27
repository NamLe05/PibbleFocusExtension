import React, { createContext, useContext, useEffect, useState } from 'react'

type PetState = 'neutral' | 'happy' | 'sad' | 'bathing' | 'eating'

type PetData = {
    state: PetState
    name: string
    hungerLevel: number // 0-100
    happinessLevel: number // 0-100
    lastFed: string // ISO date string
    lastPetted: string // ISO date string
    experience: number
}

type PetContextValue = {
    pet: PetData
    setPet: React.Dispatch<React.SetStateAction<PetData>>
    calculateLevel: (exp: number) => number
    updateHappiness: (amount: number) => void
    setState: (newState: PetState) => void
}

const PetContext = createContext<PetContextValue | null>(null)
const STORAGE_KEY = 'petState'

const HAPPINESS_DECAY_RATE = 15 // Amount happiness decreases per hour
const HUNGER_DECAY_RATE = 20 // Amount hunger decreases per hour

const calculateLevel = (exp: number): number => {
    if (exp < 50) return 1
    if (exp < 150) return 2
    if (exp < 300) return 3
    if (exp < 450) return 4
    return Math.floor((exp - 450) / 150) + 5
}

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
    } catch {
        /* ignore */
    }
}

export function PetProvider({ children }: { children: React.ReactNode }) {
    const [pet, setPet] = useState<PetData>({
        state: 'neutral',
        name: 'Pibble',
        hungerLevel: 100,
        happinessLevel: 100,
        lastFed: new Date().toISOString(),
        lastPetted: new Date().toISOString(),
        experience: 0
    })

    // Load saved state
    useEffect(() => {
        let mounted = true
            ; (async () => {
                const stored = await getStored<PetData>(STORAGE_KEY)
                if (mounted && stored) setPet(stored)
            })()
        return () => { mounted = false }
    }, [])

    // Save state changes
    useEffect(() => {
        setStored(STORAGE_KEY, pet)
    }, [pet])

    // Happiness and hunger decay over time
    useEffect(() => {
        let last = Date.now()
        const tick = () => {
            const now = Date.now()
            const deltaHours = (now - last) / (1000 * 60 * 60)
            last = now
            setPet(prev => {
                const happinessLevel = Math.max(0, prev.happinessLevel - HAPPINESS_DECAY_RATE * deltaHours)
                const hungerLevel = Math.max(0, prev.hungerLevel - HUNGER_DECAY_RATE * deltaHours)
                return {
                    ...prev,
                    happinessLevel,
                    hungerLevel,
                    state: happinessLevel < 30 || hungerLevel < 30 ? 'sad' : prev.state
                }
            })
        }
        const id = setInterval(tick, 60000)
        return () => clearInterval(id)
    }, [])

    const updateHappiness = (amount: number) => {
        setPet(prev => ({
            ...prev,
            happinessLevel: Math.min(100, Math.max(0, prev.happinessLevel + amount)),
            lastPetted: new Date().toISOString(),
            state: amount > 0 ? 'happy' : prev.state
        }))
    }

    const setState = (newState: PetState) => {
        setPet(prev => ({
            ...prev,
            state: newState
        }))

        // Reset state to previous after animations
        if (newState === 'eating' || newState === 'bathing') {
            setTimeout(() => {
                setPet(prev => ({
                    ...prev,
                    state: prev.happinessLevel >= 30 ? 'neutral' : 'sad'
                }))
            }, 3000)
        }
    }

    return (
        <PetContext.Provider value={{
            pet,
            setPet,
            calculateLevel,
            updateHappiness,
            setState
        }}>
            {children}
        </PetContext.Provider>
    )
}

export function usePet() {
    const ctx = useContext(PetContext)
    if (!ctx) throw new Error('usePet must be used inside PetProvider')
    return ctx
}