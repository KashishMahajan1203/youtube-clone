// Grab a still frame from a local video file and return it as a JPEG blob.
// Used to generate a thumbnail automatically when the creator doesn't pick one.
export async function captureFrame(
  file: File,
  maxWidth = 1280
): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  const waitFor = (event: string) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 8000);
      video.addEventListener(
        event,
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
      video.addEventListener(
        "error",
        () => {
          clearTimeout(timer);
          reject(new Error("video error"));
        },
        { once: true }
      );
    });

  try {
    await waitFor("loadeddata");
    // A second in (or a third of the way through very short clips) avoids
    // the black frame many videos start with.
    const target = Math.min(1, (video.duration || 0) / 3);
    if (target > 0) {
      video.currentTime = target;
      await waitFor("seeked");
    }

    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((video.videoWidth || 1280) * scale);
    canvas.height = Math.round((video.videoHeight || 720) * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85)
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
