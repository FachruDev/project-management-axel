    # Panduan Pembuatan Project Quotation

Dokumen ini menjelaskan cara membuat, mengubah, dan mencetak Project Quotation berdasarkan implementasi aktual di codebase `helpdesk`.

Referensi implementasi:

- Route: `routes/web.php`
- Controller: `app/Http/Controllers/Admin/ProjectQuotationController.php`
- Model: `app/Models/Project/ProjectQuotation.php`
- Item model: `app/Models/Project/ProjectQuotationItem.php`
- View list/create/edit/print: `resources/views/admin/projects/quotations`
- Permission: `Project Quotation Access`

## 1. Tujuan Fitur

Project Quotation dipakai untuk membuat dokumen penawaran internal berdasarkan project yang sudah disetujui. Quotation berisi informasi customer, tipe quotation, tanggal, item pekerjaan, nilai harga, pajak, total akhir, catatan, tanda tangan, dan halaman print.

Fitur ini tidak membuat project baru. Quotation selalu terkait ke project yang sudah ada.

## 2. Akses Menu

Menu:

```text
Projects -> Project Quotations
```

URL:

```text
GET /admin/projects/quotations
```

User wajib memiliki permission:

```text
Project Quotation Access
```

Jika user tidak memiliki permission tersebut, sistem mengembalikan `403`.

## 3. Route Yang Tersedia

```text
GET  /admin/projects/quotations              -> daftar quotation
GET  /admin/projects/quotations/create       -> form create quotation
POST /admin/projects/quotations              -> simpan quotation baru
GET  /admin/projects/quotations/{id}/edit    -> form edit quotation
POST /admin/projects/quotations/{id}         -> update quotation
GET  /admin/projects/quotations/{id}/print   -> print preview quotation
```

Saat ini tidak ada route delete, void, atau approval quotation.

## 4. Syarat Sebelum Membuat Quotation

Sebelum membuat Project Quotation, pastikan:

1. User memiliki permission `Project Quotation Access`.
2. Project sudah dibuat.
3. Project sudah memiliki `approval_status = Approved`.
4. Data customer project sebaiknya sudah diisi agar nama dan alamat customer bisa otomatis masuk ke form.
5. Minimal satu item quotation harus diisi.

Quotation tidak bisa dibuat untuk project yang belum approved. Validasi ini ada di backend, bukan hanya di UI.

## 5. Daftar Quotation

Halaman daftar quotation menampilkan:

- Date
- Quotation No
- Project
- Customer
- Type
- Status
- Grand Total
- Updated By
- Action

Action yang tersedia:

- `Edit`: membuka form edit quotation.
- `Print`: membuka print preview quotation di tab baru.

Data diurutkan dari quotation terbaru berdasarkan `id` terbesar.

## 6. Membuat Quotation Baru

Langkah:

1. Buka menu `Projects -> Project Quotations`.
2. Klik `Create Quotation`.
3. Isi bagian `Header Information`.
4. Isi bagian `Detail Items`.
5. Review bagian `Auto Summary`.
6. Klik `Save Quotation`.
7. Setelah berhasil, sistem redirect ke halaman edit quotation yang baru dibuat.

## 7. Header Information

### Project

Wajib diisi.

Dropdown hanya mengambil project dengan:

```text
approval_status = Approved
```

Saat memilih project, sistem mencoba mengisi otomatis:

- Customer
- Customer Address

Sumber data customer berasal dari relasi customer di project.

### Type

Wajib diisi.

Pilihan:

```text
PRJ = Project
MNT = Maintenance
```

Type berpengaruh ke:

- Nomor quotation.
- Default description.
- Category item.

Jika type `PRJ`, category item otomatis menjadi `project`.

Jika type `MNT`, category item otomatis menjadi `maintenance`.

### Status

Wajib diisi.

Pilihan status:

```text
quotation
invoiced
paid
```

Status ini hanya status administratif quotation. Status ini tidak mengubah status project.

### Date

Wajib diisi.

Tanggal ini dipakai untuk membuat nomor quotation dan default description.

### Quotation Number

Readonly.

Saat create, UI menampilkan preview:

```text
QUOT/AXEL-{TYPE}/{YEAR}/{ROMAN_MONTH}/AUTO
```

Nomor final dibuat saat data disimpan.

Format final:

```text
QUOT/AXEL-PRJ/2026/VIII/001
QUOT/AXEL-MNT/2026/VIII/001
```

Urutan nomor dihitung dari quotation yang sudah ada pada tahun/prefix terkait, lalu mengambil sequence berikutnya. Nomor tetap dicek unique sebelum dipakai.

### Customer

Wajib diisi.

Field ini bisa terisi otomatis dari customer project, tetapi tetap bisa diedit manual.

### Customer Address

Opsional.

Field ini bisa terisi otomatis dari profile customer project. Jika diisi, alamat tampil di print preview di bawah nama customer dan pada area metadata `Alamat Customer`.

Catatan teknis: sistem masih menyimpan field legacy `customer_identifier`, tetapi form aktif saat ini memakai `customer_address`.

### Description

Opsional.

Jika kosong, backend otomatis mengisi template berdasarkan type dan tanggal:

```text
Project Development for August 2026
Maintenance for August 2026
```

Tombol `Use Template` di form mengisi description dengan template yang sama.

### CC

Opsional.

Free text, contoh:

```text
Finance
Director, Finance
```

Nilai CC akan tampil pada area customer di print preview.

### Term of Payment

Opsional.

Default saat create mengikuti tanggal hari ini.

### Quotation Valid Until

Opsional.

Default saat create adalah satu bulan setelah tanggal hari ini.

### Approved / Signature

Opsional.

Nama ini dipakai sebagai nama tanda tangan di print preview. Jika kosong, print preview memakai `prepared_by_name`. Jika keduanya kosong, area tanda tangan menampilkan titik-titik.

### Prepared By

Field ini hidden pada form.

Saat create, default diisi dari nama user login.

### Tax (PPN / PPH) %

Opsional.

Aturan:

- Numeric.
- Minimal `0`.
- Maksimal `100`.
- Mendukung desimal, contoh `11` atau `1.5`.

Tax dihitung dari subtotal:

```text
tax = subtotal * ppn_pph_percent / 100
grand_total = subtotal + tax
```

### QR URL

Opsional.

Harus berupa URL valid jika diisi.

Default:

```text
https://www.axeltekno.com
```

Print preview membuat QR image dari URL ini memakai endpoint eksternal:

```text
https://api.qrserver.com/v1/create-qr-code/
```

### Note

Opsional.

Ditampilkan pada bagian `Note` di print preview.

## 8. Detail Items

Minimal harus ada satu item.

Tombol yang tersedia:

- `Add Item`: menambah satu baris item.
- `Add 5 Items`: menambah lima baris item sekaligus.
- Icon trash: menghapus baris item.

Sistem tidak mengizinkan semua baris dihapus dari UI; minimal satu baris tetap tersedia.

### Category

Readonly dari sisi user.

Category mengikuti Type quotation:

```text
PRJ -> project
MNT -> maintenance
```

Nilai category tetap dikirim sebagai hidden input per item.

### Unit

Wajib diisi.

Saat ini pilihan unit hanya:

```text
mandays
```

### Description Item

Wajib diisi.

Gunakan untuk menjelaskan pekerjaan atau layanan yang ditawarkan.

Contoh:

```text
Implementation service
Development dashboard monitoring
Maintenance support application
```

### Qty

Opsional, numeric, minimal `0`.

Jika Qty dan Unit Price diisi, Amount dihitung otomatis.

### Unit Price

Opsional, numeric, minimal `0`.

Jika Qty dan Unit Price diisi, Amount dihitung otomatis.

### Discount

Wajib diisi.

Format wajib memakai persen:

```text
0%
5%
12.5%
```

Nilai harus berada di antara `0%` sampai `100%`.

### Amount

Opsional, numeric, minimal `0`.

Rumus:

```text
base = qty * unit_price
discount_value = base * discount_percent / 100
amount = base - discount_value
```

Jika Qty dan Unit Price tidak lengkap, backend memakai nilai Amount yang diinput manual.

## 9. Auto Summary

Form menampilkan ringkasan otomatis:

- Category Applied
- Subtotal
- Tax
- Grand Total

Subtotal adalah total seluruh `amount` item.

Grand Total adalah subtotal ditambah tax.

Perhitungan dilakukan di UI untuk preview dan dihitung ulang di backend saat save. Backend tetap menjadi source of truth.

## 10. Simpan Quotation

Saat save, backend melakukan:

1. Cek permission `Project Quotation Access`.
2. Validasi payload.
3. Pastikan project yang dipilih sudah `Approved`.
4. Generate quotation number untuk create.
5. Hitung ulang item amount, subtotal, tax, dan grand total.
6. Simpan header quotation.
7. Simpan semua item quotation.
8. Redirect ke halaman edit quotation.

Create dan update memakai database transaction.

Pada update, semua item lama dihapus lalu diganti dengan item dari form terbaru.

## 11. Edit Quotation

Edit quotation dilakukan dari halaman list dengan tombol `Edit`.

Yang bisa diubah:

- Project
- Type
- Status
- Date
- Customer
- Customer Address
- Description
- CC
- Term of Payment
- Valid Until
- Approved / Signature
- Tax
- QR URL
- Note
- Detail Items

Quotation Number tidak digenerate ulang saat edit. Nomor lama tetap dipertahankan.

## 12. Print Preview

Print preview dibuka dari tombol `Print`.

URL:

```text
GET /admin/projects/quotations/{id}/print
```

Isi print preview:

- Logo AXEL atau fallback text `AXEL`.
- Informasi perusahaan.
- Customer name.
- Customer address.
- CC.
- Tanggal quotation.
- Nomor quotation.
- Alamat customer.
- Keterangan/description.
- Tabel item.
- Term of Payment.
- Quotation Valid Until.
- Sub Total.
- PPN / PPH.
- Total.
- Note.
- Area tanda tangan.
- QR code.

Tombol `Print` di halaman preview memanggil:

```text
window.print()
```

Layout print memakai ukuran A4 portrait.

## 13. Validasi Backend

Validasi utama:

```text
project_id              required, integer, exists:projects,id
quotation_type          required, PRJ atau MNT
quotation_date          required, date
customer_name           required, max 255
customer_address        nullable, max 2000
customer_identifier     nullable, max 120
cc                      nullable, max 1000
description             nullable
term_of_payment_date    nullable, date
valid_until_date        nullable, date
note                    nullable
prepared_by_name        nullable, max 120
approved_by_name        nullable, max 120
ppn_pph_percent         nullable, numeric, min 0, max 100
qr_target_url           nullable, url, max 255
status                  required, quotation/invoiced/paid
items                   required, array, min 1
items.*.unit            required, max 50
items.*.description     required
items.*.qty             nullable, numeric, min 0
items.*.unit_price      nullable, numeric, min 0
items.*.discount        required, format persen
items.*.amount          nullable, numeric, min 0
```

Validasi tambahan:

```text
project.approval_status harus Approved
discount_percent harus 0 sampai 100
```

## 14. Data Yang Disimpan

Tabel `project_quotations` menyimpan header:

```text
project_id
quotation_no
quotation_type
quotation_date
customer_name
customer_address
customer_identifier
cc
description
term_of_payment_date
valid_until_date
note
prepared_by_name
approved_by_name
ppn_pph_percent
subtotal
grand_total
qr_target_url
status
created_by
updated_by
```

Tabel `project_quotation_items` menyimpan item:

```text
project_quotation_id
sort_order
category
unit
description
qty
unit_price
discount_percent
amount
```

## 15. Contoh Pengisian

Header:

```text
Project: CRM Customer Database
Type: Project
Status: Quotation
Date: 2026-08-19
Customer: PT Example Customer
Customer Address: Jl. Merdeka No. 10, Jakarta
Description: Project Development for August 2026
CC: Finance
Term of Payment: 2026-08-19
Quotation Valid Until: 2026-09-19
Approved / Signature: Operation Div Head
Tax: 11
QR URL: https://www.axeltekno.com
Note: Price valid until quotation validity date.
```

Item:

```text
Category: project
Unit: mandays
Description: Implementation service
Qty: 10
Unit Price: 1000000
Discount: 0%
Amount: 10000000
```

Hasil:

```text
Subtotal: 10,000,000
Tax 11%: 1,100,000
Grand Total: 11,100,000
```

## 16. Error Yang Umum Terjadi

### Tidak bisa membuka menu

Penyebab:

```text
User belum memiliki Project Quotation Access
```

Solusi:

Berikan permission `Project Quotation Access` ke role/user yang berwenang.

### Project tidak muncul di dropdown

Penyebab:

```text
Project belum Approved
```

Solusi:

Selesaikan flow project preparation dan approval terlebih dahulu.

### Save gagal karena discount

Penyebab:

Discount tidak memakai format persen.

Contoh salah:

```text
5
abc
```

Contoh benar:

```text
5%
0%
12.5%
```

### QR URL gagal validasi

Penyebab:

Input bukan URL valid.

Contoh benar:

```text
https://www.axeltekno.com
```

### Total tidak sesuai ekspektasi

Hal yang perlu dicek:

- Qty.
- Unit Price.
- Discount.
- Amount manual.
- Tax percentage.

Catatan: jika Qty dan Unit Price diisi, backend menghitung ulang Amount dari Qty, Unit Price, dan Discount. Nilai Amount manual akan diabaikan untuk baris tersebut.

## 17. Catatan Teknis Untuk Developer

Controller saat ini masih menangani validasi, perhitungan, generate nomor, dan sync item langsung di `ProjectQuotationController`.

Jika nanti ingin dibuat lebih modular, bagian yang ideal dipindah ke service:

```text
ProjectQuotationNumberService
ProjectQuotationCalculator
ProjectQuotationApplicationService
ProjectQuotationPrintViewModel
```

Rule yang harus dipertahankan:

- Permission tetap `Project Quotation Access`.
- Quotation hanya untuk project approved.
- Quotation number readonly dan unique.
- Backend tetap menghitung ulang subtotal/grand total.
- Category item mengikuti type quotation.
- Print preview memakai data yang tersimpan, bukan hitungan UI.

## 18. Test Yang Relevan

Regression test yang sudah mencakup sebagian flow:

```text
php artisan test tests\Feature\ProjectLifecycleFlowTest.php --filter=test_project_quotation_stores_and_prints_customer_address
```

Test tersebut memastikan:

- Quotation bisa disimpan.
- Customer address tersimpan.
- Print preview menampilkan `Alamat Customer`.
- Print preview tidak lagi memakai label lama `Id Kostumer`.

Rekomendasi tambahan test jika fitur quotation dikembangkan:

- User tanpa `Project Quotation Access` tidak bisa akses index/create/store/edit/print.
- Quotation tidak bisa dibuat untuk project non-approved.
- Nomor quotation auto-increment per type/tahun/bulan.
- Amount dihitung ulang saat Qty dan Unit Price tersedia.
- Amount manual dipakai saat Qty dan Unit Price tidak lengkap.
- Update quotation mengganti item lama dengan item baru.
- Status quotation hanya menerima `quotation`, `invoiced`, `paid`.
