// ========================================
// CONFIGURATION & CONSTANTS
// ========================================
const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_CAPTION_LENGTH: 500,
    MAX_USERNAME_LENGTH: 30,
    MAX_BIO_LENGTH: 150,
    POSTS_PER_PAGE: 20, // Load more posts at once
    IMAGE_QUALITY: 0.92, // Higher quality to preserve colors
    MAX_IMAGE_DIMENSION: 2048, // Allow larger images
    DEBOUNCE_DELAY: 300,
    RATE_LIMIT: {
        POST_INTERVAL: 10000, // 10 seconds between posts
        REACTION_INTERVAL: 500 // 500ms between reactions
    }
};

const STORAGE_KEYS = {
    USERNAME: 'snapcircle_username',
    USER_ID: 'snapcircle_user_id',
    USER_CODE: 'snapcircle_user_code',
    EMAIL: 'snapcircle_email',
    CONNECTED: 'snapcircle_connected',
    THEME: 'snapcircle_theme',
    LAST_LOGIN: 'snapcircle_last_login',
    LAST_ACTIVE: 'snapcircle_last_active',
    STREAK: 'snapcircle_streak',
    AVATAR_COLOR: 'snapcircle_avatar_color',
    BIO: 'snapcircle_bio',
    LAST_POST_TIME: 'snapcircle_last_post',
    LAST_REACTION_TIME: 'snapcircle_last_reaction'
};

const BADGES = {
    EARLY_BIRD: { emoji: '🌅', name: 'Early Bird', description: 'One of the first 100 users!', requirement: 'auto' },
    FIRST_POST: { emoji: '✨', name: 'First Post', description: 'Created your first post', requirement: 1 },
    ACTIVE_USER: { emoji: '🔥', name: 'Active User', description: 'Posted 10 times', requirement: 10 },
    INFLUENCER: { emoji: '⭐', name: 'Influencer', description: 'Got 100 reactions', requirement: 100 },
    WEEK_STREAK: { emoji: '🎯', name: 'Dedicated', description: '7 day login streak', requirement: 7 },
    MONTH_STREAK: { emoji: '👑', name: 'Loyal', description: '30 day login streak', requirement: 30 },
    SUPER_CREATOR: { emoji: '💎', name: 'Super Creator', description: 'Posted 50 times', requirement: 50 },
    POPULAR: { emoji: '🌟', name: 'Popular', description: 'Got 500 reactions', requirement: 500 }
};

const REACTIONS = {
    LIKE: { emoji: '👍', name: 'like' },
    LOVE: { emoji: '❤️', name: 'love' },
    HAHA: { emoji: '😂', name: 'haha' },
    WOW: { emoji: '😮', name: 'wow' },
    SAD: { emoji: '😢', name: 'sad' },
    AWKWARD: { emoji: '😬', name: 'awkward' }
};

const AVATAR_COLORS = {
    default: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
    pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    blue: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    green: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ocean: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
};

// ========================================
// FIREBASE CONFIGURATION
// ========================================
const firebaseConfig = {
    apiKey: "E", // GitHub secret variable
    authDomain: "snapcircle-d4955.firebaseapp.com",
    databaseURL: "https://snapcircle-d4955-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "snapcircle-d4955",
    storageBucket: "snapcircle-d4955.firebasestorage.app",
    messagingSenderId: "12069426076",
    appId: "1:12069426076:web:24496f14b46b2506606e59"
};

// ========================================
// GLOBAL STATE
// ========================================
let app, database;
let isFirebaseInitialized = false;
let currentUsername = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'User' + Math.floor(Math.random() * 10000);
let currentUserId = localStorage.getItem(STORAGE_KEYS.USER_ID) || generateUserId();
let currentUserCode = localStorage.getItem(STORAGE_KEYS.USER_CODE) || generateUserCode();
let userEmail = localStorage.getItem(STORAGE_KEYS.EMAIL) || '';
let isConnected = localStorage.getItem(STORAGE_KEYS.CONNECTED) === 'true';
let currentStreak = 0;
let userBadges = [];
let selectedAvatarColor = localStorage.getItem(STORAGE_KEYS.AVATAR_COLOR) || 'default';
let currentFile = null;
let postsListener = null;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generate unique user ID - simple and stable
 */
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate unique 8-character user code for bot prevention
 */
function generateUserCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Sanitize user input to prevent XSS attacks
 */
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Validate username
 */
function validateUsername(username) {
    if (!username || username.trim().length === 0) {
        return { valid: false, error: 'Username cannot be empty' };
    }
    if (username.length > CONFIG.MAX_USERNAME_LENGTH) {
        return { valid: false, error: `Username must be under ${CONFIG.MAX_USERNAME_LENGTH} characters` };
    }
    if (!/^[a-zA-Z0-9_\s]+$/.test(username)) {
        return { valid: false, error: 'Username can only contain letters, numbers, spaces, and underscores' };
    }
    return { valid: true };
}

/**
 * Debounce function to limit rate of function calls
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return new Date(timestamp).toLocaleDateString();
    } else if (days > 0) {
        return `${days}d ago`;
    } else if (hours > 0) {
        return `${hours}h ago`;
    } else if (minutes > 0) {
        return `${minutes}m ago`;
    } else {
        return 'Just now';
    }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const icon = notification.querySelector('.notification-icon');
    
    notificationText.textContent = message;
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Handle errors gracefully
 */
function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // Show more specific error message
    let errorMessage = 'Something went wrong. Please try again.';
    
    if (error.code === 'PERMISSION_DENIED') {
        errorMessage = 'Permission denied. Please check Firebase rules.';
    } else if (error.message) {
        errorMessage = error.message;
    }
    
    showNotification(errorMessage, 'error');
}

// ========================================
// FIREBASE INITIALIZATION
// ========================================
async function initializeFirebase() {
    try {
        app = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseInitialized = true;
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showNotification('Failed to connect to server. Some features may not work.', 'error');
        return false;
    }
}

// ========================================
// APP INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Firebase
    await initializeFirebase();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 1500);

    // Initialize app
    await initializeApp();
});

async function initializeApp() {
    // Save initial user data
    localStorage.setItem(STORAGE_KEYS.USERNAME, currentUsername);
    localStorage.setItem(STORAGE_KEYS.USER_ID, currentUserId);
    localStorage.setItem(STORAGE_KEYS.USER_CODE, currentUserCode);
    
    // Initialize UI - these are fast and synchronous
    updateUsernameDisplay();
    loadTheme();
    updateStreak();
    setupFileUpload();
    setupScrollButton();
    setupKonamiCode();
    setupTrendingTopics();
    setupCharCounter();
    
    // Load data if Firebase is initialized
    if (isFirebaseInitialized) {
        // Sync user data to Firebase and update last active
        await syncUserToFirebase();
        
        // Check if account needs connection warning
        checkAccountStatus();
        
        // Just load posts - that's all we need immediately
        loadPosts();
        
        // Everything else can happen in the background without blocking
        setTimeout(() => {
            loadUserBadges();
            updateStatsDisplay();
            loadSuggestedUsers();
            setupRealtimeListeners();
            checkEarlyBirdBadge(); // Check for early bird badge
        }, 100);
    }
}

// ========================================
// USER ACCOUNT MANAGEMENT
// ========================================
async function syncUserToFirebase() {
    if (!isFirebaseInitialized) return;
    
    try {
        const now = Date.now();
        const userRef = database.ref(`users/${currentUserId}`);
        const snapshot = await userRef.once('value');
        
        const updates = {
            userId: currentUserId,
            username: currentUsername,
            userCode: currentUserCode,
            lastActive: now,
            avatarColor: selectedAvatarColor
        };
        
        // If user doesn't exist, set createdAt
        if (!snapshot.exists()) {
            updates.createdAt = now;
            updates.connected = false;
            
            // Increment total users count
            const statsRef = database.ref('stats/totalUsers');
            const statsSnap = await statsRef.once('value');
            const totalUsers = (statsSnap.val() || 0) + 1;
            await statsRef.set(totalUsers);
        } else {
            // Preserve existing data
            const userData = snapshot.val();
            if (userData.email) updates.email = userData.email;
            if (userData.connected) updates.connected = userData.connected;
            if (userData.badges) updates.badges = userData.badges;
        }
        
        await userRef.update(updates);
        
        // Update local state
        if (snapshot.exists() && snapshot.val().email) {
            userEmail = snapshot.val().email;
            isConnected = snapshot.val().connected || false;
            localStorage.setItem(STORAGE_KEYS.EMAIL, userEmail);
            localStorage.setItem(STORAGE_KEYS.CONNECTED, isConnected);
        }
        
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
    } catch (error) {
        console.error('Error syncing user:', error);
    }
}

async function checkAccountStatus() {
    // Show warning if account is not connected after 3 days
    const lastActive = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE) || Date.now());
    const daysSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
    
    if (!isConnected && daysSinceActive > 3) {
        showAccountWarning();
    }
}

function showAccountWarning() {
    const warningBanner = document.createElement('div');
    warningBanner.id = 'accountWarning';
    warningBanner.className = 'account-warning';
    warningBanner.innerHTML = `
        <div class="warning-content">
            <span class="warning-icon">⚠️</span>
            <div class="warning-text">
                <strong>Secure your account!</strong>
                <p>Connect your email to prevent losing your account after 30 days of inactivity.</p>
            </div>
            <button class="warning-btn" onclick="openConnectModal()">Connect Now</button>
            <button class="warning-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
    `;
    
    document.body.insertBefore(warningBanner, document.body.firstChild);
}

async function checkEarlyBirdBadge() {
    if (!isFirebaseInitialized) return;
    
    try {
        const statsSnapshot = await database.ref('stats/totalUsers').once('value');
        const totalUsers = statsSnapshot.val() || 0;
        
        if (totalUsers <= 100 && !userBadges.includes('EARLY_BIRD')) {
            userBadges.push('EARLY_BIRD');
            await database.ref(`users/${currentUserId}/badges`).set(userBadges.join(','));
            showNotification('🌅 Early Bird badge unlocked! You\'re one of the first 100 users!');
            updateBadgeDisplay();
        }
    } catch (error) {
        console.error('Error checking early bird badge:', error);
    }
}

// ========================================
// THEME SYSTEM
// ========================================
function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeIcon').textContent = '☀️';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
}

// ========================================
// USER MANAGEMENT
// ========================================
function updateUsernameDisplay() {
    document.getElementById('currentUsername').textContent = currentUsername;
    const initial = currentUsername.charAt(0).toUpperCase();
    
    const avatarElements = document.querySelectorAll('#headerAvatar span:first-child');
    avatarElements.forEach(el => el.textContent = initial);
    
    applyAvatarColor();
}

function applyAvatarColor() {
    const gradient = AVATAR_COLORS[selectedAvatarColor] || AVATAR_COLORS.default;
    const colors = gradient.match(/#[0-9a-f]+/gi);
    if (colors && colors.length >= 2) {
        document.documentElement.style.setProperty('--gradient-start', colors[0]);
        document.documentElement.style.setProperty('--gradient-end', colors[1]);
    }
}

function openUsernameModal() {
    const modal = document.getElementById('usernameModal');
    document.getElementById('usernameInput').value = currentUsername;
    document.getElementById('bioInput').value = localStorage.getItem(STORAGE_KEYS.BIO) || '';
    modal.classList.add('show');
}

function closeUsernameModal() {
    document.getElementById('usernameModal').classList.remove('show');
}

async function saveUsername() {
    const newUsername = document.getElementById('usernameInput').value.trim();
    const newBio = document.getElementById('bioInput').value.trim();
    
    // Validate username
    const validation = validateUsername(newUsername);
    if (!validation.valid) {
        showNotification(validation.error, 'error');
        return;
    }
    
    // Validate bio length
    if (newBio.length > CONFIG.MAX_BIO_LENGTH) {
        showNotification(`Bio must be under ${CONFIG.MAX_BIO_LENGTH} characters`, 'error');
        return;
    }
    
    // Sanitize inputs
    currentUsername = sanitizeInput(newUsername);
    const sanitizedBio = sanitizeInput(newBio);
    
    // Update local storage
    localStorage.setItem(STORAGE_KEYS.USERNAME, currentUsername);
    localStorage.setItem(STORAGE_KEYS.BIO, sanitizedBio);
    localStorage.setItem(STORAGE_KEYS.AVATAR_COLOR, selectedAvatarColor);
    
    // Update Firebase
    if (isFirebaseInitialized) {
        try {
            await database.ref('users/' + currentUserId).update({
                username: currentUsername,
                bio: sanitizedBio,
                avatarColor: selectedAvatarColor,
                updatedAt: Date.now()
            });
        } catch (error) {
            handleError(error, 'saveUsername');
        }
    }
    
    updateUsernameDisplay();
    closeUsernameModal();
    showNotification('Profile updated successfully!');
}

function selectColor(element, colorKey) {
    document.querySelectorAll('.color-option').forEach(el => {
        el.classList.remove('selected');
        el.setAttribute('aria-checked', 'false');
    });
    element.classList.add('selected');
    element.setAttribute('aria-checked', 'true');
    selectedAvatarColor = colorKey;
}

// ========================================
// STREAK SYSTEM
// ========================================
function updateStreak() {
    const lastLogin = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
    const today = new Date().toDateString();
    const savedStreak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0');
    
    if (!lastLogin) {
        currentStreak = 1;
    } else if (lastLogin === today) {
        currentStreak = savedStreak;
    } else {
        const lastDate = new Date(lastLogin);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            currentStreak = savedStreak + 1;
        } else {
            currentStreak = 1;
        }
    }
    
    localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, today);
    localStorage.setItem(STORAGE_KEYS.STREAK, currentStreak.toString());
    
    // Update displays
    document.getElementById('streakCount').textContent = currentStreak;
    document.getElementById('sidebarStreakCount').textContent = currentStreak;
    document.getElementById('userStreakCount').textContent = currentStreak;
    
    // Save to Firebase
    if (isFirebaseInitialized) {
        database.ref('users/' + currentUserId + '/streak').set(currentStreak).catch(error => {
            console.error('Error updating streak:', error);
        });
    }
    
    // Check for streak badges
    checkStreakBadges();
}

// ========================================
// BADGES SYSTEM
// ========================================
async function loadUserBadges() {
    if (!isFirebaseInitialized) return;
    
    try {
        const snapshot = await database.ref('users/' + currentUserId + '/badges').once('value');
        const badgeData = snapshot.val();
        
        if (!badgeData) {
            userBadges = [];
        } else if (typeof badgeData === 'string') {
            // Handle comma-separated string format
            userBadges = badgeData.split(',').filter(b => b.length > 0);
        } else if (Array.isArray(badgeData)) {
            // Handle array format
            userBadges = badgeData;
        } else {
            // Unknown format, default to empty
            userBadges = [];
        }
        
        console.log('Badges loaded:', userBadges);
        updateBadgeDisplay();
    } catch (error) {
        console.error('Error loading badges:', error);
        // Don't show error to user, just use empty badges
        userBadges = [];
        updateBadgeDisplay();
    }
}

async function checkBadgesAfterPost() {
    if (!isFirebaseInitialized) return;
    
    try {
        // Simple count query
        const postsSnapshot = await database.ref('posts')
            .orderByChild('userId')
            .equalTo(currentUserId)
            .once('value');
        
        let postCount = 0;
        postsSnapshot.forEach(() => postCount++);
        
        const newBadges = [...userBadges];
        let changed = false;
        
        // Only check post-based badges
        if (postCount >= 1 && !newBadges.includes('FIRST_POST')) {
            newBadges.push('FIRST_POST');
            showNotification('✨ First Post badge earned!');
            changed = true;
        }
        if (postCount >= 10 && !newBadges.includes('ACTIVE_USER')) {
            newBadges.push('ACTIVE_USER');
            showNotification('🔥 Active User badge earned!');
            changed = true;
        }
        if (postCount >= 50 && !newBadges.includes('SUPER_CREATOR')) {
            newBadges.push('SUPER_CREATOR');
            showNotification('💎 Super Creator badge earned!');
            changed = true;
        }
        
        if (changed) {
            userBadges = newBadges;
            database.ref('users/' + currentUserId + '/badges').set(userBadges.join(','));
            updateBadgeDisplay();
        }
    } catch (error) {
        console.error('Error checking badges:', error);
    }
}

function checkStreakBadges() {
    const newBadges = [...userBadges];
    let changed = false;
    
    if (currentStreak >= 7 && !newBadges.includes('WEEK_STREAK')) {
        newBadges.push('WEEK_STREAK');
        showNotification('🎯 Dedicated badge earned!');
        changed = true;
    }
    if (currentStreak >= 30 && !newBadges.includes('MONTH_STREAK')) {
        newBadges.push('MONTH_STREAK');
        showNotification('👑 Loyal badge earned!');
        changed = true;
    }
    
    if (changed && isFirebaseInitialized) {
        userBadges = newBadges;
        database.ref('users/' + currentUserId + '/badges').set(userBadges.join(','));
        updateBadgeDisplay();
    }
}

function updateBadgeDisplay() {
    const showcase = document.getElementById('badgeShowcase');
    const headerBadge = document.getElementById('headerBadge');
    
    showcase.innerHTML = '';
    
    Object.entries(BADGES).forEach(([key, badge]) => {
        const earned = userBadges.includes(key);
        const div = document.createElement('div');
        div.className = 'badge-item' + (earned ? '' : ' locked');
        div.innerHTML = badge.emoji;
        div.title = badge.name + ': ' + badge.description;
        div.setAttribute('role', 'listitem');
        showcase.appendChild(div);
    });
    
    // Show most recent badge in header
    if (userBadges.length > 0) {
        const latestBadge = BADGES[userBadges[userBadges.length - 1]];
        headerBadge.textContent = latestBadge.emoji;
        headerBadge.title = latestBadge.name;
    }
    
    document.getElementById('userBadgesCount').textContent = userBadges.length;
}

// ========================================
// FILE UPLOAD & IMAGE COMPRESSION
// ========================================
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

async function handleFileSelect(file) {
    // Validate file size
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showNotification(`File size must be under ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`, 'error');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showNotification('Only images and videos are supported', 'error');
        return;
    }
    
    // For videos, use them directly without compression
    if (file.type.startsWith('video/')) {
        currentFile = file;
        showPreview(currentFile);
        return;
    }
    
    // For images, only compress if they're too large
    if (file.size > 2 * 1024 * 1024) { // Only compress if > 2MB
        try {
            currentFile = await compressImage(file);
            showNotification('Image compressed for faster upload');
        } catch (error) {
            console.error('Compression failed, using original:', error);
            currentFile = file; // Use original if compression fails
        }
    } else {
        currentFile = file; // Use original for small images
    }
    
    // Show preview
    showPreview(currentFile);
}

async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Resize if too large
                if (width > CONFIG.MAX_IMAGE_DIMENSION || height > CONFIG.MAX_IMAGE_DIMENSION) {
                    if (width > height) {
                        height = (height / width) * CONFIG.MAX_IMAGE_DIMENSION;
                        width = CONFIG.MAX_IMAGE_DIMENSION;
                    } else {
                        width = (width / height) * CONFIG.MAX_IMAGE_DIMENSION;
                        height = CONFIG.MAX_IMAGE_DIMENSION;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d', { alpha: true });
                
                // Fill with white background for transparency support
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                
                // Draw image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob - use original type if PNG, otherwise JPEG
                const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const quality = file.type === 'image/png' ? 0.95 : CONFIG.IMAGE_QUALITY;
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: outputType }));
                    } else {
                        reject(new Error('Failed to compress image'));
                    }
                }, outputType, quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showPreview(file) {
    const container = document.getElementById('previewContainer');
    container.innerHTML = '<button class="remove-preview" onclick="removePreview()" aria-label="Remove preview">×</button>';
    
    const reader = new FileReader();
    reader.onload = (e) => {
        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = e.target.result;
            video.controls = true;
            video.muted = true;
            container.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Preview';
            container.appendChild(img);
        }
        container.classList.add('show');
    };
    reader.readAsDataURL(file);
}

function removePreview() {
    const container = document.getElementById('previewContainer');
    container.classList.remove('show');
    container.innerHTML = '<button class="remove-preview" onclick="removePreview()">×</button>';
    currentFile = null;
    document.getElementById('fileInput').value = '';
}

function setupCharCounter() {
    const captionInput = document.getElementById('captionInput');
    const charCounter = document.getElementById('charCounter');
    
    captionInput.addEventListener('input', () => {
        const length = captionInput.value.length;
        charCounter.textContent = `${length} / ${CONFIG.MAX_CAPTION_LENGTH}`;
        
        if (length > CONFIG.MAX_CAPTION_LENGTH * 0.9) {
            charCounter.classList.add('warning');
        } else {
            charCounter.classList.remove('warning');
        }
    });
}

function updateCharCounter() {
    const captionInput = document.getElementById('captionInput');
    const charCounter = document.getElementById('charCounter');
    const length = captionInput.value.length;
    
    charCounter.textContent = `${length} / ${CONFIG.MAX_CAPTION_LENGTH}`;
    
    if (length > CONFIG.MAX_CAPTION_LENGTH * 0.9) {
        charCounter.classList.add('warning');
    } else {
        charCounter.classList.remove('warning');
    }
}

// ========================================
// POST CREATION
// ========================================
async function createPost() {
    if (!isFirebaseInitialized) {
        showNotification('Cannot create post: Not connected to server', 'error');
        return;
    }
    
    const caption = document.getElementById('captionInput').value.trim();
    
    // Validate caption length
    if (caption.length > CONFIG.MAX_CAPTION_LENGTH) {
        showNotification(`Caption must be under ${CONFIG.MAX_CAPTION_LENGTH} characters`, 'error');
        return;
    }
    
    // Require either media or caption
    if (!currentFile && !caption) {
        showNotification('Please add an image/video or write a caption', 'error');
        return;
    }
    
    // Rate limiting
    const lastPostTime = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_POST_TIME) || '0');
    const now = Date.now();
    if (now - lastPostTime < CONFIG.RATE_LIMIT.POST_INTERVAL) {
        const waitTime = Math.ceil((CONFIG.RATE_LIMIT.POST_INTERVAL - (now - lastPostTime)) / 1000);
        showNotification(`Please wait ${waitTime} seconds before posting again`, 'error');
        return;
    }
    
    const postBtn = document.getElementById('postBtn');
    postBtn.disabled = true;
    postBtn.textContent = 'Posting...';
    
    try {
        let mediaUrl = '';
        let mediaType = 'text';
        
        if (currentFile) {
            // Convert file to base64
            mediaUrl = await fileToBase64(currentFile);
            mediaType = currentFile.type.startsWith('video/') ? 'video' : 'image';
        }
        
        const postData = {
            userId: currentUserId,
            username: currentUsername,
            avatarColor: selectedAvatarColor,
            caption: sanitizeInput(caption) || '',
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timestamp: Date.now(),
            reactions: {}
        };
        
        console.log('Attempting to create post:', postData);
        
        await database.ref('posts').push(postData);
        
        console.log('Post created successfully');
        
        // Update last post time
        localStorage.setItem(STORAGE_KEYS.LAST_POST_TIME, now.toString());
        
        // Clear form
        document.getElementById('captionInput').value = '';
        removePreview();
        updateCharCounter();
        
        showNotification('Post created successfully!');
        
        // Check for badges in background (don't await)
        setTimeout(() => {
            checkBadgesAfterPost();
            updateStatsDisplay();
        }, 500);
        
    } catch (error) {
        console.error('Full error object:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        handleError(error, 'createPost');
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Share Post';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ========================================
// POST DISPLAY - OPTIMIZED
// ========================================
async function loadPosts() {
    if (!isFirebaseInitialized) return;
    
    const feed = document.getElementById('feed');
    
    try {
        // Load posts - limit to last 30 for performance  
        const snapshot = await database.ref('posts')
            .orderByChild('timestamp')
            .limitToLast(30)
            .once('value');
        
        const posts = [];
        snapshot.forEach(snap => {
            posts.push({ id: snap.key, ...snap.val() });
        });
        
        feed.innerHTML = '';
        
        if (posts.length === 0) {
            feed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔵</div>
                    <h3>Welcome to SnapCircle!</h3>
                    <p>Be the first to share something amazing!</p>
                </div>
            `;
        } else {
            // Sort posts by timestamp (newest first)
            posts.sort((a, b) => b.timestamp - a.timestamp);
            
            // Batch render for smooth performance
            let index = 0;
            const batchSize = 3; // Render 3 posts at a time
            
            function renderBatch() {
                const end = Math.min(index + batchSize, posts.length);
                const fragment = document.createDocumentFragment();
                
                for (let i = index; i < end; i++) {
                    const postElement = createPostElement(posts[i]);
                    fragment.appendChild(postElement);
                }
                
                feed.appendChild(fragment);
                index = end;
                
                if (index < posts.length) {
                    // Use requestIdleCallback for better performance
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(renderBatch);
                    } else {
                        setTimeout(renderBatch, 16); // ~60fps
                    }
                }
            }
            
            renderBatch();
        }
    } catch (error) {
        handleError(error, 'loadPosts');
        feed.innerHTML = `
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                <div>
                    <strong>Failed to load posts</strong>
                    <p>Please check your connection and try again.</p>
                </div>
            </div>
        `;
    }
}

function setupRealtimeListeners() {
    if (!isFirebaseInitialized) return;
    
    const startTime = Date.now();
    
    // Listen for new posts only (posts created after page load)
    postsListener = database.ref('posts')
        .orderByChild('timestamp')
        .startAt(startTime)
        .on('child_added', (snapshot) => {
            const post = { id: snapshot.key, ...snapshot.val() };
            
            // Only add posts created after initialization
            if (post.timestamp < startTime) return;
            
            const feed = document.getElementById('feed');
            const emptyState = feed.querySelector('.empty-state');
            if (emptyState) emptyState.remove();
            
            const postElement = createPostElement(post);
            feed.insertBefore(postElement, feed.firstChild);
        });
}

function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'post-card';
    article.setAttribute('data-post-id', post.id);
    article.setAttribute('role', 'article');
    
    const avatarGradient = AVATAR_COLORS[post.avatarColor] || AVATAR_COLORS.default;
    const initial = (post.username || 'U').charAt(0).toUpperCase();
    const userBadge = post.userId ? getUserTopBadge(post.userId) : '';
    const isOwnPost = post.userId === currentUserId;
    
    let mediaHTML = '';
    if (post.mediaUrl) {
        if (post.mediaType === 'video') {
            mediaHTML = `
                <div class="post-media">
                    <video src="${post.mediaUrl}" controls></video>
                </div>
            `;
        } else {
            mediaHTML = `
                <div class="post-media">
                    <img src="${post.mediaUrl}" alt="Post image" onclick="openImageViewer('${post.mediaUrl}')">
                </div>
            `;
        }
    }
    
    let reactionsHTML = '';
    Object.entries(REACTIONS).forEach(([key, reaction]) => {
        const count = post.reactions && post.reactions[reaction.name] ? 
            Object.keys(post.reactions[reaction.name]).length : 0;
        const isActive = post.reactions && post.reactions[reaction.name] && 
            post.reactions[reaction.name][currentUserId];
        
        reactionsHTML += `
            <button 
                class="reaction-btn ${isActive ? 'active' : ''}" 
                onclick="toggleReaction('${post.id}', '${reaction.name}')"
                aria-label="${reaction.name} reaction"
            >
                <span aria-hidden="true">${reaction.emoji}</span>
                ${count > 0 ? `<span class="reaction-count">${count}</span>` : ''}
            </button>
        `;
    });
    
    article.innerHTML = `
        <div class="post-header">
            <div class="post-avatar" style="background: ${avatarGradient}" onclick="viewProfile('${post.userId}')" role="button" tabindex="0">
                ${initial}
                ${userBadge ? `<span class="post-badge" title="${userBadge}">${userBadge}</span>` : ''}
            </div>
            <div class="post-info">
                <div class="post-username" onclick="viewProfile('${post.userId}')" role="button" tabindex="0">
                    ${sanitizeInput(post.username || 'User')}
                </div>
                <div class="post-time">${formatTimeAgo(post.timestamp)}</div>
            </div>
            ${isOwnPost ? `
                <div class="post-actions-menu">
                    <button class="menu-btn" onclick="togglePostMenu('${post.id}')" aria-label="Post options">⋮</button>
                    <div class="dropdown-menu" id="menu-${post.id}">
                        <div class="dropdown-item" onclick="editPost('${post.id}')">
                            <span>✏️</span> Edit
                        </div>
                        <div class="dropdown-item danger" onclick="deletePost('${post.id}')">
                            <span>🗑️</span> Delete
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
        ${post.caption ? `<p class="post-caption">${sanitizeInput(post.caption)}</p>` : ''}
        ${mediaHTML}
        <div class="post-reactions" role="group" aria-label="Reactions">
            ${reactionsHTML}
        </div>
        <div class="post-comments">
            <div class="comments-list" id="comments-${post.id}">
                ${(() => {
                    const comments = post.comments || [];
                    const commentsArray = Array.isArray(comments) ? comments : Object.values(comments);
                    const displayComments = commentsArray.slice(-3);
                    
                    return displayComments.map(comment => `
                        <div class="comment">
                            <span class="comment-username">${sanitizeInput(comment.username || 'User')}:</span>
                            <span class="comment-text">${sanitizeInput(comment.text || '')}</span>
                        </div>
                    `).join('') + 
                    (commentsArray.length > 3 ? `
                        <div class="view-all-comments" onclick="viewAllComments('${post.id}')">
                            View all ${commentsArray.length} comments
                        </div>
                    ` : '');
                })()}
            </div>
            <div class="comment-input-wrapper">
                <input 
                    type="text" 
                    class="comment-input" 
                    placeholder="Add a comment..." 
                    id="comment-input-${post.id}"
                    maxlength="500"
                    onkeypress="if(event.key === 'Enter') addComment('${post.id}')"
                >
                <button class="comment-btn" onclick="addComment('${post.id}')" aria-label="Post comment">
                    ➤
                </button>
            </div>
        </div>
        <div class="post-footer">
            <button class="share-btn" onclick="sharePost('${post.id}')" aria-label="Share post">
                <span aria-hidden="true">🔗</span> Share
            </button>
        </div>
    `;
    
    return article;
}

function getUserTopBadge(userId) {
    // This would need to fetch user data - simplified for now
    return '';
}

// ========================================
// POST INTERACTIONS
// ========================================
async function toggleReaction(postId, reactionName) {
    if (!isFirebaseInitialized) return;
    
    // Rate limiting
    const lastReactionTime = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_REACTION_TIME) || '0');
    const now = Date.now();
    if (now - lastReactionTime < CONFIG.RATE_LIMIT.REACTION_INTERVAL) {
        return;
    }
    localStorage.setItem(STORAGE_KEYS.LAST_REACTION_TIME, now.toString());
    
    try {
        const reactionPath = `posts/${postId}/reactions/${reactionName}/${currentUserId}`;
        const snapshot = await database.ref(reactionPath).once('value');
        
        if (snapshot.exists()) {
            // Remove reaction
            await database.ref(reactionPath).remove();
        } else {
            // Add reaction
            await database.ref(reactionPath).set(true);
        }
        
        // Refresh post display
        await refreshPost(postId);
        updateStatsDisplay(); // Don't await, run in background
    } catch (error) {
        handleError(error, 'toggleReaction');
    }
}

async function refreshPost(postId) {
    if (!isFirebaseInitialized) return;
    
    try {
        const snapshot = await database.ref(`posts/${postId}`).once('value');
        if (!snapshot.exists()) return;
        
        const post = { id: snapshot.key, ...snapshot.val() };
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        
        if (postElement) {
            const newElement = createPostElement(post);
            postElement.replaceWith(newElement);
        }
    } catch (error) {
        console.error('Error refreshing post:', error);
    }
}

// ========================================
// COMMENTS
// ========================================
async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    
    if (!text) return;
    if (text.length > 500) {
        showNotification('Comment is too long (max 500 characters)');
        return;
    }
    
    try {
        const comment = {
            userId: currentUserId,
            username: currentUsername,
            text: text,
            timestamp: Date.now()
        };
        
        await database.ref(`posts/${postId}/comments`).push(comment);
        input.value = '';
        
        // Refresh the post to show new comment
        await refreshPost(postId);
    } catch (error) {
        handleError(error, 'addComment');
    }
}

function viewAllComments(postId) {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    const commentsContainer = post.querySelector('.comments-list');
    
    database.ref(`posts/${postId}`).once('value').then(snapshot => {
        const postData = snapshot.val();
        const comments = postData.comments || [];
        
        // Convert comments object to array if needed
        const commentsArray = Array.isArray(comments) ? comments : Object.values(comments);
        
        commentsContainer.innerHTML = commentsArray.map(comment => `
            <div class="comment">
                <span class="comment-username">${sanitizeInput(comment.username)}:</span>
                <span class="comment-text">${sanitizeInput(comment.text)}</span>
            </div>
        `).join('');
    });
}

async function refreshPost(postId) {
    if (!isFirebaseInitialized) return;
    
    try {
        const snapshot = await database.ref(`posts/${postId}`).once('value');
        if (!snapshot.exists()) return;
        
        const post = { id: snapshot.key, ...snapshot.val() };
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        
        if (postElement) {
            const newElement = createPostElement(post);
            postElement.replaceWith(newElement);
        }
    } catch (error) {
        console.error('Error refreshing post:', error);
        // Don't show error to user, post will just not update
    }
}

function togglePostMenu(postId) {
    const menu = document.getElementById(`menu-${postId}`);
    
    // Close all other menus
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m !== menu) m.classList.remove('show');
    });
    
    menu.classList.toggle('show');
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.post-actions-menu')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    if (!isFirebaseInitialized) return;
    
    try {
        await database.ref(`posts/${postId}`).remove();
        
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.style.animation = 'slideUp 0.3s ease-out reverse';
            setTimeout(() => postElement.remove(), 300);
        }
        
        showNotification('Post deleted successfully');
        setTimeout(() => {
            updateStatsDisplay();
            checkBadgesAfterPost();
        }, 500);
    } catch (error) {
        handleError(error, 'deletePost');
    }
}

function editPost(postId) {
    showNotification('Edit feature coming soon!', 'info');
    togglePostMenu(postId);
}

function sharePost(postId) {
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this post on SnapCircle',
            url: url
        }).catch(error => console.log('Error sharing:', error));
    } else {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Link copied to clipboard!');
        }).catch(error => {
            console.error('Error copying:', error);
        });
    }
}

function openImageViewer(imageUrl) {
    // Simple image viewer - could be enhanced with a modal
    window.open(imageUrl, '_blank');
}

// ========================================
// SEARCH
// ========================================
const searchPosts = debounce(async function(query) {
    if (!isFirebaseInitialized) return;
    
    const feed = document.getElementById('feed');
    
    if (!query.trim()) {
        // Reload all posts
        lastPostId = null;
        feed.innerHTML = '';
        await loadPostsWithPagination();
        return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    try {
        const snapshot = await database.ref('posts').once('value');
        const matchingPosts = [];
        
        snapshot.forEach(snap => {
            const post = { id: snap.key, ...snap.val() };
            const caption = (post.caption || '').toLowerCase();
            const username = (post.username || '').toLowerCase();
            
            if (caption.includes(searchTerm) || username.includes(searchTerm)) {
                matchingPosts.push(post);
            }
        });
        
        feed.innerHTML = '';
        
        if (matchingPosts.length === 0) {
            feed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No results found</h3>
                    <p>Try searching for something else</p>
                </div>
            `;
        } else {
            matchingPosts.sort((a, b) => b.timestamp - a.timestamp);
            matchingPosts.forEach(post => {
                const postElement = createPostElement(post);
                feed.appendChild(postElement);
            });
        }
    } catch (error) {
        handleError(error, 'searchPosts');
    }
}, CONFIG.DEBOUNCE_DELAY);

// ========================================
// PROFILE VIEW
// ========================================
async function viewProfile(userId) {
    console.log('viewProfile called with userId:', userId);
    
    if (!isFirebaseInitialized || !userId) {
        console.error('Cannot view profile - Firebase not initialized or no userId');
        return;
    }
    
    const modal = document.getElementById('profileModal');
    const profilePostsEl = document.getElementById('profilePosts');
    
    // Show modal with loading state immediately
    modal.classList.add('show');
    if (profilePostsEl) {
        profilePostsEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1; padding: 40px 20px;">Loading profile...</p>';
    }
    
    try {
        console.log('Fetching user data for:', userId);
        // Get user data
        const userSnapshot = await database.ref('users/' + userId).once('value');
        const userData = userSnapshot.val() || {};
        console.log('User data retrieved:', userData);
        
        console.log('Fetching posts for userId:', userId);
        // Get user posts
        const postsSnapshot = await database.ref('posts')
            .orderByChild('userId')
            .equalTo(userId)
            .once('value');
        
        console.log('Posts snapshot received');
        
        const posts = [];
        let totalReactions = 0;
        let usernameFromPost = null;
        let avatarColorFromPost = null;
        
        postsSnapshot.forEach(snap => {
            const post = { id: snap.key, ...snap.val() };
            posts.push(post);
            console.log('Found post:', post.id);
            
            if (post.reactions) {
                Object.values(post.reactions).forEach(reactionType => {
                    if (typeof reactionType === 'object') {
                        totalReactions += Object.keys(reactionType).length;
                    }
                });
            }
            
            if (!usernameFromPost && post.username) {
                usernameFromPost = post.username;
            }
            if (post.avatarColor) {
                avatarColorFromPost = post.avatarColor;
            }
        });
        
        console.log('Total posts found:', posts.length);
        
        const username = userData.username || usernameFromPost || 'User';
        const bio = userData.bio || '';
        const streak = userData.streak || 0;
        
        // Handle badges - can be string or array
        let badges = [];
        if (userData.badges) {
            if (typeof userData.badges === 'string') {
                badges = userData.badges.split(',').filter(b => b.trim().length > 0);
            } else if (Array.isArray(userData.badges)) {
                badges = userData.badges;
            }
        }
        
        const avatarColor = userData.avatarColor || avatarColorFromPost || 'default';
        
        // Update modal elements safely
        const profileUsernameEl = document.getElementById('profileUsername');
        const profileBioEl = document.getElementById('profileBio');
        const profilePostCountEl = document.getElementById('profilePostCount');
        const profileReactionCountEl = document.getElementById('profileReactionCount');
        const profileStreakEl = document.getElementById('profileStreakDisplay');
        const profileAvatarEl = document.getElementById('profileAvatar');
        const profileBadgesEl = document.getElementById('profileBadgesDisplay');
        
        if (profileUsernameEl) profileUsernameEl.textContent = username;
        if (profileBioEl) {
            profileBioEl.textContent = bio;
            profileBioEl.style.display = bio ? 'block' : 'none';
        }
        if (profilePostCountEl) profilePostCountEl.textContent = posts.length;
        if (profileReactionCountEl) profileReactionCountEl.textContent = totalReactions;
        if (profileStreakEl) profileStreakEl.textContent = streak;
        
        if (profileAvatarEl) {
            const avatarGradient = AVATAR_COLORS[avatarColor] || AVATAR_COLORS.default;
            profileAvatarEl.textContent = username.charAt(0).toUpperCase();
            profileAvatarEl.style.background = avatarGradient;
        }
        
        // Display badges
        if (profileBadgesEl) {
            try {
                profileBadgesEl.innerHTML = badges.map(badgeKey => {
                    const badge = BADGES[badgeKey];
                    if (!badge) return '';
                    return `<span class="profile-badge" title="${badge.name}" role="listitem">${badge.emoji}</span>`;
                }).join('');
            } catch (err) {
                console.error('Error displaying badges:', err);
                profileBadgesEl.innerHTML = '';
            }
        }
        
        // Display posts
        if (profilePostsEl) {
            try {
                profilePostsEl.innerHTML = '';
                
                console.log('Displaying posts for profile:', posts.length, 'posts found');
                
                posts.sort((a, b) => b.timestamp - a.timestamp);
                posts.forEach((post, index) => {
                    console.log(`Creating thumbnail for post ${index}:`, {
                        id: post.id,
                        mediaType: post.mediaType,
                        hasMediaUrl: !!post.mediaUrl
                    });
                    
                    const thumb = document.createElement('div');
                    thumb.className = 'profile-post-thumb';
                    thumb.setAttribute('role', 'listitem');
                    thumb.onclick = () => {
                        closeProfileModal();
                        const postElement = document.querySelector(`[data-post-id="${post.id}"]`);
                        if (postElement) {
                            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    };
                    
                    if (post.mediaUrl && post.mediaType !== 'text') {
                        if (post.mediaType === 'video') {
                            thumb.innerHTML = `<video src="${post.mediaUrl}" muted></video>`;
                        } else {
                            thumb.innerHTML = `<img src="${post.mediaUrl}" alt="Post thumbnail">`;
                        }
                    } else {
                        thumb.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-tertiary); font-size: 14px; color: var(--text-secondary);">Text Post</div>`;
                    }
                    
                    profilePostsEl.appendChild(thumb);
                });
                
                if (posts.length === 0) {
                    profilePostsEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No posts yet</p>';
                }
                
                console.log('Successfully displayed all post thumbnails');
            } catch (err) {
                console.error('Error displaying posts:', err);
                profilePostsEl.innerHTML = '<p style="text-align: center; color: var(--accent-primary); grid-column: 1/-1;">Error displaying posts</p>';
            }
        }
        
    } catch (error) {
        console.error('Error loading profile:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            userId: userId
        });
        
        // Show error in the posts container
        if (profilePostsEl) {
            profilePostsEl.innerHTML = '<p style="text-align: center; color: var(--accent-primary); grid-column: 1/-1; padding: 40px 20px;">Error loading posts. Check console for details.</p>';
        }
        
        showNotification('Error loading profile: ' + (error.message || 'Unknown error'), 'error');
    }
}

function viewMyProfile() {
    viewProfile(currentUserId);
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
}

// ========================================
// STATS
// ========================================
async function updateStatsDisplay() {
    if (!isFirebaseInitialized) return;
    
    try {
        const postsSnapshot = await database.ref('posts')
            .orderByChild('userId')
            .equalTo(currentUserId)
            .once('value');
        
        let postCount = 0;
        let totalLikes = 0;
        
        postsSnapshot.forEach(snap => {
            postCount++;
            const post = snap.val();
            if (post.reactions) {
                totalLikes += Object.keys(post.reactions).length;
            }
        });
        
        // Update elements if they exist
        const postCountEl = document.getElementById('userPostCount');
        const likesCountEl = document.getElementById('userLikesCount');
        
        if (postCountEl) postCountEl.textContent = postCount;
        if (likesCountEl) likesCountEl.textContent = totalLikes;
    } catch (error) {
        console.error('Error updating stats:', error);
        // Don't show error to user
    }
}

// ========================================
// SUGGESTED USERS
// ========================================
async function loadSuggestedUsers() {
    if (!isFirebaseInitialized) return;
    
    try {
        const postsSnapshot = await database.ref('posts').limitToLast(100).once('value');
        const userStats = {};
        
        postsSnapshot.forEach(postSnap => {
            const post = postSnap.val();
            if (post.userId && post.userId !== currentUserId) {
                if (!userStats[post.userId]) {
                    userStats[post.userId] = {
                        userId: post.userId,
                        username: post.username || 'User',
                        avatarColor: post.avatarColor || 'default',
                        postCount: 0,
                        reactionCount: 0
                    };
                }
                userStats[post.userId].postCount++;
                if (post.reactions) {
                    userStats[post.userId].reactionCount += Object.keys(post.reactions).length;
                }
            }
        });
        
        const topUsers = Object.values(userStats)
            .sort((a, b) => (b.postCount + b.reactionCount) - (a.postCount + a.reactionCount))
            .slice(0, 5);
        
        const suggestionsList = document.querySelector('.suggestions-list');
        if (!suggestionsList) return;
        
        suggestionsList.innerHTML = '';
        
        topUsers.forEach(user => {
            const avatarGradient = AVATAR_COLORS[user.avatarColor] || AVATAR_COLORS.default;
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.setAttribute('role', 'listitem');
            li.onclick = () => viewProfile(user.userId);
            li.innerHTML = `
                <div class="suggestion-avatar" style="background: ${avatarGradient}" aria-hidden="true">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <div class="suggestion-info">
                    <div class="suggestion-name">${sanitizeInput(user.username)}</div>
                    <div class="suggestion-meta">${user.postCount} posts · ${user.reactionCount} reactions</div>
                </div>
            `;
            suggestionsList.appendChild(li);
        });
        
        if (topUsers.length === 0) {
            suggestionsList.innerHTML = `
                <li class="suggestion-item" role="listitem">
                    <div class="suggestion-avatar" aria-hidden="true">S</div>
                    <div class="suggestion-info">
                        <div class="suggestion-name">SnapCircle</div>
                        <div class="suggestion-meta">Official Account</div>
                    </div>
                </li>
            `;
        }
    } catch (error) {
        console.error('Error loading suggested users:', error);
        // Don't show error to user
    }
}

// ========================================
// TRENDING TOPICS
// ========================================
function setupTrendingTopics() {
    const trendingItems = document.querySelectorAll('.trending-item');
    trendingItems.forEach(item => {
        item.addEventListener('click', function() {
            const tag = this.querySelector('.trending-tag').textContent;
            const searchInput = document.getElementById('searchInput');
            searchInput.value = tag;
            searchPosts(tag);
            searchInput.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ========================================
// SCROLL BUTTON
// ========================================
function setupScrollButton() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.style.display = 'flex';
        } else {
            scrollBtn.style.display = 'none';
        }
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// EASTER EGG - KONAMI CODE
// ========================================
function setupKonamiCode() {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    
    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                activatePartyMode();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
}

function activatePartyMode() {
    showNotification('🎉 PARTY MODE ACTIVATED! 🎉');
    
    // Remove any existing party mode style
    const existingStyle = document.getElementById('party-mode-style');
    if (existingStyle) existingStyle.remove();
    
    // Add rainbow animation
    const style = document.createElement('style');
    style.id = 'party-mode-style';
    style.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
        body.party-mode {
            animation: rainbow 3s linear infinite !important;
        }
    `;
    document.head.appendChild(style);
    
    document.body.classList.add('party-mode');
    
    setTimeout(() => {
        document.body.classList.remove('party-mode');
        style.remove();
    }, 10000);
}

// ========================================
// EMAIL CONNECTION
// ========================================
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('show');
    
    // Update the code display
    const codeDisplay = document.getElementById('registerCodeDisplay');
    if (codeDisplay) {
        codeDisplay.textContent = currentUserCode;
    }
    
    // Default to register tab
    switchLoginTab('register');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('show');
}

function switchLoginTab(tab) {
    const registerSection = document.getElementById('registerSection');
    const loginSection = document.getElementById('loginSection');
    const tabs = document.querySelectorAll('.login-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'register') {
        registerSection.style.display = 'block';
        loginSection.style.display = 'none';
        tabs[0].classList.add('active');
    } else {
        registerSection.style.display = 'none';
        loginSection.style.display = 'block';
        tabs[1].classList.add('active');
    }
}

function copyAccountCode() {
    const code = currentUserCode;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            showNotification('✅ Account code copied to clipboard!');
        }).catch(() => {
            fallbackCopyCode(code);
        });
    } else {
        fallbackCopyCode(code);
    }
}

function fallbackCopyCode(code) {
    const textArea = document.createElement('textarea');
    textArea.value = code;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification('✅ Account code copied to clipboard!');
    } catch (err) {
        showNotification('Code: ' + code + ' (Please copy manually)', 'info');
    }
    
    document.body.removeChild(textArea);
}

async function loginWithCode() {
    const codeInput = document.getElementById('loginCodeInput');
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code || code.length !== 8) {
        showNotification('Please enter a valid 8-character code', 'error');
        return;
    }
    
    if (!isFirebaseInitialized) {
        showNotification('Please wait for connection...', 'error');
        return;
    }
    
    try {
        // Search for user with this code
        const snapshot = await database.ref('users')
            .orderByChild('userCode')
            .equalTo(code)
            .once('value');
        
        if (!snapshot.exists()) {
            showNotification('Account code not found. Please check and try again.', 'error');
            return;
        }
        
        // Get the user data
        let foundUserId = null;
        let foundUserData = null;
        
        snapshot.forEach(childSnapshot => {
            foundUserId = childSnapshot.key;
            foundUserData = childSnapshot.val();
        });
        
        if (!foundUserId) {
            showNotification('Account not found', 'error');
            return;
        }
        
        // Update local storage with the recovered account
        currentUserId = foundUserId;
        currentUsername = foundUserData.username || currentUsername;
        currentUserCode = code;
        userEmail = foundUserData.email || '';
        isConnected = foundUserData.connected || false;
        selectedAvatarColor = foundUserData.avatarColor || 'default';
        
        localStorage.setItem(STORAGE_KEYS.USER_ID, currentUserId);
        localStorage.setItem(STORAGE_KEYS.USERNAME, currentUsername);
        localStorage.setItem(STORAGE_KEYS.USER_CODE, currentUserCode);
        localStorage.setItem(STORAGE_KEYS.EMAIL, userEmail);
        localStorage.setItem(STORAGE_KEYS.CONNECTED, isConnected);
        localStorage.setItem(STORAGE_KEYS.AVATAR_COLOR, selectedAvatarColor);
        
        // Update last active
        await database.ref(`users/${currentUserId}`).update({
            lastActive: Date.now()
        });
        
        // Reload the app with the recovered account
        showNotification('✅ Account restored successfully!');
        closeLoginModal();
        
        // Refresh the page to load the account data
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Failed to login. Please try again.', 'error');
    }
}

function openConnectModal() {
    let modal = document.getElementById('connectModal');
    if (!modal) {
        modal = createConnectModal();
    }
    modal.classList.add('show');
    const emailInput = document.getElementById('connectEmail');
    if (emailInput) {
        emailInput.value = userEmail || '';
    }
    const userCodeDisplay = document.getElementById('userCodeDisplay');
    if (userCodeDisplay) {
        userCodeDisplay.textContent = currentUserCode;
    }
}

function createConnectModal() {
    const modalHTML = `
        <div class="modal" id="connectModal">
            <div class="modal-content">
                <h2 style="margin: 0 0 12px; display: flex; align-items: center; gap: 12px;">
                    🔐 Connect Your Account
                </h2>
                <p class="modal-description" style="margin-bottom: 24px; color: var(--text-secondary);">
                    Protect your account from auto-deletion after 30 days of inactivity.
                </p>
                
                <div class="info-box" style="background: var(--bg-tertiary); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                    <p style="margin-bottom: 8px; font-weight: 600;"><strong>Your Unique Code:</strong></p>
                    <div class="user-code" id="userCodeDisplay" style="font-family: 'Space Mono', monospace; font-size: 24px; font-weight: 700; letter-spacing: 2px; padding: 12px; background: var(--bg-secondary); border-radius: 8px; text-align: center; margin: 12px 0;">${currentUserCode}</div>
                    <p class="info-note" style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">Save this code! You'll need it to recover your account.</p>
                </div>
                
                <div class="form-group" style="margin-bottom: 24px;">
                    <label for="connectEmail" style="display: block; margin-bottom: 8px; font-weight: 500;">Email Address</label>
                    <input type="email" id="connectEmail" placeholder="your@email.com" required style="width: 100%; padding: 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 16px; background: var(--bg-secondary); color: var(--text-primary);">
                </div>
                
                <div class="modal-buttons" style="display: flex; gap: 12px;">
                    <button class="modal-cancel" onclick="closeConnectModal()" style="flex: 1; padding: 12px 24px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); border-radius: 8px; font-weight: 600; cursor: pointer;">Maybe Later</button>
                    <button class="modal-save" onclick="connectAccount()" style="flex: 1; padding: 12px 24px; border: none; background: var(--gradient-accent); color: white; border-radius: 8px; font-weight: 600; cursor: pointer;">Connect Account</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('connectModal');
}

function closeConnectModal() {
    const modal = document.getElementById('connectModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

async function connectAccount() {
    const email = document.getElementById('connectEmail').value.trim();
    
    if (!email) {
        showNotification('Please enter an email address');
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotification('Please enter a valid email address');
        return;
    }
    
    try {
        await database.ref(`users/${currentUserId}`).update({
            email: email,
            connected: true,
            connectedAt: Date.now()
        });
        
        userEmail = email;
        isConnected = true;
        localStorage.setItem(STORAGE_KEYS.EMAIL, email);
        localStorage.setItem(STORAGE_KEYS.CONNECTED, 'true');
        
        // Remove warning banner if it exists
        const warning = document.getElementById('accountWarning');
        if (warning) warning.remove();
        
        showNotification('✅ Account connected successfully!');
        closeConnectModal();
    } catch (error) {
        console.error('Error connecting account:', error);
        showNotification('Failed to connect account. Please try again.');
    }
}

// ========================================
// CONTACT FORM
// ========================================
function openContactForm() {
    const message = prompt('Send us a message:');
    if (!message) return;
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://formsubmit.co/ayoubnware1@gmail.com';
    form.innerHTML = `
        <input type="hidden" name="_subject" value="SnapCircle Contact">
        <input type="hidden" name="From" value="${sanitizeInput(currentUsername)}">
        <input type="hidden" name="User ID" value="${currentUserId}">
        <input type="hidden" name="Message" value="${sanitizeInput(message)}">
        <input type="hidden" name="_captcha" value="false">
    `;
    document.body.appendChild(form);
    form.submit();
    
    showNotification('Message sent!');
}

// ========================================
// CLEANUP
// ========================================
window.addEventListener('beforeunload', () => {
    // Remove Firebase listeners
    if (postsListener) {
        database.ref('posts').off('child_added', postsListener);
    }
});
