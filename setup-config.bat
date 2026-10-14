@echo off
REM ============================================================
REM  Project Helix — First-Run Configuration Helper
REM  Run this ONCE after installing, before launching the app.
REM ============================================================

SET CONFIG_DIR=%LOCALAPPDATA%\ProjectHelix
SET ENV_FILE=%CONFIG_DIR%\backend\.env

IF EXIST "%ENV_FILE%" (
  echo Configuration already exists at:
  echo   %ENV_FILE%
  echo.
  echo If you need to update it, edit that file directly.
  pause
  exit /b 0
)

echo.
echo === Project Helix — First-Run Setup ===
echo.
echo This script will create your configuration file.
echo You need: MongoDB URI, Gemini API Key, and JWT secrets.
echo.

SET /P MONGO_URI=Enter your MongoDB Atlas URI (mongodb+srv://...): 
SET /P GEMINI_KEY=Enter your Gemini API Key: 
SET /P JWT_SECRET=Enter a long random JWT secret (any 40+ chars): 
SET /P JWT_REFRESH=Enter a different long random refresh secret: 

MKDIR "%CONFIG_DIR%\backend" 2>NUL

(
echo PORT=5000
echo MONGO_URI=%MONGO_URI%
echo DB_NAME=helix
echo JWT_SECRET=%JWT_SECRET%
echo JWT_REFRESH_SECRET=%JWT_REFRESH%
echo NODE_ENV=production
echo GEMINI_API_KEY=%GEMINI_KEY%
echo AI_PROVIDER=gemini
echo GEMINI_MODEL=gemini-2.0-flash
echo PYTHON_AI_URL=http://127.0.0.1:8000
) > "%ENV_FILE%"

echo.
echo Configuration saved to:
echo   %ENV_FILE%
echo.
echo You can now launch Project Helix.
pause
