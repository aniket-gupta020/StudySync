// Short pleasant notification chime via Web Audio API

let audioContext = null;

function getAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

export function playNotificationSound(type = 'message') {
    try {
        const ctx = getAudioContext();
        
        // Vary notes based on notification type
        let notes = [1046.50, 1318.51]; // Default (message): C6 → E6
        let noteLength = 0.1;

        if (type === 'call' || type === 'call-incoming' || type === 'call-ended') {
            notes = [880.00, 1174.66, 880.00]; // A5 → D6 → A5 (Alert style)
            noteLength = 0.15;
        } else if (type === 'whiteboard') {
            notes = [1318.51, 1567.98, 1975.53]; // E6 → G6 → B6 (Bright rollup)
        } else if (type === 'system' || type === 'group') {
            notes = [783.99, 1046.50]; // G5 → C6
        }

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0.08;

            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = ctx.currentTime + i * 0.12;
            gain.gain.setValueAtTime(0.08, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength);

            osc.start(startTime);
            osc.stop(startTime + noteLength);
        });
    } catch (e) {
        // Audio not available, silently fail
    }
}
