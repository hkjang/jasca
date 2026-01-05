@echo off
REM Trivy Security Scanner Script (Batch)
REM Usage: run-trivy.bat [target] [scan-type] [format]

setlocal enabledelayedexpansion

set TARGET=%1
set SCAN_TYPE=%2
set FORMAT=%3

if "%TARGET%"=="" set TARGET=.
if "%SCAN_TYPE%"=="" set SCAN_TYPE=fs
if "%FORMAT%"=="" set FORMAT=table

echo ========================================
echo        Trivy Security Scanner
echo ========================================
echo.

REM Check if Trivy is installed
where trivy >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Trivy is not installed or not in PATH
    echo.
    echo Install Trivy using one of the following methods:
    echo   - Chocolatey: choco install trivy
    echo   - Scoop: scoop install trivy
    echo   - Download: https://github.com/aquasecurity/trivy/releases
    exit /b 1
)

echo [INFO] Running: trivy %SCAN_TYPE% %TARGET% --format %FORMAT%
echo ----------------------------------------

trivy %SCAN_TYPE% %TARGET% --format %FORMAT% --severity CRITICAL,HIGH,MEDIUM,LOW

echo ----------------------------------------
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Scan completed successfully
) else (
    echo [WARNING] Scan completed with exit code: %ERRORLEVEL%
)

endlocal
