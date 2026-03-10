@echo off
title Skeptik Study Launcher

echo ==========================================
echo         Skeptik Study App Launcher
echo ==========================================
echo.

cd /d %~dp0

:: Install Node dependencies (first time)
if not exist node_modules (
    echo Installing web app dependencies - first time only...
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
start "" gazepoint_server\start_bridge.bat

:: Wait for bridge to start
timeout /t 3 /nobreak >nul

:: Start the web app
echo Starting Skeptik Web App...
npm start
