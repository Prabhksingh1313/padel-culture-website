// Booking cart, kept in this browser until the player confirms.
const KEY = 'pc-cart';

export function get() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter((x) => typeof x === 'string'); }
  catch (e) { return []; }
}
function set(ids) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set(ids)])); } catch (e) {}
  window.dispatchEvent(new CustomEvent('cart-change'));
}
export function add(id) { set([...get(), id]); }
export function remove(id) { set(get().filter((x) => x !== id)); }
export function clear() { set([]); }
export function replace(ids) { set(ids); }
