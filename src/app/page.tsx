'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFlight } from '@/contexts/FlightContext';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  principle: string;
  keys: { key: string; label: string }[];
  animation: 'welcome' | 'pitch' | 'throttle' | 'engine' | 'takeoff' | 'gear' | 'flaps' | 'autopilot' | 'autothrottle' | 'reverse' | 'ground' | 'emergency_engine' | 'emergency_stall' | 'emergency_windshear' | 'ready';
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: '欢迎',
    description: '欢迎使用波音 777-9 飞行模拟器。777-9 是波音最新一代宽体客机，配备 GE9X 引擎，翼展 71.8 米，可搭载 426 名乘客，航程达 13,500 公里。本教程将引导您掌握所有飞行操控方法。',
    principle: '波音 777-9 采用复合材料机翼和先进的电传飞控系统，是目前世界上最大的双发宽体客机。其 GE9X 引擎单台推力达 115,000 磅力，是航空史上最强大的商用喷气引擎。',
    keys: [],
    animation: 'welcome',
  },
  {
    id: 2,
    title: '姿态控制',
    description: '使用方向键控制飞机姿态。上键拉杆（机头上仰），下键推杆（机头下俯），左右键控制滚转。姿态控制是飞行的基础。',
    principle: '飞机的姿态由三个控制面决定：升降舵（控制俯/俯仰角）、副翼（控制滚转/倾斜角）和方向舵（控制偏航）。拉杆时升降舵上偏，气流向下推尾部，机头上仰。副翼差动偏转使两侧机翼升力不等，飞机绕纵轴滚转。',
    keys: [
      { key: 'ArrowUp', label: '机头上仰（拉杆）— 升降舵上偏，增加迎角' },
      { key: 'ArrowDown', label: '机头下俯（推杆）— 升降舵下偏，减小迎角' },
      { key: 'ArrowLeft', label: '向左滚转 — 左副翼上偏、右副翼下偏' },
      { key: 'ArrowRight', label: '向右滚转 — 右副翼上偏、左副翼下偏' },
    ],
    animation: 'pitch',
  },
  {
    id: 3,
    title: '油门控制',
    description: '使用 W 和 S 键控制油门大小。W 键增加推力用于加速和爬升，S 键减少推力用于减速和下降。也可以直接拖动 EICAS 上的油门滑块。',
    principle: '喷气引擎通过加速空气产生推力。GE9X 引擎的风扇直径 3.4 米，涵道比 10:1，大量空气被加速向后喷出，根据牛顿第三定律产生向前的推力。N1 转速代表风扇/低压压气机转速，是推力的主要指标。油门从 IDLE（慢车）到 TOGA（起飞/复飞）对应 0-100%。',
    keys: [
      { key: 'w', label: '增加油门 — 提升 N1 转速，增大推力' },
      { key: 's', label: '减少油门 — 降低 N1 转速，减小推力' },
    ],
    animation: 'throttle',
  },
  {
    id: 4,
    title: '引擎控制',
    description: '使用 1 和 2 键分别控制左右引擎的开关。正常情况下两台引擎同时工作。在紧急情况下（如引擎故障）可以关闭单台引擎，飞机仍可依靠单发维持飞行。',
    principle: '777-9 是双发飞机，设计上可以在单发失效时继续安全飞行（ETOPS 认证）。关闭引擎后 N1 转速逐渐降为零，该侧推力消失。单发飞行时需要用方向舵抵消偏航力矩，并降低高度以维持飞行性能。',
    keys: [
      { key: '1', label: '左引擎（ENG 1）开关 — 切换左 GE9X 引擎' },
      { key: '2', label: '右引擎（ENG 2）开关 — 切换右 GE9X 引擎' },
    ],
    animation: 'engine',
  },
  {
    id: 5,
    title: '起飞程序',
    description: '标准起飞流程：① 设置襟翼到起飞位（5-15°）② 推油门至 TOGA（100%）③ 达到 V1 决断速度后继续起飞 ④ 达到 VR 抬轮速度（约 160 节）时拉杆抬头 ⑤ 正爬升率后收起落架。',
    principle: '起飞是飞行中最关键的阶段。机翼需要足够的空速产生大于重力的升力才能离地。V1 是决断速度——超过此速度必须继续起飞。VR（抬轮速度）是开始拉杆的速度。V2 是安全爬升速度。777-9 的典型起飞速度：V1≈150kts, VR≈160kts, V2≈175kts。',
    keys: [
      { key: ']', label: '放下襟翼至起飞位（增加升力系数）' },
      { key: 'w', label: '推满油门至 TOGA（最大起飞推力）' },
      { key: 'ArrowUp', label: '达到 VR 后拉杆抬头（约 15° 仰角）' },
      { key: 'g', label: '正爬升率后收起落架' },
    ],
    animation: 'takeoff',
  },
  {
    id: 6,
    title: '起落架',
    description: '按 G 键切换起落架收放状态。起飞后尽快收起以减少阻力，着陆前在进近阶段放下。起落架放下时会增加显著的气动阻力。',
    principle: '起落架是飞机上阻力最大的部件之一。收起落架可减少约 15-20% 的总阻力，对爬升性能影响显著。777-9 的主起落架有 6 个轮子（每侧 3 个），前起落架有 2 个轮子。收起后完全收入机身和机翼内部，保持气动外形光滑。',
    keys: [
      { key: 'g', label: '起落架收放 — 切换 UP/DOWN 状态' },
    ],
    animation: 'gear',
  },
  {
    id: 7,
    title: '襟翼控制',
    description: '使用 [ 和 ] 键调节襟翼角度。777-9 襟翼档位：0°/1°/5°/15°/20°/25°/30°。起飞用 5-15°，进近用 20-25°，着陆用 25-30°。',
    principle: '襟翼是机翼后缘的可伸展面板，放下时增大机翼弯度（camber）和有效面积，从而在低速时产生更大升力。这降低了失速速度，使飞机能在较低速度下安全飞行。但襟翼也增加阻力，所以巡航时收起。777-9 采用三缝襟翼设计，最大可提供额外 60% 的升力系数。',
    keys: [
      { key: ']', label: '襟翼放下 — 增加一档（增大升力和阻力）' },
      { key: '[', label: '襟翼收起 — 减少一档（减小升力和阻力）' },
    ],
    animation: 'flaps',
  },
  {
    id: 8,
    title: '自动驾驶',
    description: '按 P 键开启/关闭自动驾驶。开启后飞机自动维持 MCP 面板上设定的航向、高度和空速。可通过 MCP 旋钮调整目标值。',
    principle: '自动驾驶系统通过传感器（陀螺仪、加速度计、空速管）感知飞机状态，计算偏差后自动操纵控制面。航向模式通过副翼控制坡度角来改变航向；高度模式通过升降舵控制俯仰角来维持高度；速度模式通过自动油门来维持空速。777-9 的自动驾驶可在 CAT IIIb 条件下自动着陆（能见度低至 50 米）。',
    keys: [
      { key: 'p', label: '自动驾驶开关 — 接通/断开 A/P' },
    ],
    animation: 'autopilot',
  },
  {
    id: 9,
    title: '自动油门',
    description: '按 T 键开启/关闭自动油门。开启后系统自动调节引擎推力维持 MCP 面板上设定的目标空速。爬升时自动加油门，下降时自动收油门。',
    principle: '自动油门（A/T）系统通过比较当前空速与目标空速的差值，自动调节油门位置。采用 PID 控制算法：比例项响应当前偏差，积分项消除持续偏差，微分项预测趋势。最大调节速率约 5%/秒，防止推力突变。在进近阶段，A/T 可精确维持 Vref（参考着陆速度）。',
    keys: [
      { key: 't', label: '自动油门开关 — 接通/断开 A/T' },
    ],
    animation: 'autothrottle',
  },
  {
    id: 10,
    title: '反推装置',
    description: '反推是着陆后减速的关键系统。接地后将油门收至 IDLE，反推会自动激活（本模拟器中通过减小油门至 0% 模拟）。反推将引擎排气向前方偏转，产生反向推力。',
    principle: '反推装置通过机械挡板（cascade）将风扇气流向前方和侧方偏转，产生与飞行方向相反的力。777-9 的 GE9X 引擎采用平移式反推罩（translating cowl），反推罩向后滑动露出导流叶片。反推可提供约 40-50% 的最大正向推力，配合机轮刹车和扰流板，可在 1500-2000 米内完成着陆减速。反推仅在接地后使用，空中严禁使用。',
    keys: [
      { key: 's', label: '着陆后收油门至 IDLE — 模拟反推减速' },
    ],
    animation: 'reverse',
  },
  {
    id: 11,
    title: '地面操作',
    description: '飞机在地面时的操作与空中不同。地面滑行使用前轮转弯（本模拟器中方向键控制）。注意：地面摩擦力会限制加速性能，需要足够推力才能开始滑跑。草地/非铺装道面会显著增加阻力。',
    principle: '地面操作涉及前轮转弯系统（Nose Wheel Steering），由方向舵脚蹬控制，转弯角度通常限制在 ±7°（高速）到 ±70°（低速滑行）。在草地或非铺装道面上，滚动阻力系数可增加 5-10 倍，可能导致飞机无法起飞。777-9 的最小转弯半径约 30 米。地面滑行速度通常限制在 20-30 节。',
    keys: [
      { key: 'ArrowLeft', label: '地面左转 — 前轮向左偏转' },
      { key: 'ArrowRight', label: '地面右转 — 前轮向右偏转' },
      { key: 'w', label: '滑行加速 — 缓慢增加推力' },
    ],
    animation: 'ground',
  },
  {
    id: 12,
    title: '紧急情况：引擎故障',
    description: '单引擎失效是双发飞机最常见的紧急情况。处置程序：① 保持飞机控制（最重要！）② 确认故障引擎 ③ 关闭故障引擎 ④ 调整油门维持速度 ⑤ 宣布 MAYDAY ⑥ 寻找最近合适机场备降。777-9 设计上可以单发飞行超过 300 分钟（ETOPS-330）。',
    principle: '单发失效时，工作引擎的推力产生不对称偏航力矩，飞机会向失效引擎方向偏转。需要用方向舵（本模拟器中通过滚转控制模拟）抵消偏航。关键原则：Aviate（飞行）→ Navigate（导航）→ Communicate（通讯）。首先保持飞机可控，然后导航到安全区域，最后才通讯报告。单发时最大爬升高度约 25,000 英尺（driftdown altitude）。',
    keys: [
      { key: '1', label: '关闭故障引擎（如左发故障按 1）' },
      { key: 'w', label: '工作引擎加油门至最大连续推力（MCT）' },
      { key: 'ArrowLeft', label: '修正偏航（向工作引擎方向微调坡度）' },
      { key: 'ArrowDown', label: '如高度过高，适当推杆下降至漂移高度' },
    ],
    animation: 'emergency_engine',
  },
  {
    id: 13,
    title: '紧急情况：失速改出',
    description: '失速发生在迎角过大、空速过低时，机翼无法产生足够升力。改出程序：① 推杆低头（最重要！减小迎角）② 加油门至最大 ③ 改平机翼 ④ 速度恢复后柔和拉杆爬升。注意：失速时飞机可能剧烈抖动、机翼自动下坠，这是正常现象。',
    principle: '失速不是"引擎停了"，而是机翼迎角超过临界值（约 15-18°），气流从机翼上表面分离，升力急剧下降。任何速度、任何姿态都可能失速——关键因素是迎角而非空速。改出核心：减小迎角（推杆低头）。777-9 配备抖杆器（stick shaker）和推杆器（stick pusher），在接近失速时自动警告并推杆。模拟器中当空速低于失速速度时，会触发 STALL 语音警告。',
    keys: [
      { key: 'ArrowDown', label: '推杆低头 — 减小迎角（最关键的一步！）' },
      { key: 'w', label: '加油门至 TOGA — 最大推力恢复速度' },
      { key: 'ArrowLeft', label: '改平机翼 — 如有滚转，先改平' },
    ],
    animation: 'emergency_stall',
  },
  {
    id: 14,
    title: '紧急情况：风切变改出',
    description: '风切变是短距离内风向/风速剧烈变化，尤其在低空进近时极其危险。改出程序：① 立即加油门至 TOGA ② 拉杆至最佳爬升姿态（约 15°）③ 不要改变构型（不收襟翼/起落架）④ 跟随飞行指引仪 ⑤ 如无法爬升，执行复飞。',
    principle: '微下击暴流（microburst）是最危险的风切变类型：飞机先遭遇强逆风（空速增加），然后是下沉气流，最后是强顺风（空速骤降）。飞行员可能被第一阶段误导而减小推力，导致在第三阶段失去速度。改出关键：不要改变飞机构型（襟翼/起落架），因为改变构型会导致升力/阻力突变。777-9 配备预测性风切变警告系统（PWS），可在前方 3 海里探测风切变。',
    keys: [
      { key: 'w', label: '立即推满油门 TOGA — 最大推力' },
      { key: 'ArrowUp', label: '拉杆至 15° 仰角 — 最佳爬升姿态' },
    ],
    animation: 'emergency_windshear',
  },
  {
    id: 15,
    title: '准备起飞',
    description: '您已学习完所有操控方法和飞行原理。现在可以进入模拟飞行，体验驾驶波音 777-9 的乐趣！记住标准起飞流程：襟翼 → 油门 → 抬轮 → 收起落架。',
    principle: '完整飞行剖面：起飞（Takeoff）→ 爬升（Climb）→ 巡航（Cruise）→ 下降（Descent）→ 进近（Approach）→ 着陆（Landing）。每个阶段有不同的速度、高度和构型要求。777-9 的典型巡航参数：高度 35,000-43,000 英尺，马赫数 0.84（约 480 节 TAS），油耗约 6,800 公斤/小时。',
    keys: [],
    animation: 'ready',
  },
];

// SVG Animation Components - Enhanced visuals
function WelcomeAnimation() {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 1), 50);
    return () => clearInterval(interval);
  }, []);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="skyBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#020810" />
          <stop offset="40%" stopColor="#0a1628" />
          <stop offset="100%" stopColor="#1a3a5c" />
        </linearGradient>
        <radialGradient id="moonGlow" cx="85%" cy="15%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="strongGlow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="url(#skyBg)" />
      <rect width="400" height="240" fill="url(#moonGlow)" />
      {/* Aurora effect */}
      <ellipse cx="100" cy="60" rx="80" ry="30" fill="#00ff88" opacity="0.03">
        <animate attributeName="rx" values="80;120;80" dur="8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.02;0.06;0.02" dur="4s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="300" cy="40" rx="60" ry="25" fill="#4a8aba" opacity="0.04">
        <animate attributeName="rx" values="60;100;60" dur="6s" repeatCount="indefinite" />
      </ellipse>
      {/* Stars with twinkle */}
      {[...Array(40)].map((_, i) => (
        <circle key={i} cx={10 + (i * 13) % 390} cy={5 + (i * 7) % 90} r={0.5 + (i % 3) * 0.5} fill="white" opacity={0.3}>
          <animate attributeName="opacity" values={`${0.2 + (i % 4) * 0.15};${0.8 + (i % 2) * 0.2};${0.2 + (i % 4) * 0.15}`} dur={`${1.5 + (i % 5) * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* Shooting star */}
      <line x1={50 + (time * 3) % 400} y1={20 + (time * 2) % 60} x2={60 + (time * 3) % 400} y2={25 + (time * 2) % 60} stroke="white" strokeWidth="1.5" opacity={time % 80 < 10 ? 0.8 : 0}>
        <animate attributeName="opacity" values="0;0.8;0" dur="4s" repeatCount="indefinite" />
      </line>
      {/* 777-9 detailed side view with more detail */}
      <g transform="translate(200, 120)">
        <animateTransform attributeName="transform" type="translate" values="200,120;200,115;200,120" dur="5s" repeatCount="indefinite" />
        {/* Fuselage with gradient */}
        <ellipse cx="0" cy="0" rx="90" ry="10" fill="#d0d8e0" />
        <ellipse cx="0" cy="-2" rx="88" ry="6" fill="#e0e8f0" opacity="0.5" />
        <ellipse cx="0" cy="2" rx="85" ry="4" fill="#a0a8b0" opacity="0.3" />
        {/* Cockpit windows */}
        <path d="M 82,-4 L 90,-2 L 88,0 L 80,-2 Z" fill="#88ccff" opacity="0.8" />
        <path d="M 82,-4 L 90,-2 L 88,0 L 80,-2 Z" fill="none" stroke="#aaddff" strokeWidth="0.5" opacity="0.5" />
        {/* Windows row with animation */}
        {[...Array(18)].map((_, i) => (
          <rect key={i} x={-70 + i * 8} y="-4" width="4" height="2.5" rx="1" fill="#88ccff" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur={`${2 + i * 0.1}s`} repeatCount="indefinite" />
          </rect>
        ))}
        {/* Wings with winglets */}
        <polygon points="-25,-8 -75,-38 -68,-35 -18,-6" fill="#b0b8c0" />
        <polygon points="25,-8 75,-38 68,-35 18,-6" fill="#b0b8c0" />
        {/* Wing tips (raked) with glow */}
        <polygon points="-75,-38 -82,-42 -78,-38" fill="#a0a8b0" />
        <polygon points="75,-38 82,-42 78,-38" fill="#a0a8b0" />
        <circle cx="-80" cy="-40" r="2" fill="#ff0000" opacity="0.8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
        </circle>
        <circle cx="80" cy="-40" r="2" fill="#00ff00" opacity="0.8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
        </circle>
        {/* Tail with airline colors */}
        <polygon points="-78,-4 -92,-32 -85,-28 -75,-4" fill="#b0b8c0" />
        <polygon points="-88,-30 -92,-32 -90,-28" fill="#0066cc" />
        <polygon points="-85,-25 -90,-28 -88,-24" fill="#ffcc00" opacity="0.8" />
        {/* Engines with detailed exhaust */}
        <g transform="translate(-42, 6)">
          <ellipse cx="0" cy="0" rx="14" ry="6" fill="#808890" />
          <ellipse cx="0" cy="0" rx="12" ry="5" fill="#606870" />
          <ellipse cx="0" cy="0" rx="10" ry="4" fill="#505860" />
          {/* Fan blades */}
          <circle cx="0" cy="0" r="4" fill="#404850" />
          {[...Array(6)].map((_, i) => (
            <line key={i} x1="0" y1="0" x2={Math.cos((i * 60 + time * 10) * Math.PI / 180) * 3.5} y2={Math.sin((i * 60 + time * 10) * Math.PI / 180) * 3.5} stroke="#606870" strokeWidth="0.8" />
          ))}
          {/* Exhaust glow - stronger */}
          <ellipse cx="-16" cy="0" rx="8" ry="5" fill="#ff6600" opacity="0.6" filter="url(#strongGlow)">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-24" cy="0" rx="14" ry="4" fill="#ff4400" opacity="0.3" filter="url(#glow)">
            <animate attributeName="rx" values="14;20;14" dur="0.4s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-35" cy="0" rx="20" ry="3" fill="#ff2200" opacity="0.15">
            <animate attributeName="rx" values="20;28;20" dur="0.6s" repeatCount="indefinite" />
          </ellipse>
          {/* Heat shimmer */}
          {[...Array(3)].map((_, i) => (
            <circle key={i} cx={-20 - i * 8} cy={Math.sin(time * 0.2 + i) * 2} r={1 + i * 0.5} fill="#ffaa00" opacity={0.2 - i * 0.05}>
              <animate attributeName="cy" values={`${-2 + i};${2 - i};${-2 + i}`} dur={`${0.5 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
        <g transform="translate(42, 6)">
          <ellipse cx="0" cy="0" rx="14" ry="6" fill="#808890" />
          <ellipse cx="0" cy="0" rx="12" ry="5" fill="#606870" />
          <ellipse cx="0" cy="0" rx="10" ry="4" fill="#505860" />
          <circle cx="0" cy="0" r="4" fill="#404850" />
          {[...Array(6)].map((_, i) => (
            <line key={i} x1="0" y1="0" x2={Math.cos((i * 60 + time * 10) * Math.PI / 180) * 3.5} y2={Math.sin((i * 60 + time * 10) * Math.PI / 180) * 3.5} stroke="#606870" strokeWidth="0.8" />
          ))}
          <ellipse cx="-16" cy="0" rx="8" ry="5" fill="#ff6600" opacity="0.6" filter="url(#strongGlow)">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-24" cy="0" rx="14" ry="4" fill="#ff4400" opacity="0.3" filter="url(#glow)">
            <animate attributeName="rx" values="14;20;14" dur="0.4s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-35" cy="0" rx="20" ry="3" fill="#ff2200" opacity="0.15">
            <animate attributeName="rx" values="20;28;20" dur="0.6s" repeatCount="indefinite" />
          </ellipse>
          {[...Array(3)].map((_, i) => (
            <circle key={i} cx={-20 - i * 8} cy={Math.sin(time * 0.2 + i) * 2} r={1 + i * 0.5} fill="#ffaa00" opacity={0.2 - i * 0.05}>
              <animate attributeName="cy" values={`${-2 + i};${2 - i};${-2 + i}`} dur={`${0.5 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
        {/* Contrails with fade */}
        <line x1="-58" y1="6" x2="-140" y2="12" stroke="white" strokeWidth="2" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
        </line>
        <line x1="58" y1="6" x2="140" y2="12" stroke="white" strokeWidth="2" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
        </line>
        <line x1="-58" y1="6" x2="-180" y2="15" stroke="white" strokeWidth="1" opacity="0.1">
          <animate attributeName="opacity" values="0.05;0.15;0.05" dur="3s" repeatCount="indefinite" />
        </line>
        <line x1="58" y1="6" x2="180" y2="15" stroke="white" strokeWidth="1" opacity="0.1">
          <animate attributeName="opacity" values="0.05;0.15;0.05" dur="3s" repeatCount="indefinite" />
        </line>
      </g>
      {/* Title with strong glow */}
      <text x="200" y="185" textAnchor="middle" fill="#00ff88" fontSize="22" fontWeight="bold" fontFamily="monospace" filter="url(#strongGlow)">BOEING 777-9</text>
      <text x="200" y="205" textAnchor="middle" fill="#4a8a6a" fontSize="11" fontFamily="monospace" letterSpacing="4">FLIGHT SIMULATOR</text>
      <text x="200" y="225" textAnchor="middle" fill="#3a6a5a" fontSize="9" fontFamily="monospace">GE9X × 2 | 426 PAX | 13,500 KM</text>
      {/* Animated specs */}
      <g transform="translate(200, 235)">
        <text x="-80" y="0" textAnchor="middle" fill="#00ff88" fontSize="7" fontFamily="monospace" opacity="0.7">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          WINGSPAN 71.8m
        </text>
        <text x="0" y="0" textAnchor="middle" fill="#00ff88" fontSize="7" fontFamily="monospace" opacity="0.7">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="0.5s" repeatCount="indefinite" />
          MTOW 775,000 lb
        </text>
        <text x="80" y="0" textAnchor="middle" fill="#00ff88" fontSize="7" fontFamily="monospace" opacity="0.7">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="1s" repeatCount="indefinite" />
          MACH 0.84
        </text>
      </g>
    </svg>
  );
}

function PitchAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 120), 50);
    return () => clearInterval(interval);
  }, []);
  const pitch = Math.sin(phase * Math.PI / 60) * 15;
  const roll = Math.sin(phase * Math.PI / 40) * 8;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="pitchSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0a2a5a" />
          <stop offset="100%" stopColor="#3a7aba" />
        </linearGradient>
        <linearGradient id="pitchGround" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8a7a30" />
          <stop offset="100%" stopColor="#3a2a08" />
        </linearGradient>
        <filter id="pitchGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g transform={`rotate(${roll}, 200, 120)`}>
        <g transform={`translate(0, ${pitch * 2})`}>
          <rect x="0" y="0" width="400" height="120" fill="url(#pitchSky)" />
          <rect x="0" y="120" width="400" height="120" fill="url(#pitchGround)" />
          <line x1="0" y1="120" x2="400" y2="120" stroke="white" strokeWidth="2" opacity="0.8" />
          {/* Pitch ladder */}
          {[-15, -10, -5, 5, 10, 15].map(p => (
            <g key={p}>
              <line x1="160" y1={120 - p * 3} x2="175" y2={120 - p * 3} stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="225" y1={120 - p * 3} x2="240" y2={120 - p * 3} stroke="white" strokeWidth="1" opacity="0.5" />
              <text x="155" y={123 - p * 3} textAnchor="end" fill="white" fontSize="7" fontFamily="monospace" opacity="0.5">{Math.abs(p)}</text>
            </g>
          ))}
        </g>
      </g>
      {/* Fixed aircraft symbol */}
      <g transform="translate(200, 120)">
        <rect x="-45" y="-3" width="35" height="6" fill="#ffcc00" rx="1" />
        <rect x="10" y="-3" width="35" height="6" fill="#ffcc00" rx="1" />
        <circle cx="0" cy="0" r="6" fill="none" stroke="#ffcc00" strokeWidth="2" />
        <rect x="-2" y="6" width="4" height="10" fill="#ffcc00" rx="1" />
      </g>
      {/* Bank angle marks */}
      {[0, 10, 20, 30, 45].map(a => (
        <g key={`bl-${a}`} transform={`rotate(${-a}, 200, 120)`}>
          <line x1="200" y1="35" x2="200" y2="42" stroke="white" strokeWidth="1.5" />
        </g>
      ))}
      {[10, 20, 30, 45].map(a => (
        <g key={`br-${a}`} transform={`rotate(${a}, 200, 120)`}>
          <line x1="200" y1="35" x2="200" y2="42" stroke="white" strokeWidth="1.5" />
        </g>
      ))}
      {/* Bank pointer */}
      <g transform={`rotate(${roll}, 200, 120)`}>
        <polygon points="200,38 196,45 204,45" fill="white" />
      </g>
      <polygon points="200,32 196,26 204,26" fill="#ffcc00" />
      {/* Pitch indicator */}
      <rect x="320" y="10" width="70" height="35" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="355" y="25" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">PITCH</text>
      <text x="355" y="40" textAnchor="middle" fill={pitch > 0 ? '#00ff88' : '#ffaa00'} fontSize="14" fontFamily="monospace" fontWeight="bold" filter="url(#pitchGlow)">
        {pitch > 0 ? '+' : ''}{pitch.toFixed(1)}°
      </text>
      {/* Roll indicator */}
      <rect x="10" y="10" width="70" height="35" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="45" y="25" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">BANK</text>
      <text x="45" y="40" textAnchor="middle" fill={Math.abs(roll) > 5 ? '#ffaa00' : '#00ff88'} fontSize="14" fontFamily="monospace" fontWeight="bold" filter="url(#pitchGlow)">
        {roll > 0 ? '+' : ''}{roll.toFixed(1)}°
      </text>
      {/* Control hints */}
      <g transform="translate(200, 210)">
        <rect x="-80" y="-12" width="160" height="24" rx="4" fill="#0a0a0a" stroke="#333" opacity="0.8" />
        <text x="-60" y="4" fill="#00ff88" fontSize="9" fontFamily="monospace">↑ 拉杆</text>
        <text x="-10" y="4" fill="#ffaa00" fontSize="9" fontFamily="monospace">↓ 推杆</text>
        <text x="35" y="4" fill="#4a8aba" fontSize="9" fontFamily="monospace">← → 滚转</text>
      </g>
    </svg>
  );
}

function ThrottleAnimation() {
  const [throttle, setThrottle] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setThrottle(t => {
        const next = t + 1.2;
        return next > 100 ? 0 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);
  const n1 = throttle * 0.85 + 15;
  const fanAngle = throttle * 7.2;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <radialGradient id="engineGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#ff8800" stopOpacity={throttle / 120} />
          <stop offset="100%" stopColor="#ff4400" stopOpacity="0" />
        </radialGradient>
        <filter id="thrustGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="#080808" />
      {/* Engine nacelle cross-section */}
      <g transform="translate(200, 95)">
        {/* Outer cowling */}
        <circle cx="0" cy="0" r="70" fill="none" stroke="#2a2a2a" strokeWidth="3" />
        <circle cx="0" cy="0" r="65" fill="none" stroke="#1a1a1a" strokeWidth="1" />
        {/* Fan blades - rotating */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 + fanAngle) * Math.PI / 180;
          return (
            <line key={i} x1="0" y1="0" x2={Math.cos(angle) * 55} y2={Math.sin(angle) * 55}
              stroke="#5a7a5a" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          );
        })}
        {/* Spinner */}
        <circle cx="0" cy="0" r="10" fill="#3a3a3a" stroke="#555" strokeWidth="1" />
        <circle cx="0" cy="0" r="3" fill="#555" />
        {/* Inner glow based on throttle */}
        <circle cx="0" cy="0" r="60" fill="url(#engineGlow)" />
        {/* Exhaust plume */}
        {throttle > 20 && (
          <g transform="translate(80, 0)" filter="url(#thrustGlow)">
            <ellipse cx="0" cy="0" rx={8 + throttle * 0.4} ry={6 + throttle * 0.2}
              fill="#ff6600" opacity={throttle / 200}>
              <animate attributeName="rx" values={`${8 + throttle * 0.4};${12 + throttle * 0.5};${8 + throttle * 0.4}`} dur="0.2s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx={10 + throttle * 0.2} cy="0" rx={15 + throttle * 0.3} ry={4 + throttle * 0.1}
              fill="#ff4400" opacity={throttle / 300}>
              <animate attributeName="rx" values={`${15 + throttle * 0.3};${20 + throttle * 0.4};${15 + throttle * 0.3}`} dur="0.3s" repeatCount="indefinite" />
            </ellipse>
          </g>
        )}
      </g>
      {/* N1 gauge */}
      <rect x="20" y="175" width="160" height="50" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="100" y="190" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">N1 FAN SPEED</text>
      <text x="100" y="215" textAnchor="middle" fill="#00ff88" fontSize="22" fontFamily="monospace" fontWeight="bold" filter="url(#thrustGlow)">
        {n1.toFixed(1)}%
      </text>
      {/* Throttle bar */}
      <rect x="200" y="180" width="180" height="16" rx="4" fill="#1a1a1a" stroke="#333" />
      <rect x="200" y="180" width={180 * throttle / 100} height="16" rx="4" fill={throttle > 90 ? '#ffaa00' : '#00ff88'} opacity="0.8" />
      <text x="290" y="193" textAnchor="middle" fill="white" fontSize="10" fontFamily="monospace" fontWeight="bold">
        {Math.round(throttle)}%
      </text>
      {/* Labels */}
      <text x="200" y="210" fill="#6a8a6a" fontSize="8" fontFamily="monospace">IDLE</text>
      <text x="380" y="210" textAnchor="end" fill="#ffaa00" fontSize="8" fontFamily="monospace">TOGA</text>
      {/* Thrust value */}
      <text x="290" y="225" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">
        {Math.round(throttle / 100 * 115 * 2)}k lbf
      </text>
    </svg>
  );
}

function EngineAnimation() {
  const [eng1, setEng1] = useState(true);
  const [eng2, setEng2] = useState(true);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => p + 1);
      if (phase % 60 === 0) setEng1(e => !e);
      if (phase % 60 === 30) setEng2(e => !e);
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <filter id="engGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="#080808" />
      {/* Aircraft top view - detailed */}
      <g transform="translate(200, 110)">
        {/* Fuselage */}
        <ellipse cx="0" cy="0" rx="16" ry="75" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
        <ellipse cx="0" cy="-5" rx="12" ry="65" fill="#1a1a1a" opacity="0.5" />
        {/* Cockpit */}
        <ellipse cx="0" cy="-70" rx="10" ry="8" fill="#333" />
        <path d="M -6,-75 L 0,-80 L 6,-75" fill="#88ccff" opacity="0.5" />
        {/* Wings */}
        <polygon points="-16,-10 -130,-25 -120,-18 -16,12" fill="#1a1a1a" stroke="#333" />
        <polygon points="16,-10 130,-25 120,-18 16,12" fill="#1a1a1a" stroke="#333" />
        {/* Wing tips */}
        <polygon points="-130,-25 -138,-30 -132,-24" fill="#1a1a1a" stroke="#333" />
        <polygon points="130,-25 138,-30 132,-24" fill="#1a1a1a" stroke="#333" />
        {/* Left engine */}
        <g transform="translate(-65, -14)">
          <ellipse cx="0" cy="0" rx="20" ry="11" fill={eng1 ? '#1a3a1a' : '#3a1a1a'} stroke={eng1 ? '#00ff88' : '#ff4444'} strokeWidth="2" />
          {eng1 && (
            <>
              <ellipse cx="22" cy="0" rx="10" ry="6" fill="#ff6600" opacity="0.6" filter="url(#engGlow)">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.3s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="30" cy="0" rx="14" ry="4" fill="#ff4400" opacity="0.2">
                <animate attributeName="rx" values="14;18;14" dur="0.4s" repeatCount="indefinite" />
              </ellipse>
              <text x="0" y="4" textAnchor="middle" fill="#00ff88" fontSize="8" fontFamily="monospace" fontWeight="bold">ON</text>
            </>
          )}
          {!eng1 && (
            <>
              <text x="0" y="4" textAnchor="middle" fill="#ff4444" fontSize="7" fontFamily="monospace" fontWeight="bold">FAIL</text>
              <circle cx="22" cy="0" r="6" fill="#666" opacity="0.3">
                <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </>
          )}
          <text x="0" y="-18" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">ENG 1</text>
        </g>
        {/* Right engine */}
        <g transform="translate(65, -14)">
          <ellipse cx="0" cy="0" rx="20" ry="11" fill={eng2 ? '#1a3a1a' : '#3a1a1a'} stroke={eng2 ? '#00ff88' : '#ff4444'} strokeWidth="2" />
          {eng2 && (
            <>
              <ellipse cx="22" cy="0" rx="10" ry="6" fill="#ff6600" opacity="0.6" filter="url(#engGlow)">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.3s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="30" cy="0" rx="14" ry="4" fill="#ff4400" opacity="0.2">
                <animate attributeName="rx" values="14;18;14" dur="0.4s" repeatCount="indefinite" />
              </ellipse>
              <text x="0" y="4" textAnchor="middle" fill="#00ff88" fontSize="8" fontFamily="monospace" fontWeight="bold">ON</text>
            </>
          )}
          {!eng2 && (
            <>
              <text x="0" y="4" textAnchor="middle" fill="#ff4444" fontSize="7" fontFamily="monospace" fontWeight="bold">FAIL</text>
              <circle cx="22" cy="0" r="6" fill="#666" opacity="0.3">
                <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </>
          )}
          <text x="0" y="-18" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">ENG 2</text>
        </g>
        {/* Tail */}
        <polygon points="-6,65 6,65 0,82" fill="#1a1a1a" stroke="#333" />
        <polygon points="-4,70 4,70 0,80" fill="#0066cc" opacity="0.5" />
      </g>
      {/* Key hints */}
      <rect x="50" y="205" width="50" height="24" rx="4" fill="#1a1a1a" stroke={eng1 ? '#00ff88' : '#ff4444'} />
      <text x="75" y="221" textAnchor="middle" fill={eng1 ? '#00ff88' : '#ff4444'} fontSize="14" fontFamily="monospace" fontWeight="bold">1</text>
      <rect x="300" y="205" width="50" height="24" rx="4" fill="#1a1a1a" stroke={eng2 ? '#00ff88' : '#ff4444'} />
      <text x="325" y="221" textAnchor="middle" fill={eng2 ? '#00ff88' : '#ff4444'} fontSize="14" fontFamily="monospace" fontWeight="bold">2</text>
    </svg>
  );
}

function TakeoffAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 240), 50);
    return () => clearInterval(interval);
  }, []);
  const speed = Math.min(200, phase * 1.5);
  const v1Reached = speed >= 150;
  const vrReached = speed >= 170;
  const rotate = vrReached ? Math.min(12, (speed - 170) * 0.4) : 0;
  const altitude = vrReached ? Math.max(0, (speed - 170) * 3) : 0;
  const airborne = altitude > 0;
  const groundY = 165 - altitude * 0.2;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="toSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a4a7a" />
          <stop offset="100%" stopColor="#5a9bc8" />
        </linearGradient>
        <filter id="toGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="url(#toSky)" />
      {/* Sun */}
      <circle cx="350" cy="40" r="20" fill="#ffdd44" opacity="0.3" />
      <circle cx="350" cy="40" r="12" fill="#ffee88" opacity="0.5" />
      {/* Runway */}
      <rect x="0" y={groundY} width="400" height={240 - groundY} fill="#3a3a3a" />
      <line x1="0" y1={groundY} x2="400" y2={groundY} stroke="#666" strokeWidth="1" />
      {/* Runway markings */}
      {[...Array(10)].map((_, i) => (
        <rect key={i} x={((i * 50 - phase * 3) % 500) - 50} y={groundY + 8} width="25" height="2.5" fill="white" opacity="0.5" />
      ))}
      {/* Runway edge lights */}
      {[...Array(12)].map((_, i) => (
        <circle key={i} cx={((i * 40 - phase * 2) % 480) - 40} cy={groundY + 1} r="1.5" fill="#ffff00" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1s" repeatCount="indefinite" />
        </circle>
      ))}
      {/* Aircraft */}
      <g transform={`translate(160, ${groundY - 18}) rotate(${-rotate}, 0, 18)`}>
        {/* Fuselage */}
        <ellipse cx="0" cy="0" rx="40" ry="7" fill="#d0d8e0" />
        {/* Wings */}
        <polygon points="-12,-5 -50,-22 -45,-19 -8,-3" fill="#b0b8c0" />
        <polygon points="12,-5 50,-22 45,-19 8,-3" fill="#b0b8c0" />
        {/* Tail */}
        <polygon points="-35,-3 -42,-16 -38,-13 -32,-3" fill="#b0b8c0" />
        {/* Engines with thrust */}
        <g transform="translate(-28, 4)">
          <ellipse cx="0" cy="0" rx="8" ry="4" fill="#808890" />
          {speed > 5 && (
            <>
              <ellipse cx="-10" cy="0" rx={3 + speed * 0.03} ry={2 + speed * 0.01} fill="#ff6600" opacity="0.6" filter="url(#toGlow)">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.2s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx={-14 - speed * 0.05} cy="0" rx={6 + speed * 0.04} ry={2} fill="#ff4400" opacity="0.2">
                <animate attributeName="rx" values={`${6 + speed * 0.04};${10 + speed * 0.05};${6 + speed * 0.04}`} dur="0.3s" repeatCount="indefinite" />
              </ellipse>
            </>
          )}
        </g>
        <g transform="translate(28, 4)">
          <ellipse cx="0" cy="0" rx="8" ry="4" fill="#808890" />
          {speed > 5 && (
            <>
              <ellipse cx="-10" cy="0" rx={3 + speed * 0.03} ry={2 + speed * 0.01} fill="#ff6600" opacity="0.6" filter="url(#toGlow)">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.2s" repeatCount="indefinite" />
              </ellipse>
            </>
          )}
        </g>
        {/* Gear */}
        {!airborne && (
          <>
            <line x1="-8" y1="7" x2="-8" y2="15" stroke="#666" strokeWidth="2" />
            <line x1="8" y1="7" x2="8" y2="15" stroke="#666" strokeWidth="2" />
            <circle cx="-8" cy="16" r="2.5" fill="#444" />
            <circle cx="8" cy="16" r="2.5" fill="#444" />
          </>
        )}
      </g>
      {/* Speed tape */}
      <rect x="290" y="10" width="100" height="65" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="340" y="25" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">AIRSPEED</text>
      <text x="340" y="50" textAnchor="middle" fill="#00ff88" fontSize="22" fontFamily="monospace" fontWeight="bold" filter="url(#toGlow)">{Math.round(speed)}</text>
      <text x="340" y="65" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">KTS</text>
      {/* V-speed markers */}
      <rect x="10" y="10" width="100" height="55" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="60" y="25" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">V-SPEEDS</text>
      <text x="25" y="40" fill={v1Reached ? '#00ff88' : '#ffaa00'} fontSize="9" fontFamily="monospace">{v1Reached ? '✓' : '○'} V1 150</text>
      <text x="25" y="52" fill={vrReached ? '#00ff88' : '#ffaa00'} fontSize="9" fontFamily="monospace">{vrReached ? '✓' : '○'} VR 170</text>
      <text x="25" y="64" fill={airborne ? '#00ff88' : '#6a8a6a'} fontSize="9" fontFamily="monospace">{airborne ? '✓' : '○'} V2 185</text>
      {/* Phase label */}
      <rect x="100" y="215" width="200" height="20" rx="4" fill="#0a0a0a" stroke={airborne ? '#00ff88' : '#ffaa00'} opacity="0.9" />
      <text x="200" y="229" textAnchor="middle" fill={airborne ? '#00ff88' : '#ffaa00'} fontSize="10" fontFamily="monospace" fontWeight="bold">
        {!v1Reached ? 'TAKEOFF ROLL — 加速滑跑' : !vrReached ? 'V1 PASSED — 超过决断速度' : !airborne ? 'VR — ROTATE 抬轮!' : 'POSITIVE CLIMB — 正爬升率'}
      </text>
    </svg>
  );
}

function GearAnimation() {
  const [gearDown, setGearDown] = useState(true);
  const [transition, setTransition] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setGearDown(g => !g);
      setTransition(0);
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTransition(v => Math.min(1, v + 0.05)), 30);
    return () => clearInterval(t);
  }, []);
  const gearY = gearDown ? 15 + transition * 25 : 40 - transition * 22;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="gearSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a3a5c" />
          <stop offset="100%" stopColor="#4a7ba8" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#gearSky)" />
      {/* Aircraft side view */}
      <g transform="translate(200, 90)">
        <ellipse cx="0" cy="0" rx="110" ry="16" fill="#2a2a2a" stroke="#444" />
        <ellipse cx="0" cy="-3" rx="100" ry="10" fill="#1a1a1a" opacity="0.4" />
        <polygon points="-25,-12 -90,-40 -80,-35 -15,-10" fill="#1a1a1a" stroke="#333" />
        <polygon points="-90,-5 -108,-38 -98,-33 -85,-5" fill="#1a1a1a" stroke="#333" />
        <ellipse cx="-45" cy="6" rx="16" ry="9" fill="#1a1a1a" stroke="#333" />
        {/* Cockpit */}
        <path d="M 95,-8 L 110,-4 L 108,0 L 93,-4 Z" fill="#88ccff" opacity="0.5" />
        {/* Nose gear */}
        <g>
          <line x1="70" y1="16" x2="70" y2={gearY} stroke="#888" strokeWidth="3" />
          {gearDown && transition > 0.5 && <circle cx="70" cy={gearY + 2} r="5" fill="#555" stroke="#888" strokeWidth="1" />}
        </g>
        {/* Main gear */}
        <g>
          <line x1="-15" y1="16" x2="-15" y2={gearY + 5} stroke="#888" strokeWidth="3" />
          {gearDown && transition > 0.5 && (
            <>
              <circle cx="-20" cy={gearY + 7} r="5" fill="#555" stroke="#888" strokeWidth="1" />
              <circle cx="-10" cy={gearY + 7} r="5" fill="#555" stroke="#888" strokeWidth="1" />
            </>
          )}
        </g>
        {/* Gear doors */}
        {!gearDown && (
          <>
            <rect x="62" y="14" width="16" height="4" rx="1" fill="#333" stroke="#444" />
            <rect x="-23" y="14" width="16" height="4" rx="1" fill="#333" stroke="#444" />
          </>
        )}
      </g>
      {/* Status panel */}
      <rect x="130" y="165" width="140" height="40" rx="4" fill={gearDown ? '#1a3a1a' : '#3a1a1a'} stroke={gearDown ? '#00ff88' : '#ff4444'} />
      <text x="200" y="182" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">LANDING GEAR</text>
      <text x="200" y="198" textAnchor="middle" fill={gearDown ? '#00ff88' : '#ff4444'} fontSize="16" fontFamily="monospace" fontWeight="bold">
        GEAR {gearDown ? 'DOWN ▼' : 'UP ▲'}
      </text>
      {/* Drag indicator */}
      <rect x="20" y="210" width="160" height="22" rx="4" fill="#0a0a0a" stroke="#333" />
      <text x="100" y="225" textAnchor="middle" fill={gearDown ? '#ffaa00' : '#00ff88'} fontSize="9" fontFamily="monospace">
        阻力: {gearDown ? '+15-20% (放下)' : '最小 (收起)'}
      </text>
      <rect x="220" y="210" width="160" height="22" rx="4" fill="#0a0a0a" stroke="#333" />
      <text x="300" y="225" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">
        限速: 270 KTS / M0.82
      </text>
    </svg>
  );
}

function FlapsAnimation() {
  const [flapAngle, setFlapAngle] = useState(0);
  const flapSteps = [0, 1, 5, 15, 20, 25, 30];
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % flapSteps.length;
      setFlapAngle(flapSteps[idx]);
    }, 1800);
    return () => clearInterval(interval);
  }, []);
  const liftBoost = flapAngle * 3;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <filter id="flapGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="#080808" />
      {/* Wing cross-section - airfoil shape */}
      <g transform="translate(200, 100)">
        {/* Main wing airfoil */}
        <path d="M -140,0 Q -100,-35 -40,-25 Q 0,-18 60,-10 Q 100,-5 140,5 L 140,12 Q 100,8 60,5 Q 0,2 -40,-5 Q -100,-15 -140,5 Z" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
        {/* Leading edge highlight */}
        <path d="M -140,0 Q -100,-35 -40,-25 Q 0,-18 60,-10 Q 100,-5 140,5" fill="none" stroke="#555" strokeWidth="1" />
        {/* Flap - trailing edge */}
        <g transform={`rotate(${flapAngle * 0.8}, 100, 8)`}>
          <path d="M 100,8 L 155,14 L 155,20 L 100,16 Z" fill={flapAngle > 0 ? '#1a3a1a' : '#2a2a2a'} stroke={flapAngle > 0 ? '#00ff88' : '#444'} strokeWidth="1" />
          {/* Flap gap */}
          {flapAngle > 0 && (
            <line x1="100" y1="8" x2="100" y2="16" stroke="#ffaa00" strokeWidth="0.5" opacity="0.5" />
          )}
        </g>
        {/* Slats - leading edge */}
        {flapAngle > 0 && (
          <path d="M -140,0 L -145,-3 L -130,-8 L -125,-2 Z" fill="#1a3a1a" stroke="#00ff88" strokeWidth="0.5" opacity="0.7" />
        )}
        {/* Airflow lines */}
        {[...Array(6)].map((_, i) => (
          <g key={i}>
            <line x1={-160} y1={-25 + i * 10} x2={-120} y2={-20 + i * 8} stroke="#4a8aba" strokeWidth="1" opacity="0.4">
              <animate attributeName="x1" values="-160;-120;-160" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
            </line>
          </g>
        ))}
        {/* Lift arrow */}
        {flapAngle > 0 && (
          <g filter="url(#flapGlow)">
            <line x1="0" y1="-30" x2="0" y2={-30 - liftBoost} stroke="#00ff88" strokeWidth="2.5" />
            <polygon points={`0,${-30 - liftBoost - 10} -6,${-30 - liftBoost} 6,${-30 - liftBoost}`} fill="#00ff88" />
            <text x="18" y={-35 - liftBoost} fill="#00ff88" fontSize="10" fontFamily="monospace" fontWeight="bold">LIFT +{Math.round(flapAngle * 2)}%</text>
          </g>
        )}
        {/* Drag arrow */}
        {flapAngle > 5 && (
          <g>
            <line x1="160" y1="10" x2={160 + flapAngle * 0.8} y2="10" stroke="#ffaa00" strokeWidth="2" />
            <polygon points={`${160 + flapAngle * 0.8 + 8},10 ${160 + flapAngle * 0.8},6 ${160 + flapAngle * 0.8},14`} fill="#ffaa00" />
            <text x={170 + flapAngle * 0.8} y="25" fill="#ffaa00" fontSize="8" fontFamily="monospace">DRAG</text>
          </g>
        )}
      </g>
      {/* Flap angle display */}
      <rect x="130" y="165" width="140" height="35" rx="4" fill="#1a3a1a" stroke="#00ff88" />
      <text x="200" y="180" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">FLAP POSITION</text>
      <text x="200" y="196" textAnchor="middle" fill="#00ff88" fontSize="16" fontFamily="monospace" fontWeight="bold" filter="url(#flapGlow)">
        FLAPS {flapAngle}°
      </text>
      {/* Flap schedule */}
      <g transform="translate(20, 210)">
        <text x="0" y="0" fill="#6a8a6a" fontSize="8" fontFamily="monospace">起飞: 5-15°</text>
        <text x="100" y="0" fill="#6a8a6a" fontSize="8" fontFamily="monospace">进近: 20-25°</text>
        <text x="220" y="0" fill="#6a8a6a" fontSize="8" fontFamily="monospace">着陆: 25-30°</text>
      </g>
    </svg>
  );
}

function AutopilotAnimation() {
  const [apOn, setApOn] = useState(false);
  const [heading, setHeading] = useState(270);
  const [targetHdg] = useState(300);
  useEffect(() => {
    const interval = setInterval(() => setApOn(a => !a), 4000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!apOn) return;
    const interval = setInterval(() => {
      setHeading(h => {
        const diff = targetHdg - h;
        const norm = diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff;
        return (h + norm * 0.05 + 360) % 360;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [apOn, targetHdg]);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <filter id="apGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="#080808" />
      {/* HSI compass rose */}
      <circle cx="200" cy="110" r="85" fill="none" stroke="#1a3a1a" strokeWidth="2" />
      <circle cx="200" cy="110" r="82" fill="none" stroke="#0a1a0a" strokeWidth="1" />
      {/* Heading marks */}
      {[...Array(36)].map((_, i) => {
        const deg = i * 10;
        const relDeg = ((deg - heading + 540) % 360) - 180;
        const angle = (relDeg - 90) * Math.PI / 180;
        const isMajor = deg % 30 === 0;
        const r1 = isMajor ? 72 : 78;
        const r2 = 82;
        return (
          <line key={i}
            x1={200 + Math.cos(angle) * r1} y1={110 + Math.sin(angle) * r1}
            x2={200 + Math.cos(angle) * r2} y2={110 + Math.sin(angle) * r2}
            stroke={isMajor ? '#00ff88' : '#3a5a3a'} strokeWidth={isMajor ? 2 : 1} />
        );
      })}
      {/* Cardinal labels */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
        const relDeg = ((deg - heading + 540) % 360) - 180;
        if (Math.abs(relDeg) > 80) return null;
        const angle = (relDeg - 90) * Math.PI / 180;
        const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg / 10);
        return (
          <text key={deg} x={200 + Math.cos(angle) * 62} y={113 + Math.sin(angle) * 62}
            textAnchor="middle" fill="#00ff88" fontSize="10" fontFamily="monospace" fontWeight="bold">
            {label}
          </text>
        );
      })}
      {/* Target heading bug */}
      {(() => {
        const relTarget = ((targetHdg - heading + 540) % 360) - 180;
        const angle = (relTarget - 90) * Math.PI / 180;
        return (
          <g>
            <circle cx={200 + Math.cos(angle) * 85} cy={110 + Math.sin(angle) * 85} r="5" fill="#ffaa00" opacity="0.8" />
            <text x={200 + Math.cos(angle) * 95} y={113 + Math.sin(angle) * 95} textAnchor="middle" fill="#ffaa00" fontSize="8" fontFamily="monospace">TGT</text>
          </g>
        );
      })()}
      {/* Heading pointer (top) */}
      <polygon points="200,25 195,35 205,35" fill="#ffcc00" />
      <line x1="200" y1="35" x2="200" y2="50" stroke="#ffcc00" strokeWidth="2" />
      {/* Aircraft symbol */}
      <g transform="translate(200, 110)">
        <polygon points="0,-18 10,12 0,6 -10,12" fill="white" />
      </g>
      {/* Current heading display */}
      <rect x="155" y="200" width="90" height="30" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="200" y="215" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">HDG</text>
      <text x="200" y="228" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold" filter="url(#apGlow)">
        {String(Math.round(heading)).padStart(3, '0')}°
      </text>
      {/* AP status */}
      <rect x="20" y="200" width="120" height="30" rx="4" fill={apOn ? '#00ff88' : '#1a1a1a'} stroke={apOn ? '#00ff88' : '#333'} />
      <text x="80" y="219" textAnchor="middle" fill={apOn ? '#000' : '#888'} fontSize="12" fontFamily="monospace" fontWeight="bold">
        A/P {apOn ? 'ENGAGED' : 'OFF'}
      </text>
      {/* Target heading */}
      <rect x="260" y="200" width="120" height="30" rx="4" fill="#0a0a0a" stroke="#ffaa00" />
      <text x="320" y="215" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">TARGET</text>
      <text x="320" y="228" textAnchor="middle" fill="#ffaa00" fontSize="14" fontFamily="monospace" fontWeight="bold">
        {String(targetHdg).padStart(3, '0')}°
      </text>
    </svg>
  );
}

function AutothrottleAnimation() {
  const [atOn, setAtOn] = useState(true);
  const [targetSpeed] = useState(250);
  const [currentSpeed, setCurrentSpeed] = useState(180);
  useEffect(() => {
    const interval = setInterval(() => {
      setAtOn(a => !a);
      if (!atOn) setCurrentSpeed(180);
    }, 5000);
    return () => clearInterval(interval);
  }, [atOn]);
  useEffect(() => {
    if (!atOn) return;
    const interval = setInterval(() => {
      setCurrentSpeed(s => s < targetSpeed ? s + 0.8 : s);
    }, 50);
    return () => clearInterval(interval);
  }, [atOn, targetSpeed]);
  const throttlePos = atOn ? Math.min(100, (currentSpeed / targetSpeed) * 100) : 30;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <filter id="atGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="#080808" />
      {/* Speed tape */}
      <rect x="30" y="30" width="340" height="40" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      {/* Target speed marker */}
      <line x1={30 + (targetSpeed / 350) * 340} y1="25" x2={30 + (targetSpeed / 350) * 340} y2="75" stroke="#ffcc00" strokeWidth="2" strokeDasharray="3,2" />
      <text x={30 + (targetSpeed / 350) * 340} y="20" textAnchor="middle" fill="#ffcc00" fontSize="9" fontFamily="monospace">TGT {targetSpeed}</text>
      {/* Current speed bar */}
      <rect x="30" y="30" width={(currentSpeed / 350) * 340} height="40" rx="4" fill={atOn ? '#00ff88' : '#4a6a4a'} opacity="0.5" />
      <text x="200" y="56" textAnchor="middle" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" filter="url(#atGlow)">
        {Math.round(currentSpeed)} KTS
      </text>
      {/* Throttle levers */}
      <g transform="translate(120, 120)">
        <rect x="0" y="0" width="160" height="80" rx="4" fill="#1a1a1a" stroke="#333" />
        <text x="80" y="15" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">THROTTLE LEVERS</text>
        {/* Lever 1 */}
        <rect x="30" y={70 - throttlePos * 0.5} width="20" height={throttlePos * 0.5} rx="2" fill={atOn ? '#00ff88' : '#4a6a4a'} opacity="0.7" />
        <rect x="28" y={68 - throttlePos * 0.5} width="24" height="6" rx="2" fill={atOn ? '#00ff88' : '#888'} />
        {/* Lever 2 */}
        <rect x="70" y={70 - throttlePos * 0.5} width="20" height={throttlePos * 0.5} rx="2" fill={atOn ? '#00ff88' : '#4a6a4a'} opacity="0.7" />
        <rect x="68" y={68 - throttlePos * 0.5} width="24" height="6" rx="2" fill={atOn ? '#00ff88' : '#888'} />
        {/* Labels */}
        <text x="40" y="78" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">ENG1</text>
        <text x="80" y="78" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">ENG2</text>
        {/* Scale */}
        <text x="120" y="25" fill="#6a8a6a" fontSize="7" fontFamily="monospace">TOGA</text>
        <text x="120" y="72" fill="#6a8a6a" fontSize="7" fontFamily="monospace">IDLE</text>
      </g>
      {/* AT status */}
      <rect x="140" y="210" width="120" height="25" rx="4" fill={atOn ? '#00ff88' : '#1a1a1a'} stroke={atOn ? '#00ff88' : '#333'} />
      <text x="200" y="227" textAnchor="middle" fill={atOn ? '#000' : '#888'} fontSize="12" fontFamily="monospace" fontWeight="bold">
        A/T {atOn ? 'ENGAGED' : 'OFF'}
      </text>
    </svg>
  );
}

function ReverseAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 120), 50);
    return () => clearInterval(interval);
  }, []);
  const reverseActive = phase > 30 && phase < 90;
  const actualSpeed = phase < 30 ? 160 : phase < 90 ? Math.max(0, 160 - (phase - 30) * 2.5) : 10;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="revSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3a6a9a" />
          <stop offset="100%" stopColor="#7abbe8" />
        </linearGradient>
        <filter id="revGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="url(#revSky)" />
      {/* Runway */}
      <rect x="0" y="150" width="400" height="90" fill="#3a3a3a" />
      <line x1="0" y1="150" x2="400" y2="150" stroke="#666" />
      {[...Array(10)].map((_, i) => (
        <rect key={i} x={((i * 50 + phase * 2) % 500) - 50} y="175" width="25" height="2.5" fill="white" opacity="0.4" />
      ))}
      {/* Aircraft on ground */}
      <g transform="translate(200, 132)">
        <ellipse cx="0" cy="0" rx="45" ry="8" fill="#d0d8e0" />
        <polygon points="-14,-6 -52,-24 -46,-21 -10,-4" fill="#b0b8c0" />
        <polygon points="14,-6 52,-24 46,-21 10,-4" fill="#b0b8c0" />
        {/* Engines with reverse thrust */}
        <g transform="translate(-30, 4)">
          <ellipse cx="0" cy="0" rx="12" ry="6" fill="#808890" />
          {reverseActive && (
            <>
              {/* Reverse cascade vanes */}
              <rect x="-14" y="-5" width="4" height="10" rx="1" fill="#aaa" opacity="0.6" />
              {/* Reverse thrust arrows */}
              <polygon points="-18,-8 -30,-3 -18,2" fill="#ff6600" opacity="0.7" filter="url(#revGlow)">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.15s" repeatCount="indefinite" />
              </polygon>
              <polygon points="-18,8 -30,3 -18,-2" fill="#ff6600" opacity="0.7" filter="url(#revGlow)">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.15s" repeatCount="indefinite" />
              </polygon>
              {/* Exhaust particles */}
              {[...Array(4)].map((_, i) => (
                <circle key={i} cx={-25 - i * 8} cy={-5 + i * 3} r={2 + i} fill="#ff8844" opacity={0.3 - i * 0.06}>
                  <animate attributeName="cx" values={`${-25 - i * 8};${-35 - i * 10};${-25 - i * 8}`} dur="0.3s" repeatCount="indefinite" />
                </circle>
              ))}
            </>
          )}
          {!reverseActive && <ellipse cx="14" cy="0" rx="5" ry="3" fill="#ff6600" opacity="0.3" />}
        </g>
        <g transform="translate(30, 4)">
          <ellipse cx="0" cy="0" rx="12" ry="6" fill="#808890" />
          {reverseActive && (
            <>
              <rect x="-14" y="-5" width="4" height="10" rx="1" fill="#aaa" opacity="0.6" />
              <polygon points="-18,-8 -30,-3 -18,2" fill="#ff6600" opacity="0.7" filter="url(#revGlow)">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.15s" repeatCount="indefinite" />
              </polygon>
              <polygon points="-18,8 -30,3 -18,-2" fill="#ff6600" opacity="0.7" filter="url(#revGlow)">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.15s" repeatCount="indefinite" />
              </polygon>
            </>
          )}
          {!reverseActive && <ellipse cx="14" cy="0" rx="5" ry="3" fill="#ff6600" opacity="0.3" />}
        </g>
        {/* Gear */}
        <line x1="-10" y1="8" x2="-10" y2="16" stroke="#666" strokeWidth="2" />
        <line x1="10" y1="8" x2="10" y2="16" stroke="#666" strokeWidth="2" />
        <circle cx="-10" cy="17" r="3" fill="#444" />
        <circle cx="10" cy="17" r="3" fill="#444" />
      </g>
      {/* Speed display */}
      <rect x="280" y="10" width="110" height="45" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="335" y="25" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">GROUND SPEED</text>
      <text x="335" y="48" textAnchor="middle" fill={reverseActive ? '#ffaa00' : '#00ff88'} fontSize="20" fontFamily="monospace" fontWeight="bold" filter="url(#revGlow)">
        {Math.round(actualSpeed)}
      </text>
      {/* Status */}
      <rect x="10" y="10" width="130" height="28" rx="4" fill={reverseActive ? '#3a1a1a' : '#1a3a1a'} stroke={reverseActive ? '#ffaa00' : '#00ff88'} />
      <text x="75" y="29" textAnchor="middle" fill={reverseActive ? '#ffaa00' : '#00ff88'} fontSize="11" fontFamily="monospace" fontWeight="bold">
        {reverseActive ? '⚠ REVERSE THRUST' : phase < 30 ? 'TOUCHDOWN' : 'TAXI SPEED'}
      </text>
      {/* Deceleration info */}
      <text x="200" y="225" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">
        反推 + 机轮刹车 + 扰流板 → 着陆距离 1500-2000m
      </text>
    </svg>
  );
}

function GroundAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 240), 50);
    return () => clearInterval(interval);
  }, []);
  const taxiX = (phase * 1.5) % 400;
  const isGrass = phase > 120;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="gndSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a8ac8" />
          <stop offset="100%" stopColor="#8abbe8" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#gndSky)" />
      {/* Ground surface */}
      <rect x="0" y="140" width="400" height="100" fill={isGrass ? '#3a6a2a' : '#4a4a4a'} />
      {/* Surface texture */}
      {!isGrass && (
        <>
          {/* Taxiway markings */}
          <line x1="0" y1="170" x2="400" y2="170" stroke="#ffcc00" strokeWidth="2" strokeDasharray="15,10" opacity="0.5" />
          {[...Array(10)].map((_, i) => (
            <rect key={i} x={((i * 50 - phase * 1.5) % 500) - 50} y="185" width="25" height="2" fill="white" opacity="0.3" />
          ))}
          {/* Edge lights */}
          {[...Array(8)].map((_, i) => (
            <circle key={i} cx={((i * 55 - phase * 1) % 440) - 20} cy="142" r="2" fill="#00ff00" opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
          ))}
        </>
      )}
      {isGrass && (
        <>
          {[...Array(30)].map((_, i) => (
            <line key={i} x1={i * 14} y1={145 + (i % 4) * 12} x2={i * 14 + 4} y2={140 + (i % 4) * 12} stroke="#5a9a4a" strokeWidth="1.5" opacity="0.6" />
          ))}
        </>
      )}
      {/* Surface label */}
      <rect x="140" y="125" width="120" height="18" rx="3" fill="#0a0a0a" opacity="0.7" />
      <text x="200" y="138" textAnchor="middle" fill={isGrass ? '#88cc44' : '#aaa'} fontSize="9" fontFamily="monospace" fontWeight="bold">
        {isGrass ? 'GRASS 草地道面' : 'PAVED 铺装道面'}
      </text>
      {/* Aircraft taxiing */}
      <g transform={`translate(${taxiX}, 128)`}>
        <ellipse cx="0" cy="0" rx="32" ry="6" fill="#d0d8e0" />
        <polygon points="-10,-4 -35,-16 -30,-14 -6,-2" fill="#b0b8c0" />
        <polygon points="10,-4 35,-16 30,-14 6,-2" fill="#b0b8c0" />
        <polygon points="-28,-2 -33,-12 -30,-10 -25,-2" fill="#b0b8c0" />
        {/* Engine idle glow */}
        <ellipse cx="-20" cy="3" rx="3" ry="2" fill="#ff6600" opacity="0.3" />
        <ellipse cx="20" cy="3" rx="3" ry="2" fill="#ff6600" opacity="0.3" />
        {/* Gear */}
        <line x1="-6" y1="6" x2="-6" y2="12" stroke="#666" strokeWidth="2" />
        <line x1="6" y1="6" x2="6" y2="12" stroke="#666" strokeWidth="2" />
        <circle cx="-6" cy="13" r="2.5" fill="#444" />
        <circle cx="6" cy="13" r="2.5" fill="#444" />
      </g>
      {/* Info panels */}
      <rect x="15" y="200" width="170" height="30" rx="4" fill="#0a0a0a" stroke="#333" />
      <text x="100" y="215" textAnchor="middle" fill={isGrass ? '#ffaa00' : '#00ff88'} fontSize="9" fontFamily="monospace" fontWeight="bold">
        滚动阻力: {isGrass ? '高 (5-10×)' : '正常 (1×)'}
      </text>
      <text x="100" y="226" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">
        {isGrass ? '可能无法起飞!' : '正常起飞性能'}
      </text>
      <rect x="215" y="200" width="170" height="30" rx="4" fill="#0a0a0a" stroke="#333" />
      <text x="300" y="215" textAnchor="middle" fill="#00ff88" fontSize="9" fontFamily="monospace" fontWeight="bold">
        滑行限速: 20-30 KTS
      </text>
      <text x="300" y="226" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">
        转弯半径: ~30m (777-9)
      </text>
    </svg>
  );
}

function ReadyAnimation() {
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="readySky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#020810" />
          <stop offset="40%" stopColor="#0a1628" />
          <stop offset="100%" stopColor="#2a5a8a" />
        </linearGradient>
        <filter id="readyGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="url(#readySky)" />
      {/* Stars */}
      {[...Array(25)].map((_, i) => (
        <circle key={i} cx={10 + (i * 16) % 390} cy={5 + (i * 9) % 80} r={0.5 + (i % 3) * 0.4} fill="white" opacity={0.3}>
          <animate attributeName="opacity" values={`${0.15};${0.6};${0.15}`} dur={`${2 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* Flying aircraft with contrails */}
      <g transform="translate(200, 90)">
        <animateTransform attributeName="transform" type="translate" values="200,90;200,85;200,90" dur="4s" repeatCount="indefinite" />
        {/* Contrails */}
        <line x1="-35" y1="5" x2="-100" y2="12" stroke="white" strokeWidth="2" opacity="0.15">
          <animate attributeName="opacity" values="0.08;0.2;0.08" dur="3s" repeatCount="indefinite" />
        </line>
        <line x1="35" y1="5" x2="100" y2="12" stroke="white" strokeWidth="2" opacity="0.15">
          <animate attributeName="opacity" values="0.08;0.2;0.08" dur="3s" repeatCount="indefinite" />
        </line>
        {/* Fuselage */}
        <ellipse cx="0" cy="0" rx="55" ry="9" fill="#d0d8e0" />
        {/* Wings */}
        <polygon points="-18,-6 -60,-28 -55,-25 -12,-4" fill="#b0b8c0" />
        <polygon points="18,-6 60,-28 55,-25 12,-4" fill="#b0b8c0" />
        {/* Tail */}
        <polygon points="-45,-3 -55,-20 -50,-17 -42,-3" fill="#b0b8c0" />
        {/* Windows */}
        {[...Array(8)].map((_, i) => (
          <rect key={i} x={-30 + i * 8} y="-3" width="4" height="2" rx="1" fill="#88ccff" opacity="0.5" />
        ))}
        {/* Engine glow */}
        <ellipse cx="-32" cy="5" rx="7" ry="4" fill="#ff6600" opacity="0.6" filter="url(#readyGlow)">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="32" cy="5" rx="7" ry="4" fill="#ff6600" opacity="0.6" filter="url(#readyGlow)">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* Pre-flight checklist */}
      <g transform="translate(40, 140)">
        <rect x="-10" y="-15" width="160" height="95" rx="4" fill="#0a0a0a" stroke="#1a3a1a" opacity="0.9" />
        <text x="0" y="0" fill="#00ff88" fontSize="10" fontFamily="monospace" fontWeight="bold">起飞检查单:</text>
        <text x="0" y="18" fill="#00ff88" fontSize="9" fontFamily="monospace">✓ 襟翼 5-15°</text>
        <text x="0" y="32" fill="#00ff88" fontSize="9" fontFamily="monospace">✓ 油门 TOGA</text>
        <text x="0" y="46" fill="#00ff88" fontSize="9" fontFamily="monospace">✓ VR 170kts 抬轮</text>
        <text x="0" y="60" fill="#00ff88" fontSize="9" fontFamily="monospace">✓ 正爬升收起落架</text>
        <text x="0" y="74" fill="#6a8a6a" fontSize="9" fontFamily="monospace">○ 收襟翼 (400ft+)</text>
      </g>
      {/* Flight profile */}
      <g transform="translate(220, 140)">
        <rect x="-10" y="-15" width="170" height="95" rx="4" fill="#0a0a0a" stroke="#1a3a1a" opacity="0.9" />
        <text x="0" y="0" fill="#ffaa00" fontSize="10" fontFamily="monospace" fontWeight="bold">飞行剖面:</text>
        <text x="0" y="18" fill="#6a8a6a" fontSize="8" fontFamily="monospace">起飞 → 爬升 → 巡航</text>
        <text x="0" y="32" fill="#6a8a6a" fontSize="8" fontFamily="monospace">→ 下降 → 进近 → 着陆</text>
        <text x="0" y="50" fill="#6a8a6a" fontSize="8" fontFamily="monospace">巡航: FL350-430</text>
        <text x="0" y="64" fill="#6a8a6a" fontSize="8" fontFamily="monospace">速度: M0.84 (480kts)</text>
        <text x="0" y="78" fill="#6a8a6a" fontSize="8" fontFamily="monospace">油耗: ~6,800 kg/hr</text>
      </g>
      <text x="200" y="235" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold" filter="url(#readyGlow)">
        READY FOR DEPARTURE
      </text>
    </svg>
  );
}

function EmergencyEngineAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 160), 50);
    return () => clearInterval(interval);
  }, []);
  const engineFailed = phase > 30;
  const yawAngle = engineFailed ? Math.min(8, (phase - 30) * 0.3) : 0;
  const corrected = phase > 80;
  const finalYaw = corrected ? Math.max(0, yawAngle - (phase - 80) * 0.2) : yawAngle;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <rect width="400" height="240" fill="#0a0a0a" />
      {/* Aircraft top view with yaw */}
      <g transform={`translate(200, 110) rotate(${finalYaw})`}>
        <ellipse cx="0" cy="0" rx="15" ry="55" fill="#2a2a2a" stroke="#444" />
        <polygon points="-15,-8 -100,-16 -90,-12 -15,8" fill="#1a1a1a" stroke="#333" />
        <polygon points="15,-8 100,-16 90,-12 15,8" fill="#1a1a1a" stroke="#333" />
        {/* Left engine - fails */}
        <g transform="translate(-50, -10)">
          <ellipse cx="0" cy="0" rx="14" ry="8" fill={engineFailed ? '#3a1a1a' : '#1a3a1a'} stroke={engineFailed ? '#ff4444' : '#00ff88'} strokeWidth="2" />
          {!engineFailed && (
            <ellipse cx="16" cy="0" rx="6" ry="4" fill="#ff6600" opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.4s" repeatCount="indefinite" />
            </ellipse>
          )}
          {engineFailed && (
            <>
              <text x="0" y="3" textAnchor="middle" fill="#ff4444" fontSize="7" fontFamily="monospace" fontWeight="bold">FAIL</text>
              {/* Smoke */}
              <circle cx="18" cy="-3" r="4" fill="#666" opacity="0.4">
                <animate attributeName="r" values="4;8;4" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1s" repeatCount="indefinite" />
              </circle>
            </>
          )}
          <text x="0" y="-14" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">ENG 1</text>
        </g>
        {/* Right engine - working */}
        <g transform="translate(50, -10)">
          <ellipse cx="0" cy="0" rx="14" ry="8" fill="#1a3a1a" stroke="#00ff88" strokeWidth="2" />
          <ellipse cx="16" cy="0" rx="6" ry="4" fill="#ff6600" opacity="0.7">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.3s" repeatCount="indefinite" />
          </ellipse>
          <text x="0" y="-14" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">ENG 2</text>
        </g>
        <polygon points="-5,48 5,48 0,62" fill="#1a1a1a" stroke="#333" />
      </g>
      {/* Yaw indicator */}
      <rect x="10" y="10" width="140" height="25" rx="4" fill={engineFailed && !corrected ? '#3a1a1a' : corrected ? '#1a3a1a' : '#1a1a1a'} stroke={engineFailed && !corrected ? '#ff4444' : corrected ? '#00ff88' : '#333'} />
      <text x="80" y="27" textAnchor="middle" fill={engineFailed && !corrected ? '#ff4444' : corrected ? '#00ff88' : '#888'} fontSize="10" fontFamily="monospace" fontWeight="bold">
        {!engineFailed ? 'NORMAL FLIGHT' : corrected ? 'YAW CORRECTED' : '⚠ YAW — 偏航!'}
      </text>
      {/* Procedure steps */}
      <g transform="translate(20, 190)">
        <text x="0" y="0" fill="#00ff88" fontSize="9" fontFamily="monospace" fontWeight="bold">处置程序:</text>
        <text x="0" y="14" fill={engineFailed ? '#ffaa00' : '#6a8a6a'} fontSize="8" fontFamily="monospace">{engineFailed ? '✓' : '○'} 保持飞机控制</text>
        <text x="0" y="26" fill={phase > 50 ? '#ffaa00' : '#6a8a6a'} fontSize="8" fontFamily="monospace">{phase > 50 ? '✓' : '○'} 关闭故障引擎</text>
        <text x="0" y="38" fill={corrected ? '#00ff88' : '#6a8a6a'} fontSize="8" fontFamily="monospace">{corrected ? '✓' : '○'} 修正偏航 + 调整推力</text>
      </g>
      {/* Asymmetric thrust arrows */}
      {engineFailed && !corrected && (
        <>
          <line x1="250" y1="100" x2="280" y2="100" stroke="#ff4444" strokeWidth="2" markerEnd="url(#arrowRed)" />
          <text x="290" y="104" fill="#ff4444" fontSize="8" fontFamily="monospace">偏航力</text>
          <line x1="250" y1="120" x2="220" y2="120" stroke="#00ff88" strokeWidth="2" />
          <text x="200" y="135" fill="#00ff88" fontSize="8" fontFamily="monospace">修正力</text>
        </>
      )}
    </svg>
  );
}

function EmergencyStallAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 200), 50);
    return () => clearInterval(interval);
  }, []);
  const isStalled = phase > 20 && phase < 100;
  const recovering = phase >= 100;
  const pitch = isStalled ? 15 - (phase - 20) * 0.05 : recovering ? Math.max(-5, 10 - (phase - 100) * 0.2) : 15;
  const speed = isStalled ? Math.max(80, 130 - (phase - 20) * 0.6) : recovering ? 80 + (phase - 100) * 1.2 : 130;
  const altitude = isStalled ? 8000 - (phase - 20) * 15 : recovering ? Math.max(5000, 6800 - (phase - 100) * 5) : 8000;
  const buffet = isStalled ? (Math.random() - 0.5) * 5 : 0;
  const warningFlash = isStalled && Math.floor(phase / 5) % 2 === 0;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="stallSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a3a5c" />
          <stop offset="100%" stopColor="#4a7ba8" />
        </linearGradient>
        <linearGradient id="stallGround" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6a5a20" />
          <stop offset="100%" stopColor="#3a2a08" />
        </linearGradient>
        <filter id="stallGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="warningGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g transform={`rotate(${buffet}, 200, 120)`}>
        <rect width="400" height="240" fill="url(#stallSky)" />
        <rect x="0" y={120 + pitch * 2} width="400" height={120 - pitch * 2} fill="url(#stallGround)" />
        <line x1="0" y1={120 + pitch * 2} x2="400" y2={120 + pitch * 2} stroke="white" strokeWidth="1.5" opacity="0.5" />
        {/* Pitch ladder */}
        {[-10, -5, 5, 10, 15].map(p => (
          <g key={p}>
            <line x1="160" y1={120 + pitch * 2 - p * 3} x2="175" y2={120 + pitch * 2 - p * 3} stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="225" y1={120 + pitch * 2 - p * 3} x2="240" y2={120 + pitch * 2 - p * 3} stroke="white" strokeWidth="1" opacity="0.4" />
            <text x="155" y={123 + pitch * 2 - p * 3} textAnchor="end" fill="white" fontSize="7" fontFamily="monospace" opacity="0.4">{Math.abs(p)}</text>
          </g>
        ))}
      </g>
      {/* Aircraft symbol with buffet */}
      <g transform={`translate(200, 120) rotate(${-pitch + buffet})`}>
        <rect x="-35" y="-3" width="25" height="6" fill="#ffcc00" />
        <rect x="10" y="-3" width="25" height="6" fill="#ffcc00" />
        <circle cx="0" cy="0" r="5" fill="none" stroke="#ffcc00" strokeWidth="2" />
        <rect x="-2" y="6" width="4" height="8" fill="#ffcc00" />
      </g>
      {/* Stall warning - enhanced */}
      {isStalled && (
        <>
          <rect x="100" y="5" width="200" height="35" rx="4" fill={warningFlash ? '#ff0000' : '#880000'} opacity="0.95" filter="url(#warningGlow)">
            <animate attributeName="opacity" values="0.95;0.5;0.95" dur="0.3s" repeatCount="indefinite" />
          </rect>
          <text x="200" y="22" textAnchor="middle" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" filter="url(#stallGlow)">
            ⚠ STALL WARNING
          </text>
          <text x="200" y="36" textAnchor="middle" fill="#ffcc00" fontSize="10" fontFamily="monospace" fontWeight="bold">
            PUSH NOSE DOWN!
          </text>
          {/* Stick shaker indicator */}
          <g transform="translate(50, 60)">
            <rect x="-25" y="-12" width="50" height="24" rx="4" fill="#ff4444" opacity="0.8">
              <animate attributeName="x" values="-25;-23;-25" dur="0.1s" repeatCount="indefinite" />
            </rect>
            <text x="0" y="4" textAnchor="middle" fill="white" fontSize="8" fontFamily="monospace" fontWeight="bold">SHAKER</text>
          </g>
          {/* AoA indicator */}
          <g transform="translate(350, 60)">
            <rect x="-30" y="-15" width="60" height="30" rx="4" fill="#0a0a0a" stroke="#ff4444" strokeWidth="2" />
            <text x="0" y="-3" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">AOA</text>
            <text x="0" y="10" textAnchor="middle" fill="#ff4444" fontSize="12" fontFamily="monospace" fontWeight="bold">
              {(15 + pitch * 0.5).toFixed(0)}°
            </text>
          </g>
        </>
      )}
      {recovering && (
        <>
          <rect x="100" y="5" width="200" height="35" rx="4" fill="#1a3a1a" stroke="#00ff88" strokeWidth="2" filter="url(#stallGlow)" />
          <text x="200" y="22" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold">
            ✓ RECOVERING
          </text>
          <text x="200" y="36" textAnchor="middle" fill="#00ff88" fontSize="10" fontFamily="monospace">
            速度恢复中...
          </text>
        </>
      )}
      {/* Instruments - enhanced */}
      <rect x="10" y="175" width="120" height="55" rx="4" fill="#0a0a0a" stroke={isStalled ? '#ff4444' : '#1a3a1a'} strokeWidth="2" />
      <text x="70" y="192" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">AIRSPEED</text>
      <text x="70" y="218" textAnchor="middle" fill={isStalled ? '#ff4444' : '#00ff88'} fontSize="22" fontFamily="monospace" fontWeight="bold" filter="url(#stallGlow)">
        {Math.round(speed)}
      </text>
      <text x="70" y="228" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">KTS</text>
      {/* Stall speed marker */}
      <line x1="10" y1={175 + (130 - speed) * 0.5} x2="130" y2={175 + (130 - speed) * 0.5} stroke="#ff4444" strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
      
      <rect x="140" y="175" width="120" height="55" rx="4" fill="#0a0a0a" stroke={pitch > 10 ? '#ffaa00' : '#1a3a1a'} strokeWidth="2" />
      <text x="200" y="192" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">PITCH</text>
      <text x="200" y="218" textAnchor="middle" fill={pitch > 10 ? '#ffaa00' : '#00ff88'} fontSize="22" fontFamily="monospace" fontWeight="bold" filter="url(#stallGlow)">
        {pitch.toFixed(1)}°
      </text>
      <text x="200" y="228" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">DEGREES</text>
      
      <rect x="270" y="175" width="120" height="55" rx="4" fill="#0a0a0a" stroke={isStalled ? '#ffaa00' : '#1a3a1a'} strokeWidth="2" />
      <text x="330" y="192" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">ALTITUDE</text>
      <text x="330" y="218" textAnchor="middle" fill={isStalled ? '#ffaa00' : '#00ff88'} fontSize="18" fontFamily="monospace" fontWeight="bold" filter="url(#stallGlow)">
        {Math.round(altitude).toLocaleString()}
      </text>
      <text x="330" y="228" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">FT</text>
      
      {/* Recovery instruction - enhanced */}
      {isStalled && (
        <g>
          <rect x="120" y="155" width="160" height="18" rx="3" fill="#ffaa00" opacity="0.9" />
          <text x="200" y="168" textAnchor="middle" fill="#000" fontSize="11" fontFamily="monospace" fontWeight="bold">
            ↓ 推杆 + W 加油门！
          </text>
        </g>
      )}
      {/* Altitude loss warning */}
      {isStalled && altitude < 6000 && (
        <g>
          <text x="200" y="145" textAnchor="middle" fill="#ff4444" fontSize="10" fontFamily="monospace" fontWeight="bold">
            ⚠ ALTITUDE LOSS: {Math.round(8000 - altitude)} ft
          </text>
        </g>
      )}
    </svg>
  );
}

function EmergencyWindshearAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 180), 50);
    return () => clearInterval(interval);
  }, []);
  const stage = phase < 40 ? 'headwind' : phase < 80 ? 'downdraft' : phase < 120 ? 'tailwind' : 'recovery';
  const aircraftY = stage === 'downdraft' ? 130 + (phase - 40) * 0.5 : stage === 'tailwind' ? 150 - (phase - 80) * 0.3 : stage === 'recovery' ? 138 - (phase - 120) * 0.8 : 130;
  const aircraftPitch = stage === 'headwind' ? 5 : stage === 'downdraft' ? -3 : stage === 'tailwind' ? 8 : 12;
  const turbulence = stage !== 'recovery' ? (Math.random() - 0.5) * 2 : 0;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="wsSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a3a4a" />
          <stop offset="100%" stopColor="#4a5a6a" />
        </linearGradient>
        <filter id="wsGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="stormGlow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="240" fill="url(#wsSky)" />
      {/* Storm clouds - enhanced */}
      {[0, 1, 2, 3, 4].map(i => (
        <g key={i}>
          <ellipse cx={60 + i * 80} cy={25 + i * 8} rx={55 + i * 12} ry={22 + i * 6} fill="#1a1a2a" opacity="0.8" />
          <ellipse cx={70 + i * 80} cy={30 + i * 8} rx={45 + i * 10} ry={18 + i * 5} fill="#2a2a3a" opacity="0.6" />
          {/* Lightning */}
          {i === 2 && phase % 40 < 5 && (
            <path d={`M ${70 + i * 80},${50 + i * 8} L ${75 + i * 80},${70 + i * 8} L ${68 + i * 80},${75 + i * 8} L ${73 + i * 80},${95 + i * 8}`} 
              fill="none" stroke="#ffff88" strokeWidth="2" opacity="0.9" filter="url(#stormGlow)">
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.1s" repeatCount="indefinite" />
            </path>
          )}
        </g>
      ))}
      {/* Rain */}
      {stage !== 'recovery' && [...Array(20)].map((_, i) => (
        <line key={i} 
          x1={20 + (i * 23 + phase * 2) % 400} 
          y1={40 + (i * 17 + phase * 3) % 150} 
          x2={18 + (i * 23 + phase * 2) % 400} 
          y2={50 + (i * 17 + phase * 3) % 150} 
          stroke="#88aacc" strokeWidth="1" opacity="0.4" />
      ))}
      {/* Ground/runway */}
      <rect x="0" y="190" width="400" height="50" fill="#3a3a3a" />
      <line x1="0" y1="190" x2="400" y2="190" stroke="#666" />
      {[...Array(6)].map((_, i) => (
        <rect key={i} x={20 + i * 70} y="205" width="40" height="3" fill="white" opacity="0.3" />
      ))}
      {/* Runway lights */}
      {[...Array(8)].map((_, i) => (
        <circle key={i} cx={25 + i * 50} cy="190" r="2" fill="#ffff00" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1s" repeatCount="indefinite" />
        </circle>
      ))}
      {/* Wind arrows - enhanced */}
      {stage === 'headwind' && (
        <>
          {[0, 1, 2, 3].map(i => (
            <g key={i} transform={`translate(${30 + i * 100}, ${70 + i * 15})`}>
              <line x1="0" y1="0" x2="50" y2="0" stroke="#00ff88" strokeWidth="3" filter="url(#wsGlow)" />
              <polygon points="50,0 40,-6 40,6" fill="#00ff88" filter="url(#wsGlow)" />
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.4s" repeatCount="indefinite" />
            </g>
          ))}
          <text x="200" y="165" textAnchor="middle" fill="#00ff88" fontSize="13" fontFamily="monospace" fontWeight="bold" filter="url(#wsGlow)">
            逆风增强 HEADWIND +30kts
          </text>
          {/* Speed increase indicator */}
          <g transform="translate(350, 100)">
            <rect x="-25" y="-15" width="50" height="30" rx="4" fill="#0a0a0a" stroke="#00ff88" strokeWidth="2" />
            <text x="0" y="-3" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">IAS</text>
            <text x="0" y="10" textAnchor="middle" fill="#00ff88" fontSize="12" fontFamily="monospace" fontWeight="bold">+30</text>
          </g>
        </>
      )}
      {stage === 'downdraft' && (
        <>
          {[0, 1, 2, 3, 4].map(i => (
            <g key={i} transform={`translate(${40 + i * 80}, ${40 + i * 8})`}>
              <line x1="0" y1="0" x2="0" y2="50" stroke="#ff4444" strokeWidth="3" filter="url(#wsGlow)" />
              <polygon points="0,50 -7,40 7,40" fill="#ff4444" filter="url(#wsGlow)" />
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.3s" repeatCount="indefinite" />
            </g>
          ))}
          <text x="200" y="165" textAnchor="middle" fill="#ff4444" fontSize="13" fontFamily="monospace" fontWeight="bold" filter="url(#wsGlow)">
            ⚠ 下沉气流 DOWNDRAFT -1500fpm!
          </text>
          {/* Altitude loss indicator */}
          <g transform="translate(350, 100)">
            <rect x="-25" y="-15" width="50" height="30" rx="4" fill="#0a0a0a" stroke="#ff4444" strokeWidth="2" />
            <text x="0" y="-3" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">VS</text>
            <text x="0" y="10" textAnchor="middle" fill="#ff4444" fontSize="11" fontFamily="monospace" fontWeight="bold">-1500</text>
          </g>
        </>
      )}
      {stage === 'tailwind' && (
        <>
          {[0, 1, 2, 3].map(i => (
            <g key={i} transform={`translate(${60 + i * 90}, ${80 + i * 12})`}>
              <line x1="50" y1="0" x2="0" y2="0" stroke="#ffaa00" strokeWidth="3" filter="url(#wsGlow)" />
              <polygon points="0,0 10,-6 10,6" fill="#ffaa00" filter="url(#wsGlow)" />
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" />
            </g>
          ))}
          <text x="200" y="165" textAnchor="middle" fill="#ffaa00" fontSize="13" fontFamily="monospace" fontWeight="bold" filter="url(#wsGlow)">
            ⚠ 顺风增强 TAILWIND -25kts!
          </text>
          {/* Speed loss indicator */}
          <g transform="translate(350, 100)">
            <rect x="-25" y="-15" width="50" height="30" rx="4" fill="#0a0a0a" stroke="#ffaa00" strokeWidth="2" />
            <text x="0" y="-3" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">IAS</text>
            <text x="0" y="10" textAnchor="middle" fill="#ffaa00" fontSize="12" fontFamily="monospace" fontWeight="bold">-25</text>
          </g>
        </>
      )}
      {stage === 'recovery' && (
        <>
          <text x="200" y="165" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold" filter="url(#wsGlow)">
            ✓ 改出成功 RECOVERY
          </text>
          {/* Climb indicator */}
          <g transform="translate(350, 100)">
            <rect x="-25" y="-15" width="50" height="30" rx="4" fill="#0a0a0a" stroke="#00ff88" strokeWidth="2" />
            <text x="0" y="-3" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">VS</text>
            <text x="0" y="10" textAnchor="middle" fill="#00ff88" fontSize="11" fontFamily="monospace" fontWeight="bold">+2000</text>
          </g>
        </>
      )}
      {/* Aircraft with turbulence */}
      <g transform={`translate(200, ${aircraftY + turbulence}) rotate(${aircraftPitch + turbulence})`}>
        <ellipse cx="0" cy="0" rx="28" ry="6" fill="#c0c8d0" />
        <polygon points="-10,-4 -35,-16 -30,-14 -6,-2" fill="#a0a8b0" />
        <polygon points="10,-4 35,-16 30,-14 6,-2" fill="#a0a8b0" />
        <polygon points="-25,-2 -32,-12 -28,-10 -22,-2" fill="#a0a8b0" />
        {/* Engine glow - TOGA */}
        <ellipse cx="-20" cy="4" rx="7" ry="4" fill="#ff6600" opacity="0.9" filter="url(#wsGlow)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="0.15s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="20" cy="4" rx="7" ry="4" fill="#ff6600" opacity="0.9" filter="url(#wsGlow)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="0.15s" repeatCount="indefinite" />
        </ellipse>
        {/* Exhaust plumes */}
        <ellipse cx="-30" cy="4" rx="12" ry="3" fill="#ff4400" opacity="0.4" filter="url(#wsGlow)">
          <animate attributeName="rx" values="12;18;12" dur="0.3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="30" cy="4" rx="12" ry="3" fill="#ff4400" opacity="0.4" filter="url(#wsGlow)">
          <animate attributeName="rx" values="12;18;12" dur="0.3s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* Warning - enhanced */}
      {stage !== 'recovery' && (
        <>
          <rect x="80" y="5" width="240" height="30" rx="4" fill="#ff0000" opacity="0.9" filter="url(#stormGlow)">
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="0.4s" repeatCount="indefinite" />
          </rect>
          <text x="200" y="20" textAnchor="middle" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold">
            ⚠ WIND SHEAR — TOGA!
          </text>
          <text x="200" y="32" textAnchor="middle" fill="#ffcc00" fontSize="9" fontFamily="monospace">
            MAX THRUST + 15° PITCH
          </text>
        </>
      )}
      {/* PWS indicator */}
      <g transform="translate(50, 210)">
        <rect x="-35" y="-12" width="70" height="24" rx="4" fill={stage !== 'recovery' ? '#ff4444' : '#1a3a1a'} opacity="0.9" />
        <text x="0" y="4" textAnchor="middle" fill="white" fontSize="8" fontFamily="monospace" fontWeight="bold">
          {stage !== 'recovery' ? 'PWS ALERT' : 'PWS CLEAR'}
        </text>
      </g>
    </svg>
  );
}

function AnimationRenderer({ type }: { type: TutorialStep['animation'] }) {
  switch (type) {
    case 'welcome': return <WelcomeAnimation />;
    case 'pitch': return <PitchAnimation />;
    case 'throttle': return <ThrottleAnimation />;
    case 'engine': return <EngineAnimation />;
    case 'takeoff': return <TakeoffAnimation />;
    case 'gear': return <GearAnimation />;
    case 'flaps': return <FlapsAnimation />;
    case 'autopilot': return <AutopilotAnimation />;
    case 'autothrottle': return <AutothrottleAnimation />;
    case 'reverse': return <ReverseAnimation />;
    case 'ground': return <GroundAnimation />;
    case 'emergency_engine': return <EmergencyEngineAnimation />;
    case 'emergency_stall': return <EmergencyStallAnimation />;
    case 'emergency_windshear': return <EmergencyWindshearAnimation />;
    case 'ready': return <ReadyAnimation />;
    default: return null;
  }
}

export default function TutorialPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const router = useRouter();
  const { dispatch } = useFlight();

  useKeyboardControls({ dispatch, enabled: true });

  const step = tutorialSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
    } else {
      // Set takeoff-ready state for flight sim
      sessionStorage.setItem('startTakeoff', 'true');
      router.push('/flight-sim-main');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    router.push('/flight-sim-main');
  };

  return (
    <div className="pg-root">
      <style dangerouslySetInnerHTML={{__html:`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pg-root { display: flex; flex-direction: column; width: 100%; min-height: 720px; background: var(--color-surface-variant); font-family: 'Segoe UI', system-ui, sans-serif; color: var(--color-on-surface); }
        .tt-nav { display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 32px; background: var(--color-surface); border-bottom: 1px solid color-mix(in srgb, var(--color-on-surface) 8%, transparent); }
        .tt-logo { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; letter-spacing: 1px; }
        .tt-logo svg { color: var(--color-primary); }
        .tt-nav-right { display: flex; align-items: center; gap: 16px; }
        .tt-skip-btn { background: none; border: 1px solid color-mix(in srgb, var(--color-on-surface) 20%, transparent); color: var(--color-on-surface-2); padding: 6px 16px; border-radius: var(--rounded-sm); font-size: 13px; cursor: pointer; }
        .tt-skip-btn:hover { background: color-mix(in srgb, var(--color-on-surface) 5%, transparent); }
        .tt-progress-bar { display: flex; align-items: center; gap: 4px; padding: 16px 32px; background: var(--color-surface); }
        .tt-step-dot { width: 100%; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--color-on-surface) 12%, transparent); flex: 1; }
        .tt-step-dot.active { background: var(--color-primary); }
        .tt-step-dot.done { background: color-mix(in srgb, var(--color-primary) 50%, transparent); }
        .tt-progress-label { font-size: 12px; color: var(--color-on-surface-2); margin-left: 12px; white-space: nowrap; font-family: 'Courier New', monospace; }
        .tt-main { display: flex; flex: 1; padding: 24px 32px; gap: 24px; overflow-y: auto; }
        .tt-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .tt-step-header { margin-bottom: 16px; }
        .tt-step-num { font-size: 12px; color: var(--color-primary); font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; font-family: 'Courier New', monospace; }
        .tt-step-title { font-size: 26px; font-weight: 700; margin-bottom: 8px; }
        .tt-step-desc { font-size: 14px; color: var(--color-on-surface-2); line-height: 1.6; max-width: 520px; }
        .tt-principle { margin-top: 12px; padding: 12px 16px; background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface)); border-left: 3px solid var(--color-primary); border-radius: 0 var(--rounded-sm) var(--rounded-sm) 0; }
        .tt-principle-label { font-size: 10px; color: var(--color-primary); font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; font-family: 'Courier New', monospace; }
        .tt-principle-text { font-size: 13px; color: var(--color-on-surface-2); line-height: 1.6; }
        .tt-key-demo { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
        .tt-key-row { display: flex; align-items: center; gap: 12px; }
        .tt-key-cap { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 44px; padding: 0 12px; background: var(--color-surface); border: 2px solid color-mix(in srgb, var(--color-primary) 40%, transparent); border-radius: var(--rounded-md); font-size: 15px; font-weight: 700; font-family: 'Courier New', monospace; color: var(--color-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05); flex-shrink: 0; }
        .tt-key-cap.highlight { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)); box-shadow: 0 0 16px color-mix(in srgb, var(--color-primary) 30%, transparent), 0 2px 8px rgba(0,0,0,0.3); }
        .tt-key-label { font-size: 13px; color: var(--color-on-surface-2); line-height: 1.4; }
        .tt-visual { width: 420px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
        .tt-visual-anim { width: 100%; height: 240px; border-radius: var(--rounded-lg); overflow: hidden; border: 1px solid color-mix(in srgb, var(--color-on-surface) 8%, transparent); background: #0a0a0a; }
        .tt-visual-card { background: var(--color-surface); border-radius: var(--rounded-lg); padding: 16px; border: 1px solid color-mix(in srgb, var(--color-on-surface) 8%, transparent); }
        .tt-visual-card-title { font-size: 12px; font-weight: 600; color: var(--color-primary); margin-bottom: 10px; letter-spacing: 1px; text-transform: uppercase; font-family: 'Courier New', monospace; }
        .tt-ctrl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .tt-ctrl-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-on-surface-2); }
        .tt-ctrl-key { background: color-mix(in srgb, var(--color-on-surface) 8%, transparent); padding: 2px 8px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 11px; color: var(--color-on-surface); font-weight: 600; }
        .tt-footer { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; background: var(--color-surface); border-top: 1px solid color-mix(in srgb, var(--color-on-surface) 8%, transparent); }
        .tt-footer-left { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-on-surface-2); }
        .tt-footer-left svg { color: var(--color-secondary); }
        .tt-nav-btns { display: flex; gap: 12px; }
        .tt-btn-prev { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid color-mix(in srgb, var(--color-on-surface) 15%, transparent); color: var(--color-on-surface-2); padding: 10px 20px; border-radius: var(--rounded-md); font-size: 14px; cursor: pointer; }
        .tt-btn-prev:hover { background: color-mix(in srgb, var(--color-on-surface) 5%, transparent); }
        .tt-btn-prev:disabled { opacity: 0.3; cursor: not-allowed; }
        .tt-btn-next { display: flex; align-items: center; gap: 6px; background: var(--color-primary); border: none; color: var(--color-surface-variant); padding: 10px 24px; border-radius: var(--rounded-md); font-size: 14px; font-weight: 600; cursor: pointer; }
        .tt-btn-next:hover { opacity: 0.9; }
        .tt-step-list { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; max-height: 200px; overflow-y: auto; }
        .tt-step-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--rounded-sm); font-size: 12px; color: var(--color-on-surface-2); cursor: pointer; }
        .tt-step-item:hover { background: color-mix(in srgb, var(--color-on-surface) 5%, transparent); }
        .tt-step-item.current { background: color-mix(in srgb, var(--color-primary) 8%, transparent); color: var(--color-on-surface); }
        .tt-step-item.done-item { color: color-mix(in srgb, var(--color-primary) 70%, transparent); }
        .tt-step-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tt-step-icon svg { width: 12px; height: 12px; }
      `}} />

      <nav className="tt-nav">
        <div className="tt-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
          <span>B777-9 FLIGHT SIMULATOR</span>
        </div>
        <div className="tt-nav-right">
          <button className="tt-skip-btn" onClick={handleSkip}>跳过教程 →</button>
        </div>
      </nav>

      <div className="tt-progress-bar">
        {tutorialSteps.map((_, idx) => (
          <div
            key={idx}
            className={`tt-step-dot ${idx === currentStep ? 'active' : idx < currentStep ? 'done' : ''}`}
          />
        ))}
        <span className="tt-progress-label">STEP {String(currentStep + 1).padStart(2, '0')} / {String(tutorialSteps.length).padStart(2, '0')}</span>
      </div>

      <div className="tt-main">
        <div className="tt-content">
          <div className="tt-step-header">
            <div className="tt-step-num">STEP {String(currentStep + 1).padStart(2, '0')} — {step.title}</div>
            <div className="tt-step-title">{step.title}</div>
            <div className="tt-step-desc">{step.description}</div>
          </div>

          {/* Principle explanation */}
          <div className="tt-principle">
            <div className="tt-principle-label">原理讲解</div>
            <div className="tt-principle-text">{step.principle}</div>
          </div>

          {step.keys.length > 0 && (
            <div className="tt-key-demo">
              {step.keys.map((k, idx) => (
                <div key={idx} className="tt-key-row">
                  <div className="tt-key-cap highlight">{k.key === 'ArrowUp' ? '↑' : k.key === 'ArrowDown' ? '↓' : k.key === 'ArrowLeft' ? '←' : k.key === 'ArrowRight' ? '→' : k.key.toUpperCase()}</div>
                  <div className="tt-key-label">{k.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="tt-step-list">
            {tutorialSteps.map((s, idx) => (
              <div
                key={idx}
                className={`tt-step-item ${idx === currentStep ? 'current' : idx < currentStep ? 'done-item' : ''}`}
                onClick={() => setCurrentStep(idx)}
              >
                <div className="tt-step-icon">
                  {idx < currentStep ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : idx === currentStep ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                  )}
                </div>
                <span>{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tt-visual">
          <div className="tt-visual-anim">
            <AnimationRenderer type={step.animation} />
          </div>
          <div className="tt-visual-card">
            <div className="tt-visual-card-title">全部操控键位</div>
            <div className="tt-ctrl-grid">
              <div className="tt-ctrl-item"><span className="tt-ctrl-key">↑↓←→</span> 姿态控制</div>
              <div className="tt-ctrl-item"><span className="tt-ctrl-key">W / S</span> 油门增减</div>
              <div className="tt-ctrl-item"><span className="tt-ctrl-key">G</span> 起落架</div>
              <div className="tt-ctrl-item"><span className="tt-ctrl-key">[ / ]</span> 襟翼</div>
              <div className="tt-ctrl-item"><span className="tt-ctrl-key">P</span> 自动驾驶</div>
              <div className="tt-ctrl-item"><span className="tt-ctrl-key">T</span> 自动油门</div>
              <div className="tt-ctrl-item"><span className="tt-ctrl-key">1 / 2</span> 引擎开关</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tt-footer">
        <div className="tt-footer-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          点击按钮继续，或随时跳过教程 · 左侧步骤列表可直接跳转
        </div>
        <div className="tt-nav-btns">
          <button className="tt-btn-prev" onClick={handlePrev} disabled={currentStep === 0}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            上一步
          </button>
          <button className="tt-btn-next" onClick={handleNext}>
            {currentStep === tutorialSteps.length - 1 ? '开始飞行' : '下一步'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
