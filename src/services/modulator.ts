// Audio Modulator To Instantiate Node (Controller)

let audioContext: AudioContext | null = null;
let audioNode: AudioWorkletNode | null = null;

export type Processor = { module: string, channels: 1 | 2 }
export type BaudRate = 300 | 600 | 1200 | 2400 | 4800 | 9600;

export async function startAudioModulator(processor: Processor): Promise<AudioWorkletNode> {
    // If already running, return the active instance to avoid duplicate setups
    if (audioContext && audioContext.state !== 'closed') {
        if (audioContext.state === 'suspended') await audioContext.resume();
        return audioNode; // return the existing audio worklet node
    }

    // Initialize new AudioContext forced at 48KHz sampling rate
    audioContext = new AudioContext({ sampleRate: 48_000 });

    // Inject compilation-safe background uart-processor.js module
    await audioContext.audioWorklet.addModule(`./${processor.module}.js`);

    // Instantiate a new node of UART Audio Processor class
    audioNode = new AudioWorkletNode(audioContext, processor.module, {
        outputChannelCount: [processor.channels]
    });

    // Finish by routing the node to the system speaker output
    audioNode.connect(audioContext.destination);

    // Explicitly resume to satisfy browser security gesture restrictions
    await audioContext.resume();

    // Return the audio worklet node
    return audioNode;
}

export async function stopAudioModulator(): Promise<void> {
    // Disconnect nodes to immediately stop audio graph execution
    if (audioNode) {
        audioNode.disconnect();
        audioNode = null;
    }

    // Shutdown the hardware audio background thread entirely
    if (audioContext) {
        if (audioContext.state !== 'closed') await audioContext.close();
        audioContext = null;
    }
}
