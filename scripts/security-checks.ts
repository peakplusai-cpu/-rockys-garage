import assert from "node:assert/strict";
import { passwordMatches } from "../lib/auth";
import { allowRate } from "../lib/rate-limit";
import { isBlockedAdminPassword, resolveSessionSecret, safeEqual, safeImageUrl } from "../lib/guards";
import { MAX_UPLOAD_BYTES, sniffImage } from "../lib/images";
import { issueUploadProof, verifyUploadProof } from "../lib/upload-ticket";
import { canonicalInstagramUrl, isAllowedInstagramUrl } from "../lib/instagram";
import { isAllowedLineUrl, lineTarget } from "../lib/line";
import { hashPassword, verifyPassword } from "../lib/password";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
assert.equal(MAX_UPLOAD_BYTES, 30 * 1024 * 1024);
assert.equal(sniffImage(jpeg)?.contentType, "image/jpeg");
assert.equal(sniffImage(png)?.contentType, "image/png");
assert.equal(sniffImage(Buffer.concat([jpeg, Buffer.alloc(64)]))?.ext, "jpg");
assert.equal(sniffImage(Buffer.from("<svg></svg><html>")), null);
assert.equal(sniffImage(Buffer.alloc(0)), null);

assert.equal(safeImageUrl("javascript:alert(1)"), "");
assert.equal(safeImageUrl("data:text/html,hi"), "");
assert.equal(safeImageUrl("/uploads/../etc/passwd"), "");
assert.equal(safeImageUrl("/uploads/photo.jpg"), "/uploads/photo.jpg");
assert.equal(safeImageUrl("https://cdn.example/a.jpg"), "https://cdn.example/a.jpg");
assert.equal(safeImageUrl("https://user:pass@cdn.example/a.jpg"), "");

assert.equal(isAllowedLineUrl("https://line.me/R/ti/p/@rockysgarage"), true);
assert.equal(isAllowedLineUrl("https://lin.ee/abc"), true);
assert.equal(isAllowedLineUrl("https://evil.example/line"), false);
assert.equal(lineTarget("https://evil.example", "").addFriendWeb, "");
assert.equal(lineTarget("", "@rockysgarage").addFriendWeb, "https://line.me/R/ti/p/@rockysgarage");
assert.equal(isAllowedInstagramUrl("https://instagram.com/rockysgarage"), true);
assert.equal(isAllowedInstagramUrl("https://evil.com/ig"), false);
assert.equal(canonicalInstagramUrl("http://instagram.com/rockysgarage"), "https://instagram.com/rockysgarage");

assert.equal(safeEqual("abc", "abc"), true);
assert.equal(safeEqual("abc", "abcd"), false);

const hash = hashPassword("correct-horse");
assert.equal(verifyPassword("correct-horse", hash), true);
assert.equal(verifyPassword("wrong-horse", hash), false);
assert.equal(verifyPassword("x".repeat(500), hash), false);

const env = process.env as Record<string, string | undefined>;
const previous = {
  NODE_ENV: env.NODE_ENV,
  SESSION_SECRET: env.SESSION_SECRET,
  ADMIN_PASSWORD: env.ADMIN_PASSWORD,
};

env.NODE_ENV = "production";
env.SESSION_SECRET = "change-me-in-production";
assert.equal(resolveSessionSecret(), null);
env.SESSION_SECRET = "";
assert.equal(resolveSessionSecret(), null);
env.SESSION_SECRET = "a-real-secret-that-is-not-the-example";
assert.equal(resolveSessionSecret(), "a-real-secret-that-is-not-the-example");
const uploadPath = `in/${"ab".repeat(16)}`;
const uploadProof = issueUploadProof(uploadPath);
assert.ok(uploadProof);
assert.equal(verifyUploadProof(uploadPath, uploadProof), true);
assert.equal(verifyUploadProof(`in/${"cd".repeat(16)}`, uploadProof), false);
assert.equal(verifyUploadProof("../rocky-uploads/secret", uploadProof), false);
env.ADMIN_PASSWORD = "rocky-admin-2026";
assert.equal(isBlockedAdminPassword("rocky-admin-2026"), true);
assert.equal(passwordMatches("rocky-admin-2026", hash), false);
env.ADMIN_PASSWORD = "unique-admin-password";
assert.equal(passwordMatches("unique-admin-password", null), true);
assert.equal(passwordMatches("not-the-password", hash), false);

env.NODE_ENV = "development";
delete env.SESSION_SECRET;
assert.equal(resolveSessionSecret(), "rockys-garage-local-session");
env.ADMIN_PASSWORD = "rocky-admin-2026";
assert.equal(passwordMatches("rocky-admin-2026", null), true);

env.NODE_ENV = previous.NODE_ENV;
env.SESSION_SECRET = previous.SESSION_SECRET;
env.ADMIN_PASSWORD = previous.ADMIN_PASSWORD;

const key = `test:${Date.now()}`;
assert.equal(allowRate(key, 2, 60_000), true);
assert.equal(allowRate(key, 2, 60_000), true);
assert.equal(allowRate(key, 2, 60_000), false);

console.log("security checks passed");
