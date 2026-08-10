# Project SLA & Incentive --- Implementation Specification

## 1. Tujuan

Dokumen ini mendefinisikan versi sederhana dari modul **Project SLA &
Incentive** tanpa mengubah formula bisnis utama.

Scope hanya mencakup:

1.  Incentive Profile
2.  SLA / Delivery Performance
3.  Perhitungan incentive project
4.  Pembagian incentive ke anggota project

Hal seperti payroll period, payroll adjustment, recalculation batch, dan
workflow payroll tidak termasuk scope versi ini.

------------------------------------------------------------------------

# 2. Konsep Utama

Sistem menggunakan satu **Incentive Profile** sebagai sumber
konfigurasi.

Incentive Profile menentukan:

-   nilai project berdasarkan Mandays
-   persentase incentive untuk Support
-   poin berdasarkan level PIC
-   poin berdasarkan peran dalam project
-   multiplier berdasarkan hasil delivery project

Alur perhitungan:

``` text
Project Mandays
      ↓
Base Score
      ↓
Support Pool + Technical Pool
      ↓
Poin PIC + Poin Role
      ↓
Base Incentive per Employee
      ↓
SLA Delivery Result
      ↓
Delivery Multiplier
      ↓
Final Incentive
```

------------------------------------------------------------------------

# 3. Incentive Profile

## 3.1 Fungsi

Incentive Profile adalah kumpulan aturan yang digunakan untuk menghitung
incentive.

Contoh:

``` text
Profile: Incentive 2026
Status: Active
```

Satu profile memiliki:

-   Manday Score Rules
-   Support Percentage
-   PIC Level Points
-   Project Role Points
-   Delivery Multiplier Rules

Profile harus dapat memiliki versi agar perubahan aturan tidak mengubah
hasil project yang sudah dihitung.

------------------------------------------------------------------------

## 3.2 Table: incentive_profiles

  -------------------------------------------------------------------------
  Column            Type                          Required Description
  ----------------- ---------------- --------------------- ----------------
  id                bigint                             Yes Primary key

  code              varchar(50)                        Yes Kode unik
                                                           profile

  name              varchar(150)                       Yes Nama profile

  description       text                                No Penjelasan
                                                           profile

  version           integer                            Yes Nomor versi

  status            enum                               Yes `draft`,
                                                           `active`,
                                                           `inactive`,
                                                           `archived`

  effective_from    date                               Yes Tanggal mulai
                                                           berlaku

  effective_to      date                                No Tanggal akhir
                                                           berlaku

  support_percent   decimal(5,4)                       Yes Persentase untuk
                                                           Support, contoh
                                                           `0.10` = 10%

  created_by        bigint                             Yes User pembuat

  updated_by        bigint                              No User terakhir
                                                           yang mengubah

  created_at        datetime                           Yes Waktu dibuat

  updated_at        datetime                           Yes Waktu diubah
  -------------------------------------------------------------------------

### Rules

-   `code + version` harus unik.
-   `support_percent` harus berada pada `0` sampai `1`.
-   Profile `active` tidak boleh diedit langsung.
-   Perubahan profile dibuat sebagai versi baru.
-   Profile yang sudah digunakan untuk perhitungan tidak boleh dihapus.

------------------------------------------------------------------------

# 4. Manday Score

## 4.1 Fungsi

Manday menentukan **Base Score** project.

Contoh konfigurasi:

``` text
1–3 MD    → 10
4–8 MD    → 20
9–15 MD   → 30
16+ MD    → 40
```

Angka di atas adalah contoh berdasarkan rule yang diberikan. Nilai final
dapat diubah melalui Incentive Profile.

------------------------------------------------------------------------

## 4.2 Table: incentive_manday_rules

  ----------------------------------------------------------------------------------
  Column                 Type                          Required Description
  ---------------------- ---------------- --------------------- --------------------
  id                     bigint                             Yes Primary key

  incentive_profile_id   bigint                             Yes FK ke
                                                                incentive_profiles

  min_mandays            integer                            Yes Manday minimum

  max_mandays            integer                             No Manday maksimum,
                                                                null berarti tanpa
                                                                batas

  base_score             decimal(12,4)                      Yes Nilai dasar project

  sort_order             integer                            Yes Urutan rule

  created_at             datetime                           Yes Waktu dibuat

  updated_at             datetime                           Yes Waktu diubah
  ----------------------------------------------------------------------------------

### Rules

-   `min_mandays >= 1`
-   `max_mandays` boleh null.
-   Jika tidak null, `max_mandays >= min_mandays`.
-   Range tidak boleh overlap.
-   Setiap manday yang valid harus memiliki satu rule.

------------------------------------------------------------------------

# 5. PIC Level Points

## 5.1 Fungsi

PIC Level menentukan bobot berdasarkan tingkat/jabatan orang dalam
project.

Contoh:

``` text
Manager  → 4
Section  → 3
SPV      → 2
Officer  → 1
```

Nilai ini dapat diubah melalui Incentive Profile.

------------------------------------------------------------------------

## 5.2 Table: incentive_pic_level_rules

  Column                 Type              Required Description
  ---------------------- --------------- ---------- --------------------------
  id                     bigint                 Yes Primary key
  incentive_profile_id   bigint                 Yes FK ke incentive_profiles
  level_code             varchar(50)            Yes Kode level
  level_name             varchar(100)           Yes Nama level
  points                 decimal(12,4)          Yes Poin level
  created_at             datetime               Yes Waktu dibuat
  updated_at             datetime               Yes Waktu diubah

### Rules

-   Satu level hanya boleh muncul sekali dalam satu profile.
-   `points >= 0`.

------------------------------------------------------------------------

# 6. Project Role Points

## 6.1 Fungsi

Project Role menentukan bobot berdasarkan peran seseorang dalam project.

Contoh:

``` text
PM         → 2
Production → 1
```

Support tidak menggunakan formula poin teknis. Support mendapatkan
bagian dari Support Pool.

------------------------------------------------------------------------

## 6.2 Table: incentive_project_role_rules

  Column                 Type              Required Description
  ---------------------- --------------- ---------- --------------------------
  id                     bigint                 Yes Primary key
  incentive_profile_id   bigint                 Yes FK ke incentive_profiles
  role_code              varchar(50)            Yes Kode role
  role_name              varchar(100)           Yes Nama role
  points                 decimal(12,4)          Yes Poin role
  is_support             boolean                Yes Menandai role Support
  created_at             datetime               Yes Waktu dibuat
  updated_at             datetime               Yes Waktu diubah

### Rules

-   Satu role hanya boleh muncul sekali dalam satu profile.
-   `points >= 0`.
-   Role Support ditandai menggunakan `is_support = true`.
-   Jangan menentukan Support berdasarkan nama role secara hardcode.

------------------------------------------------------------------------

# 7. SLA / Delivery

## 7.1 Fungsi

SLA hanya menentukan performa waktu delivery project.

Input:

``` text
Target Finish
Actual Finish
```

Kemudian:

``` text
Difference Days = Actual Finish - Target Finish
```

Hasil:

``` text
Difference < 0 → Early
Difference = 0 → On Time
Difference > 0 → Late
```

------------------------------------------------------------------------

# 8. Project SLA Fields

Field berikut berada pada table `projects`.

  ------------------------------------------------------------------------------
  Column                 Type                          Required Description
  ---------------------- ---------------- --------------------- ----------------
  target_start_date      date                                No Target mulai
                                                                project

  target_end_date        date                               Yes Target selesai
                                                                project

  actual_start_date      date                                No Tanggal project
                                                                benar-benar
                                                                dimulai

  actual_end_date        date             Yes untuk calculation Tanggal project
                                                                selesai

  mandays                decimal(12,2)                      Yes Jumlah Mandays
                                                                project

  incentive_profile_id   bigint                             Yes Profile yang
                                                                digunakan
                                                                project
  ------------------------------------------------------------------------------

### Catatan

Untuk perhitungan delivery utama, gunakan:

``` text
difference_days = actual_end_date - target_end_date
```

Jika sistem menggunakan hari kerja, kalender kerja harus konsisten untuk
seluruh perhitungan.

------------------------------------------------------------------------

# 9. Delivery Multiplier

Delivery Multiplier disimpan di Incentive Profile.

Contoh:

``` text
Early       → 1.10
On Time     → 1.00
Late       → 0.80
Late berat  → 0.00
```

Rule final seperti `Late < 30` atau `Late >= 31` harus dikonfigurasi
secara eksplisit agar tidak ada hari yang tidak memiliki rule.

------------------------------------------------------------------------

## 9.1 Table: incentive_delivery_rules

  Column                 Type             Required Description
  ---------------------- -------------- ---------- --------------------------
  id                     bigint                Yes Primary key
  incentive_profile_id   bigint                Yes FK ke incentive_profiles
  name                   varchar(100)          Yes Nama rule
  min_difference_days    integer                No Batas minimum
  max_difference_days    integer                No Batas maksimum
  multiplier             decimal(8,4)          Yes Nilai multiplier
  sort_order             integer               Yes Urutan rule
  created_at             datetime              Yes Waktu dibuat
  updated_at             datetime              Yes Waktu diubah

### Contoh

``` text
min    max    multiplier
------------------------
null   -1     1.10
0      0      1.00
1      30     0.80
31     null   0.00
```

Jika bisnis memutuskan hari ke-30 masuk kategori lain, rule harus
disesuaikan. Sistem tidak boleh memiliki gap.

------------------------------------------------------------------------

# 10. Project Team

Untuk menghitung incentive, setiap anggota project yang ikut dalam
pembagian incentive harus memiliki:

  Field          Description
  -------------- -------------------------
  employee_id    User/karyawan
  project_role   Peran dalam project
  pic_level      Level PIC
  is_support     Apakah termasuk Support

Contoh:

``` text
Pak Dede
PIC Level: Manager
Project Role: PM
Support: No
```

``` text
Mba Jihan
PIC Level: -
Project Role: Support
Support: Yes
```

------------------------------------------------------------------------

# 11. Formula Incentive

## Step 1 --- Base Score

Cari rule Manday yang sesuai.

``` text
base_score = manday_rule.base_score
```

Contoh:

``` text
Mandays = 6
Base Score = 20
```

------------------------------------------------------------------------

## Step 2 --- Support Pool

``` text
support_pool = base_score × support_percent
```

Contoh:

``` text
20 × 10%
= 2
```

------------------------------------------------------------------------

## Step 3 --- Technical Pool

``` text
technical_pool = base_score - support_pool
```

Contoh:

``` text
20 - 2
= 18
```

------------------------------------------------------------------------

# 12. Step 4 --- Individual Weight

Untuk setiap anggota non-Support:

``` text
individual_weight
=
PIC Level Points + Project Role Points
```

Contoh:

``` text
Pak Dede
Manager = 4
PM = 2

Weight = 6
```

``` text
Mas Yugas
Section = 3
Production = 1

Weight = 4
```

------------------------------------------------------------------------

# 13. Step 5 --- Base Incentive

Hitung total weight seluruh anggota non-Support.

Contoh:

``` text
Dede   = 6
Yugas  = 4
Fanan  = 3
Wahyu  = 2

Total Weight = 15
```

Kemudian:

``` text
base_incentive_employee
=
individual_weight / total_weight × technical_pool
```

Contoh Dede:

``` text
6 / 15 × 18
= 7.2
```

Support mendapatkan:

``` text
support_incentive
=
support_pool
```

Jika terdapat lebih dari satu Support, Support Pool dibagi rata kepada
seluruh Support.

------------------------------------------------------------------------

# 14. Step 6 --- SLA Multiplier

Setelah Base Incentive selesai, tentukan multiplier berdasarkan delivery
project.

``` text
difference_days
=
actual_end_date - target_end_date
```

Kemudian cari delivery rule yang cocok.

Contoh:

``` text
Target : 30 August
Actual : 28 August

Difference = -2
Status = Early
Multiplier = 1.10
```

------------------------------------------------------------------------

# 15. Step 7 --- Final Incentive

Untuk semua anggota:

``` text
final_incentive
=
base_incentive × delivery_multiplier
```

Contoh:

``` text
Dede
7.2 × 1.10
= 7.92
```

``` text
Yugas
4.8 × 1.10
= 5.28
```

``` text
Fanan
3.6 × 1.10
= 3.96
```

``` text
Wahyu
2.4 × 1.10
= 2.64
```

Support:

``` text
2 × 1.10
= 2.20
```

Total:

``` text
7.92 + 5.28 + 3.96 + 2.64 + 2.20
= 22.00
```

**Delivery Multiplier berlaku sama untuk seluruh anggota dalam satu
project.**

------------------------------------------------------------------------

# 16. Calculation Result

Untuk menyimpan hasil perhitungan, gunakan dua table sederhana.

## Table: project_incentive_calculations

  Column                 Type              Required Description
  ---------------------- --------------- ---------- ------------------------------
  id                     bigint                 Yes Primary key
  project_id             bigint                 Yes Project
  incentive_profile_id   bigint                 Yes Profile yang digunakan
  mandays                decimal(12,2)          Yes Mandays saat calculation
  base_score             decimal(12,4)          Yes Base Score
  support_percent        decimal(5,4)           Yes Support percentage
  support_pool           decimal(12,4)          Yes Total Support Pool
  technical_pool         decimal(12,4)          Yes Total Technical Pool
  target_end_date        date                   Yes Target finish yang digunakan
  actual_end_date        date                   Yes Actual finish yang digunakan
  difference_days        integer                Yes Selisih hari
  delivery_status        enum                   Yes `early`, `on_time`, `late`
  delivery_multiplier    decimal(8,4)           Yes Multiplier yang digunakan
  total_incentive        decimal(12,4)          Yes Total hasil incentive
  calculated_at          datetime               Yes Waktu calculation

------------------------------------------------------------------------

## Table: project_incentive_items

Satu row untuk satu employee dalam calculation.

  Column                Type              Required Description
  --------------------- --------------- ---------- ------------------------------
  id                    bigint                 Yes Primary key
  calculation_id        bigint                 Yes FK ke calculation
  employee_id           bigint                 Yes Employee
  employee_name         varchar(150)           Yes Nama saat calculation
  project_role          varchar(100)           Yes Role saat calculation
  pic_level             varchar(100)            No Level PIC saat calculation
  is_support            boolean                Yes Support atau bukan
  pic_points            decimal(12,4)          Yes Poin PIC
  role_points           decimal(12,4)          Yes Poin role
  weight_points         decimal(12,4)          Yes Total weight
  weight_ratio          decimal(12,8)           No Rasio pembagian
  base_incentive        decimal(12,4)          Yes Incentive sebelum multiplier
  delivery_multiplier   decimal(8,4)           Yes Multiplier project
  final_incentive       decimal(12,4)          Yes Incentive akhir

Nama dan nilai disimpan sebagai hasil calculation agar perubahan data
employee/profile di kemudian hari tidak mengubah hasil calculation
sebelumnya.

------------------------------------------------------------------------

# 17. Rounding

Perhitungan internal menggunakan decimal.

Jangan membulatkan setiap tahap.

Urutan:

``` text
Raw Calculation
      ↓
Final Incentive
      ↓
Rounding
```

Contoh:

``` text
Internal: 7.916666
Display:  7.92
```

------------------------------------------------------------------------

# 18. Aturan Penting

1.  Satu project menggunakan satu Incentive Profile untuk calculation.
2.  Mandays menentukan Base Score.
3.  Support mengambil persentase dari Base Score.
4.  Sisa Base Score menjadi Technical Pool.
5.  Technical Pool dibagi berdasarkan
    `PIC Points + Project Role Points`.
6.  SLA hanya menentukan Delivery Multiplier.
7.  Delivery Multiplier berlaku untuk seluruh anggota project.
8.  Support tidak menggunakan PIC/Role Weight untuk pembagian Support
    Pool.
9.  Tidak boleh ada delivery rule yang overlap.
10. Tidak boleh ada Manday Rule yang overlap.
11. Calculation tidak dilakukan di frontend.
12. Semua nilai uang/poin menggunakan decimal.
13. Hasil calculation menyimpan nilai yang digunakan pada saat
    calculation.
14. Perubahan Incentive Profile tidak boleh mengubah hasil calculation
    lama.

------------------------------------------------------------------------

# 19. Scope Versi Ini

### Termasuk

``` text
✓ Incentive Profile
✓ Manday Score
✓ Support Percentage
✓ PIC Level Points
✓ Project Role Points
✓ Project Mandays
✓ Target Delivery
✓ Actual Delivery
✓ Delivery Difference
✓ Delivery Multiplier
✓ Incentive Calculation
✓ Incentive per Employee
```

### Belum termasuk

``` text
- Payroll Period
- Payroll Adjustment
- Payroll Export
- Recalculation Batch
- Approval Payroll
- Perhitungan incentive per Task
- Performance individual
- Formula incentive tambahan
```

Dokumen ini sengaja mempertahankan formula bisnis inti tetapi
menyederhanakan struktur implementasinya agar modul SLA dan Incentive
dapat dikembangkan terlebih dahulu.
