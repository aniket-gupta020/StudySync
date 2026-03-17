// Generates ringtone and dialing sounds using Web Audio API
// No external audio files needed

let audioContext = null;
let activeOscillators = [];
let activeIntervals = [];

function getAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function stopAll() {
    activeOscillators.forEach(osc => {
        try { osc.stop(); } catch (e) {}
    });
    activeOscillators = [];
    activeIntervals.forEach(id => clearInterval(id));
    activeIntervals = [];
}

// Dialing tone: alternating dual-tone pattern (like a phone ringing out)
export function playDialingSound() {
    stopAll();
    const ctx = getAudioContext();

    const playBeep = () => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.value = 0.08;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1);
        osc2.stop(now + 1);

        activeOscillators.push(osc1, osc2);
    };

    playBeep();
    const interval = setInterval(playBeep, 3000); // Ring every 3 seconds
    activeIntervals.push(interval);
}

// Ringtone: pleasant notification melody
export function playRingtoneSound() {
    stopAll();
    const ctx = getAudioContext();

    const playMelody = () => {
        const notes = [523.25, 659.25, 783.99, 659.25]; // C5, E5, G5, E5
        const noteLength = 0.15;
        const gap = 0.05;

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0.12;

            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = ctx.currentTime + i * (noteLength + gap);
            gain.gain.setValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength);

            osc.start(startTime);
            osc.stop(startTime + noteLength);
            activeOscillators.push(osc);
        });
    };

    playMelody();
    const interval = setInterval(playMelody, 2500); // Repeat every 2.5 seconds
    activeIntervals.push(interval);
}

export function stopCallSounds() {
    stopAll();
}
