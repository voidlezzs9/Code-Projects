# Setup Guide

## Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.7 or higher)
- **npm** or **yarn**

### Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

   Or if you prefer:
   ```bash
   python -m pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Platform-Specific Setup

### Windows

1. Install Node.js from [nodejs.org](https://nodejs.org/)
2. Install Python from [python.org](https://www.python.org/)
   - Make sure to check "Add Python to PATH" during installation
3. Open PowerShell or Command Prompt in the project directory
4. Run the installation commands above

### macOS

1. Install Node.js:
   ```bash
   brew install node
   ```

2. Install Python (usually pre-installed):
   ```bash
   python3 --version
   ```

3. Install dependencies:
   ```bash
   npm install
   pip3 install -r requirements.txt
   ```

### Linux

1. Install Node.js:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```

2. Install Python:
   ```bash
   sudo apt install python3 python3-pip
   ```

3. Install dependencies:
   ```bash
   npm install
   pip3 install -r requirements.txt
   ```

## Troubleshooting

### yt-dlp not found

If you get an error about yt-dlp not being found:

1. Make sure Python is in your PATH
2. Try installing yt-dlp globally:
   ```bash
   pip install yt-dlp
   ```
   or
   ```bash
   python -m pip install yt-dlp
   ```

### Port already in use

If port 3000 is already in use, set a different port:

```bash
PORT=3001 npm start
```

### Downloads folder permissions

Make sure the `downloads/` folder (created automatically) has write permissions.

## Development

- Server runs on `http://localhost:3000` by default
- Downloads are saved to `./downloads/` folder
- Server logs appear in the terminal

## Production Deployment

For production:

1. Set environment variables as needed
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name media-downloader
   ```
3. Configure reverse proxy (nginx, etc.) if needed
4. Use HTTPS for security

## Supported Platforms

The app supports downloading from:
- YouTube
- Instagram
- TikTok
- Twitter/X
- Facebook
- And many more (via yt-dlp)

## Privacy Note

This is a local application. All downloads happen on your server/device. No data is sent to external services.

