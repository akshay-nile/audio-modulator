import { Button } from 'primereact/button';
import { Slider } from 'primereact/slider';
import { useCallback, useEffect, useState } from 'react';
import { startAudioDemodulator, stopAudioDemodulator } from '../services/demodulator';
import { type SliderValues } from '../services/modulator';

function MultiToneDemodulator() {
    const [audioNode, setAudioNode] = useState<AudioWorkletNode | null>(null);
    const [connected, setConnected] = useState<boolean>(false);

    const [sliderA, setSliderA] = useState<number>(50);
    const [sliderB, setSliderB] = useState<number>(50);
    const [sliderC, setSliderC] = useState<number>(50);
    const [sliderD, setSliderD] = useState<number>(50);

    const stopDemodulator = useCallback(async () => {
        await stopAudioDemodulator();
        setAudioNode(null);
    }, []);

    async function startDemodulator() {
        const node = await startAudioDemodulator({ module: 'mtd-processor', channels: 1, rate: 0 });
        node.port.onmessage = (e: MessageEvent<SliderValues | null>) => {
            const sliders = e.data;
            if (sliders === null) setConnected(false);
            else {
                setConnected(true);
                if (sliders.A) setSliderA(sliders.A);
                if (sliders.B) setSliderB(sliders.B);
                if (sliders.C) setSliderC(sliders.C);
                if (sliders.D) setSliderD(sliders.D);
            }
        };
        setAudioNode(node);
    }

    useEffect(() => {
        return () => { if (audioNode) (async () => await stopDemodulator())(); };
    }, [stopDemodulator, audioNode]);

    return (
        <div className="flex flex-col items-center gap-10">
            <h2 className="text-xl font-semibold text-center">
                Mono Channel Rx<br />Multi-Tone Demodulator
            </h2>

            <div className="w-full flex flex-col gap-4">
                <Button className="w-fit self-center"
                    label={`${audioNode ? 'Stop' : 'Start'} Multi-Tone Demodulator`}
                    severity={audioNode ? 'danger' : 'success'}
                    onClick={() => audioNode ? stopDemodulator() : startDemodulator()} />

                <div className="flex justify-around items-center mt-5">
                    <div className="flex flex-col items-center gap-4">
                        <span className="w-5">{sliderA}</span>
                        <Slider orientation="vertical" pt={{ root: { style: { height: '20rem' } } }}
                            value={sliderA} min={0} max={100} step={1} disabled={!audioNode || !connected} />
                        <span className="w-5 text-xs text-center">2.0 KHz</span>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <span className="w-5">{sliderB}</span>
                        <Slider orientation="vertical" pt={{ root: { style: { height: '20rem' } } }}
                            value={sliderB} min={0} max={100} step={1} disabled={!audioNode || !connected} />
                        <span className="w-5 text-xs text-center">2.5 KHz</span>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <span className="w-5">{sliderC}</span>
                        <Slider orientation="vertical" pt={{ root: { style: { height: '20rem' } } }}
                            value={sliderC} min={0} max={100} step={1} disabled={!audioNode || !connected} />
                        <span className="w-5 text-xs text-center">3.5 KHz</span>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <span className="w-5">{sliderD}</span>
                        <Slider orientation="vertical" pt={{ root: { style: { height: '20rem' } } }}
                            value={sliderD} min={0} max={100} step={1} disabled={!audioNode || !connected} />
                        <span className="w-5 text-xs text-center">4.0 KHz</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MultiToneDemodulator;