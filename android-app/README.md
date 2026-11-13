# FinanceMe untuk Android (APK)

Folder ini adalah proyek Android **Trusted Web Activity (TWA)** yang dibuat dengan
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). Aplikasinya membuka
https://financeme-three.vercel.app layar penuh lewat Chrome, jadi setiap perubahan di
situs langsung ikut tanpa perlu membuat APK baru.

APK siap pasang ada di `../FinanceMe.apk` (tidak di-commit ke Git). Berjalan di
**Android 7.0 ke atas** (termasuk Android 8.1), dengan Chrome terpasang di HP. APK ditandatangani
skema v1 + v2 + v3 agar installer di HP lama pun bisa memeriksanya.

## File penting yang tidak ada di Git

| File | Isi |
| --- | --- |
| `android.keystore` | Kunci tanda tangan aplikasi |
| `signing.local.properties` | Password kunci tersebut |

**Backup keduanya** (misalnya ke Google Drive pribadi). Kalau hilang, APK versi berikutnya
tidak bisa memperbarui aplikasi yang sudah terpasang di HP — pengguna harus uninstall dulu.
Jangan bagikan atau commit kedua file ini.

## Layar penuh tanpa bilah alamat

Chrome hanya menyembunyikan bilah alamat bila situs memuat
`public/.well-known/assetlinks.json` yang berisi sidik jari SHA-256 dari `android.keystore`.
Kalau kunci diganti, perbarui sidik jarinya:

```bash
keytool -list -v -keystore android.keystore -alias financeme
```

## Membangun ulang APK

Butuh JDK 17 dan Android SDK (sudah ada lewat Android Studio). Dari folder ini:

```bash
# 1. Naikkan versi di twa-manifest.json & app/build.gradle (versionCode +1, versionName)
# 2. Build
JAVA_HOME="C:/Program Files/Java/jdk-17" ./gradlew assembleRelease
# 3. Rapikan & tanda tangani (build-tools 35.0.0 dari Android SDK)
BT="$LOCALAPPDATA/Android/Sdk/build-tools/35.0.0"
"$BT/zipalign" -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release-aligned.apk
"$BT/apksigner.bat" sign --ks android.keystore --ks-key-alias financeme --v1-signing-enabled true --out ../FinanceMe.apk app-release-aligned.apk
"$BT/apksigner.bat" verify --print-certs ../FinanceMe.apk
```

`apksigner` akan menanyakan password (lihat `signing.local.properties`).
