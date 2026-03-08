// ===========================================
// UNDERWINGS ADMIN DASHBOARD
// JavaScript Application
// ===========================================

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = window.SUPABASE_URL || 'http://localhost:8000';
const supabaseKey = window.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ===========================================
// UTILITIES
// ===========================================
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ===========================================
// FILE UPLOAD HELPER
// ===========================================

function setupDropzone({ dropzoneId, fileInputId, placeholderId, previewWrapId, previewImgId, removeBtnId, hiddenInputId, progressId, barId, bucket }) {
  const dropzone = document.getElementById(dropzoneId);
  const fileInput = document.getElementById(fileInputId);
  const placeholder = document.getElementById(placeholderId);
  const previewWrap = document.getElementById(previewWrapId);
  const previewImg = document.getElementById(previewImgId);
  const removeBtn = document.getElementById(removeBtnId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const progress = document.getElementById(progressId);
  const bar = document.getElementById(barId);

  if (!dropzone || !fileInput) return;

  // Click to open file picker
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('.upload-remove-btn')) return;
    fileInput.click();
  });

  // Drag and drop
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('dragover'); });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) uploadFile(file);
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
    fileInput.value = '';
  });

  // Remove button
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hiddenInput.value = '';
    previewWrap.style.display = 'none';
    placeholder.style.display = 'flex';
  });

  async function uploadFile(file) {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    placeholder.style.display = 'none';
    previewWrap.style.display = 'none';
    progress.style.display = 'block';
    bar.style.width = '30%';

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false });

      bar.style.width = '80%';

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      bar.style.width = '100%';
      setTimeout(() => { progress.style.display = 'none'; bar.style.width = '0%'; }, 500);

      hiddenInput.value = publicUrl;
      previewImg.src = publicUrl;
      previewWrap.style.display = 'inline-block';
    } catch (err) {
      console.error('Upload error:', err);
      progress.style.display = 'none';
      bar.style.width = '0%';
      placeholder.style.display = 'flex';
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    }
  }

  // Expose a method to set preview from existing URL
  return {
    setPreview(url) {
      if (url) {
        hiddenInput.value = url;
        previewImg.src = url;
        previewWrap.style.display = 'inline-block';
        placeholder.style.display = 'none';
      } else {
        hiddenInput.value = '';
        previewWrap.style.display = 'none';
        placeholder.style.display = 'flex';
      }
    },
    clear() {
      hiddenInput.value = '';
      previewWrap.style.display = 'none';
      placeholder.style.display = 'flex';
    }
  };
}

// ===========================================
// STATE
// ===========================================
let currentUser = null;
let currentPage = 'dashboard';

// ===========================================
// DOM ELEMENTS
// ===========================================
const loginScreen = document.getElementById('login-screen');
const mfaScreen = document.getElementById('mfa-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const settingsLogoutBtn = document.getElementById('settings-logout-btn');
const mfaForm = document.getElementById('mfa-form');
const mfaError = document.getElementById('mfa-error');
const setupMfaBtn = document.getElementById('setup-mfa-btn');
const disableMfaBtn = document.getElementById('disable-mfa-btn');

// ===========================================
// AUTHENTICATION
// ===========================================

let pendingMfaFactorId = null;

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    // Check if MFA verification is needed
    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data && aal.data.nextLevel === 'aal2' && aal.data.currentLevel === 'aal1') {
      showMfaVerify();
    } else {
      showDashboard();
      loadDashboardData();
    }
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.style.display = 'flex';
  mfaScreen.style.display = 'none';
  dashboard.style.display = 'none';
}

function showMfaVerify() {
  loginScreen.style.display = 'none';
  mfaScreen.style.display = 'flex';
  dashboard.style.display = 'none';
  document.getElementById('mfa-enroll').style.display = 'none';
  document.getElementById('mfa-instructions').textContent = 'Enter the 6-digit code from your authenticator app.';
  document.getElementById('mfa-code').value = '';
  document.getElementById('mfa-code').focus();
}

function showDashboard() {
  loginScreen.style.display = 'none';
  mfaScreen.style.display = 'none';
  dashboard.style.display = 'flex';
  updateUserUI();
  updateMfaStatus();
}

function updateUserUI() {
  if (!currentUser) return;
  const email = currentUser.email || 'Admin';
  const name = email.split('@')[0];
  const initial = name.charAt(0).toUpperCase();

  // Sidebar user
  const avatarEl = document.getElementById('sidebar-avatar');
  const nameEl = document.getElementById('sidebar-username');
  if (avatarEl) avatarEl.textContent = initial;
  if (nameEl) nameEl.textContent = name;

  // Welcome heading
  const welcomeEl = document.getElementById('welcome-heading');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${name}`;

  // Settings email
  const settingsEmail = document.getElementById('settings-email');
  if (settingsEmail) settingsEmail.textContent = email;
}

async function updateMfaStatus() {
  const statusText = document.getElementById('mfa-status-text');
  const badge = document.getElementById('mfa-badge');
  const enableBtn = document.getElementById('setup-mfa-btn');
  const disableBtn = document.getElementById('disable-mfa-btn');

  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasMfa = factors?.totp?.length > 0;

    if (hasMfa) {
      statusText.textContent = 'Your account is protected with an authenticator app.';
      badge.textContent = 'Enabled';
      badge.className = 'status-badge published';
      badge.style.display = 'inline-block';
      enableBtn.style.display = 'none';
      disableBtn.style.display = 'inline-flex';
    } else {
      statusText.textContent = 'Add an extra layer of security to your account using an authenticator app.';
      badge.textContent = 'Disabled';
      badge.className = 'status-badge draft';
      badge.style.display = 'inline-block';
      enableBtn.style.display = 'inline-flex';
      disableBtn.style.display = 'none';
    }
  } catch {
    statusText.textContent = 'Unable to check 2FA status.';
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    currentUser = data.user;

    // Check if user has MFA enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];

    if (totpFactor) {
      // MFA is enrolled, need verification
      pendingMfaFactorId = totpFactor.id;
      showMfaVerify();
    } else {
      // No MFA enrolled, go to dashboard
      showDashboard();
      loadDashboardData();
    }

    loginError.textContent = '';
  } catch (error) {
    loginError.textContent = error.message || 'Login failed. Please try again.';
  }
});

// MFA verification
mfaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('mfa-code').value.trim();
  mfaError.textContent = '';

  try {
    if (pendingMfaFactorId) {
      // Verify existing factor
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: pendingMfaFactorId });
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: pendingMfaFactorId,
        challengeId: challenge.id,
        code
      });
      if (error) throw error;
      pendingMfaFactorId = null;
      showDashboard();
      loadDashboardData();
    } else if (window._mfaEnrollFactorId) {
      // Verify during enrollment
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: window._mfaEnrollFactorId });
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: window._mfaEnrollFactorId,
        challengeId: challenge.id,
        code
      });
      if (error) throw error;
      window._mfaEnrollFactorId = null;
      alert('Two-factor authentication enabled successfully!');
      showDashboard();
    }
  } catch (error) {
    mfaError.textContent = error.message || 'Invalid code. Please try again.';
  }
});

// Setup MFA button
setupMfaBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors?.totp?.length > 0) {
      alert('Two-factor authentication is already enabled.');
      return;
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Underwings Admin TOTP'
    });
    if (error) throw error;

    window._mfaEnrollFactorId = data.id;
    document.getElementById('mfa-qr').src = data.totp.qr_code;
    document.getElementById('mfa-enroll').style.display = 'block';
    document.getElementById('mfa-instructions').textContent = 'Scan the QR code, then enter the 6-digit code to verify.';
    mfaScreen.style.display = 'flex';
    dashboard.style.display = 'none';
    loginScreen.style.display = 'none';
    document.getElementById('mfa-code').value = '';
    document.getElementById('mfa-code').focus();
  } catch (error) {
    alert('Failed to set up 2FA: ' + (error.message || 'Unknown error'));
  }
});

async function doLogout(e) {
  e.preventDefault();
  await supabase.auth.signOut();
  currentUser = null;
  pendingMfaFactorId = null;
  showLogin();
}

logoutBtn.addEventListener('click', doLogout);
settingsLogoutBtn.addEventListener('click', doLogout);

// Disable MFA
disableMfaBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!confirm('Are you sure you want to disable two-factor authentication?')) return;
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];
    if (totpFactor) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      if (error) throw error;
      alert('Two-factor authentication has been disabled.');
      updateMfaStatus();
    }
  } catch (error) {
    alert('Failed to disable 2FA: ' + (error.message || 'Unknown error'));
  }
});

// ===========================================
// NAVIGATION
// ===========================================

document.querySelectorAll('[data-page]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = e.currentTarget.dataset.page;
    navigateTo(page);
  });
});

function navigateTo(page) {
  currentPage = page;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Show page
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });

  // Load page data
  switch (page) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'posts':
      loadPosts();
      break;
    case 'partners':
      loadPartners();
      break;
    case 'media':
      loadMedia();
      break;
    case 'careers':
      loadCareers();
      break;
    case 'clients':
      loadClients();
      break;
  }
}

// ===========================================
// DASHBOARD DATA
// ===========================================

async function loadDashboardData() {
  try {
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('id, title, category, status, view_count, created_at')
      .order('created_at', { ascending: false });

    const allPosts = posts || [];
    const published = allPosts.filter(p => p.status === 'published');
    const drafts = allPosts.filter(p => p.status === 'draft');
    const totalViews = allPosts.reduce((sum, p) => sum + (p.view_count || 0), 0);

    // Update stats
    document.getElementById('stat-total').textContent = allPosts.length;
    document.getElementById('stat-published').textContent = published.length;
    document.getElementById('stat-drafts').textContent = drafts.length;
    document.getElementById('stat-views').textContent = totalViews;

    // Render recent posts
    renderRecentPosts(allPosts.slice(0, 5));
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function renderRecentPosts(posts) {
  const container = document.getElementById('recent-posts');
  if (posts.length === 0) {
    container.innerHTML = '<p class="empty-state">No posts yet. Create your first post!</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="list-item" onclick="editPost('${esc(post.id)}')">
      <div class="list-item-info">
        <div class="list-item-title">${esc(post.title)}</div>
        <div class="list-item-meta">${esc(post.category) || 'Uncategorized'} • ${formatDate(post.created_at)} • ${post.view_count || 0} views</div>
      </div>
      <span class="status-badge ${esc(post.status)}">${esc(post.status)}</span>
    </div>
  `).join('');
}

// ===========================================
// BLOG POSTS
// ===========================================

async function loadPosts() {
  try {
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderPostsTable(posts || []);
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

function renderPostsTable(posts) {
  const tbody = document.getElementById('posts-table');
  if (posts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No posts yet. Create your first post!</td></tr>';
    return;
  }

  tbody.innerHTML = posts.map(post => `
    <tr>
      <td><strong>${esc(post.title)}</strong></td>
      <td>${esc(post.category) || '-'}</td>
      <td><span class="status-badge ${esc(post.status)}">${esc(post.status)}</span></td>
      <td>${post.view_count || 0}</td>
      <td>${formatDate(post.created_at)}</td>
      <td class="actions">
        <button class="btn-icon" onclick="editPost('${esc(post.id)}')" title="Edit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon danger" onclick="deletePost('${esc(post.id)}')" title="Delete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// Post Editor Modal
const postModal = document.getElementById('post-editor-modal');
const postForm = document.getElementById('post-form');
const newPostBtn = document.getElementById('new-post-btn');

// Setup blog featured image dropzone
const postImageDropzone = setupDropzone({
  dropzoneId: 'post-image-dropzone',
  fileInputId: 'post-image-file',
  placeholderId: 'post-image-placeholder',
  previewWrapId: 'post-image-preview-wrap',
  previewImgId: 'post-image-preview',
  removeBtnId: 'post-image-remove',
  hiddenInputId: 'post-image',
  progressId: 'post-image-progress',
  barId: 'post-image-bar',
  bucket: 'blog-images',
});

newPostBtn.addEventListener('click', () => {
  document.getElementById('editor-title').textContent = 'New Post';
  postForm.reset();
  document.getElementById('post-id').value = '';
  document.getElementById('post-slug').dataset.autoGenerate = 'true';
  if (postImageDropzone) postImageDropzone.clear();
  postModal.classList.add('active');
});

window.editPost = async function(id) {
  try {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    document.getElementById('editor-title').textContent = 'Edit Post';
    document.getElementById('post-id').value = post.id;
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-slug').value = post.slug;
    document.getElementById('post-slug').dataset.autoGenerate = 'false';
    document.getElementById('post-excerpt').value = post.excerpt || '';
    document.getElementById('post-content').value = post.content || '';
    document.getElementById('post-category').value = post.category || '';
    document.getElementById('post-status').value = post.status;

    // Show featured image preview
    if (postImageDropzone) postImageDropzone.setPreview(post.featured_image || '');

    postModal.classList.add('active');
  } catch (error) {
    console.error('Error loading post:', error);
    alert('Failed to load post');
  }
};

window.deletePost = async function(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    loadPosts();
    loadDashboardData();
  } catch (error) {
    console.error('Error deleting post:', error);
    alert('Failed to delete post');
  }
};

postForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('post-id').value;
  const title = document.getElementById('post-title').value;
  const slug = document.getElementById('post-slug').value || generateSlug(title);
  const excerpt = document.getElementById('post-excerpt').value;
  const content = document.getElementById('post-content').value;
  const category = document.getElementById('post-category').value;
  const status = document.getElementById('post-status').value;
  const featured_image = document.getElementById('post-image').value;

  const postData = {
    title,
    slug,
    excerpt,
    content,
    category,
    status,
    featured_image,
    author_name: currentUser?.email || 'Admin',
    published_at: status === 'published' ? new Date().toISOString() : null
  };

  try {
    if (id) {
      const { error } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('blog_posts')
        .insert([postData]);
      if (error) throw error;
    }

    postModal.classList.remove('active');
    loadPosts();
    loadDashboardData();
  } catch (error) {
    console.error('Error saving post:', error);
    alert('Failed to save post: ' + error.message);
  }
});

// ===========================================
// PARTNERS MANAGEMENT
// ===========================================

async function loadPartners() {
  try {
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    renderPartnersTable(partners || []);
  } catch (error) {
    console.error('Error loading partners:', error);
  }
}

function renderPartnersTable(partners) {
  const tbody = document.getElementById('partners-table');
  if (!tbody) return;

  if (partners.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No partners yet. Add your first partner!</td></tr>';
    return;
  }

  tbody.innerHTML = partners.map(p => `
    <tr>
      <td>
        <div style="background: #1a1a1a; padding: 0.5rem; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; min-width: 80px; height: 40px;">
          <img src="${esc(p.logo_url)}" alt="${esc(p.name)}" style="max-height: 28px; max-width: 80px; ${p.invert_logo ? 'filter: brightness(0) invert(1);' : ''}">
        </div>
      </td>
      <td><strong>${esc(p.name)}</strong></td>
      <td>${p.display_order}</td>
      <td>
        <span class="status-badge ${p.is_visible ? 'published' : 'draft'}" style="cursor: pointer;" onclick="togglePartnerVisibility('${p.id}', ${!p.is_visible})">
          ${p.is_visible ? 'Visible' : 'Hidden'}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon" onclick="editPartner('${esc(p.id)}')" title="Edit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon danger" onclick="deletePartner('${esc(p.id)}', '${esc(p.name)}')" title="Delete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// Partner Editor Modal
const partnerModal = document.getElementById('partner-editor-modal');
const partnerForm = document.getElementById('partner-form');
const newPartnerBtn = document.getElementById('new-partner-btn');

// Setup partner logo dropzone
const partnerLogoDropzone = setupDropzone({
  dropzoneId: 'partner-logo-dropzone',
  fileInputId: 'partner-logo-file',
  placeholderId: 'partner-logo-placeholder',
  previewWrapId: 'partner-logo-preview-wrap',
  previewImgId: 'partner-logo-preview',
  removeBtnId: 'partner-logo-remove',
  hiddenInputId: 'partner-logo-url',
  progressId: 'partner-logo-progress',
  barId: 'partner-logo-bar',
  bucket: 'partner-logos',
});

if (newPartnerBtn) {
  newPartnerBtn.addEventListener('click', () => {
    document.getElementById('partner-editor-title').textContent = 'Add Partner';
    partnerForm.reset();
    document.getElementById('partner-id').value = '';
    document.getElementById('partner-order').value = '0';
    document.getElementById('partner-visible').value = 'true';
    document.getElementById('partner-invert').value = 'false';
    if (partnerLogoDropzone) partnerLogoDropzone.clear();
    partnerModal.classList.add('active');
  });
}

window.editPartner = async function(id) {
  try {
    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    document.getElementById('partner-editor-title').textContent = 'Edit Partner';
    document.getElementById('partner-id').value = partner.id;
    document.getElementById('partner-name').value = partner.name;
    document.getElementById('partner-website').value = partner.website_url || '';
    document.getElementById('partner-order').value = partner.display_order;
    document.getElementById('partner-visible').value = String(partner.is_visible);
    document.getElementById('partner-invert').value = String(partner.invert_logo);

    // Show logo preview
    if (partnerLogoDropzone) partnerLogoDropzone.setPreview(partner.logo_url);

    partnerModal.classList.add('active');
  } catch (error) {
    console.error('Error loading partner:', error);
    alert('Failed to load partner');
  }
};

window.deletePartner = async function(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

  try {
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    loadPartners();
  } catch (error) {
    console.error('Error deleting partner:', error);
    alert('Failed to delete partner');
  }
};

window.togglePartnerVisibility = async function(id, visible) {
  try {
    const { error } = await supabase
      .from('partners')
      .update({ is_visible: visible })
      .eq('id', id);

    if (error) throw error;
    loadPartners();
  } catch (error) {
    console.error('Error toggling partner:', error);
    alert('Failed to update partner visibility');
  }
};

if (partnerForm) {
  partnerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('partner-id').value;
    const partnerData = {
      name: document.getElementById('partner-name').value,
      logo_url: document.getElementById('partner-logo-url').value,
      website_url: document.getElementById('partner-website').value || null,
      display_order: parseInt(document.getElementById('partner-order').value) || 0,
      is_visible: document.getElementById('partner-visible').value === 'true',
      invert_logo: document.getElementById('partner-invert').value === 'true',
    };

    try {
      if (id) {
        const { error } = await supabase.from('partners').update(partnerData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partners').insert([partnerData]);
        if (error) throw error;
      }

      partnerModal.classList.remove('active');
      loadPartners();
    } catch (error) {
      console.error('Error saving partner:', error);
      alert('Failed to save partner: ' + error.message);
    }
  });
}

// ===========================================
// CAREERS MANAGEMENT
// ===========================================

async function loadCareers() {
  try {
    const { data: careers, error } = await supabase
      .from('career_openings')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    renderCareersTable(careers || []);
  } catch (error) {
    console.error('Error loading careers:', error);
  }
}

function renderCareersTable(careers) {
  const tbody = document.getElementById('careers-table');
  if (!tbody) return;

  if (careers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No career openings yet.</td></tr>';
    return;
  }

  const statusLabels = { active: 'Now Hiring', future: 'Future', closed: 'Closed' };
  const statusClasses = { active: 'published', future: 'draft', closed: 'draft' };

  tbody.innerHTML = careers.map(c => `
    <tr>
      <td><strong>${esc(c.title)}</strong></td>
      <td>${esc(c.location)}</td>
      <td>
        <span class="status-badge ${statusClasses[c.status] || 'draft'}" style="cursor:pointer;" onclick="toggleCareerStatus('${c.id}', '${c.status}')">
          ${statusLabels[c.status] || c.status}
        </span>
      </td>
      <td>${c.display_order}</td>
      <td class="actions">
        <button class="btn-icon" onclick="editCareer('${esc(c.id)}')" title="Edit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon danger" onclick="deleteCareer('${esc(c.id)}', '${esc(c.title)}')" title="Delete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// Career Editor Modal
const careerModal = document.getElementById('career-editor-modal');
const careerForm = document.getElementById('career-form');
const newCareerBtn = document.getElementById('new-career-btn');

if (newCareerBtn) {
  newCareerBtn.addEventListener('click', () => {
    document.getElementById('career-editor-title').textContent = 'Add Opening';
    careerForm.reset();
    document.getElementById('career-id').value = '';
    document.getElementById('career-order').value = '0';
    document.getElementById('career-status').value = 'future';
    careerModal.classList.add('active');
  });
}

window.editCareer = async function(id) {
  try {
    const { data: career, error } = await supabase
      .from('career_openings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    document.getElementById('career-editor-title').textContent = 'Edit Opening';
    document.getElementById('career-id').value = career.id;
    document.getElementById('career-title').value = career.title;
    document.getElementById('career-location').value = career.location;
    document.getElementById('career-status').value = career.status;
    document.getElementById('career-description').value = career.description || '';
    document.getElementById('career-requirements').value = (career.requirements || []).join('\n');
    document.getElementById('career-order').value = career.display_order;
    careerModal.classList.add('active');
  } catch (error) {
    console.error('Error loading career:', error);
    alert('Failed to load career opening');
  }
};

window.deleteCareer = async function(id, title) {
  if (!confirm(`Delete "${title}"?`)) return;
  try {
    const { error } = await supabase.from('career_openings').delete().eq('id', id);
    if (error) throw error;
    loadCareers();
  } catch (error) {
    console.error('Error deleting career:', error);
    alert('Failed to delete career opening');
  }
};

window.toggleCareerStatus = async function(id, currentStatus) {
  const cycle = { future: 'active', active: 'closed', closed: 'future' };
  const newStatus = cycle[currentStatus] || 'future';
  try {
    const { error } = await supabase.from('career_openings').update({ status: newStatus }).eq('id', id);
    if (error) throw error;
    loadCareers();
  } catch (error) {
    console.error('Error updating career status:', error);
  }
};

if (careerForm) {
  careerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('career-id').value;
    const reqText = document.getElementById('career-requirements').value.trim();
    const requirements = reqText ? reqText.split('\n').map(r => r.trim()).filter(Boolean) : [];

    const careerData = {
      title: document.getElementById('career-title').value,
      location: document.getElementById('career-location').value,
      status: document.getElementById('career-status').value,
      description: document.getElementById('career-description').value,
      requirements,
      display_order: parseInt(document.getElementById('career-order').value) || 0,
    };

    try {
      if (id) {
        const { error } = await supabase.from('career_openings').update(careerData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('career_openings').insert([careerData]);
        if (error) throw error;
      }
      careerModal.classList.remove('active');
      loadCareers();
    } catch (error) {
      console.error('Error saving career:', error);
      alert('Failed to save: ' + error.message);
    }
  });
}

// ===========================================
// CLIENT PROJECTS MANAGEMENT
// ===========================================

// Client users cache
let clientUsers = [];

async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

async function loadClientUsers() {
  try {
    const token = await getAuthToken();
    const res = await fetch('/api/admin/clients', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.users) {
      clientUsers = data.users;
      renderClientUsersList(clientUsers);
      populateClientDropdown(clientUsers);
      const countEl = document.getElementById('client-count');
      if (countEl) countEl.textContent = `${clientUsers.length} client${clientUsers.length !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Error loading client users:', error);
  }
}

function renderClientUsersList(users) {
  const container = document.getElementById('client-users-list');
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = '<p class="empty-state">No client accounts yet. Click "New Client" to create one.</p>';
    return;
  }

  container.innerHTML = users.map(u => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${esc(u.email)}</div>
        <div class="list-item-meta">ID: ${u.id.substring(0, 8)}... • Joined ${formatDate(u.created_at)}${u.last_sign_in_at ? ' • Last login ' + formatDate(u.last_sign_in_at) : ' • Never logged in'}</div>
      </div>
      <button class="btn-icon danger" onclick="deleteClientUser('${u.id}', '${esc(u.email)}')" title="Delete client">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');
}

function populateClientDropdown(users) {
  const select = document.getElementById('project-client-id');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">— Select Client —</option>' +
    users.map(u => `<option value="${u.id}">${esc(u.email)}</option>`).join('');
  if (currentVal) select.value = currentVal;
}

// Client creation modal
const clientModal = document.getElementById('client-user-modal');
const clientForm = document.getElementById('client-user-form');
const newClientBtn = document.getElementById('new-client-btn');
const genPwBtn = document.getElementById('generate-password-btn');

if (newClientBtn) {
  newClientBtn.addEventListener('click', () => {
    clientForm.reset();
    clientModal.classList.add('active');
  });
}

if (genPwBtn) {
  genPwBtn.addEventListener('click', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    document.getElementById('client-password').value = pw;
  });
}

if (clientForm) {
  clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('client-name').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const password = document.getElementById('client-password').value;

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client');

      alert(`Client created successfully!\n\nEmail: ${email}\nPassword: ${password}\n\nShare these credentials with the client.`);
      clientModal.classList.remove('active');
      loadClientUsers();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
}

window.deleteClientUser = async function(userId, email) {
  if (!confirm(`Delete client "${email}"?\n\nThis will remove their account. Their projects will remain but become unassigned.`)) return;
  try {
    const token = await getAuthToken();
    const res = await fetch('/api/admin/clients', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete client');
    loadClientUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

async function loadClients() {
  loadClientUsers();
  try {
    const { data: projects, error } = await supabase
      .from('client_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderClientsTable(projects || []);
  } catch (error) {
    console.error('Error loading client projects:', error);
  }
}

function renderClientsTable(projects) {
  const tbody = document.getElementById('clients-table');
  if (!tbody) return;

  if (projects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No client projects yet. Add your first project!</td></tr>';
    return;
  }

  const statusLabels = { scoping: 'Scoping', in_progress: 'In Progress', review: 'Review', completed: 'Completed', retesting: 'Retesting' };
  const statusClasses = { scoping: 'draft', in_progress: 'published', review: 'draft', completed: 'published', retesting: 'draft' };
  const typeLabels = { vapt: 'VAPT', 'iso-27001': 'ISO 27001', training: 'Training', consultation: 'Consultation' };

  tbody.innerHTML = projects.map(p => {
    const totalFindings = (p.findings_critical || 0) + (p.findings_high || 0) + (p.findings_medium || 0) + (p.findings_low || 0) + (p.findings_info || 0);
    const clientUser = clientUsers.find(u => u.id === p.client_id);
    const clientLabel = clientUser ? clientUser.email : (p.client_id ? p.client_id.substring(0, 8) + '...' : 'Unassigned');
    return `
      <tr>
        <td><strong>${esc(p.project_name)}</strong></td>
        <td><code style="font-size:0.75rem;background:var(--bg-secondary);padding:0.15rem 0.4rem;border-radius:4px;">${esc(clientLabel)}</code></td>
        <td>${typeLabels[p.project_type] || p.project_type}</td>
        <td><span class="status-badge ${statusClasses[p.status] || 'draft'}">${statusLabels[p.status] || p.status}</span></td>
        <td>
          ${p.findings_critical ? `<span style="color:#ff4444;font-weight:600;">${p.findings_critical}C</span> ` : ''}${p.findings_high ? `<span style="color:#ff8800;font-weight:600;">${p.findings_high}H</span> ` : ''}${p.findings_medium ? `<span style="color:#ffbb00;">${p.findings_medium}M</span> ` : ''}${p.findings_low ? `<span style="color:#44aaff;">${p.findings_low}L</span> ` : ''}${totalFindings === 0 ? '—' : ''}
        </td>
        <td class="actions">
          <button class="btn-icon" onclick="editProject('${esc(p.id)}')" title="Edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon danger" onclick="deleteProject('${esc(p.id)}', '${esc(p.project_name)}')" title="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Project Editor Modal
const projectModal = document.getElementById('project-editor-modal');
const projectForm = document.getElementById('project-form');
const newProjectBtn = document.getElementById('new-project-btn');

if (newProjectBtn) {
  newProjectBtn.addEventListener('click', () => {
    document.getElementById('project-editor-title').textContent = 'Add Project';
    projectForm.reset();
    document.getElementById('project-id').value = '';
    document.getElementById('project-status').value = 'scoping';
    document.getElementById('project-remediation').value = '0';
    ['f-critical', 'f-high', 'f-medium', 'f-low', 'f-info'].forEach(id => {
      document.getElementById(id).value = '0';
    });
    projectModal.classList.add('active');
  });
}

window.editProject = async function(id) {
  try {
    const { data: project, error } = await supabase
      .from('client_projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    document.getElementById('project-editor-title').textContent = 'Edit Project';
    document.getElementById('project-id').value = project.id;
    document.getElementById('project-name').value = project.project_name;
    document.getElementById('project-type').value = project.project_type;
    document.getElementById('project-status').value = project.status;
    document.getElementById('project-client-id').value = project.client_id || '';
    document.getElementById('project-start-date').value = project.start_date || '';
    document.getElementById('project-end-date').value = project.target_end_date || '';
    document.getElementById('project-scope').value = project.scope_summary || '';
    document.getElementById('f-critical').value = project.findings_critical || 0;
    document.getElementById('f-high').value = project.findings_high || 0;
    document.getElementById('f-medium').value = project.findings_medium || 0;
    document.getElementById('f-low').value = project.findings_low || 0;
    document.getElementById('f-info').value = project.findings_info || 0;
    document.getElementById('project-remediation').value = project.remediation_progress || 0;
    projectModal.classList.add('active');
  } catch (error) {
    console.error('Error loading project:', error);
    alert('Failed to load project');
  }
};

window.deleteProject = async function(id, name) {
  if (!confirm(`Delete project "${name}"? This will also delete all reports and remediation items.`)) return;
  try {
    const { error } = await supabase.from('client_projects').delete().eq('id', id);
    if (error) throw error;
    loadClients();
  } catch (error) {
    console.error('Error deleting project:', error);
    alert('Failed to delete project');
  }
};

if (projectForm) {
  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('project-id').value;
    const clientId = document.getElementById('project-client-id').value;

    const projectData = {
      project_name: document.getElementById('project-name').value,
      project_type: document.getElementById('project-type').value,
      status: document.getElementById('project-status').value,
      client_id: clientId || null,
      start_date: document.getElementById('project-start-date').value || null,
      target_end_date: document.getElementById('project-end-date').value || null,
      scope_summary: document.getElementById('project-scope').value || null,
      findings_critical: parseInt(document.getElementById('f-critical').value) || 0,
      findings_high: parseInt(document.getElementById('f-high').value) || 0,
      findings_medium: parseInt(document.getElementById('f-medium').value) || 0,
      findings_low: parseInt(document.getElementById('f-low').value) || 0,
      findings_info: parseInt(document.getElementById('f-info').value) || 0,
      remediation_progress: parseInt(document.getElementById('project-remediation').value) || 0,
    };

    try {
      if (id) {
        const { error } = await supabase.from('client_projects').update(projectData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_projects').insert([projectData]);
        if (error) throw error;
      }
      projectModal.classList.remove('active');
      loadClients();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save: ' + error.message);
    }
  });
}

// ===========================================
// MEDIA LIBRARY
// ===========================================

async function loadMedia() {
  try {
    const { data, error } = await supabase.storage
      .from('blog-images')
      .list('', { limit: 100 });

    if (error) throw error;
    renderMediaGrid(data || []);
  } catch (error) {
    console.error('Error loading media:', error);
    document.getElementById('media-grid').innerHTML = '<p class="empty-state">Failed to load media</p>';
  }
}

function renderMediaGrid(files) {
  const container = document.getElementById('media-grid');
  if (files.length === 0) {
    container.innerHTML = '<p class="empty-state">No media files yet. Upload your first image!</p>';
    return;
  }

  container.innerHTML = files.map(file => {
    const url = supabase.storage.from('blog-images').getPublicUrl(file.name).data.publicUrl;
    return `
      <div class="media-item" onclick="copyMediaUrl('${url}')">
        <img src="${url}" alt="${file.name}" loading="lazy">
        <div class="media-item-overlay">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </div>
      </div>
    `;
  }).join('');
}

window.copyMediaUrl = function(url) {
  navigator.clipboard.writeText(url);
  alert('URL copied to clipboard!');
};

// Upload media
document.getElementById('upload-media-btn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = `${Date.now()}-${file.name}`;
    try {
      const { error } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file);

      if (error) throw error;
      loadMedia();
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Failed to upload: ' + error.message);
    }
  };
  input.click();
});

// ===========================================
// MODAL HANDLERS
// ===========================================

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.remove('active');
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// Auto-generate slug from title
document.getElementById('post-title')?.addEventListener('input', (e) => {
  const slugInput = document.getElementById('post-slug');
  if (!slugInput.value || slugInput.dataset.autoGenerate !== 'false') {
    slugInput.value = generateSlug(e.target.value);
  }
});

document.getElementById('post-slug')?.addEventListener('input', (e) => {
  e.target.dataset.autoGenerate = 'false';
});

// ===========================================
// INITIALIZE
// ===========================================

checkAuth();
