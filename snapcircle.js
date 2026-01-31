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
    console.log('Firebase initialized successfully (using base64 for media)');
} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('Firebase not configured. Please add your Firebase config to the JavaScript file.');
}

// ========================================
// LOCAL STORAGE KEYS
// ========================================
const STORAGE_KEYS = {
    USERNAME: 'snapcircle_username',
    USER_ID: 'snapcircle_user_id'
};

// ========================================
// USER MANAGEMENT
// ========================================
// Note: Username can change, but userId stays the same - this keeps the same person's likes/posts consistent
let currentUsername = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'User' + Math.floor(Math.random() * 10000);
let currentUserId = localStorage.getItem(STORAGE_KEYS.USER_ID) || generateUserId();

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
    updateUsernameDisplay();
    setupFileUpload();
    if (isFirebaseInitialized) {
        loadPosts();
    }
});

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateUsernameDisplay() {
    document.getElementById('currentUsername').textContent = currentUsername;
    const initial = currentUsername.charAt(0).toUpperCase();
    document.getElementById('headerAvatar').textContent = initial;
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
// IMAGE COMPRESSION TO BASE64
// ========================================
async function compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // SMALLER max dimensions for better compression
                    const maxWidth = 800;
                    const maxHeight = 800;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = height * (maxWidth / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = width * (maxHeight / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    
                    // Draw the image
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to compressed base64 with LOWER quality (0.5 instead of 0.7)
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                    
                    console.log('Image compressed successfully, size:', compressedDataUrl.length);
                    resolve(compressedDataUrl);
                } catch (error) {
                    console.error('Canvas error:', error);
                    reject(error);
                }
            };
            
            img.onerror = function(error) {
                console.error('Image load error:', error);
                reject(error);
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function(error) {
            console.error('FileReader error:', error);
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
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
            // For videos, convert directly to base64 (with size limit)
            if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit for videos
                alert('Video is too large. Maximum size is 5MB.');
                postBtn.textContent = 'Share Post';
                postBtn.disabled = false;
                return;
            }
            
            postBtn.textContent = 'Converting video...';
            mediaData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log('Video converted, data URL length:', e.target.result.length);
                    resolve(e.target.result);
                };
                reader.readAsDataURL(selectedFile);
            });
        } else {
            // Check file size first
            if (selectedFile.size > 2 * 1024 * 1024) { // 2MB limit for images
                alert('Image is too large. Maximum size is 2MB. Please use a smaller image.');
                postBtn.textContent = 'Share Post';
                postBtn.disabled = false;
                return;
            }
            
            // SKIP COMPRESSION - just convert directly
            postBtn.textContent = 'Converting image...';
            console.log('Converting image directly to base64 (no compression)...');
            mediaData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target.result;
                    console.log('✅ Image converted successfully!');
                    console.log('Data URL starts with:', result.substring(0, 50));
                    console.log('Data URL length:', result.length);
                    console.log('First 100 chars after base64:', result.substring(result.indexOf(',') + 1, result.indexOf(',') + 100));
                    resolve(result);
                };
                reader.onerror = (e) => {
                    console.error('❌ FileReader error:', e);
                    reject(e);
                };
                reader.readAsDataURL(selectedFile);
            });
        }

        // Create post object
        postBtn.textContent = 'Saving...';
        const timestamp = Date.now();
        
        // Remove any line breaks from mediaData to prevent HTML errors
        const cleanMediaData = mediaData.replace(/[\r\n]/g, '');
        
        console.log('Saving to Firebase with mediaData length:', cleanMediaData.length);
        
        const post = {
            id: 'post_' + timestamp,
            username: currentUsername,
            userId: currentUserId,
            caption: caption,
            mediaUrl: cleanMediaData,  // base64 string without line breaks
            mediaType: isVideo ? 'video' : 'image',
            reactions: {},
            comments: [],
            timestamp: timestamp
        };

        // Save to Firebase Database
        await database.ref('posts/' + post.id).set(post);

        console.log('✅ Post saved successfully!');

        // Reset form
        selectedFile = null;
        document.getElementById('fileInput').value = '';
        document.getElementById('captionInput').value = '';
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('previewContainer').innerHTML = '';

        postBtn.textContent = 'Share Post';
        postBtn.disabled = false;

    } catch (error) {
        console.error('❌ Error creating post:', error);
        alert('Error creating post: ' + error.message);
        postBtn.textContent = 'Share Post';
        postBtn.disabled = false;
    }
}

// ========================================
// LOAD POSTS FROM FIREBASE
// ========================================
function loadPosts() {
    const postsRef = database.ref('posts');
    
    postsRef.on('value', (snapshot) => {
        const postsData = snapshot.val();
        const posts = postsData ? Object.values(postsData).sort((a, b) => b.timestamp - a.timestamp) : [];
        displayPosts(posts);
    });
}

function displayPosts(posts) {
    const feed = document.getElementById('feed');
    
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

    feed.innerHTML = posts.map(post => createPostHTML(post)).join('');
}

// ========================================
// POST HTML GENERATION
// ========================================
function createPostHTML(post) {
    const timeAgo = getTimeAgo(post.timestamp);
    const userInitial = post.username.charAt(0).toUpperCase();
    
    console.log('Creating post HTML for:', post.id);
    console.log('Media type:', post.mediaType);
    console.log('Media URL length:', post.mediaUrl ? post.mediaUrl.length : 'null');
    console.log('Media URL starts with:', post.mediaUrl ? post.mediaUrl.substring(0, 50) : 'null');
    
    // Clean mediaUrl to remove any line breaks that might cause errors
    const cleanMediaUrl = post.mediaUrl ? post.mediaUrl.replace(/[\r\n]/g, '') : '';
    
    const mediaElement = post.mediaType === 'video' 
        ? `<video class="post-media" src="${cleanMediaUrl}" controls></video>`
        : `<img class="post-media" src="${cleanMediaUrl}" alt="Post" 
            onload="console.log('✅ Image loaded successfully for post ${post.id}')" 
            onerror="console.error('❌ Image FAILED to load for post ${post.id}. Check if base64 data is valid.')">`;
    
    // Count reactions
    const reactions = post.reactions || {};
    const reactionCounts = {};
    let totalReactions = 0;
    let userReaction = null;

    Object.entries(reactions).forEach(([userId, reactionType]) => {
        reactionCounts[reactionType] = (reactionCounts[reactionType] || 0) + 1;
        totalReactions++;
        if (userId === currentUserId) {
            userReaction = reactionType;
        }
    });

    // Build reactions bar
    const reactionsBar = Object.entries(REACTIONS).map(([key, reaction]) => {
        const count = reactionCounts[reaction.name] || 0;
        const isActive = userReaction === reaction.name;
        return `
            <button 
                class="reaction-btn ${isActive ? 'active' : ''}" 
                onclick="toggleReaction('${post.id}', '${reaction.name}')"
                title="${reaction.name}"
            >
                ${reaction.emoji}
                ${count > 0 ? `<span class="reaction-count">${count}</span>` : ''}
            </button>
        `;
    }).join('');

    // Reactions summary
    const reactionsSummary = totalReactions > 0 ? `
        <div class="reactions-summary">
            ${Object.entries(reactionCounts).map(([type, count]) => 
                REACTIONS[type.toUpperCase()]?.emoji || ''
            ).join(' ')}
            ${totalReactions} ${totalReactions === 1 ? 'reaction' : 'reactions'}
        </div>
    ` : '';

    return `
        <div class="post">
            <div class="post-header">
                <div class="post-user" onclick="viewProfile('${post.userId}')">
                    <div class="post-avatar">${userInitial}</div>
                    <div>
                        <div class="post-username">${post.username}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                </div>
                <div class="share-menu">
                    <div class="post-options" onclick="toggleShareMenu('${post.id}')">⋯</div>
                    <div class="share-dropdown" id="share-${post.id}">
                        <div class="share-option" onclick="sharePost('${post.id}')">
                            🔗 Copy Link
                        </div>
                        <div class="share-option" onclick="shareProfile('${post.userId}')">
                            👤 Share Profile
                        </div>
                        <div class="share-option" onclick="reportPost('${post.id}')">
                            🚩 Report
                        </div>
                        ${post.userId === currentUserId ? `
                        <div class="share-option delete-option" onclick="deletePost('${post.id}')">
                            🗑️ Delete Post
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            ${mediaElement}
            <div class="post-actions">
                <div class="reactions-bar">
                    ${reactionsBar}
                </div>
                ${reactionsSummary}
                ${post.caption ? `
                    <div class="post-caption">
                        <span class="username" onclick="viewProfile('${post.userId}')">${post.username}</span>${post.caption}
                    </div>
                ` : ''}
                <div class="comments-section">
                    ${(post.comments || []).map(comment => `
                        <div class="comment">
                            <span class="username" onclick="viewProfile('${comment.userId}')">${comment.username}</span>${comment.text}
                        </div>
                    `).join('')}
                </div>
                <div class="add-comment">
                    <input 
                        type="text" 
                        class="comment-input" 
                        placeholder="Write a comment..."
                        id="comment-${post.id}"
                        onkeypress="handleCommentKeypress(event, '${post.id}')"
                    >
                    <button 
                        class="comment-btn" 
                        onclick="addComment('${post.id}')"
                    >Post</button>
                </div>
            </div>
        </div>
    `;
}

// ========================================
// REACTIONS
// ========================================
async function toggleReaction(postId, reactionType) {
    if (!isFirebaseInitialized) return;

    const reactionRef = database.ref(`posts/${postId}/reactions/${currentUserId}`);
    
    try {
        const snapshot = await reactionRef.once('value');
        const currentReaction = snapshot.val();

        if (currentReaction === reactionType) {
            // Remove reaction
            await reactionRef.remove();
        } else {
            // Add or change reaction
            await reactionRef.set(reactionType);
        }
    } catch (error) {
        console.error('Error toggling reaction:', error);
    }
}

// ========================================
// COMMENTS
// ========================================
function handleCommentKeypress(event, postId) {
    if (event.key === 'Enter') {
        addComment(postId);
    }
}

async function addComment(postId) {
    if (!isFirebaseInitialized) return;

    const commentInput = document.getElementById(`comment-${postId}`);
    const commentText = commentInput.value.trim();

    if (!commentText) return;

    try {
        const comment = {
            id: 'comment_' + Date.now(),
            username: currentUsername,
            userId: currentUserId,
            text: commentText,
            timestamp: Date.now()
        };

        const commentsRef = database.ref(`posts/${postId}/comments`);
        const snapshot = await commentsRef.once('value');
        const comments = snapshot.val() || [];
        comments.push(comment);

        await commentsRef.set(comments);
        commentInput.value = '';
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// ========================================
// SHARING
// ========================================
function toggleShareMenu(postId) {
    const dropdown = document.getElementById(`share-${postId}`);
    const allDropdowns = document.querySelectorAll('.share-dropdown');
    
    allDropdowns.forEach(dd => {
        if (dd.id !== `share-${postId}`) {
            dd.classList.remove('active');
        }
    });
    
    dropdown.classList.toggle('active');
}

function sharePost(postId) {
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    copyToClipboard(url);
    toggleShareMenu(postId);
}

function shareProfile(userId) {
    const url = `${window.location.origin}${window.location.pathname}?profile=${userId}`;
    copyToClipboard(url);
    
    // Close all share menus
    document.querySelectorAll('.share-dropdown').forEach(dd => dd.classList.remove('active'));
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Link copied!');
    }).catch(() => {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Link copied!');
    });
}

function showNotification(message) {
    const notification = document.getElementById('copyNotification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Close share menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.share-menu')) {
        document.querySelectorAll('.share-dropdown').forEach(dd => {
            dd.classList.remove('active');
        });
    }
});

// ========================================
// PROFILE VIEWING
// ========================================
async function viewProfile(userId) {
    if (!isFirebaseInitialized) return;

    try {
        const postsRef = database.ref('posts');
        const snapshot = await postsRef.once('value');
        const allPosts = snapshot.val();
        
        if (!allPosts) {
            alert('No posts found');
            return;
        }

        const userPosts = Object.values(allPosts).filter(post => post.userId === userId);
        
        if (userPosts.length === 0) {
            alert('This user has no posts yet');
            return;
        }

        const username = userPosts[0].username;
        const userInitial = username.charAt(0).toUpperCase();
        
        // Count total reactions on user's posts
        let totalReactions = 0;
        userPosts.forEach(post => {
            if (post.reactions) {
                totalReactions += Object.keys(post.reactions).length;
            }
        });

        // Update profile modal
        document.getElementById('profileAvatar').textContent = userInitial;
        document.getElementById('profileUsername').textContent = username;
        document.getElementById('profilePostCount').textContent = userPosts.length;
        document.getElementById('profileReactionCount').textContent = totalReactions;

        // Display user's posts
        const profilePostsContainer = document.getElementById('profilePosts');
        profilePostsContainer.innerHTML = userPosts.sort((a, b) => b.timestamp - a.timestamp).map(post => {
            const mediaElement = post.mediaType === 'video'
                ? `<video src="${post.mediaUrl}"></video>`
                : `<img src="${post.mediaUrl}" alt="Post">`;
            return `
                <div class="profile-post-thumb">
                    ${mediaElement}
                </div>
            `;
        }).join('');

        // Show modal
        document.getElementById('profileModal').classList.add('active');
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile');
    }
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

// ========================================
// USERNAME MANAGEMENT
// ========================================
function openUsernameModal() {
    const modal = document.getElementById('usernameModal');
    const input = document.getElementById('usernameInput');
    input.value = currentUsername;
    modal.classList.add('active');
    input.focus();
}

function closeUsernameModal() {
    const modal = document.getElementById('usernameModal');
    modal.classList.remove('active');
}

async function saveUsername() {
    const input = document.getElementById('usernameInput');
    const newUsername = input.value.trim();

    if (!newUsername) {
        alert('Username cannot be empty');
        return;
    }

    if (newUsername.length > 30) {
        alert('Username is too long (max 30 characters)');
        return;
    }

    currentUsername = newUsername;
    localStorage.setItem(STORAGE_KEYS.USERNAME, currentUsername);
    updateUsernameDisplay();
    closeUsernameModal();

    // Update username in existing posts
    if (isFirebaseInitialized) {
        try {
            const postsRef = database.ref('posts');
            const snapshot = await postsRef.once('value');
            const posts = snapshot.val();
            
            if (posts) {
                const updates = {};
                Object.entries(posts).forEach(([postId, post]) => {
                    if (post.userId === currentUserId) {
                        updates[`posts/${postId}/username`] = newUsername;
                    }
                });
                
                if (Object.keys(updates).length > 0) {
                    await database.ref().update(updates);
                }
            }
        } catch (error) {
            console.error('Error updating username in posts:', error);
        }
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const usernameModal = document.getElementById('usernameModal');
    const profileModal = document.getElementById('profileModal');
    
    if (event.target === usernameModal) {
        closeUsernameModal();
    }
    if (event.target === profileModal) {
        closeProfileModal();
    }
});

// ========================================
// UTILITY FUNCTIONS
// ========================================
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return `${weeks}w ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
}

// ========================================
// DELETE POST
// ========================================
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) {
        return;
    }
    
    try {
        await database.ref('posts/' + postId).remove();
        console.log('✅ Post deleted successfully!');
    } catch (error) {
        console.error('❌ Error deleting post:', error);
        alert('Error deleting post. Please try again.');
    }
}

// ========================================
// REPORT POST / CONTACT
// ========================================
function reportPost(postId) {
    const reason = prompt('Why are you reporting this post?\n\n(Spam, Inappropriate, Harassment, Other)');
    
    if (!reason) return;
    
    // Create report email
    const reportData = {
        postId: postId,
        reason: reason,
        reportedBy: currentUsername,
        timestamp: new Date().toISOString()
    };
    
    // Save report to Firebase
    database.ref('reports/' + Date.now()).set(reportData);
    
    // Send email notification
    sendContactEmail(
        'Post Report',
        `Post ID: ${postId}\nReason: ${reason}\nReported by: ${currentUsername}\nTime: ${new Date().toLocaleString()}`
    );
    
    alert('Thank you for your report. We will review it shortly.');
}

function openContactForm() {
    const message = prompt('Send us a message, question, or feedback:');
    
    if (!message) return;
    
    sendContactEmail(
        'User Feedback',
        `From: ${currentUsername}\nMessage: ${message}\nTime: ${new Date().toLocaleString()}`
    );
    
    alert('Message sent! We\'ll get back to you soon. 💙');
}

function sendContactEmail(subject, body) {
    // Using FormSubmit.co - a free form to email service
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://formsubmit.co/ayoubnware1QandA@gmail.com';
    form.style.display = 'none';
    
    const subjectInput = document.createElement('input');
    subjectInput.type = 'hidden';
    subjectInput.name = '_subject';
    subjectInput.value = `SnapCircle: ${subject}`;
    
    const bodyInput = document.createElement('input');
    bodyInput.type = 'hidden';
    bodyInput.name = 'message';
    bodyInput.value = body;
    
    const nextInput = document.createElement('input');
    nextInput.type = 'hidden';
    nextInput.name = '_next';
    nextInput.value = window.location.href;
    
    const captchaInput = document.createElement('input');
    captchaInput.type = 'hidden';
    captchaInput.name = '_captcha';
    captchaInput.value = 'false';
    
    form.appendChild(subjectInput);
    form.appendChild(bodyInput);
    form.appendChild(nextInput);
    form.appendChild(captchaInput);
    
    document.body.appendChild(form);
    form.submit();
}

// ========================================
// FUN FEATURES
// ========================================

// Double-tap to like
let lastTap = 0;
document.addEventListener('dblclick', function(e) {
    const postMedia = e.target.closest('.post-media');
    if (postMedia) {
        const post = postMedia.closest('.post');
        const postId = post.querySelector('.post-options').getAttribute('onclick').match(/'([^']+)'/)[1];
        
        // Find the like button and click it
        const likeBtn = post.querySelector('.reaction-btn[title="like"]');
        if (likeBtn && !likeBtn.classList.contains('active')) {
            likeBtn.click();
            
            // Show heart animation
            showHeartAnimation(postMedia);
        }
    }
});

function showHeartAnimation(element) {
    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 100px;
        pointer-events: none;
        z-index: 1000;
        animation: heartPop 0.8s ease-out;
    `;
    
    element.parentElement.style.position = 'relative';
    element.parentElement.appendChild(heart);
    
    setTimeout(() => heart.remove(), 800);
}

// Search functionality
function searchPosts(query) {
    const posts = document.querySelectorAll('.post');
    const lowerQuery = query.toLowerCase();
    
    posts.forEach(post => {
        const username = post.querySelector('.post-username').textContent.toLowerCase();
        const caption = post.querySelector('.post-caption')?.textContent.toLowerCase() || '';
        
        if (username.includes(lowerQuery) || caption.includes(lowerQuery)) {
            post.style.display = 'block';
        } else {
            post.style.display = 'none';
        }
    });
}

// Scroll to top button
window.addEventListener('scroll', function() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
        if (window.pageYOffset > 300) {
            scrollBtn.style.display = 'block';
        } else {
            scrollBtn.style.display = 'none';
        }
    }
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// EASTER EGG
// ========================================
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        activatePartyMode();
    }
});

function activatePartyMode() {
    alert('🎉 PARTY MODE ACTIVATED! 🎊');
    document.body.style.animation = 'rainbow 2s infinite';
    
    // Add rainbow animation
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
        alert('Party mode deactivated! 😊');
    }, 10000);
}

// Check for shared links on page load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    const profileId = urlParams.get('profile');
    
    if (postId) {
        // Scroll to specific post (could enhance this)
        setTimeout(() => {
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                postElement.scrollIntoView({ behavior: 'smooth' });
            }
        }, 1000);
    }
    
    if (profileId && isFirebaseInitialized) {
        setTimeout(() => viewProfile(profileId), 1000);
    }
});
