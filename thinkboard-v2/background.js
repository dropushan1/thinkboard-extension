// This script runs once when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  // This tells Chrome to handle the open/close behavior of the side panel
  // when the user clicks the extension's toolbar icon.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});