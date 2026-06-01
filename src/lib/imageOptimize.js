/**
 * Resize uploaded photos for faster mobile gallery loads (max width, JPEG quality).
 * Falls back to original bytes if sharp is unavailable.
 */
export async function optimizeUploadImage(bytes, ext) {
  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(bytes, { failOn: "none" }).rotate();
    const meta = await image.metadata();
    const pipeline =
      meta.width && meta.width > 1400
        ? image.resize({ width: 1400, withoutEnlargement: true })
        : image;
    const outExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    if (outExt === "png") {
      return pipeline.png({ compressionLevel: 8 }).toBuffer();
    }
    if (outExt === "webp") {
      return pipeline.webp({ quality: 82 }).toBuffer();
    }
    return pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch {
    return bytes;
  }
}
