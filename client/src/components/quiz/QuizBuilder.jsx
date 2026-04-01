import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, Check, HelpCircle, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const emptyQuestion = () => ({
    id: Date.now() + Math.random(),
    type: 'mcq',
    question: '',
    answer: '',
    options: ['', '', '', ''],
    explanation: '',
});

const QuizBuilder = ({ groupId, onBack, onCreated }) => {
    const { api } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([emptyQuestion()]);
    const [saving, setSaving] = useState(false);

    const addQuestion = () => {
        setQuestions(prev => [...prev, emptyQuestion()]);
    };

    const removeQuestion = (index) => {
        if (questions.length === 1) return toast.error('Need at least one question');
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuestion = (index, field, value) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };

    const updateOption = (qIndex, optIndex, value) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            const oldOpt = q.options[optIndex];
            const newOpts = [...q.options];
            newOpts[optIndex] = value;
            // If this option was the selected correct answer, update the answer too
            const newAnswer = q.answer === oldOpt ? value : q.answer;
            return { ...q, options: newOpts, answer: newAnswer };
        }));
    };

    const toggleType = (index) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== index) return q;
            return { ...q, type: q.type === 'mcq' ? 'flashcard' : 'mcq' };
        }));
    };

    const handleSubmit = async () => {
        if (!title.trim()) return toast.error('Please enter a quiz title');
        
        // Auto-fix: for MCQ questions without a selected answer, pick first filled option
        const fixedQuestions = questions.map(q => {
            if (q.type === 'mcq') {
                const filled = q.options.filter(o => o.trim());
                // If answer is empty or doesn't match any option, auto-select first option
                if (!q.answer.trim() || !filled.some(o => o.trim() === q.answer.trim())) {
                    if (filled.length > 0) return { ...q, answer: filled[0] };
                }
            }
            return q;
        });
        setQuestions(fixedQuestions);

        for (let i = 0; i < fixedQuestions.length; i++) {
            const q = fixedQuestions[i];
            if (!q.question.trim()) return toast.error(`Question ${i + 1} is empty`);
            if (q.type === 'mcq') {
                const filled = q.options.filter(o => o.trim());
                if (filled.length < 2) return toast.error(`Question ${i + 1} needs at least 2 options`);
                // Answer is guaranteed set by auto-fix above, but double-check
                if (!q.answer.trim()) {
                    return toast.error(`Please select the correct answer for Q${i + 1} by clicking an option`);
                }
            } else {
                if (!q.answer.trim()) return toast.error(`Answer for question ${i + 1} is empty`);
            }
        }

        try {
            setSaving(true);
            const payload = {
                title: title.trim(),
                description: description.trim(),
                questions: fixedQuestions.map(q => ({
                    question: q.question.trim(),
                    type: q.type,
                    answer: q.answer.trim(),
                    options: q.type === 'mcq' ? q.options.filter(o => o.trim()) : [],
                    explanation: q.explanation.trim(),
                })),
            };
            const { data } = await api.post(`/groups/${groupId}/quizzes`, payload);
            onCreated(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create quiz');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onBack}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </motion.button>
                <div className="flex-1">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">Create Quiz</h2>
                    <p className="text-[11px] text-slate-400">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                        <Check className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Publish'}
                </motion.button>
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Title & Description */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5"
                >
                    <input
                        type="text"
                        placeholder="Quiz Title *"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full text-lg font-bold text-slate-800 dark:text-white bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        maxLength={200}
                    />
                    <input
                        type="text"
                        placeholder="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full mt-2 text-sm text-slate-500 dark:text-slate-400 bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        maxLength={500}
                    />
                </motion.div>

                {/* Questions */}
                <AnimatePresence>
                    {questions.map((q, index) => (
                        <motion.div
                            key={q.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100, height: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
                        >
                            {/* Question Header */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <GripVertical className="w-4 h-4 text-slate-300" />
                                <span className="text-xs font-bold text-slate-400">Q{index + 1}</span>
                                <div className="flex-1" />
                                
                                {/* Type Toggle Segmented Control */}
                                <div className="flex bg-slate-200/50 dark:bg-slate-700/50 p-0.5 rounded-xl relative border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    {['mcq', 'flashcard'].map((type) => {
                                        const isActive = q.type === type;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => updateQuestion(index, 'type', type)}
                                                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold z-10 transition-colors duration-300 ${
                                                    isActive 
                                                        ? (type === 'mcq' ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400') 
                                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId={`active-pill-${q.id}`}
                                                        className={`absolute inset-0 rounded-[10px] shadow-sm ${
                                                            type === 'mcq' 
                                                                ? 'bg-white dark:bg-orange-500/20 border border-orange-200/50 dark:border-orange-500/30' 
                                                                : 'bg-white dark:bg-blue-500/20 border border-blue-200/50 dark:border-blue-500/30'
                                                        }`}
                                                        initial={false}
                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                        style={{ zIndex: -1 }}
                                                    />
                                                )}
                                                {type === 'mcq' ? <HelpCircle className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                                                {type === 'mcq' ? 'MCQ' : 'Flashcard'}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => removeQuestion(index)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="p-4 space-y-3">
                                {/* Question Text */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Question</label>
                                    <textarea
                                        value={q.question}
                                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                                        placeholder="Enter your question..."
                                        rows={2}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>

                                {/* MCQ Options */}
                                {q.type === 'mcq' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Options (click to mark correct)</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {q.options.map((opt, optIdx) => (
                                                <div
                                                    key={optIdx}
                                                    onClick={() => opt.trim() && updateQuestion(index, 'answer', opt)}
                                                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border cursor-pointer transition-all ${
                                                        q.answer === opt && opt.trim()
                                                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                                                            : 'border-slate-200 dark:border-slate-700 hover:border-orange-500/30'
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                        q.answer === opt && opt.trim()
                                                            ? 'border-emerald-500 bg-emerald-500'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                    }`}>
                                                        {q.answer === opt && opt.trim() && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => updateOption(index, optIdx, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                        className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Flashcard Answer */}
                                {q.type === 'flashcard' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Answer (Back of Card)</label>
                                        <textarea
                                            value={q.answer}
                                            onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                                            placeholder="The answer that appears on the back..."
                                            rows={2}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        />
                                    </div>
                                )}

                                {/* Explanation */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Explanation (optional)</label>
                                    <input
                                        type="text"
                                        value={q.explanation}
                                        onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                                        placeholder="Why this is the correct answer..."
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Add Question Button */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={addQuestion}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-orange-500/30 hover:text-orange-500 hover:bg-orange-500/5 transition-all text-sm font-semibold"
                >
                    <Plus className="w-4 h-4" />
                    Add Question
                </motion.button>

                {/* Bottom padding */}
                <div className="h-8" />
            </div>
        </div>
    );
};

export default QuizBuilder;
