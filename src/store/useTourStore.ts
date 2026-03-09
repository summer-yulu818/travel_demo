import { create } from 'zustand';
// @ts-ignore
import { locations as staticLocations } from '../data/scenic-data';
import { fetchScenicData, ScenicLocation } from '../services/scenicService';

type Point = { x: number; y: number };

export type Message = {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    imageUrl?: string;
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
    gfMsgIndex: number;
    steps: number;
    messages: Message[];
    currentTTS: { id: string; text: string; imageUrl?: string } | null;

    // Actions
    setLocId: (id: string) => Promise<void>;
    setUserPos: (pos: Point) => void;
    setAvatarPaused: (paused: boolean) => void;
    setAvatarTalking: (talking: boolean) => void;
    setSimRunning: (running: boolean) => void;
    setCameraActive: (active: boolean) => void;
    setGfMsgIndex: (idx: number) => void;
    incrementSteps: (val: number) => void;
    addMessage: (msg: Message) => void;
    updateMessage: (id: string, partial: Partial<Message>) => void;
    triggerTTS: (id: string, text: string, imageUrl?: string) => void;
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
    gfMsgIndex: 0,
    steps: 0,
    messages: [{ id: 'init', sender: 'bot', text: '欢迎来到AI伴游！我是您的专属智能导游。' }],
    currentTTS: null,

    setLocId: async (id) => {
        // 1. Check static
        if (staticLocations[id]) {
            const loc = staticLocations[id];
            set({
                currentLocId: id,
                currentLoc: loc,
                userPos: loc.poiData[0]?.position || { x: 0.5, y: 0.5 }
            });
            return;
        }

        // 2. Check dynamic cache
        const { dynamicLocations } = get();
        if (dynamicLocations[id]) {
            const loc = dynamicLocations[id];
            set({
                currentLocId: id,
                currentLoc: loc,
                userPos: loc.poiData[0]?.position || { x: 0.5, y: 0.5 }
            });
            return;
        }

        // 3. Fetch from DB
        const locData = await fetchScenicData(id);
        if (locData) {
            (locData as any).walkPath = buildPath(locData.poiData);
            set((state) => ({
                currentLocId: id,
                currentLoc: locData,
                dynamicLocations: { ...state.dynamicLocations, [id]: locData },
                userPos: locData.poiData[0]?.position || { x: 0.5, y: 0.5 }
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
    setGfMsgIndex: (idx) => set({ gfMsgIndex: idx }),
    incrementSteps: (val) => set((state) => ({ steps: state.steps + val })),
    addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
    updateMessage: (id, partial) => set((state) => ({
        messages: state.messages.map(m => m.id === id ? { ...m, ...partial } : m)
    })),
    triggerTTS: (id, text, imageUrl) => set({ currentTTS: { id, text, imageUrl } }),
    clearTTS: () => set({ currentTTS: null }),
}));
