import { useEffect, useRef, useState } from 'react';
import { useTourStore } from '../store/useTourStore';

export default function MapLayer() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mapWrapperRef = useRef<HTMLDivElement>(null);
    const { currentLocId, currentLoc, userPos, setUserPos, avatarPaused, addMessage, triggerTTS } = useTourStore();

    // Map Pan/Zoom state
    const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });
    const isDraggingMap = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const poiData = currentLoc.poiData || [];

    // Map Interaction Handlers
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.001;
        setMapTransform(prev => ({
            ...prev,
            scale: Math.min(Math.max(0.5, prev.scale + zoomDelta), 3)
        }));
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        isDraggingMap.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        if (mapWrapperRef.current) {
            mapWrapperRef.current.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDraggingMap.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setMapTransform(prev => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy
        }));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDraggingMap.current = false;
        if (mapWrapperRef.current) {
            mapWrapperRef.current.releasePointerCapture(e.pointerId);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const ctx = canvas.getContext('2d')!;
        const w = canvas.width;
        const h = canvas.height;

        let animId: number;

        const render = () => {
            // Base fill (AMap style light background)
            ctx.fillStyle = '#f2efe9';
            ctx.fillRect(0, 0, w, h);

            // 1. Draw Park (Green Area)
            ctx.fillStyle = '#dcecd6';
            ctx.beginPath();
            ctx.moveTo(w * 0.1, h * 0.2);
            ctx.bezierCurveTo(w * 0.3, h * 0.1, w * 0.4, h * 0.4, w * 0.2, h * 0.6);
            ctx.bezierCurveTo(w * 0.05, h * 0.5, w * 0.0, h * 0.3, w * 0.1, h * 0.2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(w * 0.7, h * 0.6);
            ctx.bezierCurveTo(w * 0.9, h * 0.5, w + 50, h * 0.8, w * 0.8, h + 50);
            ctx.bezierCurveTo(w * 0.6, h * 0.9, w * 0.5, h * 0.7, w * 0.7, h * 0.6);
            ctx.fill();

            // 2. Draw River
            ctx.lineWidth = 30;
            ctx.strokeStyle = '#b3d1ff';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(-50, h * 0.7);
            ctx.bezierCurveTo(w * 0.3, h * 0.8, w * 0.6, h * 0.4, w + 50, h * 0.3);
            ctx.stroke();

            // 3. Draw Main Roads (Arterial - Yellow/White)
            const drawRoad = (x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, width: number, color: string, outline: string) => {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(cx, cy, x2, y2);
                ctx.lineWidth = width + 2;
                ctx.strokeStyle = outline;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(cx, cy, x2, y2);
                ctx.lineWidth = width;
                ctx.strokeStyle = color;
                ctx.stroke();
            };

            // Main Highway
            drawRoad(-50, h * 0.2, w + 50, h * 0.9, w * 0.5, h * 0.4, 14, '#ffe292', '#e2c575');
            // Secondary Road
            drawRoad(w * 0.7, -50, w * 0.4, h + 50, w * 0.8, h * 0.5, 10, '#ffffff', '#e0e0e0');
            // Tertiary Road
            drawRoad(-50, h * 0.5, w * 0.8, -50, w * 0.2, h * 0.2, 8, '#ffffff', '#e0e0e0');
            drawRoad(w * 0.2, h + 50, w + 50, h * 0.6, w * 0.6, h * 0.8, 8, '#ffffff', '#e0e0e0');

            // Draw subtle POI tint based on currentLocId
            if (currentLocId === 'gugong') {
                ctx.fillStyle = 'rgba(217, 119, 119, 0.03)';
                ctx.fillRect(0, 0, w, h);
            }

            animId = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, [currentLocId]);

    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#f2efe9] touch-none">
            {/* Inner wrapper for semantic panning/zooming */}
            <div
                ref={mapWrapperRef}
                className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing origin-center"
                style={{ transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})` }}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <canvas ref={canvasRef} className="absolute inset-0"></canvas>

                {/* POI Markers */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {poiData.map((poi: any) => (
                        <div
                            key={poi.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group pointer-events-auto"
                            style={{ left: `${poi.position.x * 100}%`, top: `${poi.position.y * 100}%` }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setUserPos(poi.position);
                                const msgId = `bot-poi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                                addMessage({ id: msgId, sender: 'bot', text: '' });
                                triggerTTS(msgId, poi.narration.replace(/哦|呢|啦/g, ''), poi.image, poi.images);
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
        </div>
    );
}
