import { useState, useRef, useEffect } from 'react';
import { useTourStore } from '../store/useTourStore';

export default function CameraWidget() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { cameraActive, setCameraActive } = useTourStore();
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    useEffect(() => {
        if (cameraActive) {
            startCamera();
        } else {
            stopCamera();
        }
        return stopCamera;
    }, [cameraActive, facingMode]);

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

    if (!cameraActive) return null;

    return (
        <div className="absolute top-4 left-4 w-28 h-36 bg-black rounded-lg overflow-hidden shadow-lg border border-gray-600 z-30">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
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
                                const prompt = `你现在是智能伴游导游小溪，游客处于景点【${currentLoc.scenicArea.name}】。游客刚拍了一张照片给你看。请你用自然活泼、亲密导游的口语识别照片里的关键物体或风景，并给出简短评价（1-2句即可，如果发现照片里明显不是风景而是人或室内物品，也可以幽默地调侃一下）。`;
                                const reply = await analyzeImage(base64Img, prompt);
                                updateMessage(botMsgId, { text: reply, isTyping: false });
                            } catch (e) {
                                console.error(e);
                                updateMessage(botMsgId, { text: '哎呀，我没戴眼镜（网络错误），没看清这张照片。', isTyping: false });
                            }
                        });
                    }}
                    className="snap-btn w-10 h-10 border-2 border-white rounded-full bg-white/30 backdrop-blur-sm transition-transform shadow-md"
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
