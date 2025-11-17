# Quick Fix Guide - Server Error on Live Site

## Step-by-Step Instructions

### Step 1: Connect to Your Live Server
SSH into your server or access it via your hosting control panel.

### Step 2: Navigate to Backend Directory
```bash
cd /path/to/your/project/backend
```
(Replace `/path/to/your/project` with your actual project path)

### Step 3: Run Database Migrations
This is the **MOST IMPORTANT** step - it creates the required database table:
```bash
php artisan migrate
```

**Expected output:**
```
Migrating: 2025_11_17_190000_rebuild_reconciliation_reports_table
Dropping: reconciliation_reports
Migrated:  2025_11_17_190000_rebuild_reconciliation_reports_table (XX.XXms)
```

### Step 4: Clear and Rebuild Caches
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
```

### Step 5: Verify the Fix
1. Refresh your website
2. Try the reconciliation feature again
3. The error should be gone!

---

## If Step 3 Fails (Migration Error)

### Option A: Check Database Connection
```bash
php artisan tinker
>>> DB::connection()->getPdo();
```
If this fails, check your `.env` file database credentials.

### Option B: Run Diagnostic Script
```bash
php check_deployment.php
```
This will show you exactly what's wrong.

### Option C: Manual SQL Fix
1. Open your database management tool (phpMyAdmin, etc.)
2. Open the file: `backend/database/migrations/MANUAL_SQL_FIX.sql`
3. Copy and paste the SQL into your database tool
4. Execute it

---

## Still Having Issues?

Check the Laravel error log:
```bash
tail -f storage/logs/laravel.log
```

Look for error messages and share them if you need help.

---

## Summary
**The main fix is running: `php artisan migrate`**

This creates the `reconciliation_runs` table that the application needs.

