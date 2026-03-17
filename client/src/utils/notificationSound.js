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

export function playNotificationSound() {
    try {
        const ctx = getAudioContext();
        // Two-note chime: C6 → E6
        const notes = [1046.50, 1318.51];
        const noteLength = 0.1;

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
