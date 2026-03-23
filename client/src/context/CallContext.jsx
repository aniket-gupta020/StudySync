import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { playDialingSound, playRingtoneSound, stopCallSounds } from '../utils/callSounds';
import { useNotifications } from './NotificationContext';
import toast from 'react-hot-toast';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
    ]
};

export const CallProvider = ({ children }) => {
    const { socket } = useSocket();
    const { user } = useAuth();
    const { addNotification } = useNotifications();

    // Call state
    const [inCall, setInCall] = useState(false);
    const [callType, setCallType] = useState(null);
    const [callRoomId, setCallRoomId] = useState(null);
    const [participants, setParticipants] = useState({});
    const [incomingCall, setIncomingCall] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [callStartTime, setCallStartTime] = useState(null);
    const [isRinging, setIsRinging] = useState(false);
    const [activeCallInfo, setActiveCallInfo] = useState(null); // { roomId, callType, participants }

    // Media toggles
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [speakerMode, setSpeakerMode] = useState('speaker'); // 'speaker' | 'receiver' | 'mute'
    const [activeSinkId, setActiveSinkId] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'

    // Refs for use inside callbacks (avoid stale closures)
    const localStreamRef = useRef(null);
    const peersRef = useRef({});
    const inCallRef = useRef(false);
    const callRoomIdRef = useRef(null);
    const socketRef = useRef(null);
    const incomingCallRef = useRef(null);
    const callStartTimeRef = useRef(null);
    const participantsRef = useRef({});
    const callTypeRef = useRef(null);
    
    // Keep refs in sync with state
    useEffect(() => { inCallRef.current = inCall; }, [inCall]);
    useEffect(() => { callRoomIdRef.current = callRoomId; }, [callRoomId]);
    useEffect(() => { socketRef.current = socket; }, [socket]);
    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
    useEffect(() => { callStartTimeRef.current = callStartTime; }, [callStartTime]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);
    useEffect(() => { callTypeRef.current = callType; }, [callType]);

    // Get user media
    const getUserMedia = useCallback(async (type) => {
        try {
            // First check if any audio devices exist
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasAudio = devices.some(d => d.kind === 'audioinput');
            const hasVideo = devices.some(d => d.kind === 'videoinput');

            if (!hasAudio) {
                toast.error('No microphone found. Please connect a microphone and try again.');
                return null;
            }

            const constraints = {
                audio: true,
                video: type === 'video' 
                    ? (hasVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false) 
                    : false,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error('Failed to get media:', error);
            if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                toast.error('No microphone/camera found. Please connect a device.');
            } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                toast.error('Microphone/camera access denied. Please allow in browser settings.');
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                toast.error('Microphone/camera is being used by another app. Close it and retry.');
            } else {
                toast.error(`Could not access microphone: ${error.message || 'Unknown error'}`);
            }
            return null;
        }
    }, []);

    // Create peer connection for a remote user
    const createPeerConnection = useCallback((remoteSocketId) => {
        console.log(`🔗 Creating peer connection to ${remoteSocketId}`);

        // Close existing if any
        if (peersRef.current[remoteSocketId]) {
            try { peersRef.current[remoteSocketId].close(); } catch (e) {}
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks
        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => {
                console.log(`📤 Adding track: ${track.kind} to peer ${remoteSocketId}`);
                pc.addTrack(track, stream);
            });
        } else {
            console.warn('⚠️ No local stream when creating peer connection');
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('call-signal', {
                    to: remoteSocketId,
                    signal: event.candidate,
                    type: 'ice-candidate'
                });
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log(`📥 Received track from ${remoteSocketId}: ${event.track.kind}`);
            const [remoteStream] = event.streams;
            setRemoteStreams(prev => {
                const updated = { ...prev, [remoteSocketId]: remoteStream };
                // Start timer when first remote stream arrives
                if (Object.keys(prev).length === 0) {
                    setCallStartTime(Date.now());
                    setIsRinging(false);
                    stopCallSounds();
                }
                return updated;
            });
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE state for ${remoteSocketId}: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'failed') {
                console.log(`🔄 Restarting ICE for ${remoteSocketId}`);
                pc.restartIce();
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`🔌 Connection state for ${remoteSocketId}: ${pc.connectionState}`);
        };

        peersRef.current[remoteSocketId] = pc;
        return pc;
    }, []);

    // Cleanup all
    const cleanupCall = useCallback(() => {
        // Log Call History before clearing state
        if (inCallRef.current && callStartTimeRef.current) {
            try {
                console.log('📝 cleanupCall: Logging call history...');
                const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
                const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const secs = (elapsed % 60).toString().padStart(2, '0');
                const durationStr = `${mins}:${secs}`;
                
                const participantsList = Object.values(participantsRef.current).map(p => p.name || 'Participant');
                console.log('📝 cleanupCall: Participants:', participantsList);

                addNotification({
                    type: 'call-ended',
                    title: '📞 Call Ended',
                    body: `Duration: ${durationStr}`,
                    groupId: callRoomIdRef.current,
                    data: {
                        duration: durationStr,
                        participants: participantsList,
                        callType: callTypeRef.current,
                    }
                });
                console.log('✅ cleanupCall: addNotification triggered!');
            } catch (e) {
                console.error('❌ cleanupCall history log crash:', e);
            }
        } else {
            console.log('⚠️ cleanupCall: Skipping history log. inCall:', inCallRef.current, 'callStartTime:', callStartTimeRef.current);
        }

        Object.keys(peersRef.current).forEach(id => {
            try { peersRef.current[id].close(); } catch (e) {}
        });
        peersRef.current = {};

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        setLocalStream(null);
        setRemoteStreams({});
        setInCall(false);
        setCallType(null);
        setCallRoomId(null);
        setParticipants({});
        setCallStartTime(null);
        setIsRinging(false);
        setIsMuted(false);
        setIsCameraOff(false);
        setIncomingCall(null);
        stopCallSounds();
    }, []);

    // Start a call
    const startCall = useCallback(async (roomId, type) => {
        if (!socket) return;
        const stream = await getUserMedia(type);
        if (!stream) return;

        setCallType(type);
        if (type === 'voice') {
            setIsCameraOff(true);
        } else {
            setIsCameraOff(false);
        }
        setCallRoomId(roomId);
        setInCall(true);
        setIsRinging(true);
        playDialingSound();

        socket.emit('call-initiate', {
            roomId,
            callType: type,
            user: { _id: user._id, name: user.name }
        });
    }, [getUserMedia, socket, user]);

    // Join existing call
    const joinCall = useCallback(async (roomId, type) => {
        if (!socket) return;
        const stream = await getUserMedia(type || 'voice');
        if (!stream) return;

        const actualType = type || 'voice';
        setCallType(actualType);
        if (actualType === 'voice') {
            setIsCameraOff(true);
        } else {
            setIsCameraOff(false);
        }
        setCallRoomId(roomId);
        setInCall(true);
        setIsRinging(false);
        setCallStartTime(Date.now());
        setIncomingCall(null);
        stopCallSounds();

        socket.emit('call-join', {
            roomId,
            user: { _id: user._id, name: user.name }
        });
    }, [getUserMedia, socket, user]);

    // Hang up
    const hangUp = useCallback(() => {
        if (socketRef.current && callRoomIdRef.current) {
            socketRef.current.emit('call-leave', { roomId: callRoomIdRef.current });
        }
        cleanupCall();
    }, [cleanupCall]);

    // Decline incoming call
    const declineCall = useCallback(() => {
        if (incomingCall) {
            // Notify server that this user declined
            if (socketRef.current) {
                socketRef.current.emit('call-decline', {
                    roomId: incomingCall.roomId,
                    userId: user?._id
                });
            }
            addNotification({
                type: 'call',
                title: '📞 Missed Call',
                body: `You missed a call from ${incomingCall.initiator?.name || 'Someone'}`,
                groupId: incomingCall.roomId,
                playSound: false,
                sendBrowser: false,
            });
        }
        setIncomingCall(null);
        stopCallSounds();
    }, [incomingCall, addNotification, user]);

    // Check if a call is active in a room
    const checkActiveCall = useCallback((roomId) => {
        if (socket && roomId) {
            socket.emit('call-check', { roomId });
        }
    }, [socket]);

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

    // Toggle camera (Supports turning on camera during voice call)
    const toggleCamera = useCallback(async () => {
        if (!localStreamRef.current) return;

        let videoTrack = localStreamRef.current.getVideoTracks()[0];

        if (!videoTrack) {
            console.log('📹 No video track found, attempting to get user media for video...');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false, // already have audio
                    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
                });
                
                const newVideoTrack = stream.getVideoTracks()[0];
                if (newVideoTrack) {
                    localStreamRef.current.addTrack(newVideoTrack);
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks())); // Trigger state update
                    
                    // Add track to all existing peer connections
                    Object.keys(peersRef.current).forEach(peerId => {
                        const pc = peersRef.current[peerId];
                        if (pc) {
                            pc.addTrack(newVideoTrack, localStreamRef.current);
                        }
                    });

                    // Update local layout and switch type identifier
                    setCallType('video');
                    setIsCameraOff(false);

                    // Renegotiate connections with all peers
                    for (const peerId of Object.keys(peersRef.current)) {
                        const pc = peersRef.current[peerId];
                        try {
                            if (pc) {
                                const offer = await pc.createOffer();
                                await pc.setLocalDescription(offer);
                                socketRef.current.emit('call-signal', {
                                    to: peerId,
                                    signal: pc.localDescription,
                                    type: 'offer'
                                });
                                console.log(`📡 Renegotiated video track with peer ${peerId}`);
                            }
                        } catch (err) {
                            console.error(`Failed to renegotiate with ${peerId}:`, err);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to enable camera during voice call:', error);
                toast.error('Could not access camera. Please check permissions.');
            }
        } else {
            // Track exists, toggle enabled status
            videoTrack.enabled = !videoTrack.enabled;
            setIsCameraOff(!videoTrack.enabled);
        }
    }, [setCallType, setIsCameraOff, setLocalStream]);

    // Flip Camera support for mobile (Front / Back cam toggle)
    const flipCamera = useCallback(async () => {
        if (!localStreamRef.current) return;

        const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (!currentVideoTrack) return;

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        console.log(`🔄 Switching camera to ${newFacingMode}`);

        try {
            // Stop current track before re-acquiring media device clip
            currentVideoTrack.stop();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false, 
                video: { facingMode: { exact: newFacingMode }, width: { ideal: 640 }, height: { ideal: 480 } }
            }).catch(async () => {
                // Exact exact can fail on desktop, fallback without exact
                return await navigator.mediaDevices.getUserMedia({
                    audio: false, 
                    video: { facingMode: newFacingMode, width: { ideal: 640 }, height: { ideal: 480 } }
                });
            });

            const newVideoTrack = stream.getVideoTracks()[0];
            if (newVideoTrack) {
                localStreamRef.current.removeTrack(currentVideoTrack);
                localStreamRef.current.addTrack(newVideoTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

                setFacingMode(newFacingMode);

                // Replace track in all peer connections using RTCRtpSender.replaceTrack
                Object.keys(peersRef.current).forEach(peerId => {
                    const pc = peersRef.current[peerId];
                    if (pc) {
                        const senders = pc.getSenders();
                        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                        if (videoSender) {
                            videoSender.replaceTrack(newVideoTrack).catch(err => {
                                console.error(`Failed to replace track for peer ${peerId}:`, err);
                            });
                        }
                    }
                });
                console.log('✅ Camera flipped successfully without renegotiation');
            }
        } catch (error) {
            console.error('Failed to flip camera:', error);
            toast.error('Could not switch camera. Make sure devices are capable of multiple viewpoints.');
            
            // Try re-acquiring old track if fails? Usually getUserMedia fails early so stop doesn't break setup instantly.
        }
    }, [facingMode]);

    // Change speaker output mode (supports speaker / receiver / mute)
    const setSpeakerOutput = useCallback(async (mode) => {
        setSpeakerMode(mode);
        
        if (mode === 'receiver' && 'setSinkId' in HTMLMediaElement.prototype) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
                console.log('Audio Outputs:', audioOutputs);

                const target = audioOutputs.find(d => 
                    d.label.toLowerCase().includes('earpiece') || 
                    d.label.toLowerCase().includes('receiver') ||
                    (d.deviceId !== 'default' && !d.label.toLowerCase().includes('speaker'))
                );
                
                if (target) {
                    console.log(`Setting sinkId to ${target.deviceId} (${target.label})`);
                    setActiveSinkId(target.deviceId);
                } else {
                    setActiveSinkId(null);
                }
            } catch (error) {
                console.error('Failed to enumerate audio devices:', error);
            }
        } else {
            setActiveSinkId(null); // default (Speaker usually)
        }
    }, []);

    // Socket event handlers — registered once, use refs for current state
    useEffect(() => {
        if (!socket) return;

        // Someone started a call
        const handleIncoming = (data) => {
            console.log('📞 Incoming call:', data);
            // Use ref to check current call state
            if (inCallRef.current) {
                console.log('Already in call, ignoring incoming');
                return;
            }

            setIncomingCall(data);
            playRingtoneSound();
        };

        // We joined the call — create offers to existing participants
        const handleJoined = async ({ participants: parts, existingParticipants }) => {
            console.log('✅ Joined call. Participants:', parts, 'Existing:', existingParticipants);
            setParticipants(parts);

            if (existingParticipants && existingParticipants.length > 0) {
                // Small delay to ensure local stream is fully ready
                await new Promise(r => setTimeout(r, 500));

                for (const peerId of existingParticipants) {
                    try {
                        console.log(`📤 Creating offer for peer ${peerId}`);
                        const pc = createPeerConnection(peerId);
                        const offer = await pc.createOffer({
                            offerToReceiveAudio: true,
                            offerToReceiveVideo: true,
                        });
                        await pc.setLocalDescription(offer);

                        socket.emit('call-signal', {
                            to: peerId,
                            signal: pc.localDescription,
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
            console.log(`👤 User joined call: ${name} (${socketId})`);
            setParticipants(prev => ({
                ...prev,
                [socketId]: { userId, name, socketId }
            }));
        };

        // Receive signaling data (offer, answer, ICE)
        const handleSignal = async ({ from, signal, type }) => {
            console.log(`📡 Received ${type} from ${from}`);
            try {
                if (type === 'offer') {
                    // Small delay to ensure local stream is ready
                    await new Promise(r => setTimeout(r, 300));
                    const pc = createPeerConnection(from);
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    socket.emit('call-signal', {
                        to: from,
                        signal: pc.localDescription,
                        type: 'answer'
                    });
                    console.log(`📤 Sent answer to ${from}`);
                } else if (type === 'answer') {
                    const pc = peersRef.current[from];
                    if (pc && pc.signalingState === 'have-local-offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal));
                        console.log(`✅ Set remote description (answer) from ${from}`);
                    } else {
                        console.warn(`⚠️ Cannot set answer: ${pc ? pc.signalingState : 'no pc'}`);
                    }
                } else if (type === 'ice-candidate') {
                    const pc = peersRef.current[from];
                    if (pc && pc.remoteDescription) {
                        await pc.addIceCandidate(new RTCIceCandidate(signal));
                    } else {
                        // Queue ICE candidates if remote description isn't set yet
                        console.log(`⏳ Queuing ICE candidate from ${from}`);
                        setTimeout(async () => {
                            const pc2 = peersRef.current[from];
                            if (pc2 && pc2.remoteDescription) {
                                try {
                                    await pc2.addIceCandidate(new RTCIceCandidate(signal));
                                } catch (e) {
                                    console.warn('Failed to add queued ICE candidate:', e);
                                }
                            }
                        }, 1000);
                    }
                }
            } catch (error) {
                console.error(`Signal handling error (${type}):`, error);
            }
        };

        // User left
        const handleUserLeft = ({ socketId }) => {
            console.log(`👋 User left call: ${socketId}`);
            if (peersRef.current[socketId]) {
                try { peersRef.current[socketId].close(); } catch (e) {}
                delete peersRef.current[socketId];
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
        };

        // Call ended
        const handleCallEnded = ({ roomId }) => {
            console.log('📞 Call ended');
            
            if (incomingCallRef.current && incomingCallRef.current.roomId === roomId) {
                addNotification({
                    type: 'call',
                    title: '📞 Missed Call',
                    body: `You missed a call from ${incomingCallRef.current.initiator?.name || 'Someone'}`,
                    groupId: roomId,
                });
            }

            stopCallSounds();
            // Clear active call info if it matches
            setActiveCallInfo(prev => {
                if (prev && prev.roomId === roomId) return null;
                return prev;
            });
            cleanupCall();
        };

        // Response to call-check
        const handleCallStatus = ({ roomId, active, callType, participants }) => {
            console.log('📞 Call status for room', roomId, ':', active);
            if (active) {
                setActiveCallInfo({ roomId, callType, participants });
            } else {
                setActiveCallInfo(prev => {
                    if (prev && prev.roomId === roomId) return null;
                    return prev;
                });
            }
        };

        // Also update activeCallInfo when someone starts a call
        const handleIncomingForStatus = (data) => {
            setActiveCallInfo({ roomId: data.roomId, callType: data.callType, participants: data.participants });
        };

        socket.on('call-incoming', handleIncoming);
        socket.on('call-incoming', handleIncomingForStatus);
        socket.on('call-joined', handleJoined);
        socket.on('call-user-joined', handleUserJoined);
        socket.on('call-signal', handleSignal);
        socket.on('call-user-left', handleUserLeft);
        socket.on('call-ended', handleCallEnded);
        socket.on('call-status', handleCallStatus);

        return () => {
            socket.off('call-incoming', handleIncoming);
            socket.off('call-incoming', handleIncomingForStatus);
            socket.off('call-joined', handleJoined);
            socket.off('call-user-joined', handleUserJoined);
            socket.off('call-signal', handleSignal);
            socket.off('call-user-left', handleUserLeft);
            socket.off('call-ended', handleCallEnded);
            socket.off('call-status', handleCallStatus);
        };
    }, [socket, createPeerConnection, cleanupCall]);

    // Listen for join-call event from toast button
    useEffect(() => {
        const handleJoinEvent = () => {
            const data = window.__studysync_join_call;
            if (data) {
                joinCall(data.roomId, data.callType);
                window.__studysync_join_call = null;
            }
        };
        window.addEventListener('studysync-join-call', handleJoinEvent);
        return () => window.removeEventListener('studysync-join-call', handleJoinEvent);
    }, [joinCall]);

    const value = {
        inCall,
        callType,
        callRoomId,
        participants,
        incomingCall,
        isMuted,
        isCameraOff,
        speakerMode,
        activeSinkId,
        localStream,
        remoteStreams,
        callStartTime,
        isRinging,
        activeCallInfo,
        startCall,
        joinCall,
        hangUp,
        declineCall,
        checkActiveCall,
        toggleMute,
        toggleCamera,
        setSpeakerOutput,
        flipCamera,
        facingMode,
    };

    return (
        <CallContext.Provider value={value}>
            {children}
        </CallContext.Provider>
    );
};
