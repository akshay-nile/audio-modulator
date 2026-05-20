import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { startAudioModulator, stopAudioModulator, uartBaudRates } from '../services/modulator';

const baudRateOptions: { label: string, value: number }[] = uartBaudRates.map(n => ({
    label: `${n} Bits/Second`, value: n
}));

function UARTDemo() {
    const portRef = useRef<MessagePort | null>(null);

    const [audioNode, setAudioNode] = useState<AudioWorkletNode | null>(null);
    const [baudRate, setBaudRate] = useState<number>(1200);
    const [dataToSend, setDataToSend] = useState<string>('');

    const stopModulator = useCallback(async () => {
        await stopAudioModulator();
        setAudioNode(null);
        setDataToSend('');
        if (portRef.current) {
            portRef.current.onmessage = null;
            portRef.current = null;
        }
    }, []);

    async function startModulator() {
        const node = await startAudioModulator({ module: 'uart-processor', channels: 2 });
        node.port.postMessage(baudRate);
        portRef.current = node.port;
        setAudioNode(node);
    }

    function sendData(repeat: boolean) {
        if (!portRef.current) return;
        const data = new Uint8Array(dataToSend.split('').map(c => c.charCodeAt(0)));
        portRef.current.onmessage = repeat ? () => {
            if (portRef.current) portRef.current.postMessage(data);
        } : null;
        portRef.current.postMessage(data);
    }

    useEffect(() => {
        return () => { if (audioNode) (async () => await stopModulator())(); };
    }, [stopModulator, audioNode]);

    return (
        <div className="flex flex-col items-center gap-16">
            <h2 className="text-xl font-semibold text-center mb-2">
                Stereo Differential<br />UART Audio Transmitter
            </h2>

            <div className="flex flex-col gap-4">
                <Button
                    label={`${audioNode ? 'Stop' : 'Start'} UART Audio Modulator`}
                    severity={audioNode ? 'danger' : 'success'}
                    onClick={() => audioNode ? stopModulator() : startModulator()} />

                <div className="flex gap-2 justify-center items-center">
                    <label htmlFor="baud-rate" className={audioNode ? '' : 'text-zinc-500'}>
                        Baud Rate:
                    </label>
                    <Dropdown id="baud-rate" name="baud-rate"
                        options={baudRateOptions} optionLabel="label" optionValue="value"
                        value={baudRate} disabled={audioNode === null}
                        onChange={e => {
                            setBaudRate(e.value);
                            if (audioNode) audioNode.port.postMessage(e.value);
                        }} />
                </div>
            </div>

            <div className="w-full flex flex-col gap-4">
                <InputText
                    placeholder="Enter Data To Send..."
                    value={dataToSend} disabled={audioNode === null}
                    onChange={e => setDataToSend(e.target.value)}
                    onKeyUp={e => e.key === 'Enter' ? sendData(false) : e.key === 'Escape' ? setDataToSend('') : null} />

                <div className="flex justify-center gap-4">
                    <Button label="Send Once" size="small" disabled={audioNode === null}
                        onClick={() => sendData(false)} />
                    <Button label="Send Repeatedly" size="small" disabled={audioNode === null}
                        onClick={() => sendData(true)} />
                </div>
            </div>
        </div>
    );
}

export default UARTDemo;