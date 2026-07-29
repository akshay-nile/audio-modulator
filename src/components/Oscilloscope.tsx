import { useEffect, useRef } from 'react';

type Props = { node: AudioWorkletNode };

function Oscilloscope({ node }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef<boolean>(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;
        context.lineWidth = 2;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        const splitter = node.context.createChannelSplitter(2);

        const leftAnalyser = node.context.createAnalyser();
        leftAnalyser.smoothingTimeConstant = 0;
        leftAnalyser.fftSize = 256;
        while (leftAnalyser.fftSize < canvas.width) leftAnalyser.fftSize *= 2;

        const rightAnalyser = node.context.createAnalyser();
        rightAnalyser.smoothingTimeConstant = 0;
        rightAnalyser.fftSize = 256;
        while (rightAnalyser.fftSize < canvas.width) rightAnalyser.fftSize *= 2;

        node.connect(splitter);
        splitter.connect(leftAnalyser, 0);
        splitter.connect(rightAnalyser, 1);

        const leftBuffer = new Float32Array(leftAnalyser.fftSize);
        const rightBuffer = new Float32Array(rightAnalyser.fftSize);

        const centerY = Math.round(canvas.height / 2);
        const leftStart = leftBuffer.length - canvas.width;
        const rightStart = rightBuffer.length - canvas.width;

        let animationId = 0;

        function draw() {
            if (pausedRef.current) {
                animationId = requestAnimationFrame(draw);
                return;
            }
            if (!canvas || !context) return;

            leftAnalyser.getFloatTimeDomainData(leftBuffer);
            rightAnalyser.getFloatTimeDomainData(rightBuffer);

            context.clearRect(0, 0, canvas.width, canvas.height);

            // Drawing Left Channel in Green+Blue Color
            context.strokeStyle = '#00FFFF';
            context.beginPath();
            for (let x = 0; x < canvas.width; x++) {
                const leftSample = leftBuffer[leftStart + x] ?? 0;
                const y = centerY - leftSample * (centerY - 2);

                if (x === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            context.stroke();

            // Drawing Right Channel in Red+Green Color
            context.strokeStyle = '#FFFF00';
            context.beginPath();
            for (let x = 0; x < canvas.width; x++) {
                const rightSample = rightBuffer[rightStart + x] ?? 0;
                const y = centerY - rightSample * (centerY - 2);

                if (x === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            context.stroke();

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            leftAnalyser.disconnect();
            rightAnalyser.disconnect();
            splitter.disconnect();
        };
    }, [node]);

    return <canvas
        ref={canvasRef}
        onClick={() => pausedRef.current = !pausedRef.current}
        className="w-full h-50.25 bg-black rounded" />;
}

export default Oscilloscope;