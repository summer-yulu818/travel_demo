// src/services/tts.ts
import { useTourStore } from '../store/useTourStore';

let isAudioUnlocked = false;

/**
 * 尝试静音播报以解锁 iOS Safari 等移动端浏览器的音频限制
 */
export const unlockAudio = () => {
    if (!isAudioUnlocked && 'speechSynthesis' in window) {
        try {
            const silent = new SpeechSynthesisUtterance('');
            silent.volume = 0;
            silent.rate = 1;
            silent.pitch = 1;
            window.speechSynthesis.speak(silent);
            isAudioUnlocked = true;
            useTourStore.getState().addDebugLog('tts', 'iOS Audio Context Unlocked');
        } catch (e) {}
    }
};

/**
 * 停止当前正在播放的所有语音
 */
export const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        useTourStore.getState().addDebugLog('tts', 'Speech synthesis cancelled');
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

    utter.onstart = () => {
        useTourStore.getState().addDebugLog('tts', `Start: ${cleanText.substring(0, 15)}...`);
    };

    utter.onend = () => {
        useTourStore.getState().addDebugLog('tts', 'Ended gently');
        if (onEnd) onEnd();
    };

    utter.onerror = (e: any) => {
        useTourStore.getState().addDebugLog('tts', `Error: ${e.error || 'unknown'}`);
        if (onEnd) onEnd();
    };

    const trySpeak = () => {
        const vList = window.speechSynthesis.getVoices();
        // 尝试寻找表现较好的中文女声
        if (vList.length > 0) {
            const v = vList.find(v => v.lang === 'zh-CN' && (v.name.includes('Xiaoxiao') || v.name.includes('Tingting') || v.name.includes('Lili'))) 
                   || vList.find(v => v.lang.includes('zh'));
            if (v) {
                utter.voice = v;
            }
        }
        
        // 核心修复：Safari 中紧接着 cancel() 后调用 speak() 时常被浏览器吞掉/忽略
        // 必须让出主线程(Event Loop Yield)以确保它开始播报
        setTimeout(() => {
            window.speechSynthesis.speak(utter);
            useTourStore.getState().addDebugLog('tts', 'Speak command dispatched');
        }, 50);
    };

    // 不论是否 onvoiceschanged 都尝试直接播报，防止 Safari 死锁无回调
    trySpeak();
};
