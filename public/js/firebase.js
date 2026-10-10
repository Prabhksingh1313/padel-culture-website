// Shared Firebase setup for phone (OTP) login and the players database.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const config = JSON.parse(document.getElementById('fb-config').textContent);
export const ready = Boolean(config.apiKey);
export const adminPhones = config.adminPhones || [];

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
export async function sendCode(phone10, buttonId) {
  if (!verifier) verifier = new RecaptchaVerifier(auth, buttonId, { size: 'invisible' });
  return signInWithPhoneNumber(auth, '+91' + phone10, verifier);
}
export function resetVerifier() {
  try { verifier && verifier.clear(); } catch (e) {}
  verifier = undefined;
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

export async function listPlayers() {
  const snap = await getDocs(query(collection(db, 'players'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  return 'Something went wrong. Refresh the page and try again.';
}
