import type { ClassScheduleItem, VerifiedGap } from '../types/schedule';

const STORAGE_KEY = 'sidequest-class-schedule';

export function loadClassSchedule(): ClassScheduleItem[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveClassSchedule(schedule: ClassScheduleItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

function minutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function findVerifiedGap(schedule: ClassScheduleItem[], now = new Date()): VerifiedGap | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = schedule
    .filter(item => item.day === now.getDay())
    .sort((a, b) => minutes(a.startTime) - minutes(b.startTime));

  const inClass = today.some(item => minutes(item.startTime) <= nowMinutes && nowMinutes < minutes(item.endTime));
  if (inClass) return null;

  // Time is only a verified gap when it sits between two timetable records.
  // We do not assume that an empty calendar means the student is available.
  const previous = [...today].reverse().find(item => minutes(item.endTime) <= nowMinutes);
  const next = today.find(item => minutes(item.startTime) > nowMinutes);
  if (!previous || !next) return null;

  const availableMinutes = minutes(next.startTime) - nowMinutes;
  if (availableMinutes < 25) return null;
  const suggestedActivity = now.getHours() >= 12 && now.getHours() < 14
    ? 'Lunch'
    : availableMinutes >= 60 ? 'Coffee' : 'Study break';
  return { previous, next, availableMinutes, suggestedActivity };
}
