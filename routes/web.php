<?php

use Illuminate\Support\Facades\Route;

Route::middleware('portal.auth')->group(function (): void {
    Route::inertia('/', 'welcome')->name('home');
});
