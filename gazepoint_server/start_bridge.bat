@echo off
title Gazepoint Bridge
cd /d %~dp0..
call venv\Scripts\activate.bat
cd gazepoint_server
python gazepoint_bridge.py
pause
