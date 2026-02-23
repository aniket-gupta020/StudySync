import React from 'react';
import { User, Mail, Shield, Calendar, BookOpen, GraduationCap, BookMarked } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GLASS = "bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-orange-500/5";

const ProfilePage = () => {
    const { user } = useAuth();

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <User className="w-8 h-8 text-orange-500" />
                    My Profile
                </h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Your account information</p>
            </div>

            {/* Avatar & Name Card */}
            <div className={`${GLASS} rounded-2xl p-8 flex flex-col items-center text-center`}>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-orange-500/30 mb-4">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{user?.name || 'User'}</h2>
                {user?.role === 'tutor' ? (
                    <span className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-500/20">
                        <BookMarked className="w-4 h-4" fill="currentColor" /> TUTOR
                    </span>
                ) : (
                    <span className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20">
                        <GraduationCap className="w-4 h-4" /> STUDENT
                    </span>
                )}
            </div>

            {/* Details Card */}
            <div className={`${GLASS} rounded-2xl p-6 space-y-5`}>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Account Details</h3>

                <div className="space-y-4">
                    {/* Name */}
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-orange-500/10">
                            <User className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider font-medium">Full Name</p>
                            <p className="text-slate-800 dark:text-white font-medium">{user?.name || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-blue-500/10">
                            <Mail className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider font-medium">Email</p>
                            <p className="text-slate-800 dark:text-white font-medium">{user?.email || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Role */}
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-green-500/10">
                            <BookOpen className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider font-medium">Role</p>
                            {user?.role === 'tutor' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-yellow-500 text-white mt-1">
                                    <BookMarked className="w-3 h-3" fill="currentColor" /> TUTOR
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white mt-1">
                                    <GraduationCap className="w-3 h-3" /> STUDENT
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Member Since */}
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-purple-500/10">
                            <Calendar className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider font-medium">Member Since</p>
                            <p className="text-slate-800 dark:text-white font-medium">{memberSince}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
