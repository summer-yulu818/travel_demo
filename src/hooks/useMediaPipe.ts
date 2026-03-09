import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for Google MediaPipe Image Embedder.
 * Uses @mediapipe/tasks-vision to run MobileNet V3 Small in-browser via WASM.
 * Produces 1024-dim embedding vectors.
 */

let embedderInstance: any = null;
let embedderPromise: Promise<any> | null = null;

const loadMediaPipeEmbedder = async () => {
    if (embedderInstance) return embedderInstance;
    if (embedderPromise) return embedderPromise;

    embedderPromise = (async () => {
        const { FilesetResolver, ImageEmbedder } = await import('@mediapipe/tasks-vision');

        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const embedder = await ImageEmbedder.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath:
                    'https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite',
            },
            runningMode: 'IMAGE',
            l2Normalize: true,
        });

        embedderInstance = embedder;
        console.log('[MediaPipe] Image Embedder loaded successfully');
        return embedder;
    })();

    return embedderPromise;
};

export const useMediaPipe = () => {
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const embedderRef = useRef<any>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);

        loadMediaPipeEmbedder()
            .then((embedder) => {
                if (!cancelled) {
                    embedderRef.current = embedder;
                    setReady(true);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error('[MediaPipe] Failed to load embedder:', err);
                    setError(err.message || 'Failed to load MediaPipe Image Embedder');
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * Extract embedding from an HTMLImageElement or HTMLCanvasElement.
     * MediaPipe embed() works synchronously on the element.
     * @returns number[] of 1024 dimensions, or null on failure
     */
    const extractImageEmbedding = useCallback(
        async (imageSource: string): Promise<number[] | null> => {
            const embedder = embedderRef.current;
            if (!embedder) {
                console.warn('[MediaPipe] Embedder not ready yet');
                return null;
            }

            try {
                // Create an Image element from the source URL / data URL
                const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const image = new Image();
                    image.crossOrigin = 'anonymous';
                    image.onload = () => resolve(image);
                    image.onerror = (e) => reject(e);
                    image.src = imageSource;
                });

                const result = embedder.embed(img);

                if (result && result.embeddings && result.embeddings.length > 0) {
                    const embedding = result.embeddings[0];
                    // floatEmbedding is a Float32Array
                    return Array.from(embedding.floatEmbedding as Float32Array);
                }

                console.warn('[MediaPipe] No embedding returned');
                return null;
            } catch (err) {
                console.error('[MediaPipe] Failed to extract embedding:', err);
                return null;
            }
        },
        []
    );

    return { ready, loading, error, extractImageEmbedding };
};
