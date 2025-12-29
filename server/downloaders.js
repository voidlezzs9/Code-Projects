import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ensureDownloadsDir, sanitizeFilename } from './utils.js';
import ytdl from 'ytdl-core';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect platform from URL
function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  } else if (url.includes('instagram.com')) {
    return 'instagram';
  } else if (url.includes('tiktok.com')) {
    return 'tiktok';
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  return 'generic';
}

// Check if yt-dlp is available (either as command or via python -m)
async function checkYtDlpAvailable() {
  try {
    await execAsync('yt-dlp --version');
    return 'yt-dlp';
  } catch {
    try {
      await execAsync('python -m yt_dlp --version');
      return 'python -m yt_dlp';
    } catch {
      return null;
    }
  }
}

// Download using yt-dlp (supports many platforms)
async function downloadWithYtDlp(url, format = 'best', quality = null, downloadId = null, progressMap = null) {
  // Get download path from settings
  const { getDownloadSettings } = await import('./utils.js');
  const settings = getDownloadSettings();
  const downloadsDir = ensureDownloadsDir(settings.downloadPath);
  
  // Check which yt-dlp command is available
  const ytdlpCmd = await checkYtDlpAvailable();
  if (!ytdlpCmd) {
    throw new Error('yt-dlp not found. Please install it with: pip install yt-dlp or python -m pip install yt-dlp');
  }
  
  let formatOption;
  if (format === 'audio') {
    formatOption = 'bestaudio[ext=m4a]/bestaudio';
  } else if (quality) {
    // Support quality like 1080p, 720p, 480p, 360p
    const height = quality.replace('p', '');
    formatOption = `best[height<=${height}]/best`;
  } else {
    formatOption = 'best[height<=1080]/best';
  }
  
  const outputTemplate = join(downloadsDir, '%(title)s.%(ext)s');
  
  // Update progress
  if (progressMap && downloadId) {
    progressMap.set(downloadId, { status: 'downloading', progress: 0, url });
  }
  
  const command = `${ytdlpCmd} -f "${formatOption}" -o "${outputTemplate}" --no-playlist --no-mtime --newline "${url}"`;
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    // Parse output to get filename
    const lines = stdout.split('\n');
    let filename = 'download';
    
    // Try to find filename in output
    const destinationLine = lines.find(line => line.includes('[download] Destination:'));
    if (destinationLine) {
      const match = destinationLine.match(/\[download\] Destination: (.+)/);
      if (match) {
        filename = match[1].split(/[\\/]/).pop();
      }
    }
    
    // Get the actual downloaded file (most recent)
    const fs = await import('fs/promises');
    const files = await fs.readdir(downloadsDir);
    
    // Get stats for all files and find the most recent
    const filesWithStats = await Promise.all(
      files.map(async (file) => {
        const stats = await fs.stat(join(downloadsDir, file));
        return { name: file, time: stats.mtime, size: stats.size };
      })
    );
    
    const latestFile = filesWithStats.sort((a, b) => b.time - a.time)[0];
    if (latestFile) {
      filename = latestFile.name;
      
      // Update progress
      if (progressMap && downloadId) {
        progressMap.set(downloadId, {
          status: 'completed',
          progress: 100,
          filename: latestFile.name,
          path: join(downloadsDir, latestFile.name),
          size: latestFile.size
        });
      }
    }
    
    return {
      success: true,
      filename: filename,
      path: join(downloadsDir, filename),
      size: latestFile?.size
    };
  } catch (error) {
    // Fallback to YouTube-specific method if yt-dlp fails
    if (detectPlatform(url) === 'youtube') {
      return await downloadYouTubeVideo(url, format, quality, downloadId, progressMap);
    }
    
    if (progressMap && downloadId) {
      progressMap.set(downloadId, { status: 'error', error: error.message });
    }
    
    throw new Error(`Download failed: ${error.message}`);
  }
}

// YouTube-specific downloader (fallback)
async function downloadYouTubeVideo(url, format = 'best', quality = null, downloadId = null, progressMap = null) {
  try {
    if (!ytdl.validateURL(url)) {
      throw new Error('Invalid YouTube URL');
    }

    const info = await ytdl.getInfo(url);
    const title = sanitizeFilename(info.videoDetails.title);
    const { getDownloadSettings } = await import('./utils.js');
    const settings = getDownloadSettings();
    const downloadsDir = ensureDownloadsDir(settings.downloadPath);

    let videoFormat;
    if (format === 'audio') {
      videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    } else if (quality) {
      // Try to match quality
      const height = parseInt(quality.replace('p', ''));
      videoFormat = ytdl.chooseFormat(info.formats, { 
        quality: height >= 1080 ? 'highestvideo' : `${height}p` 
      });
    } else {
      videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
    }

    if (!videoFormat) {
      throw new Error('No suitable format found');
    }

    const extension = format === 'audio' ? 'm4a' : 'mp4';
    const filename = `${title}.${extension}`;
    const filepath = join(downloadsDir, filename);

    // Update progress
    if (progressMap && downloadId) {
      progressMap.set(downloadId, { status: 'downloading', progress: 0, url });
    }

    // Stream and write the file
    const fs = await import('fs');
    const writeStream = fs.createWriteStream(filepath);
    
    return new Promise((resolve, reject) => {
      const downloadStream = ytdl(url, { format: videoFormat });
      let downloadedBytes = 0;
      const totalBytes = parseInt(videoFormat.contentLength || '0');
      
      downloadStream.on('progress', (chunkLength, downloaded, total) => {
        downloadedBytes = downloaded;
        const progress = total > 0 ? (downloaded / total) * 100 : 0;
        
        if (progressMap && downloadId) {
          progressMap.set(downloadId, {
            status: 'downloading',
            progress: Math.round(progress),
            downloaded: downloaded,
            total: total
          });
        }
      });
      
      downloadStream.pipe(writeStream);
      
      downloadStream.on('end', () => {
        const stats = fs.statSync(filepath);
        const result = {
          success: true,
          filename: filename,
          path: filepath,
          size: stats.size,
          info: info
        };
        
        if (progressMap && downloadId) {
          progressMap.set(downloadId, {
            ...result,
            status: 'completed',
            progress: 100
          });
        }
        
        resolve(result);
      });
      
      downloadStream.on('error', (error) => {
        if (progressMap && downloadId) {
          progressMap.set(downloadId, { status: 'error', error: error.message });
        }
        reject(new Error(`Download stream error: ${error.message}`));
      });
      
      writeStream.on('error', (error) => {
        if (progressMap && downloadId) {
          progressMap.set(downloadId, { status: 'error', error: error.message });
        }
        reject(new Error(`File write error: ${error.message}`));
      });
    });
  } catch (error) {
    throw new Error(`YouTube download failed: ${error.message}`);
  }
}

// Main download function
export async function downloadMediaFromURL(url, format = 'best', quality = null, downloadId = null, progressMap = null) {
  const platform = detectPlatform(url);
  
  if (format === 'info') {
    // Just get info, don't download
    try {
      // Convert short YouTube URLs to full format for better compatibility
      let processedUrl = url;
      if (platform === 'youtube' && url.includes('youtu.be/')) {
        const videoId = url.match(/youtu\.be\/([^?&#]+)/)?.[1];
        if (videoId) {
          processedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
      
      if (platform === 'youtube' && ytdl.validateURL(processedUrl)) {
        const info = await ytdl.getInfo(processedUrl);
        
        // Get available qualities
        const videoFormats = info.formats
          .filter(f => f.hasVideo && f.qualityLabel)
          .map(f => f.qualityLabel)
          .filter((v, i, a) => a.indexOf(v) === i)
          .sort((a, b) => parseInt(b) - parseInt(a));
        
        return {
          title: info.videoDetails.title,
          duration: info.videoDetails.lengthSeconds,
          thumbnail: info.videoDetails.thumbnails[0]?.url,
          viewCount: info.videoDetails.viewCount,
          uploadDate: info.videoDetails.uploadDate,
          formats: info.formats.map(f => ({
            quality: f.qualityLabel || f.audioBitrate,
            container: f.container,
            hasVideo: !!f.videoCodec,
            hasAudio: !!f.audioCodec
          })),
          availableQualities: videoFormats
        };
      }
      
      // For other platforms or if YouTube fails, try yt-dlp
      const ytdlpCmd = await checkYtDlpAvailable();
      
      if (!ytdlpCmd && platform === 'youtube') {
        throw new Error('YouTube extraction failed. Please install Python and yt-dlp for better compatibility. See INSTALL_PYTHON.md for instructions.');
      }
      
      if (!ytdlpCmd) {
        throw new Error('yt-dlp not found. Please install it with: pip install yt-dlp');
      }
      
      const command = `${ytdlpCmd} --dump-json "${url}"`;
      const { stdout } = await execAsync(command);
      const info = JSON.parse(stdout);
      
      // Extract available qualities
      const videoFormats = info.formats
        ?.filter(f => f.vcodec && f.vcodec !== 'none')
        .map(f => f.height || f.format_note)
        .filter((v, i, a) => v && a.indexOf(v) === i)
        .sort((a, b) => {
          const aNum = parseInt(a) || 0;
          const bNum = parseInt(b) || 0;
          return bNum - aNum;
        }) || [];
      
      return {
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        viewCount: info.view_count,
        uploadDate: info.upload_date,
        formats: info.formats?.map(f => ({
          quality: f.format_note || f.resolution || f.height,
          container: f.ext,
          hasVideo: !!f.vcodec,
          hasAudio: !!f.acodec
        })) || [],
        availableQualities: videoFormats
      };
    } catch (error) {
      throw new Error(`Failed to get info: ${error.message}`);
    }
  }

  // Actual download
  // For YouTube, try ytdl-core first if yt-dlp is not available
  if (detectPlatform(url) === 'youtube') {
    // Convert short URLs
    let processedUrl = url;
    if (url.includes('youtu.be/')) {
      const videoId = url.match(/youtu\.be\/([^?&#]+)/)?.[1];
      if (videoId) {
        processedUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    }
    
    // Check if yt-dlp is available
    const ytdlpCmd = await checkYtDlpAvailable();
    
    if (!ytdlpCmd && ytdl.validateURL(processedUrl)) {
      try {
        return await downloadYouTubeVideo(processedUrl, format, quality, downloadId, progressMap);
      } catch (error) {
        throw new Error(`YouTube download failed: ${error.message}. Install Python and yt-dlp for better compatibility.`);
      }
    }
  }
  
  return await downloadWithYtDlp(url, format, quality, downloadId, progressMap);
}

// Export YouTube function for direct use
export { downloadYouTubeVideo };

