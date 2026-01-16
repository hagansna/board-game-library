import type { Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const handle: Handle = async ({ event, resolve }) => {
	// Create Supabase client with cookie handlers
	event.locals.supabase = createSupabaseServerClient(event.cookies);

	// Safe session getter that validates JWT
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		// Validate the session by getting the user
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error || !user) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	// Get session and populate user with role from profiles table
	const { user } = await event.locals.safeGetSession();
	if (user) {
		// Fetch role from profiles table
		const { data: profile } = await event.locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		event.locals.user = {
			id: user.id,
			email: user.email || '',
			role: (profile?.role as 'admin' | 'user') || 'user'
		};
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
