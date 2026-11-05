'use strict';
/*
 * Nodewise vault support.
 *
 * The user's app data is encrypted in the browser before it is stored or
 * synced. Supabase stores one encrypted envelope per vault. The project URL
 * is public. The anon key is also a public client key and is filled in after
 * the Supabase API settings step. The passcode is never stored or sent.
 */
(function (global) {
  const SUPABASE_URL = 'https://vfgxyxftnjupuxxzsnvt.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZ3h5eGZ0bmp1cHV4eHpzbnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4OTM2MjQsImV4cCI6MjEwOTQ2OTYyNH0.S14hQOKNfbe_5Ji4ULoeXJmbO2QBOr5UcJIA60xSkgI';
  const TABLE = 'vaults';
  const FORMAT = 'nodewise-vault';
  const VERSION = 1;
  const DEFAULT_ITERATIONS = 210000;

  function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function textToBytes(value) {
    return new TextEncoder().encode(value);
  }

  function bytesToText(bytes) {
    return new TextDecoder().decode(bytes);
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function requireCrypto() {
    if (!global.crypto || !global.crypto.subtle) {
      throw new Error('This browser does not provide the encryption tools this app needs.');
    }
  }

  async function deriveLocator(passcode) {
    requireCrypto();
    const digest = await global.crypto.subtle.digest(
      'SHA-256',
      textToBytes('nodewise/vault-locator/v1\n' + passcode)
    );
    return bytesToHex(new Uint8Array(digest));
  }

  async function deriveKey(passcode, salt, iterations) {
    requireCrypto();
    const material = await global.crypto.subtle.importKey(
      'raw',
      textToBytes(passcode),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return global.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: salt,
        iterations: iterations || DEFAULT_ITERATIONS
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function makeSession(passcode) {
    const salt = global.crypto.getRandomValues(new Uint8Array(16));
    const iterations = DEFAULT_ITERATIONS;
    return {
      locator: await deriveLocator(passcode),
      key: await deriveKey(passcode, salt, iterations),
      salt: salt,
      iterations: iterations
    };
  }

  async function encryptWithSession(session, data, version, updatedAt) {
    const stamp = updatedAt || new Date().toISOString();
    const payload = JSON.stringify({
      data: data,
      version: version,
      updatedAt: stamp
    });
    const iv = global.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await global.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      session.key,
      textToBytes(payload)
    );
    return {
      format: FORMAT,
      v: VERSION,
      kdf: 'PBKDF2',
      hash: 'SHA-256',
      iterations: session.iterations,
      salt: bytesToBase64(session.salt),
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted)),
      version: version,
      updatedAt: stamp
    };
  }

  async function decryptEnvelope(passcode, envelope) {
    if (!envelope || envelope.format !== FORMAT || envelope.v !== VERSION) {
      throw new Error('This backup or saved list uses a format this app cannot read.');
    }
    const salt = base64ToBytes(envelope.salt);
    const iterations = envelope.iterations || DEFAULT_ITERATIONS;
    const key = await deriveKey(passcode, salt, iterations);
    let plain;
    try {
      plain = await global.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
        key,
        base64ToBytes(envelope.data)
      );
    } catch (e) {
      const err = new Error('That passcode did not open this list.');
      err.code = 'wrong-passcode';
      throw err;
    }
    const payload = JSON.parse(bytesToText(new Uint8Array(plain)));
    return {
      data: payload.data,
      version: payload.version || envelope.version || 0,
      updatedAt: payload.updatedAt || envelope.updatedAt || null,
      session: {
        locator: await deriveLocator(passcode),
        key: key,
        salt: salt,
        iterations: iterations
      }
    };
  }

  function syncConfigured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  }

  function remoteHeaders(extra) {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (extra) Object.assign(headers, extra);
    return headers;
  }

  async function remoteError(response) {
    let detail = '';
    try { detail = await response.text(); } catch (e) {}
    const err = new Error('Sync failed with status ' + response.status + (detail ? ': ' + detail.slice(0, 240) : ''));
    err.status = response.status;
    return err;
  }

  async function fetchRemote(locator) {
    if (!syncConfigured()) return null;
    const url = SUPABASE_URL + '/rest/v1/' + TABLE +
      '?select=id,blob,version,updated_at&id=eq.' + encodeURIComponent(locator);
    const response = await fetch(url, { headers: remoteHeaders() });
    if (!response.ok) throw await remoteError(response);
    const rows = await response.json();
    if (!rows.length) return null;
    return {
      envelope: JSON.parse(rows[0].blob),
      version: rows[0].version,
      updatedAt: rows[0].updated_at
    };
  }

  async function pushRemote(locator, envelope) {
    if (!syncConfigured()) return false;
    const url = SUPABASE_URL + '/rest/v1/' + TABLE;
    const response = await fetch(url, {
      method: 'POST',
      headers: remoteHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify([{
        id: locator,
        blob: JSON.stringify(envelope),
        version: envelope.version,
        updated_at: envelope.updatedAt
      }])
    });
    if (!response.ok) throw await remoteError(response);
    return true;
  }

  async function deleteRemote(locator) {
    if (!syncConfigured()) return false;
    const url = SUPABASE_URL + '/rest/v1/' + TABLE +
      '?id=eq.' + encodeURIComponent(locator);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: remoteHeaders({ Prefer: 'return=minimal' })
    });
    if (!response.ok) throw await remoteError(response);
    return true;
  }

  global.NodewiseVault = {
    DEFAULT_ITERATIONS: DEFAULT_ITERATIONS,
    syncConfigured: syncConfigured,
    deriveLocator: deriveLocator,
    makeSession: makeSession,
    encryptWithSession: encryptWithSession,
    decryptEnvelope: decryptEnvelope,
    fetchRemote: fetchRemote,
    pushRemote: pushRemote,
    deleteRemote: deleteRemote
  };
})(typeof window !== 'undefined' ? window : globalThis);
