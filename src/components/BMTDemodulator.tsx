import { Button } from 'primereact/button';
import { Chip } from 'primereact/chip';
import { Dropdown } from 'primereact/dropdown';
import { useCallback, useEffect, useState } from 'react';
import { bmtmDataRates, startAudioDemodulator, stopAudioDemodulator } from '../services/demodulator';

const textDecoder = new TextDecoder('utf-8');
const dataRateOptions: { label: string, value: number }[] = bmtmDataRates.map(n => ({
    label: `${n} Byte${n === 1 ? '' : 's'}/Second`, value: n
}));

function BMTDemodulator() {
    const [audioNode, setAudioNode] = useState<AudioWorkletNode | null>(null);
    const [receivedData, setReceivedData] = useState<string[]>([]);
    const [dataRate, setDataRate] = useState<number>(25);
    // const [eng, setEng] = useState<string>('0');

    const stopDemodulator = useCallback(async () => {
        await stopAudioDemodulator();
        setAudioNode(null);
        setReceivedData([]);
    }, []);

    async function startDemodulator() {
        const node = await startAudioDemodulator({ module: 'bmtd-processor', channels: 1, rate: dataRate });
        node.port.onmessage = (e: MessageEvent<Uint8Array>) => setReceivedData(prev => [...prev, textDecoder.decode(e.data)]);
        setAudioNode(node);
    }

    useEffect(() => {
        return () => { if (audioNode) (async () => await stopDemodulator())(); };
    }, [stopDemodulator, audioNode]);

    return (
        <div className="flex flex-col items-center gap-16">
            <h2 className="text-xl font-semibold text-center mb-2">
                Mono Channel Rx<br />Binary Multi-Tone Demodulator
            </h2>

            <div className="flex flex-col gap-4">
                <Button
                    label={`${audioNode ? 'Stop' : 'Start'} Binary Multi-Tone Demodulator`}
                    severity={audioNode ? 'danger' : 'success'}
                    onClick={() => audioNode ? stopDemodulator() : startDemodulator()} />

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
                <div className="text-center text-lg flex flex-col gap-2">
                    {/* {eng} */}
                    {receivedData.map((text, i) => <Chip key={i} label={text} className="w-fit" />)}
                </div>

                <div className="mt-4 text-center">
                    <Button label="Clear Received Data" size="small"
                        disabled={audioNode === null || receivedData.length === 0}
                        onClick={() => setReceivedData([])} />
                </div>
            </div>
        </div>
    );
}

export default BMTDemodulator;