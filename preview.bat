@echo off
REM AutomateX local preview launcher.
REM Double-click to start a local web server and open the site in your browser.
REM Tries live-reload via Node first; falls back to Python; then a direct file open.
REM Local-only utility. Add to .gitignore if you don't want to commit it.

setlocal EnableDelayedExpansion
title AutomateX preview
cd /d "%~dp0"

echo.
echo  ===========================================
echo    AutomateX local preview
echo  ===========================================
echo.

where node >nul 2>nul
if !errorlevel!==0 (
    echo  Node detected. Starting live-reload server with browser-sync.
    echo  The browser will open. Edits to HTML/CSS/JS auto-refresh.
    echo  First run may take 30 seconds to download browser-sync.
    echo.
    echo  Press Ctrl+C in this window to stop the server.
    echo.
    call npx --yes browser-sync start --server --files "*.html,*.css,*.js" --no-notify --port 3010
    goto end
)

where python >nul 2>nul
if !errorlevel!==0 (
    echo  Python detected. Starting http.server on port 8765.
    echo  After editing files, refresh the browser ^(Ctrl+R^) to see changes.
    echo.
    echo  Press Ctrl+C in this window to stop the server.
    echo.
    start "" "http://localhost:8765/"
    python -m http.server 8765
    goto end
)

echo  No Node or Python found.
echo  Opening index.html directly in your default browser.
echo  Note: some features that need a local server may not work this way.
echo.
start "" "%~dp0index.html"
pause

:end
endlocal
