import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { startUARTModulator, stopUARTModulator, type BaudRate } from '../services/uart/UARTModulator';

function UARTDemo() {
    const baudRateOptions = [
        { 'label': '300 Bits/Second', value: 300 },
        { 'label': '600 Bits/Second', value: 600 },
        { 'label': '1200 Bits/Second', value: 1200 },
        { 'label': '2400 Bits/Second', value: 2400 },
        { 'label': '4800 Bits/Second', value: 4800 },
        { 'label': '9600 Bits/Second', value: 9600 },
    ];

    const timerRef = useRef<number | null>(null);

    const [serialWriter, setSerialWriter] = useState<((d: Uint8Array | BaudRate) => void) | null>(null);
    const [baudRate, setBaudRate] = useState<BaudRate>(1200);
    const [dataToSend, setDataToSend] = useState<string>('');

    const stopModulator = useCallback(async () => {
        await stopUARTModulator();
        setSerialWriter(null);
        setBaudRate(1200);
        setDataToSend('');
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    async function startModulator() {
        const writer = await startUARTModulator();
        setSerialWriter(() => writer);
    }

    function sendData(repeat: boolean) {
        const data = new Uint8Array(dataToSend.split('').map(c => c.charCodeAt(0)));
        const sendOnce = () => { if (serialWriter !== null) serialWriter(data); };
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = repeat ? setInterval(sendOnce, 1000 + data.length * 10) : null;
        if (!repeat) sendOnce();
    }

    useEffect(() => {
        return () => { if (serialWriter !== null) (async () => await stopModulator())(); };
    }, [stopModulator, serialWriter]);

    return (
        <div className="flex flex-col items-center gap-16">
            <h2 className="text-xl font-semibold text-center mb-2">
                Stereo Differential<br />UART Audio Transmitter
            </h2>

            <div className="flex flex-col gap-4">
                <Button
                    label={`${serialWriter !== null ? 'Stop' : 'Start'} UART Modulator`}
                    severity={serialWriter !== null ? 'danger' : 'success'}
                    onClick={() => serialWriter !== null ? stopModulator() : startModulator()} />

                <div className="flex gap-2 justify-center items-center">
                    <label htmlFor="baud-rate" className="font-light">Baud Rate:</label>
                    <Dropdown id="baud-rate" name="baud-rate"
                        options={baudRateOptions} optionLabel="label" optionValue="value"
                        value={baudRate} disabled={serialWriter === null}
                        onChange={e => {
                            setBaudRate(e.value);
                            if (serialWriter !== null) serialWriter(e.value);
                        }} />
                </div>
            </div>

            <div className="w-full flex flex-col gap-4">
                <InputText
                    placeholder="Enter Data To Send..."
                    value={dataToSend} disabled={serialWriter === null}
                    onChange={e => setDataToSend(e.target.value)} />

                <div className="flex justify-center gap-4">
                    <Button label="Send Once" size="small" disabled={serialWriter === null}
                        onClick={() => sendData(false)} />
                    <Button label="Send Repeatedly" size="small" disabled={serialWriter === null}
                        onClick={() => sendData(true)} />
                </div>
            </div>
        </div>
    );
}

export default UARTDemo;