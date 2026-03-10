/**
 * 西湖景区数据 — 西湖十景
 */

export const locations = {
  westlake: {
    scenicArea: {
      id: 'westlake', name: '西湖景区', city: '杭州', visitors: 3280, heatLevel: 4,
      geofence: { lat: 30.2590, lng: 120.1300, radius: 3000 }
    },
    guide: { id: 'xiaoxi', name: '小溪', title: '西湖AI导游', avatarUrl: '/avatars/westlake_avatar.png', botIcon: '🐍' },
    poiData: [
      { id: 'broken-bridge', name: '断桥残雪', icon: '🌉', position: { x: 0.58, y: 0.18 }, lng: 120.1472, lat: 30.2638, distance: '200m', narration: '这里便是断桥残雪。相传白娘子与许仙正是于此桥相遇，结下千古奇缘。冬雪初霁时，桥面半白半青，宛如长桥从中折断，极富诗意。', image: 'https://picsum.photos/id/28/400/240' },
      { id: 'su-causeway', name: '苏堤春晓', icon: '🌸', position: { x: 0.28, y: 0.45 }, lng: 120.1332, lat: 30.2458, distance: '500m', narration: '此去便是苏堤春晓，位列西湖十景之首。北宋文豪苏东坡任杭州知州时修筑此堤，全长近六里。早春时节，漫步于此，一株杨柳一株桃，春风拂面，宛在画中游。', image: 'https://picsum.photos/id/29/400/240' },
      { id: 'leifeng-sunset', name: '雷峰夕照', icon: '🏯', position: { x: 0.42, y: 0.78 }, lng: 120.1469, lat: 30.2315, distance: '800m', narration: '前方那座飞檐翘角的宝塔便是雷峰塔。民间传说中，法海将白娘子镇压于此。每当夕阳西下，落日余晖为塔身镀上一层金轮，便是著名的雷峰夕照。', image: 'https://picsum.photos/id/35/400/240' },
      { id: 'three-pools', name: '三潭印月', icon: '🏮', position: { x: 0.42, y: 0.55 }, lng: 120.1408, lat: 30.2392, distance: '600m', narration: '水面上的三座石塔，便构成了三潭印月之景，您手中的一元人民币背面正是此番胜景。每至中秋佳节，塔中燃灯，湖面交辉，光影片片，引人入胜。', image: 'https://picsum.photos/id/36/400/240' },
      { id: 'flower-harbor', name: '花港观鱼', icon: '🐟', position: { x: 0.30, y: 0.68 }, lng: 120.1362, lat: 30.2348, distance: '700m', narration: '我们正身处花港观鱼。此处池水清鉴，数千尾红锦鲤游曳其间，聚散落英。赏花观鱼、亲近自然，不妨在此静赏南宋诗画中的闲适与清幽。', image: 'https://picsum.photos/id/39/400/240' },
      { id: 'oriole-singing', name: '柳浪闻莺', icon: '🐦', position: { x: 0.60, y: 0.72 }, lng: 120.1558, lat: 30.2415, distance: '850m', narration: '这里是柳浪闻莺，昔日南宋御花园的旧址。微风过处，枝头黄莺啼鸣婉转。暮春时节，漫天柳絮轻舞飞扬，最能体会烟雨江南的缱绻柔情。', image: 'https://picsum.photos/id/40/400/240' },
      { id: 'autumn-moon', name: '平湖秋月', icon: '🌙', position: { x: 0.52, y: 0.25 }, lng: 120.1432, lat: 30.2568, distance: '300m', narration: '这是西湖绝佳的赏月胜地——平湖秋月。每逢金秋之夜，皓月当空，湖面如镜，天上月与水中月交相辉映，正可谓“万顷湖平长似镜，四时月好最宜秋”。', image: 'https://picsum.photos/id/41/400/240' },
      { id: 'double-peaks', name: '双峰插云', icon: '⛰️', position: { x: 0.18, y: 0.30 }, lng: 120.1132, lat: 30.2458, distance: '1.2km', narration: '远眺天际，那巍然耸立的便是南高峰与北高峰，合称双峰插云。晴日里双峰入群霄，烟雨中则若隐若现、宛如仙境。若得空登临峰顶，西湖全景便可尽收眼底。', image: 'https://picsum.photos/id/42/400/240' },
      { id: 'nanping-bell', name: '南屏晚钟', icon: '🔔', position: { x: 0.48, y: 0.85 }, lng: 120.1482, lat: 30.2258, distance: '900m', narration: '您听，这是净慈寺传来的钟声。每逢向晚，雄浑悠远的钟声在南屏山谷间回荡，让人心生宁静。新元之夜，此处常有撞钟祈福之典，愿能为您涤去几分尘嚣。', image: 'https://picsum.photos/id/43/400/240' },
      { id: 'lingyin-temple', name: '曲院风荷', icon: '🪷', position: { x: 0.32, y: 0.22 }, lng: 120.1332, lat: 30.2558, distance: '400m', narration: '来到曲院风荷，炎夏时节满池接天莲叶，清风徐来，暗香浮动。南宋时此地本是皇家酿酒坊，酒香与荷香交织，是以得名“曲院”，别有一番醉人韵味。', image: 'https://picsum.photos/id/44/400/240' }
    ],
    aiResponses: {
      history: ['西湖有着两千余年的历史底蕴，最早在秦汉时期便有记载。隋朝开凿大运河后，杭州日渐繁荣，历代文人墨客的疏浚与吟咏，更成就了今日的人文西湖。'],
      route: ['向您推荐经典的环湖路线：断桥残雪 → 平湖秋月 → 曲院风荷 → 苏堤春晓 → 花港观鱼 → 雷峰夕照。全程约八公里，借由步履丈量山水，可谓赏心乐事。'],
      tips: ['游览建议：清晨薄雾未散之时游湖最为静谧；环湖皆有公共自行车可供代步；若欲前往三潭印月，需乘游船前往，泛舟湖上也是一桩雅事。'],
      food: ['若欲品尝杭帮佳肴，西湖醋鱼、东坡肉与龙井虾仁皆是传世名菜。湖滨路与河坊街巷陌之间，亦藏着正宗的知味小笼与片儿川。'],
      photo: ['这处景致可谓是摄影的绝佳所在。光影交错间，一砖一瓦皆是岁月的痕迹。如果您需要，我很乐意为您指出几处取景的绝妙机位。'],
      fallback: ['西湖的角角落落，皆藏着千古文韵。无论是寻幽揽胜还是访古探微，您尽可向我询问，我将为您娓娓道来。']
    },
    geofenceMessages: [
      { id: 'm1', text: '🎭 14:00 断桥·白蛇传沉浸话剧即将开演', type: 'event', detail: '断桥·白蛇传沉浸式话剧今日14:00在断桥旁演出，时长45分钟，免费观看。' },
      { id: 'm2', text: '🍵 龙井茶室下午茶8折优惠中', type: 'promo', detail: '湖滨路龙井茶室今日下午茶套餐8折优惠（含龙井茶+桂花糕+荷花酥）。' }
    ]
  },
  gugong: {
    scenicArea: {
      id: 'gugong', name: '故宫博物院', city: '北京', visitors: 18450, heatLevel: 5,
      geofence: { lat: 39.9163, lng: 116.3971, radius: 1500 }
    },
    guide: { id: 'xiaogu', name: '小故', title: '故宫AI文化使者', avatarUrl: '/avatars/gugong_avatar.png', botIcon: '👸' },
    poiData: [
      { id: 'taihotien', name: '太和殿', icon: '🏯', position: { x: 0.5, y: 0.65 }, lng: 116.3970, lat: 39.9163, distance: '100m', narration: '眼前这座宏伟的殿宇便是太和殿，俗称金銮殿。作为紫禁城内等级最高的建筑，明清两代的重大典礼皆在此举行，尽显皇家威仪与浩荡气象。', image: 'https://picsum.photos/id/65/400/240' },
      { id: 'qianqing', name: '乾清宫', icon: '👑', position: { x: 0.5, y: 0.45 }, lng: 116.3970, lat: 39.9189, distance: '300m', narration: '现在看到的乾清宫，曾是明代及清初帝王理政与安寝的核心之所。殿内高悬的“正大光明”匾额，见证了无数历史转折与风云际会。', image: 'https://picsum.photos/id/66/400/240' },
      { id: 'jingyang', name: '景阳宫', icon: '🏛️', position: { x: 0.7, y: 0.35 }, lng: 116.3995, lat: 39.9198, distance: '500m', narration: '步入东六宫之一的景阳宫，便远离了中轴线的喧嚣。在此您可以放慢脚步，静赏古建筑的红墙黄瓦，体味岁月沉淀下的深宫幽静。', image: 'https://picsum.photos/id/67/400/240' }
    ],
    aiResponses: {
      history: ['故宫又称紫禁城，于明永乐四年始建，历经明清两代共二十四位帝王更迭，是现存规模最大的木质结构古建筑群。'],
      route: ['故宫游览建议依循中轴线：自午门而入，经太和殿广场，游三大殿，过乾清宫，最后步入御花园，由神武门而出，览尽宫城中轴气象。'],
      tips: ['参观紫禁城需履平底便鞋。巍巍宫城，广厦千间，走完全程需一定的体力与耐心。'],
      food: ['宫中角楼咖啡与冰窖餐厅皆可供您暂歇。在青砖红墙下品茗小憩，似乎也能品出几分历史的余味。'],
      photo: ['故宫的红墙黄瓦历经沧桑，极具画卷之美。只需一扇半掩的朱漆大门，或太和广场的白玉栏杆，便能定格下充满历史感的瞬间。'],
      fallback: ['您身处这座历经六百年风雨的宫城中，若对古建制式、宫廷轶事有任何好奇，不妨向我问起，我愿为您解答。']
    },
    geofenceMessages: [
      { id: 'g1', text: '🏛️ 钟表馆定时演示 14:00 即将开始', type: 'event', detail: '钟表馆内正在进行古代西洋钟表的机械演示，精彩不容错过。' },
      { id: 'g2', text: '🍦 故宫神兽冰棍 凭门票买一送一', type: 'promo', detail: '今日冰窖餐厅特供，凭借故宫门票可享受脊兽冰棍买一送一。' }
    ]
  },
  antspace: {
    scenicArea: {
      id: 'antspace', name: '当前位置 (蚂蚁空间)', city: '杭州', visitors: 120, heatLevel: 1,
      geofence: null // 无围栏触发
    },
    guide: { id: 'xiaoyou', name: '小游', title: '全能AI小助手', avatarUrl: '/avatars/antspace_avatar.png', botIcon: '🧑‍🚀' },
    poiData: [
      { id: 'ant-coffee', name: '前台咖啡', icon: '☕', position: { x: 0.3, y: 0.4 }, lng: 120.1182, lat: 30.2685, distance: '10m', narration: '您现在所在的位置是蚂蚁空间。前台的现磨咖啡醇香四溢，不仅是工作间隙的放松，更蕴含着开放迎客的现代待客之道。', image: 'https://picsum.photos/id/42/400/240' },
      { id: 'ant-garden', name: '露台花园', icon: '🪴', position: { x: 0.7, y: 0.6 }, lng: 120.1188, lat: 30.2680, distance: '50m', narration: '移步露台花园，这里绿植葱茏，错落有致。这片都市里的自然绿洲，为理性的科技空间平添了一抹生机的诗意。', image: 'https://picsum.photos/id/114/400/240' }
    ],
    aiResponses: {
      history: ['此处为现代化的办公与展示空间，以科技为核，以创新为名。虽无厚重的千古积淀，却正在这片土地上书写着未来与可能。'],
      route: ['漫步于蚂蚁空间的办公区，您可以随性参观其开放设计，亦可驻足休闲区，品尝一杯手冲咖啡，感受科技职场的流动与活力。'],
      tips: ['在办公区域游览时，请放轻脚步。若对陈列的科技互动装置感兴趣，可用摄像头向我展示，我将为您解读其中的技术奥秘。'],
      food: ['附近配有员工食堂与咖啡厅，环境清雅，设施便利，您可随时前往体验。'],
      photo: ['现代科技元素与空间美学在此交汇。您可开启摄像头，拍下这些充满未来感的细节，让我为您分析其中深意。'],
      fallback: ['虽然我们并未置身名山大川，但这片科技空间亦有其独到之处。若您需要周边设施指引或解读所见之物，我随时在此。']
    },
    geofenceMessages: []
  }
};

// 关键词映射
export const keywordMap = {
  '历史': 'history', '由来': 'history', '故事': 'history', '传说': 'history',
  '白蛇': 'history', '苏东坡': 'history', '白居易': 'history', '遗产': 'history',
  '路线': 'route', '怎么走': 'route', '推荐': 'route', '规划': 'route', '行程': 'route',
  '攻略': 'tips', '建议': 'tips', '注意': 'tips', '贴士': 'tips', '门票': 'tips', '天气': 'tips',
  '吃': 'food', '美食': 'food', '餐厅': 'food', '龙井': 'food', '小吃': 'food', '茶': 'food',
  '拍照': 'photo', '拍': 'photo', '照片': 'photo', '打卡': 'photo', '摄影': 'photo'
};

// 围栏特色消息
export const geofenceMessages = [
  { id: 'm1', text: '🎭 14:00 断桥·白蛇传沉浸话剧即将开演', type: 'event', detail: '断桥·白蛇传沉浸式话剧今日14:00在断桥旁演出，时长45分钟，免费观看。建议提前15分钟到场占位。' },
  { id: 'm2', text: '🍵 龙井茶室下午茶8折优惠中', type: 'promo', detail: '湖滨路龙井茶室今日下午茶套餐8折优惠（含龙井茶+桂花糕+荷花酥），原价88元，现价68元。出示此消息即可享受优惠。' },
  { id: 'm3', text: '📸 三潭印月今日最佳拍照时间 16:30', type: 'tip', detail: '根据今日天气和光线预测，三潭印月最佳拍摄时间为16:30-17:15，届时夕阳斜照，湖面金光粼粼，建议从花港观鱼码头乘船前往。' },
  { id: 'm4', text: '🚢 画舫游船末班17:30，余位12个', type: 'service', detail: '西湖画舫游船今日末班17:30发船，目前余位12个。路线：湖滨码头→三潭印月→花港码头，全程约50分钟。票价55元/人含登岛费。' }
];
