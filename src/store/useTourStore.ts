import { create } from 'zustand';
// @ts-ignore
import { locations as staticLocations } from '../data/scenic-data';
import { fetchScenicData, ScenicLocation } from '../services/scenicService';

type Point = { x: number; y: number };

export interface DebugLog {
    id: string;
    ts: string;
    type: string;
    detail: string;
}

export type Message = {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    imageUrl?: string;
    images?: string[];
    isTyping?: boolean;
};

interface TourState {
    currentLocId: string;
    currentLoc: any;
    dynamicLocations: Record<string, ScenicLocation>;
    userPos: Point;
    avatarPaused: boolean;
    avatarTalking: boolean;
    simRunning: boolean;
    cameraActive: boolean;
    isVisionActive: boolean;
    enableCloudVision: boolean;
    enablePosSimulation: boolean;
    simulatedPos: { lng: number; lat: number } | null;
    mapZoom: number;
    gfMsgIndex: number;
    steps: number;
    messages: Message[];
    debugLogs: DebugLog[];
    showDebugPanel: boolean;
    currentTTS: { id: string; text: string; imageUrl?: string; images?: string[] } | null;

    // Actions
    setLocId: (id: string) => Promise<void>;
    setUserPos: (pos: Point) => void;
    setAvatarPaused: (paused: boolean) => void;
    setAvatarTalking: (talking: boolean) => void;
    setSimRunning: (running: boolean) => void;
    setCameraActive: (active: boolean) => void;
    setVisionActive: (active: boolean) => void;
    setEnableCloudVision: (enable: boolean) => void;
    setEnablePosSimulation: (enable: boolean) => void;
    setSimulatedPos: (pos: { lng: number; lat: number } | null) => void;
    setMapZoom: (zoom: number) => void;
    setGfMsgIndex: (idx: number) => void;
    incrementSteps: (val: number) => void;
    addMessage: (msg: Message) => void;
    updateMessage: (id: string, partial: Partial<Message>) => void;
    addDebugLog: (type: string, detail: string) => void;
    clearDebugLogs: () => void;
    setShowDebugPanel: (show: boolean) => void;
    triggerTTS: (id: string, text: string, imageUrl?: string, images?: string[]) => void;
    clearTTS: () => void;
}

const buildPath = (points: any[]) => {
    const path: any[] = [];
    points.forEach((p, i) => {
        path.push({ x: p.position.x, y: p.position.y, isPoi: true, poi: p });
        if (i < points.length - 1) {
            const nextP = points[i + 1];
            const steps = 10;
            for (let j = 1; j < steps; j++) {
                path.push({
                    x: p.position.x + (nextP.position.x - p.position.x) * (j / steps),
                    y: p.position.y + (nextP.position.y - p.position.y) * (j / steps),
                    isPoi: false
                });
            }
        }
    });
    return path;
};

// attach walkPath to static init
Object.values(staticLocations).forEach((loc: any) => {
    loc.walkPath = buildPath(loc.poiData);
});

export const useTourStore = create<TourState>((set, get) => ({
    currentLocId: 'westlake',
    currentLoc: staticLocations['westlake'],
    dynamicLocations: {},
    userPos: { x: 0.58, y: 0.18 }, // snap to first poi
    avatarPaused: true,
    avatarTalking: false,
    simRunning: false,
    cameraActive: false,
    isVisionActive: false,
    enableCloudVision: false,
    enablePosSimulation: true,
    simulatedPos: null,
    mapZoom: 14,
    gfMsgIndex: 0,
    steps: 0,
    messages: [{ id: 'init', sender: 'bot', text: '欢迎来到AI伴游！我是您的专属智能导游。' }],
    debugLogs: [],
    showDebugPanel: true,
    currentTTS: null,

    setLocId: async (id) => {
        // Update ID immediately for responsive UI
        set({ currentLocId: id });

        // 1. Check static
        if (staticLocations[id]) {
            const loc = staticLocations[id];
            const firstPoi = loc.poiData[0];
            set({
                currentLoc: loc,
                userPos: firstPoi?.position || { x: 0.5, y: 0.5 },
                simulatedPos: firstPoi && firstPoi.lng ? { lng: firstPoi.lng, lat: firstPoi.lat } : null
            });
            return;
        }

        // 2. Check dynamic cache
        const { dynamicLocations } = get();
        if (dynamicLocations[id]) {
            const loc = dynamicLocations[id];
            const firstPoi = loc.poiData[0];
            set({
                currentLoc: loc,
                userPos: firstPoi?.position || { x: 0.5, y: 0.5 },
                simulatedPos: firstPoi && firstPoi.lng ? { lng: firstPoi.lng, lat: firstPoi.lat } : null
            });
            return;
        }

        // 3. Fetch from DB
        const locData = await fetchScenicData(id);
        if (locData) {
            (locData as any).walkPath = buildPath(locData.poiData);
            const firstPoi = locData.poiData[0];
            set((state) => ({
                currentLoc: locData,
                dynamicLocations: { ...state.dynamicLocations, [id]: locData },
                userPos: firstPoi?.position || { x: 0.5, y: 0.5 },
                simulatedPos: firstPoi && firstPoi.lng ? { lng: firstPoi.lng, lat: firstPoi.lat } : null
            }));
        } else {
            console.error(`Failed to load location: ${id}`);
        }
    },
    setUserPos: (pos) => set({ userPos: pos }),
    setAvatarPaused: (paused) => set({ avatarPaused: paused }),
    setAvatarTalking: (talking) => set({ avatarTalking: talking }),
    setSimRunning: (running) => set({ simRunning: running }),
    setCameraActive: (active) => set({ cameraActive: active }),
    setVisionActive: (active) => set({ isVisionActive: active }),
    setEnableCloudVision: (enable) => set({ enableCloudVision: enable }),
    setEnablePosSimulation: (enable) => set({ enablePosSimulation: enable }),
    setSimulatedPos: (pos) => set({ simulatedPos: pos }),
    setMapZoom: (zoom) => set({ mapZoom: zoom }),
    setGfMsgIndex: (idx) => set({ gfMsgIndex: idx }),
    incrementSteps: (val) => set((state) => ({ steps: state.steps + val })),
    addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
    updateMessage: (id, partial) => set((state) => ({
        messages: state.messages.map(m => m.id === id ? { ...m, ...partial } : m)
    })),
    addDebugLog: (type, detail) => set((state) => {
        const ts = new Date().toISOString().split('T')[1].slice(0, 8);
        const newLog = { id: Math.random().toString(36).substr(2, 9), ts, type, detail };
        // Chronological order: latest at the bottom
        return { debugLogs: [...state.debugLogs, newLog].slice(-50) };
    }),
    clearDebugLogs: () => set({ debugLogs: [] }),
    setShowDebugPanel: (show: boolean) => set({ showDebugPanel: show }),
    triggerTTS: (id, text, imageUrl, images) => set({ currentTTS: { id, text, imageUrl, images } }),
    clearTTS: () => set({ currentTTS: null }),
}));
