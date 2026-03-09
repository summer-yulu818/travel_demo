import { useEffect, useRef, useCallback } from 'react';
import { VISION_CONFIG } from '../config/constants';
// remove DebugLogType import


const DEG_TO_METERS = 111_320;
function geoDistDeg(lat1: number, lng1: number, lat2: number, lng2: number) {
    const dlng = lng1 - lng2;
    const dlat = lat1 - lat2;
    return Math.sqrt(dlng * dlng + dlat * dlat);
}

interface UseVisionScannerProps {
    appMode: string;
    isPlaying: boolean;
    modelReady: boolean;
    isVisionActive: boolean;
    selectedScenicId: string | null;
    enableLocationFilter: boolean;
    userLocation: { lng: number; lat: number } | null;
    activePOIs: any[];
    isTyping: boolean;
    matchFromVideo: (videoElement: HTMLVideoElement, scenicId: string, attractionIds?: string[]) => Promise<any>;
    addDebugLog: (type: string, detail: string) => void;
    currentPoiIndex: number;
    enableCloudVision: boolean;
    onMatch: (index: number) => void;
}

export function useVisionScanner({
    appMode, isPlaying, modelReady, isVisionActive, selectedScenicId,
    enableLocationFilter, userLocation, activePOIs, isTyping,
    matchFromVideo, addDebugLog, currentPoiIndex, enableCloudVision, onMatch
}: UseVisionScannerProps) {

    const isPlayingRef = useRef(false);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    const lastMatchedPoiRef = useRef<string | null>(null);
    const lastMatchTimeRef = useRef<number>(0);
    const lastFrameDataRef = useRef<{ brightness: number; pixels: Uint8ClampedArray } | null>(null);
    const lastSimilarityRef = useRef<number>(0);
    const explanationLockUntilRef = useRef<number>(0);
    const recentTriggersRef = useRef<{ id: string; completionTime: number }[]>([]);

    const MATCH_DEBOUNCE_MS = VISION_CONFIG.MATCH_DEBOUNCE_MS;
    const VISION_POLL_INTERVAL_MS = VISION_CONFIG.POLL_INTERVAL_MS;
    const COOLDOWN_MS = VISION_CONFIG.COOLDOWN_MS;

    const resetScannerState = useCallback(() => {
        lastMatchedPoiRef.current = null;
        lastMatchTimeRef.current = 0;
        explanationLockUntilRef.current = 0;
        recentTriggersRef.current = [];
        lastFrameDataRef.current = null;
    }, []);

    // Update lock times externally
    const setExplanationLock = useCallback((duration: number, poiId: string) => {
        const completionTime = Date.now() + duration;
        explanationLockUntilRef.current = completionTime;

        recentTriggersRef.current = [
            { id: poiId, completionTime },
            ...recentTriggersRef.current.filter(t => t.id !== poiId)
        ].slice(0, 3);
    }, []);

    // Store callbacks and fast-changing props in refs to avoid infinite effect loops
    const refs = useRef({
        activePOIs, isTyping, matchFromVideo, addDebugLog,
        currentPoiIndex, enableCloudVision, onMatch, enableLocationFilter, userLocation
    });

    useEffect(() => {
        refs.current = {
            activePOIs, isTyping, matchFromVideo, addDebugLog,
            currentPoiIndex, enableCloudVision, onMatch, enableLocationFilter, userLocation
        };
    });

    useEffect(() => {
        if (appMode === 'fixed-demo') return;
        if (!isPlaying || !modelReady || !isVisionActive || !selectedScenicId) return;

        const scenicId = selectedScenicId;

        const runVisionScan = async () => {
            if (!isPlayingRef.current) return;
            const now = Date.now();

            if (now < explanationLockUntilRef.current) {
                const remaining = Math.ceil((explanationLockUntilRef.current - now) / 1000);
                refs.current.addDebugLog('debounce', `讲解锁定中，还剩 ${remaining}s`);
                return;
            }

            if (refs.current.isTyping) {
                refs.current.addDebugLog('debounce', '播报中，跳过本轮视觉检测');
                return;
            }

            const video = document.getElementById('tour-camera-video') as HTMLVideoElement;
            if (!video || video.videoWidth === 0) {
                refs.current.addDebugLog('debounce', '摄像头未就绪，跳过');
                return;
            }

            let attractionIds: string[] | undefined;

            if (refs.current.enableLocationFilter && refs.current.userLocation && refs.current.activePOIs.length > 0) {
                const RADIUS_DEG = 200 / DEG_TO_METERS;
                const nearby = refs.current.activePOIs.filter(poi =>
                    geoDistDeg(poi.lat, poi.lng, refs.current.userLocation!.lat, refs.current.userLocation!.lng) < RADIUS_DEG
                );
                if (nearby.length > 0) {
                    attractionIds = nearby.map(p => p.id);
                    refs.current.addDebugLog('vision_scan', `位置预筛: ${nearby.length}候选 (${nearby.map(p => p.name.slice(0, 4)).join(',')})`);
                } else {
                    refs.current.addDebugLog('vision_scan', `无候选POI，使用全库`);
                }
            } else {
                refs.current.addDebugLog('vision_scan', `视觉扫描: 景区全库`);
            }

            // Optimization Layer
            try {
                const offSize = 32;
                const offCanvas = document.createElement('canvas');
                offCanvas.width = offSize;
                offCanvas.height = offSize;
                const offCtx = offCanvas.getContext('2d');
                if (!offCtx) return;
                offCtx.drawImage(video, 0, 0, offSize, offSize);
                const imgData = offCtx.getImageData(0, 0, offSize, offSize).data;

                let totalBrightness = 0;
                for (let i = 0; i < imgData.length; i += 4) {
                    totalBrightness += (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
                }
                const avgBrightness = totalBrightness / (offSize * offSize);

                if (avgBrightness < VISION_CONFIG.BRIGHTNESS_THRESHOLD) {
                    refs.current.addDebugLog('debounce', `[暗] ${avgBrightness.toFixed(1)}`);
                    return;
                }

                if (lastFrameDataRef.current) {
                    let diffSum = 0;
                    const prevPixels = lastFrameDataRef.current.pixels;
                    for (let i = 0; i < imgData.length; i += 4) {
                        const curG = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
                        const preG = (prevPixels[i] + prevPixels[i + 1] + prevPixels[i + 2]) / 3;
                        diffSum += Math.abs(curG - preG);
                    }
                    const avgDiff = diffSum / (offSize * offSize);

                    const shouldSkipStaticCheck = lastSimilarityRef.current > VISION_CONFIG.SKIP_STATIC_SIMILARITY_THRESHOLD;

                    if (avgDiff < VISION_CONFIG.DIFF_THRESHOLD && !shouldSkipStaticCheck) {
                        refs.current.addDebugLog('vision_scan', `[静] 差异:${avgDiff.toFixed(1)}`);
                        return;
                    } else {
                        const skipReason = shouldSkipStaticCheck ? `(势:${(lastSimilarityRef.current * 100).toFixed(0)}%)` : `(动:${avgDiff.toFixed(1)})`;
                        const matchLabel = refs.current.enableCloudVision ? 'DS' : 'Local';
                        refs.current.addDebugLog('vision_scan', `[扫]${matchLabel}${skipReason}`);
                    }
                } else {
                    const matchLabel = refs.current.enableCloudVision ? 'DS' : 'Local';
                    refs.current.addDebugLog('vision_scan', `[扫]${matchLabel}(首帧)`);
                }

                lastFrameDataRef.current = { brightness: avgBrightness, pixels: new Uint8ClampedArray(imgData) };
            } catch (e) {
                console.warn('[VisionMatch] Optimization layer error:', e);
            }

            try {

                const response = await refs.current.matchFromVideo(video, scenicId, attractionIds);

                // Track similarity for static check bypass
                const currentMaxSim = response?.match?.similarity || response?.topCandidate?.similarity || 0;
                lastSimilarityRef.current = currentMaxSim;

                if (response?.match) {
                    const { match } = response;
                    const now = Date.now();
                    if (
                        match.attractionId === lastMatchedPoiRef.current &&
                        now - lastMatchTimeRef.current < MATCH_DEBOUNCE_MS
                    ) {
                        refs.current.addDebugLog('debounce', `[稳]未变化: ${match.attractionName}`);
                        return;
                    }

                    const recentMatch = recentTriggersRef.current.find(t => t.id === match.attractionId);
                    if (recentMatch && now < recentMatch.completionTime + COOLDOWN_MS) {
                        const wait = Math.ceil((recentMatch.completionTime + COOLDOWN_MS - now) / 1000);
                        refs.current.addDebugLog('debounce', `[冷却] ${match.attractionName} 刚讲解过，${wait}s 后可重触发`);
                        return;
                    }

                    const engineLabel = refs.current.enableCloudVision ? 'DS' : 'LC';
                    refs.current.addDebugLog('image_hit', `[命(${engineLabel})]${match.attractionName} ${(match.similarity * 100).toFixed(1)}%`);

                    const matchedIndex = refs.current.activePOIs.findIndex(p => p.id === match.attractionId);
                    if (matchedIndex !== -1 && matchedIndex !== refs.current.currentPoiIndex) {
                        lastMatchedPoiRef.current = match.attractionId;
                        lastMatchTimeRef.current = now;
                        refs.current.onMatch(matchedIndex);
                    }
                } else {
                    const top = response?.topCandidate;
                    const engineLabel = refs.current.enableCloudVision ? 'DS' : 'LC';
                    const currentThreshold = refs.current.enableCloudVision ? VISION_CONFIG.CLOUDV_THRESHOLD : VISION_CONFIG.MATCH_THRESHOLD;

                    if (response?.error) {
                        refs.current.addDebugLog('image_miss', `[错(${engineLabel})]${response.error}`);
                    } else if (top) {
                        refs.current.addDebugLog('image_miss', `[无(${engineLabel})]${top.name} ${(top.similarity * 100).toFixed(1)}% < ${(currentThreshold * 100).toFixed(1)}%`);
                    } else {
                        refs.current.addDebugLog('image_miss', `[无(${engineLabel})]库中无匹配结果`);
                    }
                }
            } catch (err) {
                console.error('[VisionScan] Error:', err);
            }
        };

        runVisionScan();
        const intervalId = window.setInterval(runVisionScan, VISION_POLL_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [appMode, isPlaying, modelReady, isVisionActive, selectedScenicId]);

    return { resetScannerState, setExplanationLock };
}
