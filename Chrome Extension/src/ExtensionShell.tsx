import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { PanelRightOpen, ShieldCheck } from "lucide-react";
import { GameApp } from "../../src/game/GameApp";
import { EXTENSION_CONFIG } from "./config/extensionConfig";
import { clearLocalData, getPrivacyConsent, savePrivacyConsent } from "./lib/privacyStorage";
import { PrivacyDisclosure } from "./privacy/PrivacyDisclosure";
import { PrivacySettings } from "./privacy/PrivacySettings";

interface ExtensionShellProps {
  surface: "popup" | "sidepanel";
}

async function openSidePanel() {
  if (!chrome.sidePanel?.open) return;
  const currentWindow = await chrome.windows.getCurrent();
  if (currentWindow.id === undefined) return;
  await chrome.sidePanel.open({ windowId: currentWindow.id });
  window.close();
}

export function ExtensionShell({ surface }: ExtensionShellProps) {
  const [consentReady, setConsentReady] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    void getPrivacyConsent().then((consent) => {
      setAccepted(Boolean(consent?.accepted && consent.version === EXTENSION_CONFIG.privacyDisclosureVersion));
      setConsentReady(true);
    });
  }, []);

  const accept = async () => {
    await savePrivacyConsent({ accepted: true, version: EXTENSION_CONFIG.privacyDisclosureVersion, acceptedAt: new Date().toISOString() });
    setAccepted(true);
  };

  return (
    <div className={`extension-surface extension-surface-${surface}`}>
      <header className="extension-bar">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">Movie Guess Battle</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{surface === "popup" ? "Popup game" : "Live side panel"}</p>
        </div>
        {surface === "popup" ? (
          <div className="extension-actions">
            <button type="button" onClick={() => setPrivacyOpen(true)} className="extension-panel-button" title="Privacy and support"><ShieldCheck className="h-4 w-4" /> Privacy</button>
            <button type="button" onClick={() => void openSidePanel()} className="extension-panel-button" title="Continue in the side panel"><PanelRightOpen className="h-4 w-4" /> Side panel</button>
          </div>
        ) : <span className="h-2 w-2 rounded-full bg-cinema-teal shadow-[0_0_12px_rgba(53,208,186,.7)]" aria-label="Live" />}
      </header>
      {!consentReady ? <main className="extension-status" role="status">Loading local settings…</main> : accepted ? <ExtensionErrorBoundary><GameApp /></ExtensionErrorBoundary> : <PrivacyDisclosure onAccept={accept} />}
      {privacyOpen ? <PrivacySettings onClose={() => setPrivacyOpen(false)} onReset={() => setAccepted(false)} onClear={async () => { await clearLocalData(); setAccepted(false); }} /> : null}
    </div>
  );
}

class ExtensionErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Avoid logging player or room state. */ }
  render() {
    if (this.state.failed) return <main className="extension-status"><h1>Movie Guess Battle hit a problem</h1><p>Your local data is still available. Reload the extension to try again.</p><button type="button" className="privacy-primary" onClick={() => location.reload()}>Reload extension</button></main>;
    return this.props.children;
  }
}
