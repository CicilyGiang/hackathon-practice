'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addEventMessage, addIncomingEventMessage, createInitialSocialState, isCurrentUser, joinEventCrew, leaveEventCrew, loadSocialState, saveSocialState } from '../lib/social-storage';
import type { CrewMember, CrewMessage, SocialState } from '../types/social';
import CampusMap from './CampusMap';

type Profile = {
  email: string;
  name: string;
  year: string;
  semester: string;
  major: string;
  phone: string;
};

const emptyProfile: Profile = { email: '', name: '', year: '', semester: '', major: '', phone: '' };

type EventItem = {
  id: number; title: string; host: string; time: string; place: string; address: string;
  lat: number; lng: number; faculty: string; emoji: string; color: string; reason: string; tags: string[];
};

const events: EventItem[] = [
  { id: 1, title: 'Clay After Class', host: 'Sydney Uni Pottery', time: 'Wed · 5:30 PM', place: 'Verge Gallery', address: 'Jane Foss Russell Plaza, City Road, Darlington NSW 2008', lat: -33.8898, lng: 151.1912, faculty: 'Arts', emoji: '🏺', color: '#ff7a5c', reason: 'A zero-pressure creative reset—no art skills needed.', tags: ['Creative', 'Beginner', 'Free'] },
  { id: 2, title: 'Stargazing Social', host: 'Physics Society', time: 'Thu · 7:00 PM', place: 'Physics Lawn', address: 'Physics Road, Camperdown NSW 2006', lat: -33.8881, lng: 151.1900, faculty: 'Science', emoji: '🔭', color: '#775cff', reason: 'Meet curious people outside your degree under the stars.', tags: ['Social', 'Beginner', 'Free'] },
  { id: 3, title: 'Dumpling Lab', host: 'Food Collective', time: 'Fri · 6:00 PM', place: 'Manning Kitchen', address: 'Manning Road, Camperdown NSW 2006', lat: -33.8868, lng: 151.1877, faculty: 'Business', emoji: '🥟', color: '#f2b43f', reason: 'Hands-on, chatty and delicious. The ideal first solo event.', tags: ['Food', 'Social', '$8'] },
  { id: 4, title: 'Sunrise Run Club', host: 'Campus Runners', time: 'Tue · 7:15 AM', place: 'Victoria Park Gate', address: 'City Road, Camperdown NSW 2050', lat: -33.8867, lng: 151.1931, faculty: 'Health', emoji: '🌅', color: '#39b98a', reason: 'A friendly 3 km pace with coffee at the finish.', tags: ['Sport', 'Beginner', 'Free'] },
  { id: 5, title: 'Build a Tiny Synth', host: 'ElecSoc', time: 'Sat · 1:00 PM', place: 'Seymour Centre', address: 'Corner City Road and Cleveland Street, Chippendale NSW 2008', lat: -33.8877, lng: 151.1934, faculty: 'Engineering', emoji: '🎛️', color: '#ee5ca8', reason: 'Make something weird with people you would never meet in class.', tags: ['Tech', 'Creative', '$5'] },
];

const filterDescriptions: Record<string, string> = {
  'For you': 'A varied mix designed to take you just outside your usual orbit.',
  'Today': 'Events happening today on campus.',
  'This week': 'Everything still coming up this week.',
  'Free': 'No-cost events you can join without overthinking it.',
  'Beginner-friendly': 'Welcoming picks where no previous experience is expected.',
  'Social': 'Meet people through relaxed, conversation-friendly activities.',
  'Creative': 'Make, design and try something expressive.',
  'Food': 'Gather around cooking, tasting and shared meals.',
  'Sport': 'Move together through friendly, active events.',
  'Tech': 'Build, experiment and meet fellow technology enthusiasts.',
  'Outdoors': 'Fresh-air activities beyond the classroom.',
};

const eventFilters = ['For you', 'Today', 'This week', 'Free', 'Beginner-friendly', 'Social', 'Creative', 'Food', 'Sport', 'Tech', 'Outdoors'];

export default function Home() {
  const [selected, setSelected] = useState(events[0]);
  const [view, setView] = useState<'map' | 'week'>('map');
  const [filter, setFilter] = useState('For you');
  const [activeNav, setActiveNav] = useState<'discover' | 'week' | 'messages'>('discover');
  const [serendipity, setSerendipity] = useState(2);
  const [savedEventIds, setSavedEventIds] = useState<number[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [social, setSocial] = useState<SocialState>(createInitialSocialState);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileDraft, setProfileDraft] = useState<Profile>(emptyProfile);
  const [profileReady, setProfileReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [signupDismissed, setSignupDismissed] = useState(false);
  const [customEvents, setCustomEvents] = useState<EventItem[]>([]);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState({ title: '', day: 'Mon', time: '12:00', place: '', address: '', emoji: '✨', tags: [] as string[] });
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [friends, setFriends] = useState<string[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<CrewMember | null>(null);
  const [directMessages, setDirectMessages] = useState<Record<string, CrewMessage[]>>({});
  const [directDraft, setDirectDraft] = useState('');
  const [readMessageIds, setReadMessageIds] = useState<string[]>([]);
  const allEvents = useMemo(() => [...events, ...customEvents], [customEvents]);

  const visibleEvents = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-AU', { weekday: 'short' }).format(new Date());
    if (activeNav === 'week') {
      return allEvents;
    }
    switch (filter) {
      case 'Today': return allEvents.filter(event => event.time.startsWith(today));
      case 'Free': return allEvents.filter(event => event.tags.includes('Free'));
      case 'Beginner-friendly': return allEvents.filter(event => event.tags.includes('Beginner'));
      case 'This week': return allEvents;
      default:
        if (eventFilters.includes(filter) && filter !== 'For you') {
          return allEvents.filter(event => event.tags.includes(filter));
        }
        if (serendipity === 1) return allEvents.filter(event => event.tags.includes('Beginner'));
        if (serendipity === 3) return allEvents.filter(event => !event.tags.includes('Beginner') || !event.tags.includes('Free'));
        return allEvents;
    }
  }, [activeNav, allEvents, filter, serendipity]);

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
    try {
      const saved = JSON.parse(window.localStorage.getItem('sidequest-saved-events') ?? '[]');
      if (Array.isArray(saved)) setSavedEventIds(saved.filter(Number.isInteger));
    } catch { window.localStorage.removeItem('sidequest-saved-events'); }
    try {
      const savedCustomEvents = JSON.parse(window.localStorage.getItem('sidequest-custom-events') ?? '[]');
      if (Array.isArray(savedCustomEvents)) setCustomEvents(savedCustomEvents);
      const savedFriends = JSON.parse(window.localStorage.getItem('sidequest-friends') ?? '[]');
      if (Array.isArray(savedFriends)) setFriends(savedFriends);
      setDirectMessages(JSON.parse(window.localStorage.getItem('sidequest-direct-messages') ?? '{}'));
      setReadMessageIds(JSON.parse(window.localStorage.getItem('sidequest-read-messages') ?? '[]'));
    } catch {
      window.localStorage.removeItem('sidequest-custom-events');
      window.localStorage.removeItem('sidequest-friends');
      window.localStorage.removeItem('sidequest-direct-messages');
      window.localStorage.removeItem('sidequest-read-messages');
    }
  }, []);

  useEffect(() => {
    if (visibleEvents.length && !visibleEvents.some(event => event.id === selected.id)) {
      setSelected(visibleEvents[0]);
      setChatOpen(false);
    }
  }, [selected.id, visibleEvents]);

  const send = (value = draft) => {
    if (!value.trim()) return;
    const eventId = selected.id;
    updateSocial(current => addEventMessage(current, selected.id, value.trim()));
    setDraft('');
    window.setTimeout(() => {
      const member = (social.membersByEvent[eventId] ?? []).find(item => !isCurrentUser(item));
      if (member) updateSocial(current => addIncomingEventMessage(current, eventId, member.userId, 'Sounds good — see you there! 👋'));
    }, 900);
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
  const directThread = selectedFriend ? directMessages[selectedFriend.userId] ?? [] : [];
  const incomingIds = [
    ...Object.values(social.messagesByEvent).flat().filter(message => message.userId !== 'current-user').map(message => message.id),
    ...Object.values(directMessages).flat().filter(message => message.userId !== 'current-user').map(message => message.id),
  ];
  const unreadCount = incomingIds.filter(id => !readMessageIds.includes(id)).length;

  useEffect(() => {
    const visible = [
      ...(chatOpen ? crewMessages.filter(message => message.userId !== 'current-user').map(message => message.id) : []),
      ...(selectedFriend ? directThread.filter(message => message.userId !== 'current-user').map(message => message.id) : []),
    ];
    if (!visible.some(id => !readMessageIds.includes(id))) return;
    setReadMessageIds(current => {
      const next = Array.from(new Set([...current, ...visible]));
      window.localStorage.setItem('sidequest-read-messages', JSON.stringify(next));
      return next;
    });
  }, [chatOpen, crewMessages, directThread, readMessageIds, selectedFriend]);

  const toggleCrew = () => {
    if (joinedCrew) {
      updateSocial(current => leaveEventCrew(current, selected.id));
      setChatOpen(false);
      return;
    }
    updateSocial(current => joinEventCrew(current, selected.id, profile ? { displayName: profile.name, major: profile.major, semester: profile.semester } : undefined));
  };

  const selectNav = (next: 'discover' | 'week' | 'messages') => {
    setActiveNav(next);
    setDetailsOpen(true);
    if (next === 'discover') {
      setView('map');
      return;
    }
    if (next === 'week') {
      setView('week');
      return;
    }
    const firstFriendId = friends[0];
    const friend = Object.values(social.membersByEvent).flat().find(member => member.userId === firstFriendId);
    if (friend) {
      setSelectedFriend(friend);
      return;
    }
    const joinedEvent = allEvents.find(event => (social.membersByEvent[event.id] ?? []).some(isCurrentUser));
    if (joinedEvent) {
      setSelected(joinedEvent);
      setChatOpen(true);
    }
  };

  const addFriend = (member: CrewMember) => {
    setFriends(current => {
      const next = current.includes(member.userId) ? current : [...current, member.userId];
      window.localStorage.setItem('sidequest-friends', JSON.stringify(next));
      return next;
    });
  };

  const openFriendChat = (member: CrewMember) => {
    addFriend(member);
    setSelectedFriend(member);
    setActiveNav('messages');
  };

  const sendDirectMessage = () => {
    if (!selectedFriend || !directDraft.trim()) return;
    const friendId = selectedFriend.userId;
    const outgoing: CrewMessage = { id: crypto.randomUUID(), userId: 'current-user', content: directDraft.trim(), createdAt: new Date().toISOString() };
    setDirectMessages(current => {
      const next = { ...current, [friendId]: [...(current[friendId] ?? []), outgoing] };
      window.localStorage.setItem('sidequest-direct-messages', JSON.stringify(next));
      return next;
    });
    setDirectDraft('');
    window.setTimeout(() => {
      const incoming: CrewMessage = { id: crypto.randomUUID(), userId: friendId, content: 'Hey! Great to connect — want to meet before the event?', createdAt: new Date().toISOString() };
      setDirectMessages(current => {
        const next = { ...current, [friendId]: [...(current[friendId] ?? []), incoming] };
        window.localStorage.setItem('sidequest-direct-messages', JSON.stringify(next));
        return next;
      });
    }, 1000);
  };

  const createEvent = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (eventDraft.tags.length === 0) {
      setGeocodeError('Choose at least one event tag.');
      return;
    }
    setGeocoding(true);
    setGeocodeError('');

    let location: { lat: number; lng: number; displayName: string };
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: eventDraft.address }),
      });
      const result = await response.json() as { lat?: number; lng?: number; displayName?: string; message?: string };
      if (!response.ok || typeof result.lat !== 'number' || typeof result.lng !== 'number' || !result.displayName) {
        setGeocodeError(result.message ?? 'We could not verify that address.');
        return;
      }
      location = { lat: result.lat, lng: result.lng, displayName: result.displayName };
    } catch {
      setGeocodeError('The address service is temporarily unavailable. Please try again.');
      return;
    } finally {
      setGeocoding(false);
    }

    const [hourText, minuteText] = eventDraft.time.split(':');
    const hour = Number(hourText);
    const displayHour = hour % 12 || 12;
    const displayTime = `${displayHour}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`;
    const id = Date.now();
    const nextEvent: EventItem = {
      id, title: eventDraft.title.trim(), host: profile?.name || 'Community host',
      time: `${eventDraft.day} · ${displayTime}`, place: eventDraft.place.trim(), address: eventDraft.address.trim(),
      lat: location.lat, lng: location.lng,
      faculty: 'Community', emoji: eventDraft.emoji || '✨', color: '#4f86f7',
      reason: 'A new community-created event ready to bring people together.', tags: ['Community', ...eventDraft.tags],
    };
    setCustomEvents(current => {
      const next = [...current, nextEvent];
      window.localStorage.setItem('sidequest-custom-events', JSON.stringify(next));
      return next;
    });
    setSelected(nextEvent);
    setAddEventOpen(false);
    setDetailsOpen(true);
    setActiveNav('week');
    setView('week');
    setEventDraft({ title: '', day: 'Mon', time: '12:00', place: '', address: '', emoji: '✨', tags: [] });
  };

  const toggleSaved = () => {
    setSavedEventIds(current => {
      const next = current.includes(selected.id) ? current.filter(id => id !== selected.id) : [...current, selected.id];
      window.localStorage.setItem('sidequest-saved-events', JSON.stringify(next));
      return next;
    });
  };

  const deleteEvent = () => {
    if (!customEvents.some(event => event.id === selected.id)) return;
    if (!window.confirm(`Delete “${selected.title}”? This cannot be undone.`)) return;

    const remaining = customEvents.filter(event => event.id !== selected.id);
    setCustomEvents(remaining);
    window.localStorage.setItem('sidequest-custom-events', JSON.stringify(remaining));
    setSavedEventIds(current => {
      const next = current.filter(id => id !== selected.id);
      window.localStorage.setItem('sidequest-saved-events', JSON.stringify(next));
      return next;
    });
    setSelected(events[0]);
    setChatOpen(false);
    setDetailsOpen(true);
  };

  const serendipityLabels = ['Comfort zone', 'Curious', 'Surprise me'];
  const calendarHours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const eventMinutes = (time: string) => {
    const match = time.match(/(\d{1,2}):(\d{2})\s(AM|PM)/);
    if (!match) return 12 * 60;
    let hour = Number(match[1]) % 12;
    if (match[3] === 'PM') hour += 12;
    return hour * 60 + Number(match[2]);
  };

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">✦</span><span>sidequest</span></div>
      <nav aria-label="Main navigation"><button className={activeNav === 'discover' ? 'nav-active' : ''} onClick={() => selectNav('discover')}>Discover</button><button className={activeNav === 'week' ? 'nav-active' : ''} onClick={() => selectNav('week')}>My calendar</button><button className={activeNav === 'messages' ? 'nav-active' : ''} onClick={() => selectNav('messages')}>Messages {unreadCount > 0 && <span className="notification">{unreadCount}</span>}</button></nav>
      <button className="profile" onClick={openProfile} aria-label="Open profile"><span>{profile?.name?.split(' ')[0] ?? 'Sign up'}</span><span className="avatar">{profile?.name?.charAt(0).toUpperCase() ?? '+'}</span></button>
    </header>

    <section className={`hero-row ${activeNav === 'week' ? 'week-hero' : ''}`}><div><p className="eyebrow">{activeNav === 'week' ? 'YOUR WEEK · HOUR BY HOUR' : 'YOUR CAMPUS, UNFILTERED'}</p><h1>{activeNav === 'week' ? <>Plan the moments<br/><em>that matter.</em></> : <>Find your next<br/><em>side quest.</em></>}</h1></div><div className="hero-copy"><p>{activeNav === 'week' ? 'Every campus event, placed at its exact start time.' : 'Events picked to pull you out of your usual orbit—just enough.'}</p><div className="serendipity"><span>Serendipity level</span><strong>{serendipityLabels[serendipity - 1]} ✨</strong><input aria-label="Serendipity level" type="range" min="1" max="3" value={serendipity} onChange={event => { setSerendipity(Number(event.target.value)); setFilter('For you'); setActiveNav('discover'); }} /></div></div></section>

    <section className="controls"><div className="filter-area">{activeNav === 'discover' && <div className="filters" aria-label="Event filters">{eventFilters.map(item => <button key={item} aria-pressed={filter === item} onClick={() => { setFilter(item); setDetailsOpen(true); }} className={filter === item ? 'active' : ''}>{item}{item === 'For you' && ' ✦'}</button>)}</div>}<p className="filter-summary" aria-live="polite"><b>{visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'}</b> · {activeNav === 'week' ? 'All events scheduled for this week.' : filterDescriptions[filter]}</p></div><div className="control-actions"><button className="add-event-button" onClick={() => setAddEventOpen(true)}>+ Add event</button><div className="view-toggle"><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>⌖ Map</button><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>▦ Week</button></div></div></section>

    <section className={`workspace ${!detailsOpen || visibleEvents.length === 0 ? 'no-details' : ''}`}>
      <div className={`map google-map ${view === 'week' ? 'calendar-mode' : ''}`}>
        {view === 'map' ? <CampusMap events={visibleEvents} selectedId={selected.id} onSelect={id => { const event = allEvents.find(item => item.id === id); if (event) setSelected(event); setDetailsOpen(true); }} /> : <div className="week-calendar" aria-label="Weekly event calendar">
          <div className="calendar-header"><span className="timezone">AEST</span>{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="calendar-body">
            {calendarHours.map(hour => <div className="time-row" key={hour} style={{top:`${(hour / 24) * 100}%`}}><span>{hour === 0 || hour === 24 ? '12:00 AM' : `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`}</span><i /></div>)}
            <div className="day-columns">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <i key={day} />)}</div>
            <div className="calendar-events">{visibleEvents.map(event => { const day = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(event.time.slice(0,3)); const top = Math.max(0, Math.min(96, (eventMinutes(event.time) / (24 * 60)) * 100)); return <button key={event.id} className={`calendar-event ${selected.id === event.id ? 'selected' : ''}`} style={{left:`calc(${(day / 7) * 100}% + 4px)`,width:'calc(14.285% - 8px)',top:`${top}%`,borderColor:event.color}} onClick={() => { setSelected(event); setDetailsOpen(true); }}><span>{event.emoji}</span><b>{event.title}</b><small>{event.time.split('·')[1].trim()}</small></button>; })}</div>
          </div>
        </div>}
        {view === 'map' && visibleEvents.length > 0 && <a className="google-badge" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`} target="_blank" rel="noreferrer">Open address in Google Maps ↗</a>}
        {view === 'map' && <div className="map-key"><span>✦</span> {visibleEvents.length} {filter.toLowerCase()} {visibleEvents.length === 1 ? 'pick' : 'picks'}</div>}
        {visibleEvents.length === 0 && <div className="empty-state"><span>☆</span><h2>Your week is wide open.</h2><p>Save an event or join a crew, then it will appear here.</p><button onClick={() => selectNav('discover')}>Discover events</button></div>}
        {!detailsOpen && visibleEvents.length > 0 && <button className="show-details" onClick={() => setDetailsOpen(true)}>Show event details →</button>}
      </div>

      {detailsOpen && visibleEvents.length > 0 && <aside className="event-panel"><div className="panel-top"><span className="match">92% YOUR VIBE</span><button className="close" aria-label="Close event details" onClick={() => setDetailsOpen(false)}>×</button></div><div className="event-art" style={{background: selected.color}}><span>{selected.emoji}</span><div className="art-sticker">TRY<br/>SOMETHING<br/><em>NEW</em></div></div><div className="event-content"><p className="host">{selected.host}</p><h2>{selected.title}</h2><div className="meta"><span>◷ {selected.time}</span><span>⌖ {selected.place}</span></div><address className="event-address">{selected.address}</address><div className="tags">{selected.tags.map(tag => <span key={tag}>{tag}</span>)}</div><blockquote><b>✦ Why this one?</b>{selected.reason}</blockquote><div className="going"><div className="faces">{crewMembers.slice(0, 3).map(member => <i key={member.userId}>{member.anonymousAvatar}</i>)}</div><span><b>{crewMembers.length} crew members</b><br/>Identity stays private until individually revealed</span></div><div className="crew-preview" aria-label="Event crew members">{crewMembers.map(member => <span key={member.userId}>{member.anonymousAvatar} {member.anonymousAlias}{isCurrentUser(member) ? ' (you)' : !friends.includes(member.userId) ? <button onClick={() => addFriend(member)}>Add friend</button> : <button onClick={() => openFriendChat(member)}>Message</button>}</span>)}</div><div className="actions"><button className="primary" onClick={toggleCrew}>{joinedCrew ? 'Leave this crew' : 'Count me in →'}</button><button className={`save ${savedEventIds.includes(selected.id) ? 'saved' : ''}`} aria-label={savedEventIds.includes(selected.id) ? 'Remove event from My week' : 'Save event to My week'} aria-pressed={savedEventIds.includes(selected.id)} onClick={toggleSaved}>{savedEventIds.includes(selected.id) ? '♥' : '♡'}</button></div>{savedEventIds.includes(selected.id) && <p className="saved-note">Saved to My week</p>}{joinedCrew && <button className="open-crew-chat" onClick={() => setChatOpen(true)}>Open crew chat →</button>}{customEvents.some(event => event.id === selected.id) && <button className="delete-event" onClick={deleteEvent}>Delete event</button>}</div></aside>}
    </section>

    {chatOpen && joinedCrew && <section className="chat-card" aria-label="Event group chat"><header><div><b>{selected.title} crew</b><small><i/> {crewMembers.length} members · anonymous by default</small></div><button onClick={() => setChatOpen(false)} aria-label="Close messages">×</button></header><div className="chat-context"><span>{selected.emoji}</span><p><b>{selected.title}</b><br/>{selected.time}</p><button onClick={() => setChatOpen(false)}>View</button></div><div className="messages">{crewMessages.map(message => { const member = crewMembers.find(item => item.userId === message.userId); const mine = message.userId === 'current-user'; return <div className={mine ? 'outgoing' : 'incoming'} key={message.id}>{!mine && <span title={member?.anonymousAlias}>{member?.anonymousAvatar ?? '🎭'}</span>}<p>{message.content}<small>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></p></div>; })}{crewMessages.length === 0 && <p className="empty-chat">Start the conversation with a quick emoji.</p>}</div><div className="quick-emojis" aria-label="Quick emoji replies">{['👋','🙋','✨','☕','👍','🎉'].map(emoji => <button key={emoji} onClick={() => send(emoji)}>{emoji}</button>)}</div><div className="composer"><input autoFocus value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && send()} placeholder="Type a message…"/><button className="send" onClick={() => send()} aria-label="Send message">↑</button></div></section>}
    {selectedFriend && <section className="chat-card direct-chat" aria-label={`Chat with ${selectedFriend.anonymousAlias}`}><header><div><b>{selectedFriend.anonymousAvatar} {selectedFriend.anonymousAlias}</b><small><i/> Friend · direct message</small></div><button onClick={() => setSelectedFriend(null)} aria-label="Close direct messages">×</button></header><div className="messages">{directThread.map(message => { const mine = message.userId === 'current-user'; return <div className={mine ? 'outgoing' : 'incoming'} key={message.id}>{!mine && <span>{selectedFriend.anonymousAvatar}</span>}<p>{message.content}<small>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></p></div>; })}{directThread.length === 0 && <p className="empty-chat">You are friends now. Say hello!</p>}</div><div className="composer"><input autoFocus value={directDraft} onChange={event => setDirectDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && sendDirectMessage()} placeholder="Message your friend…"/><button className="send" onClick={sendDirectMessage} aria-label="Send direct message">↑</button></div></section>}
    <button className={`chat-launch ${joinedCrew ? '' : 'locked'}`} onClick={() => joinedCrew && setChatOpen(current => !current)} aria-label={joinedCrew ? 'Open event crew messages' : 'Join this event crew to open messages'}>{joinedCrew ? '💬' : '🔒'}{unreadCount > 0 && <span>{unreadCount}</span>}</button>

    {addEventOpen && <div className="signup-backdrop"><section className="add-event-card" role="dialog" aria-modal="true" aria-labelledby="add-event-title"><button className="signup-close" onClick={() => setAddEventOpen(false)} aria-label="Close add event form">×</button><p className="eyebrow">COMMUNITY CALENDAR</p><h2 id="add-event-title">Add a new event</h2><p>Publish an activity to this week’s calendar and campus map.</p><form onSubmit={createEvent}><label>Event title<input required value={eventDraft.title} onChange={event => setEventDraft({...eventDraft,title:event.target.value})} placeholder="Morning coffee walk" /></label><div className="field-pair"><label>Day<select value={eventDraft.day} onChange={event => setEventDraft({...eventDraft,day:event.target.value})}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <option key={day}>{day}</option>)}</select></label><label>Start time<input required type="time" value={eventDraft.time} onChange={event => setEventDraft({...eventDraft,time:event.target.value})} /></label></div><div className="field-pair"><label>Venue<input required value={eventDraft.place} onChange={event => setEventDraft({...eventDraft,place:event.target.value})} placeholder="Main Quad" /></label><label>Emoji<input required maxLength={4} value={eventDraft.emoji} onChange={event => setEventDraft({...eventDraft,emoji:event.target.value})} /></label></div><fieldset className="tag-picker"><legend>Event tags <span>Choose one or more</span></legend><div>{['Free','Beginner','Social','Creative','Food','Sport','Tech','Outdoors'].map(tag => { const active = eventDraft.tags.includes(tag); return <button key={tag} type="button" className={active ? 'selected' : ''} aria-pressed={active} onClick={() => { setEventDraft({...eventDraft,tags: active ? eventDraft.tags.filter(item => item !== tag) : [...eventDraft.tags, tag]}); setGeocodeError(''); }}>{active ? '✓ ' : '+ '}{tag}</button>; })}</div></fieldset><label>Full address<input required value={eventDraft.address} onChange={event => { setEventDraft({...eventDraft,address:event.target.value}); setGeocodeError(''); }} placeholder="39 Belmore Street, Burwood NSW 2134" /></label><small className={`geocode-status ${geocodeError ? 'error' : ''}`} aria-live="polite">{geocodeError || 'The pin will be placed at the verified address.'}</small><button className="signup-submit" type="submit" disabled={geocoding}>{geocoding ? 'Locating address…' : 'Add to calendar →'}</button></form></section></div>}

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
