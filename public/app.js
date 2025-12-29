// Privacy-first Media Downloader Frontend
// Enhanced with progress tracking, history, and settings

const API_BASE = window.location.origin;

// DOM Elements
const form = document.getElementById('downloadForm');
const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const statusMessage = document.getElementById('statusMessage');
const formatOptions = document.getElementById('formatOptions');
const qualitySection = document.getElementById('qualitySection');
const qualitySelect = document.getElementById('qualitySelect');
const infoCard = document.getElementById('infoCard');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressDetails = document.getElementById('progressDetails');
const historyBtn = document.getElementById('historyBtn');
const historyCard = document.getElementById('historyCard');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const downloadsList = document.getElementById('downloadsList');
const settingsBtn = document.getElementById('settingsBtn');
const settingsCard = document.getElementById('settingsCard');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const openFolderBtn = document.getElementById('openFolderBtn');
const defaultFormat = document.getElementById('defaultFormat');
const defaultQuality = document.getElementById('defaultQuality');
const autoOpenFolder = document.getElementById('autoOpenFolder');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// State
let currentInfo = null;
let currentDownloadId = null;
let progressInterval = null;
let settings = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadDownloadHistory();
    setupEventListeners();
    checkServerHealth();
});

// Setup event listeners
function setupEventListeners() {
    form.addEventListener('submit', handleDownload);
    urlInput.addEventListener('input', handleURLInput);
    historyBtn.addEventListener('click', toggleHistory);
    closeHistoryBtn.addEventListener('click', () => historyCard.style.display = 'none');
    settingsBtn.addEventListener('click', toggleSettings);
    closeSettingsBtn.addEventListener('click', () => settingsCard.style.display = 'none');
    openFolderBtn.addEventListener('click', openDownloadsFolder);
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // Format change handler
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', handleFormatChange);
    });
}

// Handle URL input
let infoTimeout;
async function handleURLInput() {
    const url = urlInput.value.trim();
    
    clearTimeout(infoTimeout);
    
    if (!url || !isValidURL(url)) {
        infoCard.style.display = 'none';
        formatOptions.style.display = 'none';
        return;
    }

    formatOptions.style.display = 'block';

    // Debounce info fetching
    infoTimeout = setTimeout(async () => {
        showStatus('Fetching video info...', 'info');
        const info = await getVideoInfo(url);
        if (info) {
            displayInfo(info);
            showStatus('Video info loaded', 'success');
            setTimeout(() => statusMessage.classList.remove('show'), 2000);
        } else {
            infoCard.style.display = 'none';
        }
    }, 1000);
}

// Handle format change
function handleFormatChange(e) {
    const format = e.target.value;
    if (format === 'audio') {
        qualitySection.style.display = 'none';
    } else {
        qualitySection.style.display = currentInfo?.availableQualities?.length > 0 ? 'flex' : 'none';
    }
}

// Display video info
function displayInfo(info) {
    if (!info) {
        infoCard.style.display = 'none';
        return;
    }

    currentInfo = info;
    infoCard.style.display = 'flex';

    const thumbnailEl = document.getElementById('infoThumbnail');
    const titleEl = document.getElementById('infoTitle');
    const metaEl = document.getElementById('infoMeta');

    if (info.thumbnail) {
        thumbnailEl.innerHTML = `<img src="${info.thumbnail}" alt="Thumbnail">`;
    }

    titleEl.textContent = info.title || 'Unknown Title';

    let metaText = '';
    if (info.duration) {
        const minutes = Math.floor(info.duration / 60);
        const seconds = info.duration % 60;
        metaText += `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    if (info.viewCount) {
        metaText += metaText ? ' • ' : '';
        metaText += `${formatNumber(info.viewCount)} views`;
    }
    metaEl.textContent = metaText;

    // Populate quality options
    if (info.availableQualities && info.availableQualities.length > 0) {
        qualitySelect.innerHTML = '<option value="">Auto (Best Available)</option>';
        info.availableQualities.forEach(quality => {
            const option = document.createElement('option');
            option.value = quality.includes('p') ? quality : `${quality}p`;
            option.textContent = quality.includes('p') ? quality : `${quality}p`;
            qualitySelect.appendChild(option);
        });
        qualitySection.style.display = 'flex';
    } else {
        qualitySection.style.display = 'none';
    }
}

// Handle download
async function handleDownload(e) {
    e.preventDefault();
    
    const url = urlInput.value.trim();
    const format = document.querySelector('input[name="format"]:checked')?.value || settings.defaultFormat || 'best';
    const quality = qualitySelect.value || settings.defaultQuality || null;

    if (!url || !isValidURL(url)) {
        showStatus('Please enter a valid URL', 'error');
        return;
    }

    // Start download
    try {
        setLoading(true);
        progressContainer.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        progressDetails.textContent = 'Initializing...';

        const response = await fetch(`${API_BASE}/api/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format, quality }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Download failed');
        }

        currentDownloadId = data.downloadId;
        showStatus('Download started!', 'info');
        
        // Start polling for progress
        startProgressTracking(data.downloadId);

    } catch (error) {
        console.error('Download error:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
        progressContainer.style.display = 'none';
        setLoading(false);
    }
}

// Start progress tracking
function startProgressTracking(downloadId) {
    if (progressInterval) {
        clearInterval(progressInterval);
    }

    progressInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/download/${downloadId}/progress`);
            const progress = await response.json();

            if (progress.status === 'completed') {
                clearInterval(progressInterval);
                progressFill.style.width = '100%';
                progressText.textContent = '100%';
                progressDetails.textContent = 'Download complete!';
                
                showStatus(`✅ Download complete! Saved as: ${progress.filename}`, 'success');
                setLoading(false);
                
                // Auto-open folder if setting enabled
                if (settings.autoOpenFolder) {
                    setTimeout(() => openDownloadsFolder(), 1000);
                }
                
                // Reload download history
                loadDownloadHistory();
                
                // Clear input and hide progress after delay
                setTimeout(() => {
                    urlInput.value = '';
                    infoCard.style.display = 'none';
                    progressContainer.style.display = 'none';
                }, 3000);

            } else if (progress.status === 'error') {
                clearInterval(progressInterval);
                showStatus(`❌ Error: ${progress.error}`, 'error');
                progressContainer.style.display = 'none';
                setLoading(false);

            } else if (progress.status === 'downloading') {
                const percent = progress.progress || 0;
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `${percent}%`;
                
                if (progress.downloaded && progress.total) {
                    const downloadedMB = (progress.downloaded / (1024 * 1024)).toFixed(2);
                    const totalMB = (progress.total / (1024 * 1024)).toFixed(2);
                    progressDetails.textContent = `${downloadedMB} MB / ${totalMB} MB`;
                } else {
                    progressDetails.textContent = 'Downloading...';
                }
            }
        } catch (error) {
            console.error('Progress tracking error:', error);
        }
    }, 500);
}

// Load download history
async function loadDownloadHistory() {
    try {
        const response = await fetch(`${API_BASE}/api/downloads`);
        const data = await response.json();

        if (data.success && data.downloads) {
            renderDownloadHistory(data.downloads);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Render download history
function renderDownloadHistory(downloads) {
    if (downloads.length === 0) {
        downloadsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No downloads yet</p>';
        return;
    }

    downloadsList.innerHTML = downloads.map(download => `
        <div class="download-item">
            <div class="download-item-info">
                <div class="download-item-name">${escapeHtml(download.name)}</div>
                <div class="download-item-meta">
                    ${download.sizeFormatted} • ${formatDate(download.date)}
                </div>
            </div>
            <div class="download-item-actions">
                <button class="btn-small" onclick="openFile('${download.path.replace(/\\/g, '\\\\')}')" title="Open File">📂</button>
            </div>
        </div>
    `).join('');
}

// Toggle history
function toggleHistory() {
    const isVisible = historyCard.style.display === 'block';
    historyCard.style.display = isVisible ? 'none' : 'block';
    settingsCard.style.display = 'none';
    
    if (!isVisible) {
        loadDownloadHistory();
    }
}

// Toggle settings
function toggleSettings() {
    const isVisible = settingsCard.style.display === 'block';
    settingsCard.style.display = isVisible ? 'none' : 'block';
    historyCard.style.display = 'none';
    
    if (!isVisible) {
        loadSettings();
    }
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/api/settings`);
        const data = await response.json();

        if (data.success && data.settings) {
            settings = data.settings;
            defaultFormat.value = settings.defaultFormat || 'best';
            defaultQuality.value = settings.defaultQuality || '';
            autoOpenFolder.checked = settings.autoOpenFolder || false;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings
async function saveSettings() {
    try {
        const newSettings = {
            defaultFormat: defaultFormat.value,
            defaultQuality: defaultQuality.value,
            autoOpenFolder: autoOpenFolder.checked
        };

        const response = await fetch(`${API_BASE}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings),
        });

        const data = await response.json();

        if (data.success) {
            settings = data.settings;
            showStatus('Settings saved!', 'success');
            setTimeout(() => {
                settingsCard.style.display = 'none';
                statusMessage.classList.remove('show');
            }, 1500);
        }
    } catch (error) {
        showStatus(`Error saving settings: ${error.message}`, 'error');
    }
}

// Open downloads folder
async function openDownloadsFolder() {
    try {
        const response = await fetch(`${API_BASE}/api/open-folder`, {
            method: 'POST',
        });

        if (response.ok) {
            showStatus('Opening downloads folder...', 'info');
            setTimeout(() => statusMessage.classList.remove('show'), 2000);
        }
    } catch (error) {
        showStatus(`Error opening folder: ${error.message}`, 'error');
    }
}

// Open file (platform-specific via server)
async function openFile(path) {
    try {
        const response = await fetch(`${API_BASE}/api/open-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        });

        if (response.ok) {
            showStatus('Opening file...', 'info');
            setTimeout(() => statusMessage.classList.remove('show'), 2000);
        }
    } catch (error) {
        showStatus(`Error opening file: ${error.message}`, 'error');
    }
}

// Get video info
async function getVideoInfo(url) {
    try {
        const response = await fetch(`${API_BASE}/api/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get video info');
        }

        return data.info;
    } catch (error) {
        console.error('Info fetch error:', error);
        return null;
    }
}

// Utility functions
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type} show`;
    
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 5000);
    }
}

function setLoading(loading) {
    downloadBtn.disabled = loading;
    const btnText = downloadBtn.querySelector('.btn-text');
    const btnLoader = downloadBtn.querySelector('.btn-loader');
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check server health
function checkServerHealth() {
    fetch(`${API_BASE}/api/health`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                console.log('✅ Server connected - Privacy mode: Active');
            }
        })
        .catch(err => {
            console.error('Server connection error:', err);
            showStatus('⚠️ Cannot connect to server. Make sure the server is running.', 'error');
        });
}

// Focus input on load
window.addEventListener('load', () => {
    urlInput.focus();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        urlInput.focus();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        historyCard.style.display = 'none';
        settingsCard.style.display = 'none';
    }
});
