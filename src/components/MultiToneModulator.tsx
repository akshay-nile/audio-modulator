import { Button } from 'primereact/button';
import { Slider, type SliderChangeEvent } from 'primereact/slider';
import { useCallback, useEffect, useState } from 'react';
import { startAudioModulator, stopAudioModulator } from '../services/modulator';

function MultiToneModulator() {
    const [audioNode, setAudioNode] = useState<AudioWorkletNode | null>(null);

    const [sliderA, setSliderA] = useState<number>(50);
    const [sliderB, setSliderB] = useState<number>(50);
    const [sliderC, setSliderC] = useState<number>(50);
    const [sliderD, setSliderD] = useState<number>(50);

    const stopModulator = useCallback(async () => {
        await stopAudioModulator();
        setAudioNode(null);
    }, []);

    async function startModulator() {
        const sliders = { A: sliderA, B: sliderB, C: sliderC, D: sliderD };
        const node = await startAudioModulator({ module: 'mtm-processor', channels: 1, rate: sliders });
        setAudioNode(node);
    }

    useEffect(() => {
        return () => { if (audioNode) (async () => await stopModulator())(); };
    }, [stopModulator, audioNode]);

    return (
        <div className="flex flex-col items-center gap-10">
            <h2 className="text-xl font-semibold text-center">
                Mono Channel Tx<br />Multi-Tone Modulator
            </h2>

            <div className="w-full flex flex-col gap-4">
                <Button className="w-fit self-center"
                    label={`${audioNode ? 'Stop' : 'Start'} Multi-Tone Modulator`}
                    severity={audioNode ? 'danger' : 'success'}
                    onClick={() => audioNode ? stopModulator() : startModulator()} />

                <div className="flex justify-around items-center mt-5">
                    <div className="flex flex-col items-center gap-4">
                        <span className="w-5">{sliderA}</span>
                        <Slider orientation="vertical" pt={{ root: { style: { height: '20rem' } } }}
                            value={sliderA} min={0} max={100} step={1} disabled={!audioNode}
                            onChange={(e: SliderChangeEvent) => {
                                setSliderA(e.value as number);
                                if (audioNode) audioNode.port.postMessage({ A: e.value });
                            }} />
                        <span className="w-5 text-xs text-center">2.0 KHz</span>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <span className="w-5">{sliderB}</span>
                        <Slider orientation="vertical" pt={{ root: { style: { height: '20rem' } } }}
                            value={sliderB} min={0} max={100} step={1} disabled={!audioNode}
                            onChange={(e: SliderChangeEvent) => {
                                setSliderB(e.value as number);
                                if (audioNode) audioNode.port.postMessage({ B: e.value });
                            }} />
                        <span className="w-5 text-xs text-center">2.5 KHz</span>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <span className="w-5">{sliderC}</span>
                        <Slider orientation="vertical" pt={{ root: { style: { height: '20rem' } } }}
                            value={sliderC} min={0} max={100} step={1} disabled={!audioNode}
                            onChange={(e: SliderChangeEvent) => {
                                setSliderC(e.value as number);
                                if (audioNode) audioNode.port.postMessage({ C: e.value });
                            }} />
                        <span className="w-5 text-xs text-center">3.5 KHz</span>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <span className="w-5">{sliderD}</span>
                        <Slider orientation="vertical" pt={{ root: { style: { height: '20rem' } } }}
                            value={sliderD} min={0} max={100} step={1} disabled={!audioNode}
                            onChange={(e: SliderChangeEvent) => {
                                setSliderD(e.value as number);
                                if (audioNode) audioNode.port.postMessage({ D: e.value });
                            }} />
                        <span className="w-5 text-xs text-center">4.0 KHz</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MultiToneModulator;