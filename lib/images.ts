export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type SniffedImage = {
  ext: "jpg" | "png" | "gif" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
};

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString("ascii");
}

/** Identify a photo by its leading bytes. Client filenames and Content-Type are ignored. */
export function sniffImage(buffer: Buffer): SniffedImage | null {
  if (buffer.length < 12 || buffer.length > MAX_UPLOAD_BYTES) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: "png", contentType: "image/png" };
  }
  const gif = ascii(buffer, 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") {
    return { ext: "gif", contentType: "image/gif" };
  }
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WEBP") {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}
