@echo off
echo.
echo ========================================
echo   StudySync - Quick Start
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "StudySync Backend" cmd /k "cd /d %~dp0server && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Client...
start "StudySync Frontend" cmd /k "cd /d %~dp0client && npm start"

timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   StudySync is Starting!
echo ========================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo.
echo   Opening browser...
echo ========================================
echo.

start http://localhost:5173

echo.
echo Press any key to close this window...
pause >nul
