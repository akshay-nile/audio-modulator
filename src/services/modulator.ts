// Audio Modulator To Audio-Worklet Processor Instantiate Node

const SAMPLING_RATE = 48_000;

let audioContext: AudioContext | null = null;
let audioNode: AudioWorkletNode | null = null;

type Processor = { module: string, channels: 1 | 2 }
type Options = { baudRate: number, carrierFreq: number | null };

export async function startAudioModulator(processor: Processor, options: Options): Promise<AudioWorkletNode> {
    // If already running, return the active instance to avoid duplicate setups
    if (audioContext && audioContext.state !== 'closed') {
        if (audioContext.state === 'suspended') await audioContext.resume();
        if (audioNode) return audioNode; // return the existing audio worklet node
    }

    // Initialize new AudioContext forced at 48KHz sampling rate
    audioContext = new AudioContext({ sampleRate: SAMPLING_RATE });

    // Inject compilation-safe background uart-processor.js module
    await audioContext.audioWorklet.addModule(`./modulators/${processor.module}.js`);

    // Instantiate the custom AudioWorkletNode
    audioNode = new AudioWorkletNode(audioContext, processor.module, {
        numberOfInputs: 0,
        numberOfOutputs: 1,

        outputChannelCount: [processor.channels], // Number of output channels
        processorOptions: options // Constructor options
    });

    // Finish by routing the node to the system speaker output
    audioNode.connect(audioContext.destination);

    // Resume the context if it was paused by browser security rules
    if (audioContext.state === 'suspended') await audioContext.resume();

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
