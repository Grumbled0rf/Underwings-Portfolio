import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.slice(7);
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

// GET - List all client users
export const GET: APIRoute = async ({ request }) => {
  if (!await verifyAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = getAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Service role key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const users = (data.users || []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    confirmed: !!u.email_confirmed_at,
  }));

  return new Response(JSON.stringify({ users }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

// POST - Create a new client user
export const POST: APIRoute = async ({ request }) => {
  if (!await verifyAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = getAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Service role key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (password.length < 8) {
    return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || email.split('@')[0] },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    user: {
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at,
    },
  }), {
    status: 201, headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE - Delete a client user
export const DELETE: APIRoute = async ({ request }) => {
  if (!await verifyAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = getAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Service role key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return new Response(JSON.stringify({ error: 'user_id is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await admin.auth.admin.deleteUser(user_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
