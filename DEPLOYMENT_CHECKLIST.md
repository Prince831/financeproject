# Deployment Checklist for Live Server

## Critical Steps Required

### 1. Database Migrations
**MUST RUN on live server:**
```bash
cd backend
php artisan migrate
```

This will:
- Drop the old `reconciliation_reports` table (if it exists)
- Create the new `reconciliation_runs` table
- Apply all other pending migrations

**⚠️ WARNING:** This will delete all existing reconciliation reports data. If you need to preserve data, export it first.

### 2. Environment Configuration
Ensure `.env` file on live server has:
- `DB_CONNECTION=mysql` (or your database type)
- `DB_HOST=your_database_host`
- `DB_PORT=3306` (or your port)
- `DB_DATABASE=your_database_name`
- `DB_USERNAME=your_database_user`
- `DB_PASSWORD=your_database_password`
- `APP_ENV=production`
- `APP_DEBUG=false` (for security)
- `APP_URL=https://your-domain.com`

### 3. Composer Dependencies
```bash
cd backend
composer install --no-dev --optimize-autoloader
```

### 4. Laravel Optimization
```bash
cd backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### 5. Storage Permissions
```bash
cd backend
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 6. Frontend Build
```bash
npm run build
```

### 7. Verify Database Connection
Test that the application can connect to the database:
```bash
cd backend
php artisan tinker
>>> DB::connection()->getPdo();
```

### 8. Check PHP Version
Ensure PHP 8.0+ is installed (the code uses modern PHP syntax):
```bash
php -v
```

### 9. Check Required PHP Extensions
```bash
php -m | grep -E "pdo|mbstring|openssl|tokenizer|json|xml|curl|zip"
```

## Common Issues and Solutions

### Issue: "Table 'reconciliation_runs' doesn't exist"
**Solution:** Run migrations: `php artisan migrate`

### Issue: "Class 'App\Models\ReconciliationRun' not found"
**Solution:** 
1. Run `composer dump-autoload`
2. Clear cache: `php artisan config:clear && php artisan cache:clear`

### Issue: "500 Server Error"
**Solution:**
1. Check Laravel logs: `tail -f storage/logs/laravel.log`
2. Enable debug temporarily: Set `APP_DEBUG=true` in `.env` (remember to set back to false)
3. Check file permissions on `storage/` and `bootstrap/cache/`

### Issue: "CORS Error"
**Solution:** Ensure CORS is configured in `config/cors.php` and middleware is enabled

## Post-Deployment Verification

1. Test authentication (login/register)
2. Test file upload
3. Test reconciliation process
4. Test history panel
5. Check browser console for errors
6. Check server logs for any warnings

