<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\IncentiveProfileController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('portal.auth')->group(function (): void {
    Route::inertia('/', 'welcome')->name('home');

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
