// Development-only canvas capture. The recording contains the artwork alone;
// status and download controls are DOM elements, outside the captured canvas.
export function recordPreview(canvas: HTMLCanvasElement, seconds = 60) {
  const panel = document.createElement("aside");
  panel.id = "recording-status";
  panel.textContent = `Recording ${seconds} seconds of the globe…`;
  document.body.append(panel);
  const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8"].find(
    (type) => MediaRecorder.isTypeSupported(type),
  );
  if (!mimeType) throw new Error("This browser cannot record WebM video.");
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 12_000_000,
  });
  const chunks: Blob[] = [];
  let url: string | undefined;
  let disposed = false;
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.onstop = () => {
    for (const track of stream.getTracks()) track.stop();
    if (disposed) return;
    const clip = new Blob(chunks, { type: mimeType });
    url = URL.createObjectURL(clip);
    const link = document.createElement("a");
    link.href = url;
    link.download = "globe-slow-rotation.webm";
    link.textContent = "Download rotation video";
    panel.replaceChildren(link);
    panel.dataset.bytes = String(clip.size);
  };
  recorder.start(1000);
  const timer = window.setTimeout(() => recorder.stop(), seconds * 1000);
  return () => {
    disposed = true;
    clearTimeout(timer);
    if (recorder.state !== "inactive") recorder.stop();
    for (const track of stream.getTracks()) track.stop();
    if (url) URL.revokeObjectURL(url);
    panel.remove();
  };
}
