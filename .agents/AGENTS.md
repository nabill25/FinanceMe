# Agent Rules for FinanceMe

## Auto Push & Auto Deploy
Setiap kali agent berhasil menambahkan fitur baru, memperbaiki bug, atau melakukan perubahan signifikan pada kode aplikasi, agent **DIWAJIBKAN** untuk mengeksekusi perintah git berikut secara berurutan agar kode otomatis ter-deploy ke Vercel:

1. `git add .`
2. `git commit -m "Deskripsi singkat perubahan"`
3. `git push origin main` (atau nama branch utama jika bukan main)

Jika terjadi *error* otentikasi saat `git push`, abaikan dan mintalah pengguna untuk melakukan push secara manual.
