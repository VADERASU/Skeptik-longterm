@echo off
title Skeptik Study Launcher

echo ==========================================
echo         Skeptik Study App Launcher
echo ==========================================
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
        set URL_PARAMS=?g=0
    ) else (
        set URL_PARAMS=%URL_PARAMS%^&g=0
    )
)
if "%OVERLAY%"=="true" (
    if "%URL_PARAMS%"=="" (
        set URL_PARAMS=?o=1
    ) else (
        set URL_PARAMS=%URL_PARAMS%^&o=1
    )
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
timeout /t 2 /nobreak >nul

:: Start the web app in a new window
echo Starting Skeptik Web App...
start "Skeptik Web Server" cmd /k "npm start"

:: Wait for server to start
echo Waiting for server to start...
timeout /t 8 /nobreak >nul

:: Open Chrome with URL parameters
echo Opening browser...
start chrome http://localhost:3000%URL_PARAMS%
