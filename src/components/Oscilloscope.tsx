import { useEffect, useRef } from 'react';

type Props = { node: AudioWorkletNode };

function Oscilloscope({ node }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        const splitter = node.context.createChannelSplitter(2);
        node.connect(splitter);

        const analyser = node.context.createAnalyser();
        analyser.fftSize = 256;
        while (analyser.fftSize < canvas.width) analyser.fftSize *= 2;
        splitter.connect(analyser, 0);

        const buffer = new Float32Array(analyser.fftSize);
        let animationId = 0;

        function draw() {
            if (!canvas || !context) return;

            analyser.getFloatTimeDomainData(buffer);
            context.clearRect(0, 0, canvas.width, canvas.height);

            context.strokeStyle = '#00ff00';
            context.lineWidth = 2;

            context.beginPath();

            const centerY = Math.round(canvas.height / 2);
            const start = buffer.length - canvas.width;

            for (let x = 0; x < canvas.width; x++) {
                const sample = buffer[start + x] ?? 0;
                const y = centerY - sample * (centerY - 2);

                if (x === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }

            context.stroke();
            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            analyser.disconnect();
        };
    }, [node]);

    return <canvas
        ref={canvasRef}
        className="w-full h-50.25 bg-black rounded" />;
}

export default Oscilloscope;