import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UserState {
    coins: number
    ownedRooms: string[]
}

interface UserContextType {
    user: UserState
    setUser: React.Dispatch<React.SetStateAction<UserState>>
    addCoins: (amount: number) => void
    spendCoins: (amount: number) => boolean
    purchaseRoom: (roomId: string, cost: number) => boolean
    hasRoom: (roomId: string) => boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const USER_STORAGE_KEY = 'pibble-user-state'

const defaultUserState: UserState = {
    coins: 300, // Starting coins
    ownedRooms: ['room'] // Default room is owned
}

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserState>(() => {
        try {
            const saved = localStorage.getItem(USER_STORAGE_KEY)
            if (saved) {
                return JSON.parse(saved) as UserState
            }
        } catch (error) {
            console.error('Failed to load user state:', error)
        }
        return defaultUserState
    })

    // Sync coins from chrome.storage.local on mount
    useEffect(() => {
        chrome.storage.local.get(['user'], (data) => {
            if (data.user && typeof data.user.coins === 'number') {
                setUser((prev) => ({ ...prev, coins: data.user.coins }))
            }
        })
    }, [])

    useEffect(() => {
        try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
            chrome.storage.local.set({ user })
        } catch (error) {
            console.error('Failed to save user state:', error)
        }
    }, [user])

    useEffect(() => {
        function handleStorageChange(changes: any, area: string) {
            if (area === 'local' && changes.user) {
                setUser(changes.user.newValue)
            }
        }
        chrome.storage.onChanged.addListener(handleStorageChange)
        return () => chrome.storage.onChanged.removeListener(handleStorageChange)
    }, [])

    const addCoins = (amount: number) => {
        setUser(prev => ({
            ...prev,
            coins: prev.coins + amount
        }))
    }

    const spendCoins = (amount: number): boolean => {
        if (user.coins >= amount) {
            setUser(prev => ({
                ...prev,
                coins: prev.coins - amount
            }))
            return true
        }
        return false
    }

    const purchaseRoom = (roomId: string, cost: number): boolean => {
        if (user.ownedRooms.includes(roomId)) {
            return false // Already owned
        }

        if (user.coins >= cost) {
            setUser(prev => ({
                ...prev,
                coins: prev.coins - cost,
                ownedRooms: [...prev.ownedRooms, roomId]
            }))
            return true
        }
        return false
    }

    const hasRoom = (roomId: string): boolean => {
        return user.ownedRooms.includes(roomId)
    }

    return (
        <UserContext.Provider value={{ user, setUser, addCoins, spendCoins, purchaseRoom, hasRoom }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    const context = useContext(UserContext)
    if (!context) {
        throw new Error('useUser must be used within UserProvider')
    }
    return context
}