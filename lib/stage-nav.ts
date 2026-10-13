export function transitionTo(navigate: () => void) {
  const start = document.startViewTransition?.bind(document);
  if (!start) {
    navigate();
    return;
  }
  const arrived = new Promise<void>((resolve) => {
    const timeout = window.setTimeout(finish, 900);
    const observer = new MutationObserver(() => {
      if (document.querySelector(".stage-enter")) finish();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    function finish() {
      window.clearTimeout(timeout);
      observer.disconnect();
      resolve();
    }
  });
  start(() => {
    navigate();
    return arrived;
  });
}

export function playAloud(video: HTMLVideoElement | null) {
  if (!video) return;
  video.muted = false;
  const pending = video.play();
  if (pending && typeof pending.catch === "function") void pending.catch(() => undefined);
}
