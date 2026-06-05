// Stereo Differential Bi-Polar RZ Audio Node Processor

const SAMPLING_RATE = 48_000;

class StereoDifferentialBPRZProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.bit = null;     // UART idle state (LOW)
        this.frame = null;   // UART data frame of 8 bits

        this.buffer = [];    // Data bytes to transmit
        this.alertOnEmpty = true;

        this.sampleCounter = 0;
        this.samplesPerBit = Math.floor(SAMPLING_RATE / options.processorOptions.baudRate);

        this.port.onmessage = e => {
            if (typeof e.data === 'object' && 'baudRate' in e.data) {
                this.samplesPerBit = Math.floor(SAMPLING_RATE / e.data.baudRate);
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
            rightChannel[i] = -leftChannel[i]; // Differential stereo output
            this.sampleCounter++;

            if (this.sampleCounter >= this.samplesPerBit) {
                this.sampleCounter = 0;
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

registerProcessor('sdrz-processor', StereoDifferentialBPRZProcessor);