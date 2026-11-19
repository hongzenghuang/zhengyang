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
  animation: 'welcome' | 'pitch' | 'throttle' | 'engine' | 'takeoff' | 'gear' | 'flaps' | 'autopilot' | 'autothrottle' | 'reverse' | 'ground' | 'ready';
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
    title: '准备起飞',
    description: '您已学习完所有操控方法和飞行原理。现在可以进入模拟飞行，体验驾驶波音 777-9 的乐趣！记住标准起飞流程：襟翼 → 油门 → 抬轮 → 收起落架。',
    principle: '完整飞行剖面：起飞（Takeoff）→ 爬升（Climb）→ 巡航（Cruise）→ 下降（Descent）→ 进近（Approach）→ 着陆（Landing）。每个阶段有不同的速度、高度和构型要求。777-9 的典型巡航参数：高度 35,000-43,000 英尺，马赫数 0.84（约 480 节 TAS），油耗约 6,800 公斤/小时。',
    keys: [],
    animation: 'ready',
  },
];

// SVG Animation Components
function WelcomeAnimation() {
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="skyBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0a1628" />
          <stop offset="100%" stopColor="#1a3a5c" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#skyBg)" />
      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <circle key={i} cx={20 + i * 19} cy={10 + (i * 37) % 100} r="1" fill="white" opacity={0.3 + (i % 3) * 0.2}>
          <animate attributeName="opacity" values={`${0.2 + (i % 3) * 0.2};${0.6 + (i % 2) * 0.3};${0.2 + (i % 3) * 0.2}`} dur={`${2 + i % 3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* 777-9 silhouette */}
      <g transform="translate(200, 130)">
        <animateTransform attributeName="transform" type="translate" values="200,130;200,125;200,130" dur="4s" repeatCount="indefinite" />
        {/* Fuselage */}
        <ellipse cx="0" cy="0" rx="80" ry="8" fill="#c0c8d0" />
        {/* Wings */}
        <polygon points="-20,-6 -60,-30 -55,-28 -15,-4" fill="#a0a8b0" />
        <polygon points="20,-6 60,-30 55,-28 15,-4" fill="#a0a8b0" />
        {/* Tail */}
        <polygon points="-70,-2 -85,-25 -78,-22 -68,-2" fill="#a0a8b0" />
        {/* Engines */}
        <ellipse cx="-35" cy="4" rx="12" ry="5" fill="#808890" />
        <ellipse cx="35" cy="4" rx="12" ry="5" fill="#808890" />
        {/* Engine glow */}
        <ellipse cx="-47" cy="4" rx="4" ry="3" fill="#ff8844" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="23" cy="4" rx="4" ry="3" fill="#ff8844" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.5s" repeatCount="indefinite" />
        </ellipse>
        {/* Windows */}
        {[...Array(12)].map((_, i) => (
          <rect key={i} x={-50 + i * 8} y="-3" width="4" height="2" rx="1" fill="#88ccff" opacity="0.7" />
        ))}
      </g>
      {/* Title */}
      <text x="200" y="200" textAnchor="middle" fill="#00ff88" fontSize="18" fontWeight="bold" fontFamily="monospace">BOEING 777-9</text>
      <text x="200" y="220" textAnchor="middle" fill="#6a8a6a" fontSize="10" fontFamily="monospace">FLIGHT SIMULATOR</text>
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
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="pitchSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a4a7a" />
          <stop offset="100%" stopColor="#4a8aba" />
        </linearGradient>
        <linearGradient id="pitchGround" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8a6a20" />
          <stop offset="100%" stopColor="#4a3008" />
        </linearGradient>
      </defs>
      <g transform={`rotate(${pitch}, 200, 120)`}>
        <rect x="0" y="0" width="400" height="120" fill="url(#pitchSky)" />
        <rect x="0" y="120" width="400" height="120" fill="url(#pitchGround)" />
        <line x1="0" y1="120" x2="400" y2="120" stroke="white" strokeWidth="2" />
      </g>
      {/* Fixed aircraft */}
      <g transform="translate(200, 120)">
        <rect x="-40" y="-3" width="30" height="6" fill="#ffcc00" />
        <rect x="10" y="-3" width="30" height="6" fill="#ffcc00" />
        <circle cx="0" cy="0" r="5" fill="none" stroke="#ffcc00" strokeWidth="2" />
      </g>
      {/* Pitch indicator */}
      <text x="350" y="30" textAnchor="end" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold">
        PITCH {pitch.toFixed(1)}°
      </text>
      {/* Arrow indicators */}
      <g transform="translate(50, 60)">
        <polygon points="0,-15 8,0 -8,0" fill="#00ff88" opacity={pitch > 0 ? 1 : 0.3}>
          <animate attributeName="opacity" values={pitch > 0 ? "1;0.5;1" : "0.3;0.3;0.3"} dur="1s" repeatCount="indefinite" />
        </polygon>
        <text x="0" y="15" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">↑ 拉杆</text>
      </g>
      <g transform="translate(50, 180)">
        <polygon points="0,15 8,0 -8,0" fill="#ffaa00" opacity={pitch < 0 ? 1 : 0.3}>
          <animate attributeName="opacity" values={pitch < 0 ? "1;0.5;1" : "0.3;0.3;0.3"} dur="1s" repeatCount="indefinite" />
        </polygon>
        <text x="0" y="-8" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">↓ 推杆</text>
      </g>
    </svg>
  );
}

function ThrottleAnimation() {
  const [throttle, setThrottle] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setThrottle(t => {
        const next = t + 1.5;
        return next > 100 ? 0 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);
  const n1 = throttle * 0.85 + 15;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <rect width="400" height="240" fill="#0a0a0a" />
      {/* Engine cross-section */}
      <g transform="translate(200, 100)">
        <circle cx="0" cy="0" r="60" fill="none" stroke="#333" strokeWidth="2" />
        <circle cx="0" cy="0" r="50" fill="none" stroke="#1a3a1a" strokeWidth="1" />
        {/* Fan blades */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 45 + throttle * 3) * Math.PI / 180;
          return (
            <line key={i} x1="0" y1="0" x2={Math.cos(angle) * 45} y2={Math.sin(angle) * 45}
              stroke="#6a8a6a" strokeWidth="3" strokeLinecap="round" />
          );
        })}
        <circle cx="0" cy="0" r="8" fill="#333" />
        {/* Exhaust glow */}
        <ellipse cx="75" cy="0" rx={10 + throttle * 0.3} ry={8 + throttle * 0.15}
          fill="#ff6600" opacity={throttle / 200}>
          <animate attributeName="opacity" values={`${throttle / 250};${throttle / 150};${throttle / 250}`} dur="0.3s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* Throttle bar */}
      <rect x="30" y="180" width="340" height="20" rx="4" fill="#1a1a1a" stroke="#333" />
      <rect x="30" y="180" width={340 * throttle / 100} height="20" rx="4" fill="#00ff88" opacity="0.8" />
      <text x="200" y="195" textAnchor="middle" fill="white" fontSize="11" fontFamily="monospace" fontWeight="bold">
        THROTTLE {Math.round(throttle)}%
      </text>
      {/* N1 display */}
      <text x="200" y="225" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold">
        N1: {n1.toFixed(1)}%
      </text>
      {/* Labels */}
      <text x="30" y="175" fill="#6a8a6a" fontSize="9" fontFamily="monospace">IDLE</text>
      <text x="370" y="175" textAnchor="end" fill="#6a8a6a" fontSize="9" fontFamily="monospace">TOGA</text>
    </svg>
  );
}

function EngineAnimation() {
  const [eng1, setEng1] = useState(true);
  const [eng2, setEng2] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setEng1(e => !e);
      setTimeout(() => setEng2(e => !e), 1500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <rect width="400" height="240" fill="#0a0a0a" />
      {/* Aircraft top view */}
      <g transform="translate(200, 120)">
        {/* Fuselage */}
        <ellipse cx="0" cy="0" rx="15" ry="70" fill="#2a2a2a" stroke="#444" />
        {/* Wings */}
        <polygon points="-15,-10 -120,-20 -110,-15 -15,10" fill="#1a1a1a" stroke="#333" />
        <polygon points="15,-10 120,-20 110,-15 15,10" fill="#1a1a1a" stroke="#333" />
        {/* Left engine */}
        <g transform="translate(-60, -12)">
          <ellipse cx="0" cy="0" rx="18" ry="10" fill={eng1 ? '#1a3a1a' : '#3a1a1a'} stroke={eng1 ? '#00ff88' : '#ff4444'} strokeWidth="2" />
          {eng1 && (
            <>
              <ellipse cx="22" cy="0" rx="8" ry="5" fill="#ff6600" opacity="0.6">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.4s" repeatCount="indefinite" />
              </ellipse>
              <text x="0" y="4" textAnchor="middle" fill="#00ff88" fontSize="8" fontFamily="monospace" fontWeight="bold">ON</text>
            </>
          )}
          {!eng1 && <text x="0" y="4" textAnchor="middle" fill="#ff4444" fontSize="8" fontFamily="monospace" fontWeight="bold">OFF</text>}
          <text x="0" y="-16" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">ENG 1</text>
        </g>
        {/* Right engine */}
        <g transform="translate(60, -12)">
          <ellipse cx="0" cy="0" rx="18" ry="10" fill={eng2 ? '#1a3a1a' : '#3a1a1a'} stroke={eng2 ? '#00ff88' : '#ff4444'} strokeWidth="2" />
          {eng2 && (
            <>
              <ellipse cx="22" cy="0" rx="8" ry="5" fill="#ff6600" opacity="0.6">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.4s" repeatCount="indefinite" />
              </ellipse>
              <text x="0" y="4" textAnchor="middle" fill="#00ff88" fontSize="8" fontFamily="monospace" fontWeight="bold">ON</text>
            </>
          )}
          {!eng2 && <text x="0" y="4" textAnchor="middle" fill="#ff4444" fontSize="8" fontFamily="monospace" fontWeight="bold">OFF</text>}
          <text x="0" y="-16" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">ENG 2</text>
        </g>
        {/* Tail */}
        <polygon points="-5,60 5,60 0,80" fill="#1a1a1a" stroke="#333" />
      </g>
      {/* Key hints */}
      <rect x="60" y="210" width="40" height="20" rx="4" fill="#1a1a1a" stroke="#00ff88" />
      <text x="80" y="224" textAnchor="middle" fill="#00ff88" fontSize="12" fontFamily="monospace" fontWeight="bold">1</text>
      <rect x="300" y="210" width="40" height="20" rx="4" fill="#1a1a1a" stroke="#00ff88" />
      <text x="320" y="224" textAnchor="middle" fill="#00ff88" fontSize="12" fontFamily="monospace" fontWeight="bold">2</text>
    </svg>
  );
}

function TakeoffAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 200), 50);
    return () => clearInterval(interval);
  }, []);
  const speed = Math.min(180, phase * 1.8);
  const rotate = speed > 140 ? Math.min(15, (speed - 140) * 0.375) : 0;
  const altitude = speed > 150 ? (speed - 150) * 2 : 0;
  const groundY = 160 + altitude * 0.3;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="toSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a5a8a" />
          <stop offset="100%" stopColor="#6a9bc8" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#toSky)" />
      {/* Runway */}
      <rect x="0" y={groundY} width="400" height={240 - groundY} fill="#3a3a3a" />
      <line x1="0" y1={groundY} x2="400" y2={groundY} stroke="#666" strokeWidth="1" />
      {/* Runway markings */}
      {[...Array(8)].map((_, i) => (
        <rect key={i} x={((i * 60 - phase * 3) % 480) - 40} y={groundY + 10} width="30" height="3" fill="white" opacity="0.5" />
      ))}
      {/* Aircraft */}
      <g transform={`translate(150, ${groundY - 15}) rotate(${-rotate}, 0, 15)`}>
        <ellipse cx="0" cy="0" rx="35" ry="6" fill="#c0c8d0" />
        <polygon points="-10,-4 -40,-18 -35,-16 -5,-2" fill="#a0a8b0" />
        <polygon points="10,-4 40,-18 35,-16 5,-2" fill="#a0a8b0" />
        <polygon points="-30,-2 -38,-14 -34,-12 -28,-2" fill="#a0a8b0" />
        {/* Engine glow */}
        <ellipse cx="-25" cy="3" rx="5" ry="3" fill="#ff6600" opacity={speed > 10 ? 0.7 : 0}>
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="25" cy="3" rx="5" ry="3" fill="#ff6600" opacity={speed > 10 ? 0.7 : 0}>
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.3s" repeatCount="indefinite" />
        </ellipse>
        {/* Gear */}
        {altitude < 20 && (
          <>
            <line x1="-10" y1="6" x2="-10" y2="14" stroke="#666" strokeWidth="2" />
            <line x1="10" y1="6" x2="10" y2="14" stroke="#666" strokeWidth="2" />
            <circle cx="-10" cy="14" r="3" fill="#444" />
            <circle cx="10" cy="14" r="3" fill="#444" />
          </>
        )}
      </g>
      {/* Speed display */}
      <rect x="280" y="10" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="335" y="28" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">AIRSPEED</text>
      <text x="335" y="48" textAnchor="middle" fill="#00ff88" fontSize="18" fontFamily="monospace" fontWeight="bold">{Math.round(speed)}</text>
      <text x="335" y="58" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">KTS</text>
      {/* Phase labels */}
      {speed < 80 && <text x="200" y="230" textAnchor="middle" fill="#ffaa00" fontSize="11" fontFamily="monospace">TAKEOFF ROLL — 加速滑跑</text>}
      {speed >= 80 && speed < 140 && <text x="200" y="230" textAnchor="middle" fill="#ffaa00" fontSize="11" fontFamily="monospace">V1 APPROACHING — 接近决断速度</text>}
      {speed >= 140 && speed < 160 && <text x="200" y="230" textAnchor="middle" fill="#00ff88" fontSize="11" fontFamily="monospace">VR — ROTATE 抬轮!</text>}
      {speed >= 160 && <text x="200" y="230" textAnchor="middle" fill="#00ff88" fontSize="11" fontFamily="monospace">POSITIVE CLIMB — 正爬升率</text>}
    </svg>
  );
}

function GearAnimation() {
  const [gearDown, setGearDown] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => setGearDown(g => !g), 2000);
    return () => clearInterval(interval);
  }, []);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <rect width="400" height="240" fill="#0a0a0a" />
      {/* Aircraft side view */}
      <g transform="translate(200, 100)">
        {/* Fuselage */}
        <ellipse cx="0" cy="0" rx="100" ry="15" fill="#2a2a2a" stroke="#444" />
        {/* Wing */}
        <polygon points="-20,-10 -80,-35 -70,-30 -10,-8" fill="#1a1a1a" stroke="#333" />
        {/* Tail */}
        <polygon points="-85,-5 -100,-35 -90,-30 -80,-5" fill="#1a1a1a" stroke="#333" />
        {/* Engine */}
        <ellipse cx="-40" cy="5" rx="15" ry="8" fill="#1a1a1a" stroke="#333" />
        {/* Nose gear */}
        <g>
          <line x1="60" y1="15" x2="60" y2={gearDown ? 40 : 18} stroke="#888" strokeWidth="3" />
          {gearDown && <circle cx="60" cy="42" r="5" fill="#555" stroke="#888" />}
        </g>
        {/* Main gear */}
        <g>
          <line x1="-10" y1="15" x2="-10" y2={gearDown ? 45 : 18} stroke="#888" strokeWidth="3" />
          {gearDown && (
            <>
              <circle cx="-15" cy="47" r="5" fill="#555" stroke="#888" />
              <circle cx="-5" cy="47" r="5" fill="#555" stroke="#888" />
            </>
          )}
        </g>
      </g>
      {/* Status */}
      <rect x="140" y="170" width="120" height="30" rx="4" fill={gearDown ? '#1a3a1a' : '#3a1a1a'} stroke={gearDown ? '#00ff88' : '#ff4444'} />
      <text x="200" y="190" textAnchor="middle" fill={gearDown ? '#00ff88' : '#ff4444'} fontSize="14" fontFamily="monospace" fontWeight="bold">
        GEAR {gearDown ? 'DOWN' : 'UP'}
      </text>
      {/* Key */}
      <rect x="170" y="210" width="60" height="22" rx="4" fill="#1a1a1a" stroke="#00ff88" />
      <text x="200" y="225" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold">G</text>
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
    }, 1500);
    return () => clearInterval(interval);
  }, []);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <rect width="400" height="240" fill="#0a0a0a" />
      {/* Wing cross-section */}
      <g transform="translate(200, 100)">
        {/* Main wing */}
        <path d="M -120,0 Q -60,-30 0,-15 Q 60,-5 120,5 L 120,10 Q 60,5 0,0 Q -60,-10 -120,5 Z" fill="#2a2a2a" stroke="#444" />
        {/* Flap */}
        <g transform={`rotate(${flapAngle * 0.8}, 80, 5)`}>
          <path d="M 80,5 L 130,10 L 130,15 L 80,12 Z" fill={flapAngle > 0 ? '#1a3a1a' : '#2a2a2a'} stroke={flapAngle > 0 ? '#00ff88' : '#444'} />
        </g>
        {/* Airflow lines */}
        {[...Array(5)].map((_, i) => (
          <line key={i} x1={-140} y1={-20 + i * 10} x2={-100} y2={-15 + i * 8} stroke="#4a8aba" strokeWidth="1" opacity="0.5">
            <animate attributeName="x1" values="-140;-100;-140" dur="2s" repeatCount="indefinite" />
          </line>
        ))}
        {/* Lift arrow */}
        {flapAngle > 0 && (
          <g>
            <line x1="0" y1="-20" x2="0" y2={-20 - flapAngle * 1.5} stroke="#00ff88" strokeWidth="2" />
            <polygon points={`0,${-20 - flapAngle * 1.5 - 8} -5,${-20 - flapAngle * 1.5} 5,${-20 - flapAngle * 1.5}`} fill="#00ff88" />
            <text x="15" y={-25 - flapAngle * 1.5} fill="#00ff88" fontSize="9" fontFamily="monospace">LIFT ↑</text>
          </g>
        )}
      </g>
      {/* Flap angle display */}
      <rect x="140" y="170" width="120" height="30" rx="4" fill="#1a3a1a" stroke="#00ff88" />
      <text x="200" y="190" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold">
        FLAPS {flapAngle}°
      </text>
      {/* Keys */}
      <rect x="120" y="210" width="40" height="22" rx="4" fill="#1a1a1a" stroke="#00ff88" />
      <text x="140" y="225" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold">[</text>
      <text x="180" y="225" textAnchor="middle" fill="#6a8a6a" fontSize="10" fontFamily="monospace">收起</text>
      <rect x="240" y="210" width="40" height="22" rx="4" fill="#1a1a1a" stroke="#00ff88" />
      <text x="260" y="225" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold">]</text>
      <text x="300" y="225" textAnchor="middle" fill="#6a8a6a" fontSize="10" fontFamily="monospace">放下</text>
    </svg>
  );
}

function AutopilotAnimation() {
  const [apOn, setApOn] = useState(false);
  const [heading, setHeading] = useState(270);
  useEffect(() => {
    const interval = setInterval(() => {
      setApOn(a => !a);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!apOn) return;
    const interval = setInterval(() => {
      setHeading(h => (h + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [apOn]);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <rect width="400" height="240" fill="#0a0a0a" />
      {/* Compass */}
      <circle cx="200" cy="110" r="80" fill="none" stroke="#1a3a1a" strokeWidth="2" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
        const angle = (deg - heading) * Math.PI / 180;
        const x = 200 + Math.sin(angle) * 75;
        const y = 110 - Math.cos(angle) * 75;
        const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg);
        return (
          <g key={deg}>
            <text x={x} y={y + 3} textAnchor="middle" fill="#00ff88" fontSize="10" fontFamily="monospace">{label}</text>
          </g>
        );
      })}
      {/* Heading marker */}
      <polygon points="200,30 195,40 205,40" fill="#ffcc00" />
      {/* Aircraft icon */}
      <g transform="translate(200, 110)">
        <polygon points="0,-15 8,10 0,5 -8,10" fill="white" />
      </g>
      {/* AP status */}
      <rect x="140" y="200" width="120" height="25" rx="4" fill={apOn ? '#00ff88' : '#1a1a1a'} stroke={apOn ? '#00ff88' : '#333'} />
      <text x="200" y="217" textAnchor="middle" fill={apOn ? '#000' : '#888'} fontSize="12" fontFamily="monospace" fontWeight="bold">
        A/P {apOn ? 'ENGAGED' : 'OFF'}
      </text>
    </svg>
  );
}

function AutothrottleAnimation() {
  const [atOn, setAtOn] = useState(true);
  const [targetSpeed] = useState(250);
  const [currentSpeed, setCurrentSpeed] = useState(200);
  useEffect(() => {
    const interval = setInterval(() => {
      setAtOn(a => !a);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!atOn) return;
    const interval = setInterval(() => {
      setCurrentSpeed(s => s < targetSpeed ? s + 1 : s);
    }, 50);
    return () => clearInterval(interval);
  }, [atOn, targetSpeed]);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <rect width="400" height="240" fill="#0a0a0a" />
      {/* Speed gauge */}
      <rect x="50" y="40" width="300" height="30" rx="4" fill="#1a1a1a" stroke="#333" />
      {/* Target speed marker */}
      <line x1={50 + (targetSpeed / 350) * 300} y1="35" x2={50 + (targetSpeed / 350) * 300} y2="75" stroke="#ffcc00" strokeWidth="2" strokeDasharray="3,2" />
      <text x={50 + (targetSpeed / 350) * 300} y="30" textAnchor="middle" fill="#ffcc00" fontSize="9" fontFamily="monospace">TGT {targetSpeed}</text>
      {/* Current speed bar */}
      <rect x="50" y="40" width={(currentSpeed / 350) * 300} height="30" rx="4" fill={atOn ? '#00ff88' : '#6a8a6a'} opacity="0.6" />
      <text x="200" y="60" textAnchor="middle" fill="white" fontSize="12" fontFamily="monospace" fontWeight="bold">{Math.round(currentSpeed)} KTS</text>
      {/* Throttle animation */}
      <g transform="translate(200, 140)">
        <rect x="-60" y="-20" width="120" height="40" rx="4" fill="#1a1a1a" stroke="#333" />
        <rect x="-55" y="-15" width={atOn ? (currentSpeed / 350) * 110 : 30} height="30" rx="2" fill={atOn ? '#00ff88' : '#6a8a6a'} opacity="0.5" />
        <text x="0" y="5" textAnchor="middle" fill={atOn ? '#00ff88' : '#888'} fontSize="11" fontFamily="monospace" fontWeight="bold">
          {atOn ? 'AUTO' : 'MANUAL'}
        </text>
      </g>
      {/* AT status */}
      <rect x="140" y="200" width="120" height="25" rx="4" fill={atOn ? '#00ff88' : '#1a1a1a'} stroke={atOn ? '#00ff88' : '#333'} />
      <text x="200" y="217" textAnchor="middle" fill={atOn ? '#000' : '#888'} fontSize="12" fontFamily="monospace" fontWeight="bold">
        A/T {atOn ? 'ENGAGED' : 'OFF'}
      </text>
    </svg>
  );
}

function ReverseAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 100), 50);
    return () => clearInterval(interval);
  }, []);
  const reverseActive = phase > 30 && phase < 80;
  const speed = reverseActive ? Math.max(0, 160 - (phase - 30) * 3) : phase < 30 ? 160 : 10;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="revSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a7ba8" />
          <stop offset="100%" stopColor="#8abbe8" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#revSky)" />
      {/* Runway */}
      <rect x="0" y="150" width="400" height="90" fill="#3a3a3a" />
      <line x1="0" y1="150" x2="400" y2="150" stroke="#666" />
      {/* Runway markings */}
      {[...Array(8)].map((_, i) => (
        <rect key={i} x={((i * 60 + phase * 2) % 480) - 40} y="180" width="30" height="3" fill="white" opacity="0.5" />
      ))}
      {/* Aircraft on ground */}
      <g transform="translate(200, 135)">
        <ellipse cx="0" cy="0" rx="40" ry="7" fill="#c0c8d0" />
        <polygon points="-12,-5 -45,-20 -40,-18 -8,-3" fill="#a0a8b0" />
        <polygon points="12,-5 45,-20 40,-18 8,-3" fill="#a0a8b0" />
        {/* Engines with reverse thrust */}
        <g transform="translate(-25, 3)">
          <ellipse cx="0" cy="0" rx="10" ry="5" fill="#808890" />
          {reverseActive && (
            <>
              {/* Reverse thrust arrows */}
              <polygon points="-15,-8 -25,-3 -15,2" fill="#ff6600" opacity="0.7">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.2s" repeatCount="indefinite" />
              </polygon>
              <polygon points="-15,8 -25,3 -15,-2" fill="#ff6600" opacity="0.7">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.2s" repeatCount="indefinite" />
              </polygon>
            </>
          )}
          {!reverseActive && (
            <ellipse cx="12" cy="0" rx="4" ry="3" fill="#ff6600" opacity="0.3" />
          )}
        </g>
        <g transform="translate(25, 3)">
          <ellipse cx="0" cy="0" rx="10" ry="5" fill="#808890" />
          {reverseActive && (
            <>
              <polygon points="-15,-8 -25,-3 -15,2" fill="#ff6600" opacity="0.7">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.2s" repeatCount="indefinite" />
              </polygon>
              <polygon points="-15,8 -25,3 -15,-2" fill="#ff6600" opacity="0.7">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.2s" repeatCount="indefinite" />
              </polygon>
            </>
          )}
          {!reverseActive && (
            <ellipse cx="12" cy="0" rx="4" ry="3" fill="#ff6600" opacity="0.3" />
          )}
        </g>
        {/* Gear */}
        <line x1="-8" y1="7" x2="-8" y2="14" stroke="#666" strokeWidth="2" />
        <line x1="8" y1="7" x2="8" y2="14" stroke="#666" strokeWidth="2" />
        <circle cx="-8" cy="15" r="3" fill="#444" />
        <circle cx="8" cy="15" r="3" fill="#444" />
      </g>
      {/* Speed display */}
      <rect x="280" y="10" width="110" height="40" rx="4" fill="#0a0a0a" stroke="#1a3a1a" />
      <text x="335" y="28" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">GROUND SPEED</text>
      <text x="335" y="44" textAnchor="middle" fill={reverseActive ? '#ffaa00' : '#00ff88'} fontSize="16" fontFamily="monospace" fontWeight="bold">{Math.round(speed)} KTS</text>
      {/* Status */}
      <rect x="10" y="10" width="120" height="25" rx="4" fill={reverseActive ? '#3a1a1a' : '#1a3a1a'} stroke={reverseActive ? '#ffaa00' : '#00ff88'} />
      <text x="70" y="27" textAnchor="middle" fill={reverseActive ? '#ffaa00' : '#00ff88'} fontSize="11" fontFamily="monospace" fontWeight="bold">
        {reverseActive ? 'REVERSE THRUST' : phase < 30 ? 'TOUCHDOWN' : 'TAXI SPEED'}
      </text>
      {/* Explanation */}
      <text x="200" y="225" textAnchor="middle" fill="#6a8a6a" fontSize="9" fontFamily="monospace">
        反推将引擎排气向前偏转，产生反向推力减速
      </text>
    </svg>
  );
}

function GroundAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % 200), 50);
    return () => clearInterval(interval);
  }, []);
  const taxiX = (phase * 2) % 400;
  const isGrass = phase > 100;
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      {/* Sky */}
      <rect width="400" height="140" fill="#5a9bd8" />
      {/* Ground */}
      <rect x="0" y="140" width="400" height="100" fill={isGrass ? '#3a6a2a' : '#3a3a3a'} />
      {/* Surface label */}
      <text x="200" y="135" textAnchor="middle" fill={isGrass ? '#88cc44' : '#888'} fontSize="10" fontFamily="monospace">
        {isGrass ? '草地道面 GRASS' : '铺装跑道 PAVED'}
      </text>
      {/* Runway/taxiway markings */}
      {!isGrass && [...Array(8)].map((_, i) => (
        <rect key={i} x={((i * 60 - phase * 2) % 480) - 40} y="170" width="30" height="3" fill="white" opacity="0.5" />
      ))}
      {/* Grass texture */}
      {isGrass && [...Array(20)].map((_, i) => (
        <line key={i} x1={i * 20} y1={150 + (i % 3) * 15} x2={i * 20 + 5} y2={145 + (i % 3) * 15} stroke="#4a8a3a" strokeWidth="1" />
      ))}
      {/* Aircraft taxiing */}
      <g transform={`translate(${taxiX}, 130)`}>
        <ellipse cx="0" cy="0" rx="30" ry="5" fill="#c0c8d0" />
        <polygon points="-8,-3 -30,-14 -26,-12 -5,-2" fill="#a0a8b0" />
        <polygon points="8,-3 30,-14 26,-12 5,-2" fill="#a0a8b0" />
        <polygon points="-25,-2 -30,-12 -27,-10 -23,-2" fill="#a0a8b0" />
        {/* Gear */}
        <line x1="-5" y1="5" x2="-5" y2="10" stroke="#666" strokeWidth="2" />
        <line x1="5" y1="5" x2="5" y2="10" stroke="#666" strokeWidth="2" />
        <circle cx="-5" cy="11" r="2.5" fill="#444" />
        <circle cx="5" cy="11" r="2.5" fill="#444" />
      </g>
      {/* Resistance indicator */}
      <rect x="20" y="200" width="160" height="25" rx="4" fill="#0a0a0a" stroke="#333" />
      <text x="100" y="216" textAnchor="middle" fill={isGrass ? '#ffaa00' : '#00ff88'} fontSize="10" fontFamily="monospace">
        滚动阻力: {isGrass ? '高 (5-10x)' : '正常 (1x)'}
      </text>
      {/* Speed limit */}
      <rect x="220" y="200" width="160" height="25" rx="4" fill="#0a0a0a" stroke="#333" />
      <text x="300" y="216" textAnchor="middle" fill="#00ff88" fontSize="10" fontFamily="monospace">
        滑行限速: 20-30 KTS
      </text>
    </svg>
  );
}

function ReadyAnimation() {
  return (
    <svg viewBox="0 0 400 240" className="w-full h-full">
      <defs>
        <linearGradient id="readySky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0a1628" />
          <stop offset="50%" stopColor="#1a3a5c" />
          <stop offset="100%" stopColor="#3a6b8a" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#readySky)" />
      {/* Stars */}
      {[...Array(15)].map((_, i) => (
        <circle key={i} cx={20 + i * 26} cy={10 + (i * 31) % 80} r="1" fill="white" opacity={0.3 + (i % 3) * 0.2}>
          <animate attributeName="opacity" values={`${0.2};${0.7};${0.2}`} dur={`${2 + i % 3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* Flying aircraft */}
      <g transform="translate(200, 100)">
        <animateTransform attributeName="transform" type="translate" values="200,100;200,95;200,100" dur="3s" repeatCount="indefinite" />
        <ellipse cx="0" cy="0" rx="50" ry="8" fill="#c0c8d0" />
        <polygon points="-15,-5 -55,-25 -50,-22 -10,-3" fill="#a0a8b0" />
        <polygon points="15,-5 55,-25 50,-22 10,-3" fill="#a0a8b0" />
        <polygon points="-40,-3 -50,-18 -45,-15 -38,-3" fill="#a0a8b0" />
        {/* Engine glow */}
        <ellipse cx="-30" cy="4" rx="6" ry="4" fill="#ff6600" opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="30" cy="4" rx="6" ry="4" fill="#ff6600" opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
        {/* Contrails */}
        <line x1="-35" y1="4" x2="-80" y2="8" stroke="white" strokeWidth="2" opacity="0.3" />
        <line x1="35" y1="4" x2="80" y2="8" stroke="white" strokeWidth="2" opacity="0.3" />
      </g>
      {/* Checklist */}
      <g transform="translate(50, 150)">
        <text x="0" y="0" fill="#00ff88" fontSize="10" fontFamily="monospace" fontWeight="bold">起飞检查单:</text>
        <text x="0" y="18" fill="#6a8a6a" fontSize="9" fontFamily="monospace">✓ 襟翼设定</text>
        <text x="0" y="32" fill="#6a8a6a" fontSize="9" fontFamily="monospace">✓ 油门 TOGA</text>
        <text x="0" y="46" fill="#6a8a6a" fontSize="9" fontFamily="monospace">✓ 抬轮 VR</text>
        <text x="0" y="60" fill="#6a8a6a" fontSize="9" fontFamily="monospace">✓ 收起落架</text>
      </g>
      <text x="200" y="230" textAnchor="middle" fill="#00ff88" fontSize="14" fontFamily="monospace" fontWeight="bold">
        READY FOR TAKEOFF
      </text>
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
