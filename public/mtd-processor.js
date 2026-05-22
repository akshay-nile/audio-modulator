// Binary Multi-Tone Demodulator - Audio Node Processor

const SAMPLING_RATE = 48_000;

class RingBuffer {

    constructor(size) {
        this.buffer = new Float32Array(size);
        this.index = 0;
    }

    exchange(sample) {
        const oldestSample = this.buffer[this.index];
        this.buffer[this.index] = sample;
        this.index = (this.index + 1) % this.buffer.length;
        return oldestSample;
    }
}

class SDFTFreqBin {

    constructor(freq, N) {
        const k = Math.round(N * freq / SAMPLING_RATE);
        const w = (2 * Math.PI * k) / N;

        this.cosPart = Math.cos(w);
        this.sinPart = Math.sin(w);

        this.realTotal = 0.0;
        this.imagTotal = 0.0;

        this.energy = 0.0;
    }

    update(sampleDifference) {
        // Add sample difference
        const realDiff = this.realTotal + sampleDifference;
        const imagDiff = this.imagTotal;

        // Complex vector rotation
        this.realTotal = (realDiff * this.cosPart) - (imagDiff * this.sinPart);
        this.imagTotal = (realDiff * this.sinPart) + (imagDiff * this.cosPart);

        // Magnitude squared energy
        this.energy = (this.realTotal * this.realTotal) + (this.imagTotal * this.imagTotal);
        return this.energy;
    }
}

class SDFTEngine {

    constructor() {
        this.window = new RingBuffer(480);

        this.freqBinR = new SDFTFreqBin(3000, 480);

        this.freqBinA = new SDFTFreqBin(2000, 480);
        this.freqBinB = new SDFTFreqBin(2500, 480);
        this.freqBinC = new SDFTFreqBin(3500, 480);
        this.freqBinD = new SDFTFreqBin(4000, 480);
    }

    crank(latestSample) {
        const oldestSample = this.window.exchange(latestSample);
        const sampleDifference = latestSample - oldestSample;

        this.freqBinR.update(sampleDifference);

        this.freqBinA.update(sampleDifference);
        this.freqBinB.update(sampleDifference);
        this.freqBinC.update(sampleDifference);
        this.freqBinD.update(sampleDifference);
    }
}

class MTDAudioProcessor extends AudioWorkletProcessor {

    constructor(options) {
        super(options);
        this.sampleCounter = 0;
        this.engine = new SDFTEngine();
    }

    process(_inputs) {
        const channel = _inputs[0][0];

        for (let i = 0; i < channel.length; i++) {
            this.engine.crank(channel[i]);
            this.sampleCounter++;

            if (this.sampleCounter === 480) {
                this.sampleCounter = 0;
                const referenceEnergy = this.engine.freqBinR.energy;
                if (referenceEnergy >= 1) this.port.postMessage({
                    A: Math.round(100 * this.engine.freqBinA.energy / referenceEnergy),
                    B: Math.round(100 * this.engine.freqBinB.energy / referenceEnergy),
                    C: Math.round(100 * this.engine.freqBinC.energy / referenceEnergy),
                    D: Math.round(100 * this.engine.freqBinD.energy / referenceEnergy)
                });
                else this.port.postMessage(null);
            }
        }

        return true;
    }
}

registerProcessor('mtd-processor', MTDAudioProcessor);