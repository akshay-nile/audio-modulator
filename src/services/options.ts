
export const passbandBaudRates = [75, 150, 300, 600, 1200];
export const basebandBaudRates = [300, 600, 1200, 2400, 4800, 9600];

const carrierFrequencies = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(f => f * 1000);

export function getCarrierFrequencies(baudRate: number): number[] {
    return carrierFrequencies.filter(carrierFrequency => carrierFrequency / baudRate >= 10);
}

export type ModulationScheme = {
    name: string,
    processor: { module: string, channels: 1 | 2 },
    carrier: boolean
};

export const modulationSchemes: ModulationScheme[] = [
    {
        name: 'Baseband: Stereo Differential BPRZ',
        processor: { module: 'sdrz-processor', channels: 2 },
        carrier: false
    },
    {
        name: 'Baseband: Stereo Set-Reset Trigger',
        processor: { module: 'ssrt-processor', channels: 2 },
        carrier: false
    },
    {
        name: 'Baseband: Pulse Width Modulation',
        processor: { module: 'pwm-processor', channels: 1 },
        carrier: false
    },
    {
        name: 'Baseband: Pulse Position Modulation',
        processor: { module: 'ppm-processor', channels: 1 },
        carrier: false
    },
    {
        name: 'Passband: Amplitude Shift Keying',
        processor: { module: 'ask-processor', channels: 1 },
        carrier: true
    },
    {
        name: 'Passband: Frequency Shift Keying',
        processor: { module: 'fsk-processor', channels: 1 },
        carrier: true
    },
    {
        name: 'Passband: Phase Shift Keying',
        processor: { module: 'psk-processor', channels: 1 },
        carrier: true
    },
];
