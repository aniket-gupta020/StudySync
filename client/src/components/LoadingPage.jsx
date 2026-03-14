import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const LoadingPage = () => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 overflow-hidden">

            {/* Subtle glow background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vmin] h-[60vmin] bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">

                {/* Logo Container */}
                <div className="relative mb-8 group">
                    <div className="relative w-24 h-24 clay-card !rounded-2xl flex items-center justify-center !p-0 shadow-xl shadow-orange-500/10 dark:shadow-orange-500/5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-white/10">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 dark:from-white/0 dark:via-white/5 dark:to-white/0 translate-x-[-100%] animate-[shimmer_2.5s_infinite]"></div>

                        <div className="relative z-10 text-orange-500 dark:text-orange-400">
                            <BookOpen className="w-10 h-10 animate-[pulse_3s_ease-in-out_infinite]" />
                        </div>
                    </div>
                </div>

                {/* Typography */}
                <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white mb-2 flex items-center">
                    Study<span className="text-orange-500">Sync</span>
                </h2>

                <div className="flex items-center gap-2 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>

            </div>

            {/* Footer */}
            <div className="absolute bottom-10 text-center">
                <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase">
                    A Claymorphism Experience ● By A.K.Guptaji
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default LoadingPage;
