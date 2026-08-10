# Technical Requirements Aplikasi Project Module Baru

Dokumen ini adalah requirement teknis end-to-end untuk membangun aplikasi baru yang mirip dengan modul Project saat ini, tetapi dengan struktur kode dan fitur yang lebih efisien. Targetnya: tim dev bisa langsung memecah pekerjaan menjadi migration, model, service, API, UI, job, dan test.

## 1. Tujuan Produk

Aplikasi harus mengelola siklus hidup project dari preparation sampai closed:

1. Project dibuat oleh user internal.
2. Data awal, customer, PIC, evidence, member, dan mandays dilengkapi.
3. Project masuk approval.
4. Setelah approved, task/kanban berjalan.
5. Status project tersinkron dari task.
6. Delivery deadline dihitung konsisten.
7. BAST dan close hanya boleh jika semua syarat lengkap.
8. Incentive otomatis dihitung saat project closed.
9. Quotation, overview, audit trail, dan reporting tersedia.

Prinsip desain:

- Backend menjadi source of truth untuk permission, state transition, close prerequisite, dan incentive.
- Frontend hanya mengikuti capability/metadata dari backend.
- Semua rule bisnis yang dipakai di UI juga wajib ada di service backend.
- Hindari controller besar. Controller hanya validasi request, panggil service, return response.
- Tidak ada duplikasi rumus delivery dan prerequisite antara controller, command, dan report.

## 2. Stack Rekomendasi

Stack dapat disesuaikan, tetapi requirement ini diasumsikan untuk modular monolith:

- Backend: Laravel 11/12 atau NestJS. Jika melanjutkan ekosistem saat ini, pilih Laravel.
- Frontend: Inertia React/Vue atau Next.js SPA dengan REST/JSON API.
- Database: PostgreSQL atau MySQL 8. PostgreSQL lebih direkomendasikan untuk reporting dan constraint.
- Queue: Redis queue.
- Scheduler: Laravel scheduler/cron atau worker scheduler equivalent.
- Storage: local/S3-compatible object storage.
- Auth/RBAC: Spatie Permission jika Laravel, atau RBAC internal dengan roles, permissions, dan project-level grants.
- Test: PHPUnit/Pest untuk backend, Playwright/Cypress untuk UI flow.

## 3. Bounded Context / Modul Kode

Susun kode menjadi domain kecil:

```text
Project
  ProjectApplicationService
  ProjectLifecycleService
  ProjectAccessPolicy
  ProjectEvidenceService
  ProjectClosePrerequisiteService
  ProjectDeliveryService
  ProjectStatusSyncService

Approval
  ProjectApprovalService

Task
  TaskApplicationService
  TaskWorkflowService

Member
  ProjectMemberService
  ProjectAccessRuleService

Incentive
  IncentiveProfileService
  ProjectIncentiveCalculator
  ProjectIncentiveRunner

Quotation
  ProjectQuotationService

Reporting
  ProjectOverviewQuery
  IncentiveResultQuery

Audit
  AuditLogger
```

Controller tidak boleh menyimpan rule seperti "boleh close jika semua task done". Rule itu wajib berada di service reusable.

## 4. Role dan Permission

### 4.1 Role default

- `superadmin`: semua akses.
- `admin`: akses operasional luas, kecuali konfigurasi sensitif jika dibatasi.
- `department_head`: melihat dan mengelola project di unitnya.
- `support`: bisa membuat/mengelola project operasional.
- `pm`: project manager.
- `member`: project member biasa.
- `viewer`: read-only.

### 4.2 Permission global

Wajib:

- `project.view`
- `project.view_all`
- `project.create`
- `project.update`
- `project.delete`
- `project.import`
- `project.approval.view`
- `project.approval.decide`
- `project.auto_approve`
- `project.backdate_override`
- `project.status.update`
- `project.close`
- `project.members.manage`
- `project.access_rules.manage`
- `project.mandays.request`
- `project.mandays.decide`
- `project.overview.view`
- `project.quotation.manage`
- `incentive.config.manage`
- `incentive.results.view`
- `incentive.results.recalculate`
- `work_calendar.manage`

### 4.3 Project-level grants

Project-level grants harus menjadi first-class:

```text
project_access_rules
- project_id
- user_id
- can_view
- can_update
- can_update_status
- can_manage_members
- can_manage_access_rules
- can_close
- is_active
```

Semua endpoint wajib memeriksa gabungan:

1. superadmin/global permission
2. project owner
3. PIC PM
4. active project member
5. project-level grant

Jangan hanya mengandalkan menu frontend.

## 5. State Machine Project

Gunakan enum dan state machine formal, bukan string bebas di controller.

### 5.1 Approval status

```text
draft
approval_required
approved
rejected
```

### 5.2 Lifecycle status

```text
draft
start
todo
assigned
in_progress
done
closed
cancelled
```

Status `cancelled` optional, tetapi disarankan agar project yang batal tidak dipaksa masuk `closed`.

### 5.3 Transition rule

```text
draft -> approval_required
approval_required -> approved
approval_required -> rejected
rejected -> approval_required
approved/start -> todo
todo -> assigned
assigned -> in_progress
in_progress -> done
done -> closed
any non-closed -> cancelled
closed -> terminal
cancelled -> terminal, unless superadmin reopen policy exists
```

Requirement:

- Transition harus lewat `ProjectLifecycleService`.
- Semua transition menulis audit.
- Closed tidak boleh direopen tanpa explicit superadmin-only `reopen_closed_project` feature.
- Manual override status harus permission-based dan tetap lewat service.
- Jika task sync mengubah status project, audit note harus `synced_from_tasks`.

## 6. Data Model Minimum

### 6.1 projects

```text
id
code unique nullable
name
description nullable
created_by foreign users
project_date datetime
customer_primary_id nullable
location nullable

pic_pm_id foreign users nullable
pic_request_id foreign users nullable
department_id nullable

approval_status enum
approved_by nullable
approved_at nullable
approval_note text nullable

lifecycle_status enum
status_changed_at datetime nullable

plan_start_at datetime nullable
plan_end_at datetime nullable
actual_start_at datetime nullable
actual_end_at datetime nullable

urs_date datetime nullable
urs_number nullable
uat_date datetime nullable
bast_date datetime nullable
go_live_at datetime nullable

incentive_profile_id nullable
mandays integer nullable
delivery_target_days integer nullable
delivery_actual_days integer nullable

closed_by nullable
closed_at nullable
cancelled_by nullable
cancelled_at nullable
cancel_reason nullable

created_at
updated_at
deleted_at nullable
```

### 6.2 project_customers

```text
project_id
customer_id
role enum(primary, stakeholder, billing, end_user)
created_at
updated_at
unique(project_id, customer_id, role)
```

### 6.3 project_members

```text
id
project_id
user_id
role enum(pm, production, support, qa, requester, viewer, custom)
role_label nullable
pic_level_id nullable
is_active boolean
joined_at
left_at nullable
created_at
updated_at
unique active member per project/user recommended
```

### 6.4 project_access_rules

```text
id
project_id
user_id
can_view boolean
can_update boolean
can_update_status boolean
can_manage_members boolean
can_manage_access_rules boolean
can_close boolean
is_active boolean
created_by
updated_by
created_at
updated_at
unique(project_id, user_id)
```

### 6.5 project_evidences

Ganti banyak kolom file seperti `urs_files`, `uat_files`, `bast_files` menjadi tabel evidence.

```text
id
project_id
type enum(request, urs, uat, bast, other)
file_name
file_path
mime_type
size_bytes
uploaded_by
uploaded_at
deleted_by nullable
deleted_at nullable
metadata json nullable
```

Keuntungan:

- Tidak perlu single-file dan multi-file column.
- Lebih mudah audit, soft delete, preview, dan permission.
- Close prerequisite cukup query evidence aktif per type.

### 6.6 project_tasks

```text
id
project_id
title
description nullable
assignee_id nullable
workflow_state_id nullable
status enum(todo, assigned, in_progress, done, cancelled)
plan_start_at nullable
plan_end_at nullable
actual_start_at nullable
actual_end_at nullable
sort_order integer
created_by
updated_by
created_at
updated_at
deleted_at nullable
```

### 6.7 workflows

Untuk efisiensi, pisahkan workflow template dan instance.

```text
workflow_templates
- id
- code
- name
- scope enum(project_status, task)
- is_active

workflow_states
- id
- workflow_template_id
- code
- name
- mapped_status nullable
- sort_order
- color
- wip_limit nullable
- is_terminal boolean
```

Project/task cukup menyimpan `workflow_state_id` jika custom workflow dipakai. `mapped_status` menjaga enum utama tetap konsisten.

### 6.8 project_mandays_requests

```text
id
project_id
requested_by
requested_mandays
current_mandays_snapshot
status enum(pending, approved, rejected, cancelled)
request_note nullable
reviewed_by nullable
reviewed_at nullable
review_note nullable
created_at
updated_at
```

### 6.9 incentive tables

```text
incentive_profiles
- id
- name
- effective_from
- effective_to nullable
- support_percent decimal(5,4)
- is_active

incentive_manday_ranges
- id
- profile_id
- min_mandays
- max_mandays nullable
- base_score decimal

incentive_pic_points
- id
- profile_id
- pic_level_id
- points decimal

incentive_role_points
- id
- profile_id
- role_code
- points decimal

incentive_delivery_rules
- id
- profile_id
- min_diff_days nullable
- max_diff_days nullable
- multiplier decimal
- label
- sort_order

project_incentive_runs
- id
- project_id
- profile_id
- period_year
- period_month
- mandays
- base_score
- support_total
- technical_pool_total
- delivery_target_days
- delivery_actual_days
- delivery_diff_days
- multiplier
- total_final_points
- calculated_by nullable
- calculated_at
- is_latest
- calculation_version
- metadata json

project_incentive_items
- id
- run_id
- user_id
- project_role
- pic_level
- weight_points
- base_points
- final_points
- is_support
- metadata json
```

### 6.10 project_quotations

```text
id
project_id
quotation_no unique
type enum(project, maintenance)
quotation_date date
status enum(draft, quotation, invoiced, paid, void)
customer_name
customer_identifier nullable
cc text nullable
description text nullable
term_of_payment_date nullable
valid_until_date nullable
note nullable
prepared_by_name nullable
approved_by_name nullable
tax_percent decimal
subtotal decimal
grand_total decimal
qr_target_url nullable
created_by
updated_by
created_at
updated_at
```

```text
project_quotation_items
- id
- quotation_id
- sort_order
- category enum(project, maintenance)
- unit
- description
- qty decimal nullable
- unit_price decimal nullable
- discount_percent decimal default 0
- amount decimal
```

### 6.11 audit tables

Minimal:

```text
project_events
- id
- project_id
- event_type
- actor_id nullable
- from_value json nullable
- to_value json nullable
- note nullable
- created_at
```

Gunakan satu table event log untuk status, approval, assignment, customer sync, close, evidence, dan incentive trigger. Jika tetap memakai package activity log, wrap dengan `AuditLogger` agar formatnya konsisten.

## 7. Service Contract

### 7.1 ProjectApplicationService

Methods:

```text
createProject(CreateProjectData, Actor): Project
updateProject(Project, UpdateProjectData, Actor): Project
deleteProject(Project, Actor): void
importProjects(file, Actor): ImportResult
```

Responsibilities:

- Validasi business-level setelah request validation.
- Memanggil evidence/member/customer services.
- Menentukan approval status awal.
- Menulis audit.
- Dispatch event.

### 7.2 ProjectAccessPolicy

Methods:

```text
canView(actor, project): bool
canCreate(actor): bool
canUpdate(actor, project): bool
canDelete(actor, project): bool
canApprove(actor, project): bool
canUpdateStatus(actor, project): bool
canClose(actor, project): bool
canManageMembers(actor, project): bool
canManageAccessRules(actor, project): bool
capabilities(actor, project): array
```

Frontend harus menerima `capabilities` dari API agar tombol disabled/hidden sesuai backend.

### 7.3 ProjectApprovalService

Methods:

```text
submitForApproval(project, actor): Project
approve(project, actor, note = null): Project
reject(project, actor, note = null): Project
reopenRejected(project, actor, note = null): Project
```

Approval gate:

- Project punya `plan_start_at`.
- Project punya URS evidence.
- Project punya `urs_date`.
- Project punya `urs_number`.
- Optional policy: customer dan PIC boleh diwajibkan sebelum approval jika bisnis menginginkan.

### 7.4 ProjectDeliveryService

Satu-satunya sumber kalkulasi delivery.

Methods:

```text
startDelivery(project, actor, startedAt = null): Project
finishDelivery(project, actor, finishedAt = null): Project
snapshot(project): DeliverySnapshot
businessDays(start, end): int|null
deadlineStatus(diffDays): early|on_time|late|na
```

Rules:

- `actual_start_at` default saat approve.
- `actual_end_at` default saat close.
- Jika `delivery_target_days` dan `delivery_actual_days` diisi manual, service tetap mengembalikan source `explicit`.
- Jika tidak, hitung dari tanggal.
- Overview dan incentive wajib memakai service ini.

### 7.5 ProjectClosePrerequisiteService

Methods:

```text
missingForBastUpload(project): array
missingForClose(project): array
assertCanUploadBast(project): void
assertCanClose(project): void
```

Close prerequisite default:

- PIC PM exists.
- PIC Request exists.
- Location exists.
- Customer exists.
- URS date, number, evidence exists.
- Plan start/end exists.
- UAT date and evidence exists.
- BAST date and evidence exists.
- Mandays exists.
- Incentive profile exists.
- At least one active task exists.
- All active tasks are done.

### 7.6 ProjectStatusSyncService

Methods:

```text
syncFromTasks(project, actor = null): Project
resolveStatusFromTasks(tasks): LifecycleStatus
```

Mapping:

- all task done -> `done`
- any in_progress -> `in_progress`
- any assigned -> `assigned`
- else -> `todo`

Closed/cancelled project tidak boleh berubah dari task sync.

### 7.7 ProjectIncentiveCalculator

Methods:

```text
preview(project, profile = null): IncentiveCalculation
calculateAndStore(project, profile = null, actor = null): ProjectIncentiveRun
canRun(project): CanRunResult
```

Guard:

- Project approved.
- Project closed atau actual_end_at exists.
- Profile exists.
- Mandays exists.
- Delivery snapshot has diff days.
- Active members exist.
- Profile config complete.

### 7.8 ProjectQuotationService

Methods:

```text
createQuotation(data, actor): Quotation
updateQuotation(quotation, data, actor): Quotation
generateNumber(type, date): string
calculateTotals(items, taxPercent): Totals
voidQuotation(quotation, actor, reason): Quotation
```

Rule:

- Quotation hanya untuk approved project.
- Number generator harus transaction-safe.
- Item total dihitung backend.

## 8. API Requirements

Gunakan REST atau JSON API. Endpoint berikut minimal.

### 8.1 Projects

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/{project}
PATCH  /api/projects/{project}
DELETE /api/projects/{project}
GET    /api/projects/{project}/capabilities
GET    /api/projects/{project}/events
```

Query list:

```text
search
approval_status
lifecycle_status
customer_id
pic_pm_id
member_id
deadline_status
period_start
period_end
mine=true|false
page
per_page
sort
```

Response project detail wajib include:

```text
project
customers
members
access_rules if can_manage_access_rules
evidences
tasks_summary
delivery_snapshot
latest_incentive_run
latest_quotation
capabilities
missing_close_requirements
```

### 8.2 Approval

```text
GET  /api/project-approvals
POST /api/projects/{project}/submit-approval
POST /api/projects/{project}/approve
POST /api/projects/{project}/reject
POST /api/projects/{project}/reopen-rejected
```

### 8.3 Evidence

```text
GET    /api/projects/{project}/evidences
POST   /api/projects/{project}/evidences
DELETE /api/projects/{project}/evidences/{evidence}
POST   /api/projects/{project}/bast
```

`POST /bast` harus memvalidasi `missingForBastUpload`.

### 8.4 Tasks and Kanban

```text
GET    /api/projects/{project}/tasks
POST   /api/projects/{project}/tasks
PATCH  /api/projects/{project}/tasks/{task}
DELETE /api/projects/{project}/tasks/{task}
POST   /api/projects/{project}/tasks/{task}/status
POST   /api/projects/{project}/tasks/reorder
GET    /api/projects/{project}/kanban
```

Setelah task status berubah, backend memanggil `ProjectStatusSyncService`.

### 8.5 Members and Access Rules

```text
GET  /api/projects/{project}/members
PUT  /api/projects/{project}/members
GET  /api/projects/{project}/access-rules
PUT  /api/projects/{project}/access-rules
```

PUT members dan access rules harus bersifat sync:

- incoming aktif
- existing yang tidak dikirim menjadi inactive
- semua perubahan tercatat audit

### 8.6 Mandays

```text
GET  /api/projects/{project}/mandays-requests
POST /api/projects/{project}/mandays-requests
POST /api/mandays-requests/{request}/approve
POST /api/mandays-requests/{request}/reject
```

### 8.7 Close and status

```text
POST /api/projects/{project}/status
POST /api/projects/{project}/close
POST /api/projects/{project}/cancel
```

Status update harus melewati state machine dan policy.

### 8.8 Incentive

```text
GET  /api/projects/{project}/incentive/preview
POST /api/projects/{project}/incentive/run
GET  /api/incentive-runs
POST /api/incentive-runs/{project}/recalculate
```

### 8.9 Quotation

```text
GET    /api/project-quotations
POST   /api/project-quotations
GET    /api/project-quotations/{quotation}
PATCH  /api/project-quotations/{quotation}
POST   /api/project-quotations/{quotation}/void
GET    /api/project-quotations/{quotation}/print
```

### 8.10 Overview

```text
GET /api/project-overview
GET /api/project-overview/{project}
GET /api/reports/project-base-score
```

## 9. UI Requirements

### 9.1 Navigation

Menu utama:

- Project Preparation
- Approved Projects
- Project Approvals
- Project Overview
- Project Quotations
- Incentive Settings
- Incentive Results
- Work Calendar

Menu harus mengikuti permission, tetapi backend tetap wajib enforce.

### 9.2 Project Preparation

Fitur:

- List draft/approval_required/rejected/approved dengan filter status dan period.
- Create project.
- Edit project sebelum approval.
- Submit approval.
- Delete hanya untuk draft/approval_required/rejected jika punya permission.
- Rejected project tampil read-only kecuali action reopen/edit policy diizinkan.

### 9.3 Project Detail

Gunakan layout tab:

- Summary
- Timeline and Delivery
- Evidence
- Tasks/Kanban
- Members
- Access Rules
- Mandays
- Incentive
- Quotations
- Audit

Setiap tab mengambil `capabilities` dari backend.

### 9.4 Evidence UI

Evidence dibagi per type:

- Request
- URS
- UAT
- BAST
- Other

Setiap file menampilkan:

- file name
- type
- uploaded by
- uploaded at
- size
- download/view
- delete jika permitted dan project belum locked

### 9.5 Kanban

Kanban harus:

- Menampilkan task berdasarkan workflow state.
- Support drag/drop jika user boleh update task status.
- Menampilkan WIP limit jika workflow state punya limit.
- Setelah task berubah, project status badge ikut update dari response backend.

### 9.6 Overview

Minimal cards:

- total project
- approved
- rejected
- closed
- late
- total incentive points

Table columns:

- project
- customer
- PIC PM
- approval status
- lifecycle status
- plan end
- actual end
- target days
- actual days
- diff days
- deadline status
- latest quotation
- latest incentive total

## 10. Business Rules Detail

### 10.1 Create project

Wajib:

- name
- project_date
- at least one customer
- mandays or mandays request policy

Opsional saat create:

- PIC PM
- PIC Request
- location
- URS
- plan dates
- members
- incentive profile

Default:

- approval status `approval_required`, kecuali actor punya `project.auto_approve`.
- lifecycle `draft` untuk non-auto-approved.
- lifecycle `start` untuk auto-approved.
- active incentive profile terbaru jika tidak dipilih.
- creator otomatis menjadi member role `creator` atau `pm` sesuai kebijakan.

### 10.2 Approval

Approve wajib mengecek gate:

- plan_start_at
- URS date
- URS number
- URS evidence

Saat approved:

- set approved_by/approved_at
- lifecycle minimal `start`
- actual_start_at otomatis jika policy aktif
- emit `ProjectApproved`

### 10.3 Edit lock

Project closed:

- Tidak boleh ubah evidence, PIC, customer, plan dates, actual dates, mandays, incentive profile, BAST.
- Hanya note/internal metadata tertentu yang boleh jika didefinisikan.

Project monitoring:

- Boleh melengkapi close prerequisites.
- Tidak boleh menghapus evidence yang sudah dipakai untuk approval kecuali privileged.

### 10.4 Close

Close wajib atomik dalam transaction:

1. Lock row project.
2. Validasi policy `canClose`.
3. Validasi close prerequisites.
4. Set lifecycle `closed`.
5. Set `actual_end_at` dan `closed_at`.
6. Tulis event.
7. Dispatch `ProjectClosed`.
8. Queue incentive calculation.

### 10.5 Incentive

Jika incentive gagal dihitung:

- Project tetap closed.
- Status run dicatat sebagai failed/skipped di log atau calculation attempts.
- UI menampilkan alasan.
- Admin bisa recalculate setelah config diperbaiki.

### 10.6 Deletion

Gunakan soft delete untuk project.

Hard delete hanya:

- superadmin
- project belum approved
- tidak punya quotation/incentive run final
- dilakukan via maintenance action khusus

Jika project sudah approved, prefer cancel daripada delete.

## 11. Event dan Job

Events:

```text
ProjectCreated
ProjectSubmittedForApproval
ProjectApproved
ProjectRejected
ProjectReopened
ProjectUpdated
ProjectStatusChanged
ProjectTaskStatusChanged
ProjectClosed
ProjectCancelled
ProjectMembersChanged
ProjectMandaysApproved
ProjectEvidenceUploaded
ProjectQuotationCreated
```

Jobs:

```text
CalculateProjectIncentiveJob
AutoCloseReadyProjectsJob
GenerateProjectReportSnapshotJob optional
SendProjectNotificationJob optional
```

Scheduler:

- `project:auto-close-ready`: daily at configurable time.
- `project:recalculate-deadline-snapshots`: optional jika butuh denormalized reporting.

## 12. Validation dan Error Format

API error format standar:

```json
{
  "message": "Close requirements are not complete.",
  "code": "PROJECT_CLOSE_REQUIREMENTS_MISSING",
  "errors": {
    "requirements": ["BAST File", "Customer"]
  }
}
```

Gunakan code stabil:

```text
PROJECT_NOT_FOUND
PROJECT_FORBIDDEN
PROJECT_APPROVAL_REQUIRED
PROJECT_ALREADY_APPROVED
PROJECT_REJECTED_NEEDS_REOPEN
PROJECT_APPROVAL_GATE_MISSING
PROJECT_INVALID_TRANSITION
PROJECT_CLOSED_LOCKED
PROJECT_CLOSE_REQUIREMENTS_MISSING
PROJECT_BACKDATE_NOT_ALLOWED
PROJECT_TIMELINE_POLICY_FAILED
PROJECT_INCENTIVE_CONFIG_MISSING
PROJECT_QUOTATION_APPROVED_ONLY
```

## 13. Reporting dan Query Optimization

Index minimum:

```text
projects(approval_status, lifecycle_status)
projects(pic_pm_id)
projects(pic_request_id)
projects(created_by)
projects(plan_end_at)
projects(actual_end_at)
project_members(project_id, user_id, is_active)
project_access_rules(project_id, user_id, is_active)
project_tasks(project_id, status)
project_evidences(project_id, type, deleted_at)
project_incentive_runs(project_id, is_latest)
project_incentive_runs(period_year, period_month, is_latest)
project_quotations(project_id, status)
project_events(project_id, created_at)
```

Untuk overview besar, boleh buat table snapshot:

```text
project_reporting_snapshots
- project_id
- approval_status
- lifecycle_status
- deadline_status
- target_days
- actual_days
- diff_days
- latest_incentive_total
- latest_quotation_status
- refreshed_at
```

Snapshot harus derived, bukan source of truth.

## 14. Security Requirements

- Semua endpoint authenticated.
- Semua mutating endpoint authorization backend.
- File upload validasi MIME, extension, size, dan virus scanning jika tersedia.
- File download harus melewati signed URL atau controller authorization.
- Audit semua perubahan field penting.
- Jangan expose project yang user tidak punya aksesnya di search/dropdown.
- Import wajib preview/validate sebelum commit untuk mencegah salah approve massal.
- Rate limit upload dan import.

## 15. Import Requirements

Import baru sebaiknya 2 tahap:

1. Upload dan preview validation.
2. Commit import setelah user confirm.

Mode import:

- `migration`: boleh auto-approved jika actor punya permission khusus.
- `operational`: default masuk approval_required.

Kolom minimum:

```text
name
project_date
customer_code or customer_email
pic_pm_email
pic_request_email
location
urs_date
urs_number
plan_start_at
plan_end_at
mandays
lifecycle_status optional
approval_status optional only for migration mode
actual_start_at optional
actual_end_at optional
```

Import result:

```text
total_rows
valid_rows
invalid_rows
created_count
skipped_count
errors by row
```

## 16. Acceptance Criteria End-to-End

### 16.1 Preparation to approval

- User dengan `project.create` bisa membuat project.
- User tanpa `project.create` mendapat 403 walaupun tahu endpoint.
- Project non-auto-approve masuk `approval_required` dan muncul di preparation.
- Approver hanya bisa approve jika gate URS + plan start lengkap.
- Rejected project tidak bisa langsung approve sebelum reopen.

### 16.2 Approved project execution

- Approved project muncul di approved projects.
- Task hanya bisa dibuat untuk approved project.
- Status project berubah otomatis dari task.
- User yang tidak punya akses project tidak bisa melihat task/project.

### 16.3 Close

- Project tidak bisa closed jika tidak punya task.
- Project tidak bisa closed jika ada task belum done.
- Project tidak bisa closed jika close prerequisite belum lengkap.
- Saat closed, actual_end_at terisi dan project locked.
- Closed project tidak bisa direopen lewat update status biasa.

### 16.4 Incentive

- Closed project dengan config lengkap menghasilkan incentive run latest.
- Support member mendapat pool support_percent dibagi rata.
- Non-support member mendapat pool berdasarkan PIC points + role points.
- Delivery multiplier memakai satu service yang sama dengan overview.
- Jika config tidak lengkap, project tetap closed dan incentive status menampilkan alasan.

### 16.5 Quotation

- Quotation hanya bisa dibuat untuk approved project.
- Nomor quotation unique dan aman dari race condition.
- Total item, discount, tax, grand total dihitung backend.

### 16.6 Access

- Project owner, PIC PM, member, dan access rule bisa melihat project sesuai policy.
- Access rule `can_update_status` benar-benar memberi izin update status jika policy mengizinkan.
- Access rule inactive tidak memberi akses.
- Semua tombol UI sesuai `capabilities`.

## 17. Test Plan

Backend feature tests:

```text
ProjectCreateAuthorizationTest
ProjectApprovalFlowTest
ProjectLifecycleTransitionTest
ProjectClosePrerequisiteTest
ProjectAccessPolicyTest
ProjectTaskStatusSyncTest
ProjectEvidenceTest
ProjectDeliveryServiceTest
ProjectIncentiveCalculatorTest
ProjectMandaysRequestTest
ProjectQuotationTest
ProjectImportTest
ProjectAutoCloseCommandTest
```

Unit tests:

- `ProjectDeliveryService::businessDays`
- `ProjectDeliveryService::snapshot`
- `ProjectClosePrerequisiteService::missingForClose`
- `ProjectIncentiveCalculator::preview`
- `ProjectAccessPolicy::capabilities`
- state machine invalid transitions

UI/e2e tests:

- create project -> approve -> create task -> complete task -> upload BAST -> close -> incentive generated
- rejected -> reopen -> approve
- restricted user cannot access project
- access rule grants edit/close
- quotation create/print

## 18. Implementation Milestones

### Phase 1: Foundation

- Auth/RBAC.
- Project tables.
- Project policy.
- Project create/list/detail/update.
- Evidence table/upload.
- Audit event table.

### Phase 2: Approval and lifecycle

- Approval service.
- State machine.
- Preparation page.
- Approved project page.
- Delivery service.
- Backdate and timeline policy.

### Phase 3: Task and close

- Task CRUD.
- Kanban.
- Project status sync from task.
- Close prerequisite service.
- BAST upload.
- Manual close.
- Auto-close scheduler.

### Phase 4: Member/access/mandays

- Members sync.
- Access rules sync.
- Capabilities API.
- Mandays request approval.

### Phase 5: Incentive

- Incentive profile config.
- Manday ranges.
- PIC points.
- Role points.
- Delivery rules.
- Calculator.
- Auto-run job.
- Incentive results.

### Phase 6: Quotation and reporting

- Quotation CRUD.
- Print/export.
- Overview dashboard.
- Base score report.
- Import preview/commit.

## 19. Non-Functional Requirements

- Project list response under 500 ms for 10k projects with pagination and indexes.
- Overview under 1.5 s for normal filters; use snapshots if needed.
- File upload max size configurable.
- All dates stored UTC; UI displays user timezone.
- All business-day calculation timezone-aware.
- All money/points stored decimal, not float.
- All state transitions idempotent where possible.
- Jobs retryable and safe against duplicate runs.
- Logs include `project_id`, `actor_id`, `event_type`.

## 20. Definition of Done

Fitur dianggap selesai jika:

- Migration, model, service, policy, controller/API, UI, tests, and seeders selesai.
- Semua business rules ada di service/policy, bukan hanya di frontend.
- API error code stabil.
- Audit event tercatat untuk create, approve, reject, reopen, update critical fields, evidence, status, close, member/access changes, mandays, incentive, quotation.
- Feature tests utama passing.
- E2E happy path passing.
- Dokumentasi endpoint dan permission matrix tersedia.

## 21. Keputusan Desain yang Disarankan

Untuk aplikasi baru, jangan menyalin kelemahan modul lama. Terapkan keputusan berikut sejak awal:

1. Gunakan `project_evidences` table, bukan kolom file per tipe.
2. Gunakan `ProjectDeliveryService` tunggal untuk overview dan incentive.
3. Gunakan `ProjectClosePrerequisiteService` tunggal untuk BAST, close manual, close scheduler, dan UI missing fields.
4. Gunakan `ProjectAccessPolicy` tunggal untuk semua endpoint dan capabilities UI.
5. Gunakan state machine untuk approval dan lifecycle.
6. Gunakan soft delete dan cancel flow untuk project approved.
7. Gunakan import preview sebelum commit.
8. Jadikan `can_update_status` benar-benar bekerja atau hapus dari requirement. Jangan ada permission yang terlihat tapi tidak efektif.
9. Simpan audit sebagai event log yang mudah dibaca dan di-query.
10. Buat test dari awal untuk lifecycle, access, delivery, close, dan incentive.
