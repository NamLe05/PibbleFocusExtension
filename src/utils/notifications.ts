/* global chrome */

export function createNotification(id: string, title: string, message: string) {
    try {
        if (!chrome?.notifications?.create) return
        chrome.notifications.create(id, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title,
            message,
            priority: 1
        })
    } catch { }
}


