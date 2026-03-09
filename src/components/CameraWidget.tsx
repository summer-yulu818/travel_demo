import { useState, useRef, useEffect } from 'react';
import { useTourStore } from '../store/useTourStore';
import { useVisionMatch } from '../hooks/useVisionMatch';
import { useVisionScanner } from '../hooks/useVisionScanner';
import { VISION_CONFIG } from '../config/constants';

export default function CameraWidget() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { cameraActive, setCameraActive, isVisionActive, setVisionActive, currentLocId, currentLoc, setUserPos, triggerTTS, addMessage, enableCloudVision, avatarPaused, avatarTalking, addDebugLog } = useTourStore();
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const floatRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: 16, y: 16 }); // Initial top-4 left-4 position

    // Handle dragging
    useEffect(() => {
        const el = floatRef.current;
        if (!el) return;

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const onPointerDown = (e: PointerEvent) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            isDragging = true;
            offsetX = e.clientX - pos.x;
            offsetY = e.clientY - pos.y;
            el.setPointerCapture(e.pointerId);
            el.style.transform = 'scale(1.02)';
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
            el.style.transform = 'none';
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

    useEffect(() => {
        if (cameraActive || isVisionActive) {
            startCamera();
        } else {
            stopCamera();
        }
        return stopCamera;
    }, [cameraActive, isVisionActive, facingMode]);

    const startCamera = async () => {
        stopCamera();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (e) {
            console.warn('Camera failed:', e);
            // Fallback for desktop simulators without webcam gracefully
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const { modelReady, matchFromVideo } = useVisionMatch({ matchThreshold: VISION_CONFIG.MATCH_THRESHOLD, matchCount: 1, engine: 'mediapipe' });

    useVisionScanner({
        appMode: 'normal',
        isPlaying: !avatarPaused, // Only run scanner when digital human is active
        modelReady,
        isVisionActive: isVisionActive || cameraActive,
        selectedScenicId: currentLocId,
        enableLocationFilter: false,
        userLocation: null,
        activePOIs: currentLoc.poiData || [],
        isTyping: avatarTalking,
        matchFromVideo: async (video, id, ids) => await matchFromVideo(video, id, ids),
        addDebugLog: (type, text) => {
            console.log(`[Vision ${type}] ${text}`);
            addDebugLog(type, text);
        },
        currentPoiIndex: -1,
        enableCloudVision: enableCloudVision,
        onMatch: (index) => {
            const poi = currentLoc.poiData[index];
            if (poi && !avatarPaused) {
                setUserPos(poi.position);
                const msgId = `bot-poi-${Date.now()}`;
                addMessage({ id: msgId, sender: 'bot', text: '' });
                triggerTTS(msgId, poi.narration.replace(/哦|呢|啦/g, ''), poi.image, poi.images);
            }
        }
    });

    if (!cameraActive && !isVisionActive) return null;

    return (
        <div
            ref={floatRef}
            className="fixed w-28 h-36 bg-black rounded-lg overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-600 z-50 transition-shadow cursor-grab active:cursor-grabbing touch-none"
            style={{ left: pos.x, top: pos.y }}
        >
            <video
                id="tour-camera-video"
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover pointer-events-none"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            ></video>
            <div className="absolute inset-x-0 bottom-2 flex justify-center space-x-3">
                <button
                    onClick={async () => {
                        const btn = document.querySelector('.snap-btn');
                        btn?.classList.add('scale-90');
                        setTimeout(() => btn?.classList.remove('scale-90'), 150);

                        if (!videoRef.current) return;

                        // 1. 抓取视频帧转为 Base64 (压缩处理)
                        let rawWidth = videoRef.current.videoWidth;
                        let rawHeight = videoRef.current.videoHeight;

                        // [Fix] 兜底处理无摄像头/模拟器环境
                        let isMock = false;
                        if (rawWidth === 0 || rawHeight === 0) {
                            rawWidth = 256;
                            rawHeight = 256;
                            isMock = true;
                        }

                        const MAX_SIZE = 512;
                        let scale = 1;
                        if (rawWidth > MAX_SIZE || rawHeight > MAX_SIZE) {
                            scale = Math.min(MAX_SIZE / rawWidth, MAX_SIZE / rawHeight);
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = rawWidth * scale;
                        canvas.height = rawHeight * scale;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        if (isMock) {
                            // 渲染一张模拟图提供给大模型
                            ctx.fillStyle = '#0f172a';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.fillStyle = '#f8fafc';
                            ctx.font = '20px sans-serif';
                            ctx.fillText('电脑模拟器无摄像头', 20, 100);
                        } else {
                            if (facingMode === 'user') {
                                ctx.translate(canvas.width, 0);
                                ctx.scale(-1, 1);
                            }
                            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                        }

                        const base64Img = canvas.toDataURL('image/jpeg', 0.6);

                        // 2. 先把照片发入公屏
                        const { addMessage, updateMessage, currentLoc, setCameraActive } = useTourStore.getState();
                        setCameraActive(false); // 拍完关闭摄像头

                        addMessage({ id: `msg-${Date.now()}-img`, sender: 'user', text: '帮你拍了张照，帮我看看！', imageUrl: base64Img });

                        // 3. 产生一个加载等待气泡
                        const botMsgId = `msg-${Date.now()}`;
                        addMessage({ id: botMsgId, sender: 'bot', text: '让我看看你拍的画面...', isTyping: true });

                        // 4. 调用视觉大模型
                        import('../services/llm').then(async ({ analyzeImage }) => {
                            try {
                                const activePois = currentLoc.poiData?.map((p: any) => p.name).join('、') || '暂无';
                                const currentLocId = currentLoc.scenicArea.id; // Assuming currentLocId is available or can be derived
                                const systemPrompt = `你是一个智能伴游助理。当前游客位于【${currentLoc.scenicArea.name}】(${currentLocId})。
你的名字叫小溪（如果是故宫叫小故，黄山叫小黄，蚂蚁空间叫小游）。
当前景区内有效的景点列表为：【${activePois}】。
请仅针对上述有效景点进行介绍和回答。如果用户问及不在列表中的景点，请礼貌地告知该景点当前不可见或不属于本次导览范围。
请用自然亲和、导游的口吻回答问题，保持人文风格，适当使用颜文字，回答尽量简短精要。`;
                                const prompt = `${systemPrompt}
游客刚拍了一张照片给你看。请你用自然活泼、亲密导游的口语识别照片里的物体或风景。
注意：如果识别结果属于上述有效景点列表，请详细介绍；如果不属于该列表（可能是已下架景点或无关物体），请不要将其识别为列表中的景点，而是如实描述并在必要时幽默调侃。评价简短（1-2句即可）。`;
                                const reply = await analyzeImage(base64Img, prompt);
                                updateMessage(botMsgId, { text: reply, isTyping: false });
                            } catch (e) {
                                console.error(e);
                                updateMessage(botMsgId, { text: '哎呀，我没戴眼镜（网络错误），没看清这张照片。', isTyping: false });
                            }
                        });
                    }}
                    className="snap-btn w-10 h-10 border-2 border-white rounded-full bg-white/30 backdrop-blur-sm transition-transform shadow-md"
                    disabled={isVisionActive && !cameraActive}
                    style={{ opacity: isVisionActive && !cameraActive ? 0.3 : 1 }}
                ></button>
            </div>
            <button
                className="absolute top-1 right-1 w-6 h-6 bg-black/40 text-white rounded-full flex items-center justify-center text-xs"
                onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
            >
                🔄
            </button>
            <div className="absolute bottom-1 left-2 text-[10px] text-white/80 bg-black/40 px-1 rounded">📸 取景</div>
        </div>
    );
}
