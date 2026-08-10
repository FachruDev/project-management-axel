<?php

use App\Http\Controllers\IncentiveProfileController;
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
});
