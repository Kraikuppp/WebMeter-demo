@echo off
echo ========================================
echo WebMeter Holiday & FT Database Setup
echo ========================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL and add it to your PATH
    pause
    exit /b 1
)

REM Set database connection parameters
set DB_USER=webmeter_user
set DB_NAME=webmeter_db
set DB_HOST=localhost
set DB_PORT=5432

echo Database Connection Parameters:
echo User: %DB_USER%
echo Database: %DB_NAME%
echo Host: %DB_HOST%
echo Port: %DB_PORT%
echo.

REM Prompt for password
set /p DB_PASSWORD=Enter database password for %DB_USER%: 

echo.
echo Creating Holiday & FT tables and inserting initial data...
echo.

REM Run the SQL script
psql -U %DB_USER% -d %DB_NAME% -h %DB_HOST% -p %DB_PORT% -f create_holiday_ft_tables.sql

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS: Holiday & FT database setup completed!
    echo ========================================
    echo.
    echo The following tables have been created:
    echo - holiday (with initial data for 13 years)
    echo - ft_config (with default configurations)
    echo.
    echo API endpoints are available at:
    echo - /api/holiday
    echo - /api/ft-config
    echo.
    echo Please check the HOLIDAY_FT_SETUP_GUIDE.md for usage instructions.
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Database setup failed!
    echo ========================================
    echo.
    echo Please check:
    echo 1. Database connection parameters
    echo 2. User permissions
    echo 3. Database exists
    echo 4. PostgreSQL service is running
    echo.
)

pause
