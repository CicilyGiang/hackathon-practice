'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import PremiumTools from './PremiumTools';

type Quest = { id: string; title: string; emoji: string; difficulty: 'Easy' | 'Medium' | 'Hard'; description: string; duration: string; xp: number; points: number; spots: number; colour: string };
type Claim = { id: string; questId: string; friend: string; date: string; time: string; venue: string; status: 'Confirmed' | 'Completed'; claimedOn: string };
type Transaction = { id: string; label: string; amount: number; kind: 'earn' | 'spend'; createdAt: string };
type Pass = { id: string; title: string; hours: number; status: 'Ready' | 'Active' | 'Expired'; activatedAt?: string };
type QuestState = { xp: number; points: number; claims: Claim[]; transactions: Transaction[]; passes: Pass[] };

const quests: Quest[] = [
  { id: 'coffee', title: 'Coffee Catch-up', emoji: '☕', difficulty: 'Easy', description: 'Turn “we should catch up” into a real coffee plan with one friend.', duration: '30–60 min', xp: 35, points: 15, spots: 42, colour: '#ff8b68' },
  { id: 'study', title: 'Study Buddy', emoji: '📚', difficulty: 'Easy', description: 'Plan a focused study session, then take a proper break together.', duration: '45–90 min', xp: 40, points: 15, spots: 36, colour: '#6f91ff' },
  { id: 'walk', title: 'Take a Walk', emoji: '🌿', difficulty: 'Easy', description: 'Leave the screen behind and take a twenty-minute walk with a friend.', duration: '20–45 min', xp: 30, points: 10, spots: 51, colour: '#47b98b' },
  { id: 'new-place', title: 'Try Somewhere New', emoji: '🧭', difficulty: 'Medium', description: 'Invite two friends to explore a venue none of you has visited before.', duration: '1–2 hours', xp: 90, points: 40, spots: 18, colour: '#8b67ee' },
  { id: 'event-buddy', title: 'Event Buddy', emoji: '🎟️', difficulty: 'Medium', description: 'Choose a Sidequest event and attend it with a friend.', duration: '1–3 hours', xp: 110, points: 45, spots: 12, colour: '#f0b844' },
  { id: 'crew', title: 'Build a Crew', emoji: '✨', difficulty: 'Hard', description: 'Bring at least three people together for one shared public activity.', duration: '2+ hours', xp: 220, points: 90, spots: 6, colour: '#ee5ca8' },
];

const rewards = [
  { title: '24-hour Premium', description: 'Advanced filters, private crews and an extra daily quest.', cost: 100, hours: 24 },
  { title: 'Weekend Premium', description: 'Unlock every Premium planning feature for the weekend.', cost: 180, hours: 72 },
  { title: '7-day Premium', description: 'A full week of advanced recommendations and crew tools.', cost: 450, hours: 168 },
];

const emptyState: QuestState = { xp: 0, points: 0, claims: [], transactions: [], passes: [] };
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

export default function QuestSystem() {
  const [state, setState] = useState<QuestState>(emptyState);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'board' | 'active' | 'premium' | 'rewards'>('board');
  const [planning, setPlanning] = useState<Quest | null>(null);
  const [plan, setPlan] = useState({ friend: '', date: '', time: '15:00', venue: '' });
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('sidequest-quest-state') ?? 'null') as QuestState | null;
      if (saved) setState(saved);
    } catch { window.localStorage.removeItem('sidequest-quest-state'); }
    setReady(true);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const update = (next: QuestState) => {
    setState(next);
    window.localStorage.setItem('sidequest-quest-state', JSON.stringify(next));
  };

  const claimedToday = state.claims.filter(claim => claim.claimedOn === todayKey()).length;
  const activeClaims = state.claims.filter(claim => claim.status === 'Confirmed');
  const levelThresholds = [0, 150, 400, 800, 1400, 2200, 3200, 4500, 6000, 8000];
  const level = Math.min(10, levelThresholds.filter(value => state.xp >= value).length);
  const currentFloor = levelThresholds[level - 1];
  const nextLevel = levelThresholds[level] ?? currentFloor;
  const progress = level === 10 ? 100 : Math.round(((state.xp - currentFloor) / (nextLevel - currentFloor)) * 100);
  const activePass = useMemo(() => state.passes.find(pass => pass.status === 'Active' && pass.activatedAt && now < new Date(pass.activatedAt).getTime() + pass.hours * 3600000), [now, state.passes]);
  const dailyLimit = activePass ? 4 : 3;
  const activeLimit = activePass ? 3 : 2;

  const startPlan = (quest: Quest) => {
    if (claimedToday >= dailyLimit) return setNotice(`You have used all ${dailyLimit} daily quest claims. Come back tomorrow.`);
    if (activeClaims.length >= activeLimit) return setNotice('Complete an active quest before claiming another one.');
    if (state.claims.some(claim => claim.questId === quest.id && claim.claimedOn === todayKey())) return setNotice('You already claimed this quest today.');
    setNotice('');
    setPlanning(quest);
  };

  const confirmPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!planning) return;
    const claim: Claim = { id: crypto.randomUUID(), questId: planning.id, friend: plan.friend.trim(), date: plan.date, time: plan.time, venue: plan.venue.trim(), status: 'Confirmed', claimedOn: todayKey() };
    update({ ...state, claims: [claim, ...state.claims] });
    setPlanning(null);
    setPlan({ friend: '', date: '', time: '15:00', venue: '' });
    setTab('active');
    setNotice(`${planning.title} is confirmed. Your friend can now join the plan.`);
  };

  const completeQuest = (claim: Claim) => {
    const quest = quests.find(item => item.id === claim.questId);
    if (!quest || claim.status === 'Completed') return;
    if (!window.confirm(`Confirm that you and ${claim.friend} completed “${quest.title}” together?`)) return;
    const transaction: Transaction = { id: crypto.randomUUID(), label: `${quest.title} completed`, amount: quest.points, kind: 'earn', createdAt: new Date().toISOString() };
    update({ ...state, xp: state.xp + quest.xp, points: state.points + quest.points, claims: state.claims.map(item => item.id === claim.id ? { ...item, status: 'Completed' as const } : item), transactions: [transaction, ...state.transactions] });
    setNotice(`Quest complete — you earned ${quest.xp} XP and ${quest.points} points.`);
  };

  const redeem = (reward: typeof rewards[number]) => {
    if (state.points < reward.cost) return setNotice(`You need ${reward.cost - state.points} more points for ${reward.title}.`);
    if (!window.confirm(`Redeem ${reward.title} for ${reward.cost} Quest Points?`)) return;
    const pass: Pass = { id: crypto.randomUUID(), title: reward.title, hours: reward.hours, status: 'Ready' };
    const transaction: Transaction = { id: crypto.randomUUID(), label: `${reward.title} redeemed`, amount: reward.cost, kind: 'spend', createdAt: new Date().toISOString() };
    update({ ...state, points: state.points - reward.cost, passes: [pass, ...state.passes], transactions: [transaction, ...state.transactions] });
    setNotice(`${reward.title} is ready in your Premium wallet.`);
  };

  const activate = (pass: Pass) => {
    if (activePass) return setNotice('A Premium pass is already active. Activate this one after it expires.');
    update({ ...state, passes: state.passes.map(item => item.id === pass.id ? { ...item, status: 'Active' as const, activatedAt: new Date().toISOString() } : item) });
    setNotice(`${pass.title} is now active.`);
  };

  if (!ready) return null;
  return <section className="quest-hub">
    <div className="quest-hero">
      <div><p className="eyebrow">SOCIAL MINING · REAL CONNECTIONS</p><h1>Make plans.<br/><em>Unlock more.</em></h1><p>Complete real-world social quests with friends. Earn points, level up and unlock Premium—without buying expensive rewards.</p></div>
      <div className="quest-stats">
        <div><span>LEVEL {level}</span><b>{['Starter','Connector','Explorer','Planner','Crew Builder','Adventurer','Guide','Quest Leader','Pathfinder','Legend'][level - 1]}</b><i><u style={{width:`${progress}%`}} /></i><small>{level === 10 ? 'Maximum level reached' : `${state.xp} / ${nextLevel} XP`}</small></div>
        <div className="point-balance"><span>QUEST POINTS</span><b>{state.points}</b><small>Spend on Premium access</small></div>
      </div>
    </div>

    <div className="quest-toolbar">
      <div className="quest-tabs">{(['board','active','premium','rewards'] as const).map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'board' ? 'Quest board' : item === 'active' ? `My quests (${activeClaims.length})` : item === 'premium' ? `Premium studio ${activePass ? '✦' : '◇'}` : 'Premium rewards'}</button>)}</div>
      <div className="daily-meter"><b>{claimedToday} / {dailyLimit}</b><span>daily claims used</span><i><u style={{width:`${(claimedToday / dailyLimit) * 100}%`}} /></i></div>
    </div>
    {notice && <div className="quest-notice" role="status">✦ {notice}<button onClick={() => setNotice('')}>×</button></div>}

    {tab === 'board' && <div className="quest-grid">{quests.map(quest => { const claimed = state.claims.some(claim => claim.questId === quest.id && claim.claimedOn === todayKey()); return <article className="quest-card" key={quest.id} style={{'--quest-colour':quest.colour} as React.CSSProperties}><div className="quest-card-art"><span>{quest.emoji}</span><small>{quest.spots} spots today</small></div><div className="quest-card-copy"><div><span className={`difficulty ${quest.difficulty.toLowerCase()}`}>{quest.difficulty}</span><span>{quest.duration}</span></div><h2>{quest.title}</h2><p>{quest.description}</p><footer><span><b>+{quest.xp}</b> XP</span><span><b>+{quest.points}</b> points</span><button disabled={claimed} onClick={() => startPlan(quest)}>{claimed ? 'Claimed today' : 'Claim quest →'}</button></footer></div></article>; })}</div>}

    {tab === 'active' && <div className="quest-list">{state.claims.length === 0 ? <div className="quest-empty"><span>☆</span><h2>No quests yet.</h2><p>Claim a social quest and turn a loose idea into a real plan.</p><button onClick={() => setTab('board')}>Browse quests →</button></div> : state.claims.map(claim => { const quest = quests.find(item => item.id === claim.questId)!; return <article key={claim.id}><span className="quest-list-icon" style={{background:quest.colour}}>{quest.emoji}</span><div><small>{claim.status.toUpperCase()}</small><h3>{quest.title}</h3><p>With {claim.friend} · {claim.date} at {claim.time}<br/>{claim.venue}</p></div><div className="quest-list-reward"><b>+{quest.xp} XP</b><span>+{quest.points} points</span>{claim.status === 'Confirmed' ? <button onClick={() => completeQuest(claim)}>Confirm together</button> : <strong>✓ Reward earned</strong>}</div></article>; })}</div>}

    {tab === 'premium' && <PremiumTools active={Boolean(activePass)} onGetPremium={() => setTab('rewards')} />}

    {tab === 'rewards' && <div className="rewards-layout"><div><div className="rewards-heading"><p className="eyebrow">PREMIUM ACCESS SHOP</p><h2>Spend points on access,<br/>not expensive prizes.</h2></div><div className="reward-grid">{rewards.map(reward => <article key={reward.title}><span>✦</span><h3>{reward.title}</h3><p>{reward.description}</p><b>{reward.cost} points</b><button disabled={state.points < reward.cost} onClick={() => redeem(reward)}>{state.points >= reward.cost ? 'Redeem pass →' : `${reward.cost - state.points} more needed`}</button></article>)}</div></div><aside className="wallet"><p className="eyebrow">YOUR WALLET</p><b>{state.points}</b><span>available Quest Points</span>{activePass && <div className="active-premium"><small>ACTIVE NOW</small><strong>{activePass.title}</strong><span>Premium features are unlocked.</span></div>}<h3>Premium passes</h3>{state.passes.length === 0 ? <p>No passes yet. Complete quests to build your balance.</p> : state.passes.map(pass => <div className="wallet-pass" key={pass.id}><span><b>{pass.title}</b><small>{pass.status}</small></span>{pass.status === 'Ready' && <button onClick={() => activate(pass)}>Activate</button>}</div>)}<h3>Recent activity</h3>{state.transactions.slice(0,4).map(item => <div className="wallet-row" key={item.id}><span>{item.label}</span><b className={item.kind}>{item.kind === 'earn' ? '+' : '−'}{item.amount}</b></div>)}</aside></div>}

    {planning && <div className="signup-backdrop"><section className="quest-plan" role="dialog" aria-modal="true" aria-labelledby="plan-title"><button className="signup-close" onClick={() => setPlanning(null)} aria-label="Close quest planner">×</button><span className="quest-plan-emoji" style={{background:planning.colour}}>{planning.emoji}</span><p className="eyebrow">PLAN THIS QUEST</p><h2 id="plan-title">{planning.title}</h2><p>{planning.description}</p><form onSubmit={confirmPlan}><label>Friend or crew name<input required value={plan.friend} onChange={event => setPlan({...plan,friend:event.target.value})} placeholder="Maya" /></label><div className="field-pair"><label>Date<input required type="date" min={todayKey()} value={plan.date} onChange={event => setPlan({...plan,date:event.target.value})} /></label><label>Start time<input required type="time" value={plan.time} onChange={event => setPlan({...plan,time:event.target.value})} /></label></div><label>Public venue<input required value={plan.venue} onChange={event => setPlan({...plan,venue:event.target.value})} placeholder="Courtyard Café, Camperdown" /></label><div className="plan-reward"><span>Completion reward</span><b>+{planning.xp} XP · +{planning.points} points</b></div><button className="signup-submit" type="submit">Confirm and invite →</button><small className="plan-safety">Meet in a public place. Both participants must confirm completion before rewards are issued.</small></form></section></div>}
  </section>;
}
