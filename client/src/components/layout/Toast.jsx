import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * Toast - Animated notification component
 * Features framer-motion animations, glass styling, and orange progress bar
 */
const Toast = ({
    message,
    type = 'info',
    duration = 3000,
    onClose
}) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                const newProgress = prev - (100 / (duration / 100));
                if (newProgress <= 0) {
                    clearInterval(interval);
                    onClose?.();
                    return 0;
                }
                return newProgress;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="text-green-500" size={24} />,
        error: <AlertCircle className="text-red-500" size={24} />,
        info: <Info className="text-primary-500" size={24} />,
    };

    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="clay-toast relative overflow-hidden"
        >
            <div className="flex items-start gap-3">
                {icons[type]}
                <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    aria-label="Close notification"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Progress Bar */}
            <div
                className="clay-toast-progress"
                style={{ width: `${progress}%` }}
            />
        </motion.div>
    );
};



/**
 * ToastContainer - Container for managing multiple toasts
 */
export const ToastContainer = ({ toasts = [], removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-3">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};



/**
 * useToast - Custom hook for managing toasts
 */
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return { toasts, addToast, removeToast };
};

export default Toast;
