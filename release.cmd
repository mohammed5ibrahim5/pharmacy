@echo off
rem One-click release for the Dawai app. Double-click for an interactive run,
rem or pass arguments, e.g.:  release.cmd -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
set "ERR=%ERRORLEVEL%"
pause
exit /b %ERR%
