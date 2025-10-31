import React, { useCallback } from 'react'
import { useSettings } from '../providers/SettingsProvider'

export default function Settings() {
    const { settings, setSettings } = useSettings()

    const update = useCallback(<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }, [setSettings])

    return (
        <div style={{ padding: 12 }}>

            <section className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: '0 0 8px 0' }}>Notifications</h3>
                <ToggleRow
                    label="Timer alerts"
                    checked={settings.notifications.timerAlerts}
                    onChange={(v) => update('notifications', { ...settings.notifications, timerAlerts: v })}
                />
                <ToggleRow
                    label="Reward unlocks"
                    checked={settings.notifications.rewardUnlocks}
                    onChange={(v) => update('notifications', { ...settings.notifications, rewardUnlocks: v })}
                />
                <ToggleRow
                    label="Pibble is sad reminders"
                    checked={settings.notifications.petSadReminders}
                    onChange={(v) => update('notifications', { ...settings.notifications, petSadReminders: v })}
                />
            </section>

            <section className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: '0 0 8px 0' }}>Rewards</h3>
                <ToggleRow
                    label="Enable rewards system"
                    checked={settings.rewardsEnabled}
                    onChange={(v) => update('rewardsEnabled', v)}
                />
                <RewardsBalance />
            </section>
        </div>
    )
}

function ToggleRow({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderTop: '1px solid var(--border)'
        }}>
            <span style={{ color: 'var(--text-primary)' }}>{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </label>
    )
}

function RewardsBalance() {
    // Lazy import to avoid circulars if we add more later
    const BalanceInner = React.useMemo(() => {
        return function Inner() {
            // dynamic import-like separation avoided; use a simple event bridge soon
            // We will read from window if provider not present yet
            // At this point, RewardsProvider will supply context
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { useRewards } = require('../providers/RewardsProvider') as typeof import('../providers/RewardsProvider')
                const { state } = useRewards()
                return (
                    <div style={{
                        marginTop: 8,
                        padding: '8px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        color: 'var(--text-primary)'
                    }}>
                        Balance: {Math.floor(state.balance)} Pibbles
                    </div>
                )
            } catch {
                return null
            }
        }
    }, [])
    return <BalanceInner />
}


