import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageSquare, File, Calendar, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SearchModal = ({ isOpen, onClose, groupId, onJumpToMessage, onJumpToFile }) => {
    const { api } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (query.trim().length >= 2) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [query]);

    const handleSearch = async () => {
        setSearching(true);
        try {
            const { data } = await api.get(`/groups/${groupId}/search?q=${encodeURIComponent(query)}`);
            setResults(data);
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Search failed');
        } finally {
            setSearching(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden border border-slate-100 dark:border-slate-800"
            >
                {/* Search Input */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search messages or files..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Results Area */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {searching ? (
                        <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-sm font-medium">Searching through history...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="p-2 space-y-1">
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => {
                                        if (result.type === 'message') onJumpToMessage(result.id);
                                        else onJumpToFile(result.fileUrl, result.content);
                                        onClose();
                                    }}
                                    className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-all flex items-start gap-4"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        result.type === 'message' 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' 
                                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                                    }`}>
                                        {result.type === 'message' ? <MessageSquare className="w-5 h-5" /> : <File className="w-5 h-5" />}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                                {result.sender?.name || 'Unknown'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(result.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {result.content}
                                        </p>
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : query.trim().length >= 2 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="text-sm">No results found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-400">
                            <p className="text-sm">Type at least 2 characters to search</p>
                        </div>
                    )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
                    Search Results are limited to the most recent 40 matches
                </div>
            </motion.div>
        </div>
    );
};

export default SearchModal;
