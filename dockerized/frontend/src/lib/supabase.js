// ===========================================
// SUPABASE CLIENT
// Underwings Technologies
// ===========================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'http://kong:8000';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE4OTM0NTYwMDB9.Inir1TWLEdJ1Izc0kNDPDsmdUsJiruzMjvjiJ9pziIQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ===========================================
// BLOG FUNCTIONS
// ===========================================

/**
 * Get all published blog posts
 */
export async function getBlogPosts(limit = 10, offset = 0) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }

  return data;
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPost(slug) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }

  // Increment view count
  await supabase.rpc('increment_view_count', { post_id: data.id });

  return data;
}

/**
 * Get blog posts by category
 */
export async function getBlogPostsByCategory(category, limit = 10) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .eq('category', category)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching blog posts by category:', error);
    return [];
  }

  return data;
}

/**
 * Get all blog categories
 */
export async function getBlogCategories() {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data;
}

// ===========================================
// FORM FUNCTIONS
// ===========================================

/**
 * Submit a contact form
 */
export async function submitContactForm(formData) {
  const { data, error } = await supabase
    .from('form_submissions')
    .insert([
      {
        form_type: 'contact',
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        message: formData.message,
        service_interest: formData.service || null,
        metadata: {
          page: formData.page || 'contact',
          timestamp: new Date().toISOString()
        }
      }
    ])
    .select();

  if (error) {
    console.error('Error submitting form:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Submit a quote request
 */
export async function submitQuoteRequest(formData) {
  const { data, error } = await supabase
    .from('form_submissions')
    .insert([
      {
        form_type: 'quote',
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company,
        job_title: formData.jobTitle || null,
        message: formData.requirements || null,
        service_interest: formData.service,
        budget_range: formData.budget || null,
        timeline: formData.timeline || null,
        metadata: {
          company_size: formData.companySize || null,
          industry: formData.industry || null,
          timestamp: new Date().toISOString()
        }
      }
    ])
    .select();

  if (error) {
    console.error('Error submitting quote request:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Subscribe to newsletter
 */
export async function subscribeNewsletter(email, name = null) {
  const { data, error } = await supabase
    .from('subscribers')
    .insert([
      {
        email,
        name,
        subscription_source: 'website'
      }
    ])
    .select();

  if (error) {
    // Check if already subscribed
    if (error.code === '23505') {
      return { success: false, error: 'This email is already subscribed.' };
    }
    console.error('Error subscribing:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ===========================================
// SETTINGS FUNCTIONS
// ===========================================

/**
 * Get site settings
 */
export async function getSiteSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  // Convert to key-value object
  return data.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
}
