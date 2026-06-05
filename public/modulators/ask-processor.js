// Amplitude Shift Keying Audio Node Processor (Mono Channel)

const SAMPLING_RATE = 48_000;
const TWO_PI = 2 * Math.PI;
const D_TIME = 1 / SAMPLING_RATE;

class AmplitudeShiftKeyingProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.bit = 1;     // UART idle state (HIGH)
        this.frame = null;   // UART data frame of 8 bits

        this.buffer = [];    // Data bytes to transmit
        this.alertOnEmpty = true;

        this.phase = 0.0;
        this.carrierFrequency = options.processorOptions.carrierFreq;

        this.sampleCounter = 0;
        this.samplesPerBit = Math.floor(SAMPLING_RATE / options.processorOptions.baudRate);

        this.port.onmessage = e => {
            if (typeof e.data === 'object' && 'baudRate' in e.data && 'carrierFreq' in e.data) {
                this.carrierFrequency = e.data.carrierFreq;
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

    getNextSinWaveSample(amplitude = 1, frequency = 1, phaseShift = 0) {
        const sample = amplitude * Math.sin(this.phase + phaseShift);
        this.phase += TWO_PI * frequency * D_TIME;
        if (this.phase >= TWO_PI) this.phase -= TWO_PI;
        return sample;
    }

    process(_inputs, _outputs) {
        const channel = _outputs[0][0];

        for (let i = 0; i < channel.length; i++) {
            channel[i] = this.getNextSinWaveSample(this.bit, this.carrierFrequency);

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

        return true;
    }
}

registerProcessor('ask-processor', AmplitudeShiftKeyingProcessor);