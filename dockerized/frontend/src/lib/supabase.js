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
  await supabase.rpc('increment_view_count', { post_id: data.id }).catch(() => {});

  return data;
}
