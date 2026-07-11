import { EXTENSION_CONFIG } from "../config/extensionConfig";
import { resetPrivacyConsent } from "../lib/privacyStorage";

export function PrivacySettings({ onClose, onReset, onClear }: { onClose: () => void; onReset: () => void; onClear: () => Promise<void> }) {
  const clear = async () => { if (confirm("Clear this browser's Movie Guess Battle profile, room history, preferences, scores and privacy consent? This does not delete multiplayer-server records.")) await onClear(); };
  const reset = async () => { await resetPrivacyConsent(); onReset(); onClose(); };
  return <div className="privacy-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title"><section className="privacy-card">
    <h1 id="settings-title">Privacy, About &amp; Support</h1><p>Movie Guess Battle v{chrome.runtime.getManifest().version}</p>
    <p>Clearing local data removes information from this browser only. It does not automatically delete multiplayer-server records; use the support link for deletion requests.</p>
    <div className="privacy-links"><a href={EXTENSION_CONFIG.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">View Privacy Policy</a><a href={EXTENSION_CONFIG.termsUrl} target="_blank" rel="noopener noreferrer">View Terms</a><a href={EXTENSION_CONFIG.supportUrl} target="_blank" rel="noopener noreferrer">Support / report a problem</a></div>
    <div className="privacy-buttons"><button type="button" className="privacy-danger" onClick={() => void clear()}>Clear local data</button><button type="button" className="privacy-secondary" onClick={() => void reset()}>Reset privacy consent</button><button type="button" className="privacy-secondary" onClick={onClose}>Close</button></div>
  </section></div>;
}
