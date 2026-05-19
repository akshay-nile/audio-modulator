// UART - Audio Node Processor

const BAUD_RATE = 1200;
const SAMPLING_RATE = 48_000;

class UARTAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bit = null;     // UART idle state (LOW)
        this.frame = null;   // UART data frame of 8 bits
        this.buffer = [];    // Data bytes to transmit
        this.counter = 0;    // Output sample counter
        this.alertOnEmpty = true;
        this.samplesPerBit = Math.floor(SAMPLING_RATE / BAUD_RATE);
        this.port.onmessage = e => {
            if (typeof e.data === 'number') {
                this.samplesPerBit = Math.floor(SAMPLING_RATE / e.data);
            } else if (e.data instanceof Uint8Array) {
                this.buffer.push(...e.data);
                this.alertOnEmpty = true;
            }
        };
    }

    getNextBit() {
        if (this.frame !== null) {
            if (this.frame.length === 0) {
                this.frame = null;
                return 1; // UART stop bit
            }
            return this.frame.shift(); // UART data bits
        }

        if (this.buffer.length === 0) return null; // UART idle state;

        this.frame = [];
        const byte = this.buffer.shift();
        for (let i = 1; i < 256; i *= 2) this.frame.push((byte & i) ? 1 : 0);
        return 0; // UART start bit
    }

    process(_inputs, _outputs) {
        const [leftChannel, rightChannel] = _outputs[0];

        for (let i = 0; i < leftChannel.length; i++) {
            leftChannel[i] = this.bit === null ? 0 : this.bit ? +1 : -1;
            rightChannel[i] = -leftChannel[i]; // Differencial stereo output

            if (++this.counter >= this.samplesPerBit) {
                this.counter = 0;
                this.bit = this.getNextBit();
                if (this.alertOnEmpty && this.buffer.length === 0) {
                    this.port.postMessage(null);
                    this.alertOnEmpty = false;
                }
            }
        }

        return true;
    }
}

registerProcessor('uart-processor', UARTAudioProcessor);