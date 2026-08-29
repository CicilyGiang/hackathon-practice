export type ScheduleKind = 'Class' | 'Lecture' | 'Tutorial';

export type ClassScheduleItem = {
  id: string;
  title: string;
  kind: ScheduleKind;
  day: number;
  startTime: string;
  endTime: string;
};

export type VerifiedGap = {
  previous: ClassScheduleItem;
  next: ClassScheduleItem;
  availableMinutes: number;
  suggestedActivity: string;
};
