@echo off
cd /d "%~dp0pv_lab"
where node >nul 2>nul
if errorlevel 1 goto missing
echo PV Lab: http://127.0.0.1:8099
echo Demo:   http://127.0.0.1:8099/?demo=1
echo Stop: Ctrl+C
node src/server.mjs
pause
exit /b
:missing
echo Install Node.js 22 or newer, then run this file again.
pause
