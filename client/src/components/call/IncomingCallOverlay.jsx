import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { motion } from 'framer-motion';

const IncomingCallOverlay = ({ callerName, callType, groupName, onAccept, onDecline }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center gap-8"
        >
            <div className="relative">
                <motion.div
                    className="absolute rounded-full bg-orange-500/10"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ width: 120, height: 120, margin: -12 }}
                />
                <motion.div
                    className="absolute rounded-full bg-orange-500/5"
                    animate={{ scale: [1, 2.2, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    style={{ width: 120, height: 120, margin: -12 }}
                />
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-orange-500/40 relative z-10">
                    <Phone className="w-10 h-10 text-white" />
                </div>
            </div>

            {/* Info */}
            <div className="text-center mb-12">
                <h2 className="text-white text-2xl font-bold mb-2">{callerName || 'Someone'}</h2>
                <p className="text-white/50 text-base capitalize mb-1">
                    Incoming {callType} call
                </p>
                {groupName && (
                    <p className="text-white/40 text-sm">
                        in {groupName}
                    </p>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-12">
                {/* Decline */}
                <div className="flex flex-col items-center gap-2">
                    <motion.button
                        onClick={onDecline}
                        whileTap={{ scale: 0.9 }}
                        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
                    >
                        <PhoneOff className="w-7 h-7" />
                    </motion.button>
                    <span className="text-white/50 text-xs font-medium">Decline</span>
                </div>

                {/* Accept */}
                <div className="flex flex-col items-center gap-2">
                    <motion.button
                        onClick={onAccept}
                        whileTap={{ scale: 0.9 }}
                        animate={{
                            boxShadow: [
                                '0 0 0 0 rgba(249,115,22,0.4)',
                                '0 0 0 16px rgba(249,115,22,0)',
                                '0 0 0 0 rgba(249,115,22,0.4)',
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg transition-colors"
                    >
                        <Phone className="w-7 h-7" />
                    </motion.button>
                    <span className="text-white/50 text-xs font-medium">Accept</span>
                </div>
            </div>
        </motion.div>
    );
};

export default IncomingCallOverlay;
