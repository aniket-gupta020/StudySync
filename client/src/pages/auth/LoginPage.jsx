import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Sun, Moon, Eye, EyeOff, BookOpen, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GLASS_CLASSES = "bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-orange-500/10";
const INPUT_GROUP = "relative flex items-center";
const INPUT_ICON = "absolute left-3 w-5 h-5 text-gray-400 dark:text-gray-500";
const INPUT_CLASSES = "w-full pl-10 p-3 bg-white/50 dark:bg-black/20 border border-orange-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white";
const LABEL_CLASSES = "block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1";

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, sendOtp, loginViaOtp } = useAuth(); // Import new AuthContext functions

    const [isOtpLogin, setIsOtpLogin] = useState(false); // Toggle state
    const [otpSent, setOtpSent] = useState(false); // Track if OTP was sent

    const [formData, setFormData] = useState({ email: '', password: '', otp: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Dark mode state
    const [darkMode, setDarkMode] = useState(() => {
        if (localStorage.getItem('theme')) return localStorage.getItem('theme') === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSendOtp = async () => {
        if (!formData.email) return;
        setLoading(true);
        const result = await sendOtp(formData.email);
        if (result.success) {
            setOtpSent(true);
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        let result;
        if (isOtpLogin) {
            // OTP Login Flow
            if (!otpSent) {
                // Should not happen if button logic is correct, but safe guard
                await handleSendOtp();
                return;
            }
            result = await loginViaOtp(formData.email, formData.otp);
        } else {
            // Password Login Flow
            result = await login(formData);
        }

        if (result.success) {
            navigate('/dashboard');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-100 to-orange-50 dark:from-gray-900 dark:via-black dark:to-gray-900 transition-colors duration-500 flex items-center justify-center p-4 relative">

            {/* Floating Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="fixed bottom-6 left-6 p-4 rounded-full bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-2xl hover:scale-110 transition-transform z-50 group"
                title="Toggle Theme"
            >
                {darkMode ? (
                    <Sun className="w-6 h-6 text-yellow-400 group-hover:rotate-90 transition-transform duration-500" />
                ) : (
                    <Moon className="w-6 h-6 text-slate-700 group-hover:-rotate-12 transition-transform duration-500" />
                )}
            </button>

            <div className={`w-full max-w-md ${GLASS_CLASSES} rounded-3xl p-8 relative overflow-hidden transition-all duration-500`}>

                {/* Decorative glow blurs */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/30 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/30 rounded-full blur-3xl"></div>

                {/* Header */}
                <div className="text-center mb-8 relative z-10">
                    <div className="inline-flex p-3 rounded-2xl bg-orange-100 dark:bg-white/10 text-orange-600 dark:text-yellow-400 mb-4 shadow-inner">
                        <BookOpen className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Welcome Back</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-2">Sign in to your StudySync account</p>
                </div>

                {/* Login Method Toggle */}
                <div className="flex justify-center mb-6 relative z-10">
                    <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex">
                        <button
                            type="button"
                            onClick={() => { setIsOtpLogin(false); setOtpSent(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!isOtpLogin ? 'bg-white dark:bg-white/10 shadow-sm text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'}`}
                        >
                            Password
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsOtpLogin(true); setOtpSent(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isOtpLogin ? 'bg-white dark:bg-white/10 shadow-sm text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'}`}
                        >
                            One-Time Password
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    {/* Email */}
                    <div>
                        <label className={LABEL_CLASSES}>Email Address</label>
                        <div className={INPUT_GROUP}>
                            <Mail className={INPUT_ICON} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="mail.akguptaji@gmail.com"
                                required
                                className={INPUT_CLASSES}
                                disabled={isOtpLogin && otpSent} // Disable email edit after OTP sent
                            />
                        </div>
                    </div>

                    {!isOtpLogin ? (
                        // Password Field
                        <div>
                            <label className={LABEL_CLASSES}>Password</label>
                            <div className={INPUT_GROUP}>
                                <Lock className={INPUT_ICON} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required={!isOtpLogin}
                                    minLength={6}
                                    className={INPUT_CLASSES}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        // OTP Field (only if sent)
                        otpSent && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <label className={LABEL_CLASSES}>Enter OTP Code</label>
                                <div className={INPUT_GROUP}>
                                    <KeyRound className={INPUT_ICON} />
                                    <input
                                        type="text"
                                        name="otp"
                                        value={formData.otp}
                                        onChange={handleChange}
                                        placeholder="123456"
                                        required={isOtpLogin}
                                        maxLength={6}
                                        className={`${INPUT_CLASSES} tracking-widest font-mono text-center text-lg`}
                                        autoFocus
                                    />
                                </div>
                                <div className="text-center mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setOtpSent(false)}
                                        className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                                    >
                                        Change Email / Resend
                                    </button>
                                </div>
                            </div>
                        )
                    )}

                    {/* Action Buttons */}
                    {isOtpLogin && !otpSent ? (
                        <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={loading || !formData.email}
                            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Send Access Code (OTP)
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isOtpLogin ? 'Verify & Sign In' : 'Sign In'}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    )}
                </form>

                {/* Register link */}
                <p className="text-center mt-8 text-slate-600 dark:text-gray-400 relative z-10">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-bold text-orange-600 dark:text-yellow-400 hover:underline">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
