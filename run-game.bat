@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, or open this folder with the VS Code Live Server extension.
  pause
  exit /b 1
)
start "Nova Drift local server" /min node server.js
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8000
