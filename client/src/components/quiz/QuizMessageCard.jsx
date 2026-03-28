import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Trophy, ChevronRight, Users, RotateCcw } from 'lucide-react';

const QuizMessageCard = ({ quiz, isOwn, onStartQuiz, onShowLeaderboard }) => {
    return (
        <div
            className={`w-full max-w-[280px] rounded-2xl overflow-hidden border transition-all hover:shadow-lg cursor-pointer ${
                isOwn
                    ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200/50 dark:border-orange-800/30'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200/60 dark:border-slate-700/60'
            }`}
            onClick={(e) => { e.stopPropagation(); onStartQuiz && onStartQuiz(); }}
        >
            {/* Header strip */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 flex items-center gap-2">
                <Brain className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-bold uppercase tracking-wider">Quiz</span>
            </div>

            <div className="p-3.5">
                <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1 line-clamp-2">
                    {quiz.title}
                </h4>
                {quiz.description && (
                    <p className="text-[11px] text-slate-400 mb-2 line-clamp-1">{quiz.description}</p>
                )}

                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                        {quiz.questionCount || quiz.questions?.length || '?'} Questions
                    </span>
                    {quiz.attemptCount > 0 && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {quiz.attemptCount} played
                        </span>
                    )}
                </div>

                <div className="flex gap-2">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); onStartQuiz && onStartQuiz(); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-shadow"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                        Take Quiz
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); onShowLeaderboard && onShowLeaderboard(); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                        title="Leaderboard"
                    >
                        <Trophy className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default QuizMessageCard;
