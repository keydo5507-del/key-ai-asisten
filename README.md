# KEY AI ASISTEN
Next.js 14 (App Router) + TypeScript + Tailwind + Google Gemini + **Neon Postgres** (neon.tech).

## Status jujur
Kode ditulis TANPA bisa dijalankan (tanpa internet): belum ada `npm install`, `tsc`, `build`, atau uji Gemini/Neon. Jalankan `npm run typecheck && npm run build` dan perbaiki error kecil bila ada.

## Model Gemini
- Daftar model diambil LIVE dari Gemini API (`models.list`) sesuai API key Anda, jadi semua model chat, gambar, dan Imagen yang tersedia muncul di menu model.
- Default mode (per dokumentasi Google, Okt 2026; **Gemini 2.5 dijadwalkan shutdown Okt 2026**): MAX=`gemini-4-argon`, MEDIUM=`gemini-3.8-flash`, CEPAT=`gemini-3.1-flash-lite`, gambar=`gemini-nano-banana-2.1`. ID ini belum diuji langsung; jika error "model tidak tersedia", ganti lewat env `MODEL_*` / `IMAGE_MODEL` atau pilih dari daftar.

## Fitur
Sign up/login (bcrypt, cookie HttpOnly), **lupa/reset sandi via email (Resend)**, 3 mode + semua model Gemini, chat streaming dengan **tombol Stop**, **edit pesan** & **ulangi jawaban**, riwayat di Neon, rename/hapus, Markdown + highlight + salin kode, upload foto, VN, TTS browser, **buat & edit gambar** (lampirkan foto), **ZIP proyek + revisi ZIP**, semua gambar/ZIP/lampiran **tersimpan di Neon** (bisa dibuka lagi dari riwayat), instruksi khusus, panjang jawaban, hapus riwayat/akun.

## Keterbatasan
- File disimpan sebagai base64 di tabel `files` Neon (praktis, tapi memakan kuota; free tier 0,5 GB). Untuk skala besar pindahkan ke Vercel Blob/R2.
- Rate limit in-memory per instance (ganti Upstash Redis untuk produksi). Format audio VN (webm/mp4) tidak selalu didukung Gemini. Batas body Vercel ±4,5MB (gambar ≤1MB). Preferensi tampilan (tema) belum ada.

## Setup Neon
1. Daftar di https://neon.tech, buat project.
2. Klik **Connect**, pilih **Pooled connection**, salin connection string ke `DATABASE_URL`.
3. Tabel dibuat otomatis saat request pertama. (Opsional: jalankan `db/schema.sql` di Neon SQL Editor.)

## Langkah
1. `unzip key-ai-asisten.zip && cd key-ai-asisten && npm install`
2. API key Gemini: https://aistudio.google.com/apikey
3. `cp .env.example .env.local`, isi `DATABASE_URL`, `GEMINI_API_KEY`, `AUTH_SECRET` (`openssl rand -hex 32`). Untuk reset sandi isi juga `APP_URL`, `RESEND_API_KEY` (resend.com).
4. `npm run dev` → http://localhost:3000
5. Push ke GitHub → vercel.com/new → import repo → isi env vars yang sama → Deploy.
6. Gagal? Cek Vercel → Deployments → Logs; ubah env → Redeploy.
