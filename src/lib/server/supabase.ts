import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function createSupabaseServerClient(cookies: Cookies) {
	const supabaseUrl = env.SUPABASE_URL;
	const supabaseAnonKey = env.SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
	}

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll: () => {
				return cookies.getAll().map(({ name, value }) => ({
					name,
					value
				}));
			},
			setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, {
						...options,
						path: '/'
					});
				});
			}
		}
	});
}

// Admin client for server-side operations that bypass RLS (use sparingly)
export function createSupabaseAdminClient() {
	const supabaseUrl = env.SUPABASE_URL;
	const supabaseAnonKey = env.SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
	}

	return createClient(supabaseUrl, supabaseAnonKey);
}
