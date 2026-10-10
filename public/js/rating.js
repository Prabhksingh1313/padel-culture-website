// Padel Culture Rating (PCR): questionnaire, scoring and tiers.
// Starter version. Edit QUESTIONS and TIERS here to change the questionnaire.

export const TIERS = [
  { name: 'First Serve',     min: 0.0, max: 1.4, blurb: 'New to padel and learning the basics. Every great player started here.' },
  { name: 'Rally Maker',     min: 1.5, max: 2.4, blurb: 'You keep rallies going and serve reliably. The walls are next.' },
  { name: 'Wall Walker',     min: 2.5, max: 3.4, blurb: 'You use the back glass on purpose and hold your own at the net.' },
  { name: 'Bandeja Crafter', min: 3.5, max: 4.4, blurb: 'Controlled overheads, smart positioning, points built with your partner.' },
  { name: 'Víbora',          min: 4.5, max: 5.4, blurb: 'You attack with spin and turn defence into attack. Earned on court.' },
  { name: 'Por Tres',        min: 5.5, max: 7.0, blurb: 'Tournament level. You can smash the ball out of the court. Earned on court.' },
];

// Questionnaire answers can't place anyone above this. Higher tiers are earned in rated games.
export const SELF_RATING_CAP = 4.4;

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
];

export function tierFor(rating) {
  return TIERS.find((t) => rating <= t.max + 0.05) || TIERS[TIERS.length - 1];
}

// answers: { [questionId]: 0..4 }
export function score(answers) {
  const avg = (kind) => {
    const qs = QUESTIONS.filter((q) => q.kind === kind);
    return qs.reduce((s, q) => s + (answers[q.id] ?? 0), 0) / (qs.length * 4);
  };
  // A slight curve so middle-of-the-road answers land around Wall Walker, not higher.
  const raw = Math.pow(0.3 * avg('bg') + 0.7 * avg('skill'), 1.1) * 7;
  const rating = Math.round(Math.min(raw, SELF_RATING_CAP) * 10) / 10;
  const capped = raw > SELF_RATING_CAP;
  return { rating, tier: tierFor(rating).name, capped };
}

export function displayName(full) {
  const parts = String(full || '').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  if (!parts[0]) return 'Player';
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}
