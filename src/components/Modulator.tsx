import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { startAudioModulator, stopAudioModulator } from '../services/modulator';
import { basebandBaudRates, getCarrierFrequencies, modulationSchemes, passbandBaudRates, type ModulationScheme } from '../services/options';
import { Panel } from 'primereact/panel';

function Modulator() {
    const portRef = useRef<MessagePort | null>(null);

    const [audioNode, setAudioNode] = useState<AudioWorkletNode | null>(null);
    const [modulationScheme, setModulationScheme] = useState<ModulationScheme>(modulationSchemes[0]);
    const [baudRate, setBaudRate] = useState<number>(1200);
    const [carrierFreq, setCarrierFreq] = useState<number>(12000);
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
        const node = await startAudioModulator(modulationScheme.processor, { baudRate, carrierFreq });
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
        (async () => {
            await stopModulator();
            setBaudRate(1200);
            setCarrierFreq(12000);
        })();
    }, [modulationScheme, stopModulator]);

    useEffect(() => {
        return () => { if (audioNode) (async () => await stopModulator())(); };
    }, [stopModulator, audioNode]);

    return (
        <div className="flex flex-col items-center gap-10">

            <Panel header="Configurations" pt={{ content: { style: { padding: '1.25rem 1rem' } } }}>
                <div className="flex flex-col gap-4 text-sm">
                    <div className="flex flex-col gap-1 justify-center">
                        <label htmlFor="modulation-scheme">Modulation Scheme</label>
                        <Dropdown id="modulation-scheme" name="modulation-scheme"
                            options={modulationSchemes} optionLabel="name"
                            value={modulationScheme}
                            onChange={e => setModulationScheme(e.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 justify-center">
                            <label htmlFor="baud-rate">Baud Rate</label>
                            <Dropdown id="baud-rate" name="baud-rate"
                                options={(modulationScheme.carrier ? passbandBaudRates : basebandBaudRates).map(v => ({ label: v + ' Bits/Second', value: v }))}
                                optionLabel="label" optionValue="value"
                                value={baudRate}
                                onChange={e => {
                                    setBaudRate(e.value);
                                    const availableCarrierFreqs = getCarrierFrequencies(e.value);
                                    const freq = availableCarrierFreqs.includes(carrierFreq) ? carrierFreq : availableCarrierFreqs[0];
                                    setCarrierFreq(freq);
                                    if (audioNode) audioNode.port.postMessage({ baudRate: e.value, carrierFreq: freq });
                                }} />
                        </div>
                        <div className={`flex flex-col gap-1 justify-center ${!modulationScheme.carrier && 'hidden'}`}>
                            <label htmlFor="carrier-freq">Carrier Freq.</label>
                            <Dropdown id="carrier-freq" name="carrier-freq"
                                options={getCarrierFrequencies(baudRate).map(v => ({ label: v / 1000 + ' KHz', value: v }))}
                                optionLabel="label" optionValue="value"
                                value={carrierFreq}
                                onChange={e => {
                                    setCarrierFreq(e.value);
                                    if (audioNode) audioNode.port.postMessage({ baudRate, carrierFreq: e.value });
                                }} />
                        </div>
                    </div>
                </div>
            </Panel>


            <div className="flex flex-col items-center gap-2">
                <img src={`./images/${modulationScheme.processor.module.split('-')[0]}.png`} className="w-full px-2" />
                <Button className="w-fit"
                    label={`${audioNode ? 'Stop' : 'Start'} Audio Modulator`}
                    severity={audioNode ? 'danger' : 'success'}
                    onClick={() => audioNode ? stopModulator() : startModulator()} />

            </div>

            <div className="w-full flex flex-col gap-4 border border-gray-800 p-4 py-6 rounded-lg">
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
        </div >
    );
}

export default Modulator;