'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFlight } from '@/contexts/FlightContext';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';

const tutorialSteps = [
  {
    id: 1,
    title: '欢迎',
    description: '欢迎使用波音 777-300ER 飞行模拟器。本教程将引导您学习所有飞行操控方法。',
    keys: [],
  },
  {
    id: 2,
    title: '姿态控制',
    description: '使用方向键控制飞机姿态。上键拉杆（机头上仰），下键推杆（机头下俯），左右键控制滚转。',
    keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  },
  {
    id: 3,
    title: '油门控制',
    description: '使用 W 和 S 键控制油门大小。W 键增加推力用于加速和爬升，S 键减少推力用于减速和下降。',
    keys: ['w', 's'],
  },
  {
    id: 4,
    title: '引擎控制',
    description: '使用 1 和 2 键分别控制左右引擎的开关。在紧急情况下可以关闭单个引擎。',
    keys: ['1', '2'],
  },
  {
    id: 5,
    title: '起落架',
    description: '按 G 键切换起落架收放状态。起飞后收起起落架减少阻力，着陆前放下起落架。',
    keys: ['g'],
  },
  {
    id: 6,
    title: '襟翼控制',
    description: '使用 [ 和 ] 键调节襟翼角度。起飞时使用小角度襟翼，着陆时使用大角度襟翼。',
    keys: ['[', ']'],
  },
  {
    id: 7,
    title: '自动驾驶',
    description: '按 P 键开启/关闭自动驾驶。开启后飞机自动维持设定的航向和高度。',
    keys: ['p'],
  },
  {
    id: 8,
    title: '自动油门',
    description: '按 T 键开启/关闭自动油门。开启后自动调节推力维持目标空速。',
    keys: ['t'],
  },
  {
    id: 9,
    title: '准备起飞',
    description: '您已学习完所有操控方法。点击「开始飞行」进入模拟飞行！',
    keys: [],
  },
];

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
        .tt-main { display: flex; flex: 1; padding: 32px; gap: 32px; }
        .tt-content { flex: 1; display: flex; flex-direction: column; }
        .tt-step-header { margin-bottom: 24px; }
        .tt-step-num { font-size: 12px; color: var(--color-primary); font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; font-family: 'Courier New', monospace; }
        .tt-step-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .tt-step-desc { font-size: 15px; color: var(--color-on-surface-2); line-height: 1.6; max-width: 520px; }
        .tt-key-demo { display: flex; flex-direction: column; gap: 16px; margin-top: 32px; }
        .tt-key-row { display: flex; align-items: center; gap: 16px; }
        .tt-key-cap { display: inline-flex; align-items: center; justify-content: center; min-width: 48px; height: 48px; padding: 0 14px; background: var(--color-surface); border: 2px solid color-mix(in srgb, var(--color-primary) 40%, transparent); border-radius: var(--rounded-md); font-size: 16px; font-weight: 700; font-family: 'Courier New', monospace; color: var(--color-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05); }
        .tt-key-cap.highlight { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)); box-shadow: 0 0 16px color-mix(in srgb, var(--color-primary) 30%, transparent), 0 2px 8px rgba(0,0,0,0.3); }
        .tt-key-label { font-size: 14px; color: var(--color-on-surface-2); }
        .tt-visual { width: 420px; display: flex; flex-direction: column; gap: 16px; }
        .tt-visual-img { width: 100%; height: 240px; border-radius: var(--rounded-lg); overflow: hidden; border: 1px solid color-mix(in srgb, var(--color-on-surface) 8%, transparent); }
        .tt-visual-img img { width: 100%; height: 100%; object-fit: cover; }
        .tt-visual-card { background: var(--color-surface); border-radius: var(--rounded-lg); padding: 20px; border: 1px solid color-mix(in srgb, var(--color-on-surface) 8%, transparent); }
        .tt-visual-card-title { font-size: 13px; font-weight: 600; color: var(--color-primary); margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase; font-family: 'Courier New', monospace; }
        .tt-ctrl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tt-ctrl-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-on-surface-2); }
        .tt-ctrl-key { background: color-mix(in srgb, var(--color-on-surface) 8%, transparent); padding: 2px 8px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 11px; color: var(--color-on-surface); font-weight: 600; }
        .tt-footer { display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; background: var(--color-surface); border-top: 1px solid color-mix(in srgb, var(--color-on-surface) 8%, transparent); }
        .tt-footer-left { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-on-surface-2); }
        .tt-footer-left svg { color: var(--color-secondary); }
        .tt-nav-btns { display: flex; gap: 12px; }
        .tt-btn-prev { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid color-mix(in srgb, var(--color-on-surface) 15%, transparent); color: var(--color-on-surface-2); padding: 10px 20px; border-radius: var(--rounded-md); font-size: 14px; cursor: pointer; }
        .tt-btn-prev:hover { background: color-mix(in srgb, var(--color-on-surface) 5%, transparent); }
        .tt-btn-prev:disabled { opacity: 0.3; cursor: not-allowed; }
        .tt-btn-next { display: flex; align-items: center; gap: 6px; background: var(--color-primary); border: none; color: var(--color-surface-variant); padding: 10px 24px; border-radius: var(--rounded-md); font-size: 14px; font-weight: 600; cursor: pointer; }
        .tt-btn-next:hover { opacity: 0.9; }
        .tt-step-list { display: flex; flex-direction: column; gap: 6px; margin-top: 24px; }
        .tt-step-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--rounded-sm); font-size: 13px; color: var(--color-on-surface-2); }
        .tt-step-item.current { background: color-mix(in srgb, var(--color-primary) 8%, transparent); color: var(--color-on-surface); }
        .tt-step-item.done-item { color: color-mix(in srgb, var(--color-primary) 70%, transparent); }
        .tt-step-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
        .tt-step-icon svg { width: 14px; height: 14px; }
      `}} />

      <nav className="tt-nav">
        <div className="tt-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
          <span>B777-300ER FLIGHT SIMULATOR</span>
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

          {step.keys.length > 0 && (
            <div className="tt-key-demo">
              {step.keys.map((key, idx) => (
                <div key={idx} className="tt-key-row">
                  <div className="tt-key-cap highlight">{key === 'ArrowUp' ? '↑' : key === 'ArrowDown' ? '↓' : key === 'ArrowLeft' ? '←' : key === 'ArrowRight' ? '→' : key.toUpperCase()}</div>
                  <div className="tt-key-label">
                    {key === 'ArrowUp' && '机头上仰（拉杆）'}
                    {key === 'ArrowDown' && '机头下俯（推杆）'}
                    {key === 'ArrowLeft' && '向左滚转'}
                    {key === 'ArrowRight' && '向右滚转'}
                    {key === 'w' && '增加油门 — 提升引擎推力'}
                    {key === 's' && '减少油门 — 降低引擎推力'}
                    {key === '1' && '左引擎开关'}
                    {key === '2' && '右引擎开关'}
                    {key === 'g' && '起落架收放'}
                    {key === '[' && '襟翼收起'}
                    {key === ']' && '襟翼放下'}
                    {key === 'p' && '自动驾驶开关'}
                    {key === 't' && '自动油门开关'}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="tt-step-list">
            {tutorialSteps.map((s, idx) => (
              <div
                key={idx}
                className={`tt-step-item ${idx === currentStep ? 'current' : idx < currentStep ? 'done-item' : ''}`}
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
          <div className="tt-visual-img">
            <img src="/images/img_20261118_121948_416092.jpg" alt="驾驶舱视角" />
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
          点击按钮继续，或随时跳过教程
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
