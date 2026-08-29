'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addEventMessage, addIncomingEventMessage, createInitialSocialState, isCurrentUser, joinEventCrew, leaveEventCrew, loadSocialState, saveSocialState } from '../lib/social-storage';
import type { CrewMember, CrewMessage, SocialState } from '../types/social';
import CampusMap from './CampusMap';
import QuestSystem, { type QuestClaim, type QuestEvent } from './QuestSystem';
import HangoutHub from './HangoutHub';
import LanguageExchange from './LanguageExchange';

type Profile = {
  email: string;
  name: string;
  year: string;
  semester: string;
  major: string;
  phone: string;
  role: 'student' | 'organizer';
  clubName: string;
  bio: string;
  interests: string[];
  favouriteActivities: string[];
  avatar: string;
};

type MembershipPlan = 'Free' | 'Explorer' | 'Premium';

const emptyProfile: Profile = { email: '', name: '', year: '', semester: '', major: '', phone: '', role: 'student', clubName: '', bio: '', interests: [], favouriteActivities: [], avatar: '🌟' };
const usydStudentEmail = /^[^@\s]+@uni\.sydney\.edu\.au$/i;
const interestOptions = ['Art', 'AI', 'Business', 'Culture', 'Food', 'Gaming', 'Music', 'Outdoors', 'Science', 'Sport', 'Tech', 'Travel'];
const activityOptions = ['Brunch', 'Club events', 'Coffee chats', 'Gallery walks', 'Language exchange', 'Live music', 'Running', 'Study sessions', 'Volunteering', 'Weekend trips'];
const avatarOptions = ['🌟', '🦊', '🐼', '🐨', '🐯', '🦋', '🌻', '🍓', '🎧', '🚀', '🎨', '🌊'];

type EventItem = {
  id: number; title: string; host: string; time: string; place: string; address: string;
  lat: number; lng: number; faculty: string; emoji: string; color: string; reason: string; tags: string[];
  creatorRole?: 'student' | 'organizer'; capacity?: number;
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
  const [activeNav, setActiveNav] = useState<'discover' | 'week' | 'hangout' | 'quests' | 'language' | 'messages'>('discover');
  const [serendipity, setSerendipity] = useState(2);
  const [savedEventIds, setSavedEventIds] = useState<number[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [social, setSocial] = useState<SocialState>(createInitialSocialState);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileDraft, setProfileDraft] = useState<Profile>(emptyProfile);
  const [profileError, setProfileError] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [membershipPlan, setMembershipPlan] = useState<MembershipPlan>('Free');
  const [eventReminders, setEventReminders] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [signupDismissed, setSignupDismissed] = useState(false);
  const [customEvents, setCustomEvents] = useState<EventItem[]>([]);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState({ title: '', day: 'Mon', time: '12:00', place: '', address: '', emoji: '✨', tags: [] as string[], capacity: '30' });
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [friends, setFriends] = useState<string[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<CrewMember | null>(null);
  const [directMessages, setDirectMessages] = useState<Record<string, CrewMessage[]>>({});
  const [directDraft, setDirectDraft] = useState('');
  const [readMessageIds, setReadMessageIds] = useState<string[]>([]);
  const [facultyFilter, setFacultyFilter] = useState('All faculties');
  const [aiInsights, setAiInsights] = useState<Record<number, { reason: string; matchScore: number }>>({});
  const [questClaims, setQuestClaims] = useState<QuestClaim[]>([]);
  const [questEventSeed, setQuestEventSeed] = useState<EventItem | null>(null);
  const [questMapEvent, setQuestMapEvent] = useState<EventItem | null>(null);
  const [viewedMember, setViewedMember] = useState<CrewMember | null>(null);
  const baseEvents = useMemo(() => [...events, ...customEvents], [customEvents]);
  const allEvents = useMemo(() => questMapEvent ? [...baseEvents, questMapEvent] : baseEvents, [baseEvents, questMapEvent]);
  const faculties = useMemo(() => Array.from(new Set(allEvents.map(event => event.faculty))), [allEvents]);
  const questRecommendations = useMemo(() => [...baseEvents].sort((a, b) => (aiInsights[b.id]?.matchScore ?? 0) - (aiInsights[a.id]?.matchScore ?? 0)).slice(0, 3), [aiInsights, baseEvents]);

  const visibleEvents = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-AU', { weekday: 'short' }).format(new Date());
    const byFaculty = (list: EventItem[]) => facultyFilter === 'All faculties' ? list : list.filter(event => event.faculty === facultyFilter);
    if (savedOnly) return allEvents.filter(event => savedEventIds.includes(event.id));
    if (activeNav === 'week') {
      return byFaculty(allEvents);
    }
    switch (filter) {
      case 'Today': return byFaculty(allEvents.filter(event => event.time.startsWith(today)));
      case 'Free': return byFaculty(allEvents.filter(event => event.tags.includes('Free')));
      case 'Beginner-friendly': return byFaculty(allEvents.filter(event => event.tags.includes('Beginner')));
      case 'This week': return byFaculty(allEvents);
      default:
        if (eventFilters.includes(filter) && filter !== 'For you') {
          return byFaculty(allEvents.filter(event => event.tags.includes(filter)));
        }
        if (serendipity === 1) return byFaculty(allEvents.filter(event => event.tags.includes('Beginner')));
        if (serendipity === 3) return byFaculty(allEvents.filter(event => !event.tags.includes('Beginner') || !event.tags.includes('Free')));
        return byFaculty(allEvents);
    }
  }, [activeNav, allEvents, facultyFilter, filter, savedEventIds, savedOnly, serendipity]);

  useEffect(() => {
    const savedProfile = window.localStorage.getItem('sidequest-profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as Partial<Profile>;
        const restored: Profile = { ...emptyProfile, ...parsed, role: parsed.role === 'organizer' ? 'organizer' : 'student' };
        setProfile(restored);
        setProfileDraft(restored);
      } catch { window.localStorage.removeItem('sidequest-profile'); }
    }
    setProfileReady(true);
    const savedPlan = window.localStorage.getItem('sidequest-membership-plan');
    if (savedPlan === 'Free' || savedPlan === 'Explorer' || savedPlan === 'Premium') setMembershipPlan(savedPlan);
    setEventReminders(window.localStorage.getItem('sidequest-event-reminders') !== 'false');
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
      const savedQuestState = JSON.parse(window.localStorage.getItem('sidequest-quest-state') ?? 'null') as { claims?: QuestClaim[] } | null;
      if (Array.isArray(savedQuestState?.claims)) setQuestClaims(savedQuestState.claims);
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

  useEffect(() => {
    // Ask the server to generate a live, personalised "why this one" reason
    // and match score per event. This replaces the old hardcoded per-event
    // text and the flat "92% YOUR VIBE" badge with something that actually
    // reflects the signed-in student's profile. The route degrades to a
    // heuristic score server-side if no AI key is configured, so this never
    // needs its own error UI — worst case, the static fallback reason shows.
    if (!profileReady || allEvents.length === 0) return;
    let cancelled = false;
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: allEvents.map(event => ({
          id: event.id, title: event.title, faculty: event.faculty, tags: event.tags, time: event.time, fallbackReason: event.reason,
        })),
        profile: profile ? { major: profile.major, year: profile.year } : undefined,
      }),
    })
      .then(response => response.ok ? response.json() : null)
      .then((data: { insights?: { id: number; reason: string; matchScore: number }[] } | null) => {
        if (cancelled || !data?.insights) return;
        setAiInsights(Object.fromEntries(data.insights.map(insight => [insight.id, { reason: insight.reason, matchScore: insight.matchScore }])));
      })
      .catch(() => { /* keep whatever insights (or fallbacks) we already have */ });
    return () => { cancelled = true; };
  }, [allEvents, profile, profileReady]);

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
    const clean: Profile = { ...profileDraft, email: profileDraft.email.trim(), name: profileDraft.name.trim(), year: profileDraft.year.trim(), semester: profileDraft.semester.trim(), major: profileDraft.major.trim(), phone: profileDraft.phone.trim(), clubName: profileDraft.clubName.trim(), bio: profileDraft.bio.trim(), interests: profileDraft.interests.slice(0, 6), favouriteActivities: profileDraft.favouriteActivities.slice(0, 6), avatar: profileDraft.avatar || '🌟' };
    if (!usydStudentEmail.test(clean.email)) {
      setProfileError('Use your University of Sydney student email ending in @uni.sydney.edu.au.');
      return;
    }
    setProfileError('');
    window.localStorage.setItem('sidequest-profile', JSON.stringify(clean));
    setProfile(clean);
    setProfileDraft(clean);
    updateSocial(current => ({ ...current, membersByEvent: Object.fromEntries(Object.entries(current.membersByEvent).map(([eventId, members]) => [eventId, members.map(member => isCurrentUser(member) ? { ...member, displayName: clean.name, major: clean.major, semester: clean.semester, bio: clean.bio, interests: clean.interests, favouriteActivities: clean.favouriteActivities, profileAvatar: clean.avatar } : member)])) }));
    setEditingProfile(false);
    setSignupDismissed(true);
  };

  const openProfile = () => {
    setProfileDraft(profile ?? emptyProfile);
    setProfileError('');
    setEditingProfile(true);
    setSignupDismissed(false);
  };

  const uploadAvatar = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setProfileError('Choose a JPG, PNG, WEBP or GIF image.');
    if (file.size > 1024 * 1024) return setProfileError('Avatar photos must be smaller than 1 MB.');
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') { setProfileDraft(current => ({ ...current, avatar: reader.result as string })); setProfileError(''); } };
    reader.onerror = () => setProfileError('That photo could not be read. Please choose another image.');
    reader.readAsDataURL(file);
  };

  const selectMembershipPlan = (plan: MembershipPlan) => {
    setMembershipPlan(plan);
    window.localStorage.setItem('sidequest-membership-plan', plan);
  };

  const toggleEventReminders = () => {
    setEventReminders(current => {
      const next = !current;
      window.localStorage.setItem('sidequest-event-reminders', String(next));
      return next;
    });
  };

  const signOut = () => {
    if (!window.confirm('Sign out and remove this Sidequest account’s locally stored profile, chats and preferences from this device?')) return;
    [
      'sidequest-profile', 'sidequest-membership-plan', 'sidequest-event-reminders',
      'sidequest-saved-events', 'sidequest-custom-events', 'sidequest-friends',
      'sidequest-direct-messages', 'sidequest-read-messages', 'sidequest-social-state',
      'sidequest-language-profile', 'sidequest-language-messages', 'sidequest-quest-state',
      'sidequest-premium-prefs',
    ].forEach(key => window.localStorage.removeItem(key));
    window.location.reload();
  };

  const profileOpen = profileReady && !signupDismissed && (!profile || editingProfile);
  const selectedInsight = aiInsights[selected.id];
  const displayReason = selectedInsight?.reason ?? selected.reason;
  const matchScore = selectedInsight?.matchScore ?? 92;
  const crewMembers = social.membersByEvent[selected.id] ?? [];
  const crewMessages = social.messagesByEvent[selected.id] ?? [];
  const joinedCrew = crewMembers.some(isCurrentUser);
  const directThread = selectedFriend ? directMessages[selectedFriend.userId] ?? [] : [];
  const joinedEvents = useMemo(() => allEvents.filter(event => (social.membersByEvent[event.id] ?? []).some(isCurrentUser)), [allEvents, social.membersByEvent]);
  const anonymousCrewPeople = useMemo(() => {
    const unique = new Map<string, CrewMember>();
    joinedEvents.forEach(event => (social.membersByEvent[event.id] ?? []).filter(member => !isCurrentUser(member)).forEach(member => unique.set(member.userId, member)));
    return Array.from(unique.values());
  }, [joinedEvents, social.membersByEvent]);
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
    updateSocial(current => joinEventCrew(current, selected.id, profile ? { displayName: profile.name, major: profile.major, semester: profile.semester, bio: profile.bio, interests: profile.interests, favouriteActivities: profile.favouriteActivities, profileAvatar: profile.avatar } : undefined));
  };

  const openCrewFromMessages = (eventItem: EventItem) => {
    setSelected(eventItem);
    setSelectedFriend(null);
    setChatOpen(true);
  };

  const leaveCrewSilently = (eventId: number) => {
    updateSocial(current => leaveEventCrew(current, eventId));
    if (selected.id === eventId) setChatOpen(false);
  };

  const selectNav = (next: 'discover' | 'week' | 'hangout' | 'quests' | 'language' | 'messages') => {
    setSavedOnly(false);
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
    if (next === 'messages') {
      setChatOpen(false);
      setSelectedFriend(null);
      return;
    }
    if (next === 'language' || next === 'quests' || next === 'hangout') {
      setChatOpen(false);
      setSelectedFriend(null);
      return;
    }
  };

  const openQuestEvent = (event: QuestEvent) => {
    const fullEvent = allEvents.find(item => item.id === event.id);
    if (fullEvent) setSelected(fullEvent);
    selectNav('discover');
  };

  const showQuestOnMap = async (claim: QuestClaim) => {
    const linkedEvent = claim.sourceEventId ? baseEvents.find(event => event.id === claim.sourceEventId) : undefined;
    if (linkedEvent) {
      setQuestMapEvent(null);
      setSelected(linkedEvent);
      selectNav('discover');
      return;
    }
    try {
      const response = await fetch('/api/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: claim.venue }) });
      const location = await response.json() as { lat?: number; lng?: number; displayName?: string; message?: string };
      if (!response.ok || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) throw new Error(location.message || 'Address could not be located.');
      const date = new Date(`${claim.date}T12:00:00`);
      const day = new Intl.DateTimeFormat('en-AU', { weekday: 'short' }).format(date);
      const [hours, minutes] = claim.time.split(':').map(Number);
      const time = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
      const marker: EventItem = { id: -Math.abs(Date.now()), title: claim.title, host: 'My Quest', time: `${day} · ${time}`, place: 'Quest meeting point', address: location.displayName ?? claim.venue, lat: location.lat!, lng: location.lng!, faculty: 'Quest', emoji: claim.emoji, color: claim.colour, reason: 'This is the real meeting address saved with your claimed quest.', tags: ['My Quest', '24 hours'] };
      setQuestMapEvent(marker);
      setSelected(marker);
      setFilter('For you');
      setFacultyFilter('All faculties');
      selectNav('discover');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Address could not be located.');
    }
  };

  const openSavedEvents = () => {
    setProfileMenuOpen(false);
    setSavedOnly(true);
    setActiveNav('week');
    setView('map');
    setDetailsOpen(true);
    const firstSaved = allEvents.find(event => savedEventIds.includes(event.id));
    if (firstSaved) setSelected(firstSaved);
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
      id, title: eventDraft.title.trim(), host: profile?.role === 'organizer' ? profile.clubName : profile?.name || 'Community host',
      time: `${eventDraft.day} · ${displayTime}`, place: eventDraft.place.trim(), address: eventDraft.address.trim(),
      lat: location.lat, lng: location.lng,
      faculty: 'Community', emoji: eventDraft.emoji || '✨', color: '#4f86f7',
      reason: profile?.role === 'organizer' ? `An official ${profile.clubName} event open to the campus community.` : 'A student-created meetup ready to bring people together.',
      tags: [profile?.role === 'organizer' ? 'Official club' : 'Student meetup', ...eventDraft.tags],
      creatorRole: profile?.role ?? 'student',
      capacity: profile?.role === 'organizer' ? Number(eventDraft.capacity) : undefined,
    };
    setCustomEvents(current => {
      const next = [...current, nextEvent];
      window.localStorage.setItem('sidequest-custom-events', JSON.stringify(next));
      return next;
    });
    updateSocial(current => joinEventCrew(current, nextEvent.id, profile ? {
      displayName: profile.name,
      major: profile.major,
      semester: profile.semester,
      bio: profile.bio,
      interests: profile.interests,
      favouriteActivities: profile.favouriteActivities,
      profileAvatar: profile.avatar,
    } : undefined));
    setSelected(nextEvent);
    setAddEventOpen(false);
    setDetailsOpen(true);
    setActiveNav('week');
    setView('week');
    setChatOpen(true);
    setEventDraft({ title: '', day: 'Mon', time: '12:00', place: '', address: '', emoji: '✨', tags: [], capacity: '30' });
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

  return <main className={`app-shell ${activeNav === 'quests' ? 'quest-active' : ''} ${activeNav === 'hangout' ? 'hangout-active' : ''} ${activeNav === 'language' ? 'language-active' : ''} ${activeNav === 'messages' ? 'messages-active' : ''}`}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark">✦</span><span>sidequest</span></div>
      <nav aria-label="Main navigation"><button className={activeNav === 'discover' ? 'nav-active' : ''} onClick={() => selectNav('discover')}><span className="nav-icon">⌖</span><span>Discover</span></button><button className={activeNav === 'hangout' ? 'nav-active' : ''} onClick={() => selectNav('hangout')}><span className="nav-icon">◉</span><span>Who’s free?</span></button><button className={activeNav === 'week' ? 'nav-active' : ''} onClick={() => selectNav('week')}><span className="nav-icon">▦</span><span>Calendar</span></button><button className={activeNav === 'quests' ? 'nav-active' : ''} onClick={() => selectNav('quests')}><span className="nav-icon">✦</span><span>Quests</span></button><button className={activeNav === 'language' ? 'nav-active' : ''} onClick={() => selectNav('language')}><span className="nav-icon">文</span><span>Languages</span></button><button className={activeNav === 'messages' ? 'nav-active' : ''} onClick={() => selectNav('messages')}><span className="nav-icon">✉</span><span>Messages</span>{unreadCount > 0 && <span className="notification">{unreadCount}</span>}</button></nav>
      <div className="profile-area">
        <button className="profile" onClick={() => profile ? setProfileMenuOpen(current => !current) : openProfile()} aria-label={profile ? 'Open account menu' : 'Sign up'} aria-expanded={profile ? profileMenuOpen : undefined}><span>{profile?.name?.split(' ')[0] ?? 'Sign up'}</span><span className="avatar"><AvatarVisual value={profile?.avatar ?? '+'} /></span></button>
        {profileMenuOpen && profile && <div className="profile-menu" role="menu">
          <div className="profile-menu-header"><span className="avatar"><AvatarVisual value={profile.avatar} /></span><div><b>{profile.name}</b><small>{profile.email}</small><em>{membershipPlan} · {profile.role === 'organizer' ? profile.clubName || 'Club organizer' : 'Student'}</em></div></div>
          <button role="menuitem" onClick={() => { setProfileMenuOpen(false); openProfile(); }}><span>👤</span><div><b>Account details</b><small>View or edit your profile</small></div></button>
          <button role="menuitem" onClick={() => { setProfileMenuOpen(false); setViewedMember({ userId: 'current-user', anonymousAlias: profile.name, anonymousAvatar: profile.avatar, profileAvatar: profile.avatar, displayName: profile.name, major: profile.major, semester: profile.semester, bio: profile.bio, interests: profile.interests, favouriteActivities: profile.favouriteActivities }); }}><span>✨</span><div><b>My social profile</b><small>See what other students can view</small></div></button>
          <button role="menuitem" onClick={() => { setProfileMenuOpen(false); selectNav('messages'); }}><span>✉️</span><div><b>Inbox</b><small>{unreadCount ? `${unreadCount} unread messages` : 'Your chats and crews'}</small></div></button>
          <button role="menuitem" onClick={openSavedEvents}><span>🔖</span><div><b>Saved events</b><small>{savedEventIds.length ? `${savedEventIds.length} saved ${savedEventIds.length === 1 ? 'event' : 'events'}` : 'Your bookmarks will appear here'}</small></div></button>
          <button role="menuitem" onClick={() => { setProfileMenuOpen(false); setSettingsOpen(true); }}><span>⚙️</span><div><b>Settings</b><small>Manage local preferences</small></div></button>
          <button className="premium-menu-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPremiumOpen(true); }}><span>✦</span><div><b>Premium plans</b><small>Compare and select a plan</small></div></button>
          <button className="sign-out-menu-item" role="menuitem" onClick={signOut}><span>↪</span><div><b>Sign out</b><small>Remove local account data from this device</small></div></button>
        </div>}
      </div>
    </header>

    {activeNav === 'quests' && <QuestSystem recommendedEvents={questRecommendations} initialEvent={questEventSeed} onInitialEventUsed={() => setQuestEventSeed(null)} onOpenEvent={openQuestEvent} onShowMap={showQuestOnMap} onClaimsChange={setQuestClaims} />}
    {activeNav === 'hangout' && <HangoutHub />}
    {activeNav === 'language' && <LanguageExchange hasAccount={Boolean(profile)} onCreateAccount={openProfile} />}
    {activeNav === 'messages' && <section className="messages-hub">
      <header><div><p className="eyebrow">YOUR COMMUNITIES</p><h1>Messages,<br/><em>without the awkward exit.</em></h1><p>Open any joined event crew, chat privately with its anonymous members, or leave quietly at any time.</p></div><span>{joinedEvents.length} groups · {anonymousCrewPeople.length} people</span></header>
      <div className="messages-hub-grid"><section className="group-inbox"><div className="inbox-heading"><div><h2>Group chats</h2><p>Events and clubs you have joined</p></div><span>{joinedEvents.length}</span></div>{joinedEvents.length === 0 ? <div className="inbox-empty"><span>💬</span><h3>No groups yet</h3><p>Join an event crew and its group chat will appear here automatically.</p><button onClick={() => selectNav('discover')}>Discover events →</button></div> : joinedEvents.map(eventItem => { const members = social.membersByEvent[eventItem.id] ?? []; const messages = social.messagesByEvent[eventItem.id] ?? []; const lastMessage = messages.at(-1); return <article className="group-inbox-row" key={eventItem.id}><button className="group-open" onClick={() => openCrewFromMessages(eventItem)}><span style={{background:eventItem.color}}>{eventItem.emoji}</span><div><b>{eventItem.title}</b><small>{members.length} members · {eventItem.time}</small><p>{lastMessage?.content ?? 'Your crew chat is ready.'}</p></div></button><button className="silent-leave" onClick={() => leaveCrewSilently(eventItem.id)} aria-label={`Leave ${eventItem.title} silently`}>Leave quietly</button></article>})}</section><section className="people-inbox"><div className="inbox-heading"><div><h2>People in your crews</h2><p>Direct messages stay anonymous</p></div><span>{anonymousCrewPeople.length}</span></div>{anonymousCrewPeople.length === 0 ? <div className="inbox-empty"><span>🎭</span><p>Anonymous crew members appear after you join an event.</p></div> : anonymousCrewPeople.map(member => { const thread = directMessages[member.userId] ?? []; return <button className="person-inbox-row" key={member.userId} onClick={() => openFriendChat(member)}><span>{member.anonymousAvatar}</span><div><b>{member.anonymousAlias}</b><small>{thread.at(-1)?.content ?? 'Start an anonymous conversation'}</small></div><i>{thread.length ? 'Message' : 'Say hi'}</i></button>})}<div className="silent-note">🫥 Leaving a group is private. No departure message is added to the chat.</div></section></div>
    </section>}

    <section className={`hero-row ${activeNav === 'week' ? 'week-hero' : ''}`}><div><p className="eyebrow">{savedOnly ? 'YOUR BOOKMARKED EVENTS' : activeNav === 'week' ? 'YOUR WEEK · HOUR BY HOUR' : 'YOUR CAMPUS, UNFILTERED'}</p><h1>{savedOnly ? <>Saved for<br/><em>later.</em></> : activeNav === 'week' ? <>Plan the moments<br/><em>that matter.</em></> : <>Find your next<br/><em>side quest.</em></>}</h1></div><div className="hero-copy"><p>{savedOnly ? 'Every event you bookmarked, together in one easy place.' : activeNav === 'week' ? 'Every campus event, placed at its exact start time.' : 'Events picked to pull you out of your usual orbit—just enough.'}</p>{!savedOnly && <div className="serendipity"><span>Serendipity level</span><strong>{serendipityLabels[serendipity - 1]} ✨</strong><input aria-label="Serendipity level" type="range" min="1" max="3" value={serendipity} onChange={event => { setSerendipity(Number(event.target.value)); setFilter('For you'); setActiveNav('discover'); }} /></div>}</div></section>

    <section className="controls"><div className="filter-area">{activeNav === 'discover' && <div className="filters" aria-label="Event filters">{eventFilters.map(item => <button key={item} aria-pressed={filter === item} onClick={() => { setFilter(item); setDetailsOpen(true); }} className={filter === item ? 'active' : ''}>{item}{item === 'For you' && ' ✦'}</button>)}</div>}{activeNav === 'discover' && faculties.length > 1 && <div className="filters faculty-filters" aria-label="Filter by faculty">{['All faculties', ...faculties].map(item => <button key={item} aria-pressed={facultyFilter === item} onClick={() => { setFacultyFilter(item); setDetailsOpen(true); }} className={facultyFilter === item ? 'active' : ''}>{item}</button>)}</div>}<p className="filter-summary" aria-live="polite"><b>{visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'}</b> · {savedOnly ? 'Bookmarked events saved on this device.' : activeNav === 'week' ? 'All events scheduled for this week.' : filterDescriptions[filter]}</p></div><div className="control-actions">{savedOnly && <button className="add-event-button saved-back" onClick={() => selectNav('discover')}>← Discover more</button>}{!savedOnly && profile && <button className="add-event-button" onClick={() => setAddEventOpen(true)}>+ {profile.role === 'organizer' ? 'Add club event' : 'Add meetup'}</button>}<div className="view-toggle"><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>⌖ Map</button><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>▦ Week</button></div></div></section>

    <section className={`workspace ${!detailsOpen || visibleEvents.length === 0 ? 'no-details' : ''}`}>
      <div className={`map google-map ${view === 'week' ? 'calendar-mode' : ''}`}>
        {view === 'map' ? <CampusMap events={visibleEvents} selectedId={selected.id} onSelect={id => { const event = allEvents.find(item => item.id === id); if (event) setSelected(event); setDetailsOpen(true); }} /> : <div className="week-calendar" aria-label="Weekly event calendar">
          <div className="calendar-header"><span className="timezone">AEST</span>{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="calendar-body">
            {calendarHours.map(hour => <div className="time-row" key={hour} style={{top:`${(hour / 24) * 100}%`}}><span>{hour === 0 || hour === 24 ? '12:00 AM' : `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`}</span><i /></div>)}
            <div className="day-columns">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <i key={day} />)}</div>
            <div className="calendar-events">{visibleEvents.map(event => { const day = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(event.time.slice(0,3)); const top = Math.max(0, Math.min(96, (eventMinutes(event.time) / (24 * 60)) * 100)); return <button key={event.id} className={`calendar-event ${selected.id === event.id ? 'selected' : ''}`} style={{left:`calc(${(day / 7) * 100}% + 4px)`,width:'calc(14.285% - 8px)',top:`${top}%`,borderColor:event.color}} onClick={() => { setSelected(event); setDetailsOpen(true); }}><span>{event.emoji}</span><b>{event.title}</b><small>{event.time.split('·')[1].trim()}</small></button>; })}{questClaims.filter(claim => claim.status === 'Confirmed').map(claim => { const date = new Date(`${claim.date}T12:00:00`); const day = (date.getDay() + 6) % 7; const [hour, minute] = claim.time.split(':').map(Number); const top = Math.max(0, Math.min(96, ((hour * 60 + minute) / (24 * 60)) * 100)); return <button key={claim.id} className="calendar-event calendar-quest" style={{left:`calc(${(day / 7) * 100}% + 4px)`,width:'calc(14.285% - 8px)',top:`${top}%`,borderColor:claim.colour}} onClick={() => selectNav('quests')}><span>{claim.emoji}</span><b>{claim.title}</b><small>{claim.time} · Quest</small></button>; })}</div>
          </div>
        </div>}
        {view === 'map' && visibleEvents.length > 0 && <a className="google-badge" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`} target="_blank" rel="noreferrer">Open address in Google Maps ↗</a>}
        {view === 'map' && <div className="map-key"><span>✦</span> {visibleEvents.length} {filter.toLowerCase()} {visibleEvents.length === 1 ? 'pick' : 'picks'}</div>}
        {visibleEvents.length === 0 && <div className="empty-state"><span>☆</span><h2>Your week is wide open.</h2><p>Save an event or join a crew, then it will appear here.</p><button onClick={() => selectNav('quests')}>Discover events</button></div>}
        {!detailsOpen && visibleEvents.length > 0 && <button className="show-details" onClick={() => setDetailsOpen(true)}>Show event details →</button>}
      </div>

      {detailsOpen && visibleEvents.length > 0 && <aside className="event-panel"><div className="panel-top"><span className="match">{matchScore}% YOUR VIBE</span><button className="close" aria-label="Close event details" onClick={() => setDetailsOpen(false)}>×</button></div><div className="event-art" style={{background: selected.color}}><span>{selected.emoji}</span><div className="art-sticker">TRY<br/>SOMETHING<br/><em>NEW</em></div></div><div className="event-content"><p className="host">{selected.host}</p>{selected.creatorRole && <div className={`publisher-badge ${selected.creatorRole}`}>{selected.creatorRole === 'organizer' ? '✓ Official USYD club event' : 'Student-led meetup'}{selected.capacity && <span> · {selected.capacity} places</span>}</div>}<h2>{selected.title}</h2><div className="meta"><span>◷ {selected.time}</span><span>⌖ {selected.place}</span></div><address className="event-address">{selected.address}</address><div className="tags">{selected.tags.map(tag => <span key={tag}>{tag}</span>)}</div><blockquote><b>✦ Why this one?</b>{displayReason}</blockquote><div className="going"><div className="faces">{crewMembers.slice(0, 3).map(member => <i key={member.userId}>{member.anonymousAvatar}</i>)}</div><span><b>{crewMembers.length} crew members</b><br/>Identity stays private until individually revealed</span></div><div className="crew-preview" aria-label="Event crew members">{crewMembers.map(member => <span key={member.userId}>{member.anonymousAvatar} {member.anonymousAlias}{isCurrentUser(member) ? ' (you)' : <button onClick={() => openFriendChat(member)}>{friends.includes(member.userId) ? 'Message' : 'Chat'}</button>}</span>)}</div><div className="actions"><button className="primary" onClick={toggleCrew}>{joinedCrew ? 'Leave this crew' : 'Count me in →'}</button><button className={`save ${savedEventIds.includes(selected.id) ? 'saved' : ''}`} aria-label={savedEventIds.includes(selected.id) ? 'Remove event from My week' : 'Save event to My week'} aria-pressed={savedEventIds.includes(selected.id)} onClick={toggleSaved}>{savedEventIds.includes(selected.id) ? '♥' : '♡'}</button></div>{savedEventIds.includes(selected.id) && <p className="saved-note">Saved to My week</p>}{joinedCrew && <button className="open-crew-chat" onClick={() => setChatOpen(true)}>Open crew chat →</button>}{customEvents.some(event => event.id === selected.id) && <button className="delete-event" onClick={deleteEvent}>Delete event</button>}</div></aside>}
    </section>
    {activeNav === 'discover' && detailsOpen && crewMembers.length > 0 && <section className="member-profile-strip" aria-label="View crew profiles"><span>Meet the crew</span>{crewMembers.map(member => <button key={member.userId} onClick={() => setViewedMember(isCurrentUser(member) && profile ? { ...member, displayName: profile.name, major: profile.major, semester: profile.semester, bio: profile.bio, interests: profile.interests, favouriteActivities: profile.favouriteActivities, profileAvatar: profile.avatar } : member)}><i><AvatarVisual value={isCurrentUser(member) && profile ? profile.avatar : member.profileAvatar ?? member.anonymousAvatar} /></i><b>{isCurrentUser(member) ? 'You' : member.anonymousAlias}</b><small>View interests</small></button>)}</section>}
    {activeNav === 'discover' && visibleEvents.length > 0 && <button className="discover-quest-cta" onClick={() => { setQuestEventSeed(selected); selectNav('quests'); }}><span>{selected.emoji}</span><span><small>TURN THIS EVENT INTO A 24-HOUR QUEST</small><b>Go with a friend · earn 120 XP</b></span><i>Start quest →</i></button>}

    {chatOpen && joinedCrew && <section className="chat-card" aria-label="Event group chat"><header><div><b>{selected.title} crew</b><small><i/> {crewMembers.length} members · anonymous by default</small></div><button onClick={() => setChatOpen(false)} aria-label="Close messages">×</button></header><div className="chat-context"><span>{selected.emoji}</span><p><b>{selected.title}</b><br/>{selected.time}</p><button onClick={() => setChatOpen(false)}>View</button></div><div className="messages">{crewMessages.map(message => { const member = crewMembers.find(item => item.userId === message.userId); const mine = message.userId === 'current-user'; return <div className={mine ? 'outgoing' : 'incoming'} key={message.id}>{!mine && <span title={member?.anonymousAlias}>{member?.anonymousAvatar ?? '🎭'}</span>}<p>{message.content}<small>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></p></div>; })}{crewMessages.length === 0 && <p className="empty-chat">Start the conversation with a quick emoji.</p>}</div><div className="quick-emojis" aria-label="Quick emoji replies">{['👋','🙋','✨','☕','👍','🎉'].map(emoji => <button key={emoji} onClick={() => send(emoji)}>{emoji}</button>)}</div><div className="composer"><input autoFocus value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && send()} placeholder="Type a message…"/><button className="send" onClick={() => send()} aria-label="Send message">↑</button></div></section>}
    {selectedFriend && <section className="chat-card direct-chat" aria-label={`Chat with ${selectedFriend.anonymousAlias}`}><header><div><b>{selectedFriend.anonymousAvatar} {selectedFriend.anonymousAlias}</b><small><i/> Friend · direct message</small></div><button onClick={() => setSelectedFriend(null)} aria-label="Close direct messages">×</button></header><div className="messages">{directThread.map(message => { const mine = message.userId === 'current-user'; return <div className={mine ? 'outgoing' : 'incoming'} key={message.id}>{!mine && <span>{selectedFriend.anonymousAvatar}</span>}<p>{message.content}<small>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></p></div>; })}{directThread.length === 0 && <p className="empty-chat">You are friends now. Say hello!</p>}</div><div className="composer"><input autoFocus value={directDraft} onChange={event => setDirectDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && sendDirectMessage()} placeholder="Message your friend…"/><button className="send" onClick={sendDirectMessage} aria-label="Send direct message">↑</button></div></section>}
    <button className={`chat-launch ${joinedCrew ? '' : 'locked'}`} onClick={() => joinedCrew && setChatOpen(current => !current)} aria-label={joinedCrew ? 'Open event crew messages' : 'Join this event crew to open messages'}>{joinedCrew ? '💬' : '🔒'}{unreadCount > 0 && <span>{unreadCount}</span>}</button>

    {addEventOpen && <div className="signup-backdrop"><section className="add-event-card" role="dialog" aria-modal="true" aria-labelledby="add-event-title"><button className="signup-close" onClick={() => setAddEventOpen(false)} aria-label="Close add event form">×</button><p className="eyebrow">{profile?.role === 'organizer' ? 'OFFICIAL CLUB EVENT' : 'STUDENT-LED MEETUP'}</p><h2 id="add-event-title">{profile?.role === 'organizer' ? `Publish for ${profile.clubName}` : 'Start a casual meetup'}</h2><p>{profile?.role === 'organizer' ? 'Your club name and official organizer badge will be shown.' : 'Create a low-pressure activity for other verified students.'}</p><form onSubmit={createEvent}><label>Event title<input required value={eventDraft.title} onChange={event => setEventDraft({...eventDraft,title:event.target.value})} placeholder="Morning coffee walk" /></label><div className="field-pair"><label>Day<select value={eventDraft.day} onChange={event => setEventDraft({...eventDraft,day:event.target.value})}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <option key={day}>{day}</option>)}</select></label><label>Start time<input required type="time" value={eventDraft.time} onChange={event => setEventDraft({...eventDraft,time:event.target.value})} /></label></div><div className="field-pair"><label>Venue<input required value={eventDraft.place} onChange={event => setEventDraft({...eventDraft,place:event.target.value})} placeholder="Main Quad" /></label><label>Emoji<input required maxLength={4} value={eventDraft.emoji} onChange={event => setEventDraft({...eventDraft,emoji:event.target.value})} /></label></div>{profile?.role === 'organizer' && <label>Event capacity<input required type="number" min="2" max="1000" value={eventDraft.capacity} onChange={event => setEventDraft({...eventDraft,capacity:event.target.value})} /></label>}<fieldset className="tag-picker"><legend>Event tags <span>Choose one or more</span></legend><div>{['Free','Beginner','Social','Creative','Food','Sport','Tech','Outdoors'].map(tag => { const active = eventDraft.tags.includes(tag); return <button key={tag} type="button" className={active ? 'selected' : ''} aria-pressed={active} onClick={() => { setEventDraft({...eventDraft,tags: active ? eventDraft.tags.filter(item => item !== tag) : [...eventDraft.tags, tag]}); setGeocodeError(''); }}>{active ? '✓ ' : '+ '}{tag}</button>; })}</div></fieldset><label>Full address<input required value={eventDraft.address} onChange={event => { setEventDraft({...eventDraft,address:event.target.value}); setGeocodeError(''); }} placeholder="39 Belmore Street, Burwood NSW 2134" /></label><small className={`geocode-status ${geocodeError ? 'error' : ''}`} aria-live="polite">{geocodeError || 'The pin will be placed at the verified address.'}</small><button className="signup-submit" type="submit" disabled={geocoding}>{geocoding ? 'Locating address…' : profile?.role === 'organizer' ? 'Publish official event →' : 'Publish meetup →'}</button></form></section></div>}

    {settingsOpen && <div className="signup-backdrop"><section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button className="signup-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button><p className="eyebrow">ACCOUNT</p><h2 id="settings-title">Settings</h2><p>Your preferences are stored only on this device.</p><label className="setting-row"><span><b>Event reminders</b><small>Show local reminders for events in your calendar</small></span><input type="checkbox" checked={eventReminders} onChange={toggleEventReminders} /></label><div className="local-data-note">🔒 Profile, plan and message preferences use browser local storage.</div></section></div>}

    {premiumOpen && <div className="signup-backdrop"><section className="premium-dialog" role="dialog" aria-modal="true" aria-labelledby="premium-title"><button className="signup-close" onClick={() => setPremiumOpen(false)} aria-label="Close premium plans">×</button><p className="eyebrow">SIDEQUEST MEMBERSHIP</p><h2 id="premium-title">Choose your campus adventure.</h2><p>Select a demo plan. No payment is taken.</p><div className="plan-grid">{([
      { name: 'Free' as MembershipPlan, price: '$0', description: 'Discover events, join crews and chat.' },
      { name: 'Explorer' as MembershipPlan, price: '$4.99', description: 'Extra quests, filters and monthly rewards.' },
      { name: 'Premium' as MembershipPlan, price: '$9.99', description: 'All perks, priority drops and exclusive quests.' },
    ]).map(plan => <button key={plan.name} className={membershipPlan === plan.name ? 'selected' : ''} onClick={() => selectMembershipPlan(plan.name)} aria-pressed={membershipPlan === plan.name}><span>{membershipPlan === plan.name ? '✓ Selected' : 'Select plan'}</span><b>{plan.name}</b><strong>{plan.price}<small>/month</small></strong><p>{plan.description}</p></button>)}</div><button className="signup-submit" onClick={() => setPremiumOpen(false)}>Done</button></section></div>}

    {profileOpen && <div className="signup-backdrop" role="presentation">
      <section className="signup-card" role="dialog" aria-modal="true" aria-labelledby="signup-title">
        <button className="signup-close" type="button" onClick={() => { setEditingProfile(false); setSignupDismissed(true); }} aria-label="Close signup and view events">×</button>
        <div className="signup-intro"><span className="brand-mark">✦</span><p className="eyebrow">YOUR SIDEQUEST PROFILE</p><h2 id="signup-title">{profile ? 'Update your details' : 'Choose how you’ll join.'}</h2><p>Students discover communities. Club organizers can also publish official club events.</p><div className="privacy-note">🔒 Stored on this device for the hackathon demo.</div></div>
        <form onSubmit={saveProfile}>
          <label>Account type<select required value={profileDraft.role} onChange={event => setProfileDraft({...profileDraft, role:event.target.value as Profile['role'], clubName:event.target.value === 'student' ? '' : profileDraft.clubName})}><option value="student">USYD student</option><option value="organizer">USYD club organizer</option></select></label>
          {profileDraft.role === 'organizer' && <label>Club or society name<input required value={profileDraft.clubName} onChange={event => setProfileDraft({...profileDraft, clubName:event.target.value})} placeholder="Sydney University Language Society" /></label>}
          <label>Full name<input required autoComplete="name" value={profileDraft.name} onChange={event => setProfileDraft({...profileDraft, name:event.target.value})} placeholder="Alex Morgan" /></label>
          <fieldset className="avatar-picker"><legend>Profile avatar</legend><div className="avatar-preview"><AvatarVisual value={profileDraft.avatar} /></div><div className="avatar-options">{avatarOptions.map(avatar => <button type="button" key={avatar} className={profileDraft.avatar === avatar ? 'selected' : ''} onClick={() => setProfileDraft({...profileDraft, avatar})}>{avatar}</button>)}</div><label className="avatar-upload">Upload my own photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => uploadAvatar(event.target.files?.[0])} /></label><small>JPG, PNG, WEBP or GIF · maximum 1 MB · stored only on this device</small></fieldset>
          <label>Email address<input required type="email" autoComplete="email" value={profileDraft.email} onChange={event => { setProfileDraft({...profileDraft, email:event.target.value}); setProfileError(''); }} placeholder="student@uni.sydney.edu.au" aria-invalid={Boolean(profileError)} aria-describedby="profile-email-help" /></label>
          <small id="profile-email-help" className={profileError ? 'profile-email-error' : 'profile-email-help'} role={profileError ? 'alert' : undefined}>{profileError || 'Only @uni.sydney.edu.au student email addresses can create a profile.'}</small>
          <div className="field-pair"><label>Study year<select required value={profileDraft.year} onChange={event => setProfileDraft({...profileDraft, year:event.target.value})}><option value="">Select year</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Postgraduate</option></select></label><label>Semester<select required value={profileDraft.semester} onChange={event => setProfileDraft({...profileDraft, semester:event.target.value})}><option value="">Select semester</option><option>Semester 1</option><option>Semester 2</option><option>Summer term</option></select></label></div>
          <label>Major<input required value={profileDraft.major} onChange={event => setProfileDraft({...profileDraft, major:event.target.value})} placeholder="Computer Science" /></label>
          <label>Phone number<input required type="tel" autoComplete="tel" minLength={8} value={profileDraft.phone} onChange={event => setProfileDraft({...profileDraft, phone:event.target.value})} placeholder="04XX XXX XXX" /></label>
          <label>About me<textarea required maxLength={240} value={profileDraft.bio} onChange={event => setProfileDraft({...profileDraft, bio:event.target.value})} placeholder="I’m always up for a coffee, a creative workshop or meeting people outside my course." /><small>{profileDraft.bio.length}/240</small></label>
          <fieldset className="social-tag-picker"><legend>My interests <span>Choose up to 6</span></legend><div>{interestOptions.map(item => { const active = profileDraft.interests.includes(item); return <button type="button" key={item} className={active ? 'selected' : ''} onClick={() => setProfileDraft({...profileDraft, interests: active ? profileDraft.interests.filter(value => value !== item) : profileDraft.interests.length < 6 ? [...profileDraft.interests, item] : profileDraft.interests})}>{active ? '✓ ' : '+ '}{item}</button>; })}</div></fieldset>
          <fieldset className="social-tag-picker"><legend>Things I enjoy doing <span>Choose up to 6</span></legend><div>{activityOptions.map(item => { const active = profileDraft.favouriteActivities.includes(item); return <button type="button" key={item} className={active ? 'selected' : ''} onClick={() => setProfileDraft({...profileDraft, favouriteActivities: active ? profileDraft.favouriteActivities.filter(value => value !== item) : profileDraft.favouriteActivities.length < 6 ? [...profileDraft.favouriteActivities, item] : profileDraft.favouriteActivities})}>{active ? '✓ ' : '+ '}{item}</button>; })}</div></fieldset>
          <button className="signup-submit" type="submit">{profile ? 'Save my profile' : 'Create my profile'} →</button>
          {profile && <button className="signup-cancel" type="button" onClick={() => setEditingProfile(false)}>Cancel</button>}
        </form>
      </section>
    </div>}
    {viewedMember && <div className="signup-backdrop"><section className="social-profile-card" role="dialog" aria-modal="true" aria-labelledby="social-profile-name"><button className="signup-close" onClick={() => setViewedMember(null)} aria-label="Close social profile">×</button><div className="social-profile-hero"><span><AvatarVisual value={viewedMember.profileAvatar ?? viewedMember.anonymousAvatar} /></span><p className="eyebrow">SOCIAL PROFILE</p><h2 id="social-profile-name">{viewedMember.displayName ?? viewedMember.anonymousAlias}</h2><p>{viewedMember.major ?? 'USYD student'}{viewedMember.semester ? ` · ${viewedMember.semester}` : ''}</p></div><div className="social-profile-content"><h3>About me</h3><p>{viewedMember.bio || 'This student has not added an introduction yet.'}</p><h3>Interests</h3><div className="profile-chips">{viewedMember.interests?.length ? viewedMember.interests.map(item => <span key={item}>{item}</span>) : <small>No interests shared yet.</small>}</div><h3>Things I enjoy doing</h3><div className="profile-chips activities">{viewedMember.favouriteActivities?.length ? viewedMember.favouriteActivities.map(item => <span key={item}>{item}</span>) : <small>No favourite activities shared yet.</small>}</div>{!isCurrentUser(viewedMember) && <button className="signup-submit" onClick={() => { setViewedMember(null); openFriendChat(viewedMember); }}>{friends.includes(viewedMember.userId) ? 'Message' : 'Say hello'} →</button>}{isCurrentUser(viewedMember) && <button className="signup-submit" onClick={() => { setViewedMember(null); openProfile(); }}>Edit my profile →</button>}<small className="profile-privacy">Only details you choose to share appear here. Email and phone number stay private.</small></div></section></div>}
  </main>;
}

function AvatarVisual({ value }: { value: string }) {
  return value.startsWith('data:image/') ? <img src={value} alt="Profile avatar" /> : <>{value}</>;
}
