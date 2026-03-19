'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Leaf, Recycle, TrendingUp, Users, ArrowRight,
  ChevronDown, Sparkles, Globe, Award, Sun, Moon, Languages
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/app/contexts/LanguageContext';

/* ─── Hooks ──────────────────────────────────────────────── */
function useCounter(target: number, duration = 2800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let s: number | null = null;
    const step = (ts: number) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / duration, 1);
      setValue(Math.floor((1 - Math.pow(2, -10 * p)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── 3D Canvas Background ───────────────────────────────── */
function Canvas3DBG({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const mouseRef  = useRef({ x: 0.5, y: 0.5 });

  const initAndRun = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ── Responsive size ── */
    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    /* ── Particle definition ── */
    type P = {
      x: number; y: number; z: number;   // 3-D coords (z = depth 0–1)
      vx: number; vy: number; vz: number;
      base: number;                        // base radius
      color: string;
      lineOpacity: number;
    };

    const COLORS_LIGHT = ['#10b981','#14b8a6','#059669','#6ee7b7','#34d399'];
    const COLORS_DARK  = ['#34d399','#2dd4bf','#10b981','#a7f3d0','#6ee7b7'];

    const TOTAL = 90;
    const particles: P[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    for (let i = 0; i < TOTAL; i++) {
      const cols = isDark ? COLORS_DARK : COLORS_LIGHT;
      particles.push({
        x:  rand(0, W),
        y:  rand(0, H),
        z:  rand(0.1, 1),           // depth — farther = smaller, dimmer
        vx: rand(-0.18, 0.18),
        vy: rand(-0.12, 0.12),
        vz: rand(-0.0006, 0.0006),  // slowly breathe in/out on z-axis
        base: rand(1.5, 3.8),
        color: cols[Math.floor(rand(0, cols.length))],
        lineOpacity: rand(0.04, 0.14),
      });
    }

    /* ── Line mesh ── */
    const LINK_DIST = 130;

    /* ── Resize handler ── */
    const onResize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', onResize);

    /* ── Mouse parallax ── */
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('mousemove', onMouse);

    /* ── Draw loop ── */
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.004;

      const mx = (mouseRef.current.x - 0.5) * 30;
      const my = (mouseRef.current.y - 0.5) * 20;

      /* update */
      for (const p of particles) {
        p.x  += p.vx + mx * p.z * 0.012;
        p.y  += p.vy + my * p.z * 0.012;
        p.z  += p.vz;
        if (p.z < 0.05) { p.z = 0.05; p.vz *= -1; }
        if (p.z > 1.0)  { p.z = 1.0;  p.vz *= -1; }
        if (p.x < -20)  p.x = W + 20;
        if (p.x > W+20) p.x = -20;
        if (p.y < -20)  p.y = H + 20;
        if (p.y > H+20) p.y = -20;
      }

      /* draw connecting lines */
      for (let i = 0; i < TOTAL; i++) {
        for (let j = i + 1; j < TOTAL; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.09 * ((a.z + b.z) / 2);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = isDark
              ? `rgba(52,211,153,${alpha})`
              : `rgba(16,185,129,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      /* draw particles */
      for (const p of particles) {
        const r     = p.base * p.z;           // perspective scale
        const alpha = 0.25 + p.z * 0.55;      // depth fade
        const pulse = 1 + Math.sin(t * 1.8 + p.x * 0.02) * 0.15 * p.z;

        /* glow halo */
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4 * pulse);
        grad.addColorStop(0, p.color + Math.round(alpha * 0.55 * 255).toString(16).padStart(2,'0'));
        grad.addColorStop(1, p.color + '00');
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        /* solid core */
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2,'0');
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [isDark]);

  useEffect(() => {
    const cleanup = initAndRun();
    return cleanup;
  }, [initAndRun]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: isDark ? 0.7 : 0.55 }}
    />
  );
}

/* ─── Gentle 3-D tilt card ───────────────────────────────── */
function TiltCard({
  children, className = '', intensity = 5,
}: { children: React.ReactNode; className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transition = 'transform 0.12s ease';
    el.style.transform  = `perspective(1200px) rotateX(${-y*intensity}deg) rotateY(${x*intensity}deg) translateZ(8px)`;
  };
  const onLeave = () => {
    const el = ref.current; if (!el) return;
    el.style.transition = 'transform 0.9s cubic-bezier(0.23,1,0.32,1)';
    el.style.transform  = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
  };
  return (
    <div ref={ref} className={`tilt-root ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

/* ─── Types ─────────────────────────────────────────────── */
interface Stats { totalMembers: number; totalWeight: number; totalCo2: number; totalRewards: number; }
const DEFAULT_STATS: Stats = { totalMembers: 0, totalWeight: 0, totalCo2: 0, totalRewards: 0 };

/* ─── Main component ────────────────────────────────────── */
export default function LandingClient({ stats = DEFAULT_STATS }: { stats?: Stats }) {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [heroVisible,   setHeroVisible]   = useState(false);
  const [mounted,       setMounted]       = useState(false);

  const { ref: statsRef,    inView: statsInView    } = useInView();
  const { ref: featuresRef, inView: featuresInView } = useInView(0.08);
  const { ref: ctaRef,      inView: ctaInView      } = useInView(0.1);

  const { theme, setTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();

  const membersCount = useCounter(stats.totalMembers, 2800, statsInView);
  const weightCount  = useCounter(stats.totalWeight,  3000, statsInView);
  const co2Count     = useCounter(stats.totalCo2,     3200, statsInView);
  const rewardsCount = useCounter(stats.totalRewards, 2600, statsInView);

  const isDark = mounted && theme === 'dark';

  useEffect(() => {
    setMounted(true);
    const id = setTimeout(() => setHeroVisible(true), 120);
    return () => clearTimeout(id);
  }, []);

  const FEATURES = [
    { icon: Recycle,    title: t('feature1Title'), desc: t('feature1Desc'), detail: t('feature1Detail'), accent: '#10b981', accentMuted: 'rgba(16,185,129,0.1)',  accentGlow: 'rgba(16,185,129,0.18)' },
    { icon: TrendingUp, title: t('feature2Title'), desc: t('feature2Desc'), detail: t('feature2Detail'), accent: '#14b8a6', accentMuted: 'rgba(20,184,166,0.1)',  accentGlow: 'rgba(20,184,166,0.18)' },
    { icon: Globe,      title: t('feature3Title'), desc: t('feature3Desc'), detail: t('feature3Detail'), accent: '#059669', accentMuted: 'rgba(5,150,105,0.1)',   accentGlow: 'rgba(5,150,105,0.18)' },
  ];
  const STAT_CARDS = [
    { label: t('statsMembers'), value: membersCount, icon: Users,   accent: '#10b981' },
    { label: t('statsWeight'),  value: weightCount,  icon: Recycle, accent: '#14b8a6' },
    { label: t('statsCo2'),     value: co2Count,     icon: Globe,   accent: '#059669' },
    { label: t('statsRewards'), value: rewardsCount, icon: Award,   accent: '#16a34a' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        /* ── Tokens ── */
        :root {
          --sage: #3d7a56;
          --glass-bg:  rgba(255,255,255,0.62);
          --glass-bd:  rgba(255,255,255,0.82);
          --glass-sh:  0 4px 28px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.88);
        }
        .dark {
          --sage: #6fcf97;
          --glass-bg:  rgba(10,22,14,0.58);
          --glass-bd:  rgba(52,211,153,0.1);
          --glass-sh:  0 4px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        /* ── Keyframes ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes lineGrow {
          from { transform:scaleX(0); transform-origin:left; }
          to   { transform:scaleX(1); transform-origin:left; }
        }
        @keyframes shimmer {
          0%   { background-position:-400% center; }
          100% { background-position: 400% center; }
        }
        @keyframes softPulse {
          0%,100% { opacity:.4; transform:scale(1);    }
          50%      { opacity:.7; transform:scale(1.08); }
        }
        @keyframes scrollNod {
          0%,100% { transform:translateY(0)   translateX(-50%); opacity:.5; }
          50%      { transform:translateY(6px) translateX(-50%); opacity:.9; }
        }
        @keyframes floatOrb {
          0%,100% { transform:translate(0,0)      scale(1);    }
          33%      { transform:translate(18px,-12px) scale(1.04); }
          66%      { transform:translate(-10px,14px) scale(0.97); }
        }

        /* ── Glass surface ── */
        .glass {
          background: var(--glass-bg);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          border: 1px solid var(--glass-bd);
          box-shadow: var(--glass-sh);
        }

        /* ── Navbar ── */
        .navbar-glass {
          background: rgba(242,249,245,0.9);
          backdrop-filter: blur(26px) saturate(180%);
          -webkit-backdrop-filter: blur(26px) saturate(180%);
          border-bottom: 1px solid rgba(160,210,175,0.28);
          box-shadow: 0 1px 0 rgba(255,255,255,0.9), 0 2px 12px rgba(0,0,0,0.03);
        }
        .dark .navbar-glass {
          background: rgba(6,12,8,0.88);
          border-bottom: 1px solid rgba(52,211,153,0.09);
          box-shadow: 0 2px 16px rgba(0,0,0,0.45);
        }

        /* ── Shimmer text ── */
        .shimmer-text {
          background: linear-gradient(100deg,#059669 0%,#10b981 22%,#6ee7b7 42%,#14b8a6 62%,#059669 100%);
          background-size: 400% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 7s linear infinite;
        }

        /* ── Hero text: large, bold, readable ── */
        .hero-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.0;
        }
        /* ── Body / section heading font ── */
        .section-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .label-caps {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        /* ── Hero animations ── */
        .hero-badge  { animation: fadeIn   0.8s ease 0.05s both; }
        .hero-h1     { animation: fadeUp   1.0s cubic-bezier(0.23,1,0.32,1) 0.12s both; }
        .hero-h2     { animation: fadeUp   1.0s cubic-bezier(0.23,1,0.32,1) 0.24s both; }
        .hero-rule   { animation: lineGrow 0.9s ease 0.48s both; }
        .hero-sub    { animation: fadeUp   0.9s cubic-bezier(0.23,1,0.32,1) 0.42s both; }
        .hero-cta    { animation: fadeUp   0.9s cubic-bezier(0.23,1,0.32,1) 0.58s both; }

        /* ── Tilt wrapper ── */
        .tilt-root { transform-style:preserve-3d; will-change:transform; }

        /* ── Feature card ── */
        .feat-card {
          transition: transform 0.7s cubic-bezier(0.23,1,0.32,1),
                      box-shadow 0.5s ease, border-color 0.4s ease;
        }
        .feat-card:hover { transform:translateY(-5px); }

        /* ── Stat card ── */
        .stat-card {
          transition: transform 0.65s cubic-bezier(0.23,1,0.32,1), box-shadow 0.5s ease;
        }
        .stat-card:hover {
          transform: perspective(700px) rotateX(-4deg) translateY(-5px);
          box-shadow: 0 24px 48px rgba(0,0,0,0.09), 0 6px 16px rgba(16,185,129,0.13);
        }
        .dark .stat-card:hover {
          box-shadow: 0 24px 48px rgba(0,0,0,0.44), 0 6px 16px rgba(52,211,153,0.1);
        }

        /* ── Icon medallion ── */
        .icon-med { transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .feat-card:hover .icon-med { transform:scale(1.08) rotate(-3deg); }

        /* ── Buttons ── */
        .btn-prim {
          position:relative; overflow:hidden;
          transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease;
        }
        .btn-prim::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(130deg,rgba(255,255,255,0.3) 0%,transparent 52%);
          transform:translateX(-115%) skewX(-12deg);
          transition:transform 0.62s cubic-bezier(0.23,1,0.32,1);
        }
        .btn-prim:hover::before { transform:translateX(115%) skewX(-12deg); }
        .btn-prim:hover { transform:translateY(-2px); box-shadow:0 10px 26px rgba(16,185,129,0.32); }

        .btn-ghost {
          transition:all 0.38s ease;
        }
        .btn-ghost:hover {
          transform:translateY(-1px);
          background:rgba(255,255,255,0.88);
          box-shadow:0 4px 14px rgba(0,0,0,0.05);
        }
        .dark .btn-ghost:hover { background:rgba(255,255,255,0.06); box-shadow:none; }

        /* ── Glow ring on icons ── */
        .glow-ring { position:relative; }
        .glow-ring::after {
          content:''; position:absolute; inset:-8px; border-radius:inherit;
          background:inherit; filter:blur(14px); opacity:.25;
          animation:softPulse 5s ease-in-out infinite; z-index:-1;
        }

        /* ── Scroll cue ── */
        .scroll-cue { position:absolute; bottom:32px; left:50%; animation:scrollNod 3s ease-in-out infinite; }

        /* ── Soft section divider ── */
        .divider {
          height:1px;
          background:linear-gradient(90deg,transparent,rgba(160,210,175,0.35),transparent);
        }
        .dark .divider {
          background:linear-gradient(90deg,transparent,rgba(52,211,153,0.12),transparent);
        }

        /* ── Eyebrow decoration ── */
        .eyebrow::before {
          content:''; display:inline-block; width:14px; height:1px;
          background:var(--sage); vertical-align:middle; margin-right:8px; opacity:.65;
        }

        /* ── CTA grid texture ── */
        .cta-grid {
          background-image:
            linear-gradient(rgba(16,185,129,0.05) 1px,transparent 1px),
            linear-gradient(90deg,rgba(16,185,129,0.05) 1px,transparent 1px);
          background-size:50px 50px;
        }
        .dark .cta-grid {
          background-image:
            linear-gradient(rgba(52,211,153,0.04) 1px,transparent 1px),
            linear-gradient(90deg,rgba(52,211,153,0.04) 1px,transparent 1px);
        }

        /* ── Logo icon spin ── */
        .logo-icon { transition:transform 0.7s cubic-bezier(0.34,1.56,0.64,1); }
        .logo-icon:hover { transform:rotate(180deg) scale(1.05); }

        /* ── Floating accent orbs behind section ── */
        .section-orb {
          position:absolute; border-radius:50%; pointer-events:none; filter:blur(70px);
          animation:floatOrb 22s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen transition-colors duration-700 bg-[#f2f9f5] dark:bg-[#060d08]">

        {/* ══════════ NAVBAR ══════════ */}
        <nav className="fixed top-0 inset-x-0 z-50 px-6 py-4 navbar-glass flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="logo-icon w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[15px] text-slate-800 dark:text-white tracking-tight">{t('wasteBank')}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {mounted && (
              <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[var(--sage)] hover:bg-emerald-50 dark:hover:bg-emerald-400/8 transition-all text-xs font-semibold">
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'th' ? 'EN' : 'TH'}</span>
              </button>
            )}
            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg text-[var(--sage)] hover:bg-emerald-50 dark:hover:bg-emerald-400/8 transition-all">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-[var(--sage)] hover:text-emerald-800 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-400/8 transition-all">
              {t('login')}
            </Link>
            <Link href="/register" className="btn-prim px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-teal-500 shadow-md shadow-emerald-600/22">
              {t('register')}
            </Link>
          </div>
        </nav>

        {/* ══════════ HERO ══════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 overflow-hidden">

          {/* 3D Canvas background — full hero section */}
          {mounted && <Canvas3DBG isDark={isDark} />}

          {/* Soft gradient overlay so text stays readable */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse 80% 60% at 50% 45%, transparent 30%, rgba(6,13,8,0.7) 100%)'
                : 'radial-gradient(ellipse 80% 60% at 50% 45%, transparent 30%, rgba(242,249,245,0.72) 100%)',
            }}
          />

          <div className="relative z-10 text-center max-w-4xl mx-auto">

            {heroVisible && (
              <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-9 border border-emerald-200/55 dark:border-emerald-400/18 bg-white/52 dark:bg-emerald-400/5">
                <Sparkles className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                <span className="label-caps text-emerald-600 dark:text-emerald-400/80">{t('smartSystem')}</span>
              </div>
            )}

            {heroVisible && (
              <>
                <h1 className="hero-h1 hero-title text-[72px] sm:text-[92px] lg:text-[112px] text-slate-800 dark:text-white">
                  {t('heroTitle1')}
                </h1>
                <h1 className="hero-h2 hero-title text-[72px] sm:text-[92px] lg:text-[112px] shimmer-text">
                  {t('heroTitle2')}
                </h1>
              </>
            )}

            {heroVisible && (
              <div className="hero-rule w-20 h-px mx-auto my-7 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
            )}

            {heroVisible && (
              <p className="hero-sub text-base sm:text-lg text-slate-600 dark:text-emerald-100/55 mb-11 max-w-md mx-auto leading-[1.75] font-normal">
                {t('heroSubtitle')}
              </p>
            )}

            {heroVisible && (
              <div className="hero-cta flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register" className="btn-prim inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-teal-500 shadow-lg shadow-emerald-600/24">
                  {t('getStarted')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login" className="btn-ghost inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-semibold text-slate-700 dark:text-emerald-300/80 bg-white/58 dark:bg-white/5 border border-emerald-200/60 dark:border-emerald-400/15">
                  {t('alreadyAccount')}
                </Link>
              </div>
            )}
          </div>

          <div className="scroll-cue">
            <ChevronDown className="w-5 h-5 text-slate-400 dark:text-emerald-400/35" />
          </div>
        </section>

        <div className="divider max-w-4xl mx-auto" />

        {/* ══════════ STATS ══════════ */}
        <section className="py-24 px-4 relative overflow-hidden">
          {/* Floating orb behind this section */}
          <div className="section-orb w-[380px] h-[380px] -top-20 -left-24 bg-emerald-300/20 dark:bg-emerald-500/8" style={{ animationDelay:'-6s' }} />
          <div className="section-orb w-[280px] h-[280px] -bottom-16 right-10  bg-teal-300/15    dark:bg-teal-500/6"    style={{ animationDelay:'-14s', animationDuration:'28s' }} />

          <div ref={statsRef} className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {STAT_CARDS.map((s, i) => (
              <div
                key={i}
                className="stat-card glass rounded-2xl p-6 text-center"
                style={{
                  opacity:   statsInView ? 1 : 0,
                  transform: statsInView ? 'translateY(0)' : 'translateY(26px)',
                  transition: `opacity .85s ease ${i*.12}s, transform .85s cubic-bezier(0.23,1,0.32,1) ${i*.12}s`,
                }}
              >
                <div className="glow-ring inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4" style={{ background:`${s.accent}18` }}>
                  <s.icon className="w-5 h-5" style={{ color:s.accent }} />
                </div>
                <div className="hero-title text-4xl sm:text-5xl mb-1.5 shimmer-text" style={{ lineHeight:1.1 }}>
                  {s.value.toLocaleString('th-TH')}
                </div>
                <div className="label-caps text-slate-500 dark:text-emerald-100/35">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="divider max-w-4xl mx-auto" />

        {/* ══════════ FEATURES ══════════ */}
        <section className="py-24 px-4 relative overflow-hidden" ref={featuresRef}>
          <div className="section-orb w-[320px] h-[320px] top-10 right-0 bg-emerald-200/18 dark:bg-emerald-500/6" style={{ animationDelay:'-10s', animationDuration:'26s' }} />

          <div className="max-w-6xl mx-auto relative z-10">
            <div
              className="text-center mb-16"
              style={{
                opacity:   featuresInView ? 1 : 0,
                transform: featuresInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity .9s ease, transform .9s cubic-bezier(0.23,1,0.32,1)',
              }}
            >
              <p className="eyebrow label-caps text-[var(--sage)] mb-4">{t('features')}</p>
              <h2 className="section-title text-4xl sm:text-5xl text-slate-800 dark:text-white">
                {t('doMore')}<br />
                <span className="shimmer-text">{t('youThink')}</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {FEATURES.map((f, i) => {
                const isActive = activeFeature === i;
                return (
                  <TiltCard key={i} intensity={4}>
                    <div
                      className={`feat-card glass rounded-2xl p-7 relative overflow-hidden cursor-pointer border ${isActive ? 'border-emerald-300/50 dark:border-emerald-400/22' : 'border-transparent'}`}
                      style={{
                        opacity:   featuresInView ? 1 : 0,
                        transform: featuresInView ? 'translateY(0)' : 'translateY(26px)',
                        transition: `opacity .85s ease ${i*.15}s, transform .85s cubic-bezier(0.23,1,0.32,1) ${i*.15}s, box-shadow .5s, border-color .4s`,
                        boxShadow: isActive ? `0 16px 44px rgba(0,0,0,0.07), 0 4px 12px ${f.accentGlow}` : undefined,
                      }}
                      onClick={() => setActiveFeature(isActive ? null : i)}
                    >
                      {isActive && (
                        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background:`radial-gradient(ellipse at 50% -5%,${f.accentGlow} 0%,transparent 58%)` }} />
                      )}

                      <div className="icon-med w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background:f.accentMuted, boxShadow:`0 3px 10px ${f.accentGlow}` }}>
                        <f.icon className="w-5 h-5" style={{ color:f.accent }} />
                      </div>

                      <h3 className="section-title text-[17px] text-slate-800 dark:text-white mb-2">{f.title}</h3>
                      <p className="text-slate-500 dark:text-emerald-100/48 text-sm leading-[1.72] mb-3 font-normal">{f.desc}</p>

                      <div className="overflow-hidden" style={{ maxHeight:isActive?'88px':'0', opacity:isActive?1:0, transition:'max-height .6s cubic-bezier(0.23,1,0.32,1),opacity .45s ease' }}>
                        <div className="pt-3 border-t border-slate-100/65 dark:border-white/7">
                          <p className="text-xs text-slate-400 dark:text-emerald-300/55 leading-[1.7] font-normal">{f.detail}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-1 text-xs font-semibold transition-colors duration-300" style={{ color:isActive?f.accent:'#94a3b8' }}>
                        {isActive ? t('hide') : t('seeMore')}
                        <ArrowRight className="w-3 h-3" style={{ transform:isActive?'rotate(90deg)':'rotate(0deg)', transition:'transform 0.4s ease' }} />
                      </div>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          </div>
        </section>

        <div className="divider max-w-4xl mx-auto" />

        {/* ══════════ CTA ══════════ */}
        <section className="py-32 px-4 relative overflow-hidden" ref={ctaRef}>
          <div className="section-orb w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-300/14 dark:bg-emerald-500/7" style={{ animationDelay:'-3s' }} />

          <div
            className="max-w-2xl mx-auto relative z-10"
            style={{
              opacity:   ctaInView ? 1 : 0,
              transform: ctaInView ? 'translateY(0)' : 'translateY(22px)',
              transition: 'opacity 1.05s ease, transform 1.05s cubic-bezier(0.23,1,0.32,1)',
            }}
          >
            <TiltCard intensity={3}>
              <div className="glass rounded-3xl relative overflow-hidden">
                <div className="cta-grid absolute inset-0 rounded-3xl" />
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background:'radial-gradient(ellipse at 50% 0%,rgba(16,185,129,0.08) 0%,transparent 52%)' }} />

                <div className="relative px-8 py-20 text-center">
                  <div className="glow-ring inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-xl shadow-emerald-600/20">
                    <Leaf className="w-8 h-8 text-white" />
                  </div>

                  <h2 className="section-title text-4xl sm:text-5xl text-slate-800 dark:text-white mb-4">
                    {t('readyToChange')}<br />
                    <span className="shimmer-text">{t('changeWorld')}</span>
                  </h2>

                  <p className="text-slate-500 dark:text-emerald-100/50 mb-10 text-base max-w-xs mx-auto leading-[1.75] font-normal">
                    {t('freeRegisterDesc')}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/register" className="btn-prim inline-flex items-center justify-center gap-2 px-9 py-4 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-teal-500 shadow-lg shadow-emerald-600/22">
                      {t('freeRegisterBtn')}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/login" className="btn-ghost inline-flex items-center justify-center gap-2 px-9 py-4 rounded-2xl text-sm font-semibold text-slate-700 dark:text-emerald-300/78 bg-white/58 dark:bg-white/5 border border-emerald-200/55 dark:border-emerald-400/14">
                      {t('alreadyAccount')}
                    </Link>
                  </div>
                </div>
              </div>
            </TiltCard>
          </div>
        </section>

        {/* ══════════ FOOTER ══════════ */}
        <footer className="py-8 px-6 border-t border-emerald-100/50 dark:border-emerald-400/7">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="logo-icon w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-sm">
                <Leaf className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-sm text-slate-700 dark:text-white">{t('wasteBank')}</span>
            </div>
            <p className="label-caps text-slate-400 dark:text-emerald-100/22">{t('footerSlogan')}</p>
          </div>
        </footer>

      </div>
    </>
  );
}