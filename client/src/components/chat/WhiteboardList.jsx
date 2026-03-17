import React, { useState, useEffect } from 'react';
import { Plus, PenLine, Download, Edit2, Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const WhiteboardList = ({ api, groupId, onSelectWhiteboard, onBack }) => {
    const [whiteboards, setWhiteboards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    useEffect(() => {
        fetchWhiteboards();
    }, [groupId]);

    const fetchWhiteboards = async () => {
        try {
            const { data } = await api.get(`/groups/${groupId}/whiteboards`);
            setWhiteboards(data);
        } catch (error) {
            console.error('Fetch whiteboards error:', error);
            toast.error('Failed to load whiteboards');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        try {
            const { data } = await api.post(`/groups/${groupId}/whiteboards`, { name: newTitle.trim() });
            setWhiteboards([data, ...whiteboards]);
            setNewTitle('');
            setIsCreating(false);
            toast.success('Whiteboard created');
        } catch (error) {
            toast.error('Failed to create whiteboard');
        }
    };

    const handleDownload = (board, e) => {
        e.stopPropagation();
        if (!board.canvasData) {
            toast.error('Whiteboard is empty');
            return;
        }
        const link = document.createElement('a');
        link.download = `${board.name.replace(/\s+/g, '_')}_whiteboard.png`;
        link.href = board.canvasData;
        link.click();
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this whiteboard?')) return;
        try {
            await api.delete(`/groups/${groupId}/whiteboards/${id}`);
            setWhiteboards(whiteboards.filter(w => w._id !== id));
            toast.success('Whiteboard deleted');
        } catch (error) {
            toast.error('Failed to delete whiteboard');
        }
    };

    const handleRename = async (id, e) => {
        e.stopPropagation();
        if (!editTitle.trim()) {
            setEditingId(null);
            return;
        }
        try {
            const { data } = await api.put(`/groups/${groupId}/whiteboards/${id}`, { name: editTitle.trim() });
            setWhiteboards(whiteboards.map(w => w._id === id ? data : w));
            setEditingId(null);
            toast.success('Renamed successfully');
        } catch (error) {
            toast.error('Failed to rename');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <PenLine className="w-5 h-5 text-orange-500" />
                        Whiteboards
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Select a whiteboard to draw together
                    </p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> 
                        <span className="hidden sm:inline">New Whiteboard</span>
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-orange-200 dark:border-slate-800 flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Whiteboard Name (e.g. Science Chapter 1)"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button onClick={handleCreate} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600">
                        <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setIsCreating(false); setNewTitle(''); }} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {whiteboards.length === 0 && !isCreating ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
                        <PenLine className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="font-medium text-slate-600 dark:text-slate-400">No whiteboards yet</p>
                        <p className="text-sm mt-1">Create one to start drawing</p>
                    </div>
                ) : (
                    whiteboards.map(board => (
                        <div
                            key={board._id}
                            onClick={() => onSelectWhiteboard(board)}
                            className="group p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md cursor-pointer transition-all flex flex-col gap-3"
                        >
                            <div className="flex items-start justify-between">
                                <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl text-orange-500">
                                    <PenLine className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1">
                                    {editingId !== board._id && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingId(board._id); setEditTitle(board.name); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                                                title="Rename"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDownload(board, e)}
                                                className="p-1.5 text-slate-400 hover:text-green-500 transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {editingId === board._id ? (
                                <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-orange-500"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename(board._id, e)}
                                    />
                                    <button onClick={(e) => handleRename(board._id, e)} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded">
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{board.name}</h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Updated {new Date(board.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WhiteboardList;
