import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Brain, Trophy, Trash2, ChevronRight, Sparkles, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import QuizBuilder from './QuizBuilder';
import QuizTaker from './QuizTaker';
import QuizLeaderboard from './QuizLeaderboard';

const QuizPanel = ({ groupId, onQuizStart, onSwitchToChat }) => {
    const { api, user } = useAuth();
    const { socket } = useSocket();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' | 'create' | 'take' | 'leaderboard'
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/groups/${groupId}/quizzes`);
            setQuizzes(data);
        } catch (error) {
            toast.error('Failed to load quizzes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, [groupId]);

    const handleDelete = async (quizId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this quiz? All scores will be lost.')) return;
        try {
            await api.delete(`/groups/${groupId}/quizzes/${quizId}`);
            toast.success('Quiz deleted');
            setQuizzes(prev => prev.filter(q => q._id !== quizId));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete quiz');
        }
    };

    const handleQuizCreated = (newQuiz) => {
        setView('list');
        fetchQuizzes();
        toast.success('Quiz created! 🎉');

        // Post quiz as a chat message so it appears in the chat stream
        if (socket) {
            socket.emit('send-message', {
                roomId: groupId,
                message: `📝 Quiz: ${newQuiz.title}`,
                sender: { _id: user._id, name: user.name, email: user.email },
                quiz: {
                    _id: newQuiz._id,
                    title: newQuiz.title,
                    description: newQuiz.description,
                    questionCount: newQuiz.questions?.length || 0,
                    attemptCount: 0,
                },
            });
        }

        // Switch to chat view so user sees the quiz message
        if (onSwitchToChat) onSwitchToChat();
    };

    const handleStartQuiz = async (quiz) => {
        try {
            const { data } = await api.get(`/groups/${groupId}/quizzes/${quiz._id}`);
            setSelectedQuiz(data);
            setView('take');
        } catch (error) {
            toast.error('Failed to load quiz');
        }
    };

    const handleQuizComplete = async (score, total) => {
        try {
            await api.post(`/groups/${groupId}/quizzes/${selectedQuiz._id}/attempt`, {
                score,
                totalQuestions: total,
            });
            fetchQuizzes();
        } catch (error) {
            console.error('Failed to save attempt:', error);
        }
    };

    const handleShowLeaderboard = async (quiz, e) => {
        if (e) e.stopPropagation();
        setSelectedQuiz(quiz);
        setView('leaderboard');
    };

    // Quiz Builder View
    if (view === 'create') {
        return (
            <QuizBuilder
                groupId={groupId}
                onBack={() => setView('list')}
                onCreated={handleQuizCreated}
            />
        );
    }

    // Quiz Taker View
    if (view === 'take' && selectedQuiz) {
        return (
            <QuizTaker
                quiz={selectedQuiz}
                onBack={() => { setView('list'); setSelectedQuiz(null); }}
                onComplete={handleQuizComplete}
            />
        );
    }

    // Leaderboard View
    if (view === 'leaderboard' && selectedQuiz) {
        return (
            <QuizLeaderboard
                groupId={groupId}
                quizId={selectedQuiz._id}
                currentUserId={user?._id}
                onBack={() => { setView('list'); setSelectedQuiz(null); }}
            />
        );
    }

    // Quiz List View
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-white">Quizzes</h2>
                        <p className="text-[11px] text-slate-400">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available</p>
                    </div>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView('create')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
                >
                    <Plus className="w-4 h-4" />
                    Create Quiz
                </motion.button>
            </div>

            {/* Quiz List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"
                        />
                        <p className="text-sm text-slate-400">Loading quizzes...</p>
                    </div>
                ) : quizzes.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-full text-center px-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center mb-4">
                            <HelpCircle className="w-10 h-10 text-orange-500/50" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">No quizzes yet</h3>
                        <p className="text-sm text-slate-400 mb-6">Create the first quiz for your group and challenge your peers!</p>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setView('create')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-500/25"
                        >
                            <Sparkles className="w-4 h-4" />
                            Create First Quiz
                        </motion.button>
                    </motion.div>
                ) : (
                    <AnimatePresence>
                        {quizzes.map((quiz, index) => (
                            <motion.div
                                key={quiz._id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleStartQuiz(quiz)}
                                className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 cursor-pointer hover:shadow-lg hover:shadow-orange-500/5 hover:border-orange-500/20 transition-all duration-300"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/15 flex items-center justify-center flex-shrink-0">
                                        <Brain className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate group-hover:text-orange-500 transition-colors">
                                            {quiz.title}
                                        </h3>
                                        {quiz.description && (
                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{quiz.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                {quiz.questionCount} Q{quiz.questionCount !== 1 ? 's' : ''}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                {quiz.attemptCount} attempt{quiz.attemptCount !== 1 ? 's' : ''}
                                            </span>
                                            {quiz.userBestScore !== null && (
                                                <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                    Best: {quiz.userBestScore}/{quiz.userBestTotal}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1.5">
                                            by {quiz.createdBy?.name || 'Unknown'} · {new Date(quiz.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            onClick={(e) => handleShowLeaderboard(quiz, e)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                            title="Leaderboard"
                                        >
                                            <Trophy className="w-4 h-4" />
                                        </motion.button>
                                        {(quiz.createdBy?._id === user?._id || quiz.createdBy === user?._id) && (
                                            <motion.button
                                                whileTap={{ scale: 0.85 }}
                                                onClick={(e) => handleDelete(quiz._id, e)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Delete quiz"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </motion.button>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-orange-500 transition-colors" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default QuizPanel;
