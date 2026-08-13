<?php

namespace Tests\Feature;

use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Exports\ArraySheetExport;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Holiday;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\TaskType;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Excel as ExcelWriter;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ExcelImportExportTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_user_without_permission_cannot_use_customer_excel_routes(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('exports.customers'))
            ->assertForbidden();

        $this->actingAs($user)
            ->get(route('import-templates.customers'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('imports.customers'), [
                'file' => $this->uploadedWorkbook(new ArraySheetExport('Customers', ['name'], [['Blocked']]), 'customers.xlsx'),
            ])
            ->assertForbidden();
    }

    public function test_customer_import_creates_and_updates_by_unique_key(): void
    {
        $user = $this->userWithPermissions(['import_customers']);
        Customer::factory()->create([
            'name' => 'Old Name',
            'email' => 'customer@example.test',
            'company_name' => 'Old Company',
        ]);

        $file = $this->uploadedWorkbook(new ArraySheetExport('Customers', [
            'name',
            'email',
            'company_name',
            'company_address',
            'is_active',
        ], [
            ['Updated Name', 'customer@example.test', 'Updated Company', 'Updated Address', 1],
            ['Fallback Customer', '', 'Fallback Company', '', '0'],
        ]), 'customers.xlsx');

        $this->actingAs($user)
            ->post(route('imports.customers'), ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('customers', [
            'email' => 'customer@example.test',
            'name' => 'Updated Name',
            'company_name' => 'Updated Company',
        ]);
        $this->assertDatabaseHas('customers', [
            'name' => 'Fallback Customer',
            'company_name' => 'Fallback Company',
            'is_active' => false,
        ]);
    }

    public function test_user_import_syncs_roles_and_requires_password_only_for_new_users(): void
    {
        $actor = $this->userWithPermissions(['import_users']);
        $department = Department::factory()->create(['code' => 'ENG']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'support', 'guard_name' => 'web']);
        User::factory()->create([
            'name' => 'Existing User',
            'email' => 'existing@example.test',
        ]);

        $file = $this->uploadedWorkbook(new ArraySheetExport('Users', [
            'name',
            'email',
            'external_id',
            'department_code',
            'roles',
            'password',
            'is_active',
        ], [
            ['Existing Updated', 'existing@example.test', 'EXT-1', 'ENG', 'admin', '', 1],
            ['New Support', 'new@example.test', 'EXT-2', 'ENG', 'support', 'secret-password', 1],
        ]), 'users.xlsx');

        $this->actingAs($actor)
            ->post(route('imports.users'), ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('success');

        $existing = User::query()->where('email', 'existing@example.test')->firstOrFail();
        $new = User::query()->where('email', 'new@example.test')->firstOrFail();

        $this->assertSame('Existing Updated', $existing->name);
        $this->assertSame($department->id, $existing->department_id);
        $this->assertTrue($existing->hasRole('admin'));
        $this->assertTrue($new->hasRole('support'));
    }

    public function test_user_import_rolls_back_when_new_user_has_no_password(): void
    {
        $actor = $this->userWithPermissions(['import_users']);
        $file = $this->uploadedWorkbook(new ArraySheetExport('Users', [
            'name',
            'email',
            'external_id',
            'department_code',
            'roles',
            'password',
            'is_active',
        ], [
            ['No Password', 'nopassword@example.test', '', '', '', '', 1],
        ]), 'users.xlsx');

        $this->actingAs($actor)
            ->post(route('imports.users'), ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('excel_error_title', 'User import failed')
            ->assertSessionHas('excel_errors');

        $this->assertDatabaseMissing('users', ['email' => 'nopassword@example.test']);
    }

    public function test_import_reports_missing_columns_with_clear_message(): void
    {
        $actor = $this->userWithPermissions(['import_customers']);
        $file = $this->uploadedWorkbook(new ArraySheetExport('Customers', ['name'], [
            ['Missing Columns'],
        ]), 'customers.xlsx');

        $this->actingAs($actor)
            ->post(route('imports.customers'), ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('excel_error_title', 'Customer import failed')
            ->assertSessionHas('excel_errors', function (array $errors): bool {
                return str_contains($errors[0] ?? '', 'missing required columns')
                    && str_contains($errors[0] ?? '', 'Download the latest template');
            });
    }

    public function test_holiday_import_upserts_by_date_without_duplicate_records(): void
    {
        $actor = $this->userWithPermissions(['import_holidays']);
        Holiday::factory()->create([
            'date' => '2026-08-17',
            'name' => 'Old Holiday',
        ]);

        $file = $this->uploadedWorkbook(new ArraySheetExport('Holidays', [
            'date',
            'name',
            'type',
            'is_working',
            'description',
            'is_active',
        ], [
            ['2026-08-17', 'Independence Day', 'national', '0', 'Updated', 1],
        ]), 'holidays.xlsx');

        $this->actingAs($actor)
            ->post(route('imports.holidays'), ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(1, Holiday::query()->whereDate('date', '2026-08-17')->count());
        $this->assertSame(
            'Independence Day',
            Holiday::query()->whereDate('date', '2026-08-17')->value('name'),
        );
    }

    public function test_project_preparation_import_creates_draft_project_with_relations_tasks_and_no_attachments(): void
    {
        $actor = $this->userWithPermissions(['import_project_preparations']);
        $pm = User::factory()->create(['email' => 'pm@example.test']);
        $requester = User::factory()->create(['email' => 'requester@example.test']);
        $member = User::factory()->create(['email' => 'member@example.test']);
        $customer = Customer::factory()->create([
            'email' => 'customer@example.test',
            'company_name' => 'Customer Co',
        ]);
        $profile = IncentiveProfile::factory()->create([
            'code' => 'INC',
            'version' => 1,
            'status' => IncentiveProfileStatus::Active,
        ]);
        IncentiveProjectRoleRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'role_code' => 'DEV',
            'role_name' => 'Developer',
            'is_support' => false,
        ]);
        IncentivePicLevelRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'level_code' => 'L1',
            'level_name' => 'Level 1',
        ]);
        TaskType::factory()->create(['name' => 'Analysis', 'project_id' => null]);

        $file = $this->uploadedWorkbook(new class implements WithMultipleSheets
        {
            public function sheets(): array
            {
                return [
                    new ArraySheetExport('Projects', ['project_id', 'name', 'project_date', 'mandays', 'incentive_profile_code', 'incentive_profile_version', 'pm_email', 'requester_email', 'location', 'urs_date', 'urs_number', 'plan_start_date', 'plan_end_date', 'uat_date', 'bast_date'], [
                        ['', 'Imported Project', '2026-08-20', 12, 'INC', 1, 'pm@example.test', 'requester@example.test', 'Jakarta', '2026-08-19', 'URS-001', '2026-08-21', '2026-08-30', '', ''],
                    ]),
                    new ArraySheetExport('Project Customers', ['project_id', 'project_name', 'project_date', 'customer_email', 'customer_company_name', 'is_primary'], [
                        ['', 'Imported Project', '2026-08-20', 'customer@example.test', 'Customer Co', 1],
                    ]),
                    new ArraySheetExport('Members', ['project_id', 'project_name', 'project_date', 'user_email', 'project_role_code', 'pic_level_code', 'is_support'], [
                        ['', 'Imported Project', '2026-08-20', 'member@example.test', 'DEV', 'L1', 0],
                    ]),
                    new ArraySheetExport('Access Rules', ['project_id', 'project_name', 'project_date', 'user_email', 'permission'], [
                        ['', 'Imported Project', '2026-08-20', 'member@example.test', 'view'],
                    ]),
                    new ArraySheetExport('Tasks', ['task_id', 'project_id', 'project_name', 'project_date', 'name', 'task_type_name', 'pic_user_email', 'status', 'description', 'plan_start_date', 'plan_end_date'], [
                        ['', '', 'Imported Project', '2026-08-20', 'Prepare URS', 'Analysis', 'member@example.test', 'todo', 'Prepare document', '2026-08-21', '2026-08-22'],
                    ]),
                ];
            }
        }, 'project-preparations.xlsx');

        $this->actingAs($actor)
            ->post(route('imports.project-preparations'), ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('success');

        $project = Project::query()->where('name', 'Imported Project')->firstOrFail();

        $this->assertSame(ProjectStatus::Draft, $project->currentStatus());
        $this->assertSame($pm->id, $project->pm_user_id);
        $this->assertSame($requester->id, $project->request_user_id);
        $this->assertTrue($project->customers()->whereKey($customer->id)->wherePivot('is_primary', true)->exists());
        $this->assertSame(1, $project->members()->count());
        $this->assertSame(1, $project->accessRules()->count());
        $this->assertSame(1, $project->tasks()->count());
        $this->assertSame(0, $project->attachments()->count());
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'project',
            'subject_type' => $project->getMorphClass(),
            'subject_id' => $project->id,
            'event' => 'project_imported',
        ]);
    }

    public function test_project_preparation_import_rolls_back_on_invalid_reference(): void
    {
        $actor = $this->userWithPermissions(['import_project_preparations']);
        $pm = User::factory()->create(['email' => 'pm-invalid@example.test']);
        $profile = IncentiveProfile::factory()->create([
            'code' => 'INC2',
            'version' => 1,
            'status' => IncentiveProfileStatus::Active,
        ]);
        IncentiveProjectRoleRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'role_code' => 'DEV',
            'role_name' => 'Developer',
        ]);

        $file = $this->uploadedWorkbook(new class($pm) implements WithMultipleSheets
        {
            public function __construct(private readonly User $pm) {}

            public function sheets(): array
            {
                return [
                    new ArraySheetExport('Projects', ['project_id', 'name', 'project_date', 'mandays', 'incentive_profile_code', 'incentive_profile_version', 'pm_email', 'requester_email', 'location', 'urs_date', 'urs_number', 'plan_start_date', 'plan_end_date', 'uat_date', 'bast_date'], [
                        ['', 'Rollback Project', '2026-08-20', 12, 'INC2', 1, $this->pm->email, '', 'Jakarta', '2026-08-19', 'URS-001', '2026-08-21', '2026-08-30', '', ''],
                    ]),
                    new ArraySheetExport('Project Customers', ['project_id', 'project_name', 'project_date', 'customer_email', 'customer_company_name', 'is_primary'], [
                        ['', 'Rollback Project', '2026-08-20', 'missing@example.test', '', 1],
                    ]),
                    new ArraySheetExport('Members', ['project_id', 'project_name', 'project_date', 'user_email', 'project_role_code', 'pic_level_code', 'is_support']),
                    new ArraySheetExport('Access Rules', ['project_id', 'project_name', 'project_date', 'user_email', 'permission']),
                    new ArraySheetExport('Tasks', ['task_id', 'project_id', 'project_name', 'project_date', 'name', 'task_type_name', 'pic_user_email', 'status', 'description', 'plan_start_date', 'plan_end_date']),
                ];
            }
        }, 'project-preparations.xlsx');

        $this->actingAs($actor)
            ->post(route('imports.project-preparations'), ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('excel_error_title', 'Project preparation import failed')
            ->assertSessionHas('excel_errors');

        $this->assertDatabaseMissing('projects', ['name' => 'Rollback Project']);
    }

    public function test_exports_and_templates_download_xlsx_without_password_value(): void
    {
        $user = $this->userWithPermissions([
            'export_customers',
            'import_customers',
            'export_users',
            'import_users',
            'export_holidays',
            'import_holidays',
            'export_project_preparations',
            'import_project_preparations',
        ]);
        User::factory()->create([
            'name' => 'Export User',
            'email' => 'export@example.test',
            'password' => 'super-secret',
        ]);

        foreach ([
            route('exports.customers'),
            route('import-templates.customers'),
            route('exports.users'),
            route('import-templates.users'),
            route('exports.holidays'),
            route('import-templates.holidays'),
            route('exports.project-preparations'),
            route('import-templates.project-preparations'),
        ] as $url) {
            $response = $this->actingAs($user)->get($url);
            $response->assertOk();
            $response->assertHeader('content-disposition');
        }

        $this->actingAs($user)
            ->get(route('exports.users'))
            ->assertDontSee('super-secret');
    }

    public function test_templates_include_sample_rows(): void
    {
        $user = $this->userWithPermissions([
            'import_customers',
            'import_users',
            'import_holidays',
            'import_project_preparations',
        ]);

        $customerTemplate = $this->actingAs($user)->get(route('import-templates.customers'));
        $this->assertSame('Budi Santoso', $this->worksheetRows($customerTemplate)[1][0]);

        $userTemplate = $this->actingAs($user)->get(route('import-templates.users'));
        $this->assertSame('Admin Contoh', $this->worksheetRows($userTemplate)[1][0]);

        $holidayTemplate = $this->actingAs($user)->get(route('import-templates.holidays'));
        $this->assertSame('Hari Kemerdekaan', $this->worksheetRows($holidayTemplate)[1][1]);

        $projectTemplate = $this->actingAs($user)->get(route('import-templates.project-preparations'));
        $spreadsheet = IOFactory::load($projectTemplate->baseResponse->getFile()->getPathname());

        $this->assertSame('Project Contoh Implementasi', $spreadsheet->getSheet(0)->toArray()[1][1]);
        $this->assertSame('Project Contoh Implementasi', $spreadsheet->getSheet(4)->toArray()[1][2]);
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();

        $user->givePermissionTo(
            collect($permissions)
                ->map(fn (string $permission): Permission => Permission::findByName($permission))
                ->all(),
        );

        return $user;
    }

    private function uploadedWorkbook(object $export, string $name): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'excel-import-');
        file_put_contents($path, Excel::raw($export, ExcelWriter::XLSX));

        return new UploadedFile(
            $path,
            $name,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true,
        );
    }

    /**
     * @return array<int, array<int, mixed>>
     */
    private function worksheetRows($response): array
    {
        return IOFactory::load($response->baseResponse->getFile()->getPathname())
            ->getActiveSheet()
            ->toArray();
    }
}
