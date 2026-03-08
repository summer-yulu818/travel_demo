import { useEffect, useState } from 'react';
import { useTourStore } from '../store/useTourStore';

export default function TopBar() {
    const { currentLocId, currentLoc, setLocId } = useTourStore();
    const [timeStr, setTimeStr] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const n = new Date();
            setTimeStr(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
        };
        updateTime();
        const iv = setInterval(updateTime, 30000);
        return () => clearInterval(iv);
    }, []);

    return (
        <div className="flex flex-col w-full relative z-20 bg-white/80 backdrop-blur-md pb-3 rounded-b-xl shadow-sm">
            <div className="flex justify-between items-center px-4 pt-14 pb-3 h-20 text-[13px] font-semibold">
                <div className="flex items-center space-x-2">
                    <span>{timeStr}</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
                    <select
                        value={currentLocId}
                        onChange={(e) => setLocId(e.target.value)}
                        className="bg-transparent border-none outline-none text-blue-800 font-bold text-[13px] text-center"
                    >
                        <option value="westlake">西湖</option>
                        <option value="gugong">故宫</option>
                        <option value="antspace">蚂蚁空间</option>
                    </select>
                </div>
                <div className="flex items-center space-x-1 text-gray-500 text-[11px]">
                    <span>☀️ 22°</span>
                    <div className="w-5 h-2.5 border border-gray-400 rounded-[3px] p-[1px] relative flex items-center">
                        <div className="h-full bg-green-500 rounded-[1px] w-[80%]"></div>
                        <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] bg-gray-400 rounded-r-sm"></div>
                    </div>
                </div>
            </div>

            <GeofenceBar />
        </div>
    );
}

function GeofenceBar() {
    const { currentLoc, gfMsgIndex, setGfMsgIndex } = useTourStore();
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
            <div className="flex-1 overflow-hidden relative h-5 leading-5 pl-3 cursor-pointer text-blue-700 opacity-90">
                {messages.length > 0 ? (
                    <div className="absolute w-full transition-transform duration-500 ease-in-out whitespace-nowrap">
                        {messages[useTourStore.getState().gfMsgIndex]?.text || messages[0]?.text}
                    </div>
                ) : (
                    <span className="text-gray-400">当前区域无特殊活动</span>
                )}
            </div>
        </div>
    );
}
