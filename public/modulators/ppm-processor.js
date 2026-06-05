// Pulse Position Modulation Audio Node Processor (Mono Channel)

const SAMPLING_RATE = 48_000;

class PulsePositionModulationProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.bit = null;     // UART idle state (LOW)
        this.frame = null;   // UART data frame of 8 bits

        this.buffer = [];    // Data bytes to transmit
        this.alertOnEmpty = true;

        this.sampleCounter = 0;
        this.samplesPerBit = Math.floor(SAMPLING_RATE / options.processorOptions.baudRate);
        this.firstHalfEndBoundry = Math.floor(this.samplesPerBit / 2);
        this.secondHalfStartBoundry = this.samplesPerBit - this.firstHalfEndBoundry;

        this.port.onmessage = e => {
            if (typeof e.data === 'object' && 'baudRate' in e.data) {
                this.samplesPerBit = Math.floor(SAMPLING_RATE / e.data.baudRate);
                this.firstHalfEndBoundry = Math.floor(this.samplesPerBit / 2);
                this.secondHalfStartBoundry = this.samplesPerBit - this.firstHalfEndBoundry;
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
        const channel = _outputs[0][0];

        for (let i = 0; i < channel.length; i++) {
            if (this.sampleCounter < this.firstHalfEndBoundry) {
                channel[i] = this.bit === 0 ? +1 : 0; // Pulse in the first half of the bit period (for bit 0)
            } else if (this.sampleCounter >= this.secondHalfStartBoundry) {
                channel[i] = this.bit === 1 ? +1 : 0; // Pulse in the second half of the bit period (for bit 1)
            } else {
                channel[i] = 0;
            }

            this.sampleCounter++;

            if (this.sampleCounter >= this.samplesPerBit) {
                this.sampleCounter = 0;
                this.bit = this.getNextBit() ?? 1; // UART idle state (Bit-1)

                if (this.alertOnEmpty && this.buffer.length === 0) {
                    this.port.postMessage(null);
                    this.alertOnEmpty = false;
                }
            }
        }

        return true;
    }
}

registerProcessor('ppm-processor', PulsePositionModulationProcessor);