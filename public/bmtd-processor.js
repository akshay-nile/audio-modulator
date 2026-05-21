// Binary Multi-Tone Demodulator - Audio Node Processor

const DATA_RATE = 50;  // Bytes per Second
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

    constructor(freq, windowSize) {
        const k = Math.round(windowSize * freq / SAMPLING_RATE);
        const w = (2 * Math.PI * k) / windowSize;

        this.cosPart = Math.cos(w);
        this.sinPart = Math.sin(w);

        this.realTotal = 0.0;
        this.imagTotal = 0.0;

        this.energyLevel = 0.0;
        this.threshold = 0.0;
    }

    update(sampleDifference) {
        // Add sample difference
        const realDiff = this.realTotal + sampleDifference;
        const imagDiff = this.imagTotal;

        // Complex vector rotation
        this.realTotal = (realDiff * this.cosPart) - (imagDiff * this.sinPart);
        this.imagTotal = (realDiff * this.sinPart) + (imagDiff * this.cosPart);

        // Magnitude squared energy
        this.energyLevel = (this.realTotal * this.realTotal) + (this.imagTotal * this.imagTotal);
        return this.energyLevel;
    }
}

class SDFTEngine {

    constructor(windowSize) {
        this.window = new RingBuffer(windowSize);

        this.freqBins = [];
        for (let i = 0; i < 8; i++) {
            const freq = 1800 + i * 400;
            this.freqBins.push(new SDFTFreqBin(freq, windowSize));
        }

        this.noiseFloor = 0.1;
        this.totalEnergy = 0.0;
        this.energyDifference = 0.0;
    }

    record() {
        for (let i = 0; i < 8; i++) {
            const freqBin = this.freqBins[i];
            freqBin.threshold = freqBin.energyLevel / 2.0;
        }
    }

    decode() {
        let byte = 0x00;
        for (let i = 0; i < 8; i++) {
            const freqBin = this.freqBins[i];
            byte += freqBin.energyLevel > freqBin.threshold ? (1 << i) : 0;
        }
        return byte;
    }

    crank(latestSample, state) {
        const oldestSample = this.window.exchange(latestSample);
        const sampleDifference = latestSample - oldestSample;
        let currentEnergyTotal = 0.0;
        for (let i = 0; i < 8; i++) currentEnergyTotal += this.freqBins[i].update(sampleDifference);
        this.energyDifference = currentEnergyTotal - this.totalEnergy;
        this.totalEnergy = currentEnergyTotal;
        if (state === 'IDLE') {
            this.noiseFloor = (this.noiseFloor + this.totalEnergy) / 2.0;
            if (this.noiseFloor < 0.1) this.noiseFloor = 0.1;
        }
    }
}

class BMTDAudioProcessor extends AudioWorkletProcessor {

    constructor() {
        super();
        this.state = null;

        this.dataBuffer = [];
        this.packetSize = 0;

        this.sampleCounter = 0;
        this.samplesPerByte = Math.floor(SAMPLING_RATE / DATA_RATE);

        this.engine = new SDFTEngine(this.samplesPerByte);
        this.port.onmessage = e => {
            if (typeof e.data === 'number') {
                this.samplesPerByte = Math.floor(SAMPLING_RATE / e.data);
                this.engine = new SDFTEngine(this.samplesPerByte);
            }
        };
    }

    process(_inputs) {
        const channel = _inputs[0][0];

        for (let i = 0; i < channel.length; i++) {
            this.engine.crank(channel[i], this.state);
            this.sampleCounter++;

            switch (this.state) {

                case 'INIT':
                    if (this.sampleCounter >= this.samplesPerByte) {
                        this.state = 'IDLE';
                        this.sampleCounter = 0;
                    }
                    break;

                case 'IDLE':
                    if (this.sampleCounter >= this.samplesPerByte) this.sampleCounter = 0;
                    else if (this.engine.totalEnergy > (2 * this.engine.noiseFloor)) {
                        this.state = 'HUNT';
                        this.sampleCounter = 0;
                    }
                    break;

                case 'HUNT':
                    if (this.engine.energyDifference <= 0) {
                        const lowerBound = this.samplesPerByte * 0.33;
                        const upperBound = this.samplesPerByte * 0.66;
                        if (this.sampleCounter > lowerBound && this.sampleCounter < upperBound) {
                            this.state = 'LOCK';
                            this.engine.record();
                        } else this.state = 'IDLE';
                        this.sampleCounter = 0;
                    }
                    break;

                case 'LOCK':
                    if (this.sampleCounter === this.samplesPerByte) {
                        if (this.engine.decode() !== 0x00) {
                            this.state = 'IDLE';
                            this.sampleCounter = 0;
                        }
                    }
                    else if (this.sampleCounter === (2 * this.samplesPerByte)) {
                        this.packetSize = this.engine.decode();
                        if (this.packetSize > 0) {
                            this.state = 'SCAN';
                            this.dataBuffer = [];
                        } else this.state = 'IDLE';
                        this.sampleCounter = 0;
                    }
                    break;

                case 'SCAN':
                    if (this.sampleCounter === this.samplesPerByte) {
                        this.dataBuffer.push(this.engine.decode());
                        if (this.dataBuffer.length === this.packetSize) {
                            this.port.postMessage(this.dataBuffer);
                            this.state = 'IDLE';
                        }
                        this.sampleCounter = 0;
                    }
                    break;
            }
        }

        return true;
    }
}

registerProcessor('bmtd-processor', BMTDAudioProcessor);