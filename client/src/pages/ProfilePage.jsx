import React, { useState, useEffect } from 'react';
import { 
    User, Mail, Shield, Calendar, BookOpen, GraduationCap, 
    BookMarked, Save, Trash2, Lock, Key, ChevronDown, ChevronUp, AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const INPUT_CLASSES = "w-full p-3 pl-10 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white";
const LABEL_CLASSES = "block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1";
const BUTTON_BASE = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-lg active:scale-95 hover:scale-105";

const ProfilePage = () => {
    const { user, api, logout } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // 'update' or 'delete'
    const [otpAction, setOtpAction] = useState('update');
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isEmailFocused, setIsEmailFocused] = useState(false);

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

    const isTutor = user?.role === 'tutor';
    const accentGradient = isTutor 
        ? "from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 shadow-orange-500/20" 
        : "from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/20";
    
    const iconColor = isTutor ? "text-orange-500" : "text-blue-500";
    const iconBg = isTutor ? "bg-orange-500/10" : "bg-blue-500/10";

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, email: user.email });
        }
    }, [user]);

    const handleUpdate = async (e) => {
        e.preventDefault();

        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(formData.name) || formData.name.length < 2) {
            return toast.error("Invalid Name. Please use letters only.");
        }

        try {
            const isEmailChanged = user.email.toLowerCase() !== formData.email.toLowerCase();
            const isPasswordChanged = newPassword.length > 0;

            if (isPasswordChanged && newPassword !== confirmPassword) {
                return toast.error("Passwords do not match!");
            }

            if (isEmailChanged || isPasswordChanged) {
                setOtpAction('update');
                setShowOtpModal(true);

                const type = isEmailChanged ? 'update_email' : 'profile_update';
                // Always send to current email to verify identity
                await api.post('/auth/send-otp', { email: user.email, type });
                toast.success(`OTP sent to ${user.email} for verification`);
                return;
            }

            // Simple profile update (just name)
            const payload = { ...formData };
            const res = await api.put('/auth/profile', payload);
            
            // Update local storage user data
            const lsToken = localStorage.getItem('studysync-token');
            if (lsToken) {
                // To reflect changes globally, we might just reload the window or rely on AuthContext reloading.
                // AuthContext has api.get('/auth/me') which is great, but we can't trigger it easily without exporting loadUser.
                // For now, reload window is safest since context state might be stale
                toast.success("Profile Updated Successfully!");
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update profile");
        }
    };

    const handleVerifyAndSave = async () => {
        try {
            const payload = { ...formData, otp };
            if (newPassword) payload.password = newPassword;

            await api.put('/auth/profile', payload);
            toast.success("Profile Updated Securely!");
            
            setShowOtpModal(false);
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
            
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid OTP or Update Failed");
        }
    };

    const verifyAndDelete = async () => {
        try {
            await api.delete('/auth/profile', { data: { otp } });
            toast.success('Account deleted successfully');
            setShowOtpModal(false);
            logout();
            navigate('/register');
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid OTP or Delete Failed");
        }
    };

    const handleVerifyAction = () => {
        if (otpAction === 'delete') {
            verifyAndDelete();
        } else {
            handleVerifyAndSave();
        }
    };

    const handleDeleteAccount = () => {
        toast.custom((t) => (
            <div className="clay-card !p-6 max-w-sm w-full animate-in fade-in zoom-in duration-300">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500/10 rounded-full">
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">
                            ⚠️ DANGER: Delete account?
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
                            This will permanently delete your StudySync Account.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    confirmDeleteStep2();
                                }}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm transition-colors"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ), { duration: Infinity });
    };

    const confirmDeleteStep2 = () => {
        toast.custom((t) => (
            <div className="clay-card !p-6 max-w-sm w-full animate-in fade-in zoom-in duration-300">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500/10 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">
                            Are you absolutely sure?
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
                            This action cannot be undone. All your data will be lost.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    requestDeleteOtp();
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-colors"
                            >
                                Confirm Delete
                            </button>
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ), { duration: Infinity });
    };

    const requestDeleteOtp = async () => {
        try {
            await api.post('/auth/send-otp', { email: user.email, type: 'delete_account' });
            setOtpAction('delete');
            setShowOtpModal(true);
            toast.success(`OTP sent to ${user.email} for deletion verification`);
        } catch (err) {
            toast.error("Failed to send OTP for deletion");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <Shield className={`w-8 h-8 ${iconColor}`} />
                    My Account
                </h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Manage your settings and personalized preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Avatar & Name Card */}
                <div className="lg:col-span-1">
                    <div className="clay-card !p-8 flex flex-col items-center text-center sticky top-8">
                        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-lg`}>
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{user?.name || 'User'}</h2>
                        <p className="select-text cursor-text text-slate-500 dark:text-gray-400 text-sm mb-4 break-all">{user?.email}</p>
                        
                        {isTutor ? (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-500/20 uppercase tracking-wider">
                                <BookMarked className="w-4 h-4" fill="currentColor" /> TUTOR
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20 uppercase tracking-wider">
                                <GraduationCap className="w-4 h-4" /> STUDENT
                            </span>
                        )}

                        <div className="mt-6 w-full pt-6 border-t border-slate-200 dark:border-white/10 flex items-center gap-3 justify-center text-slate-600 dark:text-gray-400">
                            <Calendar className="w-5 h-5" />
                            <span className="text-sm font-medium">Joined {memberSince}</span>
                        </div>
                    </div>
                </div>

                {/* Edit Details Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleUpdate} className="clay-card !p-8 space-y-6">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/10 pb-4">Edit Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div>
                                <label className={LABEL_CLASSES}>Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        className={INPUT_CLASSES}
                                        value={formData.name}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (/^[a-zA-Z\s]*$/.test(val)) {
                                                setFormData({ ...formData, name: val });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        className={INPUT_CLASSES}
                                        value={formData.email}
                                        onFocus={() => setIsEmailFocused(true)}
                                        onBlur={() => setIsEmailFocused(false)}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                {isEmailFocused && (
                                    <p className="text-xs font-medium text-amber-600 dark:text-yellow-400 mt-2 pl-1 animate-in slide-in-from-top-1 fade-in duration-200 flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> Changing email requires OTP verification.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Password Change Section */}
                        <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                            <button
                                type="button"
                                onClick={() => setIsChangePasswordOpen(!isChangePasswordOpen)}
                                className={`flex items-center gap-2 ${iconColor} font-medium hover:underline focus:outline-none transition-colors`}
                            >
                                <Lock className="w-4 h-4" />
                                {isChangePasswordOpen ? "Cancel Password Change" : "Change Password"}
                                {isChangePasswordOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {isChangePasswordOpen && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-in slide-in-from-top-2 fade-in duration-300 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                                    <div>
                                        <label className={LABEL_CLASSES}>New Password</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                            <input
                                                type="password"
                                                className={INPUT_CLASSES}
                                                placeholder="Leave blank to keep current"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASSES}>Confirm New Password</label>
                                        <div className="relative">
                                            <Shield className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                            <input
                                                type="password"
                                                className={INPUT_CLASSES}
                                                placeholder="Confirm new password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl text-sm font-bold transition-all w-full sm:w-auto justify-center sm:justify-start"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Account
                            </button>

                            <button
                                type="submit"
                                className={`${BUTTON_BASE} bg-gradient-to-r text-white ${accentGradient} w-full sm:w-auto justify-center shadow-lg`}
                            >
                                <Save className="w-5 h-5" /> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* OTP Verification Modal Container */}
            {showOtpModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="clay-card !p-8 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border-none relative overflow-hidden">
                        
                        {/* Decorative Top Gradient Line */}
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${accentGradient}`}></div>
                        
                        <div className="text-center mb-8">
                            <div className={`w-16 h-16 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                <Lock className={`w-8 h-8 ${iconColor}`} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {otpAction === 'delete' ? 'Confirm Deletion' : 'Security Verification'}
                            </h2>
                            <p className="text-slate-600 dark:text-gray-400 mt-2 text-sm">
                                We sent a secure code to <b className="text-slate-800 dark:text-white">{user.email}</b>. <br />
                                {otpAction === 'delete' ? 'Enter it to permanently delete your account.' : 'Enter it below to confirm changes.'}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className={`${LABEL_CLASSES} text-center`}>Enter 6-Digit OTP</label>
                                <input
                                    type="text"
                                    className={`${INPUT_CLASSES} text-center text-3xl tracking-[0.5em] font-mono py-4`}
                                    placeholder="000000"
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    onClick={handleVerifyAction}
                                    className={`w-full py-3.5 rounded-xl font-bold shadow-lg transition-transform active:scale-95 text-white ${
                                        otpAction === 'delete' 
                                        ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20 hover:from-red-700 hover:to-red-600' 
                                        : `bg-gradient-to-r ${accentGradient}`
                                    }`}
                                >
                                    {otpAction === 'delete' ? 'Yes, Delete My Account' : 'Verify & Save Changes'}
                                </button>
                                <button
                                    onClick={() => setShowOtpModal(false)}
                                    className="w-full py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
