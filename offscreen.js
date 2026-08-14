/* global chrome */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "play-alert") return;
  const a = document.getElementById("chime");
  if (a) {
    a.currentTime = 0;
    a.play().catch(() => {});
  }
});
