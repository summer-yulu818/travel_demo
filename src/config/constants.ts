/**
 * Vision and Scanning Configuration Constants
 */

export const VISION_CONFIG = {
    // 图像匹配命中阈值 (如 0.25 代表 25%)
    MATCH_THRESHOLD: 0.25,

    // 视觉扫描轮询间隔 (毫秒)
    POLL_INTERVAL_MS: 3000,

    // 匹配去重时间 (同一个 POI 多久内不重复触发)
    MATCH_DEBOUNCE_MS: 60000,

    // 冷却时间 (讲解完成后多久可重触发)
    COOLDOWN_MS: 30000,

    // 云端视觉 (DashScope) 默认阈值
    CLOUDV_THRESHOLD: 0.65,

    // 本地视觉默认阈值
    LOCAL_THRESHOLD: 0.3,

    // 移动检测亮度阈值 (太暗不扫)
    BRIGHTNESS_THRESHOLD: 30,

    // 帧差异检测阈值 (静止不扫)
    DIFF_THRESHOLD: 8,

    // 跳过静止检测的相似度百分比阈值 (如 0.15 代表 15%)
    SKIP_STATIC_SIMILARITY_THRESHOLD: 0.15,
};
