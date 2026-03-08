/**
 * AI伴游 · 西湖 — V3 Main
 * 沉浸式单屏：地图（主）+ 摄像头画中画 + 对话区 + 数字人浮窗
 */

import './style.css';
import { locations, keywordMap } from './data/scenic-data.js';

let currentLocId = 'westlake';
let currentLoc = locations[currentLocId];
let { scenicArea, poiData, aiResponses, geofenceMessages, guide } = currentLoc;

// ================================
//  State
// ================================
const state = {
    currentPoi: null,
    userPos: { x: 0.55, y: 0.22 },
    avatarPaused: false,
    avatarTalking: false,
    bubbleTimer: null,
    simRunning: false,
    steps: 0,
    cameraActive: false,
    gfMsgIndex: 0,
    isDragging: false,
    dragOffset: { x: 0, y: 0 }
};

const walkPath = [
    { x: 0.58, y: 0.18, poi: 'broken-bridge' },
    { x: 0.52, y: 0.25, poi: 'autumn-moon' },
    { x: 0.32, y: 0.22, poi: 'lingyin-temple' },
    { x: 0.18, y: 0.30, poi: 'double-peaks' },
    { x: 0.28, y: 0.45, poi: 'su-causeway' },
    { x: 0.42, y: 0.55, poi: 'three-pools' },
    { x: 0.30, y: 0.68, poi: 'flower-harbor' },
    { x: 0.60, y: 0.72, poi: 'oriole-singing' },
    { x: 0.42, y: 0.78, poi: 'leifeng-sunset' },
    { x: 0.48, y: 0.85, poi: 'nanping-bell' },
];
let walkIdx = -1;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ================================
//  Init
// ================================
document.addEventListener('DOMContentLoaded', () => showSplash());

function initApp() {
    updateClock(); setInterval(updateClock, 30000);
    initMap(); renderPOIs();
    initCamera();
    initChat();
    initGeofenceBar();
    initAvatarDrag();
    initAvatarToggle();
    initBgParticles();
    startSimulation();
    startStepCounter();

    // 监听切换
    $('#locSelect').addEventListener('change', e => {
        switchLocation(e.target.value);
    });

    // 初始化数字人外观类和道具
    $('#avatarChar').className = `avatar-char guide-${guide.id}`;
    const fan = $('#avatarChar .av-fan');
    if (fan) fan.textContent = guide.id === 'xiaogu' ? '🏮' : (guide.id === 'xiaoyou' ? '📱' : '🪭');

    setTimeout(() => {
        avatarSpeak(`欢迎莅临${scenicArea.name}。我是${guide.title}${guide.name}，很高兴为您引路。轻触地图上的兴趣点，让我为您细细道来这片风景的过往。`);
    }, 800);
}

function switchLocation(locId) {
    if (locations[locId]) {
        currentLocId = locId;
        currentLoc = locations[locId];
        scenicArea = currentLoc.scenicArea;
        poiData = currentLoc.poiData;
        aiResponses = currentLoc.aiResponses;
        geofenceMessages = currentLoc.geofenceMessages;
        guide = currentLoc.guide;

        // 更新数字人信息及道具
        $('#avNameTag').textContent = guide.name;
        $('#welcomeName').textContent = guide.name;
        $('#welcomeDesc').textContent = `${guide.title}～ 有什么想了解的尽管问我！`;
        $('#avatarChar').className = `avatar-char guide-${guide.id}`;
        const fan = $('#avatarChar .av-fan');
        if (fan) fan.textContent = guide.id === 'xiaogu' ? '🏮' : (guide.id === 'xiaoyou' ? '📱' : '🪭');

        // 停止上个场景的资源
        window.speechSynthesis.cancel();
        state.gfMsgIndex = 0;

        // 重绘UI
        const c = $('#mapCanvas');
        if (c) drawMap(c.getContext('2d'), c.width / 2, c.height / 2);
        state.currentPoi = null;
        renderPOIs();
        initGeofenceBar();

        // 欢迎语
        avatarSpeak(`已为您切换至${scenicArea.name}。我是${guide.name}，这里又有一番别样天地，愿与您一同探寻。`);
    }
}

// ================================
//  Splash
// ================================
function showSplash() {
    const fill = $('#splashFill');
    let p = 0;
    const iv = setInterval(() => {
        p += Math.random() * 18 + 5;
        if (p > 100) p = 100;
        fill.style.width = p + '%';
        if (p >= 100) {
            clearInterval(iv);
            setTimeout(() => {
                $('#splash').classList.add('out');
                initApp();
                setTimeout(() => $('#splash').style.display = 'none', 600);
            }, 300);
        }
    }, 100);
}

// ================================
//  Clock & Steps
// ================================
function updateClock() {
    const n = new Date();
    $('#sbTime').textContent = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}
function startStepCounter() {
    setInterval(() => {
        if (state.simRunning) {
            state.steps += Math.floor(Math.random() * 10 + 3);
        }
    }, 3000);
}

// ================================
//  Background Particles
// ================================
function initBgParticles() {
    const c = $('#bgFx'); if (!c) return;
    const ctx = c.getContext('2d');
    const pts = [];
    function resize() { c.width = c.parentElement.offsetWidth; c.height = c.parentElement.offsetHeight; }
    resize(); window.addEventListener('resize', resize);
    for (let i = 0; i < 30; i++) {
        pts.push({
            x: Math.random() * c.width, y: Math.random() * c.height,
            vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
            r: Math.random() * 1.5 + .5, a: Math.random() * .3 + .1
        });
    }
    (function anim() {
        ctx.clearRect(0, 0, c.width, c.height);
        pts.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > c.width) p.vx *= -1;
            if (p.y < 0 || p.y > c.height) p.vy *= -1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(59,130,246,${p.a})`; ctx.fill();
            pts.slice(i + 1).forEach(p2 => {
                const d = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (d < 90) {
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(59,130,246,${.06 * (1 - d / 90)})`; ctx.lineWidth = .5; ctx.stroke();
                }
            });
        });
        requestAnimationFrame(anim);
    })();
}

// ================================
//  Map
// ================================
function initMap() {
    const c = $('#mapCanvas'), ctx = c.getContext('2d');
    function resize() {
        const r = c.parentElement.getBoundingClientRect();
        c.width = r.width * 2; c.height = r.height * 2;
        c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
        ctx.scale(2, 2); drawMap(ctx, r.width, r.height);
    }
    resize(); window.addEventListener('resize', resize);
    $('#btnLocate').addEventListener('click', () => {
        const m = $('#userMk');
        if (m) {
            m.style.transition = 'none'; m.style.transform = 'translate(-50%,-50%) scale(1.8)';
            setTimeout(() => { m.style.transition = 'transform .4s'; m.style.transform = 'translate(-50%,-50%) scale(1)' }, 200);
        }
    });
}

function drawMap(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    // 背景通用
    const bg = ctx.createRadialGradient(w * .5, h * .5, 0, w * .5, h * .5, w * .7);
    if (currentLocId === 'gugong') {
        bg.addColorStop(0, '#fef0e6'); bg.addColorStop(.6, '#fde6cd'); bg.addColorStop(1, '#fad1af');
    } else if (currentLocId === 'antspace') {
        bg.addColorStop(0, '#f8fafc'); bg.addColorStop(.6, '#f1f5f9'); bg.addColorStop(1, '#e2e8f0');
    } else {
        bg.addColorStop(0, '#EFF6FF'); bg.addColorStop(.6, '#DBEAFE'); bg.addColorStop(1, '#BFDBFE');
    }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = currentLocId === 'gugong' ? 'rgba(239,68,68,0.05)' : 'rgba(59,130,246,0.05)';
    ctx.lineWidth = .5;
    for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

    if (currentLocId === 'westlake') {
        // 西湖水域
        ctx.fillStyle = 'rgba(59,130,246,0.08)';
        ctx.beginPath(); ctx.ellipse(w * .42, h * .5, w * .28, h * .38, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(59,130,246,0.12)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(w * .42, h * .5, w * .28, h * .38, 0, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = 'rgba(59,130,246,0.05)';
        ctx.beginPath(); ctx.ellipse(w * .38, h * .5, w * .12, h * .15, 0, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = 'rgba(16,185,129,0.2)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(w * .28, h * .15); ctx.lineTo(w * .30, h * .80); ctx.stroke();
        ctx.fillStyle = 'rgba(16,185,129,0.12)'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('苏堤', w * .26, h * .50);

        ctx.strokeStyle = 'rgba(245,158,11,0.15)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(w * .42, h * .22); ctx.lineTo(w * .62, h * .18); ctx.stroke();
        ctx.fillStyle = 'rgba(245,158,11,0.12)'; ctx.fillText('白堤', w * .52, h * .17);

        const tp = [{ x: w * .38, y: h * .52 }, { x: w * .42, y: h * .56 }, { x: w * .46, y: h * .52 }];
        tp.forEach(p => { ctx.fillStyle = 'rgba(59,130,246,0.15)'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });

        ctx.fillStyle = 'rgba(16,185,129,0.06)';
        drawHill(ctx, w * .08, h * .25, w * .15, h * .20);
        drawHill(ctx, w * .12, h * .35, w * .12, h * .15);
        drawHill(ctx, w * .65, h * .70, w * .18, h * .22);

        ctx.fillStyle = 'rgba(30,58,95,0.1)'; ctx.font = 'bold 9px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('西   湖', w * .42, h * .48);
    }
    else if (currentLocId === 'gugong') {
        // 故宫外框
        ctx.strokeStyle = 'rgba(239,68,68,0.2)'; ctx.lineWidth = 2;
        ctx.strokeRect(w * .2, h * .1, w * .6, h * .8);
        ctx.fillStyle = 'rgba(239,68,68,0.1)';
        // 三大殿
        ctx.fillRect(w * .4, h * .6, w * .2, h * .1);
        ctx.fillRect(w * .42, h * .48, w * .16, h * .06);
        ctx.fillRect(w * .38, h * .35, w * .24, h * .08);

        ctx.fillStyle = 'rgba(234,88,12,0.3)'; ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('紫禁城', w * .5, h * .85);
    }
    else if (currentLocId === 'antspace') {
        // 蚂蚁空间办公区
        ctx.strokeStyle = 'rgba(14,165,233,0.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(w * .1, h * .2, w * .8, h * .6);
        ctx.fillStyle = 'rgba(14,165,233,0.05)';
        ctx.fillRect(w * .15, h * .3, w * .2, h * .2);
        ctx.fillRect(w * .65, h * .5, w * .2, h * .2);
        ctx.beginPath(); ctx.arc(w * .5, h * .5, w * .1, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(14,165,233,0.3)'; ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('蚂蚁空间 (A空间)', w * .5, h * .48);
    }

    drawCompass(ctx, w - 24, 20, 12);
}

function drawHill(ctx, x, y, w, h) {
    ctx.beginPath(); ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x + w * .5, y - h * .2, x + w, y + h);
    ctx.fill();
}

function drawCompass(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(59,130,246,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('N', 0, -r - 4);
    ctx.beginPath(); ctx.moveTo(0, -r + 3); ctx.lineTo(-2.5, 1); ctx.lineTo(2.5, 1); ctx.fill();
    ctx.fillStyle = 'rgba(30,58,95,0.2)';
    ctx.beginPath(); ctx.moveTo(0, r - 3); ctx.lineTo(-2.5, -1); ctx.lineTo(2.5, -1); ctx.fill();
    ctx.restore();
}

// ================================
//  POI
// ================================
function renderPOIs() {
    const c = $('#poiLayer'); c.innerHTML = '';
    // 用户
    const um = document.createElement('div');
    um.className = 'user-mk'; um.id = 'userMk';
    um.innerHTML = '<div class="user-dot"></div>';
    um.style.left = state.userPos.x * 100 + '%'; um.style.top = state.userPos.y * 100 + '%';
    c.appendChild(um);
    // POIs
    poiData.forEach((p, i) => {
        const m = document.createElement('div');
        m.className = `poi-mk${state.currentPoi?.id === p.id ? ' active' : ''}`;
        m.id = `poi-${p.id}`;
        m.innerHTML = `<div class="pi"><span>${p.icon}</span></div><div class="pl">${p.name}</div>`;
        m.style.left = p.position.x * 100 + '%'; m.style.top = p.position.y * 100 + '%';
        m.style.animationDelay = i * .06 + 's';
        m.addEventListener('click', () => selectPOI(p));
        c.appendChild(m);
    });
}

function selectPOI(poi) {
    state.currentPoi = poi;
    $$('.poi-mk').forEach(m => m.classList.remove('active'));
    $(`#poi-${poi.id}`)?.classList.add('active');
    if (!state.avatarPaused) avatarSpeak(poi.narration, poi.image);
}

// ================================
//  Arrival Toast
// ================================
function showArrival(name) {
    const t = $('#arrivalToast'); if (!t) return;
    t.classList.remove('hidden'); $('#atName').textContent = name;
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 500) }, 2500);
}

// ================================
//  Camera PiP
// ================================
let cameraFacingMode = 'environment';
let cameraStream = null;

function startCamera() {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); }
    if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode }, audio: false })
            .then(stream => {
                cameraStream = stream;
                $('#cameraVideo').srcObject = stream;
                state.cameraActive = true;
            })
            .catch(() => showCameraFallback());
    } else { showCameraFallback(); }
}

function initCamera() {
    startCamera();

    // 翻转镜头
    $('#pipFlip')?.addEventListener('click', () => {
        cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
        startCamera();
    });

    // 拍照
    $('#pipShutter').addEventListener('click', takePhoto);

    // PiP 拖拽
    const pip = $('#cameraPip');
    let startX, startY, origL, origT;
    pip.addEventListener('pointerdown', e => {
        if (e.target.closest('.pip-shutter')) return;
        startX = e.clientX; startY = e.clientY;
        origL = pip.offsetLeft; origT = pip.offsetTop;
        const onMove = ev => {
            pip.style.left = (origL + ev.clientX - startX) + 'px';
            pip.style.top = (origT + ev.clientY - startY) + 'px';
        };
        const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });
}

function showCameraFallback() {
    const v = $('#cameraVideo');
    v.style.display = 'none';
    const pip = $('#cameraPip');
    pip.style.background = 'linear-gradient(135deg,#DBEAFE,#BFDBFE)';
    const label = pip.querySelector('.pip-label');
    label.textContent = '📷 模拟取景';
}

function takePhoto() {
    const btn = $('#pipShutter');
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), 300);

    if (state.cameraActive) {
        const video = $('#cameraVideo');
        const canvas = $('#photoCanvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        sendPhotoMessage(dataUrl);
    } else {
        // 模拟照片
        sendPhotoMessage(null);
    }
}

function sendPhotoMessage(dataUrl) {
    const msgs = $('#chatMessages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg user';
    if (dataUrl) {
        msg.innerHTML = `<div class="msg-av">🧑</div><div><div class="msg-img"><img src="${dataUrl}" alt="拍照"/></div><div class="msg-body">这处景致颇为独特，可否为我讲解一二？</div></div>`;
    } else {
        msg.innerHTML = `<div class="msg-av">🧑</div><div class="msg-body">📸 [拍照] 这处景致颇为独特，可否为我讲解一二？</div>`;
    }
    msgs.appendChild(msg);
    scrollChat();

    // AI回复
    showTyping();
    setTimeout(() => {
        removeTyping();
        const resp = aiResponses.photo[Math.floor(Math.random() * aiResponses.photo.length)];
        addBotMsg(resp);
    }, 1200);
}

// ================================
//  Geofence Bar
// ================================
let gfInterval = null;
let viInterval = null;

function initGeofenceBar() {
    const bar = $('.geofence-bar');
    const marquee = $('#gfMarquee');

    if (gfInterval) clearInterval(gfInterval);
    if (viInterval) clearInterval(viInterval);

    // 如果该场景没有围栏属性（例如蚂蚁空间），隐藏信息条
    if (!scenicArea.geofence || geofenceMessages.length === 0) {
        if (bar) bar.style.display = 'none';
        return;
    } else {
        if (bar) bar.style.display = 'flex';
    }

    renderGfMsg();
    gfInterval = setInterval(() => {
        state.gfMsgIndex = (state.gfMsgIndex + 1) % Math.max(1, geofenceMessages.length);
        renderGfMsg();
    }, 6000);

    function renderGfMsg() {
        if (geofenceMessages.length === 0) return;
        const msg = geofenceMessages[state.gfMsgIndex];
        marquee.innerHTML = '';
        const el = document.createElement('div');
        el.className = 'gf-msg';
        el.textContent = msg.text;
        el.addEventListener('click', () => showServiceGuide(msg));
        marquee.appendChild(el);
    }

    // 人数波动
    $('#gfVisitors').textContent = scenicArea.visitors.toLocaleString();
    viInterval = setInterval(() => {
        const v = scenicArea.visitors + Math.floor(Math.random() * 40 - 20);
        $('#gfVisitors').textContent = v.toLocaleString();
    }, 5000);
}

function showServiceGuide(msg) {
    const msgs = $('#chatMessages');
    // 系统消息
    const card = document.createElement('div');
    card.className = 'chat-msg bot';
    card.innerHTML = `
    <div class="msg-av">🏞️</div>
    <div class="msg-body">
      <div class="service-card">
        <h4>${msg.text}</h4>
        <p>${msg.detail}</p>
        <span class="sc-action">查看详情 →</span>
      </div>
    </div>`;
    msgs.appendChild(card);
    scrollChat();

    if (!state.avatarPaused) {
        avatarSpeak(`收到景区消息：${msg.text.replace(/[🎭🍵📸🚢]/g, '').trim()}`);
    }
}

// ================================
//  Avatar
// ================================
function initAvatarDrag() {
    const el = $('#avatarFloat');
    let sx, sy, ox, oy;
    el.addEventListener('pointerdown', e => {
        if (e.target.closest('.av-toggle')) return;
        sx = e.clientX; sy = e.clientY;
        ox = el.offsetLeft; oy = el.offsetTop;
        el.classList.add('dragging');
        const onMove = ev => {
            el.style.right = 'auto'; el.style.bottom = 'auto';
            el.style.left = (ox + ev.clientX - sx) + 'px';
            el.style.top = (oy + ev.clientY - sy) + 'px';
        };
        const onUp = () => { el.classList.remove('dragging'); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });
}

function initAvatarToggle() {
    const btn = $('#avToggle');
    btn.addEventListener('click', () => {
        state.avatarPaused = !state.avatarPaused;
        const float = $('#avatarFloat');
        const statusEl = $('#avStatus');
        if (state.avatarPaused) {
            float.classList.remove('guiding');
            float.classList.add('paused');
            btn.textContent = '▶️';
            statusEl.innerHTML = '<i class="status-dot off"></i>已暂停';
            enableInputBar();
            avatarSpeak('已切至对话模式。若您有任何好奇，欢迎随时通过文字或语音与我交流。');
        } else {
            float.classList.remove('paused');
            float.classList.add('guiding');
            btn.textContent = '🔄';
            statusEl.innerHTML = '<i class="status-dot on"></i>在线';
            disableInputBar();
            avatarSpeak('导览模式已恢复。我将伴随您的前行，继续为您述说风景的故事。');
        }
    });

    // 初始状态如果是导览中，应当禁用
    if (!state.avatarPaused) disableInputBar();
}

function disableInputBar() {
    $('#chatInputBar').classList.add('disabled');
    $('#chatInput').blur();
}
function enableInputBar() {
    $('#chatInputBar').classList.remove('disabled');
}

// ---- TTS Voice 选取 ----
let cachedVoice = null;

function pickBestVoice() {
    if (cachedVoice) return cachedVoice;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // 按优先级排序的中文女声关键词
    const zhVoices = voices.filter(v => /zh[-_]?CN/i.test(v.lang) || /cmn/i.test(v.lang) || /chinese/i.test(v.name));

    // 优先级：Premium > Enhanced > Natural > Tingting/Sinji > 任意中文
    const priority = [
        v => /premium/i.test(v.name),
        v => /enhanced/i.test(v.name),
        v => /natural/i.test(v.name),
        v => /tingting/i.test(v.name),
        v => /sinji/i.test(v.name),
        v => /lili/i.test(v.name),
        v => /female/i.test(v.name),
        v => true // 兜底
    ];

    for (const fn of priority) {
        const found = zhVoices.find(fn);
        if (found) { cachedVoice = found; return found; }
    }
    return null;
}

// 异步加载 voice 列表
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickBestVoice(); };
    pickBestVoice();
}

function avatarSpeak(text, imgUrl = null) {
    const mouth = $('#avMouth');

    // 创建导览消息气泡在对话区内
    const c = $('#chatMessages');
    const d = document.createElement('div');
    d.className = 'chat-msg bot guiding';
    d.innerHTML = `<div class="msg-av">🏞️</div><div class="msg-body"><div class="msg-text"></div></div>`;
    c.appendChild(d); scrollChat();

    const textBody = d.querySelector('.msg-text');
    const msgBodyWrap = d.querySelector('.msg-body');

    mouth.classList.add('talk');
    state.avatarTalking = true;

    // TTS 语音输出
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';

    // 挑选最优音色
    const voice = pickBestVoice();
    if (voice) utter.voice = voice;

    // 柔和参数：略慢的语速 + 偏高的音调（女声更自然）
    utter.rate = 0.92;
    utter.pitch = 1.15;
    utter.volume = 0.9;

    // 打字机逐字输出（约100ms/字，与中文朗读速度大致匹配）
    const typeInterval = 100;

    const appendImage = () => {
        if (imgUrl && !msgBodyWrap.querySelector('.msg-image-attachment')) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.className = 'msg-image-attachment';
            img.onload = scrollChat;
            msgBodyWrap.appendChild(img);
            scrollChat();
        }
    };

    let i = 0;
    const iv = setInterval(() => {
        if (i < text.length) {
            textBody.textContent += text[i];
            i++;
            scrollChat();
        } else {
            clearInterval(iv);
            appendImage();
        }
    }, typeInterval);

    const finishGuiding = () => {
        mouth.classList.remove('talk');
        state.avatarTalking = false;
        d.classList.remove('guiding');
        clearInterval(iv);
        textBody.textContent = text; // 兜底全量显示
        appendImage();
    };

    utter.onend = finishGuiding;

    // 防止 Chrome 长文本静默 bug：分段朗读
    if (text.length > 80) {
        const sentences = text.match(/[^。！？，、；]+[。！？，、；]?/g) || [text];
        let idx = 0;
        function speakNext() {
            if (idx >= sentences.length) return;
            const u = new SpeechSynthesisUtterance(sentences[idx]);
            u.lang = 'zh-CN';
            if (voice) u.voice = voice;
            u.rate = 0.92; u.pitch = 1.15; u.volume = 0.9;
            u.onend = () => { idx++; speakNext(); };
            if (idx === sentences.length - 1) {
                u.onend = finishGuiding;
            }
            window.speechSynthesis.speak(u);
        }
        speakNext();
    } else {
        window.speechSynthesis.speak(utter);
    }
}

// ================================
//  Chat
// ================================
function initChat() {
    $('#btnSend').addEventListener('click', sendMessage);
    $('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

    // 快捷按钮
    $$('.qb').forEach(b => b.addEventListener('click', () => {
        $('#chatInput').value = b.dataset.msg; sendMessage();
    }));

    // 语音模拟
    $('#btnVoice').addEventListener('click', () => {
        if ($('#chatInputBar').classList.contains('disabled')) return;
        const btn = $('#btnVoice');
        btn.classList.toggle('recording');
        if (btn.classList.contains('recording')) {
            setTimeout(() => {
                btn.classList.remove('recording');
                $('#chatInput').value = '推荐一条西湖游览路线';
                sendMessage();
            }, 2000);
        }
    });

    // 开关摄像头
    $('#btnCameraToggle').addEventListener('click', () => {
        const pip = $('#cameraPip');
        if (pip.classList.contains('hidden')) {
            pip.classList.remove('hidden');
            startCamera();
        } else {
            pip.classList.add('hidden');
            if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
        }
    });
}

function sendMessage() {
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text) return;
    addUserMsg(text);
    input.value = '';
    showTyping();
    setTimeout(() => {
        removeTyping();
        const resp = getAIResponse(text);
        addBotMsg(resp);
    }, 800 + Math.random() * 1000);
}

function addUserMsg(text) {
    const c = $('#chatMessages');
    const d = document.createElement('div'); d.className = 'chat-msg user';
    d.innerHTML = `<div class="msg-av">🧑</div><div class="msg-body">${esc(text)}</div>`;
    c.appendChild(d); scrollChat();
}

function addBotMsg(text) {
    const c = $('#chatMessages');
    const d = document.createElement('div'); d.className = 'chat-msg bot';
    d.innerHTML = `<div class="msg-av">🏞️</div><div class="msg-body">${esc(text)}</div>`;
    c.appendChild(d); scrollChat();
}

function showTyping() {
    const c = $('#chatMessages');
    const d = document.createElement('div'); d.className = 'chat-msg bot'; d.id = 'typingInd';
    d.innerHTML = `<div class="msg-av">🏞️</div><div class="msg-body"><div class="typing-ind"><span></span><span></span><span></span></div></div>`;
    c.appendChild(d); scrollChat();
}
function removeTyping() { $('#typingInd')?.remove(); }

function getAIResponse(input) {
    const lower = input.toLowerCase();
    for (const poi of poiData) {
        if (input.includes(poi.name) || input.includes(poi.name.substring(0, 2))) return poi.narration;
    }
    for (const [kw, cat] of Object.entries(keywordMap)) {
        if (lower.includes(kw)) { const arr = aiResponses[cat]; if (arr) return arr[Math.floor(Math.random() * arr.length)]; }
    }
    return aiResponses.fallback[Math.floor(Math.random() * aiResponses.fallback.length)];
}

function scrollChat() { const c = $('#chatMessages'); requestAnimationFrame(() => c.scrollTop = c.scrollHeight); }
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// ================================
//  Simulation
// ================================
let tourActive = false;

async function startSimulation() {
    if (tourActive) return;
    tourActive = true;
    state.simRunning = true;

    // 辅助函数：等待指定毫秒
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // 辅助函数：等待直到数字人说完当前的话
    const waitUntilQuiet = async () => {
        while (state.avatarTalking) {
            await wait(500);
        }
    };

    // 初始等待（给欢迎语留出时间）
    await wait(2000);

    while (state.simRunning && currentLocId === 'westlake') {
        // 第一步：确保小溪当前没有说话
        await waitUntilQuiet();

        // 第二步：在两次讲解之间，停顿 3 秒
        const idleTime = 3000;
        await wait(idleTime);

        // 如果在停顿期间被切到别的场景或暂停了，直接检查
        if (!state.simRunning || currentLocId !== 'westlake') break;
        if (state.avatarPaused) {
            await wait(1000);
            continue;
        }

        // 第三步：移动到下一个点
        if (walkPath.length === 0) continue;
        walkIdx = (walkIdx + 1) % walkPath.length;
        const t = walkPath[walkIdx];

        animateUser(t.x, t.y);

        // 等待位置走过去（动画差不多此时完成）
        await wait(1800);

        if (t.poi && !state.avatarPaused && currentLocId === 'westlake') {
            const poi = poiData.find(p => p.id === t.poi);
            if (poi) {
                showArrival(poi.name);
                await wait(800);
                // 触发讲解，这也会把 avatarTalking 置为 true
                selectPOI(poi);
            }
        }
    }
    tourActive = false;
}

function animateUser(tx, ty) {
    const m = $('#userMk'); if (!m) return;
    const sx = state.userPos.x, sy = state.userPos.y;
    const dur = 2500, start = performance.now();
    function step(now) {
        const t = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        state.userPos.x = sx + (tx - sx) * e; state.userPos.y = sy + (ty - sy) * e;
        m.style.left = state.userPos.x * 100 + '%'; m.style.top = state.userPos.y * 100 + '%';
        updateDistances();
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function updateDistances() {
    poiData.forEach(p => {
        const d = Math.hypot(p.position.x - state.userPos.x, p.position.y - state.userPos.y);
        p.distance = Math.round(d * 1000) < 1000 ? `${Math.round(d * 1000)}m` : `${(d).toFixed(1)}km`;
    });
}
