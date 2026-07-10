import { PanelRightOpen } from "lucide-react";
import { GameApp } from "../../src/game/GameApp";

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
  return (
    <div className={`extension-surface extension-surface-${surface}`}>
      <header className="extension-bar">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">Movie Guess Battle</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{surface === "popup" ? "Popup game" : "Live side panel"}</p>
        </div>
        {surface === "popup" ? (
          <button type="button" onClick={() => void openSidePanel()} className="extension-panel-button" title="Continue in the side panel">
            <PanelRightOpen className="h-4 w-4" />
            Side panel
          </button>
        ) : <span className="h-2 w-2 rounded-full bg-cinema-teal shadow-[0_0_12px_rgba(53,208,186,.7)]" aria-label="Live" />}
      </header>
      <GameApp />
    </div>
  );
}
