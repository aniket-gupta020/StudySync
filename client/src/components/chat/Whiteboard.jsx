import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
    Pencil, Eraser, Trash2, Download, Minus, Circle, 
    Square, Hand, Palette, ChevronDown
} from 'lucide-react';

const COLORS = [
    '#f97316', '#eab308', '#22c55e', '#3b82f6',
    '#a855f7', '#ec4899', '#ef4444', '#14b8a6',
    '#ffffff', '#64748b', '#1e293b', '#000000',
];

const PEN_SIZES = [
    { label: 'XS', value: 2 },
    { label: 'S',  value: 4 },
    { label: 'M',  value: 8 },
    { label: 'L',  value: 14 },
    { label: 'XL', value: 22 },
];

const TOOLS = [
    { id: 'pen',    icon: Pencil,  label: 'Pen' },
    { id: 'eraser', icon: Eraser,  label: 'Eraser' },
];

const Whiteboard = ({ groupId }) => {
    const canvasRef = useRef(null);
    const { socket, isConnected } = useSocket();

    const [tool, setTool]       = useState('pen');
    const [color, setColor]     = useState('#f97316');
    const [size, setSize]       = useState(4);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const lastPos = useRef(null);

    // ---- canvas helpers ----
    const getCtx = () => {
        const canvas = canvasRef.current;
        return canvas ? canvas.getContext('2d') : null;
    };

    const drawLine = useCallback((x0, y0, x1, y1, strokeColor, strokeSize, isEraser) => {
        const ctx = getCtx();
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineWidth   = strokeSize;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.strokeStyle = isEraser ? '#ffffff' : strokeColor;
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }, []);

    // ---- socket listeners ----
    useEffect(() => {
        if (!socket) return;

        const handleDrawUpdate = ({ x0, y0, x1, y1, color: c, size: s, eraser }) => {
            drawLine(x0, y0, x1, y1, c, s, eraser);
        };

        const handleClear = () => {
            const ctx = getCtx();
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        };

        socket.on('draw-update', handleDrawUpdate);
        socket.on('canvas-cleared', handleClear);

        return () => {
            socket.off('draw-update', handleDrawUpdate);
            socket.off('canvas-cleared', handleClear);
        };
    }, [socket, drawLine]);

    // ---- resize canvas to parent ----
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            // Save content via ImageData
            const ctx = canvas.getContext('2d');
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            canvas.width  = rect.width;
            canvas.height = Math.max(rect.height, 480);
            ctx.putImageData(img, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // ---- pointer events ----
    const getXY = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        lastPos.current = getXY(e);
    };

    const onPointerMove = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const pos = getXY(e);
        const { x: x0, y: y0 } = lastPos.current;
        const { x: x1, y: y1 } = pos;
        const isEraser = tool === 'eraser';
        drawLine(x0, y0, x1, y1, color, size, isEraser);

        if (socket && isConnected) {
            socket.emit('draw', {
                roomId: groupId,
                drawData: { x0, y0, x1, y1, color, size, eraser: isEraser },
            });
        }
        lastPos.current = pos;
    };

    const onPointerUp = () => setIsDrawing(false);

    // ---- clear canvas ----
    const handleClear = () => {
        const ctx = getCtx();
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (socket && isConnected) socket.emit('clear-canvas', groupId);
    };

    // ---- download ----
    const handleDownload = () => {
        const canvas = canvasRef.current;
        const link   = document.createElement('a');
        link.download = `whiteboard-${groupId}.png`;
        link.href     = canvas.toDataURL();
        link.click();
    };

    return (
        <div className="flex flex-col gap-4">
            {/* ─── Toolbar ─── */}
            <div className="clay-card !p-3 flex flex-wrap items-center gap-3">

                {/* Tool selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {TOOLS.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setTool(id)}
                            title={label}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                tool === id
                                    ? 'clay-button !py-1.5 !px-3 text-xs'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>

                {/* Pen sizes */}
                <div className="flex items-center gap-1">
                    {PEN_SIZES.map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => setSize(value)}
                            title={`${label} (${value}px)`}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold ${
                                size === value
                                    ? 'clay-button !p-0 !w-8 !h-8 text-xs'
                                    : 'clay-button-secondary !p-0 !w-8 !h-8 text-xs'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Color palette */}
                <div className="relative">
                    <button
                        onClick={() => setShowColors(s => !s)}
                        className="clay-button-icon flex items-center gap-2 !px-3 !py-2 !rounded-xl"
                    >
                        <span
                            className="w-4 h-4 rounded-full border-2 border-white shadow"
                            style={{ background: color }}
                        />
                        <Palette className="w-4 h-4" />
                    </button>
                    {showColors && (
                        <div className="absolute top-12 left-0 z-50 clay-card !p-3 grid grid-cols-6 gap-2 w-48">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); setShowColors(false); }}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${
                                        color === c ? 'border-orange-500 scale-110' : 'border-transparent'
                                    }`}
                                    style={{ background: c }}
                                />
                            ))}
                            {/* Custom colour */}
                            <label title="Custom color" className="w-6 h-6 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
                                <input type="color" className="opacity-0 absolute w-0 h-0" value={color} onChange={e => setColor(e.target.value)} />
                                <Palette className="w-3 h-3 text-slate-500" />
                            </label>
                        </div>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Connection status */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isConnected ? 'Live' : 'Offline'}
                </div>

                {/* Download */}
                <button onClick={handleDownload} className="clay-button-icon" title="Download">
                    <Download className="w-4 h-4" />
                </button>

                {/* Clear */}
                <button
                    onClick={handleClear}
                    className="clay-button-secondary !py-1.5 !px-3 !text-red-500 flex items-center gap-1.5 text-sm"
                    title="Clear board"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear</span>
                </button>
            </div>

            {/* ─── Canvas ─── */}
            <div
                className="relative clay-card !p-0 overflow-hidden"
                style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                onClick={() => setShowColors(false)}
            >
                <canvas
                    ref={canvasRef}
                    className="block w-full touch-none"
                    style={{ minHeight: 480, background: 'white' }}
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
                All group members can draw simultaneously • Changes are synced in real-time
            </p>
        </div>
    );
};

export default Whiteboard;
