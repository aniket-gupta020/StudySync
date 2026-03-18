import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '../../context/CallContext';
import {
    Mic, MicOff, Camera, CameraOff, PhoneOff,
    Volume2, VolumeX, Users, Maximize2, Minimize2, Phone, RefreshCw, Volume1
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

const VideoTile = ({ stream, name, isLocal, isMuted: micOff, isCameraOff: camOff, speakerMode = 'speaker', sinkId, facingMode }) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    // Attach stream to video element
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Separate audio element for remote streams (essential for voice-only calls)
    useEffect(() => {
        if (audioRef.current && stream && !isLocal) {
            audioRef.current.srcObject = stream;
            audioRef.current.muted = speakerMode === 'mute';

            if (sinkId && speakerMode === 'receiver' && 'setSinkId' in audioRef.current) {
                audioRef.current.setSinkId(sinkId).catch(err => {
                    console.warn('Failed to setSinkId on audio element:', err);
                });
            } else if (speakerMode === 'speaker' && 'setSinkId' in audioRef.current) {
                audioRef.current.setSinkId('').catch(() => {}); // back to default
            }
        }
    }, [stream, speakerMode, sinkId, isLocal]);

    const hasVideo = stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');
    const isMirrored = isLocal && facingMode === 'user';

    return (
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center aspect-video shadow-xl border border-white/5">
            {/* Hidden audio element for remote participants */}
            {!isLocal && stream && (
                <audio ref={audioRef} autoPlay playsInline />
            )}

            {stream && hasVideo && !camOff ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className={`w-full h-full object-cover ${isMirrored ? '-scale-x-100' : ''}`}
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

// Ringing animation dots
const RingingDots = () => (
    <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
            <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-orange-400"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            />
        ))}
    </div>
);

const CallScreen = ({ groupName }) => {
    const {
        inCall, callType, callRoomId, participants, callStartTime,
        isMuted, isCameraOff, speakerMode, activeSinkId, isRinging,
        localStream, remoteStreams,
        hangUp, toggleMute, toggleCamera, setSpeakerOutput, flipCamera, facingMode
    } = useCall();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
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

    const getGridClass = () => {
        const total = remoteEntries.length + 1;
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
                                {isRinging ? (
                                    <>
                                        <span className="text-orange-400 text-sm font-medium">Calling</span>
                                        <RingingDots />
                                    </>
                                ) : (
                                    <>
                                        <CallTimer startTime={callStartTime} />
                                        <span className="text-white/50 text-xs">•</span>
                                        <span className="text-white/50 text-xs capitalize">{callType} call</span>
                                    </>
                                )}
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

                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                    {isRinging ? (
                        /* Ringing Screen */
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center gap-6"
                        >
                            {/* Pulsing ring animation */}
                            <div className="relative">
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-orange-500/20"
                                    animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    style={{ width: 120, height: 120, margin: -10 }}
                                />
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-orange-500/10"
                                    animate={{ scale: [1, 2.2, 1], opacity: [0.3, 0, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    style={{ width: 120, height: 120, margin: -10 }}
                                />
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-orange-500/30 relative z-10">
                                    <Phone className="w-10 h-10 text-white" />
                                </div>
                            </div>

                            <div className="text-center">
                                <h3 className="text-white text-xl font-semibold mb-1">
                                    Calling {groupName || 'Group'}...
                                </h3>
                                <p className="text-white/50 text-sm capitalize">
                                    {callType} call • Waiting for others to join
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        /* Video Grid */
                        <div className={`grid ${getGridClass()} gap-4 w-full mx-auto`}>
                            <VideoTile
                                stream={localStream}
                                name="You"
                                isLocal={true}
                                isMuted={isMuted}
                                isCameraOff={isCameraOff || callType === 'voice'}
                                facingMode={facingMode}
                            />
                            {remoteEntries.map(([socketId, stream]) => {
                                const participant = participants[socketId];
                                return (
                                    <VideoTile
                                        key={socketId}
                                        stream={stream}
                                        name={participant?.name || 'Participant'}
                                        isLocal={false}
                                        speakerMode={speakerMode}
                                        sinkId={activeSinkId}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 py-6 px-4 flex-shrink-0">
                    {!isRinging && (
                        <>
                            <button
                                onClick={toggleMute}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                    isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                                }`}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowSpeakerMenu(!showSpeakerMenu)}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                        speakerMode === 'mute' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                                    }`}
                                    title="Speaker Output"
                                >
                                    {speakerMode === 'mute' ? <VolumeX className="w-6 h-6" /> : speakerMode === 'receiver' ? <Volume1 className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                </button>
                                
                                <AnimatePresence>
                                    {showSpeakerMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 rounded-xl p-1 shadow-2xl z-20 flex flex-col gap-1 w-32"
                                        >
                                            <button 
                                                onClick={() => { setSpeakerOutput('speaker'); setShowSpeakerMenu(false); }}
                                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 ${speakerMode === 'speaker' && 'bg-white/10 font-bold text-orange-400'}`}
                                            >
                                                <Volume2 className="w-4 h-4" /> Speaker
                                            </button>
                                            <button 
                                                onClick={() => { setSpeakerOutput('receiver'); setShowSpeakerMenu(false); }}
                                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 ${speakerMode === 'receiver' && 'bg-white/10 font-bold text-orange-400'}`}
                                            >
                                                <Volume1 className="w-4 h-4" /> Earpiece
                                            </button>
                                            <button 
                                                onClick={() => { setSpeakerOutput('mute'); setShowSpeakerMenu(false); }}
                                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 ${speakerMode === 'mute' && 'bg-red-500/20 font-bold text-red-500'}`}
                                            >
                                                <VolumeX className="w-4 h-4" /> Mute
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={toggleCamera}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                    isCameraOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                                }`}
                                title={isCameraOff ? 'Camera On' : 'Camera Off'}
                            >
                                {isCameraOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                            </button>

                            {/* Flip Camera Button */}
                            {!isCameraOff && (
                                <button
                                    onClick={flipCamera}
                                    className="w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95"
                                    title="Flip Camera"
                                >
                                    <RefreshCw className="w-6 h-6" />
                                </button>
                            )}
                        </>
                    )}

                    {/* Hang Up — always visible */}
                    <button
                        onClick={hangUp}
                        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95"
                        title={isRinging ? 'Cancel' : 'Hang Up'}
                    >
                        <PhoneOff className="w-7 h-7" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CallScreen;
