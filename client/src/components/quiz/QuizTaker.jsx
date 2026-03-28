import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Check, X, ChevronRight, ChevronLeft, Trophy, Sparkles } from 'lucide-react';

const QuizTaker = ({ quiz, onBack, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionIndex: { answered: bool, correct: bool, selected: string } }
    const [isFlipped, setIsFlipped] = useState(false);
    const [flashcardRated, setFlashcardRated] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [direction, setDirection] = useState(0); // -1 = left, 1 = right

    const questions = quiz.questions || [];
    const total = questions.length;
    const current = questions[currentIndex];
    const progress = ((Object.keys(answers).length) / total) * 100;

    const goNext = useCallback(() => {
        if (currentIndex < total - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
            setFlashcardRated(false);
        } else {
            // Quiz complete
            const finalScore = Object.values(answers).filter(a => a.correct).length + 
                (current?.type === 'flashcard' && flashcardRated ? 0 : 0); // Already counted
            setCompleted(true);
            onComplete(score + (answers[currentIndex]?.correct ? 0 : 0), total);
        }
    }, [currentIndex, total, answers, score, onComplete, flashcardRated]);

    const goPrev = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
            setFlashcardRated(false);
        }
    };

    // MCQ answer handler
    const handleMCQAnswer = (option) => {
        if (answers[currentIndex]) return; // Already answered
        const isCorrect = option === current.answer;
        const newScore = isCorrect ? score + 1 : score;
        setScore(newScore);
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: { answered: true, correct: isCorrect, selected: option }
        }));
    };

    // Flashcard self-rate
    const handleFlashcardRate = (correct) => {
        const newScore = correct ? score + 1 : score;
        setScore(newScore);
        setFlashcardRated(true);
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: { answered: true, correct, selected: correct ? 'correct' : 'wrong' }
        }));
    };

    // Completion screen
    if (completed) {
        const percentage = Math.round((score / total) * 100);
        const emoji = percentage >= 90 ? '🏆' : percentage >= 70 ? '🌟' : percentage >= 50 ? '👍' : '📚';
        
        return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-8 max-w-sm w-full text-center shadow-xl"
                >
                    {/* Confetti-like particles */}
                    {percentage >= 70 && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: -10, x: Math.random() * 300, opacity: 1 }}
                                    animate={{ y: 400, opacity: 0, rotate: Math.random() * 360 }}
                                    transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, repeat: 2 }}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{
                                        background: ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'][i % 5],
                                        left: `${Math.random() * 100}%`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="text-6xl mb-4"
                    >
                        {emoji}
                    </motion.div>

                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">
                        {percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : percentage >= 50 ? 'Good Effort!' : 'Keep Learning!'}
                    </h2>
                    <p className="text-sm text-slate-400 mb-6">{quiz.title}</p>

                    {/* Score Circle */}
                    <div className="relative w-32 h-32 mx-auto mb-6">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" />
                            <motion.circle
                                cx="50" cy="50" r="42" fill="none"
                                strokeWidth="6" strokeLinecap="round"
                                stroke="url(#scoreGradient)"
                                strokeDasharray={`${percentage * 2.64} 264`}
                                initial={{ strokeDasharray: '0 264' }}
                                animate={{ strokeDasharray: `${percentage * 2.64} 264` }}
                                transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                            />
                            <defs>
                                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f97316" />
                                    <stop offset="100%" stopColor="#eab308" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-3xl font-black text-slate-800 dark:text-white"
                            >
                                {score}
                            </motion.span>
                            <span className="text-xs text-slate-400 font-medium">/ {total}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onBack}
                            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Back to Quizzes
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setCurrentIndex(0);
                                setScore(0);
                                setAnswers({});
                                setCompleted(false);
                                setIsFlipped(false);
                                setFlashcardRated(false);
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-lg shadow-orange-500/25"
                        >
                            <RotateCcw className="w-4 h-4 inline mr-1.5" />
                            Retry
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!current) return null;

    const slideVariants = {
        enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
                <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </motion.button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white truncate">{quiz.title}</h2>
                    <p className="text-[11px] text-slate-400">Question {currentIndex + 1} of {total}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-orange-500/10 px-3 py-1 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-bold text-orange-500">{score}/{total}</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-r-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                />
            </div>

            {/* Question Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.25 }}
                        className="w-full max-w-lg"
                    >
                        {current.type === 'flashcard' ? (
                            /* ===== FLASHCARD MODE ===== */
                            <div className="flex flex-col items-center">
                                <div
                                    className="w-full aspect-[4/3] max-h-[50vh] cursor-pointer"
                                    onClick={() => setIsFlipped(!isFlipped)}
                                    style={{ perspective: 1000 }}
                                >
                                    <motion.div
                                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                                        transition={{ duration: 0.5, type: 'spring', damping: 20 }}
                                        className="relative w-full h-full"
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        {/* Front */}
                                        <div
                                            className="absolute inset-0 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center p-8 text-center"
                                            style={{ backfaceVisibility: 'hidden' }}
                                        >
                                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">Question</span>
                                            <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white leading-relaxed">{current.question}</p>
                                            <p className="text-xs text-slate-300 dark:text-slate-600 mt-6">Tap to reveal answer</p>
                                        </div>
                                        {/* Back */}
                                        <div
                                            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-xl flex flex-col items-center justify-center p-8 text-center"
                                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                        >
                                            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-4">Answer</span>
                                            <p className="text-lg sm:text-xl font-bold text-white leading-relaxed">{current.answer}</p>
                                            {current.explanation && (
                                                <p className="text-xs text-white/70 mt-4 italic">{current.explanation}</p>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Self-Rate Buttons */}
                                {isFlipped && !answers[currentIndex] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-4 mt-6"
                                    >
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleFlashcardRate(false)}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500/10 text-red-500 font-semibold text-sm hover:bg-red-500/20 transition-colors border border-red-500/20"
                                        >
                                            <X className="w-4 h-4" /> Got it Wrong
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleFlashcardRate(true)}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-semibold text-sm hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                                        >
                                            <Check className="w-4 h-4" /> Got it Right
                                        </motion.button>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            /* ===== MCQ MODE ===== */
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm">
                                    <p className="text-lg font-bold text-slate-800 dark:text-white leading-relaxed text-center">{current.question}</p>
                                </div>

                                <div className="space-y-2.5">
                                    {current.options.map((option, idx) => {
                                        const answered = answers[currentIndex];
                                        const isSelected = answered?.selected === option;
                                        const isCorrect = option === current.answer;
                                        
                                        let optStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-500/40 hover:shadow-md';
                                        if (answered) {
                                            if (isCorrect) {
                                                optStyle = 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/20';
                                            } else if (isSelected && !isCorrect) {
                                                optStyle = 'bg-red-500/10 border-red-500 ring-1 ring-red-500/20';
                                            } else {
                                                optStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50';
                                            }
                                        }

                                        return (
                                            <motion.button
                                                key={idx}
                                                whileTap={!answered ? { scale: 0.98 } : {}}
                                                animate={isSelected && !isCorrect ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                                                transition={{ duration: 0.4 }}
                                                onClick={() => handleMCQAnswer(option)}
                                                disabled={!!answered}
                                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left ${optStyle}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                                    answered && isCorrect
                                                        ? 'bg-emerald-500 text-white'
                                                        : answered && isSelected
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}>
                                                    {answered && isCorrect ? <Check className="w-4 h-4" /> :
                                                     answered && isSelected ? <X className="w-4 h-4" /> :
                                                     String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className={`text-sm font-medium ${
                                                    answered && isCorrect ? 'text-emerald-600 dark:text-emerald-400' :
                                                    answered && isSelected ? 'text-red-600 dark:text-red-400' :
                                                    'text-slate-700 dark:text-slate-200'
                                                }`}>{option}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {/* Explanation after answering */}
                                {answers[currentIndex] && current.explanation && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5"
                                    >
                                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Explanation</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">{current.explanation}</p>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-500 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Prev
                </motion.button>

                {/* Dot indicators */}
                <div className="flex gap-1">
                    {questions.map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                i === currentIndex ? 'bg-orange-500 scale-125' :
                                answers[i]?.correct ? 'bg-emerald-500' :
                                answers[i] ? 'bg-red-400' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                        />
                    ))}
                </div>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        if (currentIndex === total - 1 && answers[currentIndex]) {
                            setCompleted(true);
                            onComplete(score, total);
                        } else {
                            goNext();
                        }
                    }}
                    disabled={!answers[currentIndex]}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 ${
                        currentIndex === total - 1 && answers[currentIndex]
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    {currentIndex === total - 1 ? (
                        <><Trophy className="w-4 h-4" /> Finish</>
                    ) : (
                        <>Next <ChevronRight className="w-4 h-4" /></>
                    )}
                </motion.button>
            </div>
        </div>
    );
};

export default QuizTaker;
