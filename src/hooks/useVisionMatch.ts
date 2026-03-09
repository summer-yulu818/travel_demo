import { useState, useCallback } from 'react';
import { useEmbedding } from './useEmbedding';
import { supabase } from '../lib/supabase';

export interface MatchResult {
    attractionId: string;
    attractionName: string;
    imageUrl: string;
    similarity: number;
}

export interface VisionMatchResponse {
    match: MatchResult | null;
    topCandidate?: {
        name: string;
        similarity: number;
    };
    error?: string;
}

interface UseVisionMatchOptions {
    matchThreshold?: number;
    matchCount?: number;
    engine?: 'mediapipe' | 'dashscope';
}

/**
 * Hook that orchestrates the full vision matching pipeline:
 * 1. Capture a frame from a video element
 * 2. Extract embedding (Local MediaPipe or Online DashScope)
 * 3. Query Supabase pgvector for the closest matching attraction
 */
export const useVisionMatch = (options: UseVisionMatchOptions = {}) => {
    const { matchThreshold = 0.3, matchCount = 1, engine: preferredEngine } = options;
    const { ready: modelReady, loading: modelLoading, extractEmbedding, engineName: localEngine } = useEmbedding();

    const activeEngine = (preferredEngine as any) === 'clip' ? 'mediapipe' : (preferredEngine || localEngine);
    const [isMatching, setIsMatching] = useState(false);
    const [lastMatch, setLastMatch] = useState<MatchResult | null>(null);

    const extractDashScopeEmbedding = useCallback(async (imageDataUrl: string): Promise<number[] | null> => {
        try {
            console.log('[VisionMatch] Extracting DashScope embedding via Edge Function...');
            const { data, error } = await supabase.functions.invoke('embed-vision', {
                body: { image: imageDataUrl }
            });

            if (error) {
                console.error('[VisionMatch] DashScope Edge Function error:', error);
                throw new Error(`Edge Function: ${error.message || JSON.stringify(error)}`);
            }

            if (data?.embedding && Array.isArray(data.embedding)) {
                return data.embedding;
            }

            console.error('[VisionMatch] Invalid DashScope response format:', data);
            return null;
        } catch (err: any) {
            console.error('[VisionMatch] DashScope Embedding failed:', err);
            // Re-throw so the caller can see the actual message
            throw err;
        }
    }, []);

    const matchFromVideo = useCallback(
        async (
            videoElement: HTMLVideoElement,
            scenicId: string,
            attractionIds?: string[]
        ): Promise<VisionMatchResponse | null> => {
            if (!modelReady && activeEngine !== 'dashscope') {
                console.warn(`[VisionMatch] ${activeEngine} model not ready (local)`);
                return { match: null };
            }

            if (!videoElement || videoElement.videoWidth === 0) {
                console.warn('[VisionMatch] Video element not available');
                return null;
            }

            if (!scenicId) {
                console.warn('[VisionMatch] scenicId is required');
                return null;
            }

            setIsMatching(true);

            try {
                const canvas = document.createElement('canvas');
                const targetSize = 512;
                canvas.width = targetSize;
                canvas.height = targetSize;

                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Cannot get canvas 2d context');

                // Fill background with black (consistent with Python Letterbox)
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, targetSize, targetSize);

                // Calculate scaling factor to fit within targetSize while maintaining aspect ratio
                const scale = Math.min(targetSize / videoElement.videoWidth, targetSize / videoElement.videoHeight, 1);
                const newWidth = videoElement.videoWidth * scale;
                const newHeight = videoElement.videoHeight * scale;

                // Center the image
                const x = (targetSize - newWidth) / 2;
                const y = (targetSize - newHeight) / 2;

                ctx.drawImage(videoElement, x, y, newWidth, newHeight);

                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                console.time(`[VisionMatch] ${activeEngine} embedding`);
                let embedding: number[] | null = null;
                if (activeEngine === 'dashscope') {
                    embedding = await extractDashScopeEmbedding(imageDataUrl);
                } else {
                    embedding = await extractEmbedding(imageDataUrl);
                }
                console.timeEnd(`[VisionMatch] ${activeEngine} embedding`);

                if (!embedding) {
                    return { match: null, error: 'Embedding failed' };
                }

                const rpcName = activeEngine === 'mediapipe'
                    ? 'match_attraction_images_mp'
                    : activeEngine === 'dashscope'
                        ? 'match_attraction_images_dashscope'
                        : 'match_attraction_images';

                const rpcParams: any = {
                    query_embedding: embedding,
                    match_threshold: 0,
                    match_count: matchCount,
                    p_scenic_id: scenicId,
                    p_attraction_ids: attractionIds || null
                };

                const { data, error } = await supabase.rpc(rpcName, rpcParams);

                if (error) {
                    console.error('[VisionMatch] Supabase RPC error:', error);
                    return { match: null, error: `RPC: ${error.message}` };
                }

                if (data && data.length > 0) {
                    const best = data[0];
                    const topCandidate = { name: best.attraction_name, similarity: best.similarity };

                    if (best.similarity >= matchThreshold) {
                        const match: MatchResult = {
                            attractionId: best.attraction_id,
                            attractionName: best.attraction_name,
                            imageUrl: best.image_url,
                            similarity: best.similarity,
                        };
                        setLastMatch(match);
                        return { match, topCandidate };
                    }
                    return { match: null, topCandidate };
                }

                return { match: null };
            } catch (err: any) {
                console.error('[VisionMatch] Error:', err);
                return { match: null, error: err.message || 'Unknown error' };
            } finally {
                setIsMatching(false);
            }
        },
        [modelReady, extractEmbedding, extractDashScopeEmbedding, activeEngine, matchThreshold, matchCount]
    );

    const matchFromImage = useCallback(
        async (
            imageSource: string,
            scenicId: string,
            attractionIds?: string[]
        ): Promise<VisionMatchResponse | null> => {
            if (!modelReady && activeEngine !== 'dashscope') {
                return { match: null };
            }

            if (!scenicId) return { match: null };

            setIsMatching(true);

            try {
                let embedding: number[] | null = null;
                if (activeEngine === 'dashscope') {
                    embedding = await extractDashScopeEmbedding(imageSource);
                } else {
                    embedding = await extractEmbedding(imageSource);
                }

                if (!embedding) return { match: null, error: 'Embedding failed' };

                const rpcName = activeEngine === 'mediapipe'
                    ? 'match_attraction_images_mp'
                    : activeEngine === 'dashscope'
                        ? 'match_attraction_images_dashscope'
                        : 'match_attraction_images';

                const { data, error } = await supabase.rpc(rpcName, {
                    query_embedding: embedding,
                    match_threshold: 0,
                    match_count: matchCount,
                    p_scenic_id: scenicId,
                    p_attraction_ids: attractionIds || null
                });

                if (error) {
                    console.error('[VisionMatch] Supabase RPC error:', error);
                    return { match: null, error: `RPC: ${error.message}` };
                }

                if (data && data.length > 0) {
                    const best = data[0];
                    const topCandidate = { name: best.attraction_name, similarity: best.similarity };

                    if (best.similarity >= matchThreshold) {
                        const match: MatchResult = {
                            attractionId: best.attraction_id,
                            attractionName: best.attraction_name,
                            imageUrl: best.image_url,
                            similarity: best.similarity,
                        };
                        setLastMatch(match);
                        return { match, topCandidate };
                    }
                    return { match: null, topCandidate };
                }

                return { match: null };
            } catch (err: any) {
                console.error('[VisionMatch] Error:', err);
                return { match: null, error: err.message || 'Unknown error' };
            } finally {
                setIsMatching(false);
            }
        },
        [modelReady, extractEmbedding, extractDashScopeEmbedding, activeEngine, matchThreshold, matchCount]
    );

    return {
        modelReady,
        modelLoading,
        engineName: activeEngine,
        embeddingDim: activeEngine === 'dashscope' ? 1024 : 1024,
        isMatching,
        lastMatch,
        matchFromVideo,
        matchFromImage,
    };
};
