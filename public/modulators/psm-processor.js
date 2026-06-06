// Pulse Slope Modulation Audio Node Processor (Mono Channel)

const SAMPLING_RATE = 48_000;

class PulseSlopeModulationProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.bit = 1;     // UART idle state (HIGH)
        this.frame = null;   // UART data frame of 8 bits

        this.buffer = [];    // Data bytes to transmit
        this.alertOnEmpty = true;

        this.sampleCounter = 0;
        this.samplesPerBit = Math.floor(SAMPLING_RATE / options.processorOptions.baudRate);
        this.stepPerSample = 2 / (this.samplesPerBit - 1);

        this.port.onmessage = e => {
            if (typeof e.data === 'object' && 'baudRate' in e.data) {
                this.samplesPerBit = Math.floor(SAMPLING_RATE / e.data.baudRate);
                this.stepPerSample = 2 / (this.samplesPerBit - 1);
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

    getNextPSMSample() {
        if (this.bit === 1) return -1 + this.stepPerSample * this.sampleCounter;
        if (this.bit === 0) return +1 - this.stepPerSample * this.sampleCounter;
        return 0;
    }

    incrementSampleCounter() {
        this.sampleCounter++;

        if (this.sampleCounter >= this.samplesPerBit) {
            this.sampleCounter = 0;
            this.bit = this.getNextBit() ?? 1; // UART idle state (Bit 1)

            if (this.alertOnEmpty && this.buffer.length === 0) {
                this.port.postMessage(null);
                this.alertOnEmpty = false;
            }
        }
    }

    process(_inputs, _outputs) {
        const channel = _outputs[0][0];

        for (let i = 0; i < channel.length; i++) {
            channel[i] = this.getNextPSMSample();
            this.incrementSampleCounter();
        }

        return true;
    }
}

registerProcessor('psm-processor', PulseSlopeModulationProcessor);