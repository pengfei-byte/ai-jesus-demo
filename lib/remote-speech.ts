export function speechHoldMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(20000, 1400 + words * 420);
}

export function isLoud(samples: ArrayLike<number>, threshold = 12): boolean {
  if (!samples.length) return false;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const delta = samples[i] - 128;
    sum += delta * delta;
  }
  return Math.sqrt(sum / samples.length) >= threshold;
}

type Capturable = HTMLVideoElement & { captureStream?: () => MediaStream };

export function watchRemoteSpeech(video: HTMLVideoElement, onSpeaking: (speaking: boolean) => void): () => void {
  let stopped = false;
  let poll = 0;
  let ctx: AudioContext | null = null;
  const stop = () => {
    stopped = true;
    window.clearInterval(poll);
    void ctx?.close();
  };
  const capture = (video as Capturable).captureStream?.bind(video);
  if (!capture || typeof AudioContext === "undefined") return stop;

  let tries = 0;
  const wait = window.setInterval(() => {
    if (stopped) return;
    tries += 1;
    try {
      const stream = capture();
      if (!stream.getAudioTracks().length) {
        if (tries > 25) window.clearInterval(wait);
        return;
      }
      window.clearInterval(wait);
      listen(stream);
    } catch {
      window.clearInterval(wait);
    }
  }, 200);

  function listen(stream: MediaStream) {
    if (stopped) return;
    ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let speaking = false;
    let quietAt = 0;
    poll = window.setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      if (isLoud(samples)) {
        quietAt = 0;
        if (!speaking) {
          speaking = true;
          onSpeaking(true);
        }
        return;
      }
      if (!speaking) return;
      if (!quietAt) quietAt = Date.now();
      if (Date.now() - quietAt >= 700) {
        speaking = false;
        quietAt = 0;
        onSpeaking(false);
      }
    }, 120);
  }

  return () => {
    window.clearInterval(wait);
    stop();
  };
}
