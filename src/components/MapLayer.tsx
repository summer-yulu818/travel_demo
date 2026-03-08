import { useEffect, useRef } from 'react';
import { useTourStore } from '../store/useTourStore';

export default function MapLayer() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { currentLocId, currentLoc, userPos, setUserPos, avatarPaused, addMessage, triggerTTS } = useTourStore();

    const poiData = currentLoc.poiData || [];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !containerRef.current) return;

        // Setup canvas
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let time = 0;

        // bg particles
        const particles = Array.from({ length: currentLocId === 'gugong' ? 15 : 30 }).map(() => ({
            x: Math.random() * w,
            y: Math.random() * h,
            size: Math.random() * 2 + 1,
            speedY: Math.random() * 0.5 + 0.1,
            speedX: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.5 + 0.1
        }));

        const render = () => {
            ctx.clearRect(0, 0, w, h);
            time += 0.02;

            // Draw map radar grids
            ctx.strokeStyle = currentLocId === 'gugong' ? 'rgba(217, 119, 119, 0.1)' : 'rgba(100, 150, 255, 0.1)';
            ctx.lineWidth = 1;

            const cx = w / 2;
            const cy = h / 2;

            for (let r = 50; r < Math.max(w, h); r += 80) {
                ctx.beginPath();
                ctx.arc(cx, cy, r + Math.sin(time + r) * 5, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw particles
            particles.forEach(p => {
                p.y -= p.speedY;
                p.x += p.speedX;
                if (p.y < 0) { p.y = h; p.x = Math.random() * w; }

                ctx.fillStyle = currentLocId === 'gugong'
                    ? `rgba(255, 215, 0, ${p.opacity})` // 金色粒子
                    : `rgba(255, 255, 255, ${p.opacity})`; // 白色粒子

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            animId = requestAnimationFrame(render);
        };
        render();

        return () => cancelAnimationFrame(animId);
    }, [currentLocId]);

    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
            <canvas ref={canvasRef} className="absolute inset-0 opacity-60"></canvas>

            {/* POI Markers */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {poiData.map((poi: any, i: number) => (
                    <div
                        key={poi.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group pointer-events-auto"
                        style={{ left: `${poi.position.x * 100}%`, top: `${poi.position.y * 100}%` }}
                        onClick={() => {
                            setUserPos(poi.position);
                            if (!avatarPaused) {
                                const msgId = `bot-poi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                                addMessage({ id: msgId, sender: 'bot', text: '' });
                                triggerTTS(msgId, poi.narration.replace(/哦|呢|啦/g, ''), poi.image);
                            }
                        }}
                    >
                        <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-lg mb-1 group-hover:scale-110 transition-transform">
                            {poi.icon}
                        </div>
                        <div className="text-[10px] text-gray-700 font-medium bg-white/60 px-1 rounded backdrop-blur-sm">
                            {poi.name}
                        </div>
                    </div>
                ))}

                {/* User Location Node */}
                <div
                    className="absolute w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)] -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-20"
                    style={{ left: `${userPos.x * 100}%`, top: `${userPos.y * 100}%` }}
                >
                    <div className="absolute inset-[-6px] rounded-full border border-green-400 animate-ping opacity-75"></div>
                </div>
            </div>
        </div>
    );
}
