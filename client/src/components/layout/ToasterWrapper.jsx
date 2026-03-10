import { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { X } from 'lucide-react';

/**
 * Resolves toast position based on current window width.
 * - > 768px: top-center
 * - <= 768px: bottom-center
 */
const getPosition = () =>
    window.innerWidth > 768 ? 'top-center' : 'bottom-center';

/**
 * ToasterWrapper — A responsive Toaster that:
 * - Renders toasts at top-center on desktop and bottom-center on mobile.
 * - Adds a close (X) button to every toast.
 */
const ToasterWrapper = () => {
    const [position, setPosition] = useState(getPosition);

    useEffect(() => {
        const handleResize = () => setPosition(getPosition());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <Toaster
            position={position}
            toastOptions={{
                duration: 4000,
                className: '!clay-toast !shadow-none',
                style: {
                    color: 'inherit',
                    background: 'transparent',
                    padding: '0',
                },
            }}
        >
            {(t) => (
                <div
                    className={`clay-toast flex items-start gap-3 px-4 py-3 min-w-[240px] max-w-sm rounded-xl transition-all duration-300 ${
                        t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                >
                    {/* Toast icon */}
                    {t.icon && (
                        <span className="flex-shrink-0 mt-0.5 text-lg leading-none">
                            {t.icon}
                        </span>
                    )}

                    {/* Message */}
                    <div className="flex-1 text-sm font-medium leading-snug">
                        {typeof t.message === 'function'
                            ? t.message(t)
                            : String(t.message)}
                    </div>

                    {/* Close button */}
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="flex-shrink-0 ml-1 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close notification"
                    >
                        <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                    </button>
                </div>
            )}
        </Toaster>
    );
};

export default ToasterWrapper;
