// Shared Firebase setup for phone (OTP) login and the players database.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, signOut,
  GoogleAuthProvider, signInWithPopup,
  EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword, updatePassword,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, where, serverTimestamp,
  runTransaction, arrayUnion, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const config = JSON.parse(document.getElementById('fb-config').textContent);
export const ready = Boolean(config.apiKey);
export const adminPhones = config.adminPhones || [];
export const adminEmails = config.adminEmails || [];
export function isAdmin(user) {
  return Boolean(user) && (adminPhones.includes(user.phoneNumber) || (user.email && adminEmails.includes(user.email.toLowerCase())));
}
export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

let app, auth, db;
if (ready) {
  app = initializeApp(config);
  auth = getAuth(app);
  auth.languageCode = 'en';
  db = getFirestore(app);
}
export { auth, db };

export function watchUser(cb) {
  if (!ready) return cb(null);
  onAuthStateChanged(auth, cb);
}

let verifier;
export async function sendCode(phone10, containerId, retried = false) {
  if (!verifier) {
    // Use a fresh element each time so a reset check can render again.
    const host = document.getElementById(containerId);
    const el = document.createElement('div');
    host.replaceChildren(el);
    verifier = new RecaptchaVerifier(auth, el, { size: 'invisible' });
    await verifier.render();
  }
  try {
    return await signInWithPhoneNumber(auth, '+91' + phone10, verifier);
  } catch (e) {
    // A stale security check can cause internal errors: reset it and try once more.
    resetVerifier();
    const c = (e && e.code) || '';
    if (!retried && (c.includes('internal-error') || c.includes('captcha'))) {
      return sendCode(phone10, containerId, true);
    }
    throw e;
  }
}
export function resetVerifier() {
  try { verifier && verifier.clear(); } catch (e) {}
  verifier = undefined;
}

// Passwords: each player's mobile number doubles as their login ID.
// Firebase stores it as <number>@players.padelculture.in (no emails are ever sent).
export function loginId(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  return `91${digits}@players.padelculture.in`;
}
export function hasPassword(user) {
  return Boolean(user) && user.providerData.some((p) => p.providerId === 'password');
}
export async function setPassword(user, password) {
  if (hasPassword(user)) return updatePassword(user, password);
  return linkWithCredential(user, EmailAuthProvider.credential(loginId(user.phoneNumber), password));
}
export function loginWithPassword(phone10, password) {
  return signInWithEmailAndPassword(auth, loginId(phone10), password);
}
export function currentUser() { return ready ? auth.currentUser : null; }

// Membership lookup: lets the Log in / Join page know whether a number is registered.
const memberId = (phone) => '91' + String(phone || '').replace(/\D/g, '').slice(-10);
export async function lookupMember(phone10) {
  const snap = await getDoc(doc(db, 'members', memberId(phone10)));
  return snap.exists() ? snap.data() : null;
}
export async function markMember(user) {
  await setDoc(doc(db, 'members', memberId(user.phoneNumber)), { hasPassword: hasPassword(user) });
}

export async function getPlayer(uid) {
  const snap = await getDoc(doc(db, 'players', uid));
  return snap.exists() ? snap.data() : null;
}

export async function savePlayer(user, fields, isNew) {
  const data = { ...fields, phone: user.phoneNumber, lastLoginAt: serverTimestamp() };
  if (isNew) data.createdAt = serverTimestamp();
  await setDoc(doc(db, 'players', user.uid), data, { merge: true });
}

// Saves a questionnaire result to the private player record and the public leaderboard.
export async function saveRating(user, name, result, answers) {
  // A rating set by an organiser is never overwritten by the questionnaire.
  const cur = await getPlayer(user.uid);
  if (cur && cur.ratingStatus && cur.ratingStatus !== 'provisional') return;
  await setDoc(doc(db, 'players', user.uid), {
    phone: user.phoneNumber,
    rating: result.rating,
    tier: result.tier,
    ratingStatus: 'provisional',
    answers,
    ratedAt: serverTimestamp(),
    ratingHistory: arrayUnion({ r: result.rating, s: 'provisional', at: Date.now(), by: 'questionnaire' }),
  }, { merge: true });
  await setDoc(doc(db, 'leaderboard', user.uid), {
    name,
    rating: result.rating,
    tier: result.tier,
    status: 'provisional',
    updatedAt: serverTimestamp(),
  });
}

// Organisers only: set a player's rating and publish it to the leaderboard.
export async function adminSetRating(uid, publicName, rating, tier, status) {
  await setDoc(doc(db, 'players', uid), { rating, tier, ratingStatus: status, ratedAt: serverTimestamp(), ratingHistory: arrayUnion({ r: rating, s: status, at: Date.now(), by: 'organiser' }) }, { merge: true });
  await setDoc(doc(db, 'leaderboard', uid), { name: publicName, rating, tier, status, updatedAt: serverTimestamp() }, { merge: true });
}

export async function listLeaderboard() {
  const snap = await getDocs(query(collection(db, 'leaderboard'), orderBy('rating', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listPlayers() {
  const snap = await getDocs(query(collection(db, 'players'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- Bookings ----------
// games/{gameId}: { spots, booked }  — live counter, public
// bookings/{gameId}__{uid}: { gameId, uid, name, status, paid, createdAt } — public (first name + initial only)
const bookingId = (gameId, uid) => `${gameId}__${uid}`;

export async function listGameCounts() {
  const snap = await getDocs(collection(db, 'games'));
  const out = {};
  snap.docs.forEach((d) => { out[d.id] = d.data(); });
  return out;
}

export async function listMyBookings(uid) {
  const snap = await getDocs(query(collection(db, 'bookings'), where('uid', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listGameBookings(gameId) {
  const snap = await getDocs(query(collection(db, 'bookings'), where('gameId', '==', gameId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllBookings() {
  const snap = await getDocs(collection(db, 'bookings'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Reserves one spot in a game. Throws { code: 'full' } or { code: 'already-booked' }.
export async function bookGame(user, name, gameId, spots) {
  const gRef = doc(db, 'games', gameId);
  const bRef = doc(db, 'bookings', bookingId(gameId, user.uid));
  await runTransaction(db, async (tx) => {
    const g = await tx.get(gRef);
    const b = await tx.get(bRef);
    if (b.exists()) throw Object.assign(new Error('Already booked'), { code: 'already-booked' });
    const booked = g.exists() ? g.data().booked || 0 : 0;
    if (booked >= spots) throw Object.assign(new Error('Full'), { code: 'full' });
    tx.set(gRef, { spots, booked: booked + 1 });
    tx.set(bRef, { gameId, uid: user.uid, name, status: 'reserved', paid: false, createdAt: serverTimestamp() });
  });
}

export async function cancelBooking(user, gameId) {
  const gRef = doc(db, 'games', gameId);
  const bRef = doc(db, 'bookings', bookingId(gameId, user.uid));
  await runTransaction(db, async (tx) => {
    const g = await tx.get(gRef);
    const b = await tx.get(bRef);
    if (!b.exists()) return;
    const data = g.data() || { spots: 0, booked: 1 };
    tx.set(gRef, { spots: data.spots, booked: Math.max(0, (data.booked || 1) - 1) });
    tx.delete(bRef);
  });
}

// ---------- Waitlist ----------
// waitlist/{gameId}__{uid}: { gameId, uid, name, createdAt } — public (first name + initial only)
export async function listWaitlist() {
  const snap = await getDocs(collection(db, 'waitlist'));
  const ms = (t) => (t && t.toMillis ? t.toMillis() : Date.now());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
}
export async function joinWaitlist(user, name, gameId) {
  await setDoc(doc(db, 'waitlist', bookingId(gameId, user.uid)), { gameId, uid: user.uid, name, createdAt: serverTimestamp() });
}
export async function leaveWaitlist(uid, gameId) {
  await deleteDoc(doc(db, 'waitlist', bookingId(gameId, uid)));
}

export function logout() { return ready ? signOut(auth) : Promise.resolve(); }

export function friendlyError(e) {
  const c = (e && e.code) || '';
  if (c.includes('invalid-phone-number')) return 'That number doesn\'t look right. Enter your 10-digit mobile number.';
  if (c.includes('too-many-requests')) return 'Too many attempts from this device. Please wait a few minutes and try again.';
  if (c.includes('invalid-verification-code')) return 'That code is incorrect. Check the SMS and try again.';
  if (c.includes('code-expired')) return 'That code has expired. Tap "Resend code" to get a new one.';
  if (c.includes('quota-exceeded')) return 'We can\'t send codes right now. Please message us on WhatsApp instead.';
  if (c.includes('captcha')) return 'Security check failed. Refresh the page and try again.';
  if (c.includes('permission-denied')) return 'You don\'t have access to this.';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-login')) return 'Wrong mobile number or password. Try again, or reset your password with an OTP.';
  if (c === 'full') return 'Sorry, this game just filled up.';
  if (c === 'already-booked') return 'You already have a spot in this game.';
  if (c.includes('weak-password')) return 'Use at least 6 characters. Numbers only is fine.';
  if (c.includes('email-already-in-use') || c.includes('credential-already-in-use')) return 'A password is already set for this number. Log in instead, or reset it with an OTP.';
  if (c.includes('requires-recent-login')) return 'For security, verify your number with an OTP again, then set your password.';
  if (c.includes('unauthorized-domain')) return 'Sign-up isn\'t enabled for this web address yet. (unauthorized-domain)';
  if (c.includes('operation-not-allowed')) return 'Phone sign-up isn\'t switched on yet. (operation-not-allowed)';
  if (c.includes('billing-not-enabled')) return 'SMS sending isn\'t set up yet. (billing-not-enabled)';
  return 'Something went wrong. Refresh the page and try again.' + (c ? ` (${c.replace('auth/', '')})` : '');
}
