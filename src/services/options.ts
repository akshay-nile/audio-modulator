
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
        name: 'BB: Stereo Channel Cross Interrupt',
        processor: { module: 'scci-processor', channels: 2 },
        carrier: false
    },
    {
        name: 'BB: Stereo Differential Bipolar RZ',
        processor: { module: 'sdrz-processor', channels: 2 },
        carrier: false
    },
    {
        name: 'BB: Stereo Set-Reset Trigger',
        processor: { module: 'ssrt-processor', channels: 2 },
        carrier: false
    },
    {
        name: 'BB: Pulse Width Modulation',
        processor: { module: 'pwm-processor', channels: 1 },
        carrier: false
    },
    {
        name: 'BB: Pulse Position Modulation',
        processor: { module: 'ppm-processor', channels: 1 },
        carrier: false
    },
    {
        name: 'BB: Pulse Slope Modulation',
        processor: { module: 'psm-processor', channels: 1 },
        carrier: false
    },
    {
        name: 'BB: Manchester Encoding',
        processor: { module: 'me-processor', channels: 1 },
        carrier: false
    },
    {
        name: 'PB: Amplitude Shift Keying',
        processor: { module: 'ask-processor', channels: 1 },
        carrier: true
    },
    {
        name: 'PB: Frequency Shift Keying',
        processor: { module: 'fsk-processor', channels: 1 },
        carrier: true
    },
    {
        name: 'PB: Phase Shift Keying',
        processor: { module: 'psk-processor', channels: 1 },
        carrier: true
    },
    {
        name: 'PB: Amplitude Ramp Modulation',
        processor: { module: 'arm-processor', channels: 1 },
        carrier: true
    },
    {
        name: 'PB: Frequency Ramp Modulation',
        processor: { module: 'frm-processor', channels: 1 },
        carrier: true
    }
];
