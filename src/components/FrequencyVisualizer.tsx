import { useEffect, useRef } from "react";

interface FrequencyVisualizerProps {
  analyser: AnalyserNode | null;
  className?: string;
  darkMode?: boolean;
}

export default function FrequencyVisualizer({ analyser, className = "", darkMode = false }: FrequencyVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / (bufferLength / 2)) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength / 2; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        if (darkMode) {
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)"); // emerald-500/20
          gradient.addColorStop(1, "rgba(16, 185, 129, 0.8)"); // emerald-500/80
        } else {
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.1)");
          gradient.addColorStop(1, "rgba(16, 185, 129, 0.6)");
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, darkMode]);

  return (
    <div className={`w-full h-16 overflow-hidden rounded-lg ${className}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={64}
        className="w-full h-full block"
      />
    </div>
  );
}
