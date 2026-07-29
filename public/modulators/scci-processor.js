// Stereo Differential Cross Interval Audio Node Processor

// const SAMPLING_RATE = 48_000;
const BIT_0_SAMPLES = 48;   // 1000us interval for bit 0
const BIT_1_SAMPLES = 96;   // 2000us interval for bit 1
const IDLE_SAMPLES = 192;   // 4000us interval for idle state

class StereoChannelCrossInterruptProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.frame = null;   // UART data frame of 8 bits
        this.samples = [-1, 1];  // L and R channel samples

        this.buffer = [];    // Data bytes to transmit
        this.alertOnEmpty = true;

        this.sampleCounter = IDLE_SAMPLES;  // Initial state

        this.port.onmessage = e => {
            if (e.data instanceof Uint8Array) {
                this.buffer.push(...e.data);
                this.alertOnEmpty = true;
            }
        };
    }

    getNextBitSampleCount() {
        if (this.frame !== null) {
            if (this.frame.length === 0) {
                this.frame = null;
                return BIT_1_SAMPLES; // UART stop bit
            }
            return this.frame.shift() ? BIT_1_SAMPLES : BIT_0_SAMPLES; // UART data bits
        }

        if (this.buffer.length === 0) return IDLE_SAMPLES; // UART idle state;

        this.frame = [];
        const byte = this.buffer.shift();
        for (let i = 1; i < 256; i *= 2) this.frame.push((byte & i) ? 1 : 0);
        return BIT_0_SAMPLES; // UART start bit
    }


    decrementSampleCounter() {
        this.sampleCounter--;

        if (this.sampleCounter <= 0) {
            this.sampleCounter = this.getNextBitSampleCount(); // Load the sample count for next UART bit
            this.samples = this.samples.map(b => -1 * b); // Toggle L and R channels (Cross Interval) 

            if (this.alertOnEmpty && this.buffer.length === 0) {
                this.port.postMessage(null);
                this.alertOnEmpty = false;
            }
        }
    }

    process(_inputs, _outputs) {
        const [leftChannel, rightChannel] = _outputs[0];

        for (let i = 0; i < leftChannel.length; i++) {
            leftChannel[i] = this.samples[0];
            rightChannel[i] = this.samples[1]; // Differential stereo output

            this.decrementSampleCounter();
        }

        return true;
    }
}

registerProcessor('scci-processor', StereoChannelCrossInterruptProcessor);