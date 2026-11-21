/**
 * This device's Web Push state (service worker + Push API + Notifications API).
 * iPhone / iPad: push only works inside the app added to the Home Screen (iOS 16.4+).
 */

export function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
}

export function pushCapable() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * 'ios-install' — iPhone/iPad not opened from the Home Screen app
 * 'unsupported' — browser without Web Push (or not https)
 * 'denied'      — the user blocked notifications for this site
 * 'ready'       — can subscribe (permission 'default' or 'granted')
 */
export function deviceSupport() {
  if (isIOS() && !isStandalone()) return 'ios-install';
  if (!pushCapable()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

export function registerServiceWorker() {
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function currentSubscription() {
  if (!pushCapable()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

function base64UrlToBytes(value) {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(subscription, publicKey) {
  const current = subscription?.options?.applicationServerKey;
  if (!current) return true; // older browsers don't expose it — keep the subscription
  const a = new Uint8Array(current);
  const b = base64UrlToBytes(publicKey);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export class PushPermissionError extends Error {
  constructor(permission) {
    super(permission === 'denied' ? 'denied' : 'dismissed');
    this.permission = permission;
  }
}

/**
 * Ask permission and create (or reuse) this device's subscription.
 * Must be called straight from a tap: Safari only shows the prompt after a user gesture,
 * so requestPermission() is the first thing awaited.
 */
export async function subscribeDevice(publicKey) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new PushPermissionError(permission);
  const reg = await registerServiceWorker();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, publicKey)) {
    await sub.unsubscribe(); // server keys changed
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) });
  }
  return sub;
}

/** sha256(endpoint) hex — matches the server's endpoint_hash to mark "this device". */
export async function endpointHash(endpoint) {
  if (!endpoint || !window.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
