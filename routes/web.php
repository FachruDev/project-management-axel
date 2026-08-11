<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\IncentiveProfileController;
use App\Http\Controllers\ProjectApprovalController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectPreparationController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('portal.auth')->group(function (): void {
    Route::inertia('/', 'welcome')->name('home');

    Route::get('project-approvals', [ProjectApprovalController::class, 'index'])
        ->middleware('can:approve_projects')
        ->name('project-approvals.index');
    Route::post('project-approvals/{project}/approve', [ProjectApprovalController::class, 'approve'])
        ->middleware('can:approve_projects')
        ->name('project-approvals.approve');
    Route::post('project-approvals/{project}/reject', [ProjectApprovalController::class, 'reject'])
        ->middleware('can:approve_projects')
        ->name('project-approvals.reject');

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
    Route::resource('projects', ProjectController::class)
        ->only(['index', 'store', 'show', 'update'])
        ->middleware('can:view_projects');

    Route::post('incentive-profiles/{incentive_profile}/calculations', [IncentiveProfileController::class, 'calculateProjects'])
        ->middleware('can:calculate_project_incentives')
        ->name('incentive-profiles.calculations.store');

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

    Route::resource('users', UserController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:manage_users');

    Route::resource('roles', RoleController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:manage_roles');
});
