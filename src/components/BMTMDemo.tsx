import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bmtmDataRates, startAudioModulator, stopAudioModulator } from '../services/modulator';

const dataRateOptions: { label: string, value: number }[] = bmtmDataRates.map(n => ({
    label: `${n} Byte${n === 1 ? '' : 's'}/Second`, value: n
}));

function BMTMDemo() {
    const portRef = useRef<MessagePort | null>(null);

    const [audioNode, setAudioNode] = useState<AudioWorkletNode | null>(null);
    const [dataToSend, setDataToSend] = useState<string>('');
    const [dataRate, setDataRate] = useState<number>(10);

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
        const node = await startAudioModulator({ module: 'bmtm-processor', channels: 1, rate: dataRate });
        node.port.postMessage(dataRate);
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
                Mono Channel<br />Binary Multi-Tone Modulator
            </h2>

            <div className="flex flex-col gap-4">
                <Button
                    label={`${audioNode ? 'Stop' : 'Start'} Binary Multi-Tone Modulator`}
                    severity={audioNode ? 'danger' : 'success'}
                    onClick={() => audioNode ? stopModulator() : startModulator()} />

                <div className="flex gap-2 justify-center items-center">
                    <label htmlFor="data-rate">Data Rate:</label>
                    <Dropdown id="data-rate" name="data-rate"
                        options={dataRateOptions} optionLabel="label" optionValue="value"
                        value={dataRate}
                        onChange={e => {
                            setDataRate(e.value);
                            if (audioNode) audioNode.port.postMessage(e.value);
                        }} />
                </div>
            </div>

            <div className="w-full flex flex-col gap-4">
                <InputText
                    placeholder="Enter Data To Transmit..."
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

export default BMTMDemo;