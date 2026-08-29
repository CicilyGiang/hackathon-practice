import type { ChatMessage, CrewMember, MemberProfile, SocialState } from '../types/social';

const storageKey = 'sidequest-social-state';
const currentUserId = 'current-user';

const aliases = [
  ['Curious Comet', '☄️'],
  ['Brave Bilby', '🐾'],
  ['Sunny Quokka', '🌞'],
  ['Cosmic Koala', '🐨'],
] as const;

const seededMembers: CrewMember[] = [
  { userId: 'demo-1', anonymousAlias: 'Quiet Quokka', anonymousAvatar: '🦘', identityRevealed: false },
  { userId: 'demo-2', anonymousAlias: 'Wandering Wombat', anonymousAvatar: '🌿', identityRevealed: false },
  { userId: 'demo-3', anonymousAlias: 'Bright Bilby', anonymousAvatar: '✨', identityRevealed: false },
];

export function createInitialSocialState(): SocialState {
  return {
    membersByEvent: Object.fromEntries([1, 2, 3, 4, 5].map(eventId => [eventId, seededMembers.map(member => ({ ...member, userId: `${member.userId}-${eventId}` }))])),
    messagesByEvent: {
      1: [
        { id: 'seed-1', userId: 'demo-1-1', content: 'First time coming solo - meet at the front?', messageType: 'text', createdAt: '2026-08-29T16:42:00+10:00' },
        { id: 'seed-2', userId: 'demo-2-1', content: '🙋☕➡️🏺', messageType: 'emoji', createdAt: '2026-08-29T16:43:00+10:00' },
      ],
    },
  };
}

export function loadSocialState(): SocialState {
  const initial = createInitialSocialState();
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return initial;
  try {
    const parsed = JSON.parse(stored) as SocialState;
    return {
      membersByEvent: { ...initial.membersByEvent, ...parsed.membersByEvent },
      messagesByEvent: { ...initial.messagesByEvent, ...parsed.messagesByEvent },
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return initial;
  }
}

export function saveSocialState(state: SocialState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function isCurrentUser(member: CrewMember) {
  return member.userId === currentUserId;
}

export function joinEventCrew(state: SocialState, eventId: number, profile?: MemberProfile): SocialState {
  const members = state.membersByEvent[eventId] ?? [];
  if (members.some(isCurrentUser)) return state;
  const [anonymousAlias, anonymousAvatar] = aliases[eventId % aliases.length];
  return {
    ...state,
    membersByEvent: {
      ...state.membersByEvent,
      [eventId]: [...members, { userId: currentUserId, anonymousAlias, anonymousAvatar, identityRevealed: false, profile }],
    },
  };
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
  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId: currentUserId,
    content,
    messageType: /^\p{Extended_Pictographic}+$/u.test(content.trim()) ? 'emoji' : 'text',
    createdAt: new Date().toISOString(),
  };
  return {
    ...state,
    messagesByEvent: {
      ...state.messagesByEvent,
      [eventId]: [...(state.messagesByEvent[eventId] ?? []), message],
    },
  };
}
