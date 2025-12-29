# Troubleshooting Guide

## Server is Running But Site Won't Open?

### ✅ Verified: Server is Working
- Server is running on port 3000
- Health endpoint responding
- Main page is accessible

### Common Issues & Solutions

#### 1. **Wrong URL in Browser**
Make sure you're opening:
```
http://localhost:3000
```
**NOT** `https://` or a different port.

Try these URLs:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://[::1]:3000` (IPv6)

#### 2. **Browser Cache/Proxy Issues**
- Clear browser cache (Ctrl+Shift+Delete)
- Try incognito/private mode
- Try a different browser (Chrome, Firefox, Edge)
- Disable browser extensions temporarily

#### 3. **Windows Firewall**
The server might be blocked by Windows Firewall:
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Look for Node.js or add a new rule for port 3000

#### 4. **Proxy Settings**
If you're behind a corporate proxy:
- Check Internet Options → Connections → LAN Settings
- If proxy is enabled, try disabling it for local addresses
- Or add `localhost` and `127.0.0.1` to exceptions

#### 5. **Antivirus/Security Software**
Some security software blocks localhost connections:
- Temporarily disable antivirus
- Add Node.js to exceptions
- Check if your antivirus has a "web protection" feature blocking it

#### 6. **Port Already in Use**
If port 3000 is busy, the server won't start:
- Check: `netstat -ano | findstr :3000`
- Kill the process if needed
- Or change port in server/index.js

#### 7. **Browser Security Settings**
Some browsers block localhost:
- Check browser security settings
- Allow insecure localhost connections (Chrome: chrome://flags/#block-insecure-private-network-requests)
- Try disabling HTTPS enforcement for localhost

#### 8. **Check Server Console**
Look at the terminal where you ran `npm start` for error messages:
```
🚀 Media Downloader running on http://localhost:3000
🔒 Privacy-first: No tracking, local processing only
```

If you see errors, they'll help identify the issue.

### Quick Diagnostic Commands

Check if server is running:
```powershell
netstat -ano | findstr :3000
```

Test server response:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health
```

Check if Node.js can bind to port:
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
```

### Still Not Working?

1. **Check browser console** (F12 → Console tab) for errors
2. **Check Network tab** (F12 → Network) to see if requests are being made
3. **Verify server is actually running** in the terminal
4. **Try accessing from command line**:
   ```powershell
   Start-Process "http://localhost:3000"
   ```

### Alternative: Access from Network

If you want to access from another device on your network:
1. Find your local IP: `ipconfig` (look for IPv4 Address)
2. Start server with: `$env:HOST='0.0.0.0'; npm start`
3. Access from other device: `http://YOUR_IP:3000`

### Contact Info

If none of these work, check:
- Server terminal for error messages
- Browser console (F12) for JavaScript errors
- Windows Event Viewer for system errors

