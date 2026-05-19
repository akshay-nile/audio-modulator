import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Slider, type SliderChangeEvent } from 'primereact/slider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { startAudioModulator, stopAudioModulator } from '../services/modulator';

function BMTMDemo() {
    const portRef = useRef<MessagePort | null>(null);

    const [audioNode, setAudioNode] = useState<AudioWorkletNode | null>(null);
    const [dataToSend, setDataToSend] = useState<string>('');
    const [dataRate, setDataRate] = useState<number>(50);

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
        const node = await startAudioModulator({ module: 'bmtm-processor', channels: 1 });
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

                <div className="flex flex-col gap-2 items-center my-2">
                    <label htmlFor="data-rate">Data Rate: {dataRate} Bytes/Second</label>
                    <Slider id="data-rate" name="data-rate" className="w-full mt-2"
                        value={dataRate} min={1} max={100} step={10} disabled={audioNode === null}
                        onChange={(e: SliderChangeEvent) => {
                            if (typeof e.value !== 'number') return;
                            const value = e.value - (e.value > 1 ? e.value % 10 : 0);
                            setDataRate(value);
                            if (audioNode) audioNode.port.postMessage(value);
                        }} />
                </div>
            </div>

            <div className="w-full flex flex-col gap-4">
                <InputText
                    placeholder="Enter Data To Transmit..."
                    value={dataToSend} disabled={audioNode === null}
                    onChange={e => setDataToSend(e.target.value)} />

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