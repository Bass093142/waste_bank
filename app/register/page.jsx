"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Leaf, Mail, Lock, User, Phone, ShieldQuestion,
  UserCircle, Users, Eye, EyeOff, CheckCircle2,
  XCircle, ArrowRight, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/contexts/LanguageContext';

/* ─── SHA-256 hash ───────────────────────────────────────── */
const hashPassword = async (text) => {
  const buf  = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
};

/* ─── 3D Canvas Background ───────────────────────────────── */
function Canvas3DBG({ isDark }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(0);
  const mouseRef  = useRef({ x: 0.5, y: 0.5 });

  const initAndRun = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const COLORS_L = ['#10b981','#14b8a6','#059669','#6ee7b7','#34d399'];
    const COLORS_D = ['#34d399','#2dd4bf','#10b981','#a7f3d0','#6ee7b7'];
    const TOTAL = 70;
    const rand  = (a, b) => a + Math.random() * (b - a);
    const cols  = isDark ? COLORS_D : COLORS_L;

    const pts = Array.from({ length: TOTAL }, () => ({
      x: rand(0, W), y: rand(0, H), z: rand(0.1, 1),
      vx: rand(-0.15, 0.15), vy: rand(-0.1, 0.1),
      vz: rand(-0.0005, 0.0005),
      base: rand(1.5, 3.5),
      color: cols[Math.floor(rand(0, cols.length))],
    }));

    const LINK = 120;
    const onResize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    };
    const onMouse = (e) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.004;
      const mx = (mouseRef.current.x - 0.5) * 25;
      const my = (mouseRef.current.y - 0.5) * 18;

      for (const p of pts) {
        p.x += p.vx + mx * p.z * 0.01; p.y += p.vy + my * p.z * 0.01; p.z += p.vz;
        if (p.z < 0.05) { p.z = 0.05; p.vz *= -1; }
        if (p.z > 1.0)  { p.z = 1.0;  p.vz *= -1; }
        if (p.x < -20)  p.x = W + 20; if (p.x > W+20) p.x = -20;
        if (p.y < -20)  p.y = H + 20; if (p.y > H+20) p.y = -20;
      }
      for (let i = 0; i < TOTAL; i++) {
        for (let j = i + 1; j < TOTAL; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x-b.x, dy = a.y-b.y, dist = Math.sqrt(dx*dx+dy*dy);
          if (dist < LINK) {
            const al = (1 - dist/LINK) * 0.08 * ((a.z+b.z)/2);
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
            ctx.strokeStyle = isDark ? `rgba(52,211,153,${al})` : `rgba(16,185,129,${al})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        const r = p.base * p.z, al = 0.2 + p.z * 0.5;
        const pulse = 1 + Math.sin(t * 1.8 + p.x * 0.02) * 0.14 * p.z;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r*4*pulse);
        g.addColorStop(0, p.color + Math.round(al*0.5*255).toString(16).padStart(2,'0'));
        g.addColorStop(1, p.color + '00');
        ctx.beginPath(); ctx.arc(p.x, p.y, r*4*pulse, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, r*pulse, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.round(al*255).toString(16).padStart(2,'0'); ctx.fill();
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

  useEffect(() => { const cleanup = initAndRun(); return cleanup; }, [initAndRun]);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ opacity: isDark ? 0.55 : 0.42, zIndex: 0 }} />
  );
}

/* ─── Field wrapper ──────────────────────────────────────── */
function Field({ icon: Icon, label, error, hint, children }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-semibold text-slate-600 dark:text-emerald-100/58 pl-0.5">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-emerald-400/38
            group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400
            transition-colors pointer-events-none z-10" />
        )}
        {children}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 pl-0.5 pt-0.5">
          <XCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-400 dark:text-emerald-100/28 pl-0.5 pt-0.5">{hint}</p>
      )}
    </div>
  );
}

/* ─── Password strength ──────────────────────────────────── */
function PasswordStrength({ password, labels }) {
  const checks = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score  = checks.filter(Boolean).length;
  const colors = ['', '#ef4444', '#f59e0b', '#10b981', '#059669'];
  if (!password) return null;
  return (
    <div className="pt-1 space-y-1">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ background: i <= score ? colors[score] : 'rgba(148,163,184,0.2)' }} />
        ))}
      </div>
      {score > 0 && (
        <p className="text-xs font-medium pl-0.5" style={{ color: colors[score] }}>
          {labels[score - 1]}
        </p>
      )}
    </div>
  );
}

/* ─── Section box ────────────────────────────────────────── */
function Section({ title, icon: Icon, accent = 'emerald', children }) {
  const A = {
    emerald: { bg: 'rgba(16,185,129,0.07)', text: '#059669', border: 'rgba(16,185,129,0.16)' },
    blue:    { bg: 'rgba(59,130,246,0.07)', text: '#2563eb', border: 'rgba(59,130,246,0.16)' },
  }[accent];
  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: A.bg, border: `1px solid ${A.border}` }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: A.text }} />
        <h3 className="label-caps" style={{ color: A.text }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ─── Validation (receives translated error messages) ────── */
function buildErrors(f, msgs) {
  const e = {};
  if (!f.firstname.trim())                   e.firstname = msgs.errFirstname;
  if (!f.lastname.trim())                    e.lastname  = msgs.errLastname;
  if (!/^[0-9]{9,10}$/.test(f.phone.trim())) e.phone    = msgs.errPhone;
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = msgs.errEmail;
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(f.username.trim())) e.username = msgs.errUsername;
  if (f.password.length < 6)                 e.password  = msgs.errPassword;
  if (f.password !== f.confirmPassword)      e.confirmPassword = msgs.errConfirmPw;
  if (!f.pet_name.trim())                    e.pet_name  = msgs.errPetName;
  return e;
}

/* ─── Main component ────────────────────────────────────── */
export default function Register() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [loading,   setLoading]   = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [success,   setSuccess]   = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [showCfm,   setShowCfm]   = useState(false);
  const [fieldErrs, setFieldErrs] = useState({});
  const [touched,   setTouched]   = useState({});

  const [form, setForm] = useState({
    username: '', password: '', confirmPassword: '',
    title: lang === 'en' ? 'Mr.' : 'นาย',
    firstname: '', lastname: '',
    gender: 'not_specified', email: '', phone: '', pet_name: '',
  });

  // keep default title in sync with language
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      title: lang === 'en' ? 'Mr.' : 'นาย',
    }));
  }, [lang]);

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && document.documentElement.classList.contains('dark');

  /* error message map (always translated) */
  const errMsgs = {
    errFirstname:  t('errFirstname'),
    errLastname:   t('errLastname'),
    errPhone:      t('errPhone'),
    errEmail:      t('errEmail'),
    errUsername:   t('errUsername'),
    errPassword:   t('errPassword'),
    errConfirmPw:  t('errConfirmPw'),
    errPetName:    t('errPetName'),
  };

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    if (fieldErrs[field]) setFieldErrs(prev => ({ ...prev, [field]: '' }));
  };

  /* phone — numbers only, max 10 */
  const setPhone = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm(prev => ({ ...prev, phone: v }));
    setTouched(prev => ({ ...prev, phone: true }));
    if (fieldErrs.phone) setFieldErrs(prev => ({ ...prev, phone: '' }));
  };

  const blur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errs = buildErrors(form, errMsgs);
    setFieldErrs(prev => ({ ...prev, [field]: errs[field] || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const errs = buildErrors(form, errMsgs);
    if (Object.keys(errs).length > 0) {
      setFieldErrs(errs);
      const all = {};
      Object.keys(errs).forEach(k => { all[k] = true; });
      setTouched(all);
      setErrorMsg(t('formIncomplete'));
      return;
    }
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('users').select('id').eq('username', form.username).single();
      if (existing) throw new Error(t('usernameTaken'));

      const hashed = await hashPassword(form.password);
      const { error: insertErr } = await supabase.from('users').insert([{
        id: Date.now(),
        username:  form.username.trim(),
        password:  hashed,
        title:     form.title,
        firstname: form.firstname.trim(),
        lastname:  form.lastname.trim(),
        gender:    form.gender,
        email:     form.email.trim(),
        phone:     form.phone.trim(),
        pet_name:  form.pet_name.trim(),
      }]);
      if (insertErr) throw insertErr;
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2400);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* shared class helpers */
  const inputCls = (field, noIcon = false) =>
    `w-full ${noIcon ? 'px-4' : 'pl-10 pr-4'} py-3 rounded-xl text-sm font-medium transition-all outline-none
     bg-white/70 dark:bg-white/5 text-slate-800 dark:text-white
     placeholder:text-slate-400 dark:placeholder:text-emerald-100/28
     border focus:ring-2 focus:ring-emerald-500/28
     ${touched[field] && fieldErrs[field]
       ? 'border-red-400 dark:border-red-400/55'
       : 'border-white/80 dark:border-white/10 focus:border-emerald-400/55 dark:focus:border-emerald-500/38'}`;

  const selectCls = (field, hasIcon = false) =>
    `w-full ${hasIcon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl text-sm font-medium transition-all outline-none
     bg-white/70 dark:bg-white/5 text-slate-800 dark:text-white
     border focus:ring-2 focus:ring-emerald-500/28
     ${touched[field] && fieldErrs[field]
       ? 'border-red-400 dark:border-red-400/55'
       : 'border-white/80 dark:border-white/10 focus:border-emerald-400/55 dark:focus:border-emerald-500/38'}`;

  /* title options per language */
  const titleOptions = lang === 'en'
    ? [['Mr.', t('mr')], ['Mrs.', t('mrs')], ['Ms.', t('miss')], ['Other', t('others')]]
    : [['นาย', t('mr')], ['นาง', t('mrs')], ['นางสาว', t('miss')], ['อื่นๆ', t('others')]];

  /* gender options */
  const genderOptions = [
    ['not_specified', t('genderNotSpec')],
    ['male',          t('genderMale')],
    ['female',        t('genderFemale')],
  ];

  /* password strength labels */
  const pwLabels = [t('pwStrWeak'), t('pwStrFair'), t('pwStrGood'), t('pwStrStrong')];

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
          0%   { opacity:0; transform:scale(0.5); }
          70%  { transform:scale(1.12); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes successSlide {
          from { opacity:0; transform:translateY(14px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes softPulse {
          0%,100% { opacity:.32; transform:scale(1); }
          50%      { opacity:.58; transform:scale(1.07); }
        }

        .glass {
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid var(--glass-bd);
          box-shadow: var(--glass-sh);
        }
        .label-caps {
          font-size: 10.5px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
        }
        .form-card  { animation: fadeUp 0.7s cubic-bezier(0.23,1,0.32,1) 0.1s both; }
        .check-icon { animation: checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both; }
        .success-card { animation: successSlide 0.6s cubic-bezier(0.23,1,0.32,1) both; }
        .section-orb {
          position:absolute; border-radius:50%; pointer-events:none; filter:blur(70px);
          animation: softPulse 22s ease-in-out infinite;
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
        .btn-prim:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 22px rgba(16,185,129,0.3); }
        .btn-prim:disabled { opacity:.65; cursor:not-allowed; }
        .logo-icon { transition:transform 0.7s cubic-bezier(0.34,1.56,0.64,1); }
        .logo-icon:hover { transform:rotate(180deg) scale(1.05); }
        select option { background:#0a1a0e; color:#e2e8f0; }
      `}</style>

      <div className="min-h-screen transition-colors duration-700 bg-[#f2f9f5] dark:bg-[#060d08] relative">

        {mounted && <Canvas3DBG isDark={isDark} />}

        {/* Ambient orbs */}
        <div className="section-orb w-[400px] h-[400px] top-[-80px] left-[-90px] bg-emerald-300/16 dark:bg-emerald-500/7 z-0" />
        <div className="section-orb w-[300px] h-[300px] bottom-[-60px] right-[-50px] bg-teal-300/12 dark:bg-teal-500/6 z-0" style={{ animationDelay:'-9s' }} />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-12">

          {/* Back link */}
          <div className="w-full max-w-2xl mb-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sage)] hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              {t('backToHome')}
            </Link>
          </div>

          {/* ── Success ── */}
          {success ? (
            <div className="success-card glass rounded-3xl p-12 w-full max-w-md text-center">
              <div className="check-icon inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/25 mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('registerSuccess')}</h2>
              <p className="text-slate-500 dark:text-emerald-100/52 text-sm leading-relaxed">{t('registerSuccessDesc')}</p>
            </div>
          ) : (

          /* ── Form card ── */
          <div className="form-card glass rounded-3xl w-full max-w-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-8 pb-6 text-center border-b border-white/38 dark:border-white/6">
              <div className="logo-icon inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-lg shadow-emerald-600/20 mb-5">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">
                {t('createAccount')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-emerald-100/48 font-normal">
                {t('joinUsDesc')}
              </p>
            </div>

            <div className="px-6 py-6">

              {/* Global error */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl mb-5 text-sm font-medium"
                  style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.18)', color:'#ef4444' }}>
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">

                {/* ── 1. Personal Info ── */}
                <Section title={t('personalInfo')} icon={User} accent="emerald">

                  {/* Title + Firstname */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-emerald-100/55 mb-1 pl-0.5">
                        {t('titleLabel')}
                      </label>
                      <select value={form.title} onChange={set('title')} className={selectCls('title')}>
                        {titleOptions.map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Field icon={User} label={t('firstNameLabel')} error={touched.firstname && fieldErrs.firstname}>
                        <input
                          type="text" value={form.firstname}
                          onChange={set('firstname')} onBlur={blur('firstname')}
                          placeholder={t('firstName')} required
                          className={inputCls('firstname')}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Lastname + Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t('lastNameLabel')} error={touched.lastname && fieldErrs.lastname}>
                      <input
                        type="text" value={form.lastname}
                        onChange={set('lastname')} onBlur={blur('lastname')}
                        placeholder={t('lastName')} required
                        className={inputCls('lastname', true)}
                      />
                    </Field>
                    <Field icon={Users} label={t('genderLabel')}>
                      <select value={form.gender} onChange={set('gender')} className={selectCls('gender', true)}>
                        {genderOptions.map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                {/* ── 2. Contact Info ── */}
                <Section title={t('contactInfo')} icon={Phone} accent="emerald">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {/* Phone — numbers only via onInput */}
                    <Field
                      icon={Phone}
                      label={t('phoneLabel')}
                      error={touched.phone && fieldErrs.phone}
                      hint={t('phoneHint')}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.phone}
                        onChange={setPhone}
                        onBlur={blur('phone')}
                        placeholder={t('phonePlaceholder')}
                        required
                        maxLength={10}
                        className={inputCls('phone')}
                      />
                    </Field>

                    <Field
                      icon={Mail}
                      label={t('emailLabel')}
                      error={touched.email && fieldErrs.email}
                    >
                      <input
                        type="email" value={form.email}
                        onChange={set('email')} onBlur={blur('email')}
                        placeholder={t('emailPlaceholder')}
                        className={inputCls('email')}
                      />
                    </Field>
                  </div>
                </Section>

                {/* ── 3. Account Info ── */}
                <Section title={t('accountInfo')} icon={UserCircle} accent="emerald">

                  <Field
                    icon={UserCircle}
                    label={t('usernameLabel')}
                    error={touched.username && fieldErrs.username}
                    hint={t('usernameHint')}
                  >
                    <input
                      type="text" value={form.username}
                      onChange={set('username')} onBlur={blur('username')}
                      placeholder={t('usernamePlaceholder')} required
                      autoComplete="username"
                      className={inputCls('username')}
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-emerald-100/55 pl-0.5">
                        {t('passwordLabel')}
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-emerald-400/38 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" />
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={form.password}
                          onChange={set('password')} onBlur={blur('password')}
                          placeholder={t('passwordPlaceholder')}
                          required minLength={6} autoComplete="new-password"
                          className={`${inputCls('password')} pr-10`}
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-400/38 hover:text-emerald-500 transition-colors z-10">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrength password={form.password} labels={pwLabels} />
                      {touched.password && fieldErrs.password && (
                        <p className="flex items-center gap-1 text-xs text-red-500 pl-0.5">
                          <XCircle className="w-3 h-3" />{fieldErrs.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-emerald-100/55 pl-0.5">
                        {t('confirmPasswordLabel')}
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-emerald-400/38 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" />
                        <input
                          type={showCfm ? 'text' : 'password'}
                          value={form.confirmPassword}
                          onChange={set('confirmPassword')} onBlur={blur('confirmPassword')}
                          placeholder={t('confirmPasswordPlaceholder')}
                          required autoComplete="new-password"
                          className={`${inputCls('confirmPassword')} pr-10`}
                        />
                        <button type="button" onClick={() => setShowCfm(!showCfm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-400/38 hover:text-emerald-500 transition-colors z-10">
                          {showCfm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {form.confirmPassword && (
                        <p className={`flex items-center gap-1 text-xs pl-0.5 ${
                          form.password === form.confirmPassword ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {form.password === form.confirmPassword
                            ? <><CheckCircle2 className="w-3 h-3" />{t('pwMatch')}</>
                            : <><XCircle className="w-3 h-3" />{t('pwNoMatch')}</>
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </Section>

                {/* ── 4. Security Question ── */}
                <Section title={t('securityQuestion')} icon={ShieldQuestion} accent="blue">
                  <Field
                    icon={ShieldQuestion}
                    label={t('petQuestion')}
                    error={touched.pet_name && fieldErrs.pet_name}
                    hint={t('petHint')}
                  >
                    <input
                      type="text" value={form.pet_name}
                      onChange={set('pet_name')} onBlur={blur('pet_name')}
                      placeholder={t('petAnswerPlaceholder')} required
                      className={inputCls('pet_name')}
                    />
                  </Field>
                </Section>

                {/* ── Submit ── */}
                <button
                  type="submit" disabled={loading}
                  className="btn-prim w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-teal-500 shadow-lg shadow-emerald-600/20 mt-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                      </svg>
                      {t('creatingAccount')}
                    </>
                  ) : (
                    <>{t('registerNow')}<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 pt-5 border-t border-white/38 dark:border-white/6 text-center">
                <p className="text-sm text-slate-500 dark:text-emerald-100/44">
                  {t('alreadyHaveAccount')}{' '}
                  <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                    {t('loginHere')}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          )}
        </div>
      </div>
    </>
  );
}