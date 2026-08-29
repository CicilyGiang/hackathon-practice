// Generates the "Why this one?" reason text and a personalised match score for
// events, via a plain fetch() call to the Anthropic Messages API — no SDK.
// The Node/OpenAI SDK doesn't run on the Cloudflare Workers edge runtime,
// which is why that dependency was removed earlier. A raw fetch() call works
// fine here, the same way app/api/geocode/route.ts already calls Nominatim.
//
// This route is intentionally best-effort: if no API key is configured, the
// model call fails, or the response can't be parsed, it falls back to a
// simple heuristic score instead of erroring. The event's static `reason`
// field (already in the request) is always usable as a last-resort fallback
// on the client, so a flaky network never breaks the UI.

type EventInput = {
  id: number;
  title: string;
  faculty: string;
  tags: string[];
  time: string;
  fallbackReason: string;
};

type ProfileInput = {
  major?: string;
  year?: string;
};

type Insight = { id: number; reason: string; matchScore: number };

function heuristicScore(event: EventInput, profile: ProfileInput | undefined, seed: number): number {
  // Deterministic per-event pseudo-score so the badge stops showing a fixed
  // "92%" for every event, even when no AI key is configured. Slightly
  // rewards events outside the student's own faculty (the whole point of
  // "serendipity") and events tagged Beginner-friendly.
  let score = 68 + (seed % 11); // 68-78 base, stable per event id
  if (profile?.major && event.faculty && !event.faculty.toLowerCase().includes(profile.major.toLowerCase().slice(0, 4))) {
    score += 12; // outside-your-degree bonus
  }
  if (event.tags.includes('Beginner')) score += 6;
  if (event.tags.includes('Free')) score += 3;
  return Math.max(60, Math.min(98, score));
}

function heuristicInsight(event: EventInput, profile: ProfileInput | undefined): Insight {
  return { id: event.id, reason: event.fallbackReason, matchScore: heuristicScore(event, profile, event.id) };
}

export async function POST(request: Request) {
  let body: { events?: unknown; profile?: unknown };
  try {
    body = await request.json() as { events?: unknown; profile?: unknown };
  } catch {
    return Response.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? (body.events as EventInput[]).slice(0, 12) : [];
  if (events.length === 0) {
    return Response.json({ message: 'No events supplied.' }, { status: 400 });
  }
  const profile = (body.profile && typeof body.profile === 'object') ? body.profile as ProfileInput : undefined;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured (e.g. local dev without .dev.vars) — degrade to the
    // heuristic score rather than failing the request.
    return Response.json({ insights: events.map(event => heuristicInsight(event, profile)) });
  }

  const prompt = `You help a university student discover campus events slightly outside their usual routine.
Student profile: major "${profile?.major ?? 'unknown'}", year "${profile?.year ?? 'unknown'}".
For each event below, write ONE short, upbeat, specific reason (max 18 words) explaining why this student in particular might enjoy it, and a match score from 60-99 (higher = better fit, favour events outside their own faculty and beginner-friendly events).
Events:
${events.map(event => `- id ${event.id}: "${event.title}" (${event.faculty} faculty, tags: ${event.tags.join(', ')}, ${event.time})`).join('\n')}

Respond with ONLY a JSON array, no prose, in this exact shape:
[{"id": number, "reason": string, "matchScore": number}]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`AI service returned ${response.status}`);
    const data = await response.json() as { content?: { type: string; text?: string }[] };
    const text = data.content?.find(block => block.type === 'text')?.text ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in AI response');

    const parsed = JSON.parse(match[0]) as { id?: unknown; reason?: unknown; matchScore?: unknown }[];
    const byId = new Map(parsed.map(item => [Number(item.id), item]));

    const insights: Insight[] = events.map(event => {
      const item = byId.get(event.id);
      const reason = typeof item?.reason === 'string' && item.reason.trim() ? item.reason.trim() : event.fallbackReason;
      const rawScore = Number(item?.matchScore);
      const matchScore = Number.isFinite(rawScore) ? Math.max(60, Math.min(99, Math.round(rawScore))) : heuristicScore(event, profile, event.id);
      return { id: event.id, reason, matchScore };
    });

    return Response.json({ insights }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    // Model call failed or returned something unparsable — never block the UI.
    return Response.json({ insights: events.map(event => heuristicInsight(event, profile)) });
  }
}
