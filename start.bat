@echo off
echo Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found in PATH. Adding C:\Program Files\nodejs...
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

echo Installing dependencies...
call npm install
echo.

echo Checking Python...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Python not found!
    echo yt-dlp is recommended for better compatibility.
    echo See INSTALL_PYTHON.md for installation instructions.
    echo.
    echo The app will try to use ytdl-core as fallback, but it may not work for all videos.
    echo.
) else (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    echo.
)

echo Starting Media Downloader...
echo.
npm start

