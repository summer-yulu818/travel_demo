import { useEffect, useState, useRef } from 'react';
import TopBar from './components/TopBar';
import MapLayer from './components/MapLayer';
import ChatBox from './components/ChatBox';
import AvatarWidget from './components/AvatarWidget';
import CameraWidget from './components/CameraWidget';
import { useTourStore } from './store/useTourStore';

export default function App() {
    const [showSplash, setShowSplash] = useState(true);
    const { currentLocId, currentLoc, avatarPaused, setAvatarPaused, setUserPos, addMessage, triggerTTS } = useTourStore();
    const tourRef = useRef<boolean>(false);
    const lockRef = useRef<boolean>(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    // 手动导览监控器（启动模式时提示点击）
    useEffect(() => {
        if (avatarPaused || !currentLoc.poiData) return;

        const welcomeId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        addMessage({ id: welcomeId, sender: 'bot', text: '' });
        triggerTTS(welcomeId, `导览已启动！我是您的专属智能伴游 ${currentLoc.guide.name}，请点击地图上的景点，我将为您详细解说。`);
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
            <div className="relative h-[50%] bg-blue-50 overflow-hidden shrink-0">
                <MapLayer />
                <CameraWidget />
            </div>

            {/* 聊天会话区 (下半部) */}
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] relative z-10 -mt-4">
                <ChatBox />
            </div>

            {/* 侧边数字人挂件 */}
            <AvatarWidget />
        </div>
    );
}
