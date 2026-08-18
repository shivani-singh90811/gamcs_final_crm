import React, { useEffect, useState, useRef, useCallback } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

export type CursorEffectType = 'glow' | 'particles' | 'cyber';

export const CursorEffects: React.FC = () => {
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [hoverText, setHoverText] = useState<string | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [effectType, setEffectType] = useState<CursorEffectType>('cyber');
  const [enabled, setEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const requestRef = useRef<number | null>(null);
  const prevPosRef = useRef({ x: -100, y: -100 });

  // Handle pointer movements
  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      setCursorPos({ x, y });

      // Check if target is clickable / interactive
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest(
          'button, a, input, select, textarea, [role="button"], .interactive-element, table tbody tr, .card-spotlight'
        );
        setIsHovered(!!interactive);

        // Check if custom data tooltip / action text exists
        const customText = target.getAttribute('data-cursor-text') || interactive?.getAttribute('data-cursor-text');
        setHoverText(customText || null);

        // Update spotlight coordinates for hovered card spotlight elements
        const cardSpotlight = target.closest('.card-spotlight') as HTMLElement | null;
        if (cardSpotlight) {
          const rect = cardSpotlight.getBoundingClientRect();
          cardSpotlight.style.setProperty('--mouse-x', `${x - rect.left}px`);
          cardSpotlight.style.setProperty('--mouse-y', `${y - rect.top}px`);
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsMouseDown(true);
      const { clientX: x, clientY: y } = e;

      // Spawning click ripples
      const newRipple: Ripple = {
        id: Date.now() + Math.random(),
        x,
        y,
        size: 20,
        color: ['#10b981', '#6366f1', '#06b6d4', '#ec4899', '#f59e0b'][Math.floor(Math.random() * 5)],
      };
      setRipples((prev) => [...prev.slice(-8), newRipple]);

      // Spawn burst particles on click
      const newBurst: Particle[] = Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
        const speed = 2 + Math.random() * 5;
        return {
          id: Date.now() + Math.random() + i,
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4 + 3,
          color: ['#34d399', '#818cf8', '#38bdf8', '#f472b6', '#fbbf24'][Math.floor(Math.random() * 5)],
          alpha: 1,
          life: 1,
        };
      });
      setParticles((prev) => [...prev.slice(-30), ...newBurst]);
    };

    const handleMouseUp = () => {
      setIsMouseDown(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled]);

  // Particle animation loop
  const updateParticles = useCallback(() => {
    setParticles((prev) =>
      prev
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.15, // light gravity
          alpha: p.alpha - 0.03,
          life: p.life - 0.03,
        }))
        .filter((p) => p.life > 0 && p.alpha > 0)
    );

    // Ripple cleanup
    setRipples((prev) => prev.filter((r) => Date.now() - r.id < 800));

    requestRef.current = requestAnimationFrame(updateParticles);
  }, []);

  useEffect(() => {
    if (enabled) {
      requestRef.current = requestAnimationFrame(updateParticles);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [enabled, updateParticles]);

  if (!enabled) return null;

  return (
    <>
      {/* Dynamic Mouse Spotlight Ambient Aura */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(99, 102, 241, 0.07), rgba(16, 185, 129, 0.03) 40%, transparent 80%)`,
        }}
      />

      {/* Main Cursor Glow / Ring / Cyber Follower */}
      <div
        className="pointer-events-none fixed top-0 left-0 z-50 transition-transform duration-75 ease-out"
        style={{
          transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
        }}
      >
        {/* Core Dot */}
        <div
          className={`absolute -top-1.5 -left-1.5 rounded-full transition-all duration-150 ${
            isMouseDown
              ? 'w-4 h-4 -top-2 -left-2 bg-emerald-400 shadow-[0_0_15px_#10b981]'
              : isHovered
              ? 'w-3 h-3 -top-1.5 -left-1.5 bg-cyan-400 shadow-[0_0_12px_#06b6d4]'
              : 'w-2.5 h-2.5 bg-indigo-500 shadow-[0_0_8px_#6366f1]'
          }`}
        />

        {/* Outer Ring Effects depending on theme */}
        {effectType === 'cyber' && (
          <div
            className={`absolute rounded-full border border-cyan-400/60 transition-all duration-200 -translate-x-1/2 -translate-y-1/2 ${
              isMouseDown
                ? 'w-12 h-12 border-emerald-400 bg-emerald-500/20 scale-110 rotate-45'
                : isHovered
                ? 'w-10 h-10 border-cyan-300 bg-cyan-500/10 scale-125 rotate-12'
                : 'w-7 h-7 border-indigo-400/40 bg-indigo-500/5'
            }`}
          >
            {isHovered && (
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/80 animate-spin" style={{ animationDuration: '4s' }} />
            )}
          </div>
        )}

        {effectType === 'glow' && (
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-md transition-all duration-300 ${
              isHovered
                ? 'w-14 h-14 bg-gradient-to-r from-emerald-400/30 via-cyan-400/30 to-indigo-500/30 opacity-100 scale-125'
                : 'w-8 h-8 bg-indigo-500/20 opacity-60'
            }`}
          />
        )}

        {/* Floating Tooltip Label when hovering specialized elements */}
        {hoverText && (
          <div className="absolute top-5 left-5 px-2.5 py-1 bg-slate-900/95 text-emerald-400 text-[10px] font-mono tracking-wider font-semibold rounded-md border border-emerald-500/30 shadow-lg whitespace-nowrap backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            {hoverText}
          </div>
        )}
      </div>

      {/* Click Ripple Effect Rings */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="pointer-events-none fixed z-40 rounded-full border-2 animate-ripple"
          style={{
            left: r.x,
            top: r.y,
            borderColor: r.color,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 15px ${r.color}`,
          }}
        />
      ))}

      {/* Burst Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none fixed z-40 rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.alpha,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}

      {/* Floating HUD Toggle Button (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowSettings((prev) => !prev)}
          className="p-2.5 rounded-full bg-slate-900/90 text-slate-300 hover:text-emerald-400 border border-slate-700/80 shadow-xl hover:border-emerald-500/50 transition-all duration-200 backdrop-blur-md group flex items-center gap-2 text-xs font-medium"
          title="Customize Dynamic Cursor & Pointer Effects"
          data-cursor-text="FX SETTINGS"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline group-hover:inline">Cursor FX</span>
        </button>

        {showSettings && (
          <div className="absolute bottom-12 right-0 w-64 p-3.5 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl text-slate-200 text-xs space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Interactive Effects
              </span>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {enabled && (
              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 font-medium">Style Presets</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['cyber', 'glow', 'particles'] as CursorEffectType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setEffectType(type)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left capitalize transition-all ${
                        effectType === type
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
