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
    THEME: 'snapcircle_theme',
    LAST_LOGIN: 'snapcircle_last_login',
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
let currentStreak = 0;
let userBadges = [];
let selectedAvatarColor = localStorage.getItem(STORAGE_KEYS.AVATAR_COLOR) || 'default';
let currentFile = null;
let postsListener = null;

// ========================================
// UTILITY FUNCTIONS
// ========================================

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
 * Generate unique user ID
 */
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    showNotification(`Something went wrong. Please try again.`, 'error');
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
        // Just load posts - that's all we need immediately
        loadPosts();
        
        // Everything else can happen in the background without blocking
        setTimeout(() => {
            loadUserBadges();
            updateStatsDisplay();
            loadSuggestedUsers();
            setupRealtimeListeners();
        }, 100);
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
        userBadges = snapshot.val() || [];
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
            database.ref('users/' + currentUserId + '/badges').set(userBadges);
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
        database.ref('users/' + currentUserId + '/badges').set(userBadges);
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
        let mediaUrl = null;
        let mediaType = null;
        
        if (currentFile) {
            // Convert file to base64
            mediaUrl = await fileToBase64(currentFile);
            mediaType = currentFile.type.startsWith('video/') ? 'video' : 'image';
        }
        
        const postData = {
            userId: currentUserId,
            username: currentUsername,
            avatarColor: selectedAvatarColor,
            caption: sanitizeInput(caption),
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timestamp: Date.now(),
            reactions: {}
        };
        
        await database.ref('posts').push(postData);
        
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
    if (!isFirebaseInitialized || !userId) return;
    
    const modal = document.getElementById('profileModal');
    
    try {
        // Get user data
        const userSnapshot = await database.ref('users/' + userId).once('value');
        const userData = userSnapshot.val() || {};
        
        // Get user posts
        const postsSnapshot = await database.ref('posts')
            .orderByChild('userId')
            .equalTo(userId)
            .once('value');
        
        const posts = [];
        let totalReactions = 0;
        let usernameFromPost = null;
        let avatarColorFromPost = null;
        
        postsSnapshot.forEach(snap => {
            const post = { id: snap.key, ...snap.val() };
            posts.push(post);
            
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
        
        const username = userData.username || usernameFromPost || 'User';
        const bio = userData.bio || '';
        const streak = userData.streak || 0;
        const badges = userData.badges || [];
        const avatarColor = userData.avatarColor || avatarColorFromPost || 'default';
        
        // Update modal elements safely
        const profileUsernameEl = document.getElementById('profileUsername');
        const profileBioEl = document.getElementById('profileBio');
        const profilePostCountEl = document.getElementById('profilePostCount');
        const profileReactionCountEl = document.getElementById('profileReactionCount');
        const profileStreakEl = document.getElementById('profileStreakDisplay');
        const profileAvatarEl = document.getElementById('profileAvatar');
        const profileBadgesEl = document.getElementById('profileBadgesDisplay');
        const profilePostsEl = document.getElementById('profilePosts');
        
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
            profileBadgesEl.innerHTML = badges.map(badgeKey => {
                const badge = BADGES[badgeKey];
                if (!badge) return '';
                return `<span class="profile-badge" title="${badge.name}" role="listitem">${badge.emoji}</span>`;
            }).join('');
        }
        
        // Display posts
        if (profilePostsEl) {
            profilePostsEl.innerHTML = '';
            
            posts.sort((a, b) => b.timestamp - a.timestamp);
            posts.forEach(post => {
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
                
                if (post.mediaUrl) {
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
        }
        
        modal.classList.add('show');
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Failed to load profile', 'error');
    }
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
    document.body.style.animation = 'rainbow 3s infinite';
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        document.body.style.animation = '';
        style.remove();
    }, 10000);
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
