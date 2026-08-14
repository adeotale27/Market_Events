/* global chrome */
(function () {
  if (window !== window.top) return;
  if (document.getElementById("mp-dock-host")) return;

  const host = document.createElement("div");
  host.id = "mp-dock-host";
  const shadow = host.attachShadow({ mode: "open" });
  const logo = chrome.runtime.getURL("icons/icon48.png");
  const panel = chrome.runtime.getURL("popup.html");
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .chip {
        position: fixed; right: 0; top: 38%; z-index: 2147483646;
        display: flex; align-items: center; gap: 6px;
        background: #fff; padding: 8px 8px 8px 10px;
        border-radius: 12px 0 0 12px;
        box-shadow: -4px 6px 16px rgba(38,166,154,.12);
        cursor: pointer; font-family: system-ui, sans-serif;
      }
      .chip img { width: 28px; height: 28px; border-radius: 8px; }
      .exp {
        width: 22px; height: 22px; border-radius: 6px; background: #26a69a; color: #fff;
        display: grid; place-items: center; font-size: 13px; font-weight: 800;
      }
      .panel {
        position: fixed; right: 12px; top: 72px; bottom: 72px; width: 392px;
        z-index: 2147483646; display: none;
        border-radius: 10px; overflow: hidden;
        box-shadow: -8px 10px 28px rgba(38,166,154,.18);
        background: #fff;
      }
      .panel.on { display: block; }
      iframe { border: 0; width: 100%; height: 100%; background: #f7faf9; }
    </style>
    <div class="chip" id="chip" title="Market Pulse">
      <img src="${logo}" alt="Market Pulse" />
      <div class="exp">↗</div>
    </div>
    <div class="panel" id="panel"><iframe src="${panel}"></iframe></div>
  `;
  document.documentElement.appendChild(host);
  const chip = shadow.getElementById("chip");
  const pane = shadow.getElementById("panel");
  chip.addEventListener("click", () => pane.classList.toggle("on"));
})();
