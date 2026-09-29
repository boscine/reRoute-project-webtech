<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\PublicLocationController;
use Illuminate\Support\Facades\Route;

// -------------------------------------------------------------
// Public Student Routes (No login required)
// -------------------------------------------------------------
Route::get('/buildings', [PublicLocationController::class, 'buildings']);
Route::get('/floors', [PublicLocationController::class, 'floors']);
Route::get('/locations/{qrSlug}', [PublicLocationController::class, 'resolveLocation']);

// -------------------------------------------------------------
// Admin Auth
// -------------------------------------------------------------
Route::post('/admin/login', [AdminController::class, 'login']);

// -------------------------------------------------------------
// Protected Admin Routes (Sanctum auth required)
// -------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/admin/me', [AdminController::class, 'me']);
    Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/admin/reports', [AdminController::class, 'reports']);

    // Buildings CRUD
    Route::get('/admin/buildings', [AdminController::class, 'buildings']);
    Route::post('/admin/buildings', [AdminController::class, 'createBuilding']);
    Route::put('/admin/buildings/{id}', [AdminController::class, 'updateBuilding']);
    Route::delete('/admin/buildings/{id}', [AdminController::class, 'deleteBuilding']);

    // Floors CRUD
    Route::get('/admin/floors', [AdminController::class, 'floors']);
    Route::post('/admin/floors', [AdminController::class, 'createFloor']);
    Route::put('/admin/floors/{id}', [AdminController::class, 'updateFloor']);
    Route::delete('/admin/floors/{id}', [AdminController::class, 'deleteFloor']);

    // Locations CRUD
    Route::get('/admin/locations', [AdminController::class, 'locations']);
    Route::post('/admin/locations', [AdminController::class, 'createLocation']);
    Route::put('/admin/locations/{id}', [AdminController::class, 'updateLocation']);
    Route::delete('/admin/locations/{id}', [AdminController::class, 'deleteLocation']);

    // QR Codes
    Route::get('/admin/qr/image/{qrSlug}', [AdminController::class, 'qrImage']);

    // Scan Logs & Activity Logs
    Route::get('/admin/scan-logs', [AdminController::class, 'scanLogs']);
    Route::get('/admin/activity-logs', [AdminController::class, 'activityLogs']);

    // Admin User Management
    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::post('/admin/users', [AdminController::class, 'createUser']);
    Route::patch('/admin/users/{id}/toggle-active', [AdminController::class, 'toggleUserActive']);
});
