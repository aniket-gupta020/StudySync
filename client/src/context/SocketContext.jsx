import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (user) {
            // Initialize socket connection
            // const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000'); 
            // In Vite, proxy usually handles /api, but socket requires explicit URL or path config
            // However, with CORS and manual setup:

            const socketUrl = 'http://localhost:8000';
            console.log(`🔌 Initializing socket connection to: ${socketUrl}`);

            const newSocket = io(socketUrl, {
                withCredentials: true,
                transports: ['websocket', 'polling'], // Try websocket first
                reconnectionAttempts: 5,
            });

            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id);
                setIsConnected(true);
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
                setIsConnected(false);
            }
        }
    }, [user]);

    const value = {
        socket,
        isConnected
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
