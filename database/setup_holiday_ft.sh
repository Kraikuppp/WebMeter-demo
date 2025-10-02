#!/bin/bash

echo "========================================"
echo "WebMeter Holiday & FT Database Setup"
echo "========================================"
echo

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "ERROR: PostgreSQL is not installed or not in PATH"
    echo "Please install PostgreSQL and add it to your PATH"
    exit 1
fi

# Set database connection parameters
DB_USER="webmeter_user"
DB_NAME="webmeter_db"
DB_HOST="localhost"
DB_PORT="5432"

echo "Database Connection Parameters:"
echo "User: $DB_USER"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo

# Prompt for password
read -s -p "Enter database password for $DB_USER: " DB_PASSWORD
echo

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

echo
echo "Creating Holiday & FT tables and inserting initial data..."
echo

# Run the SQL script
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f create_holiday_ft_tables.sql

if [ $? -eq 0 ]; then
    echo
    echo "========================================"
    echo "SUCCESS: Holiday & FT database setup completed!"
    echo "========================================"
    echo
    echo "The following tables have been created:"
    echo "- holiday (with initial data for 13 years)"
    echo "- ft_config (with default configurations)"
    echo
    echo "API endpoints are available at:"
    echo "- /api/holiday"
    echo "- /api/ft-config"
    echo
    echo "Please check the HOLIDAY_FT_SETUP_GUIDE.md for usage instructions."
    echo
else
    echo
    echo "========================================"
    echo "ERROR: Database setup failed!"
    echo "========================================"
    echo
    echo "Please check:"
    echo "1. Database connection parameters"
    echo "2. User permissions"
    echo "3. Database exists"
    echo "4. PostgreSQL service is running"
    echo
    exit 1
fi

# Clear password from environment
unset PGPASSWORD
