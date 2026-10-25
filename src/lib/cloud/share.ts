import type { Column, Cell, Highlight } from './templates';

/**
 * Snapshot links carry the shared report inside the URL fragment (after `#`), which browsers never
 * send to a server. The payload is deflate-compressed and, when a passcode is set, encrypted with
 * AES-GCM using a PBKDF2-derived key, so the link alone reveals nothing without the passcode.
 */
export interface Snapshot {
  v: 1;
  title: string;
  periodLabel: string;
  generatedAt: string;
  /** ISO timestamp, or null for links that never expire. */
  expiresAt: string | null;
  columns: Column[];
  rows: Cell[][];
  highlights: Highlight[];
}

const FLAG_COMPRESSED = 1;
const FLAG_ENCRYPTED = 2;
const PBKDF2_ITERATIONS = 150_000;

export class PasscodeRequiredError extends Error {}
export class InvalidLinkError extends Error {}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export async function encodeSnapshot(snapshot: Snapshot, passcode?: string): Promise<string> {
  let flags = 0;
  let body = new TextEncoder().encode(JSON.stringify(snapshot));
  if (typeof CompressionStream !== 'undefined') {
    body = await pipe(body, new CompressionStream('deflate-raw'));
    flags |= FLAG_COMPRESSED;
  }
  if (passcode) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passcode, salt);
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, body));
    body = concat(salt, iv, cipher);
    flags |= FLAG_ENCRYPTED;
  }
  return toBase64Url(concat(Uint8Array.of(flags), body));
}

export function isProtected(token: string): boolean {
  try {
    return (fromBase64Url(token)[0] & FLAG_ENCRYPTED) !== 0;
  } catch {
    return false;
  }
}

export async function decodeSnapshot(token: string, passcode?: string): Promise<Snapshot> {
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(token);
  } catch {
    throw new InvalidLinkError('This link is malformed.');
  }
  const flags = bytes[0];
  let body = bytes.subarray(1);

  if (flags & FLAG_ENCRYPTED) {
    if (!passcode) throw new PasscodeRequiredError('This link is protected.');
    try {
      const key = await deriveKey(passcode, body.subarray(0, 16));
      body = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: body.subarray(16, 28) }, key, body.subarray(28)));
    } catch {
      throw new PasscodeRequiredError('That passcode is incorrect.');
    }
  }
  try {
    if (flags & FLAG_COMPRESSED) body = await pipe(body, new DecompressionStream('deflate-raw'));
    const snapshot = JSON.parse(new TextDecoder().decode(body)) as Snapshot;
    if (snapshot.v !== 1 || !Array.isArray(snapshot.rows)) throw new Error('bad version');
    return snapshot;
  } catch {
    throw new InvalidLinkError('This link is damaged or was created by a newer version of Spendwise.');
  }
}

/** QR codes top out around 2.9 KB in byte mode at the lowest error-correction level. */
export const QR_MAX_LENGTH = 2900;
