import { useEffect, useState, useRef } from 'react';
import { useTourStore } from '../store/useTourStore';
import { Camera, Settings } from 'lucide-react';

export default function TopBar() {
    const {
        currentLocId, currentLoc, setLocId,
        isVisionActive, setVisionActive,
        enablePosSimulation, setEnablePosSimulation,
        enableCloudVision, setEnableCloudVision,
        useAMap, setUseAMap,
        mapZoom, setMapZoom,
        showDebugPanel, setShowDebugPanel
    } = useTourStore();

    const [timeStr, setTimeStr] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateTime = () => {
            const n = new Date();
            setTimeStr(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
        };
        updateTime();
        const iv = setInterval(updateTime, 30000);
        return () => clearInterval(iv);
    }, []);

    // Close settings if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col w-full relative z-20 bg-white/80 backdrop-blur-md pb-2 rounded-b-xl shadow-sm">
            <div className="flex justify-between items-center px-4 pt-4 pb-1 text-[13px] font-semibold">
                <div className="flex items-center space-x-2">
                    <span>{timeStr}</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
                    <select
                        value={currentLocId}
                        onChange={async (e) => {
                            const newId = e.target.value;
                            await setLocId(newId);
                        }}
                        className="bg-transparent border-none outline-none text-blue-800 font-bold text-[13px] text-center"
                    >
                        <option value="westlake">西湖</option>
                        <option value="gugong">故宫</option>
                        <option value="huangshan">黄山</option>
                        <option value="antspace">蚂蚁空间</option>
                    </select>
                </div>
                <div className="flex items-center space-x-2 text-gray-500 text-[11px] relative" ref={settingsRef}>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-1.5 rounded-full transition-colors shadow-sm ${showSettings ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        title="设置"
                    >
                        <Settings size={14} />
                    </button>
                    <button
                        onClick={() => setVisionActive(!isVisionActive)}
                        className={`p-1.5 rounded-full transition-colors shadow-sm ${isVisionActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        title={isVisionActive ? "关闭实景扫描" : "开启实景扫描"}
                    >
                        <Camera size={14} className={isVisionActive ? 'animate-pulse' : ''} />
                    </button>
                    <span>☀️ 22°</span>
                    <div className="w-5 h-2.5 border border-gray-400 rounded-[3px] p-[1px] relative flex items-center">
                        <div className="h-full bg-green-500 rounded-[1px] w-[80%]"></div>
                        <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] bg-gray-400 rounded-r-sm"></div>
                    </div>

                    {/* Settings Dropdown */}
                    {showSettings && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex flex-col gap-3 font-normal text-gray-700 z-[9999]">
                            <label className="flex items-center justify-between cursor-pointer">
                                <span>使用高德地图</span>
                                <div className="relative inline-block w-8 h-4">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={useAMap}
                                        onChange={() => setUseAMap(!useAMap)}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                </div>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span>启用坐标模拟</span>
                                <div className="relative inline-block w-8 h-4">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={enablePosSimulation}
                                        onChange={() => setEnablePosSimulation(!enablePosSimulation)}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                </div>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span>使用云端图像识别</span>
                                <div className="relative inline-block w-8 h-4">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={enableCloudVision}
                                        onChange={() => setEnableCloudVision(!enableCloudVision)}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                </div>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span>显示Debug视窗</span>
                                <div className="relative inline-block w-8 h-4">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={showDebugPanel}
                                        onChange={() => setShowDebugPanel(!showDebugPanel)}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                </div>
                            </label>
                            <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100/50">
                                <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium">
                                    <span>地图比例尺 (Zoom)</span>
                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{mapZoom}</span>
                                </div>
                                <input
                                    type="range"
                                    min="3"
                                    max="20"
                                    step="1"
                                    value={mapZoom}
                                    onChange={(e) => setMapZoom(Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <GeofenceBar />
        </div>
    );
}

function GeofenceBar() {
    const { currentLoc, gfMsgIndex, setGfMsgIndex, triggerTTS, addMessage, avatarPaused } = useTourStore();
    const area = currentLoc.scenicArea;
    const messages = currentLoc.geofenceMessages || [];

    useEffect(() => {
        if (messages.length <= 1) return;
        const iv = setInterval(() => {
            setGfMsgIndex((useTourStore.getState().gfMsgIndex + 1) % messages.length);
        }, 4000);
        return () => clearInterval(iv);
    }, [messages.length, setGfMsgIndex]);

    if (!area.geofence) return null; // 比如蚂蚁空间无围栏

    const isHot = area.heatLevel >= 4;

    return (
        <div className="mx-3 mt-1.5 px-4 py-2.5 bg-blue-50/90 backdrop-blur-md rounded-xl text-[12px] flex items-center text-gray-700 shadow-sm border border-blue-100/50">
            <div className="flex items-center whitespace-nowrap pr-3 font-medium">
                <span className="mr-1">👥</span>
                <span className="font-semibold text-blue-700">{area.visitors.toLocaleString()}人</span>
            </div>
            <div className="flex items-center pr-3 border-r border-blue-200/60 h-4 space-x-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`text-xs ${i < area.heatLevel ? (isHot ? 'text-orange-500 drop-shadow-sm' : 'text-blue-500') : 'text-gray-300'}`}>
                        🔥
                    </span>
                ))}
            </div>
            <div
                className="flex-1 overflow-hidden relative h-5 leading-5 pl-3 cursor-pointer text-blue-700 opacity-90 hover:text-blue-800 active:scale-95 transition-all group"
                onClick={() => {
                    if (avatarPaused) return;
                    const msg = messages[gfMsgIndex] || messages[0];
                    if (msg) {
                        const userMsgId = `promo-usr-${Date.now()}`;
                        addMessage({ id: userMsgId, sender: 'user', text: `请问【${area.name}】现在有什么优惠活动吗？` });

                        const botMsgId = `promo-bot-${Date.now()}`;
                        addMessage({ id: botMsgId, sender: 'bot', text: '' });

                        const fullText = `为您找到以下优惠活动：\n\n【${msg.text}】\n${msg.detail}`;
                        triggerTTS(botMsgId, fullText);
                    }
                }}
            >
                {messages.length > 0 ? (
                    <div className="absolute w-full transition-transform duration-500 ease-in-out whitespace-nowrap group-hover:underline decoration-blue-300 decoration-2 underline-offset-4">
                        {messages[gfMsgIndex]?.text || messages[0]?.text}
                    </div>
                ) : (
                    <span className="text-gray-400">当前区域无特殊活动</span>
                )}
            </div>
        </div>
    );
}
