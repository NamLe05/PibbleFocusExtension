import React, { useState } from 'react'
import { PetProvider } from './providers/PetProvider'
import { PomodoroProvider } from './providers/PomodoroProvider'
import { TaskProvider } from './providers/TaskProvider'
import Pet from './components/Pet'
import Chat from './components/Chat'
import Pomodoro from './components/Pomodoro'
import Navigation from './components/Navigation'
import Rewards from './components/Rewards'
import Settings from './components/Settings'
import { SettingsProvider } from './providers/SettingsProvider'
import { RewardsProvider } from './providers/RewardsProvider'
import './styles.css'

type Tab = 'pet' | 'chat' | 'settings' | 'pomodoro' | 'rewards'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('pet')

  const renderContent = () => {
    switch (activeTab) {
      case 'pet':
        return <Pet />
      case 'chat':
        return <Chat />
      case 'pomodoro':
        return <Pomodoro />
      case 'rewards':
        return <Rewards />
      case 'settings':
        return <Settings />
    }
  }

  return (
    <div className="app">
      <SettingsProvider>
        <RewardsProvider>
          <PetProvider>
            <PomodoroProvider>
              <TaskProvider>
                <main>
                  {renderContent()}
                </main>
                <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
              </TaskProvider>
            </PomodoroProvider>
          </PetProvider>
        </RewardsProvider>
      </SettingsProvider>
    </div>
  )
}