import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../context/CallContext';

const IncomingCallToast = () => {
    const { incomingCall, inCall, joinCall, declineCall } = useCall();

    // Don't show if no incoming call, or already in a call
    if (!incomingCall || inCall) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -80, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -80, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[250] w-[340px] max-w-[90vw] bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 border border-white/10 p-4"
            >
                <div className="flex items-center gap-3 mb-3">
                    <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center flex-shrink-0"
                    >
                        <Phone className="w-5 h-5 text-white" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                            {incomingCall.initiator?.name || 'Someone'}
                        </p>
                        <p className="text-white/50 text-xs capitalize">
                            Incoming {incomingCall.callType} call
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={declineCall}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-colors"
                    >
                        <PhoneOff className="w-4 h-4" />
                        Decline
                    </button>
                    <button
                        onClick={() => joinCall(incomingCall.roomId, incomingCall.callType)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                        Accept
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default IncomingCallToast;
