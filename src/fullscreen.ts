export function setupFullscreen(button: HTMLButtonElement) {
  const events = new AbortController();
  const syncVisibility = () => {
    button.hidden =
      !document.fullscreenEnabled || document.fullscreenElement !== null;
  };

  button.addEventListener(
    "click",
    async () => {
      button.disabled = true;
      try {
        // Native fullscreen preserves the browser's Escape-to-exit behaviour.
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.warn("Fullscreen could not be opened:", error);
      } finally {
        button.disabled = false;
        syncVisibility();
      }
    },
    { signal: events.signal },
  );
  document.addEventListener("fullscreenchange", syncVisibility, {
    signal: events.signal,
  });
  document.addEventListener(
    "keydown",
    (event) => {
      // Embedded browsers may forward Escape without exiting fullscreen.
      // Leave the default action intact for browsers that handle it natively.
      if (event.key === "Escape" && document.fullscreenElement) {
        void document.exitFullscreen().catch((error: unknown) => {
          console.warn("Fullscreen could not be closed:", error);
        });
      }
    },
    { signal: events.signal },
  );
  syncVisibility();

  return () => events.abort();
}
