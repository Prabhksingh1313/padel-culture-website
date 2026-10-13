// Padel Culture Rating (PCR): questionnaire, scoring and tiers.
// Starter version. Edit QUESTIONS and TIERS here to change the questionnaire.

// Scale: 0.0 to 7.0. Ratings saved during the short-lived 1-10 trial carry `scale: 10`
// and are converted back by normRating().
export const SCALE_MIN = 0;
export const SCALE_MAX = 7;
export const TIERS = [
  { name: 'Beginner',              min: 0.0, max: 0.99, blurb: 'New to padel and learning the basics. Every great player started here.' },
  { name: 'Beginner+',             min: 1.0, max: 1.99, blurb: 'You can keep a short rally going and your serve usually goes in.' },
  { name: 'Intermediate',          min: 2.0, max: 2.99, blurb: 'Steady rallies, you are starting to use the back glass and move with your partner.' },
  { name: 'Intermediate+',         min: 3.0, max: 3.99, blurb: 'You play the walls on purpose, volley well and build points with your partner.' },
  { name: 'Intermediate Advanced', min: 4.0, max: 4.99, blurb: 'Controlled overheads, smart lobs, and you switch between defence and attack.' },
  { name: 'Advanced',              min: 5.0, max: 5.99, blurb: 'You attack with spin and win points on purpose. Earned on court.' },
  { name: 'Elite',                 min: 6.0, max: 7.0,  blurb: 'Tournament level. You can finish points from anywhere. Earned on court.' },
];
// Level with its range in brackets, e.g. "Beginner+ (1.0–1.9)".
export const rangeText = (t) => `${t.min.toFixed(1)}–${t.name === 'Elite' ? '7.0' : (Math.floor(t.max * 10) / 10).toFixed(1)}`;
export const levelWithRange = (t) => `${t.name} (${rangeText(t)})`;

// The questionnaire can't place anyone above this. Players who give a Playtomic level
// get a little more room. Advanced and Elite are only earned in games.
export const SELF_RATING_CAP = 3.5;
export const PLAYTOMIC_CAP = 4.5;
export const START_RATING = 2.0;   // players entered in a session without a rating

// ---------- Playtomic ----------
// Same 0-7 range as Playtomic, so a Playtomic level can be used directly as a starting point.
export const playtomicText = () => '';

// ---------- How a rating is shown ----------
export const show1 = (r) => Number(r).toFixed(1);   // players see one decimal
export const CONFIDENCE = {
  sessions: 5,          // sessions needed...
  partners: 6,          // ...with this many different partners
  restDays: 60,         // no session for this long: "Resting"
};
// status: 'provisional' | 'verified' (stored); shown as Calibrating / Court-Proven
export function confidenceLabel(doc) {
  if (!doc) return 'Calibrating';
  const proven = doc.status === 'verified' || doc.ratingStatus === 'verified';
  if (!proven) return 'Calibrating';
  const last = doc.lastSessionAt;
  if (typeof last === 'number' && Date.now() - last > CONFIDENCE.restDays * 864e5) return 'Court-Proven · Resting';
  return 'Court-Proven';
}
// Form: one beat per recent session. ▲ beat expectation, ● on par, ▼ below.
export function formBeat(share, expected) {
  const d = share - expected;
  return d > 0.02 ? 'up' : d < -0.02 ? 'down' : 'par';
}
export const FORM_SYMBOL = { up: '▲', par: '●', down: '▼' };

// kind: 'bg' = background (30% of the score), 'skill' = on-court skill (70%).
export const QUESTIONS = [
  { id: 'experience', kind: 'bg', q: 'How long have you played padel?',
    a: ['Never, or just once', 'Under 3 months', '3 to 12 months', '1 to 3 years', 'More than 3 years'] },
  { id: 'frequency', kind: 'bg', q: 'How often do you play?',
    a: ['Less than once a month', '2 to 3 times a month', 'Once a week', '2 to 3 times a week', '4 or more times a week'] },
  { id: 'racket', kind: 'bg', q: 'Have you played other racket sports?',
    a: ['No', 'Casual badminton or table tennis', 'Regular badminton or pickleball', 'Regular tennis or squash', 'Competitive tennis or squash'] },
  { id: 'serve', kind: 'skill', q: 'How is your serve?',
    a: ['I often miss', 'I usually get it in', 'Deep and consistent', 'I can aim it where I want', 'I vary spin and placement to set up the point'] },
  { id: 'glass', kind: 'skill', q: 'When the ball comes off the back glass…',
    a: ['I usually miss it', 'I sometimes return it', 'I return it most of the time', 'I can attack after it bounces off', 'I am comfortable even off the side and back glass together'] },
  { id: 'net', kind: 'skill', q: 'How do you play at the net?',
    a: ['I avoid the net', 'I can block the ball back', 'Steady volleys', 'I place volleys deep or at angles', 'I finish points at the net'] },
  { id: 'overhead', kind: 'skill', q: 'When a lob comes over you…',
    a: ['I let it bounce', 'I try to smash, often out', 'I play a controlled bandeja', 'Bandeja and víbora with spin', 'I can smash the ball out of the court'] },
  { id: 'matches', kind: 'bg', q: 'What match experience do you have?',
    a: ['None yet', 'Friendly games only', 'Regular Americanos', 'Club tournaments', 'Ranked or federation tournaments'] },
  { id: 'playtomic', kind: 'pt', q: 'Do you have a Playtomic level?',
    a: ["No, I don't use Playtomic", 'Under 1.5', '1.5 to 2.4', '2.5 to 3.4', '3.5 to 4.4', '4.5 or higher'] },
];

export function tierFor(rating) {
  let t = TIERS[0];
  for (const x of TIERS) if (rating >= x.min - 0.0001) t = x;
  return t;
}

export const fmt = (r) => Number(r).toFixed(2);
const r2 = (x) => Math.round(x * 100) / 100;
const clamp = (x) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, x));

export function normRating(doc) {
  if (!doc || typeof doc.rating !== 'number') return null;
  return doc.scale === 10 ? r2(clamp(((doc.rating - 1) * 7) / 9)) : r2(clamp(doc.rating));
}
export function normPoint(p) {
  return p.sc === 10 ? r2(clamp(((p.r - 1) * 7) / 9)) : r2(clamp(p.r));
}

// answers: { [questionId]: 0..4 }
export function score(answers) {
  const avg = (kind) => {
    const qs = QUESTIONS.filter((q) => q.kind === kind);
    return qs.reduce((s, q) => s + (answers[q.id] ?? 0), 0) / (qs.length * 4);
  };
  // A slight curve so middle-of-the-road answers land around Intermediate, not higher.
  const f = Math.pow(0.3 * avg('bg') + 0.7 * avg('skill'), 1.1);
  let raw = SCALE_MIN + f * (SCALE_MAX - SCALE_MIN);
  let cap = SELF_RATING_CAP;
  // A Playtomic level is outside evidence: blend it in and allow a slightly higher start.
  const PT_MID = [null, 1.0, 2.0, 3.0, 4.0, 4.8];
  const pt = PT_MID[answers.playtomic ?? 0];
  if (pt != null) { raw = (raw + pt) / 2; cap = PLAYTOMIC_CAP; }
  const rating = r2(Math.min(raw, cap));
  return { rating, tier: tierFor(rating).name, capped: raw > cap, playtomic: pt };
}

// ---------- Padel Culture Rating: session engine ----------
// Every match counts. For each match, a team's expected share of the points depends on
// the levels of all four players: its average rating against the opponents' average.
// After the session, each player's rating moves by K x (actual share - expected share),
// summed over their matches. New players move faster; the change per session is capped.
export const ENGINE = {
  spread: 3.1,                      // 1.0 rating gap = about 68% expected share of points
  k: (n) => (n < 5 ? 0.32 : n < 20 ? 0.16 : 0.1),
  cap: (n) => (n < 5 ? 0.4 : 0.25),
};
export function expectedShare(teamAvg, oppAvg) {
  return 1 / (1 + Math.pow(10, (oppAvg - teamAvg) / ENGINE.spread));
}
// matches: [{ a: [uid, uid], b: [uid, uid], sa: points, sb: points }]
// players: { [uid]: { rating, sessions, status, partners } } (ratings on the 0-7 scale)
export function computeSession(matches, players) {
  const out = {};
  const row = (uid) => (out[uid] ||= { uid, before: players[uid].rating, sessions: players[uid].sessions || 0, prevStatus: players[uid].status || 'provisional', partnerSet: new Set(), matches: 0, won: 0, played: 0, exp: 0, raw: 0 });
  for (const m of matches) {
    const total = m.sa + m.sb;
    if (!total) continue;
    const A = (players[m.a[0]].rating + players[m.a[1]].rating) / 2;
    const B = (players[m.b[0]].rating + players[m.b[1]].rating) / 2;
    const eA = expectedShare(A, B);
    for (const [team, pts, e] of [[m.a, m.sa, eA], [m.b, m.sb, 1 - eA]]) {
      for (const uid of team) {
        const r = row(uid);
        r.partnerSet.add(team[0] === uid ? team[1] : team[0]);
        r.matches++; r.won += pts; r.played += total; r.exp += e * total;
        r.raw += ENGINE.k(r.sessions) * (pts / total - e);
      }
    }
  }
  for (const r of Object.values(out)) {
    const cap = ENGINE.cap(r.sessions);
    r.delta = r2(Math.max(-cap, Math.min(cap, r.raw)));
    r.after = r2(clamp(r.before + r.delta));
    r.share = r.played ? r.won / r.played : 0;
    r.expShare = r.played ? r.exp / r.played : 0;
    r.tier = tierFor(r.after).name;
    r.partnersAfter = new Set([...(players[r.uid].partners || []), ...r.partnerSet]).size;
    r.status = r.prevStatus === 'verified' || (r.sessions + 1 >= CONFIDENCE.sessions && r.partnersAfter >= CONFIDENCE.partners) ? 'verified' : 'provisional';
    r.beat = formBeat(r.share, r.expShare);
  }
  return out;
}

export function displayName(full) {
  const parts = String(full || '').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  if (!parts[0]) return 'Player';
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}
