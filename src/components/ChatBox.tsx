import { useEffect, useRef, useState } from 'react';
import { useTourStore, Message } from '../store/useTourStore';
import { streamChat, analyzeImage, ChatMessage } from '../services/llm';

export default function ChatBox() {
    const { currentLocId, currentLoc, messages, debugLogs, isVisionActive, showDebugPanel, setShowDebugPanel, addMessage, updateMessage, addDebugLog, avatarPaused, cameraActive, setCameraActive, currentTTS, clearTTS, setAvatarTalking, pendingImage, setPendingImage } = useTourStore();
    const msgsRef = useRef<HTMLDivElement>(null);
    const debugMsgsRef = useRef<HTMLDivElement>(null);
    const [inputText, setInputText] = useState('');
    const [isTypingObj, setIsTypingObj] = useState<string | null>(null); // Current typing message ID
    const isTypingObjRef = useRef<string | null>(null);

    // Auto scroll
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (msgsRef.current) {
                msgsRef.current.scrollTo({
                    top: msgsRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 50);
        return () => clearTimeout(timeout);
    }, [messages, isTypingObj]);

    // Auto scroll debug logs
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (debugMsgsRef.current) {
                debugMsgsRef.current.scrollTo({
                    top: debugMsgsRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 50);
        return () => clearTimeout(timeout);
    }, [debugLogs]);

    // Listen to Tour Engine TTS Triggers
    useEffect(() => {
        if (currentTTS) {
            speakAndType(currentTTS.id, currentTTS.text, currentTTS.imageUrl, currentTTS.images);
            clearTTS();
        }
    }, [currentTTS]);

    const speakAndType = (msgId: string, fullText: string, imageUrl?: string, images?: string[]) => {
        window.speechSynthesis.cancel();

        // 1. 文字打字机渲染
        let charIdx = 0;
        updateMessage(msgId, { text: '', isTyping: true, images });
        setIsTypingObj(msgId);
        isTypingObjRef.current = msgId;
        setAvatarTalking(true);

        const typeInterval = setInterval(() => {
            if (isTypingObjRef.current !== msgId) {
                clearInterval(typeInterval);
                setAvatarTalking(false);
                return;
            }

            if (charIdx < fullText.length) {
                const currentT = fullText.slice(0, charIdx + 1);
                updateMessage(msgId, { text: currentT });
                charIdx++;
            } else {
                clearInterval(typeInterval);
                setIsTypingObj(null);
                isTypingObjRef.current = null;
                updateMessage(msgId, { isTyping: false });
                setAvatarTalking(false);
                if (imageUrl) updateMessage(msgId, { imageUrl });
                if (images) updateMessage(msgId, { images });
            }
        }, 60); // Faster for natural feel

        // 2. 异步处理 TTS 语音，不阻塞文字 UI
        const utter = new SpeechSynthesisUtterance(fullText);
        utter.lang = 'zh-CN';
        utter.rate = 1.0;
        utter.pitch = 1.0;

        utter.onend = () => {
            setAvatarTalking(false);
            if (imageUrl) {
                updateMessage(msgId, { imageUrl, isTyping: false }); // Fallback assure
            }
        };

        const trySpeak = () => {
            const vList = window.speechSynthesis.getVoices();
            const v = vList.find(v => v.lang === 'zh-CN' && (v.name.includes('Xiaoxiao') || v.name.includes('Tingting') || v.name.includes('Lili'))) || vList.find(v => v.lang.includes('zh'));
            if (v) utter.voice = v;
            window.speechSynthesis.speak(utter);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            trySpeak();
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                trySpeak();
                window.speechSynthesis.onvoiceschanged = null;
            };
        }
    };

    const llmBotReply = async (userText: string) => {
        const id = `bot-reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        addMessage({ id, sender: 'bot', text: '', isTyping: true });
        setAvatarTalking(true);
        setIsTypingObj(id);
        isTypingObjRef.current = id;

        const activePois = currentLoc.poiData?.map((p: any) => p.name).join('、') || '暂无';
        const systemPrompt = `你是一个智能伴游助理。当前游客位于【${currentLoc.scenicArea.name}】(${currentLocId})。你的名字叫小溪（如果是故宫叫小故，蚂蚁空间叫小游）。请用自然亲和、导游的口吻回答问题，保持人文风格，适当使用颜文字，回答尽量简短精要。`;
        const history: ChatMessage[] = messages.slice(-4).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
        }));

        const chatContext: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: userText }
        ];

        let accumulated = '';

        await streamChat(chatContext,
            (chunk: string) => {
                if (isTypingObjRef.current !== id) return;
                accumulated += chunk;
                updateMessage(id, { text: accumulated });
            },
            () => {
                if (isTypingObjRef.current === id) {
                    updateMessage(id, { isTyping: false });
                    setIsTypingObj(null);
                    isTypingObjRef.current = null;
                    setAvatarTalking(false);
                    // 结束后播放合成语音 (如果需要，可开启)
                    // window.speechSynthesis.speak(new SpeechSynthesisUtterance(accumulated));
                }
            },
            (err: any) => {
                console.error(err);
                updateMessage(id, { text: accumulated + ' (网络请求出错，请重试)', isTyping: false });
                setIsTypingObj(null);
                isTypingObjRef.current = null;
                setAvatarTalking(false);
            }
        );
    };

    const handleSend = () => {
        const hasText = inputText.trim().length > 0;
        let imageToSend = pendingImage;
        const hasImage = !!pendingImage;
        
        // If camera is active and user didn't manually snap a photo, auto-capture one
        if (cameraActive && !hasImage) {
            const videoEl = document.getElementById('tour-camera-video') as HTMLVideoElement;
            if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 512;
                let scale = 1;
                if (videoEl.videoWidth > MAX_SIZE || videoEl.videoHeight > MAX_SIZE) {
                    scale = Math.min(MAX_SIZE / videoEl.videoWidth, MAX_SIZE / videoEl.videoHeight);
                }
                canvas.width = videoEl.videoWidth * scale;
                canvas.height = videoEl.videoHeight * scale;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                    imageToSend = canvas.toDataURL('image/jpeg', 0.6);
                }
            } else {
                 // Fallback for mock environment
                 const canvas = document.createElement('canvas');
                 canvas.width = 256; canvas.height = 256;
                 const ctx = canvas.getContext('2d');
                 if(ctx) {
                      ctx.fillStyle = '#0f172a';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.fillStyle = '#f8fafc';
                      ctx.font = '20px sans-serif';
                      ctx.fillText('电脑模拟器无摄像头', 20, 100);
                      imageToSend = canvas.toDataURL('image/jpeg', 0.6);
                 }
            }
        }

        // Must have at least text or image to send
        if (!hasText && !imageToSend) return;

        const txt = hasText ? inputText.trim() : '帮我看看这张照片';
        // Only send image if user has explicitly attached one (pendingImage) OR auto-captured AND typed no text,
        // OR if they typed text AND have a pending/auto image — both cases use vision reply
        
        addMessage({ id: `user-msg-${Date.now()}`, sender: 'user', text: txt, imageUrl: imageToSend || undefined });
        setInputText('');
        setPendingImage(null);
        if (cameraActive) setCameraActive(false);

        if (imageToSend) {
            // Image attached: use vision model
            visionBotReply(txt, imageToSend);
        } else {
            // Text only: use regular LLM
            llmBotReply(txt);
        }
    };

    const visionBotReply = async (userText: string, base64Img: string) => {
        const botMsgId = `bot-vision-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        addMessage({ id: botMsgId, sender: 'bot', text: '让我看看...', isTyping: true });
        setAvatarTalking(true);

        try {
            const systemPrompt = `你是一个智能伴游助理。当前游客位于【${currentLoc.scenicArea.name}】(${currentLocId})。你的名字叫小溪（如果是故宫叫小故，蚂蚁空间叫小游）。请用自然亲和、导游的口吻回答问题，保持人文风格，适当使用颜文字，回答尽量简短精要。`;
            const prompt = `${systemPrompt}\n游客拍了一张照片并说：「${userText}」。请根据照片内容和用户的文字来回答。如果用户只是说"帮我看看"，就识别照片里的物体或风景并介绍。评价简短精要。`;
            addDebugLog('vision', `发起图片识别，base64长度=${base64Img.length}`);
            const reply = await analyzeImage(base64Img, prompt);
            addDebugLog('vision', `识别成功: ${reply.substring(0, 80)}`);
            updateMessage(botMsgId, { text: reply, isTyping: false });
        } catch (e: any) {
            const errMsg = e?.message || String(e);
            console.error('Vision Error:', e);
            addDebugLog('vision-error', `识别失败: ${errMsg}`);
            // Fallback to text-only LLM reply so user still gets a response
            const fallbackMsg = `抱歉，图片识别暂时不可用（${errMsg}）`;
            updateMessage(botMsgId, { text: fallbackMsg, isTyping: false });
            // Trigger LLM as fallback
            llmBotReply(userText);
        } finally {
            setAvatarTalking(false);
        }
    };

    const triggerQuickWord = (key: 'route' | 'history' | 'food' | 'photo') => {
        const txtMap = {
            route: '推荐路线', history: '历史故事', food: '美食推荐', photo: '拍照攻略'
        };
        const txt = txtMap[key];
        const scenicName = currentLoc?.scenicArea?.name || '景区';
        addMessage({ id: `user-quick-${Date.now()}`, sender: 'user', text: `请给我一些关于【${scenicName}】的${txt}。` });
        llmBotReply(`请给我一些关于【${scenicName}】的${txt}。`);
    };

    return (
        <div className="flex-1 flex flex-col h-full w-full bg-transparent relative">
            {/* 消息区域 */}
            <div ref={msgsRef} className="flex-1 min-h-0 scroll-smooth overflow-y-auto px-5 pt-2 pb-12 w-full max-w-full mx-auto relative flex flex-col gap-y-4">

                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-2.5`}>
                        {/* Bot Avatar */}
                        {m.sender === 'bot' && (
                            <div className="w-9 h-9 rounded-full bg-white flex-shrink-0 overflow-hidden mt-1 border border-gray-100 shadow-sm flex items-center justify-center">
                                {currentLoc?.guide?.avatarUrl ? (
                                    <img src={currentLoc.guide.avatarUrl} alt={currentLoc.guide.name} className="w-full h-full object-cover" />
                                ) : currentLoc?.guide?.id === 'xiaohuang' ? (
                                    <img src="/xiaohuang_avatar.png" alt="小黄" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#ffe0cd] flex items-center justify-center text-lg">
                                        {currentLoc?.guide?.botIcon || '👩‍💼'}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bot Message Wrapper (To handle source note outside bubble) */}
                        {m.sender === 'bot' ? (
                            <div className="flex flex-col max-w-[88%] relative group">
                                {/* External Source Note (Floating above bubble like screenshot) - ONLY show if there are images */}
                                {!m.isTyping && (m.images && m.images.length > 0 || m.imageUrl) && (
                                    <div className="flex items-center text-[13.5px] text-[#999999] mb-1.5 ml-1">
                                        <span className="text-[#f5c043] mr-0.5 text-[14px]">✨</span>
                                        <span>参考了相关景点资料</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 ml-0.5 mt-0.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                )}

                                {/* Message Bubble with strict screenshot styling */}
                                <div className={`relative bg-white border border-[#f0f0f0] rounded-2xl rounded-tl-sm px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.isTyping ? 'border-l-4 border-blue-500' : ''}`}>

                                    {/* Text content with exact screenshot typography */}
                                    <div className="text-[15px] leading-[1.8] text-[#333333] whitespace-pre-wrap tracking-wide">
                                        {m.text}
                                        {m.isTyping && <span className="inline-block w-1.5 h-4 ml-1.5 align-middle bg-blue-500 animate-pulse"></span>}
                                    </div>

                                    {/* Gallery - images inline */}
                                    {m.images && m.images.length > 0 && (
                                        <div className="mt-3">
                                            <div className="flex items-center mb-2.5 text-[#999999] text-[13.5px]">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                                </svg>
                                                <span>检索到{m.images.length}张相似图片</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {m.images.map((img, idx) => (
                                                    <div key={idx} className="aspect-[4/3] rounded-lg overflow-hidden border border-[#f0f0f0] bg-gray-50 relative group/img">
                                                        <img src={img} alt={`img-${idx}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Single Image fallback */}
                                    {m.imageUrl && !m.images && (
                                        <div className="mt-4 rounded-xl overflow-hidden border border-[#f0f0f0]">
                                            <img src={m.imageUrl} alt="attachment" className="w-full h-auto object-cover max-h-64" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* User Message Bubble */
                            <div className="max-w-[75%] bg-[#ebf3ff] text-[#222222] border border-[#d6e7ff] rounded-2xl rounded-tr-md px-4 py-2.5 text-[15px] leading-relaxed relative animate-in fade-in duration-300 flex flex-col gap-2">
                                {m.imageUrl && (
                                    <img src={m.imageUrl} alt="User attachment" className="w-full h-auto max-h-48 object-cover rounded-lg border border-[#d6e7ff]" />
                                )}
                                <span>{m.text}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 快捷推荐 */}
            <div className="px-6 py-3.5 flex justify-between items-center w-full gap-2.5 bg-transparent shrink-0">
                <button onClick={() => triggerQuickWord('route')} className="flex-1 flex justify-center py-2 px-1 rounded-full bg-white border border-[#e5e5e5] hover:bg-gray-50 text-[13px] text-[#333333] transition-colors items-center space-x-1 shadow-sm active:scale-95">
                    <span className="text-gray-500 text-[14px]">🗺️</span>
                    <span className="whitespace-nowrap">推荐路线</span>
                </button>
                <button onClick={() => triggerQuickWord('history')} className="flex-1 flex justify-center py-2 px-1 rounded-full bg-white border border-[#e5e5e5] hover:bg-gray-50 text-[13px] text-[#333333] transition-colors items-center space-x-1 shadow-sm active:scale-95">
                    <span className="text-gray-500 text-[14px]">📜</span>
                    <span className="whitespace-nowrap">历史故事</span>
                </button>
                <button onClick={() => triggerQuickWord('food')} className="flex-1 flex justify-center py-2 px-1 rounded-full bg-white border border-[#e5e5e5] hover:bg-gray-50 text-[13px] text-[#333333] transition-colors items-center space-x-1 shadow-sm active:scale-95">
                    <span className="text-gray-500 text-[14px]">🍜</span>
                    <span className="whitespace-nowrap">美食推荐</span>
                </button>
                <button onClick={() => triggerQuickWord('photo')} className="flex-1 flex justify-center py-2 px-1 rounded-full bg-white border border-[#e5e5e5] hover:bg-gray-50 text-[13px] text-[#333333] transition-colors items-center space-x-1 shadow-sm active:scale-95">
                    <span className="text-gray-500 text-[14px]">📸</span>
                    <span className="whitespace-nowrap">拍照攻略</span>
                </button>
            </div>

            {/* 底部输入区及悬浮图片预览 */}
            <div className="relative bg-transparent shrink-0 flex flex-col pt-2 w-full">
                {/* 悬浮的待发送图片预览 */}
                {pendingImage && (
                    <div className="absolute bottom-[calc(100%+8px)] left-4 z-10 bg-white p-2 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <div className="relative">
                            <img src={pendingImage} alt="pending" className="h-24 w-auto object-contain rounded-xl" />
                            <button
                                onClick={() => setPendingImage(null)}
                                className="absolute -top-3 -right-3 w-6 h-6 bg-gray-500/80 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:bg-gray-600 transition-colors backdrop-blur-sm"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                <div className="px-4 pb-4 flex items-center space-x-2 w-full">
                    {/* Voice Button */}
                    <button type="button" className="w-10 h-10 flex items-center justify-center shrink-0 bg-gray-100 text-gray-700 rounded-full active:bg-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                    </button>

                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder={pendingImage ? "输入你的问题，一起发送..." : "问我关于这里的一切..."}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            className="w-full bg-gray-100 border-none rounded-full px-4 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 disabled:bg-gray-50 transition-all"
                        />
                    </div>

                    {/* Camera Button / Send Button Cross-fade */}
                    {(inputText || pendingImage) ? (
                        <button
                            type="button"
                            onClick={handleSend}
                            className="w-10 h-10 flex items-center justify-center rounded-full shrink-0 bg-blue-600 text-white shadow-sm active:scale-95 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 -ml-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setCameraActive(!cameraActive)}
                            className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-full transition-all ${cameraActive ? 'bg-blue-100 text-blue-600 shadow-inner' : 'bg-transparent text-gray-500 active:bg-gray-100'}`}
                            title={cameraActive ? "关闭摄像头" : "打开摄像头"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill={cameraActive ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* 视觉调试面板 (浮动式) */}
            {showDebugPanel && (isVisionActive || debugLogs.length > 0) && (
                <div className="absolute top-4 left-4 right-4 bg-black/80 backdrop-blur-md rounded-lg p-2 z-50 flex flex-col border border-gray-700 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-1 px-1 border-b border-gray-800 pb-1">
                        <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">👁️ Vision Debugger</span>
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 animate-pulse"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/80"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500/80"></div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDebugPanel(false)}
                            className="text-gray-500 hover:text-white transition-colors p-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div ref={debugMsgsRef} className="h-24 overflow-y-auto w-full no-scrollbar space-y-1 py-1 scroll-smooth">
                        {debugLogs.length === 0 ? (
                            <div className="text-center py-4">
                                <span className="text-[10px] font-mono text-slate-400/60 italic">[ 等待视觉检测日志... ]</span>
                            </div>
                        ) : (
                            debugLogs.map(log => {
                                let badgeColor = "bg-slate-600";
                                if (log.type === 'debounce') badgeColor = "bg-slate-500";
                                else if (log.type === 'image_miss') badgeColor = "bg-red-600";
                                else if (log.type === 'image_hit') badgeColor = "bg-green-600";
                                else if (log.type === 'vision_scan') badgeColor = "bg-purple-600";

                                return (
                                    <div key={log.id} className="flex gap-2 text-[10px] font-mono leading-tight border-l border-gray-800 pl-2 py-0.5 hover:bg-white/5 transition-colors">
                                        <span className="text-gray-500 shrink-0">{log.ts}</span>
                                        <span className={`px-1 rounded shrink-0 text-[9px] text-white uppercase font-bold ${badgeColor}`}>{log.type}</span>
                                        <span className="text-slate-200">{log.detail}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* 调试面板显示切换按钮 (闭合态) */}
            {!showDebugPanel && (isVisionActive || debugLogs.length > 0) && (
                <button
                    onClick={() => setShowDebugPanel(true)}
                    className="absolute top-4 left-4 bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white p-1.5 rounded-full z-50 border border-gray-700 shadow-lg transition-all active:scale-95"
                    title="显示调试面板"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.644C3.399 8.049 7.045 4.5 12 4.5c4.954 0 8.599 3.549 9.964 7.178.07.232.07.465 0 .697C20.599 15.951 16.954 19.5 12 19.5c-4.954 0-8.599-3.549-9.964-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                </button>
            )}
        </div>
    );
}
