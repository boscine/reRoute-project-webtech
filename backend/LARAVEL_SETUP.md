# Laravel Backend Boilerplate for ReRoute Campus Locator

This directory contains the architecture and specifications ready for your Laravel application.

## Directory Structure
- `app/Models/`
  - `Building.php`
  - `Floor.php`
  - `Location.php`
  - `ScanLog.php`
  - `User.php`
  - `ActivityLog.php`
- `app/Http/Controllers/`
  - `PublicLocationController.php` (resolves `?loc=`, serves `/api/buildings`, `/api/floors`)
  - `Admin/AuthController.php` (login, logout, session check)
  - `Admin/DashboardController.php` (counts, recent scans)
  - `Admin/BuildingController.php` (full CRUD)
  - `Admin/FloorController.php` (full CRUD)
  - `Admin/LocationController.php` (full CRUD)
  - `Admin/QrCodeController.php` (image generation, target redirection)
  - `Admin/ScanLogController.php` (read-only audit)
  - `Admin/UserController.php` (admin user management)
  - `Admin/ReportController.php` (analytics & stats)
  - `Admin/ActivityLogController.php` (audit logs)
- `routes/api.php`
- `database/migrations/`
- `database/seeders/`
