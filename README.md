# Rocky's Garage（洛基車庫）

Next.js 15 中古車商站：庫存、車款內頁、LINE / Instagram、顧問、精選影片與 `/admin` 後台。

## 本機

```bash
cp .env.example .env.local
npm install
npm run dev
```

本機開發（`npm run dev`）若未設定 `ADMIN_PASSWORD`，第一次建立 `data/store.json` 時使用 `rocky-admin-2026`。這個密碼只供本機，正式環境會拒絕它。正式環境必須另外設定 `ADMIN_PASSWORD` 與 `SESSION_SECRET`，否則後台無法登入。請在 Vercel 設定這兩個變數後重新部署。

既有 Supabase 專案請再執行 `supabase/migrations/20261112_hide_staff_line_user_id.sql`，避免匿名金鑰讀到顧問的 LINE user id，以及 `supabase/migrations/20261112_upload_30mb.sql`，讓 `rocky-uploads` 接受 30MB 的 JPEG、PNG、GIF 與 WebP。正式環境的照片由瀏覽器直接上傳到 Supabase，不會經過 Vercel Function。`supabase/schema.sql` 已包含同樣的設定。

## Supabase（與 Anson Top Car 同專案、獨立資料）

1. 在 SQL Editor 執行 `supabase/schema.sql`（僅建立 `rocky_*` 表與 `rocky-uploads` bucket；**勿**修改 Anson 的 `admin` / `staff` / `cars` / `site_settings`）。
2. 設定 `.env.local`：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。
3. 可選：`npm run seed:supabase`（使用 `supabase/demo-seed.json`）。

## 部署

Vercel 等環境變數同 `.env.example`；`NEXT_PUBLIC_SITE_URL` 設為正式網址。`ADMIN_PASSWORD` 與 `SESSION_SECRET` 請使用未公開的隨機值，不要沿用範例或舊的預設密碼。若目前仍用已公開的預設密碼登入，部署後請先在環境變數放入新的 `ADMIN_PASSWORD` 再重新登入。
