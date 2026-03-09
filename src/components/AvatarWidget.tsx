import { useEffect, useRef, useState } from 'react';
import { useTourStore } from '../store/useTourStore';

export default function AvatarWidget() {
    const { currentLocId, currentLoc, avatarPaused, setAvatarPaused, avatarTalking } = useTourStore();
    const guide = currentLoc.guide;
    const floatRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: window.innerWidth > 430 ? 320 : window.innerWidth - 100, y: 120 });

    useEffect(() => {
        const el = floatRef.current;
        if (!el) return;

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const onPointerDown = (e: PointerEvent) => {
            // 不妨碍点击按钮
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            isDragging = true;
            offsetX = e.clientX - pos.x;
            offsetY = e.clientY - pos.y;
            el.setPointerCapture(e.pointerId);
            el.style.transform = 'scale(1.05)';
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDragging) return;
            setPos({
                x: e.clientX - offsetX,
                y: e.clientY - offsetY,
            });
        };

        const onPointerUp = (e: PointerEvent) => {
            isDragging = false;
            el.releasePointerCapture(e.pointerId);
            el.style.transform = 'scale(1)';
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);

        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
        };
    }, [pos.x, pos.y]);

    // 头像样式与动画
    const containerClass = `absolute z-50 flex flex-col items-center justify-center transition-opacity duration-300 w-[90px] h-[90px] touch-none select-none`;
    const ringClass = `absolute inset-0 rounded-full border-2 ${avatarPaused ? 'border-gray-300' : 'border-blue-400 rotate-ring'}`;
    const statusLabel = avatarPaused ? '已暂停' : '数字人导览中';

    return (
        <div
            ref={floatRef}
            className={containerClass}
            style={{ left: pos.x, top: pos.y, cursor: 'grab' }}
        >
            {/* 操作按钮 */}
            <button
                onClick={() => setAvatarPaused(!avatarPaused)}
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center text-sm z-10 
                   hover:scale-110 active:scale-95 transition-transform border border-gray-100"
            >
                {avatarPaused ? '▶️' : '🔄'}
            </button>

            {/* 外部呼吸光环 (仅在导览+说话时展示强烈呼吸) */}
            {!avatarPaused && (
                <div className={`absolute -inset-2 rounded-full border border-blue-300 ${avatarTalking ? 'animate-ping' : ''} opacity-30`}></div>
            )}

            {/* 旋转的光圈边缘 */}
            <div className={ringClass}></div>

            {/* 顶部标签 */}
            {!avatarPaused && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm z-20">
                    {statusLabel}
                </div>
            )}

            {/* 头像本体区域 */}
            <div className="w-[82px] h-[82px] rounded-full overflow-hidden bg-gradient-to-b from-blue-50 to-blue-200 relative flex items-center justify-center shadow-inner">
                {guide.avatarUrl ? (
                    <img
                        src={guide.avatarUrl}
                        alt={guide.name}
                        className={`w-full h-full object-cover ${avatarTalking ? 'scale-110' : 'scale-100'} transition-transform duration-500`}
                    />
                ) : guide.id === 'xiaohuang' ? (
                    <img
                        src="/xiaohuang_avatar.png"
                        alt="小黄"
                        className={`w-full h-full object-cover ${avatarTalking ? 'scale-110' : 'scale-100'} transition-transform duration-500`}
                    />
                ) : guide.id === 'xiaoxi' ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="w-[38px] h-[34px] bg-[#ffe0cd] rounded-b-[20px] rounded-t-[16px] z-10 relative">
                            <div className="absolute top-[14px] left-[6px] w-[5px] h-[5px] bg-[#4a3b32] rounded-full"></div>
                            <div className="absolute top-[14px] right-[6px] w-[5px] h-[5px] bg-[#4a3b32] rounded-full"></div>
                            <div className="absolute top-[22px] left-1/2 -translate-x-1/2 w-[6px] h-[3px] bg-[#ff7b7b] rounded-full"></div>
                        </div>
                        {/* 简单发型占位 */}
                        <div className="absolute top-[12px] w-[46px] h-[20px] bg-[#2c221e] rounded-t-[20px] z-20"></div>
                    </div>
                ) : guide.id === 'xiaogu' ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="w-[38px] h-[34px] bg-[#ffe0cd] rounded-b-[20px] rounded-t-[16px] z-10 relative"></div>
                        <div className="absolute top-[8px] w-[50px] h-[22px] bg-[#2c221e] rounded-t-[25px] z-20"></div>
                    </div>
                ) : guide.id === 'xiaoyou' ? (
                    <div className="text-4xl">🧑‍🚀</div>
                ) : (
                    <div className="text-4xl">👤</div>
                )}
            </div>

            {/* 名字标签 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[11px] px-3 py-0.5 rounded-full shadow-md whitespace-nowrap z-20">
                {guide.name}
            </div>

            <div className="absolute -bottom-6 text-[10px] text-gray-500 font-medium tracking-widest flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${avatarPaused ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                {avatarPaused ? '已暂停' : '在线'}
            </div>
        </div>
    );
}
