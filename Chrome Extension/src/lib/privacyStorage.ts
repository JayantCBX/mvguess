import { EXTENSION_CONFIG } from "../config/extensionConfig";

export interface PrivacyConsent { accepted: boolean; version: string; acceptedAt: string | null; }
const CONSENT_KEY = "movieGuessBattle.privacyConsent";

function chromeStorageAvailable() { return typeof chrome !== "undefined" && Boolean(chrome.storage?.local); }

export async function getPrivacyConsent(): Promise<PrivacyConsent | null> {
  if (!chromeStorageAvailable()) {
    try { const raw = localStorage.getItem(CONSENT_KEY); return raw ? JSON.parse(raw) as PrivacyConsent : null; } catch { return null; }
  }
  return new Promise((resolve) => chrome.storage.local.get(CONSENT_KEY, (items) => resolve((items[CONSENT_KEY] as PrivacyConsent | undefined) ?? null)));
}

export async function savePrivacyConsent(consent: PrivacyConsent): Promise<void> {
  if (!chromeStorageAvailable()) { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); return; }
  await chrome.storage.local.set({ [CONSENT_KEY]: consent });
}

export async function resetPrivacyConsent(): Promise<void> {
  await savePrivacyConsent({ accepted: false, version: EXTENSION_CONFIG.privacyDisclosureVersion, acceptedAt: null });
}

export async function clearLocalData(): Promise<void> {
  if (!chromeStorageAvailable()) { localStorage.clear(); return; }
  await chrome.storage.local.clear();
}
