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
  { name: 'Lower Advanced',        min: 4.0, max: 4.99, blurb: 'Controlled overheads, smart lobs, and you switch between defence and attack.' },
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

// The 13-question onboarding questionnaire (final version, Oct 2026).
// Each answer scores 0-4; w = weight in the base score (the 13 weights sum to 1).
// Matches the Base_Score tab of the Padel Culture Rating Model workbook.
// The last entry (kind 'pt') is the optional Playtomic level and is not one of the 13.
export const QUESTIONS = [
  { id: 'experience', kind: 'bg', w: 0.06, q: 'How long have you played padel?',
    a: ['First time / never', 'Less than 3 months', '3–12 months', '1–3 years', '3+ years'] },
  { id: 'frequency', kind: 'bg', w: 0.05, q: 'How often do you play?',
    a: ['Less than once a month', '1–2 times a month', 'Weekly', '2–3 times a week', '4+ times a week'] },
  { id: 'racket', kind: 'bg', w: 0.06, q: 'Other racket-sport background?',
    a: ['None', 'Casual', 'Regular club-level tennis/squash/badminton/pickleball', 'Competitive (state/university)', 'National level / coached for years'] },
  { id: 'serve', kind: 'skill', w: 0.07, q: 'How good is your serve?',
    a: ["I often can't get it in, or double-fault a lot", 'It goes in, but slow with no aim', "Consistent, and I can aim it at the middle or the receiver's backhand", 'I vary placement (side glass, middle, body) and add slice; I rarely fault', 'I use my serve to set up the point: wide to the glass, into the body, mixing spin and pace, then I follow it to the net'] },
  { id: 'ground', kind: 'skill', w: 0.09, q: 'Groundstrokes from the back',
    a: ["Can't sustain a rally", 'Rallies of 3–4 shots at slow pace', 'Consistent at medium pace', 'Control depth and direction', 'Vary pace and spin under pressure'] },
  { id: 'net', kind: 'skill', w: 0.09, q: 'Volleys at the net',
    a: ['Avoid the net', 'Occasional block volleys', 'Comfortable on easy volleys', 'Deep or to-the-feet volleys', 'Punch and drop volleys; dominate the net'] },
  { id: 'glass', kind: 'skill', w: 0.11, q: 'Back-wall play',
    a: ['Let it pass / hit before the wall', 'Return easy back-wall balls sometimes', 'Return most defensively', 'Play off it with control and direction', 'Attack off the back wall'] },
  { id: 'sidewall', kind: 'skill', w: 0.08, q: 'Side-wall and double-wall play',
    a: ["Can't handle", 'Rarely return', 'Simple side-wall balls', 'Handle double walls', 'Read all combinations instinctively'] },
  { id: 'lob', kind: 'skill', w: 0.08, q: 'Lob and defence',
    a: ["Don't lob", 'Lob without control', 'Lob to regain the net sometimes', 'Consistent deep defensive lobs', 'Lob offensively; turn defence into attack'] },
  { id: 'overhead', kind: 'skill', w: 0.09, q: 'Bandeja / víbora',
    a: ["Don't know them", 'Attempt, rarely in', 'Consistent bandeja to keep the net', 'Bandeja and víbora with direction', 'Full overhead variety by situation'] },
  { id: 'smash', kind: 'skill', w: 0.07, q: 'Smash and finishing',
    a: ['No smash', 'Flat smash, sometimes in', 'Finish easy balls', 'Power smash; attempt por tres', 'Por tres / por cuatro reliably'] },
  { id: 'position', kind: 'skill', w: 0.09, q: 'Positioning and teamwork',
    a: ['Unsure where to stand', 'Know basic positions', 'Move with partner, recover position', 'Communicate, cover the middle, transition', 'Anticipate and build points as a pair'] },
  { id: 'matches', kind: 'bg', w: 0.06, q: 'Competitive record',
    a: ['Never played competitively', 'Social Americanos only', 'Regular Americanos / leagues, win some', 'Club tournaments, reach later rounds', 'Win club tournaments / ranked events'] },
  { id: 'playtomic', kind: 'pt', q: 'Do you have a Playtomic level? (optional)',
    a: ["No, I don't use Playtomic", 'Under 1.5', '1.5 to 2.4', '2.5 to 3.4', '3.5 to 4.4', '4.5 or higher'] },
];
// Gates: no high start without the matching skill.
const BASE_GAMMA = 1.15;
const GATES = [
  { id: 'glass', atMost: 1, cap: 2.4 },     // weak back-wall play
  { id: 'overhead', atMost: 1, cap: 3.4 },  // no bandeja
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
  // Weighted score S in [0,1], then a convex curve: rating = 7 x S^1.15.
  const S = QUESTIONS.filter((q) => q.w).reduce((s, q) => s + q.w * (answers[q.id] ?? 0), 0) / 4;
  let raw = SCALE_MIN + Math.pow(S, BASE_GAMMA) * (SCALE_MAX - SCALE_MIN);
  for (const g of GATES) if ((answers[g.id] ?? 0) <= g.atMost) raw = Math.min(raw, g.cap);
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
