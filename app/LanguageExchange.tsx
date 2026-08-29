'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type LanguageProfile = { alias: string; speaks: string; learning: string };
type ExchangeMessage = { id: string; mine: boolean; text: string; createdAt: string };
type Partner = LanguageProfile & { id: string; avatar: string; intro: string };

const languages = ['English', 'Mandarin', 'Indonesian', 'Vietnamese', 'Cantonese', 'Korean', 'Japanese', 'Spanish', 'French'];
const partners: Partner[] = [
  { id: 'lotus', alias: 'Sydney Lotus', avatar: '🪷', speaks: 'Mandarin', learning: 'English', intro: 'Coffee chats, campus walks and everyday English.' },
  { id: 'koala', alias: 'Kind Koala', avatar: '🐨', speaks: 'English', learning: 'Mandarin', intro: 'Learning tones and happy to help with local expressions.' },
  { id: 'gecko', alias: 'Sunny Gecko', avatar: '🦎', speaks: 'Indonesian', learning: 'English', intro: 'Casual conversation about food, music and uni life.' },
  { id: 'lantern', alias: 'Paper Lantern', avatar: '🏮', speaks: 'Vietnamese', learning: 'English', intro: 'Looking for a patient weekly speaking partner.' },
  { id: 'magpie', alias: 'Friendly Magpie', avatar: '🐦', speaks: 'English', learning: 'Vietnamese', intro: 'Beginner learner who can swap Australian English practice.' },
  { id: 'star', alias: 'Quiet Star', avatar: '⭐', speaks: 'English', learning: 'Indonesian', intro: 'Keen to practise Bahasa Indonesia and help with presentations.' },
];

const emptyProfile: LanguageProfile = { alias: '', speaks: 'English', learning: 'Mandarin' };

export default function LanguageExchange({ hasAccount, onCreateAccount }: { hasAccount: boolean; onCreateAccount: () => void }) {
  const [profile, setProfile] = useState<LanguageProfile | null>(null);
  const [draftProfile, setDraftProfile] = useState(emptyProfile);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Record<string, ExchangeMessage[]>>({});
  const [draft, setDraft] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = window.localStorage.getItem('sidequest-language-profile');
      const savedMessages = window.localStorage.getItem('sidequest-language-messages');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile) as LanguageProfile;
        setProfile(parsed);
        setDraftProfile(parsed);
      }
      if (savedMessages) setMessages(JSON.parse(savedMessages));
    } catch {
      window.localStorage.removeItem('sidequest-language-profile');
      window.localStorage.removeItem('sidequest-language-messages');
    }
    setReady(true);
  }, []);

  const matches = useMemo(() => {
    if (!profile) return [];
    return partners.map(partner => ({
      ...partner,
      score: partner.speaks === profile.learning && partner.learning === profile.speaks ? 100
        : partner.speaks === profile.learning ? 78
        : partner.learning === profile.speaks ? 64 : 30,
    })).filter(partner => partner.score >= 64).sort((a, b) => b.score - a.score);
  }, [profile]);

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draftProfile.speaks === draftProfile.learning) return;
    const next = { ...draftProfile, alias: draftProfile.alias.trim() };
    window.localStorage.setItem('sidequest-language-profile', JSON.stringify(next));
    setProfile(next);
  };

  const swapLanguages = () => {
    setDraftProfile(current => ({ ...current, speaks: current.learning, learning: current.speaks }));
  };

  const send = () => {
    if (!selectedPartner || !draft.trim()) return;
    const partnerId = selectedPartner.id;
    const nextMessage: ExchangeMessage = { id: crypto.randomUUID(), mine: true, text: draft.trim(), createdAt: new Date().toISOString() };
    setMessages(current => {
      const next = { ...current, [partnerId]: [...(current[partnerId] ?? []), nextMessage] };
      window.localStorage.setItem('sidequest-language-messages', JSON.stringify(next));
      return next;
    });
    setDraft('');
    window.setTimeout(() => {
      const reply: ExchangeMessage = { id: crypto.randomUUID(), mine: false, text: `Hi! I’d love to practise ${selectedPartner.learning} and help you with ${selectedPartner.speaks}. 👋`, createdAt: new Date().toISOString() };
      setMessages(current => {
        const next = { ...current, [partnerId]: [...(current[partnerId] ?? []), reply] };
        window.localStorage.setItem('sidequest-language-messages', JSON.stringify(next));
        return next;
      });
    }, 700);
  };

  if (!ready) return null;

  return <section className="language-exchange">
    <header className="language-hero"><div><p className="eyebrow">ANONYMOUS LANGUAGE EXCHANGE</p><h1>Trade words.<br/><em>Find your people.</em></h1><p>Match with another USYD student who speaks what you are learning—and wants to learn what you speak.</p></div><span>你好 · Halo · Xin chào · Hello</span></header>
    {!hasAccount ? <div className="language-gate"><span>🔐</span><h2>Create a verified student account first</h2><p>Your real details remain private. Language partners only see the anonymous alias you choose.</p><button onClick={onCreateAccount}>Create student account →</button></div>
      : !profile ? <form className="language-profile-card" onSubmit={saveProfile}><div><p className="eyebrow">YOUR EXCHANGE PROFILE</p><h2>Start anonymously.</h2><p>Choose an alias and the two languages you want to swap.</p></div><label>Anonymous alias<input required value={draftProfile.alias} onChange={event => setDraftProfile({...draftProfile, alias:event.target.value})} placeholder="Curious Kookaburra" /></label><div className="language-fields"><label>I speak<select value={draftProfile.speaks} onChange={event => setDraftProfile({...draftProfile, speaks:event.target.value})}>{languages.map(language => <option key={language}>{language}</option>)}</select></label><button className="language-swap" type="button" onClick={swapLanguages} aria-label={`Swap ${draftProfile.speaks} and ${draftProfile.learning}`} title="Swap languages">⇄</button><label>I want to learn<select value={draftProfile.learning} onChange={event => setDraftProfile({...draftProfile, learning:event.target.value})}>{languages.map(language => <option key={language}>{language}</option>)}</select></label></div>{draftProfile.speaks === draftProfile.learning && <small className="language-error">Choose two different languages.</small>}<button type="submit" disabled={draftProfile.speaks === draftProfile.learning}>Find my matches →</button></form>
      : <><div className="language-toolbar"><div><span className="language-avatar">🎭</span><p><b>{profile.alias}</b><small>{profile.speaks} ⇄ {profile.learning}</small></p></div><button onClick={() => setProfile(null)}>Edit exchange profile</button></div><div className="language-layout"><div className="language-matches"><header><h2>Your best matches</h2><span>{matches.length} compatible partners</span></header>{matches.map(partner => <button className={selectedPartner?.id === partner.id ? 'selected' : ''} key={partner.id} onClick={() => setSelectedPartner(partner)}><i>{partner.avatar}</i><div><b>{partner.alias}</b><small>Speaks {partner.speaks} · Learning {partner.learning}</small><p>{partner.intro}</p></div><strong>{partner.score}%</strong></button>)}</div><div className="exchange-chat">{selectedPartner ? <><header><span>{selectedPartner.avatar}</span><div><b>{selectedPartner.alias}</b><small>{selectedPartner.speaks} ⇄ {selectedPartner.learning} · anonymous</small></div></header><div className="exchange-messages">{(messages[selectedPartner.id] ?? []).length === 0 && <div className="exchange-empty"><span>💬</span><p>Start with a friendly hello. Keep personal details private until you feel comfortable.</p></div>}{(messages[selectedPartner.id] ?? []).map(message => <p className={message.mine ? 'mine' : ''} key={message.id}>{message.text}<small>{new Date(message.createdAt).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</small></p>)}</div><div className="exchange-composer"><input value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && send()} placeholder={`Message ${selectedPartner.alias}…`} /><button onClick={send}>↑</button></div></> : <div className="exchange-empty"><span>🌏</span><h3>Choose a language partner</h3><p>Your conversation will stay saved locally on this device.</p></div>}</div></div></>}
  </section>;
}
