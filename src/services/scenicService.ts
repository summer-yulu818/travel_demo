import { supabase } from '../lib/supabase';

export interface POIData {
    id: string;
    name: string;
    icon: string;
    position: { x: number; y: number }; // Relative position for visual layout
    lng: number; // Real longitude for AMap
    lat: number; // Real latitude for AMap
    distance: string;
    narration: string;
    image: string;
    images: string[];
}

export interface GeofenceMessage {
    id: string;
    text: string;
    type: string;
    detail: string;
}

export interface ScenicLocation {
    scenicArea: {
        id: string;
        name: string;
        city: string;
        visitors: number;
        heatLevel: number;
        geofence: { lat: number; lng: number; radius: number } | null;
    };
    guide: {
        id: string;
        name: string;
        title: string;
    };
    poiData: POIData[];
    aiResponses: {
        history: string[];
        route: string[];
        tips: string[];
        food: string[];
        photo: string[];
        fallback: string[];
    };
    geofenceMessages: GeofenceMessage[];
}

export const fetchScenicData = async (scenicId: string): Promise<ScenicLocation | null> => {
    try {
        // Parallel fetch for better performance
        const [spotRes, attractionsRes, eventsRes, imagesRes] = await Promise.all([
            supabase
                .from('scenic_spots')
                .select('id, name, city_name, description, longitude, latitude')
                .eq('id', scenicId)
                .single(),
            supabase
                .from('attractions')
                .select('id, name, latitude, longitude, description')
                .eq('scenic_id', scenicId)
                .eq('is_active', true),
            supabase
                .from('events')
                .select('id, name, attraction_id, description')
                .eq('scenic_id', scenicId),
            supabase
                .from('attraction_images')
                .select('attraction_id, image_url')
                .eq('scenic_id', scenicId)
        ]);

        const { data: spot, error: spotError } = spotRes;
        const { data: attractions, error: attError } = attractionsRes;
        const { data: events, error: eventError } = eventsRes;
        const { data: allImages, error: imgError } = imagesRes;

        if (spotError || !spot) {
            console.error('Error fetching scenic spot:', spotError);
            return null;
        }

        if (attError || !attractions) {
            console.error('Error fetching attractions:', attError);
            return null;
        }

        // 3. Normalize POIs
        const lats = attractions.map((a: any) => a.latitude).filter((l: any) => l != null);
        const lngs = attractions.map((a: any) => a.longitude).filter((l: any) => l != null);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const poiData: POIData[] = attractions.map((a: any) => {
            // Simple linear normalization for 2D UI map
            const x = (a.longitude - minLng) / (maxLng - minLng || 1) * 0.8 + 0.1;
            const y = 1 - ((a.latitude - minLat) / (maxLat - minLat || 1) * 0.8 + 0.1);

            const attractionImages = allImages?.filter((img: any) => img.attraction_id === a.id).map((img: any) => img.image_url) || [];

            return {
                id: a.id,
                name: a.name,
                icon: '📍',
                position: { x, y },
                lng: a.longitude,
                lat: a.latitude,
                distance: '100m',
                narration: a.description || `这是${a.name}，一个非常值得一游的地方。`,
                image: attractionImages[0] || '/xiaohuang_avatar.png',
                images: attractionImages
            };
        });

        const activeAttractionIds = new Set(attractions.map((a: any) => a.id));
        const geofenceMessages: GeofenceMessage[] = (events || [])
            .filter((e: any) => !e.attraction_id || activeAttractionIds.has(e.attraction_id))
            .map((e: any) => ({
                id: String(e.id),
                text: `📅 ${e.name}`,
                type: 'event',
                detail: e.description || e.name
            }));

        if (geofenceMessages.length === 0) {
            geofenceMessages.push({
                id: 'hs-promo-1',
                text: '🍦 特色云海冰淇淋 8折',
                type: 'promo',
                detail: '出示导览界面即可享受特色云海冰淇淋8折优惠。'
            });
        }

        return {
            scenicArea: {
                id: spot.id,
                name: spot.name,
                city: spot.city_name,
                visitors: Math.floor(Math.random() * 5000) + 1000,
                heatLevel: 4,
                geofence: { lat: spot.latitude, lng: spot.longitude, radius: 5000 }
            },
            guide: {
                id: scenicId === 'huangshan' ? 'xiaohuang' : scenicId === 'gugong' ? 'xiaogu' : 'xiaoxi',
                name: scenicId === 'huangshan' ? '小黄' : scenicId === 'gugong' ? '小故' : '小溪',
                title: '向导'
            },
            poiData,
            aiResponses: {
                history: [spot.description || '这里是著名景点，有着悠久的历史。'],
                route: ['推荐游览路线：从正门进入，按顺时针方向游览主要景点。'],
                tips: ['建议携带雨具，防晒并备好充足的水。'],
                food: ['当地特色美食有各种地道风味小吃，下山后可前往美食街品尝。'],
                photo: ['这些地方都是摄影绝佳位置，特别是在日出或日落时分。'],
                fallback: ['关于这片景区的历史和故事，尽管问我。']
            },
            geofenceMessages
        };
    } catch (error) {
        console.error('Failed to fetch scenic data:', error);
        return null;
    }
};
