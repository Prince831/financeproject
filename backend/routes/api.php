<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use App\Http\Controllers\ReconciliationController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/users', function() {
    return User::all(); // fetch all users from MySQL
});

use App\Http\Controllers\AuthController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/reconcile', [ReconciliationController::class, 'reconcile']);
    Route::post('/reconcile-manual', [ReconciliationController::class, 'reconcileManual']);
    Route::get('/generate-statement', [ReconciliationController::class, 'generateStatement']);
    Route::post('/export-pdf', [ReconciliationController::class, 'exportPdf']);
    Route::post('/export-data', [ReconciliationController::class, 'exportData']);
    Route::post('/download-report', [ReconciliationController::class, 'downloadReport']);
    Route::post('/email-report', [ReconciliationController::class, 'emailReport']);
    Route::get('/reports', [ReconciliationController::class, 'getReports']);
    Route::get('/reports/{reference}', [ReconciliationController::class, 'getReport']);
    Route::get('/discrepancy-trends', [ReconciliationController::class, 'getDiscrepancyTrends']);
    Route::get('/transactions', [ReconciliationController::class, 'getTransactions']);
    Route::get('/transaction-summary', [ReconciliationController::class, 'getTransactionSummary']);
});