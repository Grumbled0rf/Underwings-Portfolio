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
    case 'submissions':
      loadSubmissions();
      break;
    case 'subscribers':
      loadSubscribers();
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
    // Get counts
    const [postsRes, subsRes, subscribersRes] = await Promise.all([
      supabase.from('blog_posts').select('id', { count: 'exact' }),
      supabase.from('form_submissions').select('id', { count: 'exact' }),
      supabase.from('subscribers').select('id', { count: 'exact' }).eq('subscribed', true)
    ]);

    // Get new submissions count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: newCount } = await supabase
      .from('form_submissions')
      .select('id', { count: 'exact' })
      .eq('status', 'new')
      .gte('created_at', weekAgo.toISOString());

    // Update stats
    document.getElementById('stat-posts').textContent = postsRes.count || 0;
    document.getElementById('stat-submissions').textContent = subsRes.count || 0;
    document.getElementById('stat-subscribers').textContent = subscribersRes.count || 0;
    document.getElementById('stat-new').textContent = newCount || 0;
    document.getElementById('submission-count').textContent = newCount || 0;

    // Load recent submissions
    const { data: recentSubs } = await supabase
      .from('form_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    renderRecentSubmissions(recentSubs || []);

    // Load recent posts
    const { data: recentPosts } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    renderRecentPosts(recentPosts || []);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function renderRecentSubmissions(submissions) {
  const container = document.getElementById('recent-submissions');
  if (submissions.length === 0) {
    container.innerHTML = '<p class="empty-state">No submissions yet</p>';
    return;
  }

  container.innerHTML = submissions.map(sub => `
    <div class="list-item" onclick="viewSubmission('${sub.id}')">
      <div class="list-item-info">
        <div class="list-item-title">${sub.name || 'Anonymous'}</div>
        <div class="list-item-meta">${sub.form_type} • ${formatDate(sub.created_at)}</div>
      </div>
      <span class="status-badge ${sub.status}">${sub.status}</span>
    </div>
  `).join('');
}

function renderRecentPosts(posts) {
  const container = document.getElementById('recent-posts');
  if (posts.length === 0) {
    container.innerHTML = '<p class="empty-state">No posts yet</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="list-item" onclick="editPost('${post.id}')">
      <div class="list-item-info">
        <div class="list-item-title">${post.title}</div>
        <div class="list-item-meta">${post.category || 'Uncategorized'} • ${formatDate(post.created_at)}</div>
      </div>
      <span class="status-badge ${post.status}">${post.status}</span>
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
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No posts yet. Create your first post!</td></tr>';
    return;
  }

  tbody.innerHTML = posts.map(post => `
    <tr>
      <td><strong>${post.title}</strong></td>
      <td>${post.category || '-'}</td>
      <td><span class="status-badge ${post.status}">${post.status}</span></td>
      <td>${formatDate(post.created_at)}</td>
      <td class="actions">
        <button class="btn-icon" onclick="editPost('${post.id}')" title="Edit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon danger" onclick="deletePost('${post.id}')" title="Delete">
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
      // Update
      const { error } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', id);
      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('blog_posts')
        .insert([postData]);
      if (error) throw error;
    }

    postModal.classList.remove('active');
    loadPosts();
  } catch (error) {
    console.error('Error saving post:', error);
    alert('Failed to save post: ' + error.message);
  }
});

// ===========================================
// FORM SUBMISSIONS
// ===========================================

async function loadSubmissions() {
  try {
    const filterType = document.getElementById('filter-type').value;
    const filterStatus = document.getElementById('filter-status').value;

    let query = supabase
      .from('form_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterType) query = query.eq('form_type', filterType);
    if (filterStatus) query = query.eq('status', filterStatus);

    const { data, error } = await query;
    if (error) throw error;

    renderSubmissionsTable(data || []);
  } catch (error) {
    console.error('Error loading submissions:', error);
  }
}

function renderSubmissionsTable(submissions) {
  const tbody = document.getElementById('submissions-table');
  if (submissions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No submissions found</td></tr>';
    return;
  }

  tbody.innerHTML = submissions.map(sub => `
    <tr>
      <td>${sub.name || '-'}</td>
      <td>${sub.email}</td>
      <td>${sub.form_type}</td>
      <td><span class="status-badge ${sub.status}">${sub.status}</span></td>
      <td>${formatDate(sub.created_at)}</td>
      <td class="actions">
        <button class="btn-icon" onclick="viewSubmission('${sub.id}')" title="View">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        <button class="btn-icon danger" onclick="deleteSubmission('${sub.id}')" title="Delete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// Filter change handlers
document.getElementById('filter-type').addEventListener('change', loadSubmissions);
document.getElementById('filter-status').addEventListener('change', loadSubmissions);

const submissionModal = document.getElementById('submission-modal');
let currentSubmissionId = null;

window.viewSubmission = async function(id) {
  try {
    const { data: sub, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    currentSubmissionId = id;

    // Mark as read
    if (sub.status === 'new') {
      await supabase
        .from('form_submissions')
        .update({ status: 'read' })
        .eq('id', id);
    }

    document.getElementById('submission-details').innerHTML = `
      <div class="submission-detail">
        <p><strong>Name:</strong> ${sub.name || '-'}</p>
        <p><strong>Email:</strong> <a href="mailto:${sub.email}">${sub.email}</a></p>
        <p><strong>Phone:</strong> ${sub.phone || '-'}</p>
        <p><strong>Company:</strong> ${sub.company || '-'}</p>
        <p><strong>Type:</strong> ${sub.form_type}</p>
        <p><strong>Service Interest:</strong> ${sub.service_interest || '-'}</p>
        <p><strong>Date:</strong> ${formatDate(sub.created_at)}</p>
        <hr style="border-color: var(--border-color); margin: 1rem 0;">
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; background: var(--bg-dark); padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">${sub.message || 'No message'}</p>
      </div>
    `;

    submissionModal.classList.add('active');
    loadSubmissions();
  } catch (error) {
    console.error('Error viewing submission:', error);
  }
};

window.deleteSubmission = async function(id) {
  if (!confirm('Are you sure you want to delete this submission?')) return;

  try {
    const { error } = await supabase
      .from('form_submissions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    loadSubmissions();
    loadDashboardData();
  } catch (error) {
    console.error('Error deleting submission:', error);
  }
};

document.getElementById('mark-replied').addEventListener('click', async () => {
  if (!currentSubmissionId) return;

  try {
    await supabase
      .from('form_submissions')
      .update({ status: 'replied' })
      .eq('id', currentSubmissionId);

    submissionModal.classList.remove('active');
    loadSubmissions();
  } catch (error) {
    console.error('Error updating status:', error);
  }
});

// ===========================================
// SUBSCRIBERS
// ===========================================

async function loadSubscribers() {
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderSubscribersTable(data || []);
  } catch (error) {
    console.error('Error loading subscribers:', error);
  }
}

function renderSubscribersTable(subscribers) {
  const tbody = document.getElementById('subscribers-table');
  if (subscribers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No subscribers yet</td></tr>';
    return;
  }

  tbody.innerHTML = subscribers.map(sub => `
    <tr>
      <td>${sub.email}</td>
      <td>${sub.name || '-'}</td>
      <td><span class="status-badge ${sub.subscribed ? 'published' : 'draft'}">${sub.subscribed ? 'Active' : 'Unsubscribed'}</span></td>
      <td>${formatDate(sub.created_at)}</td>
      <td class="actions">
        <button class="btn-icon danger" onclick="deleteSubscriber('${sub.id}')" title="Delete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

window.deleteSubscriber = async function(id) {
  if (!confirm('Are you sure you want to delete this subscriber?')) return;

  try {
    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    loadSubscribers();
  } catch (error) {
    console.error('Error deleting subscriber:', error);
  }
};

// Export CSV
document.getElementById('export-subscribers').addEventListener('click', async () => {
  try {
    const { data } = await supabase
      .from('subscribers')
      .select('email,name,subscribed,created_at')
      .eq('subscribed', true);

    const csv = 'Email,Name,Date\n' + data.map(s =>
      `${s.email},${s.name || ''},${formatDate(s.created_at)}`
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  } catch (error) {
    console.error('Error exporting:', error);
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

// ===========================================
// UTILITIES
// ===========================================

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
