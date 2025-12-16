@echo off
SETLOCAL EnableDelayedExpansion

:: ============================================================================
:: TUDB - Talk to Your Database - Setup and Run Script
:: ============================================================================
:: This script checks dependencies, installs if needed, and starts all services
:: ============================================================================

echo.
echo ========================================
echo   TUDB Setup and Run Script
echo   Talk to Your Database
echo ========================================
echo.

:: Check if Node.js is installed
echo [1/10] Checking prerequisites...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed!
    echo Please install npm or ensure it's in your PATH
    pause
    exit /b 1
)

echo [OK] Node.js and npm are installed
node --version
npm --version
echo.

:: Check if PostgreSQL client is available (optional)
psql --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL client (psql) not found
    echo You'll need a PostgreSQL database to run TUDB
    echo Install from: https://www.postgresql.org/download/
    echo Or use cloud providers: Supabase, Neon, Railway, or AWS RDS
    echo.
) else (
    echo [OK] PostgreSQL client is available
    psql --version
    echo.
)

:: Install root dependencies
echo [2/10] Checking root workspace dependencies...
if exist node_modules (
    echo [OK] Root dependencies already installed - skipping
) else (
    echo Installing root workspace dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install root dependencies
        pause
        exit /b 1
    )
    echo [OK] Root dependencies installed
)
echo.

:: Install backend dependencies
echo [3/10] Checking backend dependencies...
cd backend
if exist package.json (
    if exist node_modules (
        echo [OK] Backend dependencies already installed - skipping
    ) else (
        echo Installing backend dependencies...
        call npm install
        if errorlevel 1 (
            echo [ERROR] Failed to install backend dependencies
            cd ..
            pause
            exit /b 1
        )
        echo [OK] Backend dependencies installed
    )
) else (
    echo [WARNING] backend/package.json not found, skipping...
)
cd ..
echo.

:: Install admin dashboard dependencies
echo [4/10] Checking admin dashboard dependencies...
cd admin-dashboard
if exist package.json (
    if exist node_modules (
        echo [OK] Admin dashboard dependencies already installed - skipping
    ) else (
        echo Installing admin dashboard dependencies...
        call npm install
        if errorlevel 1 (
            echo [ERROR] Failed to install admin dashboard dependencies
            cd ..
            pause
            exit /b 1
        )
        echo [OK] Admin dashboard dependencies installed
    )
) else (
    echo [WARNING] admin-dashboard/package.json not found, skipping...
)
cd ..
echo.

:: Skip MCP tool server (not needed for current setup)
echo [5/10] Skipping MCP tool server (not needed)...
echo.

:: Skip test dependencies
echo [6/10] Skipping test dependencies...
echo.

:: Create logs directory
echo [7/10] Creating logs directory...
if not exist logs mkdir logs
echo [OK] Logs directory ready
echo.

:: Setup environment file
echo [8/10] Setting up environment configuration...
if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo [OK] Created .env from .env.example
        echo [WARNING] Please configure .env file with your credentials
    ) else (
        echo [WARNING] .env.example not found, skipping environment setup
    )
) else (
    echo [OK] .env file already exists
)

if not exist admin-dashboard\.env.local (
    echo [INFO] Creating admin-dashboard/.env.local...
    echo VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZXhjaXRpbmctY3JheWZpc2gtMjcuY2xlcmsuYWNjb3VudHMuZGV2JA > admin-dashboard\.env.local
    echo VITE_API_URL=http://localhost:3000 >> admin-dashboard\.env.local
    echo [OK] Created admin-dashboard/.env.local
) else (
    echo [OK] admin-dashboard/.env.local already exists
)
echo.

:: Build TypeScript
echo [9/10] Building TypeScript...
if exist dist (
    echo [OK] Build already exists - skipping
) else (
    echo Building TypeScript...
    call npm run build
    if errorlevel 1 (
        echo [WARNING] TypeScript build failed
        echo Continuing anyway...
    ) else (
        echo [OK] TypeScript build completed
    )
)
echo.

:: Skip database migrations for now
echo [10/10] Skipping database migrations...
echo [INFO] Database will be created on Heroku
echo.

:finish_setup

:: Display completion and start services
echo.
echo ========================================
echo   Setup Complete! Starting Services...
echo ========================================
echo.
echo Starting TUDB services in new windows:
echo   - Backend API (http://localhost:3000)
echo   - Admin Dashboard (http://localhost:5173)
echo.
echo Press Ctrl+C in each window to stop services
echo.

:: Start backend in new window
start "TUDB Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Wait a bit for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "TUDB Admin Dashboard" cmd /k "cd /d %~dp0admin-dashboard && npm run dev"

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo Backend API:       http://localhost:3000
echo Admin Dashboard:   http://localhost:5173
echo.
echo Two new windows opened:
echo   1. TUDB Backend
echo   2. TUDB Admin Dashboard
echo.
echo Sign in with Clerk at: http://localhost:5173/sign-in
echo.
echo To stop services: Close the terminal windows or press Ctrl+C
echo.
echo ========================================

pause
ENDLOCAL
