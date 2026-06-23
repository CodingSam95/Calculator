@echo off
if not "%1"=="am_minimized" (
    start "" /min "%~f0" am_minimized
    exit /b
)

start "" "http://localhost:5500"
"%~dp0caddy.exe" file-server --listen :5500 --root .