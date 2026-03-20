import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Phone } from 'lucide-react';
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

    // Load from localStorage on user change
    useEffect(() => {
        if (user?._id) {
            try {
                const savedNotifs = localStorage.getItem(`notifications_${user._id}`);
                const savedUnread = localStorage.getItem(`unreadCount_${user._id}`);
                setNotifications(savedNotifs ? JSON.parse(savedNotifs) : []);
                setUnreadCount(savedUnread ? JSON.parse(savedUnread) : 0);
            } catch (e) {
                console.error('Failed to load notifications from localStorage:', e);
            }
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user?._id]);

    // Save to localStorage
    useEffect(() => {
        if (user?._id) {
            localStorage.setItem(`notifications_${user._id}`, JSON.stringify(notifications));
        }
    }, [notifications, user?._id]);

    useEffect(() => {
        if (user?._id) {
            localStorage.setItem(`unreadCount_${user._id}`, JSON.stringify(unreadCount));
        }
    }, [unreadCount, user?._id]);
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
    const addNotification = useCallback(({ type, title, body, groupId, groupName, groupPicture, sendBrowser = true, playSound = true, data }) => {
        const notif = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            type, // 'message' | 'call' | 'whiteboard' | 'group' | 'system'
            title,
            body,
            groupId,
            groupName,
            groupPicture,
            timestamp: Date.now(),
            read: false,
            data: data || {}
        };

        setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
        setUnreadCount(prev => prev + 1);

        if (playSound) {
            playNotificationSound(type);
        }

        // Trigger visual custom toast popup
        toast.custom((t) => (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[500] clay-card !p-3.5 !rounded-2xl max-w-sm w-full flex items-center gap-3 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl transition-all duration-300 pointer-events-auto ${t.visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4'}`}
            >
                <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${groupPicture ? 'p-0' : (type === 'message' ? 'from-blue-500/10 to-blue-500/5 text-blue-500' : type === 'call' || type === 'call-ended' ? 'from-red-500/10 to-red-500/5 text-red-500' : 'from-orange-500/10 to-orange-500/5 text-orange-500')}`}>
                    {groupPicture ? (
                        <img src={groupPicture} alt="Group" className="h-full w-full object-cover" />
                    ) : (
                        type === 'message' ? '💬' : type === 'call' || type === 'call-ended' ? <Phone className="w-4 h-4" /> : '🔔'
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-gray-100 text-xs truncate">{title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">{body}</p>
                </div>
            </div>
        ), { duration: 4000 });

        if (sendBrowser && !document.hasFocus()) {
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

        // App-wide notification handler (for users not viewing the specific group)
        const handleAppNotification = (data) => {
            const currentGroup = currentPathRef.current.split('/groups/')[1];
            if (currentGroup && data.groupId === currentGroup) return;
            if (data.senderId === user._id) return;

            addNotification({
                type: data.type || 'message',
                title: data.title,
                body: data.body,
                groupId: data.groupId,
                groupPicture: data.groupPicture,
            });
        };

        // Whiteboard activity (still useful for active session overlay if needed)
        const handleWhiteboardActivity = (data) => {
            const currentGroup = currentPathRef.current.split('/groups/')[1];
            if (currentGroup && data.roomId === currentGroup) return;
            if (data.userId === user._id) return;

            addNotification({
                type: 'whiteboard',
                title: '🎨 Whiteboard Activity',
                body: `${data.userName || 'Someone'} is drawing on the whiteboard`,
                groupId: data.roomId,
                sendBrowser: false, 
            });
        };

        // Incoming call 
        const handleCallNotif = (data) => {
            if (data.initiator?._id === user._id) return;

            addNotification({
                type: 'call',
                title: `📞 Incoming ${data.callType || 'voice'} call`,
                body: `${data.initiator?.name || 'Someone'} started a call`,
                groupId: data.roomId,
                playSound: false, 
                sendBrowser: true,
            });
        };

        socket.on('app-notification', handleAppNotification);
        socket.on('whiteboard-activity', handleWhiteboardActivity);
        socket.on('call-incoming', handleCallNotif);

        return () => {
            socket.off('app-notification', handleAppNotification);
            socket.off('whiteboard-activity', handleWhiteboardActivity);
            socket.off('call-incoming', handleCallNotif);
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
