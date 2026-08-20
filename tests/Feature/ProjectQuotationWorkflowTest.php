<?php

namespace Tests\Feature;

use App\Enums\ProjectQuotationType;
use App\Enums\ProjectStatus;
use App\Models\Customer;
use App\Models\Project;
use App\Models\ProjectQuotation;
use App\Models\ProjectQuotationItem;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProjectQuotationWorkflowTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_project_quotation_routes_require_permission(): void
    {
        $project = $this->approvedProject();
        $quotation = ProjectQuotation::factory()
            ->for($project)
            ->has(ProjectQuotationItem::factory(), 'items')
            ->create();
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('project-quotations.index'))->assertForbidden();
        $this->actingAs($user)->get(route('project-quotations.create'))->assertForbidden();
        $this->actingAs($user)->post(route('project-quotations.store'), [])->assertForbidden();
        $this->actingAs($user)->get(route('project-quotations.edit', $quotation))->assertForbidden();
        $this->actingAs($user)->put(route('project-quotations.update', $quotation), [])->assertForbidden();
        $this->actingAs($user)->get(route('project-quotations.print', $quotation))->assertForbidden();
    }

    public function test_support_and_admin_roles_can_open_quotation_workspace(): void
    {
        $this->seed(RoleSeeder::class);

        $support = User::factory()->create();
        $admin = User::factory()->create();
        $support->assignRole('support');
        $admin->assignRole('admin');

        $this
            ->actingAs($support)
            ->get(route('project-quotations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('project-quotations/index'));

        $this
            ->actingAs($admin)
            ->get(route('project-quotations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('project-quotations/index'));
    }

    public function test_create_accepts_approved_project_and_rejects_non_approved_project(): void
    {
        $user = $this->userWithPermissions(['manage_project_quotations']);
        $approvedProject = $this->approvedProject(['pm_user_id' => $user->id]);
        $draftProject = Project::factory()->create(['pm_user_id' => $user->id]);

        $this
            ->actingAs($user)
            ->post(route('project-quotations.store'), $this->payload($approvedProject))
            ->assertRedirect();

        $this->assertDatabaseHas('project_quotations', [
            'project_id' => $approvedProject->id,
            'customer_name' => 'PT Example Customer',
        ]);

        $this
            ->actingAs($user)
            ->post(route('project-quotations.store'), $this->payload($draftProject))
            ->assertSessionHasErrors('project_id');
    }

    public function test_support_cannot_access_quotation_for_project_outside_visibility(): void
    {
        $user = $this->userWithPermissions(['manage_project_quotations']);
        $hiddenProject = $this->approvedProject();
        $quotation = ProjectQuotation::factory()
            ->for($hiddenProject)
            ->has(ProjectQuotationItem::factory(), 'items')
            ->create();

        $this->actingAs($user)->get(route('project-quotations.edit', $quotation))->assertForbidden();
        $this->actingAs($user)->put(route('project-quotations.update', $quotation), $this->payload($hiddenProject))->assertForbidden();
        $this->actingAs($user)->get(route('project-quotations.print', $quotation))->assertForbidden();
    }

    public function test_quotation_number_auto_increments_per_type_year_and_month(): void
    {
        $user = $this->userWithPermissions(['manage_project_quotations']);
        $project = $this->approvedProject(['pm_user_id' => $user->id]);

        $this->actingAs($user)->post(route('project-quotations.store'), $this->payload($project, [
            'quotation_type' => ProjectQuotationType::Project->value,
            'quotation_date' => '2026-08-20',
        ]));
        $this->actingAs($user)->post(route('project-quotations.store'), $this->payload($project, [
            'quotation_type' => ProjectQuotationType::Project->value,
            'quotation_date' => '2026-08-21',
        ]));
        $this->actingAs($user)->post(route('project-quotations.store'), $this->payload($project, [
            'quotation_type' => ProjectQuotationType::Maintenance->value,
            'quotation_date' => '2026-08-20',
        ]));

        $this->assertDatabaseHas('project_quotations', [
            'quotation_no' => 'QUOT/AXEL-PRJ/2026/VIII/001',
        ]);
        $this->assertDatabaseHas('project_quotations', [
            'quotation_no' => 'QUOT/AXEL-PRJ/2026/VIII/002',
        ]);
        $this->assertDatabaseHas('project_quotations', [
            'quotation_no' => 'QUOT/AXEL-MNT/2026/VIII/001',
        ]);
    }

    public function test_amount_manual_amount_tax_and_grand_total_are_calculated_by_backend(): void
    {
        $user = $this->userWithPermissions(['manage_project_quotations']);
        $project = $this->approvedProject(['pm_user_id' => $user->id]);

        $this
            ->actingAs($user)
            ->post(route('project-quotations.store'), $this->payload($project, [
                'ppn_pph_percent' => '11%',
                'items' => [
                    [
                        'unit' => 'mandays',
                        'description' => 'Development services',
                        'qty' => '2',
                        'unit_price' => '1000000',
                        'discount' => '10%',
                        'amount' => '999999999',
                    ],
                    [
                        'unit' => 'lot',
                        'description' => 'Manual amount line',
                        'qty' => '',
                        'unit_price' => '',
                        'discount' => '0',
                        'amount' => '500000',
                    ],
                ],
            ]))
            ->assertRedirect();

        $quotation = ProjectQuotation::query()->with('items')->firstOrFail();

        $this->assertEquals('1800000.00', $quotation->items[0]->amount);
        $this->assertEquals('500000.00', $quotation->items[1]->amount);
        $this->assertEquals('2300000.00', $quotation->subtotal);
        $this->assertEquals('2553000.00', $quotation->grand_total);
    }

    public function test_update_preserves_quotation_number_and_replaces_items(): void
    {
        $user = $this->userWithPermissions(['manage_project_quotations']);
        $project = $this->approvedProject(['pm_user_id' => $user->id]);
        $quotation = ProjectQuotation::factory()
            ->for($project)
            ->has(ProjectQuotationItem::factory(['description' => 'Old item']), 'items')
            ->create(['quotation_no' => 'QUOT/AXEL-PRJ/2026/VIII/009']);

        $this
            ->actingAs($user)
            ->put(route('project-quotations.update', $quotation), $this->payload($project, [
                'customer_name' => 'Updated Customer',
                'items' => [
                    [
                        'unit' => 'unit',
                        'description' => 'Replacement item',
                        'qty' => '1',
                        'unit_price' => '750000',
                        'discount' => '0',
                        'amount' => '',
                    ],
                ],
            ]))
            ->assertRedirect(route('project-quotations.edit', $quotation));

        $quotation->refresh()->load('items');

        $this->assertSame('QUOT/AXEL-PRJ/2026/VIII/009', $quotation->quotation_no);
        $this->assertSame('Updated Customer', $quotation->customer_name);
        $this->assertCount(1, $quotation->items);
        $this->assertSame('Replacement item', $quotation->items[0]->description);
    }

    public function test_print_page_contains_customer_items_totals_note_signature_and_qr_target(): void
    {
        $user = $this->userWithPermissions(['manage_project_quotations']);
        $project = $this->approvedProject(['pm_user_id' => $user->id]);
        $quotation = ProjectQuotation::factory()
            ->for($project)
            ->has(ProjectQuotationItem::factory([
                'description' => 'Printed line item',
                'amount' => 1000000,
            ]), 'items')
            ->create([
                'customer_name' => 'Print Customer',
                'customer_address' => 'Print Street 1',
                'note' => 'Print note',
                'prepared_by_name' => 'Prepared Person',
                'approved_by_name' => 'Approved Person',
                'qr_target_url' => 'https://www.axeltekno.com',
                'subtotal' => 1000000,
                'grand_total' => 1110000,
            ]);

        $this
            ->actingAs($user)
            ->get(route('project-quotations.print', $quotation))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('project-quotations/print')
                ->where('quotation.customer_address', 'Print Street 1')
                ->where('quotation.items.0.description', 'Printed line item')
                ->where('quotation.note', 'Print note')
                ->where('quotation.prepared_by_name', 'Prepared Person')
                ->where('quotation.approved_by_name', 'Approved Person')
                ->where('quotation.qr_target_url', 'https://www.axeltekno.com')
                ->where('quotation.subtotal', '1000000.00')
                ->where('quotation.grand_total', '1110000.00'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function approvedProject(array $overrides = []): Project
    {
        $customer = Customer::factory()->create([
            'name' => 'PT Example Customer',
            'company_name' => 'Example Group',
            'company_address' => 'Example Street 123',
        ]);
        $approver = User::factory()->create();
        $project = Project::factory()->create([
            'status' => ProjectStatus::Planning,
            'approved_by' => $approver->id,
            'approved_at' => now(),
            ...$overrides,
        ]);
        $project->customers()->attach($customer->id, ['is_primary' => true]);

        return $project;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Project $project, array $overrides = []): array
    {
        return [
            'project_id' => $project->id,
            'quotation_type' => ProjectQuotationType::Project->value,
            'quotation_date' => '2026-08-20',
            'customer_name' => 'PT Example Customer',
            'customer_address' => 'Example Street 123',
            'customer_identifier' => 'Example Group',
            'cc' => 'Finance',
            'description' => 'Project Development for August 2026',
            'term_of_payment_date' => '2026-08-20',
            'valid_until_date' => '2026-09-20',
            'note' => 'Standard note',
            'prepared_by_name' => 'Prepared User',
            'approved_by_name' => 'Approved User',
            'ppn_pph_percent' => '0',
            'qr_target_url' => 'https://www.axeltekno.com',
            'status' => 'quotation',
            'items' => [
                [
                    'unit' => 'mandays',
                    'description' => 'Development services',
                    'qty' => '1',
                    'unit_price' => '1000000',
                    'discount' => '0',
                    'amount' => '',
                ],
            ],
            ...$overrides,
        ];
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo(
            Permission::query()
                ->whereIn('name', $permissions)
                ->pluck('name')
                ->all(),
        );

        return $user;
    }
}
