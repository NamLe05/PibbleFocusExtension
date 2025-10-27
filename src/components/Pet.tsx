import React, { useRef, useEffect } from 'react'
import { usePet } from '../providers/PetProvider'
import { IoStar, IoRestaurant, IoHeart } from 'react-icons/io5'
import './styles/petStyles.css'

export default function Pet() {
  const { pet, setPet, calculateLevel, setState } = usePet()
  const { state, name, experience, hungerLevel, happinessLevel } = pet

  const feedTimerRef = useRef<number | null>(null)
  const bathTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (feedTimerRef.current) clearTimeout(feedTimerRef.current)
      if (bathTimerRef.current) clearTimeout(bathTimerRef.current)
    }
  }, [])

  const handleFeed = () => {
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
      lastPetted: new Date().toISOString(), // reset happiness decay baseline
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
      lastPetted: new Date().toISOString(), // helps happiness decay logic
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

  const safeHappiness = Math.max(0, Math.min(100, happinessLevel)) // clamp for renderingl) * 100))

  return (
    <div className="pet-container">
      <div className="pet-name">
        {name} lvl.{level}
      </div>
      <div className="pet-room">
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
    </div>
  )
}