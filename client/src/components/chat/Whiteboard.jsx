import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
    Pencil, Eraser, Trash2, Download, Palette,
    Minus, Square, Circle, Triangle, MoveRight,
    Diamond, Star, Pentagon, Hexagon,
    Maximize2, Minimize2, Check, ChevronDown,
    Type, Slash
} from 'lucide-react';

// ─── Constants ────────────────────────────────
const COLORS = [
    '#f97316','#eab308','#22c55e','#3b82f6',
    '#a855f7','#ec4899','#ef4444','#14b8a6',
    '#ffffff','#94a3b8','#1e293b','#000000',
];

const SHAPE_TOOLS = [
    { id: 'line',     icon: Minus,     label: 'Line' },
    { id: 'rect',     icon: Square,    label: 'Rectangle' },
    { id: 'circle',   icon: Circle,    label: 'Ellipse' },
    { id: 'triangle', icon: Triangle,  label: 'Triangle' },
    { id: 'arrow',    icon: MoveRight, label: 'Arrow' },
    { id: 'diamond',  icon: Diamond,   label: 'Diamond' },
    { id: 'star',     icon: Star,      label: 'Star' },
    { id: 'dline',    icon: Slash,     label: 'Dashed Line' },
];

// ─── Draw helpers ─────────────────────────────
const applyStyle = (ctx, color, sz, op, eraser, dash = false) => {
    ctx.globalAlpha = eraser ? 1 : op;
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = eraser ? 'rgba(0,0,0,1)' : color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = sz;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.setLineDash(dash ? [sz * 2, sz * 2] : []);
};

const drawShape = (ctx, tool, x0, y0, x1, y1, color, sz, op, filled) => {
    if (!ctx) return;
    applyStyle(ctx, color, sz, op, false, tool === 'dline');
    ctx.beginPath();
    switch (tool) {
        case 'line':
        case 'dline':
            ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); break;
        case 'rect':
            if (filled) {
                ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            } else {
                ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            }
            break;
        case 'circle': {
            const rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
            ctx.ellipse(x0 + rx, y0 + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
            filled ? ctx.fill() : ctx.stroke(); break;
        }
        case 'triangle':
            ctx.moveTo((x0 + x1) / 2, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.closePath();
            filled ? ctx.fill() : ctx.stroke(); break;
        case 'arrow': {
            const hl = Math.max(10, sz * 3), a = Math.atan2(y1 - y0, x1 - x0);
            ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
            ctx.lineTo(x1 - hl * Math.cos(a - Math.PI / 6), y1 - hl * Math.sin(a - Math.PI / 6));
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 - hl * Math.cos(a + Math.PI / 6), y1 - hl * Math.sin(a + Math.PI / 6));
            ctx.stroke(); break;
        }
        case 'diamond': {
            const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
            ctx.moveTo(mx, y0); ctx.lineTo(x1, my); ctx.lineTo(mx, y1); ctx.lineTo(x0, my); ctx.closePath();
            filled ? ctx.fill() : ctx.stroke(); break;
        }
        case 'star': {
            const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
            const ro = Math.min(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2, ri = ro * 0.4;
            for (let i = 0; i < 10; i++) {
                const a = (Math.PI / 5) * i - Math.PI / 2, r = i % 2 === 0 ? ro : ri;
                i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                        : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
            }
            ctx.closePath(); filled ? ctx.fill() : ctx.stroke(); break;
        }
        default: break;
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
};

// ─── Toolbar button ───────────────────────────
const TBtn = ({ active, onClick, title, children, extra = '' }) => (
    <button
        onClick={onClick} title={title}
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
            active
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : `text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 ${extra}`
        }`}
    >
        {children}
    </button>
);

// ─── Popover wrapper ───────────────────────────
const Popover = ({ children }) => (
    <div className="absolute top-12 left-0 z-50 clay-card !p-4 min-w-[200px] flex flex-col gap-3">
        {children}
    </div>
);

// ─── Component ────────────────────────────────
const Whiteboard = ({ groupId, user, onPostToChat }) => {
    const bgRef      = useRef(null);
    const overlayRef = useRef(null);
    const containerRef = useRef(null);
    const { socket, isConnected } = useSocket();

    const [tool,        setTool]        = useState('pen');
    const [color,       setColor]       = useState('#f97316');
    const [size,        setSize]        = useState(4);
    const [opacity,     setOpacity]     = useState(1);
    const [filled,      setFilled]      = useState(false);
    const [isDrawing,   setIsDrawing]   = useState(false);
    const [openPopover, setOpenPopover] = useState(null); // 'pen'|'eraser'|'shape'|'color'|null
    const [activeShape, setActiveShape] = useState('line');
    const [isFullscreen,setIsFullscreen]= useState(false);
    const [isDirty,     setIsDirty]     = useState(false);
    const [isReady,     setIsReady]     = useState(false);
    const [showDoneConfirm, setShowDoneConfirm] = useState(false);

    const startPos   = useRef(null);
    const lastPos    = useRef(null);
    const drawBuffer = useRef([]);
    const undoStack  = useRef([]);  // array of ImageData snapshots
    const redoStack  = useRef([]);

    const isShapeTool = !['pen', 'eraser'].includes(tool);
    const getBgCtx    = () => bgRef.current?.getContext('2d');
    const getOvCtx    = () => overlayRef.current?.getContext('2d');
    const clearOverlay = () => {
        const c = overlayRef.current;
        if (c) getOvCtx().clearRect(0, 0, c.width, c.height);
    };

    // ─── Snapshot helpers for undo/redo
    const saveSnapshot = useCallback(() => {
        const canvas = bgRef.current; if (!canvas) return;
        const snap = getBgCtx().getImageData(0, 0, canvas.width, canvas.height);
        undoStack.current.push(snap);
        if (undoStack.current.length > 40) undoStack.current.shift(); // max 40 steps
        redoStack.current = []; // clear redo on new action
    }, []);

    const handleUndo = useCallback(() => {
        if (undoStack.current.length === 0) return;
        const canvas = bgRef.current; if (!canvas) return;
        const ctx = getBgCtx();
        // Save current to redo
        redoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        const prev = undoStack.current.pop();
        ctx.putImageData(prev, 0, 0);
    }, []);

    const handleRedo = useCallback(() => {
        if (redoStack.current.length === 0) return;
        const canvas = bgRef.current; if (!canvas) return;
        const ctx = getBgCtx();
        undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        const next = redoStack.current.pop();
        ctx.putImageData(next, 0, 0);
    }, []);

    // toggle popover
    const togglePopover = (id) => setOpenPopover(p => p === id ? null : id);
    const closePopover  = ()   => setOpenPopover(null);

    // Select shape tool and keep popover open
    const selectShape = (id) => { setActiveShape(id); setTool(id); };

    // ─── Broadcast helper
    const broadcastDraw = useCallback((data) => {
        if (socket && isConnected) {
            socket.emit('draw', { roomId: groupId, drawData: data });
        }
    }, [socket, isConnected, groupId]);

    // ─── freehand
    const drawFreehand = useCallback((x0, y0, x1, y1, c, s, op, eraser) => {
        const ctx = getBgCtx(); if (!ctx) return;
        applyStyle(ctx, c, s, op, eraser);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }, []);

    // ─── socket listeners
    useEffect(() => {
        if (!socket || !isConnected) return;

        // Join whiteboard session
        socket.emit('whiteboard-join', { roomId: groupId, user });

        const onDraw = ({ x0,y0,x1,y1,color:c,size:s,opacity:op,eraser,tool:t,filled:f }) => {
            if (t && !['pen','eraser'].includes(t)) drawShape(getBgCtx(), t, x0,y0,x1,y1, c,s,op??1,f);
            else drawFreehand(x0,y0,x1,y1, c,s, op??1, eraser);
        };
        const onClear = () => { const bg = bgRef.current; if (bg) getBgCtx().clearRect(0,0,bg.width,bg.height); };
        
        socket.on('draw-update', onDraw);
        socket.on('canvas-cleared', onClear);

        return () => {
            socket.off('draw-update', onDraw);
            socket.off('canvas-cleared', onClear);
        };
    }, [socket, isConnected, groupId, user, drawFreehand]);

    // ─── resize canvases
    useEffect(() => {
        const syncSize = () => {
            [bgRef, overlayRef].forEach(ref => {
                const canvas = ref.current; if (!canvas) return;
                const rect = canvas.parentElement.getBoundingClientRect();
                const ctx  = canvas.getContext('2d');
                const img  = ctx.getImageData(0,0,canvas.width,canvas.height);
                canvas.width  = rect.width;
                canvas.height = Math.max(rect.height, isFullscreen ? window.innerHeight - 120 : 520);
                ctx.putImageData(img, 0, 0);
            });
        };
        syncSize();
        window.addEventListener('resize', syncSize);
        return () => window.removeEventListener('resize', syncSize);
    }, [isFullscreen]);

    // ─── Keyboard undo/redo
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleUndo, handleRedo]);

    // ─── pointer
    const getXY = (e) => {
        const rect = bgRef.current.getBoundingClientRect();
        const src  = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };
    const onPointerDown = (e) => {
        e.preventDefault(); closePopover();
        const pos = getXY(e); setIsDrawing(true);
        startPos.current = pos; lastPos.current = pos;
        saveSnapshot(); // snapshot BEFORE drawing so undo restores the pre-stroke state
    };
    const onPointerMove = (e) => {
        e.preventDefault(); if (!isDrawing) return;
        const pos = getXY(e);
        if (isShapeTool) {
            clearOverlay();
            drawShape(getOvCtx(), tool, startPos.current.x, startPos.current.y, pos.x, pos.y, color, size, opacity, filled);
        } else {
            const eraser = tool === 'eraser';
            drawFreehand(lastPos.current.x, lastPos.current.y, pos.x, pos.y, color, size, opacity, eraser);
            
            // Broadcast in real-time
            broadcastDraw({ x0:lastPos.current.x, y0:lastPos.current.y, x1:pos.x, y1:pos.y, color, size, opacity, eraser, tool });
            
            if (!eraser) setIsDirty(true);
            lastPos.current = pos;
        }
    };
    const onPointerUp = (e) => {
        if (!isDrawing) return;
        if (isShapeTool) {
            const rect = bgRef.current.getBoundingClientRect();
            const pos  = e.touches
                ? { x: e.changedTouches[0].clientX - rect.left, y: e.changedTouches[0].clientY - rect.top }
                : getXY(e);
            clearOverlay();
            drawShape(getBgCtx(), tool, startPos.current.x, startPos.current.y, pos.x, pos.y, color, size, opacity, filled);
            
            // Broadcast final shape
            broadcastDraw({ x0:startPos.current.x, y0:startPos.current.y, x1:pos.x, y1:pos.y, color, size, opacity, eraser:false, tool, filled });
            
            setIsDirty(true);
        }
        setIsDrawing(false);
    };

    const handleClear = () => {
        const bg = bgRef.current; if (bg) getBgCtx().clearRect(0,0,bg.width,bg.height);
        clearOverlay(); drawBuffer.current = []; setIsDirty(false);
        if (socket && isConnected) socket.emit('clear-canvas', groupId);
    };

    const handlePostToChat = useCallback(async () => {
        if (!bgRef.current || !overlayRef.current) return;
        
        const merged = document.createElement('canvas');
        merged.width = bgRef.current.width; 
        merged.height = bgRef.current.height;
        const mCtx = merged.getContext('2d');
        
        // Background color
        mCtx.fillStyle = '#ffffff'; 
        mCtx.fillRect(0,0,merged.width,merged.height);
        
        // Draw layers
        mCtx.drawImage(bgRef.current, 0, 0);
        mCtx.drawImage(overlayRef.current, 0, 0);
        
        return new Promise((resolve) => {
            merged.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `whiteboard_${Date.now()}.png`, { type: 'image/png' });
                    if (onPostToChat) onPostToChat(file);
                    
                    // Reset state
                    setIsDirty(false);
                    setIsReady(false);
                    setShowDoneConfirm(false);
                    handleClear();
                    resolve(true);
                }
            }, 'image/png');
        });
    }, [onPostToChat, handleClear]);

    const handleConfirmDone = () => {
        if (socket && isConnected) {
            setIsReady(true);
            socket.emit('whiteboard-ready', { roomId: groupId });
        }
    };

    // Listen for server-triggered post
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleTrigger = ({ capturerId, isTimeout }) => {
            if (socket.id === capturerId) {
                console.log(`📸 Designated as capturer${isTimeout ? ' (Timeout)' : ''}. Capturing...`);
                handlePostToChat();
            }
        };

        socket.on('whiteboard-trigger-post', handleTrigger);
        return () => socket.off('whiteboard-trigger-post', handleTrigger);
    }, [socket, isConnected, handlePostToChat]);
    const handleDownload = () => {
        const merged = document.createElement('canvas');
        merged.width = bgRef.current.width; merged.height = bgRef.current.height;
        const mCtx = merged.getContext('2d');
        mCtx.fillStyle = '#ffffff'; mCtx.fillRect(0,0,merged.width,merged.height);
        mCtx.drawImage(bgRef.current,0,0); mCtx.drawImage(overlayRef.current,0,0);
        Object.assign(document.createElement('a'), { download:`whiteboard-${groupId}.png`, href: merged.toDataURL() }).click();
    };

    const currentShapeIcon = SHAPE_TOOLS.find(s => s.id === activeShape)?.icon ?? Minus;
    const ShapeIcon = currentShapeIcon;

    return (
        <div
            ref={containerRef}
            className={`flex flex-col gap-0 transition-all ${
                isFullscreen
                    ? 'fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-900 p-4'
                    : ''
            }`}
        >
            {/* ─── Toolbar ─── */}
            <div className="clay-card !rounded-b-none !p-2 flex items-center gap-1 flex-wrap">

                {/* ── Pen ── */}
                <div className="relative">
                    <TBtn active={tool === 'pen'} title="Pen"
                        onClick={() => { setTool('pen'); togglePopover('pen'); }}
                    >
                        <Pencil className="w-4 h-4" />
                    </TBtn>
                    {openPopover === 'pen' && (
                        <Popover>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Size</label>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full flex-shrink-0" style={{ width: Math.max(4, Math.min(size,24)), height: Math.max(4, Math.min(size,24)), background: color }} />
                                <input type="range" min="1" max="40" value={size} onChange={e=>setSize(+e.target.value)} className="flex-1 accent-orange-500 cursor-pointer" />
                                <span className="text-xs font-mono text-slate-400 w-6">{size}</span>
                            </div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Opacity</label>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(+e.target.value)} className="flex-1 accent-orange-500 cursor-pointer" />
                                <span className="text-xs font-mono text-slate-400 w-8">{Math.round(opacity*100)}%</span>
                            </div>
                        </Popover>
                    )}
                </div>

                {/* ── Eraser ── */}
                <div className="relative">
                    <TBtn active={tool === 'eraser'} title="Eraser"
                        onClick={() => { setTool('eraser'); togglePopover('eraser'); }}
                    >
                        <Eraser className="w-4 h-4" />
                    </TBtn>
                    {openPopover === 'eraser' && (
                        <Popover>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Eraser Size</label>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full flex-shrink-0 bg-slate-300" style={{ width: Math.max(4, Math.min(size,24)), height: Math.max(4, Math.min(size,24)) }} />
                                <input type="range" min="4" max="80" value={size} onChange={e=>setSize(+e.target.value)} className="flex-1 accent-orange-500 cursor-pointer" />
                                <span className="text-xs font-mono text-slate-400 w-6">{size}</span>
                            </div>
                        </Popover>
                    )}
                </div>

                {/* ── Shapes ── */}
                <div className="relative">
                    <TBtn active={isShapeTool} title="Shapes"
                        onClick={() => togglePopover('shape')}
                        extra=""
                    >
                        <div className="flex items-center gap-0.5">
                            <ShapeIcon className="w-4 h-4" />
                            <ChevronDown className="w-2.5 h-2.5" />
                        </div>
                    </TBtn>
                    {openPopover === 'shape' && (
                        <Popover>
                            <div className="grid grid-cols-4 gap-1.5">
                                {SHAPE_TOOLS.map(({ id, icon: Icon, label }) => (
                                    <button key={id} onClick={() => selectShape(id)} title={label}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all ${
                                            activeShape === id
                                                ? 'bg-orange-500 text-white'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-[10px] leading-none">{label}</span>
                                    </button>
                                ))}
                            </div>
                            {/* Fill toggle */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                                <span className="text-xs text-slate-500">Fill shape</span>
                                <button onClick={() => setFilled(f => !f)}
                                    className={`w-9 h-5 rounded-full transition-colors relative ${filled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${filled ? 'left-4' : 'left-0.5'}`} />
                                </button>
                            </div>
                            {/* Opacity only */}
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Opacity</label>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(+e.target.value)} className="flex-1 accent-orange-500 cursor-pointer" />
                                <span className="text-xs font-mono text-slate-400 w-8">{Math.round(opacity*100)}%</span>
                            </div>
                        </Popover>
                    )}
                </div>

                {/* divider */}
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* ── Color ── */}
                <div className="relative">
                    <button onClick={() => togglePopover('color')} title="Color"
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                        <span className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-600 shadow" style={{ background: color }} />
                    </button>
                    {openPopover === 'color' && (
                        <Popover>
                            <div className="grid grid-cols-6 gap-2">
                                {COLORS.map(c => (
                                    <button key={c} onClick={() => { setColor(c); closePopover(); }}
                                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${color===c?'border-orange-500 scale-110':'border-transparent'}`}
                                        style={{ background: c }} />
                                ))}
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                                <span className="text-xs text-slate-500">Custom</span>
                                <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0" />
                            </label>
                        </Popover>
                    )}
                </div>

                {/* divider */}
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* Clear */}
                <TBtn onClick={handleClear} title="Clear board">
                    <Trash2 className="w-4 h-4 text-red-400" />
                </TBtn>

                {/* Undo */}
                <TBtn onClick={handleUndo} title="Undo (Ctrl+Z)">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6"/><path d="M3 13C5 7 10 4 16 6a9 9 0 0 1 5 8"/>
                    </svg>
                </TBtn>

                {/* Redo */}
                <TBtn onClick={handleRedo} title="Redo (Ctrl+Y)">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 7v6h-6"/><path d="M21 13C19 7 14 4 8 6a9 9 0 0 0-5 8"/>
                    </svg>
                </TBtn>

                {/* Download */}
                <TBtn onClick={handleDownload} title="Download PNG">
                    <Download className="w-4 h-4" />
                </TBtn>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Status */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 px-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {isConnected ? 'Live' : 'Offline'}
                </div>

                {/* Done */}
                {isDirty && (
                    <div className="flex items-center gap-2">
                        {!showDoneConfirm ? (
                            <button onClick={() => setShowDoneConfirm(true)}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm">
                                <Check className="w-4 h-4" /> Done
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-right-2">
                                <span className="text-xs font-semibold px-2 text-slate-600 dark:text-slate-300">Are you finished?</span>
                                {isReady ? (
                                    <span className="text-xs text-emerald-500 font-medium px-2 flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Waiting for others...
                                    </span>
                                ) : (
                                    <>
                                        <button onClick={handleConfirmDone}
                                            className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
                                            Yes, Post
                                        </button>
                                        <button onClick={() => setShowDoneConfirm(false)}
                                            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                            No
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Fullscreen */}
                <TBtn onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </TBtn>
            </div>

            {/* ─── Canvas ─── */}
            <div
                className="relative clay-card !rounded-t-none !p-0 overflow-hidden flex-1"
                style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                onClick={closePopover}
            >
                <canvas ref={bgRef} className="block w-full touch-none" style={{ minHeight: isFullscreen ? 'calc(100vh - 130px)' : 520, background: '#ffffff' }} />
                <canvas ref={overlayRef}
                    className="absolute inset-0 w-full h-full touch-none"
                    style={{ pointerEvents: 'all' }}
                    onMouseDown={onPointerDown}
                    onMouseMove={onPointerMove}
                    onMouseUp={onPointerUp}
                    onMouseLeave={onPointerUp}
                    onTouchStart={onPointerDown}
                    onTouchMove={onPointerMove}
                    onTouchEnd={onPointerUp}
                />
            </div>
        </div>
    );
};

export default Whiteboard;
