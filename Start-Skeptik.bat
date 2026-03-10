@echo off
title Skeptik Study Launcher

echo ==========================================
echo         Skeptik Study App Launcher
echo ==========================================
echo.

cd /d "%~dp0"

:: Check for Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python is not installed!
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

:: Check for Node.js
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Install Python dependencies (first time)
echo Checking Python dependencies...
pip install -q websockets lxml

:: Install Node dependencies (first time)
if not exist "node_modules" (
    echo Installing web app dependencies (first time only)...
    call npm install
)

echo.
echo ==========================================
echo   INSTRUCTIONS:
echo   1. Make sure Gazepoint Control is running
echo   2. Two windows will open - keep both open
echo   3. The browser will open automatically
echo ==========================================
echo.
pause

:: Start Gazepoint Bridge in a new window
echo Starting Gazepoint Bridge...
start "Gazepoint Bridge" cmd /k "cd /d "%~dp0gazepoint_server" && python gazepoint_bridge.py"

:: Wait a moment for bridge to start
timeout /t 3 /nobreak >nul

:: Start the web app
echo Starting Skeptik Web App...
call npm start
