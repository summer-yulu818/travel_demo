import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { useTourStore } from '../store/useTourStore';

export default function MapLayer() {
    const { currentLoc, setUserPos, avatarPaused, addMessage, triggerTTS, userPos } = useTourStore();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const AMapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const userMarkerRef = useRef<any>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    const poiData = currentLoc?.poiData || [];

    // Initialize AMap
    useEffect(() => {
        let map: any = null;

        AMapLoader.load({
            key: import.meta.env.VITE_AMAP_KEY,
            version: '2.0',
        }).then((AMap: any) => {
            if (!mapContainerRef.current) return;

            AMapRef.current = AMap;

            map = new AMap.Map(mapContainerRef.current, {
                zoom: 16,
                center: poiData.length > 0 ? [poiData[0].lng, poiData[0].lat] : [116.397026, 39.917],
                mapStyle: 'amap://styles/whitesmoke',
                resizeEnable: true,
                pitchEnable: false,
                rotateEnable: false,
                dragEnable: true,
                zoomEnable: true,
                showLabel: true,
                features: ['bg', 'road', 'building', 'point'],
            });

            mapInstanceRef.current = map;
            setMapLoaded(true);
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

    // Render Markers after map load
    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded || !AMapRef.current) return;
        const AMap = AMapRef.current;

        // Clear existing markers
        markersRef.current.forEach(m => mapInstanceRef.current.remove(m));
        markersRef.current = [];

        if (poiData.length === 0) return;

        // Add POI markers
        poiData.forEach((poi: any) => {
            const el = document.createElement('div');
            el.className = 'amap-poi-marker';
            el.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%); transition: transform 0.2s; pointer-events: auto;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 4px; z-index: 10;">
                        ${poi.icon || '📍'}
                    </div>
                    <div style="font-size: 10px; color: #374151; font-weight: 500; background: rgba(255, 255, 255, 0.8); padding: 0 4px; border-radius: 4px; backdrop-filter: blur(4px); white-space: nowrap;">
                        ${poi.name}
                    </div>
                </div>
            `;

            const marker = new AMap.Marker({
                position: new AMap.LngLat(poi.lng, poi.lat),
                content: el,
                offset: new AMap.Pixel(0, 0),
                anchor: 'bottom-center',
                extData: poi
            });

            marker.on('click', () => {
                setUserPos(poi.position);
                if (!avatarPaused) {
                    const msgId = `bot-poi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    addMessage({ id: msgId, sender: 'bot', text: '' });
                    triggerTTS(msgId, poi.narration.replace(/哦|呢|啦/g, ''), poi.image, poi.images);
                }
            });

            mapInstanceRef.current.add(marker);
            markersRef.current.push(marker);
        });

        // Fit map bounds
        mapInstanceRef.current.setFitView(null, false, [40, 40, 40, 40]);

    }, [poiData, mapLoaded, avatarPaused, addMessage, setUserPos, triggerTTS]);

    // Handle user location marker
    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded || !AMapRef.current) return;
        const AMap = AMapRef.current;

        let userLng = poiData[0]?.lng || 116.397026;
        let userLat = poiData[0]?.lat || 39.917;

        // Sync with visual pointer representation
        const matchedPoi = poiData.find((p: any) => p.position.x === userPos.x && p.position.y === userPos.y);
        if (matchedPoi) {
            userLng = matchedPoi.lng;
            userLat = matchedPoi.lat;
        }

        if (userMarkerRef.current) {
            userMarkerRef.current.setPosition(new AMap.LngLat(userLng, userLat));
        } else {
            const userEl = document.createElement('div');
            userEl.innerHTML = `
                        < div style = "position: relative; width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px rgba(34,197,94,0.6); z-index: 20;" >
                            <div style="position: absolute; inset: -6px; border-radius: 50%; border: 1px solid #4ade80; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>
                </div >
                        <style>
                            @keyframes ping {
                                75 %, 100 % {
                                    transform: scale(2);
                                    opacity: 0;
                                }
                            }
                        </style>
                    `;
            const userMarker = new AMap.Marker({
                position: new AMap.LngLat(userLng, userLat),
                content: userEl,
                offset: new AMap.Pixel(-6, -6),
            });
            mapInstanceRef.current.add(userMarker);
            userMarkerRef.current = userMarker;
        }

    }, [userPos, poiData, mapLoaded]);

    return (
        <div className="absolute inset-0 bg-[#f2efe9]">
            {/* AMap Container */}
            <div
                ref={mapContainerRef}
                className="w-full h-full"
            />

            {/* Loading Overlay */}
            {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f2efe9]/80 backdrop-blur-sm z-50">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <style>{`
                        .amap - logo { display: none!important; }
                .amap - copyright { display: none!important; }
                    `}</style>
        </div>
    );
}
