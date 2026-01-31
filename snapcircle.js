// ========================================
// FIREBASE CONFIGURATION
// ========================================
const firebaseConfig = {
    apiKey: "AIzaSyD8g1ogr4Hjs1jRBlmUACMQ-4huZqjAnm8",
    authDomain: "snapcircle-d4955.firebaseapp.com",
    databaseURL: "https://snapcircle-d4955-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "snapcircle-d4955",
    storageBucket: "snapcircle-d4955.firebasestorage.app",
    messagingSenderId: "12069426076",
    appId: "1:12069426076:web:24496f14b46b2506606e59"
};

// Initialize Firebase
let app, database;
let isFirebaseInitialized = false;

try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    isFirebaseInitialized = true;
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('Firebase not configured. Please add your Firebase config to the JavaScript file.');
}

// ========================================
// BADGES SYSTEM
// ========================================
const BADGES = {
    EARLY_BIRD: { emoji: '🌅', name: 'Early Bird', description: 'One of the first users!', requirement: 'auto' },
    FIRST_POST: { emoji: '✨', name: 'First Post', description: 'Created your first post', requirement: 1 },
    ACTIVE_USER: { emoji: '🔥', name: 'Active User', description: 'Posted 10 times', requirement: 10 },
    INFLUENCER: { emoji: '⭐', name: 'Influencer', description: 'Got 100 reactions', requirement: 100 },
    WEEK_STREAK: { emoji: '🎯', name: 'Dedicated', description: '7 day login streak', requirement: 7 },
    MONTH_STREAK: { emoji: '👑', name: 'Loyal', description: '30 day login streak', requirement: 30 },
    SUPER_CREATOR: { emoji: '💎', name: 'Super Creator', description: 'Posted 50 times', requirement: 50 },
    POPULAR: { emoji: '🌟', name: 'Popular', description: 'Got 500 reactions', requirement: 500 }
};

// ========================================
// LOCAL STORAGE KEYS
// ========================================
const STORAGE_KEYS = {
    USERNAME: 'snapcircle_username',
    USER_ID: 'snapcircle_user_id',
    THEME: 'snapcircle_theme',
    LAST_LOGIN: 'snapcircle_last_login',
    STREAK: 'snapcircle_streak',
    AVATAR_COLOR: 'snapcircle_avatar_color',
    BIO: 'snapcircle_bio'
};

// ========================================
// USER MANAGEMENT
// ========================================
let currentUsername = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'User' + Math.floor(Math.random() * 10000);
let currentUserId = localStorage.getItem(STORAGE_KEYS.USER_ID) || generateUserId();
let currentStreak = 0;
let userBadges = [];
let selectedAvatarColor = localStorage.getItem(STORAGE_KEYS.AVATAR_COLOR) || 'default';

// Avatar color gradients
const AVATAR_COLORS = {
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    blue: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    green: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ocean: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
};

// Save initial user data
localStorage.setItem(STORAGE_KEYS.USERNAME, currentUsername);
localStorage.setItem(STORAGE_KEYS.USER_ID, currentUserId);

// Reaction types
const REACTIONS = {
    LIKE: { emoji: '👍', name: 'like' },
    LOVE: { emoji: '❤️', name: 'love' },
    HAHA: { emoji: '😂', name: 'haha' },
    WOW: { emoji: '😮', name: 'wow' },
    SAD: { emoji: '😢', name: 'sad' },
    AWKWARD: { emoji: '😬', name: 'awkward' }
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Show loading screen, then hide after content loads
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 1500);

    initializeApp();
});

async function initializeApp() {
    updateUsernameDisplay();
    loadTheme();
    updateStreak();
    setupFileUpload();
    setupScrollButton();
    setupKonamiCode();
    setupTrendingTopics();
    
    if (isFirebaseInitialized) {
        await loadUserData();
        await loadPosts();
        updateBadgeDisplay();
        updateStatsDisplay();
        loadSuggestedUsers();
    }
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateUsernameDisplay() {
    document.getElementById('currentUsername').textContent = currentUsername;
    const initial = currentUsername.charAt(0).toUpperCase();
    
    // Update all avatar displays
    const avatarElements = document.querySelectorAll('#headerAvatar span:first-child');
    avatarElements.forEach(el => el.textContent = initial);
    
    // Apply custom avatar color
    applyAvatarColor();
}

function applyAvatarColor() {
    const gradient = AVATAR_COLORS[selectedAvatarColor] || AVATAR_COLORS.default;
    document.documentElement.style.setProperty('--gradient-start', gradient.match(/#[0-9a-f]+/gi)[0]);
    document.documentElement.style.setProperty('--gradient-end', gradient.match(/#[0-9a-f]+/gi)[1]);
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
// STREAK SYSTEM
// ========================================
function updateStreak() {
    const lastLogin = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
    const today = new Date().toDateString();
    const savedStreak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0');
    
    if (!lastLogin) {
        // First time user
        currentStreak = 1;
    } else if (lastLogin === today) {
        // Already logged in today
        currentStreak = savedStreak;
    } else {
        const lastDate = new Date(lastLogin);
        const todayDate = new Date();
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            // Consecutive day
            currentStreak = savedStreak + 1;
        } else {
            // Streak broken
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
        database.ref('users/' + currentUserId + '/streak').set(currentStreak);
    }
    
    // Check for streak badges
    checkBadges();
}

// ========================================
// BADGES SYSTEM
// ========================================
async function loadUserData() {
    try {
        const snapshot = await database.ref('users/' + currentUserId).once('value');
        const userData = snapshot.val() || {};
        
        userBadges = userData.badges || [];
        
        // Auto-award early bird badge if one of first 100 users
        const usersSnapshot = await database.ref('users').once('value');
        const totalUsers = usersSnapshot.numChildren();
        if (totalUsers <= 100 && !userBadges.includes('EARLY_BIRD')) {
            userBadges.push('EARLY_BIRD');
            await database.ref('users/' + currentUserId + '/badges').set(userBadges);
        }
        
        updateBadgeDisplay();
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function checkBadges() {
    // Check streak badges
    if (currentStreak >= 7 && !userBadges.includes('WEEK_STREAK')) {
        awardBadge('WEEK_STREAK');
    }
    if (currentStreak >= 30 && !userBadges.includes('MONTH_STREAK')) {
        awardBadge('MONTH_STREAK');
    }
}

async function awardBadge(badgeKey) {
    if (userBadges.includes(badgeKey)) return;
    
    userBadges.push(badgeKey);
    
    // Save to Firebase
    if (isFirebaseInitialized) {
        await database.ref('users/' + currentUserId + '/badges').set(userBadges);
    }
    
    // Show notification
    const badge = BADGES[badgeKey];
    showNotification(`🎉 New Badge! ${badge.emoji} ${badge.name}`);
    
    updateBadgeDisplay();
}

function updateBadgeDisplay() {
    // Update sidebar badge showcase
    const badgeShowcase = document.getElementById('badgeShowcase');
    badgeShowcase.innerHTML = '';
    
    Object.keys(BADGES).forEach(key => {
        const badge = BADGES[key];
        const hasBadge = userBadges.includes(key);
        
        const badgeItem = document.createElement('div');
        badgeItem.className = 'badge-item' + (hasBadge ? '' : ' locked');
        badgeItem.title = badge.description;
        badgeItem.innerHTML = `
            <div class="badge-icon">${badge.emoji}</div>
            <div class="badge-name">${badge.name}</div>
        `;
        badgeShowcase.appendChild(badgeItem);
    });
    
    // Update header badge (show highest badge)
    const headerBadge = document.getElementById('headerBadge');
    if (userBadges.length > 0) {
        const highestBadge = BADGES[userBadges[userBadges.length - 1]];
        headerBadge.textContent = highestBadge.emoji;
    }
    
    // Update stats
    document.getElementById('userBadgesCount').textContent = userBadges.length;
}

// ========================================
// PROFILE CUSTOMIZATION
// ========================================
function selectColor(element, colorKey) {
    // Remove selected class from all
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    // Add to clicked
    element.classList.add('selected');
    selectedAvatarColor = colorKey;
}

async function saveUsername() {
    const newUsername = document.getElementById('usernameInput').value.trim();
    const newBio = document.getElementById('bioInput').value.trim();
    
    if (!newUsername) {
        alert('Please enter a username');
        return;
    }
    
    if (newUsername.length < 3) {
        alert('Username must be at least 3 characters');
        return;
    }
    
    currentUsername = newUsername;
    localStorage.setItem(STORAGE_KEYS.USERNAME, currentUsername);
    localStorage.setItem(STORAGE_KEYS.AVATAR_COLOR, selectedAvatarColor);
    localStorage.setItem(STORAGE_KEYS.BIO, newBio);
    
    // Save to Firebase
    if (isFirebaseInitialized) {
        await database.ref('users/' + currentUserId).update({
            username: currentUsername,
            avatarColor: selectedAvatarColor,
            bio: newBio
        });
    }
    
    updateUsernameDisplay();
    closeUsernameModal();
    showNotification('Profile updated!');
}

function openUsernameModal() {
    document.getElementById('usernameInput').value = currentUsername;
    document.getElementById('bioInput').value = localStorage.getItem(STORAGE_KEYS.BIO) || '';
    document.getElementById('usernameModal').classList.add('show');
}

function closeUsernameModal() {
    document.getElementById('usernameModal').classList.remove('show');
}

// ========================================
// STATS DISPLAY
// ========================================
async function updateStatsDisplay() {
    try {
        // Count user's posts
        const postsSnapshot = await database.ref('posts').orderByChild('userId').equalTo(currentUserId).once('value');
        const postCount = postsSnapshot.numChildren();
        document.getElementById('userPostCount').textContent = postCount;
        
        // Count total reactions received
        let totalReactions = 0;
        postsSnapshot.forEach(post => {
            const reactions = post.val().reactions || {};
            totalReactions += Object.keys(reactions).length;
        });
        document.getElementById('userLikesCount').textContent = totalReactions;
        
        // Check for badges based on stats
        if (postCount >= 1 && !userBadges.includes('FIRST_POST')) {
            awardBadge('FIRST_POST');
        }
        if (postCount >= 10 && !userBadges.includes('ACTIVE_USER')) {
            awardBadge('ACTIVE_USER');
        }
        if (postCount >= 50 && !userBadges.includes('SUPER_CREATOR')) {
            awardBadge('SUPER_CREATOR');
        }
        if (totalReactions >= 100 && !userBadges.includes('INFLUENCER')) {
            awardBadge('INFLUENCER');
        }
        if (totalReactions >= 500 && !userBadges.includes('POPULAR')) {
            awardBadge('POPULAR');
        }
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ========================================
// FILE UPLOAD HANDLING
// ========================================
let selectedFile = null;

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

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

function handleFileSelect(file) {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert('Please select an image or video file');
        return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        alert('File is too large. Maximum size is 50MB');
        return;
    }

    selectedFile = file;
    displayPreview(file);
}

function displayPreview(file) {
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '<button class="remove-preview" onclick="removePreview()">×</button>';
    previewContainer.style.display = 'block';

    const reader = new FileReader();
    reader.onload = function(e) {
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = e.target.result;
            previewContainer.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = e.target.result;
            video.controls = true;
            video.style.maxWidth = '100%';
            previewContainer.appendChild(video);
        }
    };
    reader.readAsDataURL(file);
}

function removePreview() {
    event.stopPropagation();
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('previewContainer').innerHTML = '';
}

// ========================================
// POST CREATION
// ========================================
async function createPost() {
    if (!isFirebaseInitialized) {
        alert('Firebase is not configured. Please check the console for details.');
        return;
    }

    if (!selectedFile) {
        alert('Please select a file first');
        return;
    }

    const caption = document.getElementById('captionInput').value.trim();
    const postBtn = document.getElementById('postBtn');
    
    postBtn.disabled = true;
    postBtn.textContent = 'Processing...';

    try {
        const isVideo = selectedFile.type.startsWith('video/');
        let mediaData;

        if (isVideo) {
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert('Video is too large. Maximum size is 5MB.');
                postBtn.textContent = 'Share Post';
                postBtn.disabled = false;
                return;
            }
            
            postBtn.textContent = 'Converting video...';
            mediaData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(selectedFile);
            });
        } else {
            if (selectedFile.size > 2 * 1024 * 1024) {
                alert('Image is too large. Maximum size is 2MB.');
                postBtn.textContent = 'Share Post';
                postBtn.disabled = false;
                return;
            }
            
            postBtn.textContent = 'Converting image...';
            mediaData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(selectedFile);
            });
        }

        postBtn.textContent = 'Saving...';
        const timestamp = Date.now();
        
        const post = {
            id: 'post_' + timestamp,
            userId: currentUserId,
            username: currentUsername,
            avatarColor: selectedAvatarColor,
            caption: caption,
            mediaUrl: mediaData,
            mediaType: isVideo ? 'video' : 'image',
            timestamp: timestamp,
            reactions: {}
        };

        await database.ref('posts/' + post.id).set(post);

        // Reset form
        selectedFile = null;
        document.getElementById('fileInput').value = '';
        document.getElementById('captionInput').value = '';
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('previewContainer').innerHTML = '';
        
        postBtn.textContent = 'Share Post';
        postBtn.disabled = false;

        showNotification('Post created successfully! ✨');
        
        // Update stats
        updateStatsDisplay();

    } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post. Please try again.');
        postBtn.textContent = 'Share Post';
        postBtn.disabled = false;
    }
}

// ========================================
// LOAD & DISPLAY POSTS
// ========================================
async function loadPosts() {
    const feed = document.getElementById('feed');
    
    database.ref('posts').orderByChild('timestamp').on('value', (snapshot) => {
        feed.innerHTML = '';
        const posts = [];
        
        snapshot.forEach((childSnapshot) => {
            posts.push(childSnapshot.val());
        });
        
        // Sort by newest first
        posts.sort((a, b) => b.timestamp - a.timestamp);
        
        if (posts.length === 0) {
            feed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔵</div>
                    <h3>Welcome to SnapCircle!</h3>
                    <p>Be the first to share something amazing!</p>
                </div>
            `;
            return;
        }
        
        posts.forEach((post, index) => {
            setTimeout(() => {
                const postElement = createPostElement(post);
                feed.appendChild(postElement);
            }, index * 100); // Stagger animation
        });
    });
}

function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.setAttribute('data-post-id', post.id);
    postDiv.setAttribute('data-username', post.username);
    postDiv.setAttribute('data-caption', post.caption);
    
    const timeAgo = getTimeAgo(post.timestamp);
    const userReaction = post.reactions && post.reactions[currentUserId];
    const reactionCount = post.reactions ? Object.keys(post.reactions).length : 0;
    
    // Get avatar gradient
    const avatarGradient = AVATAR_COLORS[post.avatarColor] || AVATAR_COLORS.default;
    
    const mediaElement = post.mediaType === 'video' 
        ? `<video class="post-media" src="${post.mediaUrl}" controls ondblclick="doubleClickLike('${post.id}')"></video>`
        : `<img class="post-media" src="${post.mediaUrl}" alt="Post" ondblclick="doubleClickLike('${post.id}')">`;
    
    const isOwnPost = post.userId === currentUserId;
    
    postDiv.innerHTML = `
        <div class="post-header">
            <div class="post-user" onclick="viewProfile('${post.userId}')">
                <div class="post-avatar" style="background: ${avatarGradient}">
                    ${post.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div class="post-username">${post.username}</div>
                    <div class="post-time">${timeAgo}</div>
                </div>
            </div>
            <div class="share-menu">
                <div class="post-options" onclick="toggleShareMenu(event, '${post.id}')">⋯</div>
                <div class="share-dropdown" id="share-${post.id}">
                    <div class="share-option" onclick="copyLink('${post.id}')">
                        🔗 Copy Link
                    </div>
                    <div class="share-option" onclick="reportPost('${post.id}', '${post.username}')">
                        🚩 Report
                    </div>
                    ${isOwnPost ? `<div class="share-option delete-option" onclick="deletePost('${post.id}')">🗑️ Delete</div>` : ''}
                </div>
            </div>
        </div>
        ${mediaElement}
        ${post.caption ? `<div class="post-content"><div class="post-caption">${post.caption}</div></div>` : ''}
        <div class="post-actions">
            <div style="position: relative;">
                <button class="action-btn ${userReaction ? 'active' : ''}" onclick="toggleReactionPicker('${post.id}')">
                    ${userReaction ? REACTIONS[userReaction].emoji : '👍'} 
                    ${reactionCount > 0 ? reactionCount : 'Like'}
                </button>
                <div class="reaction-picker" id="reactions-${post.id}">
                    ${Object.keys(REACTIONS).map(key => 
                        `<span class="reaction-option" onclick="addReaction('${post.id}', '${key}')">${REACTIONS[key].emoji}</span>`
                    ).join('')}
                </div>
            </div>
            <button class="action-btn" onclick="sharePost('${post.id}')">
                🔄 Share
            </button>
        </div>
    `;
    
    return postDiv;
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return new Date(timestamp).toLocaleDateString();
}

// ========================================
// REACTIONS
// ========================================
function toggleReactionPicker(postId) {
    const picker = document.getElementById('reactions-' + postId);
    const allPickers = document.querySelectorAll('.reaction-picker');
    
    allPickers.forEach(p => {
        if (p.id !== 'reactions-' + postId) {
            p.classList.remove('show');
        }
    });
    
    picker.classList.toggle('show');
    
    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closePicker(e) {
            if (!e.target.closest('.reaction-picker') && !e.target.closest('.action-btn')) {
                picker.classList.remove('show');
                document.removeEventListener('click', closePicker);
            }
        });
    }, 0);
}

async function addReaction(postId, reactionType) {
    if (!isFirebaseInitialized) return;
    
    try {
        const postRef = database.ref('posts/' + postId);
        const snapshot = await postRef.once('value');
        const post = snapshot.val();
        
        if (!post) return;
        
        const reactions = post.reactions || {};
        const previousReaction = reactions[currentUserId];
        
        if (previousReaction === reactionType) {
            delete reactions[currentUserId];
        } else {
            reactions[currentUserId] = reactionType;
        }
        
        await postRef.update({ reactions });
        
        // Close picker
        document.getElementById('reactions-' + postId).classList.remove('show');
        
    } catch (error) {
        console.error('Error adding reaction:', error);
    }
}

// Double-click to like
function doubleClickLike(postId) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    const mediaElement = postElement.querySelector('.post-media');
    
    // Create heart animation
    const heart = document.createElement('div');
    heart.className = 'like-heart';
    heart.textContent = '❤️';
    heart.style.position = 'absolute';
    heart.style.left = '50%';
    heart.style.top = '50%';
    mediaElement.parentElement.style.position = 'relative';
    mediaElement.parentElement.appendChild(heart);
    
    setTimeout(() => heart.remove(), 1000);
    
    // Add like reaction
    addReaction(postId, 'LOVE');
}

// ========================================
// POST ACTIONS
// ========================================
function toggleShareMenu(event, postId) {
    event.stopPropagation();
    const menu = document.getElementById('share-' + postId);
    const allMenus = document.querySelectorAll('.share-dropdown');
    
    allMenus.forEach(m => {
        if (m.id !== 'share-' + postId) {
            m.classList.remove('show');
        }
    });
    
    menu.classList.toggle('show');
    
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!e.target.closest('.share-menu')) {
                menu.classList.remove('show');
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
}

function copyLink(postId) {
    const url = window.location.origin + window.location.pathname + '#post-' + postId;
    navigator.clipboard.writeText(url);
    showNotification('Link copied!');
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        await database.ref('posts/' + postId).remove();
        showNotification('Post deleted');
        updateStatsDisplay();
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
    }
}

function reportPost(postId, username) {
    const reason = prompt('Please tell us why you\'re reporting this post:');
    if (!reason) return;
    
    const report = {
        postId: postId,
        reportedBy: currentUserId,
        reportedUser: username,
        reason: reason,
        timestamp: Date.now()
    };
    
    database.ref('reports/' + Date.now()).set(report);
    
    // Send email via FormSubmit
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://formsubmit.co/ayoubnware1@gmail.com';
    form.innerHTML = `
        <input type="hidden" name="_subject" value="SnapCircle Report">
        <input type="hidden" name="Post ID" value="${postId}">
        <input type="hidden" name="Reported User" value="${username}">
        <input type="hidden" name="Reported By" value="${currentUsername}">
        <input type="hidden" name="Reason" value="${reason}">
        <input type="hidden" name="_captcha" value="false">
    `;
    document.body.appendChild(form);
    form.submit();
    
    showNotification('Report submitted. Thank you!');
}

function sharePost(postId) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    const username = postElement.getAttribute('data-username');
    const caption = postElement.getAttribute('data-caption');
    
    const text = `Check out this post by ${username} on SnapCircle! ${caption}`;
    const url = window.location.origin + window.location.pathname + '#post-' + postId;
    
    if (navigator.share) {
        navigator.share({ title: 'SnapCircle Post', text: text, url: url });
    } else {
        copyLink(postId);
    }
}

function openContactForm() {
    const message = prompt('Send us a message:');
    if (!message) return;
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://formsubmit.co/ayoubnware1@gmail.com';
    form.innerHTML = `
        <input type="hidden" name="_subject" value="SnapCircle Contact">
        <input type="hidden" name="From" value="${currentUsername}">
        <input type="hidden" name="User ID" value="${currentUserId}">
        <input type="hidden" name="Message" value="${message}">
        <input type="hidden" name="_captcha" value="false">
    `;
    document.body.appendChild(form);
    form.submit();
    
    showNotification('Message sent!');
}

// ========================================
// SEARCH
// ========================================
function searchPosts(query) {
    const posts = document.querySelectorAll('.post');
    query = query.toLowerCase();
    
    posts.forEach(post => {
        const username = post.getAttribute('data-username').toLowerCase();
        const caption = post.getAttribute('data-caption').toLowerCase();
        
        if (username.includes(query) || caption.includes(query)) {
            post.style.display = 'block';
        } else {
            post.style.display = 'none';
        }
    });
}

// ========================================
// PROFILE MODAL
// ========================================
async function viewProfile(userId) {
    const modal = document.getElementById('profileModal');
    
    try {
        const userSnapshot = await database.ref('users/' + userId).once('value');
        const userData = userSnapshot.val() || {};
        
        const postsSnapshot = await database.ref('posts').orderByChild('userId').equalTo(userId).once('value');
        const posts = [];
        let totalReactions = 0;
        let usernameFromPost = '';
        let avatarColorFromPost = 'default';
        
        postsSnapshot.forEach(child => {
            const post = child.val();
            posts.push(post);
            totalReactions += post.reactions ? Object.keys(post.reactions).length : 0;
            // Get username and color from their posts if not in users table
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
        const avatarColor = userData.avatarColor || avatarColorFromPost;
        
        document.getElementById('profileUsername').textContent = username;
        document.getElementById('profileBio').textContent = bio;
        document.getElementById('profileBio').style.display = bio ? 'block' : 'none';
        document.getElementById('profilePostCount').textContent = posts.length;
        document.getElementById('profileReactionCount').textContent = totalReactions;
        document.getElementById('profileStreakDisplay').textContent = streak;
        
        const avatarGradient = AVATAR_COLORS[avatarColor] || AVATAR_COLORS.default;
        const profileAvatar = document.getElementById('profileAvatar');
        profileAvatar.textContent = username.charAt(0).toUpperCase();
        profileAvatar.style.background = avatarGradient;
        
        // Display badges
        const badgesDisplay = document.getElementById('profileBadgesDisplay');
        badgesDisplay.innerHTML = badges.map(badgeKey => 
            `<span class="profile-badge" title="${BADGES[badgeKey].name}">${BADGES[badgeKey].emoji}</span>`
        ).join('');
        
        const postsGrid = document.getElementById('profilePosts');
        postsGrid.innerHTML = '';
        
        posts.sort((a, b) => b.timestamp - a.timestamp);
        posts.forEach(post => {
            const thumb = document.createElement('div');
            thumb.className = 'profile-post-thumb';
            thumb.onclick = () => {
                closeProfileModal();
                document.querySelector(`[data-post-id="${post.id}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            
            if (post.mediaType === 'video') {
                thumb.innerHTML = `<video src="${post.mediaUrl}"></video>`;
            } else {
                thumb.innerHTML = `<img src="${post.mediaUrl}" alt="Post">`;
            }
            
            postsGrid.appendChild(thumb);
        });
        
        modal.classList.add('show');
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function showNotification(message) {
    const notification = document.getElementById('copyNotification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function setupScrollButton() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.style.display = 'block';
        } else {
            scrollBtn.style.display = 'none';
        }
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// SUGGESTED USERS & TRENDING
// ========================================
async function loadSuggestedUsers() {
    try {
        const usersSnapshot = await database.ref('users').limitToFirst(10).once('value');
        const postsSnapshot = await database.ref('posts').limitToLast(100).once('value');
        
        const userStats = {};
        
        // Calculate user activity
        postsSnapshot.forEach(postSnap => {
            const post = postSnap.val();
            if (post.userId !== currentUserId) {
                if (!userStats[post.userId]) {
                    userStats[post.userId] = {
                        userId: post.userId,
                        username: post.username,
                        avatarColor: post.avatarColor || 'default',
                        postCount: 0,
                        reactionCount: 0
                    };
                }
                userStats[post.userId].postCount++;
                userStats[post.userId].reactionCount += post.reactions ? Object.keys(post.reactions).length : 0;
            }
        });
        
        // Sort by most active
        const topUsers = Object.values(userStats)
            .sort((a, b) => (b.postCount + b.reactionCount) - (a.postCount + a.reactionCount))
            .slice(0, 5);
        
        const suggestionsList = document.querySelector('.suggestions-list');
        suggestionsList.innerHTML = '';
        
        topUsers.forEach(user => {
            const avatarGradient = AVATAR_COLORS[user.avatarColor] || AVATAR_COLORS.default;
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.onclick = () => viewProfile(user.userId);
            li.innerHTML = `
                <div class="suggestion-avatar" style="background: ${avatarGradient}">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <div class="suggestion-info">
                    <div class="suggestion-name">${user.username}</div>
                    <div class="suggestion-meta">${user.postCount} posts · ${user.reactionCount} reactions</div>
                </div>
            `;
            suggestionsList.appendChild(li);
        });
        
        // Add default if no users found
        if (topUsers.length === 0) {
            suggestionsList.innerHTML = `
                <li class="suggestion-item">
                    <div class="suggestion-avatar">S</div>
                    <div class="suggestion-info">
                        <div class="suggestion-name">SnapCircle</div>
                        <div class="suggestion-meta">Official Account</div>
                    </div>
                </li>
            `;
        }
    } catch (error) {
        console.error('Error loading suggested users:', error);
    }
}

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
