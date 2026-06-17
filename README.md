# Kyzen.id Plugin Generator

Web generator buat plugin & case WhatsApp bot (format shotabase-style: `handler.command` plugin + `case.js` switch-case). 7 AI provider gratisan di-race bareng ("squad mode"), hasil yang valid otomatis dipilih, terus bisa langsung di-push ke repo GitHub lo lewat GitHub Contents API.

## Cara deploy (tanpa laptop, full dari HP)

1. Buat repo baru di GitHub (atau upload project ini ke repo yang udah ada) lewat GitHub web editor / app GitHub.
   - Upload semua isi folder ini (jangan termasuk `node_modules` kalau ada).
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → import repo tadi.
3. Framework preset otomatis kedeteksi **Next.js**, gak perlu ubah apa-apa. Klik **Deploy**.
4. Tunggu build selesai, link live-nya langsung jadi.

Gak ada API key/env var yang wajib diisi — semua provider AI-nya scraping endpoint gratisan tanpa key.

## Cara pakai

1. Pilih tab **Plugin** atau **Case**.
2. Tulis deskripsi fitur yang lo mau dalam bahasa biasa (Indonesia/English campur juga oke).
3. Untuk plugin, centang flag kalau perlu (owner/admin/group/dst).
4. Pilih mode **Squad** (default, semua provider di-race, yang valid duluan menang) atau **Manual** (pilih 1 provider spesifik).
5. Klik **Generate**, tunggu squad console selesai race.
6. Cek hasil kode — ada badge "format valid" / "perlu cek manual". Bisa diedit langsung di textarea sebelum disimpan.
7. Isi bagian **Save ke GitHub**:
   - **Token**: GitHub Personal Access Token (lihat cara bikin di bawah)
   - **Repo**: format `owner/repo`, misal `fiz/shotabase`
   - **Branch**: kosongin aja buat pakai default branch repo
   - **Path**: udah auto-keisi (`plugins/<kategori>/<nama>.js` buat plugin, `case.js` buat case), bisa diedit kalau struktur repo lo beda
8. Klik **Save ke GitHub** — kelar.

### Khusus tipe Case

Hasil generate buat tipe Case itu cuma satu blok `case '...': { ... break; }`. Pas di-save, sistem otomatis:
- Ambil isi `case.js` yang ada di repo
- Cek marker `// END CODE` (sama seperti yang dipakai `case_manager.js` di base project)
- Insert blok baru tepat sebelum marker itu
- Cek dulu kalau nama case udah ada (biar gak ke-duplikat), kalau udah ada bakal ditolak duluan

Kalau base project lo gak punya marker `// END CODE` di `case.js`, save bakal gagal — tambahin dulu manual komentar itu di file `case.js` lo.

## Bikin GitHub Personal Access Token

1. GitHub app/web → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Kasih akses ke repo yang mau di-push (Repository access: Only select repositories).
3. Permission yang dibutuhin: **Contents: Read and write**.
4. Generate, copy token-nya (cuma muncul sekali).

Token cuma kesimpen di **browser lo sendiri** (localStorage, opsional via checkbox "remember"), dikirim langsung ke endpoint serverless kita yang langsung forward ke GitHub API — gak disimpan di server manapun.

## Catatan penting

- Semua 7 provider (Claude Haiku, Qwen, ChatGPT, GPT-4o-mini, DeepAI, Perplexity, Kimi) itu hasil reverse-engineer endpoint gratisan pihak ketiga, **bukan API resmi**. Sewaktu-waktu bisa down/berubah tanpa pemberitahuan — itu sebabnya squad mode penting sebagai fallback. Kalau satu provider mulai sering gagal, biarin aja, otomatis providers lain yang nutup.
- Provider **Kimi** butuh download file WASM signer dari GitHub pihak ketiga tiap cold start pertama (di-cache di memori function setelahnya). Kalau link WASM itu suatu saat mati/diganti, provider ini bakal gagal terus — gak masalah karena 6 provider lain tetap jalan.
- Free tier Vercel (Hobby) function timeout default kadang lebih kecil dari 60s tergantung plan — kalau sering timeout, coba turunin jumlah provider yang dipakai di `lib/providers/index.js`.
- AI bisa aja salah format walau udah dikasih instruksi ketat — makanya selalu ada badge validasi + opsi edit manual sebelum di-save.

## Struktur project

```
app/
  page.jsx              -> UI utama
  layout.jsx, globals.css
  api/generate/         -> endpoint squad/manual generate
  api/github-save/      -> endpoint push ke GitHub
  api/providers/        -> list provider buat dropdown
lib/
  providers/            -> adapter tiap AI provider
  squad.js              -> orkestrasi race + pilih winner
  prompts.js            -> system prompt format plugin & case
  validate.js            -> validasi format hasil generate
  github.js             -> wrapper GitHub Contents API
```
