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
// STATE
// ===========================================
let currentUser = null;
let currentPage = 'dashboard';

// ===========================================
// DOM ELEMENTS
// ===========================================
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// ===========================================
// AUTHENTICATION
// ===========================================

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    showDashboard();
    loadDashboardData();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.style.display = 'flex';
  dashboard.style.display = 'none';
}

function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'flex';
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
    showDashboard();
    loadDashboardData();
    loginError.textContent = '';
  } catch (error) {
    loginError.textContent = error.message || 'Login failed. Please try again.';
  }
});

logoutBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  await supabase.auth.signOut();
  currentUser = null;
  showLogin();
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
    case 'media':
      loadMedia();
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

newPostBtn.addEventListener('click', () => {
  document.getElementById('editor-title').textContent = 'New Post';
  postForm.reset();
  document.getElementById('post-id').value = '';
  document.getElementById('post-slug').dataset.autoGenerate = 'true';
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
    document.getElementById('post-image').value = post.featured_image || '';

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
