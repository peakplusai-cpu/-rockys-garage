export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export const UPLOAD_SIZE_ERROR = "照片需為 30MB 以內的 JPEG、PNG、GIF 或 WebP。";
export const UPLOAD_TYPE_ERROR = "只接受 JPEG、PNG、GIF 或 WebP 照片。";

export type SniffedImage = {
  ext: "jpg" | "png" | "gif" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
};

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

/** Identify a photo by its leading bytes. Filenames and Content-Type are ignored. */
export function sniffImageBytes(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: "png", contentType: "image/png" };
  }
  const gif = ascii(bytes, 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") {
    return { ext: "gif", contentType: "image/gif" };
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}

export function sniffImage(buffer: Uint8Array): SniffedImage | null {
  return sniffImageBytes(buffer);
}
