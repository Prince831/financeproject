<?php
/**
 * Deployment Diagnostic Script
 * Run this on your live server to check for common deployment issues
 * 
 * Usage: php check_deployment.php
 */

echo "=== Deployment Diagnostic Check ===\n\n";

// Check PHP Version
echo "1. PHP Version: ";
$phpVersion = phpversion();
echo $phpVersion . "\n";
if (version_compare($phpVersion, '8.0.0', '<')) {
    echo "   ⚠️  WARNING: PHP 8.0+ required. Current version is too old.\n";
} else {
    echo "   ✓ PHP version is compatible\n";
}

// Check required extensions
echo "\n2. Required PHP Extensions:\n";
$requiredExtensions = ['pdo', 'pdo_mysql', 'mbstring', 'openssl', 'tokenizer', 'json', 'xml', 'curl', 'zip'];
$missingExtensions = [];
foreach ($requiredExtensions as $ext) {
    if (extension_loaded($ext)) {
        echo "   ✓ $ext\n";
    } else {
        echo "   ✗ $ext (MISSING)\n";
        $missingExtensions[] = $ext;
    }
}

if (!empty($missingExtensions)) {
    echo "\n   ⚠️  WARNING: Missing extensions: " . implode(', ', $missingExtensions) . "\n";
}

// Check Laravel installation
echo "\n3. Laravel Installation:\n";
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    echo "   ✓ Composer dependencies installed\n";
    require __DIR__ . '/vendor/autoload.php';
} else {
    echo "   ✗ Composer dependencies NOT installed\n";
    echo "   Run: composer install --no-dev --optimize-autoloader\n";
    exit(1);
}

// Check .env file
echo "\n4. Environment Configuration:\n";
if (file_exists(__DIR__ . '/.env')) {
    echo "   ✓ .env file exists\n";
} else {
    echo "   ✗ .env file NOT found\n";
    echo "   Copy .env.example to .env and configure it\n";
}

// Check database connection
echo "\n5. Database Connection:\n";
try {
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    $db = \Illuminate\Support\Facades\DB::connection();
    $db->getPdo();
    echo "   ✓ Database connection successful\n";
    
    // Check if reconciliation_runs table exists
    echo "\n6. Database Tables:\n";
    $tables = \Illuminate\Support\Facades\Schema::getConnection()->getDoctrineSchemaManager()->listTableNames();
    
    if (in_array('reconciliation_runs', $tables)) {
        echo "   ✓ reconciliation_runs table exists\n";
    } else {
        echo "   ✗ reconciliation_runs table NOT found\n";
        echo "   ⚠️  CRITICAL: Run migrations: php artisan migrate\n";
    }
    
    if (in_array('reconciliation_reports', $tables)) {
        echo "   ⚠️  reconciliation_reports table still exists (will be dropped by migration)\n";
    }
    
    if (in_array('transactions', $tables)) {
        echo "   ✓ transactions table exists\n";
    } else {
        echo "   ✗ transactions table NOT found\n";
        echo "   ⚠️  CRITICAL: Run migrations: php artisan migrate\n";
    }
    
    if (in_array('users', $tables)) {
        echo "   ✓ users table exists\n";
    } else {
        echo "   ✗ users table NOT found\n";
        echo "   ⚠️  CRITICAL: Run migrations: php artisan migrate\n";
    }
    
} catch (\Exception $e) {
    echo "   ✗ Database connection failed: " . $e->getMessage() . "\n";
    echo "   Check your .env database configuration\n";
}

// Check storage permissions
echo "\n7. File Permissions:\n";
$storagePath = __DIR__ . '/storage';
$cachePath = __DIR__ . '/bootstrap/cache';

if (is_writable($storagePath)) {
    echo "   ✓ storage/ is writable\n";
} else {
    echo "   ✗ storage/ is NOT writable\n";
    echo "   Run: chmod -R 775 storage\n";
}

if (is_writable($cachePath)) {
    echo "   ✓ bootstrap/cache/ is writable\n";
} else {
    echo "   ✗ bootstrap/cache/ is NOT writable\n";
    echo "   Run: chmod -R 775 bootstrap/cache\n";
}

// Check for ReconciliationRun model
echo "\n8. Application Files:\n";
if (file_exists(__DIR__ . '/app/Models/ReconciliationRun.php')) {
    echo "   ✓ ReconciliationRun model exists\n";
} else {
    echo "   ✗ ReconciliationRun model NOT found\n";
    echo "   ⚠️  CRITICAL: Model file is missing\n";
}

if (file_exists(__DIR__ . '/app/Http/Controllers/ReconciliationController.php')) {
    echo "   ✓ ReconciliationController exists\n";
} else {
    echo "   ✗ ReconciliationController NOT found\n";
}

echo "\n=== Diagnostic Complete ===\n";
echo "\nIf you see any ✗ or ⚠️  warnings above, fix those issues first.\n";
echo "Most common fix: Run 'php artisan migrate' to create the database tables.\n";

