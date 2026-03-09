import { useMediaPipe } from './useMediaPipe';

export type EmbeddingEngine = 'mediapipe';

/**
 * Unified embedding hook that uses MediaPipe for image embeddings.
 *
 * MediaPipe: 1024-dim (mobilenet_v3_small, ~5MB model, ~50ms inference)
 */
export const useEmbedding = () => {
    const engine: EmbeddingEngine = 'mediapipe';
    const mediapipe = useMediaPipe();

    return {
        ready: mediapipe.ready,
        loading: mediapipe.loading,
        error: mediapipe.error,
        extractEmbedding: mediapipe.extractImageEmbedding,
        engineName: engine,
        /** Embedding dimension: 1024 for MediaPipe */
        embeddingDim: 1024,
    };
};
