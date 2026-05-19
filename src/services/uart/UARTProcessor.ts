// UART - Audio Node Processor

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;
declare class AudioWorkletProcessor {
    readonly port: MessagePort;
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

const BAUD_RATE = 1200;
const SAMPLING_RATE = 48_000;

class UARTAudioProcessor extends AudioWorkletProcessor {
    private bit: (0 | 1) | null;
    private frame: (0 | 1)[] | null;
    private counter: number;
    private buffer: number[];
    private samplesPerBit: number;

    constructor() {
        super();
        this.bit = null;     // UART idle state (LOW)
        this.frame = null;   // UART data frame of 8 bits
        this.buffer = [];    // Data bytes to transmit
        this.counter = 0;    // Output sample counter
        this.samplesPerBit = Math.floor(SAMPLING_RATE / BAUD_RATE);
        this.port.onmessage = (e: MessageEvent<Uint8Array | number>) => {
            if (typeof e.data === 'number') {
                this.samplesPerBit = Math.floor(SAMPLING_RATE / e.data);
            } else if (e.data instanceof Uint8Array) {
                this.buffer.push(...e.data);
            }
        };
    }

    private getNextBit(): (0 | 1) | null {
        if (this.frame !== null) {
            if (this.frame.length === 0) {
                this.frame = null;
                return 1; // UART stop bit
            }
            return this.frame.shift()!; // UART data bits
        }

        if (this.buffer.length === 0) return null; // UART idle state;

        this.frame = [];
        const byte = this.buffer.shift()!;
        for (let i = 1; i < 256; i *= 2) this.frame.push((byte & i) ? 1 : 0);
        return 0; // UART start bit
    }

    process(_inputs: Float32Array[][], _outputs: Float32Array[][]): boolean {
        const [leftChannel, rightChannel] = _outputs[0];

        for (let i = 0; i < leftChannel.length; i++) {
            leftChannel[i] = this.bit === null ? 0 : this.bit ? +1 : -1;
            rightChannel[i] = -leftChannel[i]; // Differencial stereo output

            if (++this.counter >= this.samplesPerBit) {
                this.counter = 0;
                this.bit = this.getNextBit();
            }
        }

        return true;
    }
}

registerProcessor('uart-processor', UARTAudioProcessor);