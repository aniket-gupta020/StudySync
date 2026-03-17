import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '../../context/CallContext';
import {
    Mic, MicOff, Camera, CameraOff, PhoneOff,
    Volume2, VolumeX, Users, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');

    return <span className="text-white/80 text-sm font-mono">{mins}:{secs}</span>;
};

const VideoTile = ({ stream, name, isLocal, isMuted: micOff, isCameraOff: camOff, isSpeakerOff }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            if (isSpeakerOff && !isLocal) {
                videoRef.current.muted = true;
            } else if (!isLocal) {
                videoRef.current.muted = false;
            }
        }
    }, [stream, isSpeakerOff, isLocal]);

    const hasVideo = stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

    return (
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center aspect-video shadow-xl border border-white/5">
            {stream && hasVideo && !camOff ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-white/70 text-sm font-medium">{name || 'Unknown'}</span>
                </div>
            )}

            {/* Name badge */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
                <span className="text-white text-xs font-medium truncate max-w-[100px]">
                    {isLocal ? 'You' : name}
                </span>
                {micOff && <MicOff className="w-3 h-3 text-red-400" />}
            </div>

            {isLocal && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500/80 rounded-md text-white text-[10px] font-bold">
                    YOU
                </div>
            )}
        </div>
    );
};

const CallScreen = ({ groupName }) => {
    const {
        inCall, callType, callRoomId, participants, callStartTime,
        isMuted, isCameraOff, isSpeakerOff,
        localStream, remoteStreams,
        hangUp, toggleMute, toggleCamera, toggleSpeaker
    } = useCall();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    if (!inCall) return null;

    const remoteEntries = Object.entries(remoteStreams);
    const totalParticipants = Object.keys(participants).length;

    // Grid layout class based on participant count
    const getGridClass = () => {
        const total = remoteEntries.length + 1; // +1 for local
        if (total <= 1) return 'grid-cols-1 max-w-xl';
        if (total <= 2) return 'grid-cols-1 sm:grid-cols-2 max-w-3xl';
        if (total <= 4) return 'grid-cols-2 max-w-4xl';
        return 'grid-cols-2 sm:grid-cols-3 max-w-5xl';
    };

    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold shadow-lg">
                            {groupName?.charAt(0)?.toUpperCase() || 'G'}
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-lg">{groupName || 'Group Call'}</h2>
                            <div className="flex items-center gap-2">
                                <CallTimer startTime={callStartTime} />
                                <span className="text-white/50 text-xs">•</span>
                                <span className="text-white/50 text-xs capitalize">{callType} call</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
                            <Users className="w-4 h-4 text-white/70" />
                            <span className="text-white/70 text-sm font-medium">{totalParticipants}</span>
                        </div>
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Video Grid */}
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                    <div className={`grid ${getGridClass()} gap-4 w-full mx-auto`}>
                        {/* Local video */}
                        <VideoTile
                            stream={localStream}
                            name="You"
                            isLocal={true}
                            isMuted={isMuted}
                            isCameraOff={isCameraOff || callType === 'voice'}
                        />

                        {/* Remote videos */}
                        {remoteEntries.map(([socketId, stream]) => {
                            const participant = participants[socketId];
                            return (
                                <VideoTile
                                    key={socketId}
                                    stream={stream}
                                    name={participant?.name || 'Participant'}
                                    isLocal={false}
                                    isSpeakerOff={isSpeakerOff}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 py-6 px-4 flex-shrink-0">
                    {/* Mute */}
                    <button
                        onClick={toggleMute}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                            isMuted
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-white/15 hover:bg-white/25 text-white'
                        }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* Speaker */}
                    <button
                        onClick={toggleSpeaker}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                            isSpeakerOff
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-white/15 hover:bg-white/25 text-white'
                        }`}
                        title={isSpeakerOff ? 'Speaker On' : 'Speaker Off'}
                    >
                        {isSpeakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>

                    {/* Camera (only for video calls) */}
                    {callType === 'video' && (
                        <button
                            onClick={toggleCamera}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                isCameraOff
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-white/15 hover:bg-white/25 text-white'
                            }`}
                            title={isCameraOff ? 'Camera On' : 'Camera Off'}
                        >
                            {isCameraOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                        </button>
                    )}

                    {/* Hang Up */}
                    <button
                        onClick={hangUp}
                        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95"
                        title="Hang Up"
                    >
                        <PhoneOff className="w-7 h-7" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CallScreen;
