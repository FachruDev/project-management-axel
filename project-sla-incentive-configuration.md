# Requirements Konfigurasi SLA Project dan Incentive Payroll

Dokumen ini melengkapi `project-module-technical-requirements.md` dengan spesifikasi khusus untuk konfigurasi SLA/delivery dan perhitungan incentive karyawan. Karena hasilnya menyangkut insentif/gaji, semua rule harus versioned, auditable, locked setelah dipakai, dan dapat disimulasikan sebelum aktif.

Istilah "SLA" di dokumen ini mengacu ke SLA delivery project, bukan SLA ticket. SLA project menentukan apakah project selesai early, on time, atau late, lalu mempengaruhi multiplier incentive.

## 1. Prinsip Payroll-Grade

Requirement wajib:

- Semua profile SLA/incentive harus punya periode berlaku.
- Profile yang sudah dipakai untuk payroll/incentive run tidak boleh diedit langsung.
- Perubahan rule harus membuat versi baru atau draft baru.
- Semua calculation run menyimpan snapshot rule yang dipakai.
- Semua hasil incentive bisa diaudit ulang tanpa bergantung pada master data yang mungkin sudah berubah.
- Recalculation harus explicit, permission-based, dan menyimpan before/after.
- Tidak boleh ada perhitungan incentive hanya di frontend.
- Semua angka payroll memakai decimal, bukan float.
- Semua tanggal memakai timezone konsisten dan tersimpan UTC.

## 2. Konsep Utama

SLA/incentive terdiri dari beberapa layer:

1. SLA Profile
   - Mengatur periode berlaku, kalender kerja, start/end delivery policy, dan baseline penalty/reward.

2. Manday Score
   - Mengubah kompleksitas project dari mandays menjadi base score.

3. Delivery Rule
   - Mengubah selisih target vs actual menjadi multiplier.

4. Team Distribution
   - Membagi score ke member berdasarkan role, PIC level, dan support allocation.

5. Payroll Run
   - Mengunci hasil per periode agar dapat dipakai untuk pembayaran.

## 3. Data Model Konfigurasi

### 3.1 sla_profiles

Gunakan table terpisah atau perluas `incentive_profiles`. Untuk aplikasi baru, direkomendasikan nama eksplisit `project_sla_profiles`.

```text
project_sla_profiles
- id
- code unique
- name
- description nullable
- version integer
- status enum(draft, active, inactive, archived)
- effective_from date
- effective_to date nullable
- calendar_id nullable
- timezone string default 'Asia/Jakarta'

- delivery_start_policy enum(on_approval, on_first_task_start, manual)
- delivery_end_policy enum(on_close, on_all_tasks_done, manual)
- target_source enum(plan_dates, explicit_days, both)
- actual_source enum(actual_dates, explicit_days, both)
- business_day_count_mode enum(exclusive_end, inclusive_end)

- support_percent decimal(5,4) default 0
- rounding_mode enum(none, round_2, round_4, floor_2, ceil_2)

- requires_approval boolean default true
- approved_by nullable
- approved_at nullable
- locked_at nullable
- locked_by nullable

- created_by
- updated_by
- created_at
- updated_at
```

Rules:

- `code + version` harus unique.
- Hanya satu active profile boleh berlaku untuk tanggal yang sama jika scope global.
- Jika scope per department/customer/project type dibutuhkan, tambahkan `scope_type` dan `scope_id`.
- `effective_to` tidak boleh lebih kecil dari `effective_from`.
- Active profile tidak boleh overlap untuk scope yang sama.
- Profile yang `locked_at` tidak boleh diubah.

### 3.2 sla_profile_change_requests

Karena menyangkut gaji, perubahan config sebaiknya melewati approval.

```text
sla_profile_change_requests
- id
- profile_id nullable
- action enum(create, update, activate, deactivate, archive)
- payload_before json nullable
- payload_after json
- status enum(pending, approved, rejected, cancelled)
- requested_by
- requested_at
- reviewed_by nullable
- reviewed_at nullable
- review_note nullable
```

Rules:

- User pembuat request tidak boleh approve request miliknya sendiri, kecuali superadmin override secara eksplisit.
- Approved request harus menulis audit event.

### 3.3 work_calendars

Kalender kerja wajib menjadi dependency SLA.

```text
work_calendars
- id
- code unique
- name
- timezone
- default_working_days json
- is_active
```

```text
work_calendar_days
- id
- calendar_id
- date
- is_working_day boolean
- label nullable
- source enum(default, holiday, forced_workday, manual)
- created_by
- updated_by
- unique(calendar_id, date)
```

Default working days contoh:

```json
["monday", "tuesday", "wednesday", "thursday", "friday"]
```

### 3.4 manday score rules

```text
sla_manday_score_rules
- id
- profile_id
- min_mandays integer
- max_mandays integer nullable
- base_score decimal(12,4)
- sort_order integer
```

Rules:

- Range tidak boleh overlap dalam profile yang sama.
- Tidak boleh ada gap jika bisnis ingin semua mandays punya score.
- `max_mandays = null` berarti open ended.
- `base_score` tidak boleh negatif.

Contoh:

```text
1-5 MD    -> 100 points
6-10 MD   -> 200 points
11-20 MD  -> 350 points
21+ MD    -> 500 points
```

### 3.5 delivery multiplier rules

```text
sla_delivery_multiplier_rules
- id
- profile_id
- label
- min_diff_days integer nullable
- max_diff_days integer nullable
- multiplier decimal(8,4)
- sort_order integer
```

Makna `diff_days`:

```text
diff_days = actual_finish_business_date - planned_finish_business_date
negative  = selesai lebih cepat
0         = tepat waktu
positive  = terlambat
```

Rules:

- Range tidak boleh overlap.
- Harus ada fallback open-ended untuk early ekstrem dan late ekstrem.
- `multiplier` boleh 0 jika telat berat tidak mendapat incentive.
- `multiplier` tidak boleh negatif.

Contoh:

```text
diff <= -3       -> 1.20  Early excellent
-2 to -1         -> 1.10  Early
0                -> 1.00  On time
1 to 2           -> 0.80  Slightly late
3 to 5           -> 0.50  Late
diff >= 6        -> 0.00  Severely late
```

### 3.6 PIC level points

```text
pic_levels
- id
- code unique
- name
- sort_order
- is_active
```

```text
sla_pic_level_points
- id
- profile_id
- pic_level_id
- points decimal(12,4)
- unique(profile_id, pic_level_id)
```

Contoh:

```text
Junior  -> 1
Middle  -> 2
Senior  -> 3
Lead    -> 4
```

### 3.7 project role points

```text
sla_project_role_points
- id
- profile_id
- role_code
- role_label
- points decimal(12,4)
- is_support_role boolean default false
- unique(profile_id, role_code)
```

Contoh:

```text
pm          -> 5
production  -> 3
qa          -> 2
support     -> 0, is_support_role = true
requester   -> 0
```

Catatan:

- Role `support` sebaiknya ditandai dengan `is_support_role`, bukan hardcoded string `support`.
- Role dengan points 0 tetap valid jika memang tidak mendapat technical pool.

### 3.8 project incentive runs

Run harus menyimpan snapshot lengkap.

```text
project_incentive_runs
- id
- project_id
- profile_id
- profile_code
- profile_version
- period_year
- period_month

- project_mandays
- base_score
- support_percent
- support_total
- technical_pool_total

- target_days
- actual_days
- diff_days
- deadline_status enum(early, on_time, late, na)
- delivery_multiplier
- total_final_points

- calculated_by nullable
- calculated_at
- calculation_reason enum(project_closed, manual_recalculate, member_changed, mandays_changed, profile_recalculate, scheduler)
- status enum(success, skipped, failed, voided)
- failure_reason nullable
- is_latest boolean
- is_locked boolean
- locked_at nullable
- payroll_period_id nullable

- rule_snapshot json
- project_snapshot json
- created_at
- updated_at
```

### 3.9 incentive run items

```text
project_incentive_items
- id
- run_id
- user_id
- employee_identifier nullable
- employee_name_snapshot
- project_role_code
- project_role_label
- pic_level_code nullable
- pic_level_name nullable
- is_support boolean

- pic_level_points decimal(12,4)
- role_points decimal(12,4)
- weight_points decimal(12,4)
- weight_ratio decimal(12,8)

- base_points decimal(12,4)
- multiplier decimal(8,4)
- final_points decimal(12,4)

- metadata json nullable
```

Snapshot nama/identifier penting agar laporan payroll historis tidak berubah jika data user berubah.

## 4. Formula Perhitungan SLA Delivery

### 4.1 Input tanggal

Input utama:

```text
plan_start_at
plan_end_at
actual_start_at
actual_end_at
delivery_target_days nullable
delivery_actual_days nullable
calendar_id
timezone
```

### 4.2 Target days

Jika `target_source = explicit_days`:

```text
target_days = delivery_target_days
```

Jika `target_source = plan_dates`:

```text
target_days = businessDays(plan_start_at, plan_end_at, calendar)
```

Jika `target_source = both`:

```text
target_days = delivery_target_days jika ada, selain itu businessDays(plan_start_at, plan_end_at)
```

### 4.3 Actual days

Jika `actual_source = explicit_days`:

```text
actual_days = delivery_actual_days
```

Jika `actual_source = actual_dates`:

```text
actual_days = businessDays(actual_start_at, actual_end_at, calendar)
```

Jika `actual_source = both`:

```text
actual_days = delivery_actual_days jika ada, selain itu businessDays(actual_start_at, actual_end_at)
```

### 4.4 Diff days

Payroll-grade diff harus konsisten. Direkomendasikan berbasis finish date, bukan actual days minus target days, karena incentive biasanya menilai terlambat terhadap plan end.

```text
diff_days = businessDayDiff(plan_end_at, actual_end_at, calendar)
```

Dengan arti:

```text
actual_end_at < plan_end_at  -> negative
actual_end_at = plan_end_at  -> 0
actual_end_at > plan_end_at  -> positive
```

Fallback jika finish date tidak lengkap:

```text
diff_days = actual_days - target_days
```

Fallback hanya boleh dipakai jika config `allow_duration_diff_fallback = true`.

### 4.5 Business day count

Direkomendasikan mode `exclusive_end`:

```text
businessDays(start, end) menghitung hari kerja dari start sampai sebelum end.
```

Contoh:

```text
start Senin 00:00, end Selasa 00:00 -> 1 business day
start Senin, end Senin -> 0 business day
```

Jika bisnis ingin menghitung tanggal selesai sebagai hari penuh, gunakan `inclusive_end`, tetapi harus konsisten di semua report.

### 4.6 Deadline status

```text
diff_days < 0  -> early
diff_days = 0  -> on_time
diff_days > 0  -> late
null           -> na
```

## 5. Formula Perhitungan Incentive

### 5.1 Base score

```text
base_score = score rule dari mandays project
```

Jika tidak ada range cocok:

```text
run.status = failed
failure_reason = "No manday score rule matched"
```

### 5.2 Support pool

```text
support_total = base_score * support_percent
```

Guard:

```text
support_percent minimum 0
support_percent maximum 1
support_total maximum base_score
```

Jika tidak ada support member aktif:

```text
support_total = 0
technical_pool_total = base_score
```

Jika ada support member:

```text
support_share_per_member = support_total / support_member_count
technical_pool_total = base_score - support_total
```

### 5.3 Technical weight

Untuk semua member aktif yang bukan support:

```text
weight_points = pic_level_points + role_points
total_weight = sum(weight_points semua non-support)
weight_ratio = weight_points / total_weight
base_points = weight_ratio * technical_pool_total
```

Jika `total_weight = 0`:

- Option A, strict payroll: calculation failed.
- Option B, fallback: technical pool dibagi rata.

Rekomendasi: strict payroll. Jangan bagi rata diam-diam karena menyangkut gaji.

### 5.4 Delivery multiplier

```text
delivery_multiplier = multiplier rule yang range-nya match diff_days
```

Jika tidak ada rule cocok:

```text
run.status = failed
failure_reason = "No delivery multiplier rule matched"
```

### 5.5 Multiplier policy

```text
Tidak ada multiplier tambahan setelah delivery.
delivery_multiplier dipakai langsung untuk final points.
```

Tidak ada clamp minimum atau maksimum multiplier. Jika proyek terlambat dan rule
delivery menghasilkan multiplier rendah, nilai itu langsung mempengaruhi semua
anggota project, termasuk Support.

### 5.6 Final points

Untuk support:

```text
final_points = support_share_per_member * delivery_multiplier
```

Untuk non-support:

```text
final_points = base_points * delivery_multiplier
```

Total:

```text
total_final_points = sum(final_points semua item)
```

### 5.7 Rounding

Rounding diterapkan terakhir.

Direkomendasikan:

```text
internal calculation: decimal 12,4 atau lebih
display: 2 decimal
payroll export: sesuai policy payroll, default 2 decimal
```

Jangan rounding per tahap kecuali policy payroll secara eksplisit meminta itu, karena total bisa berbeda.

## 6. Contoh Perhitungan

### 6.1 Config

```text
Mandays project = 8
Manday score 6-10 = 200
Support percent = 20% atau 0.20
Diff days = 1
Delivery multiplier untuk 1-2 hari late = 0.80
```

Members:

```text
User A: PM, Senior
User B: Production, Middle
User C: Production, Junior
User D: Support
```

Points:

```text
Role PM = 5
Role Production = 3
PIC Senior = 3
PIC Middle = 2
PIC Junior = 1
Support role = support pool
```

### 6.2 Hitung base pool

```text
base_score = 200
support_total = 200 * 0.20 = 40
technical_pool_total = 160
support_share User D = 40
```

### 6.3 Hitung weight non-support

```text
User A weight = PM 5 + Senior 3 = 8
User B weight = Production 3 + Middle 2 = 5
User C weight = Production 3 + Junior 1 = 4
total_weight = 17
```

Base points:

```text
User A = 8 / 17 * 160 = 75.2941
User B = 5 / 17 * 160 = 47.0588
User C = 4 / 17 * 160 = 37.6471
User D = 40.0000
```

Final points with multiplier 0.80:

```text
User A = 75.2941 * 0.80 = 60.2353
User B = 47.0588 * 0.80 = 37.6471
User C = 37.6471 * 0.80 = 30.1176
User D = 40.0000 * 0.80 = 32.0000
Total = 160.0000
```

## 7. Lifecycle Config SLA

### 7.1 Draft

Profile draft boleh diedit bebas oleh user dengan `incentive.config.manage`.

### 7.2 Pending approval

Jika approval config aktif:

- Draft dikirim sebagai change request.
- Reviewer melihat diff konfigurasi.
- Reviewer wajib bisa menjalankan simulation.

### 7.3 Active

Profile active:

- Bisa dipakai project baru.
- Tidak boleh diedit langsung.
- Untuk update, clone menjadi version baru.

### 7.4 Locked

Profile locked jika:

- Sudah dipakai oleh incentive run sukses.
- Sudah masuk payroll period locked.
- Sudah diarsipkan.

Locked profile:

- Tidak boleh update rule.
- Tidak boleh delete.
- Boleh view dan clone.

### 7.5 Archived

Archived:

- Tidak bisa dipilih project baru.
- Tetap bisa dipakai audit historical run.

## 8. Project Binding Rule

Saat project dibuat:

```text
project.sla_profile_id = active profile berdasarkan project_date atau plan_start_at
```

Prioritas resolve profile:

1. Manual selected profile jika actor punya permission.
2. Active profile untuk department/customer/project type.
3. Active global profile pada tanggal project.
4. Error jika tidak ada profile.

Saat project approved:

- Profile snapshot belum harus locked, tetapi project harus menyimpan `sla_profile_id`.

Saat project closed:

- Incentive run memakai profile yang terikat di project.
- Jika profile tidak ada atau incomplete, run failed/skipped dengan alasan jelas.

## 9. Payroll Period

Tambahkan payroll period untuk mengunci hasil.

```text
payroll_periods
- id
- year
- month
- status enum(open, processing, locked, paid)
- locked_by nullable
- locked_at nullable
- paid_at nullable
```

Rules:

- Incentive run period default dari `actual_end_at`.
- Jika payroll period locked, run tidak boleh direcalculate tanpa `payroll.unlock` atau adjustment flow.
- Recalculation setelah locked harus membuat adjustment, bukan overwrite.

Adjustment table:

```text
payroll_adjustments
- id
- payroll_period_id
- project_id
- user_id
- previous_points
- adjusted_points
- delta_points
- reason
- created_by
- approved_by nullable
- approved_at nullable
```

## 10. Recalculation Rule

Recalculation wajib menyimpan batch.

```text
incentive_recalculation_batches
- id
- reason
- requested_by
- requested_at
- status enum(pending, running, completed, failed, rolled_back)
- target_type enum(project, profile, period)
- target_id nullable
- metadata json
```

```text
incentive_recalculation_items
- id
- batch_id
- project_id
- before_run_id nullable
- after_run_id nullable
- status enum(success, skipped, failed)
- message nullable
```

Rules:

- Recalculate profile active akan membuat run baru untuk project terdampak.
- Run lama `is_latest = false`, tetapi tidak dihapus.
- Jika payroll period locked, buat adjustment atau blokir sesuai policy.
- Rollback batch hanya boleh jika payroll period belum locked.

## 11. Simulation Requirement

Sebelum profile aktif, sistem wajib menyediakan simulasi.

Endpoint:

```text
POST /api/sla-profiles/{profile}/simulate
```

Input:

```json
{
  "mandays": 8,
  "plan_start_at": "2026-06-01T00:00:00+07:00",
  "plan_end_at": "2026-06-10T00:00:00+07:00",
  "actual_start_at": "2026-06-01T00:00:00+07:00",
  "actual_end_at": "2026-06-11T00:00:00+07:00",
  "members": [
    {"role_code": "pm", "pic_level_code": "senior"},
    {"role_code": "production", "pic_level_code": "middle"},
    {"role_code": "support", "pic_level_code": null}
  ]
}
```

Output:

```json
{
  "base_score": "200.0000",
  "target_days": 7,
  "actual_days": 8,
  "diff_days": 1,
  "deadline_status": "late",
  "delivery_multiplier": "0.8000",
  "items": [
    {
      "role_code": "pm",
      "pic_level_code": "senior",
      "weight_points": "8.0000",
      "base_points": "114.2857",
      "final_points": "91.4286"
    }
  ],
  "total_final_points": "160.0000"
}
```

Simulation tidak menulis payroll run.

## 12. UI Configuration Requirements

### 12.1 SLA profile page

Tab:

- Profile Info
- Calendar and Delivery Policy
- Manday Score
- Delivery Multiplier
- PIC Level Points
- Role Points
- Simulation
- Approval and Audit

### 12.2 Mandatory UI behavior

- Tampilkan status profile: draft, active, locked, archived.
- Jika profile locked, semua field read-only.
- Saat edit active profile, tombol utama adalah `Clone New Version`.
- Tampilkan warning jika range overlap atau gap.
- Tampilkan preview affected projects sebelum activate/deactivate.
- Tampilkan simulation result sebelum submit approval.

### 12.3 Payroll report UI

Report per period:

- employee
- project
- project role
- PIC level
- base points
- multiplier
- final points
- run status
- calculation reason
- profile code/version

Harus bisa export CSV/XLSX.

## 13. Validation Rules

Profile:

- `effective_from` wajib.
- `effective_to` nullable tetapi jika ada harus >= `effective_from`.
- Active profile tidak boleh overlap.
- `support_percent` 0 sampai 1.

Manday range:

- `min_mandays >= 1`.
- `max_mandays` nullable atau >= min.
- Tidak overlap.
- `base_score >= 0`.

Delivery multiplier:

- Range tidak overlap.
- Minimal satu rule early/open lower bound.
- Minimal satu rule late/open upper bound.
- `multiplier >= 0`.

Role/PIC points:

- Tidak duplicate dalam profile.
- `points >= 0`.
- Minimal satu non-support role punya points > 0.

Run:

- Tidak boleh run jika project belum approved.
- Tidak boleh success jika project belum punya actual_end_at.
- Tidak boleh success jika member aktif kosong.
- Tidak boleh success jika total_weight non-support 0, kecuali fallback policy aktif.

## 14. Audit Requirements

Audit event wajib untuk:

- SLA profile created.
- SLA profile submitted for approval.
- SLA profile approved/rejected.
- SLA profile activated/deactivated/archived.
- Rule added/changed/deleted.
- Profile locked.
- Incentive run calculated.
- Incentive run failed/skipped.
- Recalculation batch started/completed/rolled back.
- Payroll period locked/paid.
- Payroll adjustment created/approved.

Audit payload minimal:

```json
{
  "actor_id": 1,
  "event_type": "sla_profile_activated",
  "before": {"status": "draft"},
  "after": {"status": "active"},
  "reason": "New 2026 payroll rule",
  "created_at": "2026-06-17T10:00:00Z"
}
```

## 15. API Requirements

### 15.1 SLA profiles

```text
GET    /api/sla-profiles
POST   /api/sla-profiles
GET    /api/sla-profiles/{profile}
PATCH  /api/sla-profiles/{profile}
POST   /api/sla-profiles/{profile}/clone
POST   /api/sla-profiles/{profile}/submit-approval
POST   /api/sla-profiles/{profile}/approve
POST   /api/sla-profiles/{profile}/reject
POST   /api/sla-profiles/{profile}/activate
POST   /api/sla-profiles/{profile}/deactivate
POST   /api/sla-profiles/{profile}/archive
POST   /api/sla-profiles/{profile}/simulate
```

### 15.2 Rules

```text
PUT /api/sla-profiles/{profile}/manday-ranges
PUT /api/sla-profiles/{profile}/delivery-rules
PUT /api/sla-profiles/{profile}/pic-level-points
PUT /api/sla-profiles/{profile}/role-points
```

Gunakan PUT sync agar satu profile dapat divalidasi lengkap secara atomik.

### 15.3 Runs and payroll

```text
GET  /api/incentive-runs
GET  /api/incentive-runs/{run}
POST /api/projects/{project}/incentive/run
POST /api/incentive-recalculation-batches
GET  /api/incentive-recalculation-batches/{batch}
POST /api/incentive-recalculation-batches/{batch}/rollback

GET  /api/payroll-periods
POST /api/payroll-periods/{period}/lock
POST /api/payroll-periods/{period}/unlock
POST /api/payroll-periods/{period}/mark-paid
```

## 16. Error Codes

Gunakan code stabil:

```text
SLA_PROFILE_NOT_FOUND
SLA_PROFILE_LOCKED
SLA_PROFILE_OVERLAP
SLA_PROFILE_REQUIRES_APPROVAL
SLA_RULE_RANGE_OVERLAP
SLA_RULE_RANGE_GAP
SLA_RULE_NO_MATCHING_MANDAY
SLA_RULE_NO_MATCHING_DELIVERY
SLA_CALENDAR_NOT_FOUND
SLA_DELIVERY_DATE_INCOMPLETE
INCENTIVE_PROJECT_NOT_APPROVED
INCENTIVE_PROJECT_NOT_CLOSED
INCENTIVE_NO_ACTIVE_MEMBERS
INCENTIVE_TOTAL_WEIGHT_ZERO
INCENTIVE_PROFILE_INCOMPLETE
PAYROLL_PERIOD_LOCKED
PAYROLL_ADJUSTMENT_REQUIRED
```

## 17. Acceptance Criteria

### 17.1 Profile configuration

- User bisa membuat draft SLA profile.
- Range manday overlap ditolak.
- Range delivery overlap ditolak.
- Active profile tidak bisa diedit langsung.
- Profile yang pernah dipakai run menjadi locked.
- Clone profile membuat version baru dengan rules tersalin.

### 17.2 Simulation

- User bisa simulasi tanpa membuat incentive run.
- Simulation menampilkan target days, actual days, diff days, multiplier, item breakdown, dan total final points.
- Simulation memakai calendar yang sama dengan profile.

### 17.3 Project calculation

- Project closed dengan config lengkap menghasilkan run success.
- Run menyimpan `rule_snapshot` dan `project_snapshot`.
- Jika config tidak lengkap, run failed dengan alasan spesifik.
- Recalculate membuat run baru dan tidak menghapus run lama.

### 17.4 Payroll lock

- Run dalam payroll period locked tidak bisa di-overwrite.
- Perubahan setelah payroll locked membuat adjustment atau ditolak sesuai policy.
- Payroll report tetap bisa melihat rule version yang dipakai saat hitung.

### 17.5 Audit

- Semua perubahan config dan calculation tercatat di audit.
- Auditor bisa menjawab: project ini dibayar dengan profile apa, versi berapa, rule apa, siapa yang approve, dan kapan dihitung.

## 18. Test Plan

Unit tests:

- business day count dengan holiday dan forced workday.
- diff days early/on-time/late.
- manday range matching.
- delivery multiplier matching.
- overlap validation.
- support pool calculation.
- technical pool weight calculation.
- total_weight zero failure.
- rounding mode.

Feature tests:

- create draft profile.
- reject overlapping manday range.
- activate profile with approval.
- clone locked profile.
- simulate profile.
- close project triggers incentive run.
- failed run when profile incomplete.
- recalculate unlocked period.
- block recalculation locked payroll period.
- create payroll adjustment.

E2E tests:

- configure profile -> simulate -> approve -> activate.
- create project -> approve -> complete task -> close -> incentive appears in payroll report.
- clone profile for new period without changing historical payroll.

## 19. Implementation Notes

Untuk implementasi baru:

1. Jangan hardcode role support dari string. Pakai `is_support_role`.
2. Jangan gunakan master profile saat menampilkan historical payroll. Pakai `rule_snapshot`.
3. Jangan edit active/locked profile. Clone versi baru.
4. Jangan hitung delivery di banyak tempat. Pakai `ProjectDeliveryService`.
5. Jangan biarkan recalculation silently overwrite payroll locked results.
6. Jangan simpan angka final sebagai float.
7. Jangan hapus run lama. Mark `is_latest = false`.
8. Jangan izinkan profile overlap kecuali scope-nya berbeda.
9. Jangan hanya validasi di UI. Backend harus enforce semua rule.

## 20. Minimum Viable Payroll-Safe Scope

Jika ingin rilis bertahap, minimum yang harus ada sebelum dipakai untuk gaji:

- SLA profile versioning.
- Active/locked state.
- Manday score rules.
- Delivery multiplier rules.
- PIC level points.
- Role points dengan support flag.
- Delivery service tunggal.
- Calculation snapshot.
- Recalculation batch.
- Payroll period lock.
- Audit event.
- Simulation.
- Test coverage formula utama.

Tanpa item di atas, modul boleh dipakai untuk monitoring project, tetapi belum layak menjadi dasar insentif/gaji.
