const FULLSCREEN_REQUESTED_KEY = "clat-test-room-fullscreen-requested";

function rememberFullscreenRequest() {
  try {
    window.sessionStorage.setItem(FULLSCREEN_REQUESTED_KEY, "true");
  } catch {
    // Storage can be unavailable in strict privacy modes.
  }
}

export function requestTestRoomFullscreen() {
  if (typeof document === "undefined") {
    return Promise.resolve(false);
  }

  rememberFullscreenRequest();

  if (document.fullscreenElement) {
    return Promise.resolve(true);
  }

  return document.documentElement
    .requestFullscreen({ navigationUI: "hide" })
    .then(() => true)
    .catch(() => false);
}
