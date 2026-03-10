import React, { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { useTourStore } from '../store/useTourStore';

export default function MapLayer() {
    const { useAMap } = useTourStore();

    if (useAMap) {
        return <AMapView />;
    } else {
        return <VirtualMapView />;
    }
}

function AMapView() {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const polylineRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userMarkerRef = useRef<any>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [activePoiId, setActivePoiId] = useState<string | null>(null);

    const { currentLoc, addMessage, triggerTTS, enablePosSimulation, simulatedPos, setSimulatedPos, mapZoom } = useTourStore();
    const poiData = currentLoc?.poiData || [];

    // Initialize AMap
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let map: any = null;

        AMapLoader.load({
            key: import.meta.env.VITE_AMAP_KEY || 'fad2b23895ef7433a9bbffb1b2613191',
            version: '2.0',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).then((AMap: any) => {
            if (!mapContainerRef.current) return;

            map = new AMap.Map(mapContainerRef.current, {
                viewMode: '3D',
                pitch: 45,
                zoom: mapZoom,
                center: poiData.length > 0 && poiData[0].lng ? [poiData[0].lng, poiData[0].lat] : [120.1472, 30.2638],
                mapStyle: 'amap://styles/whitesmoke',
                resizeEnable: true,
                pitchEnable: true,
                rotateEnable: true,
                showLabel: true,
                features: ['bg', 'road', 'building', 'point'],
            });

            mapInstanceRef.current = map;
            setMapLoaded(true);

            map.on('click', (e: any) => {
                const state = useTourStore.getState();
                if (state.enablePosSimulation) {
                    state.setSimulatedPos({ lng: e.lnglat.lng, lat: e.lnglat.lat });
                }
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).catch((e: any) => {
            console.error('AMap load error:', e);
        });

        return () => {
            if (map) {
                map.destroy();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update markers and polyline when poiData changes
    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AMap = (window as any).AMap;
        if (!AMap) return;

        markersRef.current.forEach(m => mapInstanceRef.current.remove(m.marker));
        markersRef.current = [];

        if (polylineRef.current) {
            mapInstanceRef.current.remove(polylineRef.current);
            polylineRef.current = null;
        }

        const path = poiData.filter((p: any) => p.lng && p.lat).map((p: any) => new AMap.LngLat(p.lng, p.lat));
        if (path.length > 0) {
            const polyline = new AMap.Polyline({
                path,
                strokeColor: '#6366f1',
                strokeWeight: 4,
                strokeOpacity: 0.7,
                strokeStyle: 'dashed',
                strokeDasharray: [10, 5],
                lineJoin: 'round',
                lineCap: 'round',
            });
            mapInstanceRef.current.add(polyline);
            polylineRef.current = polyline;
        }

        const markers = poiData.filter((p: any) => p.lng && p.lat).map((poi: any) => {
            const isActive = activePoiId === poi.id;
            const markerContent = document.createElement('div');
            markerContent.className = 'amap-poi-marker';
            markerContent.innerHTML = `
                <div style="
                    display: flex; flex-direction: column; align-items: center; gap: 4px; border: none;
                    transform: translate(-50%, -100%); cursor: pointer;
                ">
                    <span style="
                        font-size: 10px; font-weight: 700; 
                        padding: 2px 8px; border-radius: 9999px;
                        background: ${isActive ? '#f59e0b' : 'rgba(255,255,255,0.9)'};
                        color: ${isActive ? '#fff' : '#475569'};
                        border: 1px solid ${isActive ? '#f59e0b' : '#e2e8f0'};
                        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                        white-space: nowrap;
                    ">${poi.icon} ${poi.name}</span>
                    <div style="
                        width: 12px; height: 12px; border-radius: 50%;
                        background: ${isActive ? '#f59e0b' : '#94a3b8'};
                        border: 2px solid ${isActive ? '#fde68a' : '#e2e8f0'};
                        box-shadow: ${isActive ? '0 0 12px rgba(245,158,11,0.6)' : 'none'};
                    "></div>
                </div>
            `;

            markerContent.onclick = (e) => {
                e.stopPropagation();
                setActivePoiId(poi.id);
                const state = useTourStore.getState();
                if (state.enablePosSimulation) {
                    state.setSimulatedPos({ lng: poi.lng, lat: poi.lat });
                }
                const msgId = `bot-poi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                addMessage({ id: msgId, sender: 'bot', text: '' });
                triggerTTS(msgId, poi.narration.replace(/哦|呢|啦/g, ''), poi.image, poi.images);
            };

            const marker = new AMap.Marker({
                position: new AMap.LngLat(poi.lng, poi.lat),
                content: markerContent,
                offset: new AMap.Pixel(0, 0),
                anchor: 'bottom-center',
            });
            mapInstanceRef.current.add(marker);
            return { marker, poiId: poi.id };
        });
        markersRef.current = markers;

        if (markers.length > 0) {
            setTimeout(() => {
                const state = useTourStore.getState();
                const centerLng = state.simulatedPos?.lng || poiData[0]?.lng;
                const centerLat = state.simulatedPos?.lat || poiData[0]?.lat;
                if (mapInstanceRef.current && centerLng && centerLat) {
                    mapInstanceRef.current.panTo(new AMap.LngLat(centerLng, centerLat));
                }
            }, 50);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poiData, mapLoaded, activePoiId, addMessage, triggerTTS]);

    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded) return;
        if (enablePosSimulation) {
            if (!simulatedPos && poiData.length > 0 && poiData[0].lng) {
                setSimulatedPos({ lng: poiData[0].lng, lat: poiData[0].lat });
                return;
            }
            if (simulatedPos) {
                const AMap = (window as any).AMap;
                if (userMarkerRef.current) {
                    userMarkerRef.current.setPosition(new AMap.LngLat(simulatedPos.lng, simulatedPos.lat));
                    userMarkerRef.current.show();
                } else {
                    const userEl = document.createElement('div');
                    userEl.innerHTML = `
                        <div style="
                            width: 32px; height: 32px; border-radius: 50%;
                            background: #3b82f6; border: 2px solid white;
                            display: flex; align-items: center; justify-content: center;
                            box-shadow: 0 4px 12px rgba(59,130,246,0.5);
                            font-size: 18px; position: relative;
                            z-index: 200;
                        ">
                            🚶🏻‍♂️
                            <div style="
                                position: absolute; inset: 0; border-radius: 50%;
                                background: rgba(59,130,246,0.3);
                                animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
                            "></div>
                        </div>
                    `;
                    const userMarker = new AMap.Marker({
                        position: new AMap.LngLat(simulatedPos.lng, simulatedPos.lat),
                        content: userEl,
                        offset: new AMap.Pixel(-16, -16),
                        zIndex: 200,
                    });
                    mapInstanceRef.current.add(userMarker);
                    userMarkerRef.current = userMarker;
                }
            }
        } else {
            if (userMarkerRef.current) {
                userMarkerRef.current.hide();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enablePosSimulation, simulatedPos, mapLoaded, poiData, setSimulatedPos]);

    useEffect(() => {
        if (mapInstanceRef.current && mapLoaded) {
            mapInstanceRef.current.setZoom(mapZoom);
        }
    }, [mapZoom, mapLoaded]);

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#f2efe9] touch-none">
            <div ref={mapContainerRef} className="w-full h-full" />
            {!mapLoaded && (
                <div className="absolute inset-0 bg-[#f2efe9] flex items-center justify-center z-10">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <span className="text-sm text-slate-500">地图加载中...</span>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes ping {
                    75%, 100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
                .amap-logo { display: none !important; }
                .amap-copyright { display: none !important; }
            `}</style>
        </div>
    );
}

function VirtualMapView() {
    const { currentLocId, currentLoc, userPos, addMessage, triggerTTS, setUserPos } = useTourStore();
    const poiData = currentLoc?.poiData || [];
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mapWrapperRef = useRef<HTMLDivElement>(null);

    // Map Pan/Zoom state
    const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });
    const isDraggingMap = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

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
        const dx = (e.clientX - lastPos.current.x);
        const dy = (e.clientY - lastPos.current.y);
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
        if (!canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
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
