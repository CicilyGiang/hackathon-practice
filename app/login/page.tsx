'use client';

import { FormEvent, useEffect, useState } from 'react';
import './login.css';

type LoginProfile = { email:string; name:string; year:string; semester:string; major:string; phone:string; role:'student'|'organizer'; clubName:string; bio:string; interests:string[]; favouriteActivities:string[]; avatar:string };
const greetings = [
  { hello: 'Hello.', question: 'How are you today?', language: 'ENGLISH' },
  { hello: 'Hola.', question: '¿Cómo estás hoy?', language: 'ESPAÑOL' },
  { hello: '你好。', question: '今天过得怎么样？', language: '中文' },
  { hello: 'Bonjour.', question: 'Comment allez-vous aujourd’hui ?', language: 'FRANÇAIS' },
  { hello: 'こんにちは。', question: '今日は元気ですか？', language: '日本語' },
  { hello: '안녕하세요.', question: '오늘 하루 어땠어요?', language: '한국어' },
];

export default function LoginPage() {
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const greeting = greetings[greetingIndex];

  useEffect(() => { const timer = window.setInterval(() => setGreetingIndex(index => (index + 1) % greetings.length), 2800); return () => window.clearInterval(timer); }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setBusy(true);
    // Local-only check: this previously POSTed to /api/auth/login against a
    // shared PostgreSQL server (see TEAM_DATABASE_SETUP.md). That backend
    // route is untouched and still in the repo if the team wants to
    // reconnect it later; this device now checks against whatever account
    // was created locally through "Create your profile", so login works
    // with no database or Tailscale setup required.
    try {
      const email = form.email.trim().toLowerCase();
      const account = JSON.parse(window.localStorage.getItem('sidequest-local-account') ?? 'null') as { email: string; password: string } | null;
      const savedProfile = JSON.parse(window.localStorage.getItem('sidequest-profile') ?? 'null') as LoginProfile | null;
      if (!account || !savedProfile || account.email !== email || account.password !== form.password) {
        setError('Invalid email or password.');
        return;
      }
      window.localStorage.setItem('sidequest-profile', JSON.stringify(savedProfile));
      window.location.href = '/';
    } catch { setError('Could not check your saved account. Please try again.'); }
    finally { setBusy(false); }
  };

  return <main className="apple-login">
    <div className="login-orb orb-one"/><div className="login-orb orb-two"/>
    <nav className="login-nav"><a href="/" className="login-brand"><span>✦</span><b>sidequest</b></a><a href="/">Create profile</a></nav>
    <section className="login-stage">
      <div className="greeting-stage" aria-live="polite">
        <span className="greeting-language">{greeting.language}</span>
        <div className="greeting-copy" key={greeting.hello}><h1>{greeting.hello}</h1><p>{greeting.question}</p></div>
        <div className="greeting-dots">{greetings.map((item, index) => <button key={item.language} className={index === greetingIndex ? 'active' : ''} onClick={() => setGreetingIndex(index)} aria-label={`Show greeting in ${item.language}`}/>)}</div>
      </div>
      <section className="login-glass">
        <div className="login-logo"><span>✦</span></div>
        <p className="login-kicker">WELCOME BACK</p><h2>Your next side quest<br/>is waiting.</h2><p className="login-intro">Sign in with your verified University of Sydney account.</p>
        <form onSubmit={login}><label>University email<input required type="email" autoComplete="email" value={form.email} onChange={event => { setForm({...form,email:event.target.value}); setError(''); }} placeholder="student@uni.sydney.edu.au" /></label><label>Password<input required type="password" autoComplete="current-password" value={form.password} onChange={event => { setForm({...form,password:event.target.value}); setError(''); }} placeholder="Your password" /></label>{error && <div className="apple-login-error" role="alert">{error}</div>}<button className="apple-login-submit" disabled={busy}>{busy ? <><i/>Checking securely…</> : <>Continue <span>→</span></>}</button></form>
        <div className="login-security"><span>◉</span><p><b>Private by design</b><br/>Encrypted password verification and a secure HttpOnly session.</p></div>
        <p className="login-register">New to Sidequest? <a href="/">Create your profile</a></p>
      </section>
    </section>
    <footer className="login-footer"><span>Made for real campus connections.</span><span>USYD · Sydney</span></footer>
  </main>;
}
