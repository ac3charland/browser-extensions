// This service worker keeps the extension loaded in memory
// to reduce the delay when opening the popup

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Bookmark Express extension installed');
});

// Keep the service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, extension ready');
});