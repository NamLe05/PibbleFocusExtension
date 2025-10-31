import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRewards } from './RewardsProvider'

type Task = {
    id: string
    title: string
    completed: boolean
    createdAt: string
}

type TaskContextValue = {
    tasks: Task[]
    addTask: (title: string) => void
    toggleTask: (id: string) => void
    removeTask: (id: string) => void
    clearAll: () => void
}

const TaskContext = createContext<TaskContextValue | null>(null)
const STORAGE_KEY = 'taskList'

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

export function TaskProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([])
    const { earn } = useRewards()

    useEffect(() => {
        let mounted = true
            ; (async () => {
                const stored = await getStored<Task[]>(STORAGE_KEY)
                if (mounted && stored) setTasks(stored)
            })()
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        setStored(STORAGE_KEY, tasks)
    }, [tasks])

    const addTask = (title: string) => {
        const newTask: Task = {
            id: Date.now().toString(),
            title: title.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        }
        setTasks((prev) => [...prev, newTask])
    }

    const toggleTask = (id: string) => {
        const target = tasks.find(t => t.id === id)
        const wasCompleted = target?.completed ?? false
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
        if (!wasCompleted && target) {
            // Award a small token bonus for completing a task
            earn(2, 'task_completed', { id: target.id, title: target.title })
        }
    }

    const removeTask = (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id))
    }

    const clearAll = () => {
        setTasks([])
    }

    return (
        <TaskContext.Provider value={{ tasks, addTask, toggleTask, removeTask, clearAll }}>
            {children}
        </TaskContext.Provider>
    )
}

export function useTask() {
    const ctx = useContext(TaskContext)
    if (!ctx) throw new Error('useTask must be used inside TaskProvider')
    return ctx
}