"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Leaf, Mail, Lock, ArrowLeft, ShieldQuestion,
  CheckCircle2, Eye, EyeOff, XCircle, ArrowRight, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/contexts/LanguageContext';

/* ─── SHA-256 ────────────────────────────────────────────── */
const hashPassword = async (text) => {
  const buf  = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
};

/* ─── 3D Canvas (same system as Landing & Register) ─────── */
function Canvas3DBG({ isDark }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(0);
  const mouseRef  = useRef({ x: 0.5, y: 0.5 });

  const initAndRun = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.offsetWidth, H = canvas.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);

    const CL = ['#10b981','#14b8a6','#059669','#6ee7b7','#34d399'];
    const CD = ['#34d399','#2dd4bf','#10b981','#a7f3d0','#6ee7b7'];
    const TOTAL = 60, rand = (a, b) => a + Math.random() * (b - a);
    const cols = isDark ? CD : CL;

    const pts = Array.from({ length: TOTAL }, () => ({
      x: rand(0, W), y: rand(0, H), z: rand(0.1, 1),
      vx: rand(-0.14, 0.14), vy: rand(-0.1, 0.1), vz: rand(-0.0005, 0.0005),
      base: rand(1.4, 3.2), color: cols[Math.floor(rand(0, cols.length))],
    }));

    const LINK = 110;
    const onResize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    };
    const onMouse = (e) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); t += 0.004;
      const mx = (mouseRef.current.x - 0.5) * 22, my = (mouseRef.current.y - 0.5) * 16;

      for (const p of pts) {
        p.x += p.vx + mx * p.z * 0.01; p.y += p.vy + my * p.z * 0.01; p.z += p.vz;
        if (p.z < 0.05) { p.z = 0.05; p.vz *= -1; } if (p.z > 1) { p.z = 1; p.vz *= -1; }
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      }
      for (let i = 0; i < TOTAL; i++) for (let j = i + 1; j < TOTAL; j++) {
        const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx*dx+dy*dy);
        if (d < LINK) {
          const al = (1 - d/LINK) * 0.075 * ((a.z+b.z)/2);
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle = isDark ? `rgba(52,211,153,${al})` : `rgba(16,185,129,${al})`;
          ctx.lineWidth = 0.55; ctx.stroke();
        }
      }
      for (const p of pts) {
        const r = p.base * p.z, al = 0.2 + p.z * 0.5, pulse = 1 + Math.sin(t*1.8+p.x*0.02)*0.13*p.z;
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*4*pulse);
        g.addColorStop(0, p.color+Math.round(al*0.45*255).toString(16).padStart(2,'0'));
        g.addColorStop(1, p.color+'00');
        ctx.beginPath(); ctx.arc(p.x,p.y,r*4*pulse,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x,p.y,r*pulse,0,Math.PI*2);
        ctx.fillStyle = p.color+Math.round(al*255).toString(16).padStart(2,'0'); ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize',onResize); window.removeEventListener('mousemove',onMouse); };
  }, [isDark]);

  useEffect(() => { const cleanup = initAndRun(); return cleanup; }, [initAndRun]);
  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ opacity: isDark ? 0.55 : 0.42, zIndex: 0 }} />;
}

/* ─── Reusable input field ───────────────────────────────── */
function InputField({ icon: Icon, label, error, rightSlot, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        {label && <label className="block text-xs font-semibold text-slate-600 dark:text-emerald-100/58 pl-0.5">{label}</label>}
        {rightSlot}
      </div>
      <div className="relative group">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-emerald-400/38 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors pointer-events-none z-10" />}
        {children}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 pl-0.5">
          <XCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

/* ─── View transition wrapper ────────────────────────────── */
function ViewPane({ children, show }) {
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? 'translateX(0)' : 'translateX(16px)',
      transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.23,1,0.32,1)',
      position: show ? 'relative' : 'absolute',
      pointerEvents: show ? 'auto' : 'none',
      width: '100%',
    }}>
      {children}
    </div>
  );
}

/* ─── Error banner ───────────────────────────────────────── */
function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl mb-5 text-sm font-medium"
      style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.18)', color:'#ef4444' }}>
      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{msg}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const { t }  = useLanguage();

  const [view,   setView]   = useState('login'); // login | forgot_email | forgot_question | forgot_reset | reset_success
  const [loading, setLoading] = useState(false);
  const [errMsg,  setErrMsg]  = useState('');
  const [mounted, setMounted] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Login fields
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // Recovery fields
  const [recoveryUser,    setRecoveryUser]    = useState(null);
  const [securityAnswer,  setSecurityAnswer]  = useState('');
  const [newPassword,     setNewPassword]     = useState('');

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && document.documentElement.classList.contains('dark');

  const goView = (v) => { setView(v); setErrMsg(''); };

  const inputCls = `w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-all outline-none
    bg-white/70 dark:bg-white/5 text-slate-800 dark:text-white
    placeholder:text-slate-400 dark:placeholder:text-emerald-100/28
    border border-white/80 dark:border-white/10
    focus:ring-2 focus:ring-emerald-500/28 focus:border-emerald-400/55 dark:focus:border-emerald-500/38`;

  /* ── Login ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setErrMsg('');
    try {
      const hashed = await hashPassword(password);
      const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
      if (error || !user) throw new Error(t('errLoginNotFound'));
      if (user.password !== hashed) throw new Error(t('errLoginPassword'));
      if (user.status === 'banned') throw new Error(t('errLoginBanned'));
      localStorage.setItem('waste_bank_user', JSON.stringify(user));
      router.push(user.role === 'admin' ? '/admin' : '/user');
    } catch (err) { setErrMsg(err.message); }
    finally { setLoading(false); }
  };

  /* ── Step 1: find email ── */
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setErrMsg('');
    const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    if (user && user.security_question) { setRecoveryUser(user); goView('forgot_question'); }
    else setErrMsg(t('errEmailNotFound'));
    setLoading(false);
  };

  /* ── Step 2: check answer ── */
  const handleCheckAnswer = (e) => {
    e.preventDefault();
    if (securityAnswer.trim().toLowerCase() === recoveryUser.security_answer?.toLowerCase()) {
      goView('forgot_reset');
    } else { setErrMsg(t('errWrongAnswer')); }
  };

  /* ── Step 3: reset password ── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setErrMsg(t('errPassword')); return; }
    setLoading(true); setErrMsg('');
    try {
      const hashed = await hashPassword(newPassword);
      await supabase.from('users').update({ password: hashed }).eq('id', recoveryUser.id);
      goView('reset_success');
      setTimeout(() => { goView('login'); setPassword(''); setNewPassword(''); }, 2500);
    } catch { setErrMsg(t('errResetFail')); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        :root {
          --sage: #3d7a56;
          --glass-bg: rgba(255,255,255,0.62);
          --glass-bd: rgba(255,255,255,0.82);
          --glass-sh: 0 8px 40px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.88);
        }
        .dark {
          --sage: #6fcf97;
          --glass-bg: rgba(10,22,14,0.6);
          --glass-bd: rgba(52,211,153,0.1);
          --glass-sh: 0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes checkPop {
          0%  { opacity:0; transform:scale(0.5); }
          70% { transform:scale(1.12); }
          100%{ opacity:1; transform:scale(1); }
        }
        @keyframes softPulse {
          0%,100% { opacity:.3; transform:scale(1);   }
          50%      { opacity:.55; transform:scale(1.06); }
        }
        @keyframes shimmer {
          0%  { background-position:-400% center; }
          100%{ background-position:400% center; }
        }

        .glass {
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid var(--glass-bd);
          box-shadow: var(--glass-sh);
        }
        .label-caps {
          font-size:10.5px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;
        }
        .login-card { animation: fadeUp 0.65s cubic-bezier(0.23,1,0.32,1) 0.08s both; }
        .check-icon { animation: checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        .section-orb {
          position:absolute; border-radius:50%; pointer-events:none; filter:blur(70px);
          animation: softPulse 22s ease-in-out infinite;
        }
        .shimmer-text {
          background: linear-gradient(100deg,#059669 0%,#10b981 25%,#6ee7b7 45%,#14b8a6 65%,#059669 100%);
          background-size:400% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          background-clip:text; animation:shimmer 7s linear infinite;
        }
        .btn-prim {
          position:relative; overflow:hidden;
          transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease;
        }
        .btn-prim::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(130deg,rgba(255,255,255,0.28) 0%,transparent 52%);
          transform:translateX(-115%) skewX(-12deg);
          transition:transform 0.6s cubic-bezier(0.23,1,0.32,1);
        }
        .btn-prim:hover:not(:disabled)::before { transform:translateX(115%) skewX(-12deg); }
        .btn-prim:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(16,185,129,0.3); }
        .btn-prim:disabled { opacity:.65; cursor:not-allowed; }
        .btn-ghost {
          transition: all 0.35s ease;
        }
        .btn-ghost:hover { transform:translateY(-1px); background:rgba(255,255,255,0.85); box-shadow:0 4px 14px rgba(0,0,0,0.05); }
        .dark .btn-ghost:hover { background:rgba(255,255,255,0.06); box-shadow:none; }
        .logo-icon { transition:transform 0.7s cubic-bezier(0.34,1.56,0.64,1); }
        .logo-icon:hover { transform:rotate(180deg) scale(1.05); }
        .back-btn { transition: all 0.3s ease; }
        .back-btn:hover { transform:translateX(-2px); }
      `}</style>

      <div className="min-h-screen transition-colors duration-700 bg-[#f2f9f5] dark:bg-[#060d08] relative">

        {mounted && <Canvas3DBG isDark={isDark} />}

        {/* Ambient orbs */}
        <div className="section-orb w-[380px] h-[380px] top-[-70px] left-[-80px] bg-emerald-300/15 dark:bg-emerald-500/7 z-0" />
        <div className="section-orb w-[280px] h-[280px] bottom-[-50px] right-[-50px] bg-teal-300/12 dark:bg-teal-500/6 z-0" style={{ animationDelay:'-8s' }} />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">

          {/* Back to home */}
          <div className="w-full max-w-md mb-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sage)] hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              {t('backToHome')}
            </Link>
          </div>

          {/* ── Reset success ── */}
          {view === 'reset_success' ? (
            <div className="glass rounded-3xl p-12 w-full max-w-md text-center" style={{ animation:'fadeUp 0.6s ease both' }}>
              <div className="check-icon inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-xl shadow-emerald-600/20 mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('resetSuccess')}</h2>
              <p className="text-sm text-slate-500 dark:text-emerald-100/50 leading-relaxed">{t('resetSuccessDesc')}</p>
            </div>
          ) : (

          /* ── Main card ── */
          <div className="login-card glass rounded-3xl w-full max-w-md overflow-hidden">

            {/* Card header */}
            <div className="px-8 pt-8 pb-6 text-center border-b border-white/38 dark:border-white/6">
              <div className="logo-icon inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-lg shadow-emerald-600/20 mb-5">
                <Leaf className="w-7 h-7 text-white" />
              </div>

              {/* Title changes per view */}
              {view === 'login' && (
                <>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">{t('welcome')}</h1>
                  <p className="text-sm text-slate-500 dark:text-emerald-100/48">{t('loginSubtitle')}</p>
                </>
              )}
              {view === 'forgot_email' && (
                <>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">{t('recoverPassword')}</h1>
                  <p className="text-sm text-slate-500 dark:text-emerald-100/48">{t('recoverSubtitle')}</p>
                </>
              )}
              {view === 'forgot_question' && (
                <>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">{t('securityQuestionTitle')}</h1>
                  <p className="text-sm text-slate-500 dark:text-emerald-100/48">{t('answerPlaceholder')}</p>
                </>
              )}
              {view === 'forgot_reset' && (
                <>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">{t('setNewPassword')}</h1>
                  <p className="text-sm text-slate-500 dark:text-emerald-100/48">{t('setNewPasswordSubtitle')}</p>
                </>
              )}
            </div>

            <div className="px-8 py-7" style={{ position:'relative', minHeight: 280 }}>

              {/* ══ VIEW: LOGIN ══ */}
              <ViewPane show={view === 'login'}>
                <ErrorBanner msg={view === 'login' ? errMsg : ''} />
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  <InputField
                    icon={Mail}
                    label={t('loginEmailLabel')}
                  >
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={t('loginEmailPlaceholder')} required autoComplete="email"
                      className={inputCls}
                    />
                  </InputField>

                  <InputField
                    icon={Lock}
                    label={t('loginPasswordLabel')}
                    rightSlot={
                      <button type="button" onClick={() => goView('forgot_email')}
                        className="text-xs font-semibold text-[var(--sage)] hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                        {t('forgotPassword')}
                      </button>
                    }
                  >
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={t('loginPasswordPlaceholder')} required autoComplete="current-password"
                      className={`${inputCls} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-400/38 hover:text-emerald-500 transition-colors z-10">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </InputField>

                  <button type="submit" disabled={loading}
                    className="btn-prim w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-teal-500 shadow-lg shadow-emerald-600/20 mt-2">
                    {loading
                      ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/></svg>{t('loggingIn')}</>
                      : <>{t('loginBtn')}<ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/38 dark:border-white/6 text-center">
                  <p className="text-sm text-slate-500 dark:text-emerald-100/44">
                    {t('noAccount')}{' '}
                    <Link href="/register" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                      {t('registerHere')}
                    </Link>
                  </p>
                </div>
              </ViewPane>

              {/* ══ VIEW: FORGOT — step 1 (email) ══ */}
              <ViewPane show={view === 'forgot_email'}>
                <button onClick={() => goView('login')}
                  className="back-btn flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-emerald-100/45 hover:text-slate-800 dark:hover:text-white mb-5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />{t('back')}
                </button>
                <ErrorBanner msg={view === 'forgot_email' ? errMsg : ''} />

                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-5">
                  {[1,2,3].map(s => (
                    <div key={s} className="flex-1 h-1 rounded-full transition-all duration-500"
                      style={{ background: s <= 1 ? '#10b981' : 'rgba(148,163,184,0.2)' }} />
                  ))}
                </div>

                <form onSubmit={handleCheckEmail} noValidate className="space-y-4">
                  <InputField icon={Mail} label={t('loginEmailLabel')}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={t('recoverEmailPlaceholder')} required autoComplete="email"
                      className={inputCls} />
                  </InputField>
                  <button type="submit" disabled={loading}
                    className="btn-prim w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-teal-500 shadow-lg shadow-emerald-600/20">
                    {loading
                      ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/></svg>{t('searching')}</>
                      : <>{t('continueBtn')}<ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                </form>
              </ViewPane>

              {/* ══ VIEW: FORGOT — step 2 (security question) ══ */}
              <ViewPane show={view === 'forgot_question'}>
                <button onClick={() => goView('forgot_email')}
                  className="back-btn flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-emerald-100/45 hover:text-slate-800 dark:hover:text-white mb-5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />{t('back')}
                </button>
                <ErrorBanner msg={view === 'forgot_question' ? errMsg : ''} />

                <div className="flex items-center gap-2 mb-5">
                  {[1,2,3].map(s => (
                    <div key={s} className="flex-1 h-1 rounded-full transition-all duration-500"
                      style={{ background: s <= 2 ? '#10b981' : 'rgba(148,163,184,0.2)' }} />
                  ))}
                </div>

                {/* Question display */}
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl mb-4"
                  style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.16)' }}>
                  <ShieldQuestion className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-slate-700 dark:text-emerald-100/80">
                    {recoveryUser?.security_question}
                  </p>
                </div>

                <form onSubmit={handleCheckAnswer} noValidate className="space-y-4">
                  <InputField icon={ShieldQuestion} label={t('answerPlaceholder')}>
                    <input type="text" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)}
                      placeholder={t('answerPlaceholder')} required
                      className={inputCls} />
                  </InputField>
                  <button type="submit"
                    className="btn-prim w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-teal-500 shadow-lg shadow-emerald-600/20">
                    {t('checkAnswer')}<ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </ViewPane>

              {/* ══ VIEW: FORGOT — step 3 (new password) ══ */}
              <ViewPane show={view === 'forgot_reset'}>
                <ErrorBanner msg={view === 'forgot_reset' ? errMsg : ''} />

                <div className="flex items-center gap-2 mb-5">
                  {[1,2,3].map(s => (
                    <div key={s} className="flex-1 h-1 rounded-full"
                      style={{ background: '#10b981' }} />
                  ))}
                </div>

                <form onSubmit={handleResetPassword} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-emerald-100/58 pl-0.5">
                      {t('newPasswordPlaceholder')}
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-emerald-400/38 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" />
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        placeholder={t('newPasswordPlaceholder')} required minLength={6}
                        autoComplete="new-password"
                        className={`${inputCls} pr-10`}
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-400/38 hover:text-emerald-500 transition-colors z-10">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-prim w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-teal-500 shadow-lg shadow-emerald-600/20">
                    {loading
                      ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/></svg>{t('saving')}</>
                      : <>{t('saveNewPassword')}<ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                </form>
              </ViewPane>

            </div>
          </div>

          )}
        </div>
      </div>
    </>
  );
}