// src/services/llm.ts

const API_KEY = (import.meta as any).env.VITE_QWEN_API_KEY;
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | any[];
}

/**
 * 发起流式对话请求 (SSE)
 */
export async function streamChat(
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    onFinish: () => void,
    onError: (err: any) => void
) {
    if (!API_KEY) {
        onError(new Error('未配置大模型 API Key'));
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: messages,
                stream: true,
                temperature: 0.7,
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API Error: ${response.status} - ${errBody}`);
        }

        if (!response.body) {
            throw new Error('ReadableStream not supported in this browser.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // 处理 SSE 事件流结构:
            // data: {"id":"...","choices":[{"delta":{"content":"xxx"}}]}
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 最后可能不完整的一行保留

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') {
                        // 结束
                        continue;
                    }
                    try {
                        const parsed = JSON.parse(dataStr);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            onChunk(delta);
                        }
                    } catch (e) {
                        // ignore parse error for incomplete chunks inside a line if unusual
                    }
                }
            }
        }

        onFinish();

    } catch (error) {
        console.error('LLM Chat Error:', error);
        onError(error);
    }
}

/**
 * 发起视觉模型分析请求 (非流式，一次性返回结果)
 * 采用原生 DashScope Multimodal 接口以完美支持 Base64
 */
export async function analyzeImage(base64Image: string, prompt: string): Promise<string> {
    if (!API_KEY) {
        throw new Error('未配置大模型 API Key');
    }

    const VL_API_URL = '/api/dashscope/api/v1/services/aigc/multimodal-generation/generation';

    const response = await fetch(VL_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: 'qwen-vl-plus',
            input: {
                messages: [
                    {
                        role: 'user',
                        content: [
                            { image: base64Image }, // 原生协议直接以 image 为键
                            { text: prompt }
                        ]
                    }
                ]
            }
        })
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Vision API Error: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    return data.output?.choices?.[0]?.message?.content?.[0]?.text || '我无法识别此照片。';
}
