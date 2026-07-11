import { EXTENSION_CONFIG } from "../config/extensionConfig";

export function PrivacyDisclosure({ onAccept }: { onAccept: () => Promise<void> }) {
  return <main className="privacy-card" aria-labelledby="privacy-title">
    <h1 id="privacy-title">Before you play multiplayer</h1>
    <p>Movie Guess Battle uses your display name, anonymous player/device identifiers, room code, score, custom movie titles and gameplay actions to create and synchronise private multiplayer game rooms.</p>
    <p>This information is sent to the Movie Guess Battle multiplayer service. Some game information is shared with other players in the room. Data is not sold or used for personalised advertising.</p>
    <div className="privacy-links"><a href={EXTENSION_CONFIG.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">Privacy Policy</a><a href={EXTENSION_CONFIG.termsUrl} target="_blank" rel="noopener noreferrer">Terms of Use</a></div>
    <div className="privacy-buttons"><button type="button" className="privacy-primary" onClick={() => void onAccept()}>Agree and Continue</button><button type="button" className="privacy-secondary" onClick={() => window.close()}>Not Now</button></div>
  </main>;
}
