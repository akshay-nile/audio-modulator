// UART - Audio Modulator (Controller)

import UARTProcessorURL from './UARTProcessor.ts?worker&url';

let audioContext: AudioContext | null = null;
let audioNode: AudioWorkletNode | null = null;

export type BaudRate = 300 | 600 | 1200 | 2400 | 4800 | 9600;

function serialWrite(data: Uint8Array | BaudRate): void {
    if (!audioNode) throw new Error('UART Audio Modulator is not running.');
    else audioNode.port.postMessage(data);
};

export async function startUARTModulator(): Promise<(data: Uint8Array | BaudRate) => void> {
    // If already running, return the active instance to avoid duplicate setups
    if (audioContext && audioContext.state !== 'closed') {
        if (audioContext.state === 'suspended') await audioContext.resume();
        return serialWrite; // return the serial buffer/baud writter function
    }

    // Initialize new AudioContext forced at 48KHz sampling rate
    audioContext = new AudioContext({ sampleRate: 48_000 });

    // Inject compilation-safe background uart-processor.js module
    await audioContext.audioWorklet.addModule(`${UARTProcessorURL}&v=${Date.now()}`);

    // Instantiate a new node of UART Audio Processor class
    audioNode = new AudioWorkletNode(audioContext, 'uart-processor', {
        outputChannelCount: [2]
    });

    // Finish by routing the node to the system speaker output
    audioNode.connect(audioContext.destination);

    // Explicitly resume to satisfy browser security gesture restrictions
    await audioContext.resume();

    // Return the serial buffer/baud writter function
    return serialWrite;
}

export async function stopUARTModulator(): Promise<void> {
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
