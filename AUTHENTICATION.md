# Dual Authentication Contract

Dokumen ini adalah landasan umum untuk membuat integrasi autentikasi dengan
dua metode:

1. Legacy authentication memakai query `user_id`.
2. SSO authentication memakai query `token` AES-256-GCM.

Dokumen ini sengaja tidak membahas tabel bisnis, role internal aplikasi, atau
permission modul tertentu. Setelah identitas user berhasil dikenali, otorisasi
fitur tetap menjadi tanggung jawab aplikasi tujuan.

## Tujuan

Gunakan kontrak ini saat sebuah aplikasi perlu mendukung dua Gate Apps sekaligus:

- Gate Apps lama yang hanya bisa mengirim `user_id`.
- Gate Apps baru yang mengirim token SSO.

Kedua metode harus tetap aktif selama masa transisi. Jangan menghapus metode
legacy `user_id` sampai semua entry point lama benar-benar dimigrasikan.

## Ringkasan Metode

| Metode | Pengirim | URL masuk | Isi identitas | Keamanan |
| --- | --- | --- | --- | --- |
| Legacy `user_id` | Gate Apps lama | `/target?user_id=<user_id>` | User ID langsung dari query string | Lemah, dipertahankan untuk kompatibilitas |
| SSO `token` | Gate Apps baru | `/target?token=<aes-token>` | Email terenkripsi dalam token | Lebih baik, token bertanda AES-GCM dan kedaluwarsa |

## Prioritas Identitas

Implementasi aplikasi tujuan harus memakai aturan ini:

1. Jika query `token` ada dan tidak kosong, proses metode SSO token.
2. Jika token valid, ambil identitas dari token dan lanjutkan request.
3. Jika token invalid, return HTTP 401 atau halaman akses ditolak.
4. Jika tidak ada token, proses metode legacy `user_id`.
5. Jika tidak ada token dan tidak ada `user_id`, aplikasi boleh menolak request
   atau memakai fallback legacy sesuai kebutuhan aplikasinya.

Token invalid tidak boleh fallback ke `guest`, `anonymous`, atau `user_id`
lain. Fallback seperti itu akan menyembunyikan error SSO dan membuat debugging
salah arah.

## Metode 1: Legacy `user_id`

### Format URL

```text
/target?user_id=<user_id>
```

Contoh:

```text
/dashboard?user_id=d.daryanto
```

### Field yang wajib dikirim

| Field | Lokasi | Wajib | Keterangan |
| --- | --- | --- | --- |
| `user_id` | Query string | Ya | Identitas user dari Gate Apps lama. |

### Field yang disarankan tersedia di aplikasi tujuan

| Field/kolom | Wajib | Keterangan |
| --- | --- | --- |
| `user_id` atau `userid` | Ya | Identifier yang akan dicocokkan dengan query `user_id`. |
| `email` | Opsional | Berguna jika aplikasi ingin menyamakan legacy user dengan SSO email. |
| `is_active` atau status sejenis | Disarankan | Untuk menolak user yang sudah tidak aktif. |

Nama kolom boleh berbeda antar aplikasi, tetapi harus ada satu identifier
kanonik yang dapat dicocokkan dengan nilai `user_id` dari query string.

### Cara kerja minimal

1. Gate Apps lama membuka URL aplikasi tujuan dengan query `user_id`.
2. Aplikasi tujuan membaca `user_id` dari query string.
3. Aplikasi tujuan mencari user lokal berdasarkan identifier tersebut.
4. Jika user ditemukan dan aktif, request dianggap terautentikasi.
5. Jika user tidak ditemukan atau tidak aktif, request ditolak.

### Batasan keamanan

`user_id` adalah teks biasa di URL dan mudah dipalsukan. Jangan mengambil role,
admin flag, permission, atau hak akses dari query string. Semua hak akses harus
dibaca dari data aplikasi tujuan.

## Metode 2: SSO `token`

### Format URL

```text
/target?token=<aes-token>
```

Contoh:

```text
/dashboard?token=BASE64_AES_GCM_TOKEN
```

Jika aplikasi dibuka lewat reverse proxy atau iframe portal, URL dapat memiliki
prefix tambahan sesuai desain portal:

```text
/embed-menu/51/dashboard?token=BASE64_AES_GCM_TOKEN
```

### Field yang wajib dikirim

| Field | Lokasi | Wajib | Keterangan |
| --- | --- | --- | --- |
| `token` | Query string | Ya | Token AES-256-GCM dari Gate Apps baru. |

### Konfigurasi shared key

Aplikasi pengirim dan aplikasi tujuan harus memakai shared key yang sama.

| Field/env | Lokasi | Wajib | Keterangan |
| --- | --- | --- | --- |
| `PORTAL_SSO_SHARED_KEY` | Environment aplikasi tujuan | Ya | Base64 encoded 32-byte AES key. |
| `login_shared_key_enc` atau field setara | Database/config Gate Apps baru | Ya | Shared key terenkripsi di sisi Gate Apps. Setelah didecrypt hasilnya base64 AES key yang sama. |
| `login_token_type` atau field setara | Database/config Gate Apps baru | Disarankan | Nilai seperti `aes-query` untuk menandai aplikasi memakai token query AES. |

Jangan commit shared key asli ke source control.

### Format token

Token memakai AES-256-GCM.

Plaintext sebelum dienkripsi:

```text
<email>:<timestamp_epoch_ms>
```

Contoh plaintext:

```text
d.daryanto@galenium.com:1785480000000
```

Format token setelah dienkripsi:

```text
base64(iv_12_bytes + ciphertext + auth_tag_16_bytes)
```

Token bukan JSON dan bukan user ID. Response endpoint Gate Apps boleh berupa:

```json
{ "token": "..." }
```

Namun isi terenkripsi token tetap string `email:timestamp`.

### Field payload token

| Field | Sumber | Wajib | Keterangan |
| --- | --- | --- | --- |
| `email` | Data user Gate Apps baru | Ya | Email user login. Digunakan aplikasi tujuan untuk mencari user lokal. |
| `timestamp_epoch_ms` | Waktu Gate Apps membuat token | Ya | Unix timestamp dalam milidetik. Dipakai untuk expiry token. |

### Masa berlaku token

Rekomendasi validasi:

| Aturan | Nilai |
| --- | --- |
| Maksimal umur token | 5 menit |
| Toleransi clock skew | 5 detik |

Token yang lebih tua dari batas tersebut harus ditolak.

### Cara kerja minimal

1. User login ke Gate Apps baru.
2. Gate Apps baru memastikan user punya akses ke aplikasi/menu tujuan.
3. Gate Apps baru mengambil `user.email`.
4. Gate Apps baru membuat payload `email:Date.now()`.
5. Payload dienkripsi dengan AES-256-GCM.
6. Gate Apps baru membuka aplikasi tujuan dengan query `token`.
7. Aplikasi tujuan decrypt token memakai shared key.
8. Aplikasi tujuan memvalidasi timestamp.
9. Aplikasi tujuan mencari user lokal berdasarkan email atau kandidat mapping.
10. Jika user ditemukan dan aktif, request dianggap terautentikasi.

### Contoh pembuat token di Gate Apps

```js
const user = await getUserWithRoles(req.session.userId);
const key = Buffer.from(decryptSecret(app.login_shared_key_enc), "base64");
const token = buildAesToken(key, `${user.email}:${Date.now()}`);
res.json({ token });
```

### Mapping email ke user lokal

Aplikasi tujuan harus menentukan identifier lokal yang akan dicocokkan dengan
email dari token.

Mapping yang disarankan:

Jika token berisi:

```text
d.daryanto@galenium.com
```

Coba cari user lokal dengan kandidat:

```text
d.daryanto@galenium.com
d.daryanto
```

Jika input awal hanya username:

```text
d.daryanto
```

Coba cari:

```text
d.daryanto
d.daryanto@galenium.com
```

Field/kolom user lokal yang disarankan:

| Field/kolom | Wajib | Keterangan |
| --- | --- | --- |
| `email` | Disarankan | Cocok langsung dengan email dari token. |
| `user_id` atau `userid` | Disarankan | Cocok dengan local-part email atau legacy identifier. |
| `is_active` atau status sejenis | Disarankan | Untuk menolak user nonaktif. |

Aplikasi boleh hanya punya `user_id`/`userid` tanpa kolom `email`, selama
mapping dari email token ke identifier lokal jelas dan terdokumentasi.

## Reverse Proxy atau Iframe Embed

Jika aplikasi tujuan dibuka lewat portal/reverse proxy dan bukan dari root
domain aplikasinya sendiri, aplikasi harus mendukung prefix embed.

Contoh header dari portal:

```text
X-Portal-Embed-Prefix: /embed-menu/51
```

Aplikasi tujuan sebaiknya membagikan prefix tersebut ke frontend, misalnya:

```js
window.EMBED_PREFIX = "/embed-menu/51";
```

Frontend harus membangun URL API dan asset dengan prefix:

```js
fetch(`${window.EMBED_PREFIX || ''}/api-or-route`)
```

Hindari path root-absolute yang mengabaikan embed prefix:

```js
fetch('/api-or-route')
window.location.href = '/'
```

Jika prefix tidak dipakai, request dapat salah arah ke root portal, bukan ke
aplikasi tujuan. Gejalanya bisa terlihat seperti token hilang, redirect ke
guest, iframe keluar ke halaman portal, atau data tidak termuat.

## Endpoint Diagnostik Opsional

Aplikasi tujuan boleh menyediakan halaman admin-only untuk mengecek token.

Fungsi diagnostik yang disarankan:

- paste token dari Gate Apps baru,
- decrypt token,
- tampilkan valid/tidak valid,
- tampilkan email dari token,
- tampilkan timestamp dan umur token,
- tampilkan kandidat mapping user lokal,
- tampilkan apakah user lokal ditemukan.

Jangan pernah menampilkan shared key.

## Checklist Implementasi

Gunakan checklist ini saat membuat autentikasi serupa:

- Tetap dukung dua metode: `user_id` dan `token`.
- Jika `token` ada, prioritaskan token.
- Token invalid harus ditolak, bukan fallback ke legacy user.
- Token berisi `email:timestamp`, bukan JSON dan bukan user ID.
- Shared key harus base64 encoded 32-byte key untuk AES-256-GCM.
- Shared key asli hanya di environment/secret store, bukan source code.
- Aplikasi tujuan harus punya cara mapping email token ke user lokal.
- Status aktif, role, permission, atau admin flag harus dibaca dari aplikasi
  tujuan, bukan dari query string.
- Legacy `user_id` hanya dipakai untuk kompatibilitas Gate Apps lama.
- Jika memakai iframe/reverse proxy, semua URL frontend harus prefix-aware.
- Tambahkan test untuk token valid, token invalid, token expired, dan legacy
  `user_id`.

## Contoh URL

Legacy:

```text
https://target-app.example.test/dashboard?user_id=d.daryanto
```

SSO baru langsung:

```text
https://target-app.example.test/dashboard?token=<aes-token>
```

SSO baru lewat portal embed:

```text
https://portal.example.test/embed-menu/51/dashboard?token=<aes-token>
```
