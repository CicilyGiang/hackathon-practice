export type CrewMember = {
  userId: string;
  anonymousAlias: string;
  anonymousAvatar: string;
  displayName?: string;
  major?: string;
  semester?: string;
};

export type CrewMessage = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
};

export type SocialState = {
  membersByEvent: Record<number, CrewMember[]>;
  messagesByEvent: Record<number, CrewMessage[]>;
};
