'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { findVerifiedGap, loadClassSchedule, saveClassSchedule } from '../lib/schedule-storage';
import type { ClassScheduleItem, ScheduleKind } from '../types/schedule';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleGapPlanner({ onActivate }: { onActivate: (activity: string, durationMinutes: number) => void }) {
  const [schedule, setSchedule] = useState<ClassScheduleItem[]>([]);
  const [open, setOpen] = useState(false);
  const [onCampus, setOnCampus] = useState(true);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [clock, setClock] = useState(() => new Date());
  const [draft, setDraft] = useState({ title: '', kind: 'Class' as ScheduleKind, day: new Date().getDay(), startTime: '10:00', endTime: '11:00' });

  useEffect(() => {
    setSchedule(loadClassSchedule());
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const gap = useMemo(() => suggestionsEnabled && onCampus ? findVerifiedGap(schedule, clock) : null, [clock, onCampus, schedule, suggestionsEnabled]);

  const addClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.endTime <= draft.startTime) return;
    const next = [...schedule, { ...draft, id: crypto.randomUUID() }];
    setSchedule(next);
    saveClassSchedule(next);
    setDraft(current => ({ ...current, title: '' }));
  };

  const removeClass = (id: string) => {
    const next = schedule.filter(item => item.id !== id);
    setSchedule(next);
    saveClassSchedule(next);
  };

  return <>
    <section className={`schedule-gap-card ${gap ? 'has-gap' : ''}`}>
      <div><span>▦</span><p><b>{gap ? `${gap.availableMinutes}-minute verified gap` : 'Connect your class schedule'}</b>{gap ? `Before ${gap.next.title} at ${gap.next.startTime}` : 'We only suggest hangouts when your timetable confirms you are free.'}</p></div>
      {gap && <button onClick={() => onActivate(gap.suggestedActivity, Math.min(gap.availableMinutes - 10, 120))}>Go free for {gap.suggestedActivity.toLowerCase()}</button>}
      <button className="manage-schedule" onClick={() => setOpen(true)}>{schedule.length ? 'Manage schedule' : 'Add classes'}</button>
    </section>

    {open && <div className="signup-backdrop"><section className="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
      <button className="signup-close" onClick={() => setOpen(false)}>×</button>
      <p className="eyebrow">PRIVATE TIMETABLE</p><h2 id="schedule-title">Find the gaps between classes.</h2>
      <p>Your timetable stays on this device. Other students see only a Free status you actively publish.</p>
      <div className="schedule-privacy-options"><label><input type="checkbox" checked={onCampus} onChange={event => setOnCampus(event.target.checked)}/> I am on campus</label><label><input type="checkbox" checked={suggestionsEnabled} onChange={event => setSuggestionsEnabled(event.target.checked)}/> Suggest social gaps</label></div>
      <form className="schedule-form" onSubmit={addClass}>
        <label>Class name<input required value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="INFO1110 Tutorial"/></label>
        <label>Type<select value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as ScheduleKind })}><option>Class</option><option>Lecture</option><option>Tutorial</option></select></label>
        <label>Day<select value={draft.day} onChange={event => setDraft({ ...draft, day: Number(event.target.value) })}>{days.map((day,index) => <option value={index} key={day}>{day}</option>)}</select></label>
        <div className="field-pair"><label>Starts<input type="time" value={draft.startTime} onChange={event => setDraft({ ...draft, startTime: event.target.value })}/></label><label>Ends<input type="time" value={draft.endTime} onChange={event => setDraft({ ...draft, endTime: event.target.value })}/></label></div>
        <button className="signup-submit">Add to schedule →</button>
      </form>
      <div className="class-list">{schedule.map(item => <article key={item.id}><span>{item.kind}</span><p><b>{item.title}</b>{days[item.day]} · {item.startTime}-{item.endTime}</p><button onClick={() => removeClass(item.id)}>Remove</button></article>)}{schedule.length === 0 && <p className="empty-class-list">Add at least two classes on the same day. Sidequest will detect the real gap between them.</p>}</div>
    </section></div>}
  </>;
}
