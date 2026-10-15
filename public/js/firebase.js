// Shared Firebase setup for phone (OTP) login and the players database.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, signOut,
  GoogleAuthProvider, signInWithPopup,
  EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword, updatePassword,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, where, serverTimestamp,
  runTransaction, arrayUnion, deleteDoc, writeBatch, increment, addDoc, updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage, ref as sRef, uploadBytesResumable, uploadBytes, getDownloadURL, deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

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
let storage;
const st = () => (storage ||= getStorage(app));

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
  if (cur && ((cur.ratingStatus && cur.ratingStatus !== 'provisional') || cur.sessions > 0)) return;
  await setDoc(doc(db, 'players', user.uid), {
    phone: user.phoneNumber,
    rating: result.rating,
    tier: result.tier,
    ratingStatus: 'provisional',
    scale: 7,
    answers,
    ratedAt: serverTimestamp(),
    ratingHistory: arrayUnion({ r: result.rating, s: 'provisional', at: Date.now(), by: 'questionnaire', sc: 7 }),
  }, { merge: true });
  await setDoc(doc(db, 'leaderboard', user.uid), {
    name,
    rating: result.rating,
    tier: result.tier,
    status: 'provisional',
    scale: 7,
    updatedAt: serverTimestamp(),
  });
}

// Organisers only: set a player's rating and publish it to the leaderboard.
export async function adminSetRating(uid, publicName, rating, tier, status) {
  await setDoc(doc(db, 'players', uid), { rating, tier, ratingStatus: status, scale: 7, ratedAt: serverTimestamp(), ratingHistory: arrayUnion({ r: rating, s: status, at: Date.now(), by: 'organiser', sc: 7 }) }, { merge: true });
  await setDoc(doc(db, 'leaderboard', uid), { name: publicName, rating, tier, status, scale: 7, updatedAt: serverTimestamp() }, { merge: true });
}

// Organisers only: apply one session's results to every player in it, in one batch.
// results: [{ uid, name, after, tier, status, delta }]; session: { title, date, gameId, matches }
export async function adminApplySession(results, session) {
  const batch = writeBatch(db);
  const ref = doc(collection(db, 'sessions'));
  const at = Date.now();
  for (const r of results) {
    const pdata = {
      rating: r.after, tier: r.tier, ratingStatus: r.status, scale: 7, sessions: increment(1), ratedAt: serverTimestamp(),
      lastSessionAt: at, form: r.form,
      ratingHistory: arrayUnion({ r: r.after, s: r.status, at, by: 'session', sc: 7, d: r.delta, t: session.title, w: r.share, e: r.exp }),
    };
    if (r.partnersNew && r.partnersNew.length) pdata.partners = arrayUnion(...r.partnersNew);
    batch.set(doc(db, 'players', r.uid), pdata, { merge: true });
    batch.set(doc(db, 'leaderboard', r.uid), { name: r.name, rating: r.after, tier: r.tier, status: r.status, scale: 7, sessions: r.sessionsAfter, lastSessionAt: at, form: r.form, lastDelta: r.delta, lastPerf: Math.round((r.share - r.exp) * 1000) / 1000, lastSessionTitle: session.title, updatedAt: serverTimestamp() }, { merge: true });
  }
  batch.set(ref, { ...session, results: Object.fromEntries(results.map((r) => [r.uid, { before: r.before, after: r.after, delta: r.delta }])), createdAt: serverTimestamp() });
  await batch.commit();
  return ref.id;
}

export async function listSessions() {
  const snap = await getDocs(query(collection(db, 'sessions'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Organisers only: rewrite ratings saved during the 1-10 trial back onto 0-7.
export async function adminConvertScale(players, leaderboard, conv) {
  const batch = writeBatch(db);
  let n = 0;
  for (const p of players) if (typeof p.rating === 'number' && p.scale === 10) { batch.set(doc(db, 'players', p.id), { ...conv(p), scale: 7 }, { merge: true }); n++; }
  for (const l of leaderboard) if (typeof l.rating === 'number' && l.scale === 10) { batch.set(doc(db, 'leaderboard', l.id), { ...conv(l), scale: 7 }, { merge: true }); n++; }
  if (n) await batch.commit();
  return n;
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

// Organisers only: update a booking (payment status, message sent).
export async function adminUpdateBooking(id, fields) {
  await setDoc(doc(db, 'bookings', id), fields, { merge: true });
}
// Organisers only: remove a player from a game and free the spot.
export async function adminRemoveBooking(b) {
  const gRef = doc(db, 'games', b.gameId);
  await runTransaction(db, async (tx) => {
    const g = await tx.get(gRef);
    const data = g.exists() ? g.data() : { spots: 1, booked: 1 };
    tx.set(gRef, { spots: data.spots, booked: Math.max(0, (data.booked || 1) - 1) });
    tx.delete(doc(db, 'bookings', b.id));
  });
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

// ---------- Match day gallery ----------
// albums/{id}: { title, date (YYYY-MM-DD), venue, gameId, cover, count, createdAt }
// albums/{id}/items/{itemId}: { type: 'photo'|'video', url, thumb, name, size, path, thumbPath, createdAt }
export async function listAlbums() {
  const snap = await getDocs(query(collection(db, 'albums'), orderBy('date', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function getAlbum(id) {
  const snap = await getDoc(doc(db, 'albums', id));
  return snap.exists() ? { id, ...snap.data() } : null;
}
export async function listAlbumItems(id) {
  const snap = await getDocs(query(collection(db, 'albums', id, 'items'), orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function adminCreateAlbum(data) {
  const ref = await addDoc(collection(db, 'albums'), { ...data, cover: '', count: 0, createdAt: serverTimestamp() });
  return ref.id;
}
export async function adminDeleteAlbum(id) {
  const items = await listAlbumItems(id);
  for (const it of items) await adminDeleteItem(id, it, true);
  await deleteDoc(doc(db, 'albums', id));
}
export async function adminDeleteItem(albumId, it, skipCount) {
  for (const p of [it.path, it.thumbPath]) if (p) { try { await deleteObject(sRef(st(), p)); } catch (e) { console.warn(e); } }
  await deleteDoc(doc(db, 'albums', albumId, 'items', it.id));
  if (!skipCount) {
    const a = await getAlbum(albumId);
    const patch = { count: increment(-1) };
    if (a && a.cover === it.thumb) {
      const rest = (await listAlbumItems(albumId)).find((x) => x.thumb);
      patch.cover = rest ? rest.thumb : '';
    }
    await updateDoc(doc(db, 'albums', albumId), patch);
  }
}

// Makes a small JPEG preview (max 900px) of a photo or of a video's first second.
async function makeThumb(file) {
  const draw = (src, w, h) => {
    const scale = Math.min(1, 900 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.8));
  };
  try {
    if (file.type.startsWith('image/')) {
      const bmp = await createImageBitmap(file);
      return await draw(bmp, bmp.width, bmp.height);
    }
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(rej, 15000); });
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
      await new Promise((res, rej) => { v.onseeked = res; setTimeout(rej, 15000); });
      const blob = await draw(v, v.videoWidth, v.videoHeight);
      URL.revokeObjectURL(url);
      return blob;
    }
  } catch (e) { console.warn('thumbnail failed', e); }
  return null;
}

// Uploads one photo or video to an album. onProgress(0..1).
export async function adminUploadToAlbum(albumId, file, onProgress = () => {}) {
  const type = file.type.startsWith('video/') ? 'video' : 'photo';
  const itemRef = doc(collection(db, 'albums', albumId, 'items'));
  const safe = (file.name || type).replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `albums/${albumId}/${itemRef.id}-${safe}`;
  const thumbBlob = await makeThumb(file);
  const task = uploadBytesResumable(sRef(st(), path), file, {
    contentType: file.type || undefined,
    contentDisposition: `attachment; filename="padel-culture-${safe}"`,
    cacheControl: 'public, max-age=31536000',
  });
  await new Promise((res, rej) => task.on('state_changed', (s) => onProgress(s.bytesTransferred / (s.totalBytes || 1)), rej, res));
  const url = await getDownloadURL(task.snapshot.ref);
  let thumb = type === 'photo' ? url : '', thumbPath = '';
  if (thumbBlob) {
    thumbPath = `albums/${albumId}/thumbs/${itemRef.id}.jpg`;
    const t = await uploadBytes(sRef(st(), thumbPath), thumbBlob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' });
    thumb = await getDownloadURL(t.ref);
  }
  await setDoc(itemRef, { type, url, thumb, name: file.name || safe, size: file.size, path, thumbPath, createdAt: serverTimestamp() });
  const a = await getAlbum(albumId);
  const patch = { count: increment(1) };
  if (a && !a.cover && thumb) patch.cover = thumb;
  await updateDoc(doc(db, 'albums', albumId), patch);
  return { id: itemRef.id, type, url, thumb, name: file.name };
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
