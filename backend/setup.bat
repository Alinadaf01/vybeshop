@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   VYBE backend - dev environment setup
echo ============================================
echo.
echo Run this by double-clicking it, or from a plain CMD window.
echo Everything below runs inside the project's own venv, never
echo against your system Python install.
echo.

REM ---- 1) Docker Desktop must be running ----
echo [1/6] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Docker does not appear to be running.
    echo Open Docker Desktop, wait until it is fully started ^(whale icon
    echo in the system tray^), then run this file again.
    echo.
    pause
    exit /b 1
)
echo    OK

REM ---- 2) bring up Postgres + Redis ----
echo [2/6] Starting Postgres and Redis via Docker...
docker compose up -d
if errorlevel 1 (
    echo ERROR: docker compose up failed. See output above.
    pause
    exit /b 1
)

REM ---- 3) create venv if missing, then activate it ----
echo [3/6] Preparing Python virtual environment ^(venv^)...
if not exist ".venv\Scripts\python.exe" (
    echo    No venv found, creating one...
    py -3 -m venv .venv 2>nul
    if not exist ".venv\Scripts\python.exe" (
        python -m venv .venv
    )
    if not exist ".venv\Scripts\python.exe" (
        echo ERROR: could not find a Python 3 install on this machine.
        echo Install Python 3.11+ from python.org and run this again.
        pause
        exit /b 1
    )
)
call ".venv\Scripts\activate.bat"
echo    venv active: %VIRTUAL_ENV%

REM ---- 4) create .env with dev defaults if missing ----
REM NOTE: docker-compose.yml maps container Postgres port 5432 to HOST
REM port 5433, because this machine's native Postgres install already
REM owns port 5432. Django's own default DATABASE_URL points at 5432,
REM so without this file it can silently connect to the wrong database.
if not exist ".env" (
    echo [4/6] No .env found, creating one with dev defaults...
    (
        echo DEBUG=True
        echo SECRET_KEY=dev-secret-key-change-me-in-production
        echo ALLOWED_HOSTS=localhost,127.0.0.1
        echo DATABASE_URL=postgres://vybeshop:vybeshop@localhost:5433/vybeshop
        echo REDIS_URL=redis://localhost:6379/0
        echo FRONTEND_BASE_URL=http://localhost:5173
        echo BACKEND_BASE_URL=http://localhost:8000
    ) > ".env"
    echo    Created backend\.env
) else (
    echo [4/6] .env already exists, leaving it alone.
)

REM ---- 5) install dependencies inside the venv ----
echo [5/6] Installing Python dependencies into the venv...
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: dependency install failed.
    pause
    exit /b 1
)

echo    Installing Chromium for PDF generation ^(invoices, reports^)...
python -m playwright install chromium
if errorlevel 1 (
    echo WARNING: Playwright Chromium install failed - PDF generation will not work.
    echo You can retry later with: python -m playwright install chromium
)

REM ---- 6) wait briefly for Postgres, then migrate ----
echo [6/6] Waiting for the database to be ready...
timeout /t 5 /nobreak >nul

echo    Running migrations...
python manage.py migrate
if errorlevel 1 (
    echo.
    echo ERROR: migrate failed. If the database was still starting up,
    echo wait a few seconds and run this in the same window:
    echo    python manage.py migrate
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Setup complete.
echo.
echo   This window has the venv active. To start the dev server:
echo       python manage.py runserver
echo.
echo   To create your first admin account ^(if you have not yet^):
echo       python manage.py createsuperuser
echo ============================================
echo.

cmd /k
