// Binary Multi-Tone Modulator - Audio Node Processor

const SAMPLING_RATE = 48_000;

class MTMAudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.sampleCounter = 0;

        this.amplitudes = options.processorOptions.rate;
        for (const key in this.amplitudes) this.amplitudes[key] /= 100;

        this.port.onmessage = e => {
            if (typeof e.data === 'object') {
                for (const key in e.data) this.amplitudes[key] = e.data[key] / 100;
            }
        };
    }

    process(_inputs, _outputs) {
        const channel = _outputs[0][0];

        for (let i = 0; i < channel.length; i++) {
            const angle = 2 * Math.PI * this.sampleCounter / SAMPLING_RATE;;
            let sample = 0.2 * Math.sin(angle * 3000);

            sample += this.amplitudes.A * 0.2 * Math.sin(angle * 2000);
            sample += this.amplitudes.B * 0.2 * Math.sin(angle * 2500);
            sample += this.amplitudes.C * 0.2 * Math.sin(angle * 3500);
            sample += this.amplitudes.D * 0.2 * Math.sin(angle * 4000);

            channel[i] = sample;
            this.sampleCounter = (this.sampleCounter + 1) % SAMPLING_RATE;
        }

        return true;
    }
}

registerProcessor('mtm-processor', MTMAudioProcessor);