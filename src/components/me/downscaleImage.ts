/** Center-crops an image file to a square and downsizes it to a small JPEG data URL (fits easily in localStorage). */
export async function fileToAvatarDataUrl(file: File, size = 256, quality = 0.84): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not_an_image");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("empty_image");
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas");
    ctx.imageSmoothingQuality = "high";
    // JPEG has no alpha: paint the theme background first so transparent PNGs don't turn black-on-black oddly.
    ctx.fillStyle = "#12161d";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_decode_failed"));
    img.src = src;
  });
}
