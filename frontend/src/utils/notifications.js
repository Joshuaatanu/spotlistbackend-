/**
 * Browser Push Notification utilities
 */

/**
 * Request notification permission from the user
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * Send a browser notification for a completed job
 * @param {Object} job - The completed job object
 */
export function sendJobNotification(job) {
    if (Notification.permission !== 'granted') {
        return;
    }

    const spotsCount = job.result_metadata?.total_spots || 0;

    const title = 'Data Collection Complete';
    const options = {
        body: `"${job.job_name}" finished! ${spotsCount.toLocaleString()} spots collected.`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `job-${job.id}`,
        requireInteraction: false,
        silent: false,
    };

    try {
        const notification = new Notification(title, options);

        // Focus window when clicked
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

/**
 * Send a notification for a failed job
 * @param {Object} job - The failed job object
 */
export function sendJobFailedNotification(job) {
    if (Notification.permission !== 'granted') {
        return;
    }

    const title = 'Data Collection Failed';
    const options = {
        body: `"${job.job_name}" failed: ${job.error_message || 'Unknown error'}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `job-failed-${job.id}`,
        requireInteraction: false,
    };

    try {
        const notification = new Notification(title, options);
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        setTimeout(() => notification.close(), 10000);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

/**
 * Check if notifications are supported and enabled
 * @returns {boolean}
 */
export function notificationsEnabled() {
    return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Check if notifications are supported
 * @returns {boolean}
 */
export function notificationsSupported() {
    return 'Notification' in window;
}

/**
 * Get current notification permission status
 * @returns {string} 'granted', 'denied', or 'default'
 */
export function getNotificationPermission() {
    if (!('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}
