import React, { useRef, useEffect, useState } from 'react'
import { usePet } from '../providers/PetProvider'
import { useUser } from '../providers/UserProvider'
import { IoStar, IoRestaurant, IoHeart, IoLockClosed, IoClose } from 'react-icons/io5'
import './styles/petStyles.css'
import CoinTracker from './CoinTracker'

export default function Pet() {
  const { pet, setPet, calculateLevel, setState } = usePet()
  const { user, spendCoins, purchaseRoom, hasRoom } = useUser()
  const { state, name, experience, hungerLevel, happinessLevel } = pet

  const feedTimerRef = useRef<number | null>(null)
  const bathTimerRef = useRef<number | null>(null)
  const [view, setView] = useState<'stats' | 'room'>('stats')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    return () => {
      if (feedTimerRef.current) clearTimeout(feedTimerRef.current)
      if (bathTimerRef.current) clearTimeout(bathTimerRef.current)
    }
  }, [])

  const showError = (message: string) => {
    setErrorMessage(message)
    setTimeout(() => setErrorMessage(''), 3000)
  }

  const handleFeed = () => {
    if (!spendCoins(5)) {
      showError('Not enough coins! Need 5 coins.')
      return
    }

    const switching = state !== 'happy'
    if (switching) {
      if (bathTimerRef.current) {
        clearTimeout(bathTimerRef.current)
        bathTimerRef.current = null
      }
      setState('happy')
    }
    setPet(p => ({
      ...p,
      lastFed: new Date().toISOString(),
      lastPetted: new Date().toISOString(),
      hungerLevel: Math.min(100, p.hungerLevel + 20),
      experience: p.experience + 10,
      happinessLevel: Math.min(100, p.happinessLevel + 10)
    }))
    if (feedTimerRef.current) clearTimeout(feedTimerRef.current)
    feedTimerRef.current = window.setTimeout(() => {
      setState('neutral')
      feedTimerRef.current = null
    }, 3000)
  }

  const handleBath = () => {
    if (!spendCoins(5)) {
      showError('Not enough coins! Need 5 coins.')
      return
    }

    const switching = state !== 'bathing'
    if (switching) {
      if (feedTimerRef.current) {
        clearTimeout(feedTimerRef.current)
        feedTimerRef.current = null
      }
      setState('bathing')
    }
    setPet(p => ({
      ...p,
      lastPetted: new Date().toISOString(),
      happinessLevel: Math.min(100, p.happinessLevel + 25),
      experience: p.experience + 10
    }))
    if (bathTimerRef.current) clearTimeout(bathTimerRef.current)
    bathTimerRef.current = window.setTimeout(() => {
      setState('neutral')
      bathTimerRef.current = null
    }, 3000)
  }

  const getExpForLevel = (lvl: number): number => {
    if (lvl <= 1) return 0
    if (lvl === 2) return 50
    if (lvl === 3) return 150
    if (lvl === 4) return 300
    return 450 + (lvl - 5) * 150
  }

  const level = calculateLevel(experience)
  const expToNextLevel = getExpForLevel(level + 1) - getExpForLevel(level)
  const currentLevelExp = experience - getExpForLevel(level)
  const expPercentage = Math.max(0, Math.min(100, (currentLevelExp / expToNextLevel) * 100))

  const safeHappiness = Math.max(0, Math.min(100, happinessLevel))

  const rooms = [
    { id: 'room', name: 'Default', image: '/assets/room.png', cost: 0 },
    { id: 'pink-room', name: 'Pink', image: '/assets/pink-room.png', cost: 50 },
    { id: 'space-room', name: 'Space', image: '/assets/space-room.png', cost: 150 }
  ]

  const [selectedRoom, setSelectedRoom] = useState('room')

  const handleRoomSelect = (roomId: string, cost: number) => {
    if (hasRoom(roomId)) {
      setSelectedRoom(roomId)
      setPet(p => ({ ...p, room: roomId }))
    } else {
      // Try to purchase
      if (purchaseRoom(roomId, cost)) {
        setSelectedRoom(roomId)
        setPet(p => ({ ...p, room: roomId }))
      } else {
        showError(`Not enough coins! Need ${cost} coins.`)
      }
    }
  }

  return (
    <div className="pet-container">
      <CoinTracker />
      {errorMessage && (
        <div className="error-overlay">
          <div className="error-popup">
            <button className="error-close" onClick={() => setErrorMessage('')}>
              <IoClose />
            </button>
            <div className="error-icon">
              <img src="/assets/token.png" alt="coin" />
            </div>
            <p className="error-message">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="pet-header">
        <div className="pet-name">
          {name} lvl.{level}
        </div>
      </div>
      <div className="pet-room" style={{ backgroundImage: `url('${rooms.find(r => r.id === selectedRoom)?.image}')` }}>
        <img
          src={`/assets/pibble_${state}.png`}
          alt="Pibble"
          className={`pet-image pet-image-${state}`}
        />
        <div className="action-container">
          <div className="action-item">
            <img
              src="/assets/food.png"
              alt="Food"
              className="action-icon"
              onClick={handleFeed}
            />
            <div className="token-cost">
              <span>5</span>
              <img src="/assets/token.png" alt="tokens" className="token-icon" />
            </div>
          </div>
          <div className="action-item">
            <img
              src="/assets/bath.png"
              alt="Bath"
              className="action-icon"
              onClick={handleBath}
            />
            <div className="token-cost">
              <span>5</span>
              <img src="/assets/token.png" alt="tokens" className="token-icon" />
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-panel">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === 'stats' ? 'active' : ''}`}
            onClick={() => setView('stats')}
          >
            Stats
          </button>
          <button
            className={`toggle-btn ${view === 'room' ? 'active' : ''}`}
            onClick={() => setView('room')}
          >
            Room
          </button>
        </div>

        {view === 'stats' ? (
          <div className="progress-bars">
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <linearGradient id="expGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#80c2ff" />
                  <stop offset="50%" stopColor="#6eb4ff" />
                  <stop offset="100%" stopColor="#80c2ff" />
                </linearGradient>
                <linearGradient id="hungerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffb385" />
                  <stop offset="50%" stopColor="#ffa570" />
                  <stop offset="100%" stopColor="#ffb385" />
                </linearGradient>
                <linearGradient id="happinessGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffb5d4" />
                  <stop offset="50%" stopColor="#ff9ec7" />
                  <stop offset="100%" stopColor="#ffb5d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="progress-container">
              <IoHeart className="progress-icon happiness-icon" />
              <div className="progress-bar happiness-bar" style={{ width: `${safeHappiness}%` }} />
            </div>
            <div className="progress-container">
              <IoRestaurant className="progress-icon hunger-icon" />
              <div className="progress-bar hunger-bar" style={{ width: `${hungerLevel}%` }} />
            </div>
            <div className="progress-container">
              <IoStar className="progress-icon exp-icon" />
              <div className="progress-bar exp-bar" style={{ width: `${expPercentage}%` }} />
            </div>
          </div>
        ) : (
          <div className="room-selector">
            <div className="room-grid">
              {rooms.map(room => {
                const isOwned = hasRoom(room.id)
                const isSelected = selectedRoom === room.id

                return (
                  <div
                    key={room.id}
                    className={`room-option ${isSelected ? 'selected' : ''} ${!isOwned ? 'locked' : ''}`}
                    onClick={() => handleRoomSelect(room.id, room.cost)}
                  >
                    <div className="room-preview" style={{ backgroundImage: `url('${room.image}')` }}>
                      {!isOwned && (
                        <div className="room-lock-overlay">
                          <IoLockClosed className="lock-icon" />
                        </div>
                      )}
                    </div>
                    {!isOwned ? (
                      <div className="room-cost">
                        <span>{room.cost}</span>
                        <img src="/assets/token.png" alt="coins" className="token-icon" />
                      </div>
                    ) : (
                      <span className="room-name">{room.name}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}