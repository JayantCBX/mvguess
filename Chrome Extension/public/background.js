async function configureSidePanel() {
  await chrome.sidePanel.setOptions({ path: "sidepanel.html", enabled: true });
}

chrome.runtime.onInstalled.addListener(() => {
  void configureSidePanel();
});

chrome.runtime.onStartup.addListener(() => {
  void configureSidePanel();
});
