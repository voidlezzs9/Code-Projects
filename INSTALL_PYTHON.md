# Installing Python and yt-dlp for Better Compatibility

## Why Install Python + yt-dlp?

While the app has a fallback to `ytdl-core` for YouTube, **yt-dlp** is much more reliable and supports 100+ platforms. YouTube frequently changes their API, which can break `ytdl-core`, but yt-dlp is regularly updated.

## Installation Steps

### Option 1: Microsoft Store (Easiest for Windows)
1. Press `Win + R`, type `ms-windows-store://` and press Enter
2. Search for "Python 3.12" or "Python 3.11"
3. Click Install
4. After installation, restart your terminal

### Option 2: Official Installer
1. Go to https://www.python.org/downloads/
2. Download Python 3.11 or 3.12 (latest stable)
3. **IMPORTANT**: During installation, check ✅ **"Add Python to PATH"**
4. Click "Install Now"
5. Restart your terminal after installation

### Verify Installation
Open PowerShell and run:
```powershell
python --version
```
You should see something like `Python 3.12.x`

### Install yt-dlp
Once Python is installed:
```powershell
pip install yt-dlp
```

Or if `pip` doesn't work:
```powershell
python -m pip install yt-dlp
```

### Verify yt-dlp
```powershell
yt-dlp --version
```

### Restart Your Server
After installing, restart your media downloader server:
```powershell
# Stop the current server (Ctrl+C in the terminal)
# Then start again:
npm start
```

## Benefits
- ✅ More reliable YouTube downloads
- ✅ Support for 100+ platforms (Instagram, TikTok, Twitter, etc.)
- ✅ Better quality options
- ✅ Regular updates for platform compatibility

## Troubleshooting

### "Python was not found"
- Make sure you checked "Add Python to PATH" during installation
- Restart your terminal/IDE after installing Python
- Try `python3` instead of `python`

### "pip is not recognized"
- Try: `python -m pip install yt-dlp`
- Or: `py -m pip install yt-dlp`

### Still having issues?
The app will try to use ytdl-core as a fallback for YouTube, but it may not work for all videos due to YouTube's frequent API changes.

