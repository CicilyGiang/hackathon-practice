import type { CrewMember, SocialState } from '../types/social';

const STORAGE_KEY = 'sidequest-social-state';
const aliases = ['Curious Koala', 'Sunny Lorikeet', 'Cosmic Wombat', 'Mint Possum'];
const avatars = ['🐨', '🦜', '🦔', '🐙'];

export function createInitialSocialState(): SocialState {
  const members: CrewMember[] = [
    { userId: 'demo-1', anonymousAlias: 'Curious Koala', anonymousAvatar: '🐨' },
    { userId: 'demo-2', anonymousAlias: 'Sunny Lorikeet', anonymousAvatar: '🦜' },
    { userId: 'demo-3', anonymousAlias: 'Cosmic Wombat', anonymousAvatar: '🦔' },
  ];
  return {
    membersByEvent: { 1: members, 2: members.slice(0, 2), 3: members, 4: members.slice(0, 1), 5: members.slice(0, 2) },
    messagesByEvent: {
      1: [{ id: 'welcome-1', userId: 'demo-1', content: 'Anyone else completely new to pottery? 👋', createdAt: new Date().toISOString() }],
    },
  };
}

export function loadSocialState(): SocialState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as SocialState : createInitialSocialState();
  } catch {
    return createInitialSocialState();
  }
}

export function saveSocialState(state: SocialState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isCurrentUser(member: CrewMember) {
  return member.userId === 'current-user';
}

export function joinEventCrew(
  state: SocialState,
  eventId: number,
  profile?: { displayName: string; major: string; semester: string },
): SocialState {
  const current = state.membersByEvent[eventId] ?? [];
  if (current.some(isCurrentUser)) return state;
  const slot = current.length % aliases.length;
  const member: CrewMember = {
    userId: 'current-user',
    anonymousAlias: aliases[slot],
    anonymousAvatar: avatars[slot],
    ...profile,
  };
  return { ...state, membersByEvent: { ...state.membersByEvent, [eventId]: [...current, member] } };
}

export function leaveEventCrew(state: SocialState, eventId: number): SocialState {
  return {
    ...state,
    membersByEvent: {
      ...state.membersByEvent,
      [eventId]: (state.membersByEvent[eventId] ?? []).filter(member => !isCurrentUser(member)),
    },
  };
}

export function addEventMessage(state: SocialState, eventId: number, content: string): SocialState {
  const messages = state.messagesByEvent[eventId] ?? [];
  return {
    ...state,
    messagesByEvent: {
      ...state.messagesByEvent,
      [eventId]: [...messages, { id: crypto.randomUUID(), userId: 'current-user', content, createdAt: new Date().toISOString() }],
    },
  };
}

export function addIncomingEventMessage(state: SocialState, eventId: number, userId: string, content: string): SocialState {
  const messages = state.messagesByEvent[eventId] ?? [];
  return {
    ...state,
    messagesByEvent: {
      ...state.messagesByEvent,
      [eventId]: [...messages, { id: crypto.randomUUID(), userId, content, createdAt: new Date().toISOString() }],
    },
  };
}
