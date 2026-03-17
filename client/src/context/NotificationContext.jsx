import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { playNotificationSound } from '../utils/notificationSound';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

const MAX_NOTIFICATIONS = 50;

// Request browser notification permission
const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
};

// Send a browser notification
const sendBrowserNotification = (title, body, icon = '📚') => {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `studysync-${Date.now()}`,
                silent: true, // We play our own sound
            });
        } catch (e) {
            // Notification API not supported in this context
        }
    }
};

export const NotificationProvider = ({ children }) => {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const currentPathRef = useRef(window.location.pathname);

    // Track current path to avoid notifying about the group the user is currently viewing
    useEffect(() => {
        const updatePath = () => {
            currentPathRef.current = window.location.pathname;
        };
        // Listen for route changes
        window.addEventListener('popstate', updatePath);
        // Also check periodically for SPA navigation
        const interval = setInterval(updatePath, 1000);
        return () => {
            window.removeEventListener('popstate', updatePath);
            clearInterval(interval);
        };
    }, []);

    // Request browser notification permission on mount
    useEffect(() => {
        requestPermission();
    }, []);

    // Add a notification
    const addNotification = useCallback(({ type, title, body, groupId, groupName, sendBrowser = true, playSound = true }) => {
        const notif = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            type, // 'message' | 'call' | 'whiteboard' | 'group' | 'system'
            title,
            body,
            groupId,
            groupName,
            timestamp: Date.now(),
            read: false,
        };

        setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
        setUnreadCount(prev => prev + 1);

        if (playSound) {
            playNotificationSound();
        }

        if (sendBrowser && document.hidden) {
            sendBrowserNotification(title, body);
        }
    }, []);

    // Mark single notification as read
    const markAsRead = useCallback((notifId) => {
        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    // Mark all as read
    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    // Clear all notifications
    const clearAll = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    // Listen to socket events for notifications
    useEffect(() => {
        if (!socket || !user) return;

        // New message notification
        const handleNewMessage = (data) => {
            // Don't notify if user is currently viewing this group
            const currentGroup = currentPathRef.current.split('/groups/')[1];
            if (currentGroup && data.roomId === currentGroup) return;
            // Don't notify about own messages
            if (data.sender?._id === user._id) return;

            const senderName = data.sender?.name || 'Someone';
            const preview = data.text
                ? data.text.length > 40 ? data.text.substring(0, 40) + '...' : data.text
                : '📎 Sent an attachment';

            addNotification({
                type: 'message',
                title: `💬 ${senderName}`,
                body: preview,
                groupId: data.roomId,
            });
        };

        // Whiteboard activity
        const handleWhiteboardActivity = (data) => {
            const currentGroup = currentPathRef.current.split('/groups/')[1];
            if (currentGroup && data.roomId === currentGroup) return;
            if (data.userId === user._id) return;

            addNotification({
                type: 'whiteboard',
                title: '🎨 Whiteboard Activity',
                body: `${data.userName || 'Someone'} is drawing on the whiteboard`,
                groupId: data.roomId,
                sendBrowser: false, // Don't spam browser notifs for whiteboard
            });
        };

        // Incoming call (supplement the existing call context)
        const handleCallNotif = (data) => {
            if (data.initiator?._id === user._id) return;

            addNotification({
                type: 'call',
                title: `📞 Incoming ${data.callType || 'voice'} call`,
                body: `${data.initiator?.name || 'Someone'} started a call`,
                groupId: data.roomId,
                playSound: false, // Call context already plays ringtone
                sendBrowser: true,
            });
        };

        // Call ended
        const handleCallEndedNotif = (data) => {
            addNotification({
                type: 'call',
                title: '📞 Call Ended',
                body: 'The call has ended',
                groupId: data?.roomId,
                playSound: false,
                sendBrowser: false,
            });
        };

        socket.on('receive-message', handleNewMessage);
        socket.on('whiteboard-activity', handleWhiteboardActivity);
        socket.on('call-incoming', handleCallNotif);
        socket.on('call-ended', handleCallEndedNotif);

        return () => {
            socket.off('receive-message', handleNewMessage);
            socket.off('whiteboard-activity', handleWhiteboardActivity);
            socket.off('call-incoming', handleCallNotif);
            socket.off('call-ended', handleCallEndedNotif);
        };
    }, [socket, user, addNotification]);

    const value = {
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllRead,
        clearAll,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
