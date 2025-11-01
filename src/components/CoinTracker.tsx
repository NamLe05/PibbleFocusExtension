import { useUser } from '../providers/UserProvider'
import React, { useEffect, useRef, useState } from 'react'
import '../styles.css'

interface CoinTrackerProps {
    className?: string
    coinDelta?: number
}

export default function CoinTracker({ className = '', coinDelta = 0 }: CoinTrackerProps) {
    const { user } = useUser()
    const [showDelta, setShowDelta] = useState(false)
    const [delta, setDelta] = useState(0)
    const prevCoins = useRef(user.coins)

    useEffect(() => {
        if (user.coins > prevCoins.current) {
            setDelta(user.coins - prevCoins.current)
            setShowDelta(true)
            setTimeout(() => setShowDelta(false), 1200)
        }
        prevCoins.current = user.coins
    }, [user.coins])

    return (
        <div className={`coin-tracker ${className}`}>
            <span className="coin-tracker-amount">{user.coins}</span>
            <img src="/assets/token.png" alt="coins" className="coin-tracker-icon" />
            {showDelta && (
                <span className="coin-delta-emit">
                    +{delta}
                    <img src="/assets/token.png" alt="coins" className="coin-tracker-icon" />
                </span>
            )}
        </div>
    )
}