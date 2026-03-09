import { useEffect, useRef, useState } from 'react';
import { useTourStore, Message } from '../store/useTourStore';
import { streamChat, ChatMessage } from '../services/llm';

export default function ChatBox() {
    const { currentLocId, currentLoc, messages, addMessage, updateMessage, avatarPaused, setCameraActive, currentTTS, clearTTS, setAvatarTalking } = useTourStore();
    const msgsRef = useRef<HTMLDivElement>(null);
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

    // Listen to Tour Engine TTS Triggers
    useEffect(() => {
        if (currentTTS) {
            speakAndType(currentTTS.id, currentTTS.text, currentTTS.imageUrl);
            clearTTS();
        }
    }, [currentTTS]);

    const speakAndType = (msgId: string, fullText: string, imageUrl?: string) => {
        window.speechSynthesis.cancel();

        // 1. 无条件立即开始文字打字机渲染
        let charIdx = 0;
        updateMessage(msgId, { text: '', isTyping: true });
        setIsTypingObj(msgId);
        isTypingObjRef.current = msgId;
        setAvatarTalking(true);

        const typeInterval = setInterval(() => {
            // 被其他组件抢占时终止
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
                if (imageUrl) {
                    updateMessage(msgId, { imageUrl });
                }
            }
        }, 80);

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
        const id = `msg-${Date.now()}`;
        addMessage({ id, sender: 'bot', text: '', isTyping: true });
        setAvatarTalking(true);
        setIsTypingObj(id);
        isTypingObjRef.current = id;

        const activePois = currentLoc.poiData?.map((p: any) => p.name).join('、') || '暂无';
        const systemPrompt = `你是一个智能伴游助理。当前游客位于【${currentLoc.scenicArea.name}】(${currentLocId})。
你的名字叫小溪（如果是故宫叫小故，黄山叫小黄，蚂蚁空间叫小游）。
当前景区内有效的景点列表为：【${activePois}】。
请仅针对上述有效景点进行介绍和回答。如果用户问及不在列表中的景点，请礼貌地告知该景点当前不可见或不属于本次导览范围。
请用自然亲和、导游的口吻回答问题，保持人文风格，适当使用颜文字，回答尽量简短精要。`;

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
        if (!inputText.trim() || avatarPaused === false) return;
        const txt = inputText.trim();
        addMessage({ id: `msg-${Date.now()}`, sender: 'user', text: txt });
        setInputText('');
        llmBotReply(txt);
    };

    const triggerQuickWord = (key: 'route' | 'history' | 'food' | 'photo') => {
        if (!avatarPaused) return;
        const txtMap = {
            route: '推荐路线', history: '历史故事', food: '美食推荐', photo: '拍照攻略'
        };
        const txt = txtMap[key];
        addMessage({ id: `msg-${Date.now()}`, sender: 'user', text: `请给我一些关于【${currentLoc.name}】的${txt}。` });
        llmBotReply(`请给我一些关于【${currentLoc.name}】的${txt}。`);
    };

    return (
        <>
            {/* 消息区域 */}
            <div ref={msgsRef} className="flex-1 min-h-0 scroll-smooth overflow-y-auto px-4 py-4 space-y-6 pb-12 w-full max-w-full mx-auto">
                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
                        {/* Bot Avatar */}
                        {m.sender === 'bot' && (
                            <div className="w-8 h-8 rounded-full shadow-sm bg-blue-100 flex-shrink-0 overflow-hidden mb-0.5 border border-white">
                                <img src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${currentLoc?.guide?.id || 'bot'}&backgroundColor=d1d4f9`} alt="Bot" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`max-w-[70%] rounded-2xl p-3 text-[13px] leading-[1.6] ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm relative'} ${m.isTyping && m.sender === 'bot' ? 'border-l-4 border-blue-500' : ''}`}>
                            {m.text}
                            {m.isTyping && <span className="inline-block w-1 h-4 ml-1 align-middle bg-blue-500 animate-pulse"></span>}
                            {m.imageUrl && (
                                <div className="mt-2 rounded overflow-hidden">
                                    <img src={m.imageUrl} alt="attachment" className="w-full h-auto object-cover max-h-48" />
                                </div>
                            )}
                        </div>

                        {/* User Avatar */}
                        {m.sender === 'user' && (
                            <div className="w-8 h-8 rounded-full shadow-sm bg-gray-200 flex-shrink-0 overflow-hidden mb-0.5 border border-white">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=User123&backgroundColor=b6e3f4" alt="User" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 快捷推荐 */}
            <div className="px-2 py-3 flex justify-center overflow-x-auto gap-2 no-scrollbar bg-white shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] border-t border-gray-100">
                <button onClick={() => triggerQuickWord('route')} className="shrink-0 px-3 py-1.5 bg-blue-50/80 border border-blue-100/50 rounded-full text-[13px] font-medium text-blue-700 shadow-sm active:scale-95 transition-all">🗺️ 推荐路线</button>
                <button onClick={() => triggerQuickWord('history')} className="shrink-0 px-3 py-1.5 bg-amber-50/80 border border-amber-100/50 rounded-full text-[13px] font-medium text-amber-700 shadow-sm active:scale-95 transition-all">📜 历史故事</button>
                <button onClick={() => triggerQuickWord('food')} className="shrink-0 px-3 py-1.5 bg-orange-50/80 border border-orange-100/50 rounded-full text-[13px] font-medium text-orange-700 shadow-sm active:scale-95 transition-all">🍜 美食推荐</button>
                <button onClick={() => triggerQuickWord('photo')} className="shrink-0 px-3 py-1.5 bg-teal-50/80 border border-teal-100/50 rounded-full text-[13px] font-medium text-teal-700 shadow-sm active:scale-95 transition-all">📸 拍照攻略</button>
            </div>

            {/* 底部输入区 */}
            <div className="bg-white p-3 pt-1 border-t border-gray-100 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                <div className="flex items-center space-x-2">
                    {/* Voice Button */}
                    <button type="button" className="w-10 h-10 flex items-center justify-center shrink-0 bg-gray-100 text-gray-700 rounded-full active:bg-gray-200 transition-colors disabled:opacity-40" disabled={!avatarPaused}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                    </button>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder={avatarPaused ? "问我关于这里的一切..." : "数字人导览中，已锁定输入..."}
                            disabled={!avatarPaused}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            className="w-full bg-gray-100 border-none rounded-full px-4 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 disabled:bg-gray-50 transition-all"
                        />
                    </div>

                    {/* Camera Button / Send Button Cross-fade */}
                    {inputText ? (
                        <button
                            type="button"
                            disabled={!avatarPaused}
                            onClick={handleSend}
                            className="w-10 h-10 flex items-center justify-center rounded-full shrink-0 bg-blue-600 text-white shadow-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 -ml-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setCameraActive(true)}
                            className="w-10 h-10 flex items-center justify-center shrink-0 bg-transparent text-gray-500 rounded-full active:bg-gray-100 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
