/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                accent: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                },
                dark: {
                    50: '#1e293b',
                    100: '#0f172a',
                    200: '#020617',
                },
            },
            screens: {
                'xs': '390px',
                'sm': '430px',
                'md': '800px',
                'lg': '1024px',
                'xl': '1400px',
                '2xl': '1600px',
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
                'slide-up': 'slide-up 0.3s ease-out',
                'slide-down': 'slide-down 0.3s ease-out',
                'fade-in': 'fade-in 0.3s ease-out',
            },
            keyframes: {
                'glow-pulse': {
                    '0%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.2)' },
                    '100%': { boxShadow: '0 0 30px rgba(249, 115, 22, 0.4)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-down': {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
