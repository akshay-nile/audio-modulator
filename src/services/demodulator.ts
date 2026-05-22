// Audio Demodulator To Instantiate Node (Controller)

const SAMPLING_RATE = 48_000;

let audioContext: AudioContext | null = null;
let audioNode: AudioWorkletNode | null = null;

let micStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;

export const bmtmDataRates = [1, 5, 10, 25, 50, 100];

type Processor = { module: string, channels: 1 | 2, rate: number }

export async function startAudioDemodulator(processor: Processor): Promise<AudioWorkletNode> {
    // If already running, return the active instance to avoid duplicate setups
    if (audioContext && audioContext.state !== 'closed') {
        if (audioContext.state === 'suspended') await audioContext.resume();
        if (audioNode) return audioNode; // return the existing audio worklet node
    }

    // Get unprocessed microphone stream
    micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: 'default',
            sampleRate: SAMPLING_RATE,
            channelCount: processor.channels,
            autoGainControl: false,
            noiseSuppression: false,
            echoCancellation: false
        }
    });

    // Initialize the AudioContext explicitly forcing at the 48 KHz sampling rate
    audioContext = new AudioContext({ sampleRate: SAMPLING_RATE });

    // Register the background processor.js worker file 
    await audioContext.audioWorklet.addModule(`./${processor.module}.js`);

    // Instantiate the custom AudioWorkletNode
    audioNode = new AudioWorkletNode(audioContext, processor.module, {
        numberOfInputs: 1,
        numberOfOutputs: 0,

        channelCount: processor.channels,
        channelCountMode: 'explicit', // Keep the channel count locked explicitly

        processorOptions: { rate: processor.rate } // Constructor options
    });

    // Create the source node from the microphone stream
    sourceNode = audioContext.createMediaStreamSource(micStream);

    // Connect the microphone source node to the audio worklet node
    sourceNode.connect(audioNode);

    // Resume the context if it was paused by browser security rules
    if (audioContext.state === 'suspended') await audioContext.resume();

    // Return the audio worklet node
    return audioNode;
}

export async function stopAudioDemodulator(): Promise<void> {
    // Disconnect soruce node 
    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }

    // Disconnect audio node to immediately stop audio graph execution
    if (audioNode) {
        audioNode.disconnect();
        audioNode = null;
    }

    // Shutdown the hardware audio background thread entirely
    if (audioContext) {
        if (audioContext.state !== 'closed') await audioContext.close();
        audioContext = null;
    }

    // Stop microphone stream tracks
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }
}
