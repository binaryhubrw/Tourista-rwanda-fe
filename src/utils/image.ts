const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Reads an image file, scales it down to fit `maxDim` and re-encodes it as
 * JPEG. Keeps uploads small enough for the in-browser demo store; with a real
 * backend this is where the file would be uploaded instead.
 */
export async function imageFileToDataUrl(file: File, maxDim = 1280, quality = 0.74): Promise<string> {
  if (!file.type.startsWith('image/')) throw { message: `“${file.name}” isn’t an image. Use JPG, PNG or WebP.` };
  if (file.size > MAX_BYTES) throw { message: `“${file.name}” is larger than 15 MB.` };

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject({ message: `“${file.name}” couldn’t be read as an image.` });
      el.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw { message: 'This browser can’t process images.' };
    ctx.fillStyle = '#fff'; // flatten transparent PNGs onto white
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
