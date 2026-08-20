<?php

use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\CrmController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerExcelController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\HolidayController;
use App\Http\Controllers\HolidayExcelController;
use App\Http\Controllers\ImportPreviewController;
use App\Http\Controllers\IncentiveController;
use App\Http\Controllers\IncentiveProfileController;
use App\Http\Controllers\MyIncentiveController;
use App\Http\Controllers\ProjectApprovalController;
use App\Http\Controllers\ProjectAuditLogController;
use App\Http\Controllers\ProjectBastController;
use App\Http\Controllers\ProjectBulkDeleteController;
use App\Http\Controllers\ProjectBulkTaskController;
use App\Http\Controllers\ProjectCalculationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectPreparationController;
use App\Http\Controllers\ProjectPreparationExcelController;
use App\Http\Controllers\ProjectPreparationIndexController;
use App\Http\Controllers\ProjectQuotationController;
use App\Http\Controllers\ProjectStatusMoveController;
use App\Http\Controllers\ProjectTaskBulkDeleteController;
use App\Http\Controllers\ProjectTaskController;
use App\Http\Controllers\ProjectTaskDeleteController;
use App\Http\Controllers\ProjectTaskStatusController;
use App\Http\Controllers\ProjectTaskTypeController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\TaskBoardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserExcelController;
use App\Http\Controllers\WorkingDayRuleController;
use Illuminate\Support\Facades\Route;

Route::middleware('portal.auth')->group(function (): void {
    Route::get('/', DashboardController::class)->name('home');

    Route::get('exports/customers', [CustomerExcelController::class, 'export'])
        ->middleware('can:export_customers')
        ->name('exports.customers');
    Route::get('import-templates/customers', [CustomerExcelController::class, 'template'])
        ->middleware('can:import_customers')
        ->name('import-templates.customers');
    Route::post('imports/customers', [ImportPreviewController::class, 'preview'])
        ->middleware('can:import_customers')
        ->defaults('domain', 'customers')
        ->name('imports.customers');

    Route::get('exports/users', [UserExcelController::class, 'export'])
        ->middleware('can:export_users')
        ->name('exports.users');
    Route::get('import-templates/users', [UserExcelController::class, 'template'])
        ->middleware('can:import_users')
        ->name('import-templates.users');
    Route::post('imports/users', [ImportPreviewController::class, 'preview'])
        ->middleware('can:import_users')
        ->defaults('domain', 'users')
        ->name('imports.users');

    Route::get('exports/holidays', [HolidayExcelController::class, 'export'])
        ->middleware('can:export_holidays')
        ->name('exports.holidays');
    Route::get('import-templates/holidays', [HolidayExcelController::class, 'template'])
        ->middleware('can:import_holidays')
        ->name('import-templates.holidays');
    Route::post('imports/holidays', [ImportPreviewController::class, 'preview'])
        ->middleware('can:import_holidays')
        ->defaults('domain', 'holidays')
        ->name('imports.holidays');

    Route::get('exports/project-preparations', [ProjectPreparationExcelController::class, 'export'])
        ->middleware('can:export_project_preparations')
        ->name('exports.project-preparations');
    Route::get('import-templates/project-preparations', [ProjectPreparationExcelController::class, 'template'])
        ->middleware('can:import_project_preparations')
        ->name('import-templates.project-preparations');
    Route::get('import-guides/project-preparations', [ProjectPreparationExcelController::class, 'guide'])
        ->middleware('can:import_project_preparations')
        ->name('import-guides.project-preparations');
    Route::post('imports/project-preparations', [ImportPreviewController::class, 'preview'])
        ->middleware('can:import_project_preparations')
        ->defaults('domain', 'project-preparations')
        ->name('imports.project-preparations');

    Route::get('imports/{domain}', [ImportPreviewController::class, 'create'])
        ->whereIn('domain', ['customers', 'users', 'holidays', 'project-preparations'])
        ->name('imports.create');
    Route::post('imports/{domain}/preview', [ImportPreviewController::class, 'preview'])
        ->whereIn('domain', ['customers', 'users', 'holidays', 'project-preparations'])
        ->name('imports.preview');
    Route::get('imports/{domain}/{importBatch:uuid}', [ImportPreviewController::class, 'show'])
        ->whereIn('domain', ['customers', 'users', 'holidays', 'project-preparations'])
        ->name('imports.show');
    Route::post('imports/{domain}/{importBatch:uuid}/confirm', [ImportPreviewController::class, 'confirm'])
        ->whereIn('domain', ['customers', 'users', 'holidays', 'project-preparations'])
        ->name('imports.confirm');

    Route::get('project-approvals', [ProjectApprovalController::class, 'index'])
        ->middleware('can:approve_projects')
        ->name('project-approvals.index');
    Route::post('project-approvals/{project}/approve', [ProjectApprovalController::class, 'approve'])
        ->middleware('can:approve_projects')
        ->name('project-approvals.approve');
    Route::post('project-approvals/{project}/reject', [ProjectApprovalController::class, 'reject'])
        ->middleware('can:approve_projects')
        ->name('project-approvals.reject');

    Route::get('attachments/{attachment}', [AttachmentController::class, 'show'])
        ->middleware('can:view_projects')
        ->name('attachments.show');
    Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy'])
        ->middleware('can:manage_projects')
        ->name('attachments.destroy');

    Route::get('projects/{project}/preparation', [ProjectPreparationController::class, 'show'])
        ->middleware('can:manage_projects')
        ->name('projects.preparation.show');
    Route::put('projects/{project}/preparation', [ProjectPreparationController::class, 'update'])
        ->middleware('can:manage_projects')
        ->name('projects.preparation.update');
    Route::post('projects/{project}/submit-approval', [ProjectController::class, 'submitApproval'])
        ->middleware('can:manage_projects')
        ->name('projects.submit-approval');
    Route::post('projects/{project}/resubmit', [ProjectController::class, 'resubmit'])
        ->middleware('can:manage_projects')
        ->name('projects.resubmit');
    Route::post('projects/{project}/start', [ProjectController::class, 'start'])
        ->middleware('can:manage_projects')
        ->name('projects.start');
    Route::post('projects/{project}/refresh-status', [ProjectController::class, 'refreshStatus'])
        ->middleware('can:manage_projects')
        ->name('projects.refresh-status');
    Route::post('projects/{project}/close', [ProjectController::class, 'close'])
        ->middleware('can:manage_projects')
        ->name('projects.close');
    Route::patch('projects/{project}/bast', ProjectBastController::class)
        ->middleware('can:manage_projects')
        ->name('projects.bast.update');
    Route::get('projects/{project}/audit-logs', ProjectAuditLogController::class)
        ->middleware('can:view_projects')
        ->name('projects.audit-logs');
    Route::patch('projects/{project}/status-move', ProjectStatusMoveController::class)
        ->middleware('can:manage_projects')
        ->name('projects.status-move');
    Route::delete('projects/bulk-delete', ProjectBulkDeleteController::class)
        ->middleware('can:manage_projects')
        ->name('projects.bulk-delete');
    Route::get('projects/{project}/tasks/create', [ProjectBulkTaskController::class, 'create'])
        ->middleware('can:manage_tasks')
        ->name('projects.tasks.create');
    Route::post('projects/{project}/tasks/bulk', [ProjectBulkTaskController::class, 'store'])
        ->middleware('can:manage_tasks')
        ->name('projects.tasks.bulk-store');
    Route::post('projects/{project}/task-types', [ProjectTaskTypeController::class, 'store'])
        ->middleware('can:manage_tasks')
        ->name('projects.task-types.store');
    Route::patch('projects/{project}/task-types/{taskType}', [ProjectTaskTypeController::class, 'update'])
        ->middleware('can:manage_tasks')
        ->name('projects.task-types.update');
    Route::delete('projects/{project}/task-types/{taskType}', [ProjectTaskTypeController::class, 'destroy'])
        ->middleware('can:manage_tasks')
        ->name('projects.task-types.destroy');
    Route::resource('projects', ProjectController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy'])
        ->middleware('can:view_projects');

    Route::get('project-preparations', ProjectPreparationIndexController::class)
        ->middleware('can:manage_projects')
        ->name('project-preparations.index');

    Route::get('project-quotations/{project_quotation}/print', [ProjectQuotationController::class, 'print'])
        ->middleware('can:manage_project_quotations')
        ->name('project-quotations.print');
    Route::resource('project-quotations', ProjectQuotationController::class)
        ->only(['index', 'create', 'store', 'edit', 'update'])
        ->middleware('can:manage_project_quotations');

    Route::get('tasks', TaskBoardController::class)
        ->middleware('can:view_tasks')
        ->name('tasks.index');
    Route::patch('tasks/{task}/status', ProjectTaskStatusController::class)
        ->middleware('can:manage_tasks')
        ->name('tasks.status.update');
    Route::patch('tasks/{task}', [ProjectTaskController::class, 'update'])
        ->middleware('can:manage_tasks')
        ->name('tasks.update');
    Route::delete('tasks/bulk-delete', ProjectTaskBulkDeleteController::class)
        ->middleware('can:manage_tasks')
        ->name('tasks.bulk-delete');
    Route::delete('tasks/{task}', ProjectTaskDeleteController::class)
        ->middleware('can:manage_tasks')
        ->name('tasks.destroy');

    Route::post('incentive-profiles/{incentive_profile}/calculations', [IncentiveProfileController::class, 'calculateProjects'])
        ->middleware('can:calculate_project_incentives')
        ->name('incentive-profiles.calculations.store');

    Route::get('project-calculations', [ProjectCalculationController::class, 'index'])
        ->middleware('can:view_project_incentives')
        ->name('project-calculations.index');
    Route::post('project-calculations/profiles/{incentive_profile}/recalculate', [ProjectCalculationController::class, 'recalculate'])
        ->middleware('can:calculate_project_incentives')
        ->name('project-calculations.recalculate');
    Route::get('project-calculations/{project_incentive_calculation}', [ProjectCalculationController::class, 'show'])
        ->middleware('can:view_project_incentives')
        ->name('project-calculations.show');
    Route::patch('project-calculations/{project_incentive_calculation}/lock', [ProjectCalculationController::class, 'lock'])
        ->middleware('can:lock_project_incentives')
        ->name('project-calculations.lock');
    Route::patch('project-calculations/{project_incentive_calculation}/unlock', [ProjectCalculationController::class, 'unlock'])
        ->middleware('can:unlock_project_incentives')
        ->name('project-calculations.unlock');

    Route::get('my-incentives', MyIncentiveController::class)
        ->middleware('can:view_my_incentives')
        ->name('my-incentives.index');
    Route::get('incentives', IncentiveController::class)
        ->middleware('can:view_all_incentives')
        ->name('incentives.index');
    Route::get('crm', [CrmController::class, 'index'])
        ->middleware('can:view_crm')
        ->name('crm.index');
    Route::get('crm/customers/{customer}', [CrmController::class, 'show'])
        ->middleware('can:view_crm')
        ->name('crm.customers.show');

    Route::middleware('can:manage_incentive_profiles')->group(function (): void {
        Route::patch('incentive-profiles/{incentive_profile}/status', [IncentiveProfileController::class, 'updateStatus'])
            ->name('incentive-profiles.status.update');
        Route::post('incentive-profiles/{incentive_profile}/versions', [IncentiveProfileController::class, 'storeVersion'])
            ->name('incentive-profiles.versions.store');
        Route::resource('incentive-profiles', IncentiveProfileController::class);
    });

    Route::resource('customers', CustomerController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:manage_customers');

    Route::resource('departments', DepartmentController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:manage_departments');

    Route::resource('working-day-rules', WorkingDayRuleController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:manage_working_calendar');

    Route::resource('holidays', HolidayController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:manage_working_calendar');

    Route::resource('users', UserController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:manage_users');

    Route::resource('roles', RoleController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:manage_roles');
});
