import { useEffect, useState, useRef } from 'react';
import TopBar from './components/TopBar';
import MapLayer from './components/MapLayer';
import ChatBox from './components/ChatBox';
import AvatarWidget from './components/AvatarWidget';
import CameraWidget from './components/CameraWidget';
import { useTourStore } from './store/useTourStore';

export default function App() {
    const [showSplash, setShowSplash] = useState(true);
    const { currentLocId, currentLoc, avatarPaused, setAvatarPaused, setUserPos, addMessage, triggerTTS, setCameraActive } = useTourStore();
    const tourRef = useRef<boolean>(false);
    const lockRef = useRef<boolean>(false);
    const welcomeSentRef = useRef<string>(''); // Guard against StrictMode double-fire

    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    // 手动导览监控器（启动模式时提示点击）
    useEffect(() => {
        if (avatarPaused || !currentLoc.poiData) return;

        // Prevent duplicate welcome messages (React StrictMode double-fire)
        const welcomeKey = `${avatarPaused}-${currentLocId}`;
        if (welcomeSentRef.current === welcomeKey) return;
        welcomeSentRef.current = welcomeKey;

        // Auto-enable camera when the tour is unpaused and active
        setCameraActive(true);

        const welcomeId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        addMessage({ id: welcomeId, sender: 'bot', text: '' });
        triggerTTS(welcomeId, `导览已启动！我是您的专属智能伴游 ${currentLoc.guide.name}。我已经为您开启了环境感知之眼 👀。强烈建议您戴上AI智能眼镜，即刻开启这场打破次元壁的沉浸式旅行体验！沿途看到感兴趣的风景，都可以随时问我哦~`);
    }, [avatarPaused, currentLocId]);

    if (showSplash) {
        return (
            <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center transition-opacity duration-500">
                <div className="text-4xl font-bold text-blue-600 mb-4 tracking-wider">AI伴游</div>
                <div className="text-gray-500 text-sm mb-8 tracking-widest">随时随地 · 陪你看世界</div>
                <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300 w-full animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-blue-50 relative overflow-hidden">
            {/* 顶部控制栏 */}
            <TopBar />

            {/* 地图交互区 (上半部) */}
            <div className="relative h-[35%] bg-blue-50 overflow-hidden shrink-0">
                <MapLayer />
                <CameraWidget />
            </div>

            {/* 聊天会话区 (下半部) */}
            <div
                className="flex-1 min-h-0 flex flex-col bg-transparent relative z-10 px-8 pb-2"
                style={{ marginTop: '-20px' }}
            >
                <div className="flex-1 flex flex-col bg-white rounded-t-[32px] rounded-b-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* 顶部中央的小横条 (Drag Handle) */}
                    <div className="w-full h-8 shrink-0 flex items-center justify-center relative bg-white z-20">
                        <div className="w-10 h-1.5 bg-gray-300/60 rounded-full"></div>
                    </div>

                    <div className="flex-1 min-h-0 relative z-10 bg-[#f4f6f9]">
                        <ChatBox />
                    </div>
                </div>
            </div>

            {/* 侧边数字人挂件 */}
            <AvatarWidget />
        </div>
    );
}
