import { useState, useEffect, useRef, useCallback } from 'react';

// Dynamically import transformers to avoid SSR issues and allow chunked loading
let pipeline: any = null;
let extractor: any = null;

const loadModel = async () => {
    if (extractor) return extractor;

    // Dynamic import of @xenova/transformers
    const transformers = await import('@xenova/transformers');
    transformers.env.allowLocalModels = false; // Force HF remote, prevent index.html local 404 fetch crash
    pipeline = transformers.pipeline;

    // Load the feature extraction pipeline with CLIP vision model
    extractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', {
        // Quantized model for smaller download (~85MB -> ~25MB)
        quantized: true,
    });

    console.log('[CLIP] Model loaded successfully');
    return extractor;
};

export const useCLIP = () => {
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const extractorRef = useRef<any>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        loadModel()
            .then((ext) => {
                if (!cancelled) {
                    extractorRef.current = ext;
                    setReady(true);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error('[CLIP] Failed to load model:', err);
                    setError(err.message || 'Failed to load CLIP model');
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * Extract a 512-dim embedding vector from an image.
     * @param imageSource - A blob URL, data URL, or HTTP URL of the image
     * @returns Float32 array of 512 dimensions, or null on failure
     */
    const extractImageEmbedding = useCallback(
        async (imageSource: string): Promise<number[] | null> => {
            const ext = extractorRef.current;
            if (!ext) {
                console.warn('[CLIP] Model not ready yet');
                return null;
            }

            try {
                // The pipeline handles image loading, preprocessing (resize/crop to 224x224),
                // and model inference internally
                const output = await ext(imageSource, {
                    pooling: 'mean',
                    normalize: true,
                });

                // output.data is a Float32Array; convert to regular array for JSON serialization
                return Array.from(output.data as Float32Array);
            } catch (err) {
                console.error('[CLIP] Failed to extract embedding:', err);
                return null;
            }
        },
        []
    );

    return { ready, loading, error, extractImageEmbedding };
};
