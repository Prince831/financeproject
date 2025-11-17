# Fix: 500 Error When Fetching Transactions

## Immediate Fix Steps

### Step 1: Check if Transactions Table Exists

**On your live server, run:**
```bash
cd backend
php artisan tinker
>>> Schema::hasTable('transactions');
```

**If it returns `false`, run migrations:**
```bash
php artisan migrate
```

### Step 2: Verify Database Connection

```bash
php artisan tinker
>>> DB::connection()->getPdo();
```

**If this fails, check your `.env` file:**
```env
DB_CONNECTION=mysql
DB_HOST=your_host
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Step 3: Check Laravel Logs for Exact Error

```bash
tail -n 50 storage/logs/laravel.log
```

**Look for the exact error message** - it will tell you what's wrong.

### Step 4: Update Code (If Needed)

**Make sure you have the latest code:**
```bash
git pull gitlab feature/authentication-system
cd backend
php artisan config:clear
php artisan cache:clear
php artisan optimize
```

### Step 5: Check Browser Console

**After the fix, check the browser console** - you should now see a more detailed error message that will help identify the issue.

## Common Causes & Solutions

### Cause 1: Transactions Table Missing
**Error:** "Transactions table not found"
**Fix:** `php artisan migrate`

### Cause 2: Database Connection Failed
**Error:** "SQLSTATE[HY000] [2002] Connection refused"
**Fix:** Check `.env` database credentials

### Cause 3: Transaction Model Not Found
**Error:** "Class 'App\Models\Transaction' not found"
**Fix:** 
```bash
composer dump-autoload
php artisan config:clear
```

### Cause 4: PHP Syntax Error
**Error:** "syntax error, unexpected..."
**Fix:** Update code from GitLab (see Step 4)

## After Fixing

1. Clear browser cache
2. Refresh the page
3. Check browser console for the new detailed error message (if still failing)
4. The error message will now be more specific and helpful

