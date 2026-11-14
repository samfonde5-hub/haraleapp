/**
 * Phone camera photos are 3–8 MB. We shrink them ON THE PHONE before upload
 * (max 1280px, WebP ~100 KB) — saves patient's data pack + our free storage.
 */
export async function compressImage(file: File, maxSide = 1280, quality = 0.72): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality))
  if (blob && blob.type === 'image/webp') return blob
  // Old iPhones don't encode WebP → JPEG fallback
  return (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality)))!
}
