@echo off
title Verno AI Development Studio
echo ========================================================
echo    Starting Verno AI Software Development Studio...
echo ========================================================
echo.

set "VERNO_ROOT=%~dp0"
set "BACKEND_DIR=%VERNO_ROOT%backend"
set "IDE_DIR=%VERNO_ROOT%ide"
set "TARGET_DIR=%~1"
if "%TARGET_DIR%"=="" set "TARGET_DIR=%VERNO_ROOT%workspace"

:: 1. Check if backend is already listening on port 8000
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Verno Backend is running on port 8000.
) else (
    echo [*] Starting Verno Backend on http://127.0.0.1:8000...
    start "Verno Backend Server" /min cmd /k "cd /d "%BACKEND_DIR%" && python -m uvicorn main:app --host 127.0.0.1 --port 8000"
    ping 127.0.0.1 -n 3 >nul
)

:: 2. Launch Verno Code-OSS Studio
set "EXE_PATH=%IDE_DIR%\Verno.exe"
if not exist "%EXE_PATH%" set "EXE_PATH=%IDE_DIR%\VSCodium.exe"

if exist "%EXE_PATH%" (
    echo [*] Launching Verno Studio IDE in "%TARGET_DIR%"...
    cd /d "%IDE_DIR%"
    start "" "%EXE_PATH%" "%TARGET_DIR%"
    echo [OK] Verno AI Studio launched successfully!
    ping 127.0.0.1 -n 3 >nul
) else (
    echo [ERROR] Verno executable not found in %IDE_DIR%
    pause
)
