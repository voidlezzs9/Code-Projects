import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdir, stat } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SETTINGS_FILE = join(__dirname, '../settings.json');

export function ensureDownloadsDir(customPath = null) {
  const downloadsPath = customPath || join(__dirname, '../downloads');
  try {
    mkdirSync(downloadsPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
  return downloadsPath;
}

export function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export async function getDownloadsList() {
  try {
    const settings = getDownloadSettings();
    const downloadsDir = ensureDownloadsDir(settings.downloadPath);
    const files = await readdir(downloadsDir);
    
    const fileList = await Promise.all(
      files
        .filter(file => {
          const ext = file.split('.').pop().toLowerCase();
          return ['mp4', 'webm', 'm4a', 'mp3', 'mkv', 'avi', 'mov'].includes(ext);
        })
        .map(async (file) => {
          const filePath = join(downloadsDir, file);
          const stats = await stat(filePath);
          return {
            name: file,
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            date: stats.mtime,
            path: filePath
          };
        })
    );
    
    // Sort by date, newest first
    return fileList.sort((a, b) => b.date - a.date);
  } catch (error) {
    console.error('Error getting downloads list:', error);
    return [];
  }
}

export function getDownloadSettings() {
  const defaults = {
    downloadPath: join(__dirname, '../downloads'),
    defaultFormat: 'best',
    defaultQuality: '',
    autoOpenFolder: false
  };
  
  if (!existsSync(SETTINGS_FILE)) {
    // Create default settings file if directory exists
    try {
      const settingsDir = dirname(SETTINGS_FILE);
      if (existsSync(dirname(settingsDir))) {
        writeFileSync(SETTINGS_FILE, JSON.stringify(defaults, null, 2), 'utf8');
      }
    } catch (error) {
      // If we can't write, just return defaults
    }
    return defaults;
  }
  
  try {
    const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
    return { ...defaults, ...settings };
  } catch (error) {
    console.error('Error reading settings:', error);
    return defaults;
  }
}

export function saveDownloadSettings(newSettings) {
  const current = getDownloadSettings();
  const updated = { ...current, ...newSettings };
  
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

