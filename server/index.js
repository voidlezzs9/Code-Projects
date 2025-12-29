import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { downloadYouTubeVideo, downloadMediaFromURL } from './downloaders.js';
import { ensureDownloadsDir, getDownloadsList, getDownloadSettings, saveDownloadSettings } from './utils.js';
import { readdir, stat } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Store active downloads for progress tracking
const activeDownloads = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Ensure downloads directory exists on startup
try {
  ensureDownloadsDir();
} catch (error) {
  console.error('Error initializing downloads directory:', error);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', privacy: 'no-tracking' });
});

// Download endpoint with progress tracking
app.post('/api/download', async (req, res) => {
  try {
    const { url, format, quality } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const downloadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Start download in background
    downloadMediaFromURL(url, format || 'best', quality, downloadId, activeDownloads)
      .then(result => {
        activeDownloads.set(downloadId, { ...result, status: 'completed' });
        // Clean up after 1 minute
        setTimeout(() => activeDownloads.delete(downloadId), 60000);
      })
      .catch(error => {
        activeDownloads.set(downloadId, { 
          status: 'error', 
          error: error.message 
        });
        setTimeout(() => activeDownloads.delete(downloadId), 60000);
      });

    res.json({
      success: true,
      message: 'Download started',
      downloadId: downloadId
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: error.message || 'Download failed',
      privacy: 'Error logged locally only'
    });
  }
});

// Get download progress
app.get('/api/download/:id/progress', (req, res) => {
  const { id } = req.params;
  const download = activeDownloads.get(id);
  
  if (!download) {
    return res.status(404).json({ error: 'Download not found' });
  }
  
  res.json(download);
});

// Get video info (without downloading)
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const info = await downloadMediaFromURL(url, 'info');

    res.json({
      success: true,
      info: info
    });
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get video info'
    });
  }
});

// Get downloads list
app.get('/api/downloads', async (req, res) => {
  try {
    const downloads = await getDownloadsList();
    res.json({ success: true, downloads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = getDownloadSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/settings', (req, res) => {
  try {
    const settings = saveDownloadSettings(req.body);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Open downloads folder (platform-specific)
app.post('/api/open-folder', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const settings = getDownloadSettings();
    const downloadsDir = ensureDownloadsDir(settings.downloadPath);
    
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      command = `explorer "${downloadsDir.replace(/\//g, '\\')}"`;
    } else if (platform === 'darwin') {
      command = `open "${downloadsDir}"`;
    } else {
      command = `xdg-open "${downloadsDir}"`;
    }
    
    await execAsync(command);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Open specific file
app.post('/api/open-file', async (req, res) => {
  try {
    const { path: filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      command = `start "" "${filePath.replace(/\//g, '\\')}"`;
    } else if (platform === 'darwin') {
      command = `open "${filePath}"`;
    } else {
      command = `xdg-open "${filePath}"`;
    }
    
    await execAsync(command);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Media Downloader running on http://localhost:${PORT}`);
  console.log(`🔒 Privacy-first: No tracking, local processing only`);
});

