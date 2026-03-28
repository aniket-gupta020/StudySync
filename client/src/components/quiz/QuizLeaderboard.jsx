import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Crown, Star, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const QuizLeaderboard = ({ groupId, quizId, currentUserId, onBack }) => {
    const { api } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const { data: res } = await api.get(`/groups/${groupId}/quizzes/${quizId}/leaderboard`);
                setData(res);
            } catch (error) {
                toast.error('Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [groupId, quizId]);

    const podiumColors = [
        'from-amber-400 to-yellow-500', // Gold
        'from-slate-300 to-slate-400',   // Silver
        'from-orange-600 to-amber-700',  // Bronze
    ];
    const podiumIcons = [
        <Crown className="w-5 h-5" />,
        <Medal className="w-5 h-5" />,
        <Medal className="w-5 h-5" />,
    ];
    const podiumHeights = ['h-28', 'h-20', 'h-16'];
    const podiumOrder = [1, 0, 2]; // Display order: Silver, Gold, Bronze

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
                <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </motion.button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">Leaderboard</h2>
                    <p className="text-[11px] text-slate-400 truncate">{data?.quizTitle || 'Loading...'}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{data?.leaderboard?.length || 0} players</span>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
                </div>
            ) : !data?.leaderboard || data.leaderboard.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                        <BarChart3 className="w-8 h-8 text-amber-500/40" />
                    </div>
                    <h3 className="text-base font-bold text-slate-600 dark:text-slate-300 mb-1">No attempts yet</h3>
                    <p className="text-sm text-slate-400">Be the first to take this quiz!</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    {/* Podium (Top 3) */}
                    {data.leaderboard.length >= 2 && (
                        <div className="px-6 pt-8 pb-4">
                            <div className="flex items-end justify-center gap-3">
                                {podiumOrder.map((rank, displayIdx) => {
                                    const entry = data.leaderboard[rank];
                                    if (!entry) return <div key={displayIdx} className="w-24" />;
                                    
                                    return (
                                        <motion.div
                                            key={entry.user._id || displayIdx}
                                            initial={{ y: 30, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: displayIdx * 0.15, type: 'spring' }}
                                            className="flex flex-col items-center"
                                        >
                                            {/* Avatar */}
                                            <div className={`relative mb-2 ${rank === 0 ? 'scale-110' : ''}`}>
                                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${podiumColors[rank]} flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden`}>
                                                    {entry.user.avatar ? (
                                                        <img src={entry.user.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        entry.user.name?.charAt(0)?.toUpperCase() || '?'
                                                    )}
                                                </div>
                                                {rank === 0 && (
                                                    <motion.div
                                                        initial={{ y: -10, opacity: 0 }}
                                                        animate={{ y: 0, opacity: 1 }}
                                                        transition={{ delay: 0.5 }}
                                                        className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-400"
                                                    >
                                                        <Crown className="w-5 h-5" />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate w-20 text-center">
                                                {entry.user.name?.split(' ')[0] || 'Unknown'}
                                            </p>
                                            <p className="text-[10px] font-semibold text-orange-500">{entry.percentage}%</p>
                                            
                                            {/* Podium bar */}
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: 'auto' }}
                                                transition={{ delay: 0.3 + displayIdx * 0.1 }}
                                                className={`${podiumHeights[rank]} w-20 mt-2 rounded-t-xl bg-gradient-to-b ${podiumColors[rank]} flex items-start justify-center pt-2 shadow-inner`}
                                            >
                                                <span className="text-white font-black text-lg">
                                                    {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'}
                                                </span>
                                            </motion.div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Full Ranking List */}
                    <div className="px-4 pb-8 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-2">All Rankings</p>
                        {data.leaderboard.map((entry, idx) => {
                            const isCurrentUser = entry.user._id === currentUserId;
                            
                            return (
                                <motion.div
                                    key={entry.user._id || idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                                        isCurrentUser
                                            ? 'bg-orange-500/5 border border-orange-500/20 ring-1 ring-orange-500/10'
                                            : 'bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60'
                                    }`}
                                >
                                    {/* Rank */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                                        idx === 0 ? 'bg-amber-500/20 text-amber-600' :
                                        idx === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' :
                                        idx === 2 ? 'bg-orange-500/15 text-orange-600' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${entry.rank}`}
                                    </div>

                                    {/* Avatar & Name */}
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                                        {entry.user.avatar ? (
                                            <img src={entry.user.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            entry.user.name?.charAt(0)?.toUpperCase() || '?'
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-white'}`}>
                                            {entry.user.name || 'Unknown'} {isCurrentUser && <span className="text-[10px] opacity-60">(You)</span>}
                                        </p>
                                        <p className="text-[10px] text-slate-400">{entry.attemptCount} attempt{entry.attemptCount !== 1 ? 's' : ''}</p>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-black text-slate-800 dark:text-white">{entry.score}/{entry.totalQuestions}</p>
                                        <p className={`text-[10px] font-bold ${
                                            entry.percentage >= 80 ? 'text-emerald-500' :
                                            entry.percentage >= 50 ? 'text-amber-500' : 'text-red-400'
                                        }`}>{entry.percentage}%</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizLeaderboard;
