import React from 'react'
import { useRewards } from '../providers/RewardsProvider'
import { useSettings } from '../providers/SettingsProvider'

export default function Rewards() {
    const { state } = useRewards()
    const { settings } = useSettings()

    if (!settings.rewardsEnabled) {
        return (
            <div style={{ padding: 12 }}>
                <div className="card" style={{ color: 'var(--text-primary)' }}>
                    Rewards are disabled in Settings.
                </div>
            </div>
        )
    }

    return (
        <div style={{ padding: 12 }}>
            <section className="card" style={{ marginBottom: 12, color: 'var(--text-primary)' }}>
                <h3 style={{ margin: '0 0 6px 0' }}>Balance</h3>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{Math.floor(state.balance)} Pibbles</div>
            </section>
            <section className="card" style={{ color: 'var(--text-primary)' }}>
                <h3 style={{ margin: '0 0 6px 0' }}>Recent activity</h3>
                {state.ledger.length === 0 ? (
                    <div style={{ opacity: 0.7 }}>No activity yet. Complete a focus session to earn tokens.</div>
                ) : (
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {state.ledger.slice(0, 20).map((e) => {
                            const label = friendlyReason(e.reason, e.metadata)
                            const when = new Date(e.timestamp).toLocaleTimeString()
                            const amt = `${e.type === 'earn' ? '+' : '-'}${e.amount}`
                            return (
                                <div key={e.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '6px 0',
                                    borderTop: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600 }}>{label}</span>
                                        <span style={{ opacity: 0.7, fontSize: 12 }}>{when}</span>
                                    </div>
                                    <span style={{ fontWeight: 700, color: e.type === 'earn' ? '#2e7d32' : '#b00020' }}>{amt}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}

function friendlyReason(reason: string, metadata?: Record<string, unknown>) {
    switch (reason) {
        case 'pet_level_up':
            return 'Level up!'
        case 'task_completed': {
            const title = typeof metadata?.title === 'string' && metadata.title.trim() ? `: ${(metadata.title as string).trim()}` : ''
            return `Task completed${title}`
        }
        case 'focus_session_complete': {
            const minutes = typeof metadata?.minutes === 'number' ? metadata.minutes : undefined
            return minutes ? `Focus session complete (${minutes} min)` : 'Focus session complete'
        }
        default:
            return reason.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    }
}


