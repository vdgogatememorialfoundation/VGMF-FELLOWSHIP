export async function compressSignatureDataUrl(dataUrl: string, maxWidth = 600): Promise<Blob> {
  const response = await fetch(dataUrl);
  const sourceBlob = await response.blob();

  if (typeof document === "undefined") {
    return sourceBlob;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not prepare signature image"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress signature image"));
            return;
          }
          resolve(blob);
        },
        "image/png",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Invalid signature image"));
    img.src = dataUrl;
  });
}
