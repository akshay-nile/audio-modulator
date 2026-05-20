// Binary Multi-Tone Modulator - Audio Node Processor

const DATA_RATE = 50;  // Bytes per Second
const SAMPLING_RATE = 48_000;

class BMTMAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.byte = 0;       // Idle data byte to transmit
        this.buffer = [];    // Data bytes to transmit
        this.counter = 0;    // Output sample counter
        this.alertOnEmpty = true;
        this.samplesPerByte = Math.floor(SAMPLING_RATE / DATA_RATE);
        this.port.onmessage = e => {
            if (typeof e.data === 'number') {
                this.samplesPerByte = Math.floor(SAMPLING_RATE / e.data);
            } else if (e.data instanceof Uint8Array) {
                if (e.data.length === 0) return;
                this.buffer.push(0xFF, 0x00, e.data.length, ...e.data, 0x00, 0x00);
                this.alertOnEmpty = true;
            }
        };
    }

    getMixedToneSample() {
        let sample = 0;

        for (let i = 0; i < 8; i++) {
            if (this.byte & (1 << i)) {
                const freq = 1800 + i * 400;    // 1800, 2200, ... , 4600 Hz
                const time = this.counter / SAMPLING_RATE;
                sample += 0.125 * Math.sin(2 * Math.PI * freq * time);
            }
        }

        return sample;
    }

    process(_inputs, _outputs) {
        const channel = _outputs[0][0];

        for (let i = 0; i < channel.length; i++) {
            channel[i] = this.getMixedToneSample();

            if (++this.counter >= this.samplesPerByte) {
                this.counter = 0;
                this.byte = this.buffer.shift() ?? 0;
                if (this.alertOnEmpty && this.buffer.length === 0) {
                    this.port.postMessage(null);
                    this.alertOnEmpty = false;
                }
            }
        }

        return true;
    }
}

registerProcessor('bmtm-processor', BMTMAudioProcessor);