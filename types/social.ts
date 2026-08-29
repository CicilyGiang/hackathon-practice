export type MemberProfile = {
  displayName: string;
  major?: string;
  semester?: string;
};

export type CrewMember = {
  userId: string;
  anonymousAlias: string;
  anonymousAvatar: string;
  identityRevealed: boolean;
  profile?: MemberProfile;
};

export type ChatMessage = {
  id: string;
  userId: string;
  content: string;
  messageType: 'emoji' | 'text';
  createdAt: string;
};

export type SocialState = {
  membersByEvent: Record<number, CrewMember[]>;
  messagesByEvent: Record<number, ChatMessage[]>;
};
