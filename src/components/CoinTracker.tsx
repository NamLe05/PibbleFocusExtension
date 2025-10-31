import { useUser } from '../providers/UserProvider'
import '../styles.css'

interface CoinTrackerProps {
    className?: string
}

export default function CoinTracker({ className = '' }: CoinTrackerProps) {
    const { user } = useUser()

    return (
        <div className={`coin-tracker ${className}`}>
            <span className="coin-tracker-amount">{user.coins}</span>
            <img src="/assets/token.png" alt="coins" className="coin-tracker-icon" />
        </div>
    )
}