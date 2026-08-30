'use client';

import QRCode from 'qrcode';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import ScheduleGapPlanner from './ScheduleGapPlanner';

type TrustedPerson = { id: string; name: string; avatar: string; relation: 'Friend' | 'Shared club'; club?: string; activity: string; note: string; venue: string; until: string; lat: number; lng: number };
type FriendRequest = { id: string; name: string; contact: string; method: 'Email' | 'Phone' | 'QR code'; direction: 'incoming' | 'outgoing'; status: 'Pending' | 'Accepted' | 'Declined' };
type HangoutRequest = { id: string; personId: string; activity: string; venue: string; message: string; direction: 'incoming' | 'outgoing'; status: 'Pending' | 'Accepted' | 'Declined' };
type FreeStatus = { enabled: boolean; activity: string; venue: string; visibility: 'Friends only' | 'Friends + selected clubs'; expiresAt: string };
// Group formation: a "squad" is a spontaneous multi-person hangout formed from
// whoever is currently free (visiblePeople), not a scheduled event crew. Kept
// as additive fields on HubState so existing friend/hangout/free-status logic
// is untouched.
type GroupMessage = { id: string; personId: string; text: string; createdAt: string };
type SquadHangout = { id: string; activity: string; venue: string; message: string; memberIds: string[]; createdAt: string; status: 'Open' | 'Closed' };
type HubState = { friendIds: string[]; friendRequests: FriendRequest[]; hangoutRequests: HangoutRequest[]; freeStatus: FreeStatus; squads: SquadHangout[]; squadMessages: Record<string, GroupMessage[]> };

const people: TrustedPerson[] = [
  { id: 'maya', name: 'Maya Chen', avatar: '🌻', relation: 'Friend', activity: 'Coffee · Walk', note: 'Finished class early—anyone nearby?', venue: 'Near Fisher Library', until: '5:30 PM', lat: -33.8864, lng: 151.1907 },
  { id: 'noah', name: 'Noah Williams', avatar: '🦊', relation: 'Shared club', club: 'Photography Society', activity: 'Study break', note: 'Free after the club meeting.', venue: 'Near Main Quad', until: '6:00 PM', lat: -33.8857, lng: 151.1874 },
  { id: 'olivia', name: 'Olivia Park', avatar: '🌙', relation: 'Friend', activity: 'Lunch · Campus event', note: 'Looking for a quick lunch plan.', venue: 'Near Manning House', until: '4:45 PM', lat: -33.8874, lng: 151.1878 },
];

const initialState: HubState = {
  friendIds: ['maya', 'olivia'],
  friendRequests: [{ id: 'incoming-1', name: 'Ethan Lee', contact: 'Photography Society', method: 'QR code', direction: 'incoming', status: 'Pending' }],
  hangoutRequests: [{ id: 'hangout-incoming', personId: 'maya', activity: 'Coffee Catch-up', venue: 'Courtyard Café', message: 'I’m free after class. Want to grab coffee?', direction: 'incoming', status: 'Pending' }],
  freeStatus: { enabled: false, activity: 'Coffee', venue: 'University Main Quad', visibility: 'Friends only', expiresAt: '' },
  squads: [],
  squadMessages: {},
};

export default function HangoutHub() {
  const [state, setState] = useState<HubState>(initialState);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<TrustedPerson>(people[0]);
  const [friendOpen, setFriendOpen] = useState(false);
  const [friendsListOpen, setFriendsListOpen] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [contactMethod, setContactMethod] = useState<'Email' | 'Phone' | 'QR code'>('Email');
  const [contact, setContact] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [inviteCode, setInviteCode] = useState('SIDEQUEST-LIHUA-84K2');
  const [requestDraft, setRequestDraft] = useState({ activity: 'Coffee Catch-up', venue: 'Courtyard Café', message: '' });
  const [chatPerson, setChatPerson] = useState<TrustedPerson | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [messages, setMessages] = useState<Record<string, { id: string; mine: boolean; text: string }[]>>({});
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [squadOpen, setSquadOpen] = useState(false);
  const [squadSelection, setSquadSelection] = useState<string[]>([]);
  const [squadDraft, setSquadDraft] = useState({ activity: 'Coffee Catch-up', venue: 'Courtyard Café', message: '' });
  const [squadChatId, setSquadChatId] = useState<string | null>(null);
  const [squadChatDraft, setSquadChatDraft] = useState('');

  useEffect(() => { try { const saved = JSON.parse(window.localStorage.getItem('sidequest-hangout-hub') ?? 'null') as HubState | null; if (saved) setState({ ...initialState, ...saved, squads: saved.squads ?? [], squadMessages: saved.squadMessages ?? {} }); } catch { window.localStorage.removeItem('sidequest-hangout-hub'); } setReady(true); }, []);
  useEffect(() => { void QRCode.toDataURL(`https://sidequest.local/friend/${inviteCode}`, { width: 220, margin: 2, color: { dark: '#18201c', light: '#ffffff' } }).then(setQrUrl); }, [inviteCode]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30000); return () => window.clearInterval(timer); }, []);

  const freeActive = state.freeStatus.enabled && Boolean(state.freeStatus.expiresAt) && clock < new Date(state.freeStatus.expiresAt).getTime();
  useEffect(() => { if (!state.freeStatus.enabled || freeActive || !state.freeStatus.expiresAt) return; save({ ...state, freeStatus: { ...state.freeStatus, enabled: false } }); setNotice('Your “Free to hang out” status expired automatically.'); }, [clock, freeActive, state]);

  const save = (next: HubState) => { setState(next); window.localStorage.setItem('sidequest-hangout-hub', JSON.stringify(next)); };
  // Same functional-update + persist pattern as lib/social-storage.ts's updateSocial in
  // app/page.tsx, used here so staggered setTimeout-based "X joined" messages never
  // clobber each other by writing from a stale `state` closure.
  const updateState = (update: (current: HubState) => HubState) => { setState(current => { const next = update(current); window.localStorage.setItem('sidequest-hangout-hub', JSON.stringify(next)); return next; }); };
  const visiblePeople = useMemo(() => people.filter(person => person.relation === 'Friend' ? state.friendIds.includes(person.id) : true), [state.friendIds]);
  const squads = state.squads;
  const squadMembers = (squad: SquadHangout) => squad.memberIds.filter(id => id !== 'me').map(id => people.find(person => person.id === id)).filter((person): person is TrustedPerson => Boolean(person));
  const activeSquad = squads.find(squad => squad.id === squadChatId) ?? null;

  const toggleSquadPick = (id: string) => setSquadSelection(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  const createSquad = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (squadSelection.length < 2) return; // a squad is a group, not another 1:1 hangout
    const id = crypto.randomUUID();
    const picked = squadSelection;
    const squad: SquadHangout = { id, activity: squadDraft.activity, venue: squadDraft.venue, message: squadDraft.message, memberIds: ['me', ...picked], createdAt: new Date().toISOString(), status: 'Open' };
    const opening: GroupMessage = { id: crypto.randomUUID(), personId: 'me', text: squadDraft.message || `Anyone keen for ${squadDraft.activity.toLowerCase()} at ${squadDraft.venue}?`, createdAt: new Date().toISOString() };
    save({ ...state, squads: [squad, ...squads], squadMessages: { ...state.squadMessages, [id]: [opening] } });
    setSquadOpen(false);
    setSquadChatId(id);
    setNotice(`Squad started with ${picked.length} people. Waiting for them to join in.`);
    setSquadSelection([]);
    picked.forEach((personId, index) => {
      const person = people.find(item => item.id === personId);
      if (!person) return;
      window.setTimeout(() => {
        const joinMessage: GroupMessage = { id: crypto.randomUUID(), personId: person.id, text: index === 0 ? `I’m in, see you there! 👋` : `Count me in too.`, createdAt: new Date().toISOString() };
        updateState(current => ({ ...current, squadMessages: { ...current.squadMessages, [id]: [...(current.squadMessages[id] ?? []), joinMessage] } }));
      }, 900 + index * 700);
    });
  };

  const sendSquadMessage = () => {
    if (!activeSquad || !squadChatDraft.trim()) return;
    const message: GroupMessage = { id: crypto.randomUUID(), personId: 'me', text: squadChatDraft.trim(), createdAt: new Date().toISOString() };
    updateState(current => ({ ...current, squadMessages: { ...current.squadMessages, [activeSquad.id]: [...(current.squadMessages[activeSquad.id] ?? []), message] } }));
    setSquadChatDraft('');
  };

  const leaveSquad = (id: string) => {
    updateState(current => ({ ...current, squads: current.squads.map(item => item.id === id ? { ...item, status: 'Closed' } : item) }));
    if (squadChatId === id) setSquadChatId(null);
    setNotice('You left the squad.');
  };

  const publishFree = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const minutes = Number(form.get('duration')); const next = { ...state.freeStatus, enabled: true, activity: String(form.get('activity')), venue: String(form.get('venue')), visibility: String(form.get('visibility')) as FreeStatus['visibility'], expiresAt: new Date(Date.now() + minutes * 60000).toISOString() }; save({ ...state, freeStatus: next }); setFreeOpen(false); setNotice(`You are visible to ${next.visibility.toLowerCase()} for ${minutes} minutes.`); };
  const publishFromGap = (activity: string, durationMinutes: number) => { const next = { ...state.freeStatus, enabled: true, activity, expiresAt: new Date(Date.now() + durationMinutes * 60000).toISOString() }; save({ ...state, freeStatus: next }); setNotice(`Your timetable confirms this gap. You are visible for ${durationMinutes} minutes.`); };

  const sendFriendRequest = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!contact.trim()) return; const request: FriendRequest = { id: crypto.randomUUID(), name: contactMethod === 'QR code' ? 'Sidequest member' : contact.trim(), contact: contact.trim(), method: contactMethod, direction: 'outgoing', status: 'Pending' }; save({ ...state, friendRequests: [request, ...state.friendRequests] }); setContact(''); setNotice('Friend request sent. They must accept before becoming your friend.'); };
  const respondFriend = (id: string, accepted: boolean) => { const request = state.friendRequests.find(item => item.id === id); if (!request) return; save({ ...state, friendIds: accepted ? Array.from(new Set([...state.friendIds, `accepted-${id}`])) : state.friendIds, friendRequests: state.friendRequests.map(item => item.id === id ? { ...item, status: accepted ? 'Accepted' : 'Declined' } : item) }); setNotice(accepted ? `${request.name} is now your friend.` : 'Friend request declined.'); };

  const sendHangout = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const request: HangoutRequest = { id: crypto.randomUUID(), personId: selected.id, ...requestDraft, direction: 'outgoing', status: 'Pending' }; save({ ...state, hangoutRequests: [request, ...state.hangoutRequests] }); setRequestOpen(false); setNotice(`Hangout request sent to ${selected.name}. Waiting for their response.`); };
  const respondHangout = (id: string, accepted: boolean) => { const request = state.hangoutRequests.find(item => item.id === id); if (!request) return; const person = people.find(item => item.id === request.personId); save({ ...state, hangoutRequests: state.hangoutRequests.map(item => item.id === id ? { ...item, status: accepted ? 'Accepted' : 'Declined' } : item) }); if (accepted && person) { setChatPerson(person); setMessages(current => ({ ...current, [person.id]: [{ id: crypto.randomUUID(), mine: false, text: request.message }] })); } setNotice(accepted ? 'Hangout accepted. A private planning chat is open.' : 'Hangout request declined.'); };
  const sendMessage = () => { if (!chatPerson || !chatDraft.trim()) return; setMessages(current => ({ ...current, [chatPerson.id]: [...(current[chatPerson.id] ?? []), { id: crypto.randomUUID(), mine: true, text: chatDraft.trim() }] })); setChatDraft(''); };

  if (!ready) return null;
  const incomingFriends = state.friendRequests.filter(item => item.direction === 'incoming' && item.status === 'Pending');
  const currentFriends = [
    ...people.filter(person => person.relation === 'Friend' && state.friendIds.includes(person.id)).map(person => ({ id: person.id, name: person.name, avatar: person.avatar, detail: person.activity, available: true })),
    ...state.friendRequests.filter(item => item.direction === 'incoming' && item.status === 'Accepted').map(item => ({ id: item.id, name: item.name, avatar: '🪴', detail: `Added via ${item.method}`, available: false })),
  ];
  const incomingHangouts = state.hangoutRequests.filter(item => item.direction === 'incoming' && item.status === 'Pending');
  return <section className="hangout-hub">
    {friendsListOpen && <div className="signup-backdrop"><section className="friends-list-modal"><button className="signup-close" onClick={() => setFriendsListOpen(false)}>×</button><p className="eyebrow">MY TRUSTED CONNECTIONS</p><h2>My friends</h2><p>These people accepted your friend request. They only appear on the map when they actively share availability.</p><div className="friends-list-grid">{currentFriends.map(friend => <article key={friend.id}><span>{friend.avatar}</span><div><b>{friend.name}</b><small>{friend.detail}</small></div><i className={friend.available ? 'online' : ''}>{friend.available ? 'Free now' : 'Offline'}</i><button onClick={() => { const person = people.find(item => item.id === friend.id); if (person) { setSelected(person); setFriendsListOpen(false); } else setNotice(`${friend.name} is not currently sharing availability.`); }}>View</button></article>)}</div><div className="shared-club-list"><h3>Shared clubs</h3><article><span>📷</span><div><b>Photography Society</b><small>Noah Williams is free now</small></div><i>Verified club</i></article></div><button className="add-from-list" onClick={() => { setFriendsListOpen(false); setFriendOpen(true); }}>＋ Add another friend</button></section></div>}
    <header className="hangout-hero"><div><p className="eyebrow">TRUSTED CIRCLES · SPONTANEOUS PLANS</p><h1>See who’s free.<br/><em>Make it happen.</em></h1><p>Only friends and verified shared-club members can appear here. Every location is a public meetup area—not anyone’s live GPS.</p></div><div className={`my-free-card ${freeActive ? 'active' : ''}`}><span>{freeActive ? '● YOU ARE VISIBLE' : '○ YOU ARE HIDDEN'}</span><h2>{freeActive ? `Free for ${state.freeStatus.activity}` : 'Ready when you are.'}</h2><p>{freeActive ? `${state.freeStatus.venue} · ${state.freeStatus.visibility}` : 'Your availability is never shared automatically.'}</p><div><button onClick={() => setFreeOpen(true)}>{freeActive ? 'Edit status' : '+ I’m free'}</button>{freeActive && <button className="stop" onClick={() => { save({ ...state, freeStatus: { ...state.freeStatus, enabled: false } }); setNotice('You stopped sharing your availability.'); }}>Stop sharing</button>}</div></div></header>
    <ScheduleGapPlanner onActivate={publishFromGap}/>
    <div className="hangout-actions"><div><b>{visiblePeople.length} trusted people are free</b><span>{currentFriends.length} friends · 1 shared club member</span></div><div className="friend-action-buttons"><button onClick={() => setFriendsListOpen(true)}>My friends ({currentFriends.length})</button><button onClick={() => setFriendOpen(true)}>＋ Add friends {incomingFriends.length > 0 && <i>{incomingFriends.length}</i>}</button><button className="squad-up" disabled={visiblePeople.length < 2} title={visiblePeople.length < 2 ? 'Need at least 2 trusted people free to squad up' : undefined} onClick={() => setSquadOpen(true)}>✦ Squad up</button></div></div>
    {notice && <div className="hangout-notice" role="status">✦ {notice}<button onClick={() => setNotice('')}>×</button></div>}
    {squads.filter(squad => squad.status === 'Open').length > 0 && <div className="squad-list" aria-label="My squads"><b>My squads</b>{squads.filter(squad => squad.status === 'Open').map(squad => <button key={squad.id} className="squad-chip" onClick={() => setSquadChatId(squad.id)}><span>{squad.activity}</span><small>{squadMembers(squad).length + 1} people · {squad.venue}</small></button>)}</div>}
    {incomingHangouts.map(request => { const person = people.find(item => item.id === request.personId)!; return <div className="incoming-hangout" key={request.id}><span>{person.avatar}</span><div><small>HANGOUT REQUEST</small><b>{person.name} invited you to {request.activity}</b><p>{request.message} · {request.venue}</p></div><button onClick={() => respondHangout(request.id, true)}>Accept</button><button className="decline" onClick={() => respondHangout(request.id, false)}>Not today</button></div>; })}
    <div className="hangout-workspace"><div className="hangout-map-wrap"><TrustedMap people={visiblePeople} selectedId={selected.id} onSelect={id => setSelected(visiblePeople.find(item => item.id === id) ?? visiblePeople[0])}/><div className="map-privacy">⌖ Approximate public meetup areas only</div></div><aside className="free-person-card"><div className="relationship">{selected.relation === 'Friend' ? '✓ FRIEND' : `◎ SHARED CLUB · ${selected.club}`}</div><span className="person-avatar">{selected.avatar}</span><h2>{selected.name}</h2><p className="availability">● Free until {selected.until}</p><div className="person-info"><span><b>Interested in</b>{selected.activity}</span><span><b>Meetup area</b>{selected.venue}</span></div><blockquote>“{selected.note}”</blockquote><button className="ask-hangout" onClick={() => { setRequestDraft(current => ({...current,message:`Hey ${selected.name.split(' ')[0]}! I’m also free. Want to hang out?`})); setRequestOpen(true); }}>Ask to hang out →</button><button className="privacy-secondary" onClick={() => setNotice(`${selected.name} is visible because they are your ${selected.relation.toLowerCase()}${selected.club ? ` in ${selected.club}` : ''}.`)}>Why can I see this person?</button></aside></div>

    {freeOpen && <div className="signup-backdrop"><section className="hangout-modal"><button className="signup-close" onClick={() => setFreeOpen(false)}>×</button><p className="eyebrow">FREE TO HANG OUT</p><h2>Share a short availability window.</h2><p>Your exact location is never shown.</p><form onSubmit={publishFree}><label>Activity<select name="activity" defaultValue={state.freeStatus.activity}>{['Coffee','Walk','Study break','Lunch','Campus event'].map(item => <option key={item}>{item}</option>)}</select></label><label>Public meetup area<select name="venue" defaultValue={state.freeStatus.venue}>{['University Main Quad','Near Fisher Library','Victoria Park Gate','Manning House entrance'].map(item => <option key={item}>{item}</option>)}</select></label><div className="field-pair"><label>Visible to<select name="visibility" defaultValue={state.freeStatus.visibility}><option>Friends only</option><option>Friends + selected clubs</option></select></label><label>Auto-expire after<select name="duration" defaultValue="60"><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option></select></label></div><button className="signup-submit">Go visible →</button><small>Block and privacy settings always override friend or club visibility.</small></form></section></div>}

    {requestOpen && <div className="signup-backdrop"><section className="hangout-modal"><button className="signup-close" onClick={() => setRequestOpen(false)}>×</button><p className="eyebrow">HANGOUT REQUEST</p><h2>Ask {selected.name.split(' ')[0]} to hang out.</h2><p>They must accept before a private chat opens.</p><form onSubmit={sendHangout}><label>Plan<select value={requestDraft.activity} onChange={event => setRequestDraft({...requestDraft,activity:event.target.value})}>{['Coffee Catch-up','Take a Walk','Study Break','Lunch Together','Something else'].map(item => <option key={item}>{item}</option>)}</select></label><label>Suggested public venue<input required value={requestDraft.venue} onChange={event => setRequestDraft({...requestDraft,venue:event.target.value})}/></label><label>Message<textarea required value={requestDraft.message} onChange={event => setRequestDraft({...requestDraft,message:event.target.value})}/></label><button className="signup-submit">Send request →</button></form></section></div>}

    {squadOpen && <div className="signup-backdrop"><section className="hangout-modal"><button className="signup-close" onClick={() => { setSquadOpen(false); setSquadSelection([]); }}>×</button><p className="eyebrow">SQUAD UP</p><h2>Turn “free right now” into a group.</h2><p>Pick everyone who’s currently free and start one shared plan instead of asking one at a time.</p><form onSubmit={createSquad}><fieldset className="tag-picker"><legend>Who’s free right now? <span>Pick at least 2</span></legend><div>{visiblePeople.map(person => { const active = squadSelection.includes(person.id); return <button type="button" key={person.id} className={active ? 'selected' : ''} aria-pressed={active} onClick={() => toggleSquadPick(person.id)}>{active ? '✓ ' : '+ '}{person.avatar} {person.name.split(' ')[0]}</button>; })}</div></fieldset><label>Plan<select value={squadDraft.activity} onChange={event => setSquadDraft({...squadDraft,activity:event.target.value})}>{['Coffee Catch-up','Take a Walk','Study Break','Lunch Together','Something else'].map(item => <option key={item}>{item}</option>)}</select></label><label>Suggested public venue<input required value={squadDraft.venue} onChange={event => setSquadDraft({...squadDraft,venue:event.target.value})}/></label><label>Message<textarea value={squadDraft.message} onChange={event => setSquadDraft({...squadDraft,message:event.target.value})} placeholder={`Anyone keen for ${squadDraft.activity.toLowerCase()}?`}/></label><button className="signup-submit" disabled={squadSelection.length < 2}>{squadSelection.length < 2 ? 'Pick at least 2 people' : `Start squad with ${squadSelection.length} people →`}</button><small>Everyone you pick must already be free and visible to you — same trust rule as a 1:1 hangout.</small></form></section></div>}

    {activeSquad && <section className="chat-card hangout-chat squad-chat" aria-label={`${activeSquad.activity} squad chat`}><header><div><b>✦ {activeSquad.activity} squad</b><small><i/> {squadMembers(activeSquad).length + 1} people · {activeSquad.venue}</small></div><button onClick={() => setSquadChatId(null)} aria-label="Close squad chat">×</button></header><div className="chat-context"><span>{squadMembers(activeSquad).map(member => member.avatar).join(' ')}</span><p><b>{activeSquad.venue}</b><br/>{squadMembers(activeSquad).map(member => member.name.split(' ')[0]).join(', ')} + you</p><button onClick={() => leaveSquad(activeSquad.id)}>Leave</button></div><div className="messages">{(state.squadMessages[activeSquad.id] ?? []).map(message => { const mine = message.personId === 'me'; const sender = people.find(person => person.id === message.personId); return <div className={mine ? 'outgoing' : 'incoming'} key={message.id}>{!mine && <span title={sender?.name}>{sender?.avatar ?? '🎭'}</span>}<p>{message.text}</p></div>; })}</div><div className="composer"><input value={squadChatDraft} onChange={event => setSquadChatDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && sendSquadMessage()} placeholder="Message the squad…"/><button className="send" onClick={sendSquadMessage} aria-label="Send message to squad">↑</button></div></section>}

    {friendOpen && <div className="signup-backdrop"><section className="friend-modal"><button className="signup-close" onClick={() => setFriendOpen(false)}>×</button><div className="friend-modal-head"><p className="eyebrow">TRUSTED CONNECTIONS</p><h2>Add a friend</h2><p>Every request stays pending until the other person accepts.</p></div><div className="friend-methods">{(['Email','Phone','QR code'] as const).map(method => <button className={contactMethod === method ? 'active' : ''} onClick={() => setContactMethod(method)} key={method}>{method === 'Email' ? '✉ ' : method === 'Phone' ? '☎ ' : '▦ '}{method}</button>)}</div>{contactMethod === 'QR code' ? <div className="qr-friend"><div>{qrUrl && <img src={qrUrl} alt="Scannable Sidequest friend QR code"/>}<small>YOUR FRIEND QR</small></div><p>Let your friend scan this code, or enter a code you scanned from them.</p><form onSubmit={sendFriendRequest}><label>Scanned friend code<input required value={contact} onChange={event => setContact(event.target.value)} placeholder="SIDEQUEST-MAYA-1234"/></label><button className="signup-submit">Send QR friend request</button></form><button className="new-code" onClick={() => setInviteCode(`SIDEQUEST-LIHUA-${Math.random().toString(36).slice(2,6).toUpperCase()}`)}>Generate a new QR</button></div> : <form className="friend-contact-form" onSubmit={sendFriendRequest}><label>{contactMethod === 'Email' ? 'Friend’s email address' : 'Friend’s phone number'}<input required type={contactMethod === 'Email' ? 'email' : 'tel'} value={contact} onChange={event => setContact(event.target.value)} placeholder={contactMethod === 'Email' ? 'friend@uni.edu.au' : '04XX XXX XXX'}/></label><button className="signup-submit">Send friend request →</button></form>}<div className="request-list"><h3>Incoming requests</h3>{incomingFriends.length === 0 ? <p>No pending requests.</p> : incomingFriends.map(request => <div key={request.id}><span>🪴</span><p><b>{request.name}</b><small>{request.method} · {request.contact}</small></p><button onClick={() => respondFriend(request.id,true)}>Accept</button><button className="decline" onClick={() => respondFriend(request.id,false)}>Decline</button></div>)}<h3>Sent requests</h3>{state.friendRequests.filter(item => item.direction === 'outgoing').slice(0,3).map(request => <div key={request.id}><span>◷</span><p><b>{request.contact}</b><small>{request.method} · {request.status}</small></p></div>)}</div></section></div>}

    {chatPerson && <section className="chat-card hangout-chat"><header><div><b>{chatPerson.avatar} {chatPerson.name}</b><small><i/> Hangout accepted · private planning chat</small></div><button onClick={() => setChatPerson(null)}>×</button></header><div className="chat-context"><span>☕</span><p><b>Public meetup</b><br/>Courtyard Café · Today</p><button>Plan</button></div><div className="messages">{(messages[chatPerson.id] ?? []).map(message => <div className={message.mine ? 'outgoing' : 'incoming'} key={message.id}>{!message.mine && <span>{chatPerson.avatar}</span>}<p>{message.text}</p></div>)}</div><div className="quick-emojis">{['I’m here','On my way','10 min late'].map(text => <button key={text} onClick={() => { setChatDraft(text); }}>{text}</button>)}</div><div className="composer"><input value={chatDraft} onChange={event => setChatDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && sendMessage()} placeholder="Plan your hangout…"/><button className="send" onClick={sendMessage}>↑</button></div></section>}
  </section>;
}

function TrustedMap({ people, selectedId, onSelect }: { people: TrustedPerson[]; selectedId: string; onSelect: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null); const mapRef = useRef<LeafletMap | null>(null); const markers = useRef<Marker[]>([]); const [ready,setReady] = useState(false); const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect;
  useEffect(() => { if (!container.current || mapRef.current) return; let cancelled=false; void import('leaflet').then(L => { if(cancelled||!container.current)return; const map=L.map(container.current).setView([-33.8865,151.189],16); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map); mapRef.current=map; setReady(true); }); return()=>{cancelled=true;mapRef.current?.remove();mapRef.current=null;}; },[]);
  useEffect(() => { if(!ready)return; void import('leaflet').then(L => { const map=mapRef.current;if(!map)return;markers.current.forEach(marker=>marker.remove());markers.current=people.map(person=>{const icon=L.divIcon({className:'people-marker-wrap',html:`<span class="people-marker ${person.id===selectedId?'selected':''}"><i>${person.avatar}</i><b>${person.name.split(' ')[0]}</b></span>`,iconSize:[66,62],iconAnchor:[33,54]});const marker=L.marker([person.lat,person.lng],{icon}).addTo(map);marker.on('click',()=>onSelectRef.current(person.id));return marker;}); }); },[people,ready,selectedId]);
  return <div className="trusted-map" ref={container}/>;
}
