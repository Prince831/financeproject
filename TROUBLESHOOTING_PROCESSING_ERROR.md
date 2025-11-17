# Troubleshooting Processing Error on Live Server

## Step 1: Get the Exact Error Message

**On your live server, check the Laravel logs:**
```bash
cd /path/to/backend
tail -n 50 storage/logs/laravel.log
```

**Or check the browser console:**
- Open browser DevTools (F12)
- Go to Console tab
- Look for error messages
- Go to Network tab
- Check failed requests and their error responses

## Step 2: Common Processing Errors & Fixes

### Error: "Table 'reconciliation_runs' doesn't exist"
**Fix:** Run migrations
```bash
php artisan migrate
```

### Error: "Class 'App\Models\ReconciliationRun' not found"
**Fix:** 
```bash
composer dump-autoload
php artisan config:clear
php artisan cache:clear
```

### Error: "Syntax error, unexpected '->'"
**Fix:** Your live server has old code. Update it:
```bash
git pull gitlab feature/authentication-system
# OR manually update ReconciliationController.php
```

### Error: "Memory limit exceeded" or "Timeout"
**Fix:** Increase limits in `.env` or `php.ini`:
```ini
memory_limit = 512M
max_execution_time = 300
```

### Error: "File upload failed" or "Could not process file"
**Fix:** Check file permissions:
```bash
chmod -R 775 storage
chmod -R 775 bootstrap/cache
```

### Error: "Database connection failed"
**Fix:** Check `.env` database credentials:
```env
DB_CONNECTION=mysql
DB_HOST=your_host
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

## Step 3: Verify Code is Up to Date

**Check if live server has latest code:**
```bash
cd /path/to/project
git status
git log --oneline -5
```

**If not up to date, pull latest:**
```bash
git pull gitlab feature/authentication-system
```

**Then clear caches:**
```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
```

## Step 4: Check PHP Version

**Your live server needs PHP 8.0+:**
```bash
php -v
```

**If PHP version is too old, update it or contact your hosting provider.**

## Step 5: Run Diagnostic Script

```bash
cd backend
php check_deployment.php
```

This will show you exactly what's wrong.

## Step 6: Test Specific Endpoints

**Test if the API is working:**
```bash
# Test authentication
curl -X POST https://your-domain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test transactions endpoint
curl -X GET https://your-domain.com/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Still Need Help?

**Please provide:**
1. The exact error message from `storage/logs/laravel.log`
2. The error message from browser console (if any)
3. What action triggers the error (file upload, reconcile button, etc.)
4. PHP version: `php -v`
5. Laravel version: `php artisan --version`

