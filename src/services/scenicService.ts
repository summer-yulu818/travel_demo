import { supabase } from '../lib/supabase';

export interface POIData {
    id: string;
    name: string;
    icon: string;
    position: { x: number; y: number };
    distance: string;
    narration: string;
    image: string;
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
        // 1. Fetch Scenic Spot
        const { data: spot, error: spotError } = await supabase
            .from('scenic_spots')
            .select('*')
            .eq('id', scenicId)
            .single();

        if (spotError || !spot) {
            console.error('Error fetching scenic spot:', spotError);
            return null;
        }

        // 2. Fetch Attractions (POIs)
        const { data: attractions, error: attError } = await supabase
            .from('attractions')
            .select('*')
            .eq('scenic_id', scenicId)
            .eq('is_active', true);

        if (attError) {
            console.error('Error fetching attractions:', attError);
            return null;
        }

        // 3. Normalize POIs
        // Since coordinates in DB are lat/lng, we need to map them to x/y for the UI canvas (0-1 range)
        // We'll use the bounding box of the attractions to normalize if possible, or fixed bounds.
        // For Huangshan, let's look at the coordinates from import script: 118.157, 30.131
        const lats = attractions.map(a => a.latitude).filter(l => l != null);
        const lngs = attractions.map(a => a.longitude).filter(l => l != null);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const poiData: POIData[] = attractions.map(a => {
            // Simple linear normalization for 2D UI map
            const x = (a.longitude - minLng) / (maxLng - minLng || 1) * 0.8 + 0.1;
            const y = 1 - ((a.latitude - minLat) / (maxLat - minLat || 1) * 0.8 + 0.1);

            return {
                id: a.id,
                name: a.name,
                icon: '⛰️', // Default icon for Huangshan
                position: { x, y },
                distance: '100m', // Mock distance
                narration: a.description || `欢迎来到${a.name}。这里是黄山美景的一部分。`,
                image: 'https://picsum.photos/id/1015/400/240' // Mock image
            };
        });

        // 4. Fetch Events for Geofence Messages
        const { data: events, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('scenic_id', scenicId);

        const activeAttractionIds = new Set(attractions.map(a => a.id));
        const geofenceMessages: GeofenceMessage[] = (events || [])
            .filter(e => !e.attraction_id || activeAttractionIds.has(e.attraction_id))
            .map(e => ({
                id: String(e.id),
                text: `📅 ${e.name}`,
                type: 'event',
                detail: e.description || e.name
            }));

        // Add some mock promo messages if none exist
        if (geofenceMessages.length === 0) {
            geofenceMessages.push({
                id: 'hs-promo-1',
                text: '🍦 黄山西海饭店云海冰淇淋 8折',
                type: 'promo',
                detail: '出示导览界面即可享受黄山特色云海冰淇淋8折优惠。'
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
                id: 'xiaohuang',
                name: '小黄',
                title: '黄山向导'
            },
            poiData,
            aiResponses: {
                history: [spot.description || '黄山，位于安徽省南部，以奇松、怪石、云海、温泉、冬雪“五绝”及大峡谷“一绝”闻名于世，被誉为“天下第一奇山”。'],
                route: ['推荐路线：慈光阁 -> 玉屏楼 (迎客松) -> 莲花峰 -> 高峰 -> 排云亭 -> 西海大峡谷 -> 丹霞峰 -> 松谷庵。'],
                tips: ['黄山气候多变，建议携带雨具；山顶昼夜温差大，请备好保暖衣物。游览西海大峡谷建议保持体力。'],
                food: ['黄山特色美食有毛豆腐、臭鳜鱼、烧饼等，下山后可在屯溪老街品尝地道徽菜。'],
                photo: ['迎客松、始信峰、排云亭都是摄影发烧友的必选之地。特别是云海出现时，随手一拍都是大片。'],
                fallback: ['关于黄山的奇松怪石，或是您的登山路线，尽可以问我。']
            },
            geofenceMessages
        };
    } catch (error) {
        console.error('Failed to fetch scenic data:', error);
        return null;
    }
};
