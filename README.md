# Rocky's Garage（洛基車庫）

Next.js 15 中古車商站：庫存、車款內頁、LINE / Instagram、顧問、精選影片與 `/admin` 後台。

## 本機

```bash
cp .env.example .env.local
npm install
npm run dev
```

預設後台密碼見 `.env.example` 的 `ADMIN_PASSWORD`（本機無 Supabase 時寫入 `data/store.json`）。

## Supabase（與 Anson Top Car 同專案、獨立資料）

1. 在 SQL Editor 執行 `supabase/schema.sql`（僅建立 `rocky_*` 表與 `rocky-uploads` bucket；**勿**修改 Anson 的 `admin` / `staff` / `cars` / `site_settings`）。
2. 設定 `.env.local`：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。
3. 可選：`npm run seed:supabase`（使用 `supabase/demo-seed.json`）。

## 部署

Vercel 等環境變數同 `.env.example`；`NEXT_PUBLIC_SITE_URL` 設為正式網址。
