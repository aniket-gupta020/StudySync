import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingPage = () => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-900 overflow-hidden">
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 clay-card !rounded-3xl flex items-center justify-center mb-8 animate-bounce transition-transform duration-1000 !p-0">
                    <Loader2 className="w-12 h-12 text-orange-600 dark:text-yellow-400 animate-spin" />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2 animate-pulse">
                    Study<span className="text-orange-600 dark:text-yellow-400">Sync</span>
                </h2>
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                </div>
                <p className="mt-6 text-sm font-medium text-slate-500 dark:text-gray-400 tracking-widest uppercase">
                    Syncing your workspace...
                </p>
            </div>

            <div className="absolute bottom-8 text-xs font-bold text-slate-400 dark:text-gray-600 tracking-tight">
                PREMIUM EXPERIENCE • By A.K.Guptaji
            </div>
        </div>
    );
};

export default LoadingPage;
