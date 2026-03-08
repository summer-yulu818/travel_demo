# AI 伴游 - 数字化智能旅游伴侣 🚀

![Banner](https://img.shields.io/badge/V4-React_Vite-blue?style=for-the-badge) ![Version](https://img.shields.io/badge/Phase-1_Complete-green?style=for-the-badge)

这是一款基于数字人、视觉大模型与地图 LBS 技术的智能伴游应用。它能够为游客提供沉浸式的景点讲解、实景拍照识别以及全方位的历史人文深度游览体验。

---

## 🗺️ 总体研发计划 & 进度 (Overall Roadmap)

目前项目已从原生的 Vanilla JS 原型平滑迁移至 **React + TypeScript + Zustand** 现代化工程体系，并完成了第一阶段的核心交互闭环。

### ✅ 第一阶段：技术架构重构与交互闭环 (已完成)
- [x] **React + Vite 工程化重构**：引入 Zustand 状态管理与 TailwindCSS 样式系统。
- [x] **智能导览引擎重构**：实现基于热区点播的“手/自动”双维导览切换模式。
- [x] **视觉与交互精雕**：
  - 聊天气泡自动跟随平滑滚动（Auto-scroll）。
  - 全线 SVG 矢量图标库替换（语音/照相/发送）。
  - 双侧真人头像显示，提升对话沉浸感。
- [x] **核心功能跑通**：包括数字人自动寻访、实景照片推送、大模型模拟解说。

### 🚀 第二阶段：真实生态 SDK 接入 (进行中)
- [ ] **商业地图引擎整合**：将 Canvas 概念图替换为 **高德/腾讯地图 JS API**，实现真实 GPS 对位。
- [ ] **大模型生产级接入**：
  - 对接 **DashScope (通义千问)** / **智谱 AI** 进行真实流式 SSE 对话。
  - 对接 **Qwen-VL** 等多模态模型实现真实的拍摄识景。
- [ ] **商业级语音识别与合成**：接入云端拟音 ASR & TTS，提供音色动听、情感丰富的专属导游配音。

### 🎨 第三阶段：数字人引擎升级 (Future)
- [ ] **音唇同步 (Lip-sync)**：结合 TTS 音节流，实现数字人口型与语音的精准匹配。
- [ ] **3D/Lottie 资产升级**：渲染更高质量、更具动感的 3D 数字人模型。

### 📊 第四阶段：商业化与运营后台 (Future)
- [ ] **CMS 内容管理系统**：支持景区管理员在线框选围栏、配置景点解说词与推送卡片。
- [ ] **打卡激励体系**：数字勋章收集与旅游轨迹图生成。

---

## 🛠️ 技术选型
- **Frontend**: React 18, Vite, TailwindCSS (V4)
- **State Management**: Zustand
- **Animations**: CSS3, Framer Motion
- **Icons**: Heroicons (SVG Based)
- **Data Source**: Custom Scenic Area JSON

## 📦 开发者指南
1. **安装依赖**：
   ```bash
   npm install
   ```
2. **本地调试**：
   ```bash
   npm run dev
   ```
3. **环境变量**：
   参考 `.env.example` 配置你的 API Keys 并在本地创建 `.env.local`。

---
*Powered by Advanced Agentic Coding Framework.*
