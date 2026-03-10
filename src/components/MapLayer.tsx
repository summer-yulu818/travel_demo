import React, { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { useTourStore } from '../store/useTourStore';

export default function MapLayer() {
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

    // Using existing store properties. currentPoiId does not exist, so we use currentLocId or local state
    // Actually, looking at the previous implementation, it didn't use currentPoiId, it used userPos and currentLoc.
    // For this demo, let's add local state for the active marker.
    const [activePoiId, setActivePoiId] = useState<string | null>(null);

    const { currentLoc, addMessage, triggerTTS, enablePosSimulation, simulatedPos, setSimulatedPos } = useTourStore();
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
                zoom: 14, // 14 级大概覆盖一公里左右视野
                // Default center to Westlake if no POI data
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

            // Fetch positions via global state and update simulatedPos on click
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
    }, []); // Initialize once

    // Update markers and polyline when poiData changes
    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AMap = (window as any).AMap;
        if (!AMap) return;

        // 1. Clear previous markers
        markersRef.current.forEach(m => mapInstanceRef.current.remove(m.marker));
        markersRef.current = [];

        // 2. Clear previous polyline
        if (polylineRef.current) {
            mapInstanceRef.current.remove(polylineRef.current);
            polylineRef.current = null;
        }

        // 3. Add new polyline
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // 4. Add new POI markers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // Make marker clickable
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

        // 5. If markers exist, softly pan to the first one or user position but don't force fitView which ruins the zoom scale
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
    }, [poiData, mapLoaded, activePoiId, addMessage, triggerTTS]);

    // Update marker styles when activePoiId changes
    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AMap = (window as any).AMap;
        if (!AMap) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        markersRef.current.forEach(({ marker, poiId }: any) => {
            const isActive = activePoiId === poiId;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const poi = poiData.find((p: any) => p.id === poiId);
            if (!poi) return;

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
                        transition: all 0.3s ease;
                    ">${poi.icon} ${poi.name}</span>
                    <div style="
                        width: ${isActive ? '16px' : '12px'}; 
                        height: ${isActive ? '16px' : '12px'}; 
                        border-radius: 50%;
                        background: ${isActive ? '#f59e0b' : '#94a3b8'};
                        border: 2px solid ${isActive ? '#fde68a' : '#e2e8f0'};
                        box-shadow: ${isActive ? '0 0 12px rgba(245,158,11,0.6)' : 'none'};
                        transition: all 0.3s ease;
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

            marker.setContent(markerContent);
        });

        // Smooth pan to current POI location
        const activePoi = poiData.find((p: any) => p.id === activePoiId);
        if (activePoi && activePoi.lng && activePoi.lat) {
            mapInstanceRef.current.panTo(new AMap.LngLat(activePoi.lng, activePoi.lat));
        }
    }, [activePoiId, mapLoaded, poiData, addMessage, triggerTTS]);

    // Update user marker based on simulated position
    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AMap = (window as any).AMap;

        if (enablePosSimulation) {
            if (!simulatedPos && poiData.length > 0 && poiData[0].lng) {
                setSimulatedPos({ lng: poiData[0].lng, lat: poiData[0].lat });
                return;
            }

            if (simulatedPos) {
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
    }, [enablePosSimulation, simulatedPos, mapLoaded, poiData, setSimulatedPos]);

    const mapZoom = useTourStore(state => state.mapZoom);
    useEffect(() => {
        if (mapInstanceRef.current && mapLoaded) {
            mapInstanceRef.current.setZoom(mapZoom);
        }
    }, [mapZoom, mapLoaded]);

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#f2efe9] touch-none">
            {/* AMap Container */}
            <div
                ref={mapContainerRef}
                className="w-full h-full"
            />
            {/* Loading overlay */}
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
