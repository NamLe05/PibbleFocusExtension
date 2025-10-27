import React from 'react'
import { IoSettingsOutline, IoChatbubbleEllipsesOutline, IoPawOutline, IoAlarmOutline, IoBrowsersOutline } from 'react-icons/io5'

type Tab = 'pet' | 'chat' | 'settings' | 'pomodoro'

interface NavigationProps {
    activeTab: Tab
    setActiveTab: (tab: Tab) => void
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
    return (
        <div className="nav-container">
            <button
                className={`nav-button ${activeTab === 'pet' ? 'active' : ''}`}
                onClick={() => setActiveTab('pet')}
            >
                <IoPawOutline size={20} />
            </button>
            <button
                className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
            >
                <IoChatbubbleEllipsesOutline size={20} />
            </button>
            <button
                className={`nav-button ${activeTab === 'pomodoro' ? 'active' : ''}`}
                onClick={() => setActiveTab('pomodoro')}
            >
                <IoAlarmOutline size={20} />
            </button>
            <button
                className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
            >
                <IoSettingsOutline size={20} />
            </button>
            <button
                className="nav-button"
                onClick={() => {
                    // Optional: ping to verify background is awake
                    chrome.runtime.sendMessage({ type: 'PING_BG' }, (resp) => {
                        if (!resp?.ok) console.warn('[Nav] BG ping failed (check background.js built and reloaded)');
                    });
                    chrome.runtime.sendMessage({ type: 'TOGGLE_PET_OVERLAY' }, (resp) => {
                        if (!resp?.ok) console.warn('[Nav] overlay inject failed:', resp?.error);
                    });
                }}
                title="Open Pet Overlay in current tab"
            >
                <IoBrowsersOutline size={20} />
            </button>
        </div>
    )
}