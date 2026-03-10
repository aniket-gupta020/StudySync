import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const LoadingPage = () => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-900 overflow-hidden">
            
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8">
                
                {/* 3D Clay Logo Container */}
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-yellow-400 rounded-3xl blur-xl opacity-40 animate-pulse"></div>
                    <div className="relative w-28 h-28 clay-card !rounded-3xl flex items-center justify-center !p-0 overflow-hidden transform transition-transform duration-700 hover:scale-105">
                        
                        {/* Inner rotating glow */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 dark:from-white/0 dark:via-white/10 dark:to-white/0 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                        
                        <div className="relative z-10 flex flex-col items-center justify-center">
                            <BookOpen className="w-12 h-12 text-orange-500 dark:text-orange-400 mb-1 animate-bounce" style={{ animationDuration: '2s' }} />
                            <Sparkles className="w-5 h-5 text-yellow-500 absolute top-4 right-4 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Typography */}
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-1 flex items-center gap-0.5">
                    Study<span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Sync</span>
                    <span className="ml-1 flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                </h2>
                
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-10 tracking-wide">
                    Preparing your workspace
                </p>

                {/* Custom Clay Progress Bar */}
                <div className="w-full h-3 clay-card !p-0 !rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full animate-[progress_1.5s_ease-in-out_infinite_alternate]"></div>
                </div>

            </div>

            {/* Footer */}
            <div className="absolute bottom-8 flex flex-col items-center gap-1 opacity-60">
                <div className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">Premium Experience</div>
                <div className="w-12 h-[1px] bg-slate-400/50 rounded-full"></div>
            </div>

            {/* Inline animations for the specific loading effects */}
            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                @keyframes progress {
                    0% { width: 0%; transform: translateX(0); }
                    100% { width: 50%; transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default LoadingPage;
