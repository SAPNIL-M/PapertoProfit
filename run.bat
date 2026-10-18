@echo off
title PaperToProfit Server
echo ========================================================
echo   PaperToProfit - Handwritten Bill AI & Analytics
echo ========================================================
echo.
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    echo Starting server at http://127.0.0.1:8000 ...
    start "" http://127.0.0.1:8000
    ".venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo Starting server at http://127.0.0.1:8000 ...
    start "" http://127.0.0.1:8000
    python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
)

pause
