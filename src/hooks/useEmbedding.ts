import { useCLIP } from './useCLIP';
import { useMediaPipe } from './useMediaPipe';

export type EmbeddingEngine = 'mediapipe' | 'clip';

/**
 * Unified embedding hook that switches between MediaPipe and CLIP
 * based on the VITE_EMBEDDING_ENGINE environment variable.
 *
 * MediaPipe: 1024-dim (mobilenet_v3_small, ~5MB model, ~50ms inference)
 * CLIP:      512-dim  (ViT-B/32 quantized, ~25MB model, ~200ms inference)
 */
export const useEmbedding = () => {
    const engine: EmbeddingEngine =
        (import.meta.env.VITE_EMBEDDING_ENGINE as EmbeddingEngine) || 'mediapipe';

    const clip = useCLIP();
    const mediapipe = useMediaPipe();

    const active = engine === 'clip' ? clip : mediapipe;

    return {
        ready: active.ready,
        loading: active.loading,
        error: active.error,
        extractEmbedding: active.extractImageEmbedding,
        engineName: engine,
        /** Embedding dimension: 512 for CLIP, 1024 for MediaPipe */
        embeddingDim: engine === 'clip' ? 512 : 1024,
    };
};
