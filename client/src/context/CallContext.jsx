import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export const CallProvider = ({ children }) => {
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();

    // Call state
    const [inCall, setInCall] = useState(false);
    const [callType, setCallType] = useState(null); // 'voice' | 'video'
    const [callRoomId, setCallRoomId] = useState(null);
    const [participants, setParticipants] = useState({});
    const [incomingCall, setIncomingCall] = useState(null);

    // Media state
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isSpeakerOff, setIsSpeakerOff] = useState(false);

    // Refs
    const localStreamRef = useRef(null);
    const peersRef = useRef({}); // { socketId: RTCPeerConnection }
    const remoteStreamsRef = useRef({}); // { socketId: MediaStream }
    const [remoteStreams, setRemoteStreams] = useState({}); // triggers re-render

    // Call duration
    const [callStartTime, setCallStartTime] = useState(null);

    // Get user media
    const getUserMedia = useCallback(async (type) => {
        try {
            const constraints = {
                audio: true,
                video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            return stream;
        } catch (error) {
            console.error('Failed to get media:', error);
            toast.error('Could not access microphone/camera. Please check permissions.');
            return null;
        }
    }, []);

    // Create peer connection for a remote user
    const createPeerConnection = useCallback((remoteSocketId) => {
        if (peersRef.current[remoteSocketId]) {
            peersRef.current[remoteSocketId].close();
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('call-signal', {
                    to: remoteSocketId,
                    signal: event.candidate,
                    type: 'ice-candidate'
                });
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            remoteStreamsRef.current[remoteSocketId] = remoteStream;
            setRemoteStreams(prev => ({ ...prev, [remoteSocketId]: remoteStream }));
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                cleanupPeer(remoteSocketId);
            }
        };

        peersRef.current[remoteSocketId] = pc;
        return pc;
    }, [socket]);

    // Cleanup a single peer
    const cleanupPeer = useCallback((socketId) => {
        if (peersRef.current[socketId]) {
            peersRef.current[socketId].close();
            delete peersRef.current[socketId];
        }
        if (remoteStreamsRef.current[socketId]) {
            delete remoteStreamsRef.current[socketId];
        }
        setRemoteStreams(prev => {
            const updated = { ...prev };
            delete updated[socketId];
            return updated;
        });
        setParticipants(prev => {
            const updated = { ...prev };
            delete updated[socketId];
            return updated;
        });
    }, []);

    // Cleanup all
    const cleanupCall = useCallback(() => {
        // Close all peers
        Object.keys(peersRef.current).forEach(id => {
            peersRef.current[id].close();
        });
        peersRef.current = {};
        remoteStreamsRef.current = {};

        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        setRemoteStreams({});
        setInCall(false);
        setCallType(null);
        setCallRoomId(null);
        setParticipants({});
        setCallStartTime(null);
        setIsMuted(false);
        setIsCameraOff(false);
    }, []);

    // Start a call
    const startCall = useCallback(async (roomId, type) => {
        const stream = await getUserMedia(type);
        if (!stream) return;

        setCallType(type);
        setCallRoomId(roomId);
        setInCall(true);
        setCallStartTime(Date.now());

        socket.emit('call-initiate', {
            roomId,
            callType: type,
            user: { _id: user._id, name: user.name }
        });
    }, [getUserMedia, socket, user]);

    // Join existing call
    const joinCall = useCallback(async (roomId, type) => {
        const stream = await getUserMedia(type || 'voice');
        if (!stream) return;

        setCallType(type || 'voice');
        setCallRoomId(roomId);
        setInCall(true);
        setCallStartTime(Date.now());
        setIncomingCall(null);

        socket.emit('call-join', {
            roomId,
            user: { _id: user._id, name: user.name }
        });
    }, [getUserMedia, socket, user]);

    // Hang up
    const hangUp = useCallback(() => {
        if (socket && callRoomId) {
            socket.emit('call-leave', { roomId: callRoomId });
        }
        cleanupCall();
    }, [socket, callRoomId, cleanupCall]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    // Toggle camera
    const toggleCamera = useCallback(() => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    }, []);

    // Toggle speaker
    const toggleSpeaker = useCallback(() => {
        setIsSpeakerOff(prev => !prev);
    }, []);

    // Socket event handlers
    useEffect(() => {
        if (!socket) return;

        // Someone called
        const handleIncoming = (data) => {
            if (!inCall) {
                setIncomingCall(data);
                toast((t) => (
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📞</span>
                        <div>
                            <p className="font-semibold">{data.initiator?.name} started a {data.callType} call</p>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => { toast.dismiss(t.id); joinCall(data.roomId, data.callType); }}
                                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm font-medium"
                                >
                                    Join
                                </button>
                                <button
                                    onClick={() => { toast.dismiss(t.id); setIncomingCall(null); }}
                                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-medium"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                ), { duration: 15000 });
            }
        };

        // We joined the call
        const handleJoined = async ({ participants: parts, existingParticipants }) => {
            setParticipants(parts);

            // Create offers to existing participants
            if (existingParticipants && existingParticipants.length > 0) {
                for (const peerId of existingParticipants) {
                    try {
                        const pc = createPeerConnection(peerId);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);

                        socket.emit('call-signal', {
                            to: peerId,
                            signal: offer,
                            type: 'offer'
                        });
                    } catch (error) {
                        console.error(`Failed to create offer for ${peerId}:`, error);
                    }
                }
            }
        };

        // New user joined the call
        const handleUserJoined = ({ socketId, userId, name }) => {
            setParticipants(prev => ({
                ...prev,
                [socketId]: { userId, name, socketId }
            }));
        };

        // Receive signaling data
        const handleSignal = async ({ from, signal, type }) => {
            try {
                if (type === 'offer') {
                    const pc = createPeerConnection(from);
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    socket.emit('call-signal', {
                        to: from,
                        signal: answer,
                        type: 'answer'
                    });
                } else if (type === 'answer') {
                    const pc = peersRef.current[from];
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    }
                } else if (type === 'ice-candidate') {
                    const pc = peersRef.current[from];
                    if (pc) {
                        await pc.addIceCandidate(new RTCIceCandidate(signal));
                    }
                }
            } catch (error) {
                console.error(`Signal handling error (${type}):`, error);
            }
        };

        // User left
        const handleUserLeft = ({ socketId }) => {
            cleanupPeer(socketId);
        };

        // Call ended by someone
        const handleCallEnded = () => {
            toast('Call ended', { icon: '📞' });
            cleanupCall();
        };

        socket.on('call-incoming', handleIncoming);
        socket.on('call-joined', handleJoined);
        socket.on('call-user-joined', handleUserJoined);
        socket.on('call-signal', handleSignal);
        socket.on('call-user-left', handleUserLeft);
        socket.on('call-ended', handleCallEnded);

        return () => {
            socket.off('call-incoming', handleIncoming);
            socket.off('call-joined', handleJoined);
            socket.off('call-user-joined', handleUserJoined);
            socket.off('call-signal', handleSignal);
            socket.off('call-user-left', handleUserLeft);
            socket.off('call-ended', handleCallEnded);
        };
    }, [socket, inCall, joinCall, createPeerConnection, cleanupPeer, cleanupCall]);

    const value = {
        // State
        inCall,
        callType,
        callRoomId,
        participants,
        incomingCall,
        isMuted,
        isCameraOff,
        isSpeakerOff,
        localStream: localStreamRef.current,
        remoteStreams,
        callStartTime,

        // Actions
        startCall,
        joinCall,
        hangUp,
        toggleMute,
        toggleCamera,
        toggleSpeaker,
    };

    return (
        <CallContext.Provider value={value}>
            {children}
        </CallContext.Provider>
    );
};
