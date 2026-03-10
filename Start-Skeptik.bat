@echo off
title Skeptik Study Launcher

echo ==========================================
echo         Skeptik Study App Launcher
echo ==========================================
echo.
echo Usage: Start-Skeptik.bat [options]
echo   --control    Hide annotations (control group)
echo   --overlay    Show eye tracking overlay
echo.

cd /d %~dp0

:: Parse arguments
set URL_PARAMS=
set CONTROL=false
set OVERLAY=false

:parse_args
if "%~1"=="" goto done_args
if /i "%~1"=="--control" set CONTROL=true
if /i "%~1"=="--overlay" set OVERLAY=true
shift
goto parse_args
:done_args

:: Build URL parameters
if "%CONTROL%"=="true" (
    if "%URL_PARAMS%"=="" (
        set URL_PARAMS=?control=true
    ) else (
        set URL_PARAMS=%URL_PARAMS%^&control=true
    )
)
if "%OVERLAY%"=="true" (
    if "%URL_PARAMS%"=="" (
        set URL_PARAMS=?overlay=true
    ) else (
        set URL_PARAMS=%URL_PARAMS%^&overlay=true
    )
)

echo Settings:
echo   Control Group (no annotations): %CONTROL%
echo   Show Gaze Overlay: %OVERLAY%
echo.

:: Install Node dependencies (first time)
if not exist node_modules (
    echo Installing web app dependencies - first time only...
    call npm install
)

echo ==========================================
echo   Make sure Gazepoint Control is running
echo   Two windows will open - keep both open
echo ==========================================
echo.
pause

:: Start Gazepoint Bridge in a new window
echo Starting Gazepoint Bridge...
start "" gazepoint_server\start_bridge.bat

:: Wait for bridge to start
timeout /t 3 /nobreak >nul

:: Start the web app with URL parameters
echo Starting Skeptik Web App...
set BROWSER=none
start "" http://localhost:3000%URL_PARAMS%
npm start
