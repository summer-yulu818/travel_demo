// src/services/tts.ts

/**
 * 停止当前正在播放的所有语音
 */
export const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

/**
 * 朗读指定的文本
 * @param text 要朗读的文本内容
 * @param onEnd 播报结束后的回调函数
 */
export const speakText = (text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
        console.warn('当前浏览器不支持语音合成 (Web Speech API)');
        if (onEnd) onEnd();
        return;
    }

    // 停止之前的朗读
    stopSpeaking();

    // 过滤掉不可读的标点或格式字符（根据需要可进一步完善）
    const cleanText = text.replace(/[\*\_\[\]]/g, '');
    
    if (!cleanText.trim()) {
        if (onEnd) onEnd();
        return;
    }

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = 'zh-CN';
    // 稍微调快语速，让对答显得更利落
    utter.rate = 1.1; 
    utter.pitch = 1.0;

    if (onEnd) {
        utter.onend = onEnd;
        utter.onerror = onEnd; // 若出错也释放状态
    }

    const trySpeak = () => {
        const vList = window.speechSynthesis.getVoices();
        // 尝试寻找表现较好的中文女声
        const v = vList.find(v => v.lang === 'zh-CN' && (v.name.includes('Xiaoxiao') || v.name.includes('Tingting') || v.name.includes('Lili'))) 
               || vList.find(v => v.lang.includes('zh'));
        if (v) {
            utter.voice = v;
        }
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
