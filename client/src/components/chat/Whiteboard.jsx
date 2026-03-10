import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
    Pencil, Eraser, Trash2, Download, Palette,
    Minus, Square, Circle, Triangle, MoveRight, Type
} from 'lucide-react';

const COLORS = [
    '#f97316', '#eab308', '#22c55e', '#3b82f6',
    '#a855f7', '#ec4899', '#ef4444', '#14b8a6',
    '#ffffff', '#94a3b8', '#1e293b', '#000000',
];

const TOOLS = [
    { id: 'pen',      icon: Pencil,     label: 'Pen',       group: 'draw'  },
    { id: 'eraser',   icon: Eraser,     label: 'Eraser',    group: 'draw'  },
    { id: 'line',     icon: Minus,      label: 'Line',      group: 'shape' },
    { id: 'rect',     icon: Square,     label: 'Rectangle', group: 'shape' },
    { id: 'circle',   icon: Circle,     label: 'Ellipse',   group: 'shape' },
    { id: 'triangle', icon: Triangle,   label: 'Triangle',  group: 'shape' },
    { id: 'arrow',    icon: MoveRight,  label: 'Arrow',     group: 'shape' },
];

// ─── Draw helpers ─────────────────────────────
const applyStyle = (ctx, color, size, opacity, eraser) => {
    ctx.globalAlpha = eraser ? 1 : opacity;
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = eraser ? 'rgba(0,0,0,1)' : color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = size;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
};

const drawShape = (ctx, tool, x0, y0, x1, y1, color, size, opacity, filled) => {
    applyStyle(ctx, color, size, opacity, false);
    ctx.beginPath();
    switch (tool) {
        case 'line':
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
            break;
        case 'rect':
            if (filled) {
                ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            }
            ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            break;
        case 'circle': {
            const rx = (x1 - x0) / 2;
            const ry = (y1 - y0) / 2;
            const cx = x0 + rx;
            const cy = y0 + ry;
            ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
            if (filled) ctx.fill();
            ctx.stroke();
            break;
        }
        case 'triangle':
            ctx.moveTo((x0 + x1) / 2, y0);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x0, y1);
            ctx.closePath();
            if (filled) ctx.fill();
            ctx.stroke();
            break;
        case 'arrow': {
            const headlen = Math.max(10, size * 3);
            const angle = Math.atan2(y1 - y0, x1 - x0);
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.lineTo(
                x1 - headlen * Math.cos(angle - Math.PI / 6),
                y1 - headlen * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(x1, y1);
            ctx.lineTo(
                x1 - headlen * Math.cos(angle + Math.PI / 6),
                y1 - headlen * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
            break;
        }
        default:
            break;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
};

// ─── Component ────────────────────────────────
const Whiteboard = ({ groupId }) => {
    const bgRef      = useRef(null);   // permanent drawings
    const overlayRef = useRef(null);   // shape preview
    const { socket, isConnected } = useSocket();

    const [tool,      setTool]      = useState('pen');
    const [color,     setColor]     = useState('#f97316');
    const [size,      setSize]      = useState(4);
    const [opacity,   setOpacity]   = useState(1);
    const [filled,    setFilled]    = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showColors,setShowColors]= useState(false);

    const startPos = useRef(null);
    const lastPos  = useRef(null);
    const isShape  = () => !['pen','eraser'].includes(tool);

    // ─── ctx helpers
    const getBgCtx = ()      => bgRef.current?.getContext('2d');
    const getOverlay = ()    => overlayRef.current?.getContext('2d');
    const clearOverlay = ()  => {
        const c = overlayRef.current;
        if (c) getOverlay().clearRect(0, 0, c.width, c.height);
    };

    // ─── freehand line on bg canvas
    const drawFreehand = useCallback((x0, y0, x1, y1, c, s, op, eraser) => {
        const ctx = getBgCtx();
        if (!ctx) return;
        applyStyle(ctx, c, s, op, eraser);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }, []);

    // ─── socket listeners
    useEffect(() => {
        if (!socket) return;
        const onDraw = ({ x0, y0, x1, y1, color: c, size: s, opacity: op, eraser, tool: t, filled: f }) => {
            if (t && !['pen','eraser'].includes(t)) {
                drawShape(getBgCtx(), t, x0, y0, x1, y1, c, s, op ?? 1, f);
            } else {
                drawFreehand(x0, y0, x1, y1, c, s, op ?? 1, eraser);
            }
        };
        const onClear = () => {
            const bg = bgRef.current;
            if (bg) getBgCtx().clearRect(0, 0, bg.width, bg.height);
        };
        socket.on('draw-update', onDraw);
        socket.on('canvas-cleared', onClear);
        return () => {
            socket.off('draw-update', onDraw);
            socket.off('canvas-cleared', onClear);
        };
    }, [socket, drawFreehand]);

    // ─── sync canvas sizes on resize
    useEffect(() => {
        const syncSize = () => {
            [bgRef, overlayRef].forEach(ref => {
                const canvas = ref.current;
                if (!canvas) return;
                const rect = canvas.parentElement.getBoundingClientRect();
                const ctx  = canvas.getContext('2d');
                const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
                canvas.width  = rect.width;
                canvas.height = Math.max(rect.height, 520);
                ctx.putImageData(img, 0, 0);
            });
        };
        syncSize();
        window.addEventListener('resize', syncSize);
        return () => window.removeEventListener('resize', syncSize);
    }, []);

    // ─── pointer helpers
    const getXY = (e) => {
        const rect = bgRef.current.getBoundingClientRect();
        const src  = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const onPointerDown = (e) => {
        e.preventDefault();
        const pos = getXY(e);
        setIsDrawing(true);
        startPos.current = pos;
        lastPos.current  = pos;
        setShowColors(false);
    };

    const onPointerMove = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const pos = getXY(e);
        if (isShape()) {
            clearOverlay();
            drawShape(getOverlay(), tool, startPos.current.x, startPos.current.y, pos.x, pos.y, color, size, opacity, filled);
        } else {
            const eraser = tool === 'eraser';
            drawFreehand(lastPos.current.x, lastPos.current.y, pos.x, pos.y, color, size, opacity, eraser);
            if (socket && isConnected) {
                socket.emit('draw', {
                    roomId: groupId,
                    drawData: { x0: lastPos.current.x, y0: lastPos.current.y, x1: pos.x, y1: pos.y, color, size, opacity, eraser, tool },
                });
            }
            lastPos.current = pos;
        }
    };

    const onPointerUp = (e) => {
        if (!isDrawing) return;
        if (isShape()) {
            const pos = e.touches ? { x: e.changedTouches[0].clientX - bgRef.current.getBoundingClientRect().left, y: e.changedTouches[0].clientY - bgRef.current.getBoundingClientRect().top } : getXY(e);
            clearOverlay();
            drawShape(getBgCtx(), tool, startPos.current.x, startPos.current.y, pos.x, pos.y, color, size, opacity, filled);
            if (socket && isConnected) {
                socket.emit('draw', {
                    roomId: groupId,
                    drawData: { x0: startPos.current.x, y0: startPos.current.y, x1: pos.x, y1: pos.y, color, size, opacity, eraser: false, tool, filled },
                });
            }
        }
        setIsDrawing(false);
    };

    const handleClear = () => {
        const bg = bgRef.current;
        if (bg) getBgCtx().clearRect(0, 0, bg.width, bg.height);
        clearOverlay();
        if (socket && isConnected) socket.emit('clear-canvas', groupId);
    };

    const handleDownload = () => {
        // Merge bg + overlay into one image
        const merged = document.createElement('canvas');
        merged.width  = bgRef.current.width;
        merged.height = bgRef.current.height;
        const mCtx   = merged.getContext('2d');
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(0, 0, merged.width, merged.height);
        mCtx.drawImage(bgRef.current, 0, 0);
        mCtx.drawImage(overlayRef.current, 0, 0);
        const link = document.createElement('a');
        link.download = `whiteboard-${groupId}.png`;
        link.href = merged.toDataURL();
        link.click();
    };

    const drawTools   = TOOLS.filter(t => t.group === 'draw');
    const shapeTools  = TOOLS.filter(t => t.group === 'shape');

    return (
        <div className="flex flex-col gap-4">
            {/* ─── Toolbar ─── */}
            <div className="clay-card !p-3 flex flex-wrap items-center gap-3">

                {/* Draw tools */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {drawTools.map(({ id, icon: Icon, label }) => (
                        <button key={id} onClick={() => setTool(id)} title={label}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                tool === id ? 'clay-button !py-1.5 !px-3 text-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                            }`}>
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>

                {/* Shape tools */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {shapeTools.map(({ id, icon: Icon, label }) => (
                        <button key={id} onClick={() => setTool(id)} title={label}
                            className={`px-2.5 py-1.5 rounded-lg transition-all ${
                                tool === id ? 'clay-button !py-1.5 !px-2.5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                            }`}>
                            <Icon className="w-4 h-4" />
                        </button>
                    ))}
                </div>

                {/* Fill toggle (shapes only) */}
                {isShape() && (
                    <button
                        onClick={() => setFilled(f => !f)}
                        title={filled ? 'Filled' : 'Outline'}
                        className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                            filled ? 'clay-button' : 'clay-button-secondary'
                        }`}
                    >
                        <span className={`w-3 h-3 rounded-sm border border-current ${filled ? 'bg-current' : ''}`} />
                        {filled ? 'Filled' : 'Outline'}
                    </button>
                )}

                {/* Divider */}
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

                {/* Size slider */}
                <div className="flex items-center gap-2">
                    <span
                        className="rounded-full flex-shrink-0"
                        style={{
                            width: Math.max(4, Math.min(size, 28)),
                            height: Math.max(4, Math.min(size, 28)),
                            background: tool === 'eraser' ? '#94a3b8' : color,
                            transition: 'width 0.12s, height 0.12s',
                        }}
                    />
                    <input type="range" min="1" max="40" value={size}
                        onChange={e => setSize(Number(e.target.value))}
                        className="w-20 sm:w-28 accent-orange-500 cursor-pointer"
                        title={`Size: ${size}px`}
                    />
                    <span className="text-xs font-mono text-slate-400 w-6">{size}</span>
                </div>

                {/* Opacity slider */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Opacity</span>
                    <input type="range" min="0.05" max="1" step="0.05" value={opacity}
                        onChange={e => setOpacity(Number(e.target.value))}
                        className="w-16 sm:w-24 accent-orange-500 cursor-pointer"
                        title={`Opacity: ${Math.round(opacity * 100)}%`}
                    />
                    <span className="text-xs font-mono text-slate-400 w-8">{Math.round(opacity * 100)}%</span>
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

                {/* Color picker */}
                <div className="relative">
                    <button onClick={() => setShowColors(s => !s)}
                        className="clay-button-icon flex items-center gap-2 !px-3 !py-2 !rounded-xl">
                        <span className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ background: color }} />
                        <Palette className="w-4 h-4" />
                    </button>
                    {showColors && (
                        <div className="absolute top-12 left-0 z-50 clay-card !p-3 grid grid-cols-6 gap-2 w-48">
                            {COLORS.map(c => (
                                <button key={c} onClick={() => { setColor(c); setShowColors(false); }}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${color === c ? 'border-orange-500 scale-110' : 'border-transparent'}`}
                                    style={{ background: c }} />
                            ))}
                            <label title="Custom color" className="w-6 h-6 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
                                <input type="color" className="opacity-0 absolute w-0 h-0" value={color} onChange={e => setColor(e.target.value)} />
                                <Palette className="w-3 h-3 text-slate-500" />
                            </label>
                        </div>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Status */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isConnected ? 'Live' : 'Offline'}
                </div>

                {/* Download */}
                <button onClick={handleDownload} className="clay-button-icon" title="Download as PNG">
                    <Download className="w-4 h-4" />
                </button>

                {/* Clear */}
                <button onClick={handleClear}
                    className="clay-button-secondary !py-1.5 !px-3 !text-red-500 flex items-center gap-1.5 text-sm">
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear</span>
                </button>
            </div>

            {/* ─── Canvas stack ─── */}
            <div className="relative clay-card !p-0 overflow-hidden"
                style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                onClick={() => setShowColors(false)}>
                {/* Background (committed drawings) */}
                <canvas ref={bgRef} className="block w-full touch-none" style={{ minHeight: 520, background: '#ffffff' }} />
                {/* Overlay (shape preview) */}
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

            <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                All members can draw simultaneously • Real-time sync
            </p>
        </div>
    );
};

export default Whiteboard;
