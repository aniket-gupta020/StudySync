import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// Create axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('studysync-token'));
    const [loading, setLoading] = useState(true);

    // Set auth token in axios headers
    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('studysync-token', token);
            // Load user profile
            loadUser();
        } else {
            delete api.defaults.headers.common['Authorization'];
            localStorage.removeItem('studysync-token');
            setLoading(false);
        }
    }, [token]);

    // Load user profile
    const loadUser = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
        } catch (error) {
            console.error('Load user error:', error);
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Register
    const register = async (userData) => {
        try {
            const { data } = await api.post('/auth/register', userData);
            setToken(data.token);
            setUser(data);
            toast.success('Account created successfully!');
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed';
            toast.error(message);
            return { success: false, message };
        }
    };

    // Login
    const login = async (credentials) => {
        try {
            const { data } = await api.post('/auth/login', credentials);
            setToken(data.token);
            setUser(data);
            toast.success('Logged in successfully!');
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
            return { success: false, message };
        }
    };

    // Logout
    const logout = () => {
        setToken(null);
        setUser(null);
        toast.success('Logged out successfully');
    };

    // Update theme preference
    const updateTheme = async (theme) => {
        try {
            const { data } = await api.put('/auth/theme', { theme });
            setUser(data);
        } catch (error) {
            console.error('Update theme error:', error);
        }
    };

    // Send OTP
    const sendOtp = async (email) => {
        try {
            await api.post('/auth/send-otp', { email, type: 'login_otp' });
            toast.success('OTP sent to your email!');
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to send OTP';
            toast.error(message);
            return { success: false, message };
        }
    };

    // Login via OTP
    const loginViaOtp = async (email, otp) => {
        try {
            const { data } = await api.post('/auth/login-via-otp', { email, otp });
            setToken(data.token);
            setUser(data);
            toast.success('Logged in successfully!');
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
            return { success: false, message };
        }
    };

    const value = {
        user,
        token,
        loading,
        register,
        login,
        logout,
        updateTheme,
        sendOtp,
        loginViaOtp,
        api, // Export api instance for use in other components
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
