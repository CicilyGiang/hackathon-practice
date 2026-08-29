'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addEventMessage, createInitialSocialState, isCurrentUser, joinEventCrew, leaveEventCrew, loadSocialState, saveSocialState } from '../lib/social-storage';
import type { SocialState } from '../types/social';

type Profile = {
  email: string;
  name: string;
  year: string;
  semester: string;
  major: string;
  phone: string;
};

const emptyProfile: Profile = { email: '', name: '', year: '', semester: '', major: '', phone: '' };

const events = [
  { id: 1, title: 'Clay After Class', host: 'Sydney Uni Pottery', time: 'Wed · 5:30 PM', place: 'Verge Gallery', faculty: 'Arts', emoji: '🏺', color: '#ff7a5c', x: 42, y: 31, reason: 'A zero-pressure creative reset—no art skills needed.', tags: ['Creative', 'Beginner', 'Free'] },
  { id: 2, title: 'Stargazing Social', host: 'Physics Society', time: 'Thu · 7:00 PM', place: 'Physics Lawn', faculty: 'Science', emoji: '🔭', color: '#775cff', x: 69, y: 24, reason: 'Meet curious people outside your degree under the stars.', tags: ['Social', 'Beginner', 'Free'] },
  { id: 3, title: 'Dumpling Lab', host: 'Food Collective', time: 'Fri · 6:00 PM', place: 'Manning Kitchen', faculty: 'Business', emoji: '🥟', color: '#f2b43f', x: 57, y: 58, reason: 'Hands-on, chatty and delicious. The ideal first solo event.', tags: ['Food', 'Social', '$8'] },
  { id: 4, title: 'Sunrise Run Club', host: 'Campus Runners', time: 'Tue · 7:15 AM', place: 'Victoria Park Gate', faculty: 'Health', emoji: '🌅', color: '#39b98a', x: 24, y: 70, reason: 'A friendly 3 km pace with coffee at the finish.', tags: ['Sport', 'Beginner', 'Free'] },
  { id: 5, title: 'Build a Tiny Synth', host: 'ElecSoc', time: 'Sat · 1:00 PM', place: 'Seymour Centre', faculty: 'Engineering', emoji: '🎛️', color: '#ee5ca8', x: 77, y: 76, reason: 'Make something weird with people you would never meet in class.', tags: ['Tech', 'Creative', '$5'] },
];

export default function Home() {
  const [selected, setSelected] = useState(events[0]);
  const [view, setView] = useState<'map' | 'week'>('map');
  const [filter, setFilter] = useState('For you');
  const [social, setSocial] = useState<SocialState>(createInitialSocialState);
  const [chatOpen, setChatOpen] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [draft, setDraft] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileDraft, setProfileDraft] = useState<Profile>(emptyProfile);
  const [profileReady, setProfileReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [signupDismissed, setSignupDismissed] = useState(false);

  useEffect(() => {
    const savedProfile = window.localStorage.getItem('sidequest-profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as Profile;
        setProfile(parsed);
        setProfileDraft(parsed);
      } catch { window.localStorage.removeItem('sidequest-profile'); }
    }
    setProfileReady(true);
    setSocial(loadSocialState());
  }, []);

  const send = (value = draft) => {
    if (!value.trim()) return;
    updateSocial(current => addEventMessage(current, selected.id, value.trim()));
    setDraft('');
  };

  const updateSocial = (update: (current: SocialState) => SocialState) => {
    setSocial(current => {
      const next = update(current);
      saveSocialState(next);
      return next;
    });
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = Object.fromEntries(Object.entries(profileDraft).map(([key, value]) => [key, value.trim()])) as Profile;
    window.localStorage.setItem('sidequest-profile', JSON.stringify(clean));
    setProfile(clean);
    setProfileDraft(clean);
    setEditingProfile(false);
    setSignupDismissed(true);
  };

  const openProfile = () => {
    setProfileDraft(profile ?? emptyProfile);
    setEditingProfile(true);
    setSignupDismissed(false);
  };

  const profileOpen = profileReady && !signupDismissed && (!profile || editingProfile);
  const crewMembers = social.membersByEvent[selected.id] ?? [];
  const crewMessages = social.messagesByEvent[selected.id] ?? [];
  const joinedCrew = crewMembers.some(isCurrentUser);

  const toggleCrew = () => {
    if (joinedCrew) {
      updateSocial(current => leaveEventCrew(current, selected.id));
      setChatOpen(false);
      return;
    }
    updateSocial(current => joinEventCrew(current, selected.id, profile ? { displayName: profile.name, major: profile.major, semester: profile.semester } : undefined));
  };

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">✦</span><span>sidequest</span></div>
      <nav aria-label="Main navigation"><button className="nav-active">Discover</button><button>My week</button><button>Messages <span className="notification">3</span></button></nav>
      <button className="profile" onClick={openProfile} aria-label="Open profile"><span>{profile?.name?.split(' ')[0] ?? 'Sign up'}</span><span className="avatar">{profile?.name?.charAt(0).toUpperCase() ?? '+'}</span></button>
    </header>

    <section className="hero-row"><div><p className="eyebrow">YOUR CAMPUS, UNFILTERED</p><h1>Find your next<br/><em>side quest.</em></h1></div><div className="hero-copy"><p>Events picked to pull you out of your usual orbit—just enough.</p><div className="serendipity"><span>Serendipity level</span><strong>Curious ✨</strong><input aria-label="Serendipity level" type="range" min="1" max="3" defaultValue="2" /></div></div></section>

    <section className="controls"><div className="filters" aria-label="Event filters">{['For you','Today','This week','Free','Beginner-friendly'].map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'active' : ''}>{item}{item === 'For you' && ' ✦'}</button>)}</div><div className="view-toggle"><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>⌖ Map</button><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>▦ Week</button></div></section>

    <section className="workspace">
      <div className={`map google-map ${view === 'week' ? 'week-mode' : ''}`}>
        {view === 'map' && <iframe title="Google Maps view of the University of Sydney campus" src="https://www.google.com/maps?q=University%20of%20Sydney%20NSW&z=16&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
        {view === 'week' && <><div className="week-day">MON</div><div className="week-day">TUE</div><div className="week-day">WED</div><div className="week-day">THU</div><div className="week-day">FRI</div><div className="week-day">SAT</div><div className="week-day">SUN</div></>}
        <div className="map-shade" />
        {events.map(event => <button aria-label={event.title} key={event.id} className={`pin ${selected.id === event.id ? 'selected' : ''}`} style={{left:`${event.x}%`,top:`${event.y}%`,'--pin':event.color} as React.CSSProperties} onClick={() => setSelected(event)}><span>{event.emoji}</span></button>)}
        <a className="google-badge" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.place + ', University of Sydney')}`} target="_blank" rel="noreferrer">View {selected.place} in Google Maps ↗</a>
        <div className="map-key"><span>✦</span> 14 picks for you</div>
      </div>

      <aside className="event-panel"><div className="panel-top"><span className="match">92% YOUR VIBE</span><button className="close" aria-label="Close event">×</button></div><div className="event-art" style={{background: selected.color}}><span>{selected.emoji}</span><div className="art-sticker">TRY<br/>SOMETHING<br/><em>NEW</em></div></div><div className="event-content"><p className="host">{selected.host}</p><h2>{selected.title}</h2><div className="meta"><span>◷ {selected.time}</span><span>⌖ {selected.place}</span></div><div className="tags">{selected.tags.map(tag => <span key={tag}>{tag}</span>)}</div><blockquote><b>✦ Why this one?</b>{selected.reason}</blockquote><div className="going"><div className="faces">{crewMembers.slice(0, 3).map(member => <i key={member.userId}>{member.anonymousAvatar}</i>)}</div><span><b>{crewMembers.length} crew members</b><br/>Identity stays private until individually revealed</span></div><div className="crew-preview" aria-label="Event crew members">{crewMembers.map(member => <span key={member.userId}>{member.anonymousAvatar} {member.anonymousAlias}{isCurrentUser(member) ? ' (you)' : ''}</span>)}</div><div className="actions"><button className="primary" onClick={toggleCrew}>{joinedCrew ? 'Leave this crew' : 'Count me in →'}</button><button className="save" aria-label="Save event">♡</button></div>{joinedCrew && <button className="open-crew-chat" onClick={() => setChatOpen(true)}>Open crew chat →</button>}</div></aside>
    </section>

    {chatOpen && joinedCrew && <section className="chat-card" aria-label="Event group chat"><header><div><b>{selected.title} crew</b><small><i/> {crewMembers.length} members · anonymous by default</small></div><button onClick={() => setChatOpen(false)} aria-label="Close messages">×</button></header><div className="chat-context"><span>{selected.emoji}</span><p><b>{selected.title}</b><br/>{selected.time}</p><button onClick={() => setChatOpen(false)}>View</button></div><div className="messages">{crewMessages.map(message => { const member = crewMembers.find(item => item.userId === message.userId); const mine = message.userId === 'current-user'; return <div className={mine ? 'outgoing' : 'incoming'} key={message.id}>{!mine && <span title={member?.anonymousAlias}>{member?.anonymousAvatar ?? '🎭'}</span>}<p>{message.content}<small>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></p></div>; })}{crewMessages.length === 0 && <p className="empty-chat">Start the conversation with a quick emoji.</p>}</div><div className="quick-emojis" aria-label="Quick emoji replies">{['👋','🙋','✨','☕','👍','🎉'].map(emoji => <button key={emoji} onClick={() => send(emoji)}>{emoji}</button>)}</div><div className="composer">{keyboardMode ? <input autoFocus value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && send()} placeholder="Type a message…"/> : <div className="emoji-hint">Chatting as your private crew alias</div>}<button className="mode-switch" onClick={() => setKeyboardMode(current => !current)} aria-label={keyboardMode ? 'Switch to emoji messaging' : 'Switch to keyboard messaging'}>{keyboardMode ? '😊' : '⌨️'}</button>{keyboardMode && <button className="send" onClick={() => send()}>↑</button>}</div></section>}
    <button className={`chat-launch ${joinedCrew ? '' : 'locked'}`} onClick={() => joinedCrew && setChatOpen(current => !current)} aria-label={joinedCrew ? 'Open event crew messages' : 'Join this event crew to open messages'}>{joinedCrew ? '💬' : '🔒'}{joinedCrew && crewMessages.length > 0 && <span>{crewMessages.length}</span>}</button>

    {profileOpen && <div className="signup-backdrop" role="presentation">
      <section className="signup-card" role="dialog" aria-modal="true" aria-labelledby="signup-title">
        <button className="signup-close" type="button" onClick={() => { setEditingProfile(false); setSignupDismissed(true); }} aria-label="Close signup and view events">×</button>
        <div className="signup-intro"><span className="brand-mark">✦</span><p className="eyebrow">YOUR SIDEQUEST PROFILE</p><h2 id="signup-title">{profile ? 'Update your details' : 'Let’s find your people.'}</h2><p>Tell us a little about you so recommendations can reach beyond your usual campus bubble.</p><div className="privacy-note">🔒 Stored on this device for the hackathon demo.</div></div>
        <form onSubmit={saveProfile}>
          <label>Full name<input required autoComplete="name" value={profileDraft.name} onChange={event => setProfileDraft({...profileDraft, name:event.target.value})} placeholder="Alex Morgan" /></label>
          <label>Email address<input required type="email" autoComplete="email" value={profileDraft.email} onChange={event => setProfileDraft({...profileDraft, email:event.target.value})} placeholder="alex@uni.edu.au" /></label>
          <div className="field-pair"><label>Study year<select required value={profileDraft.year} onChange={event => setProfileDraft({...profileDraft, year:event.target.value})}><option value="">Select year</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Postgraduate</option></select></label><label>Semester<select required value={profileDraft.semester} onChange={event => setProfileDraft({...profileDraft, semester:event.target.value})}><option value="">Select semester</option><option>Semester 1</option><option>Semester 2</option><option>Summer term</option></select></label></div>
          <label>Major<input required value={profileDraft.major} onChange={event => setProfileDraft({...profileDraft, major:event.target.value})} placeholder="Computer Science" /></label>
          <label>Phone number<input required type="tel" autoComplete="tel" minLength={8} value={profileDraft.phone} onChange={event => setProfileDraft({...profileDraft, phone:event.target.value})} placeholder="04XX XXX XXX" /></label>
          <button className="signup-submit" type="submit">{profile ? 'Save my profile' : 'Create my profile'} →</button>
          {profile && <button className="signup-cancel" type="button" onClick={() => setEditingProfile(false)}>Cancel</button>}
        </form>
      </section>
    </div>}
  </main>;
}
