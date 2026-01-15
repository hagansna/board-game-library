import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { getSessionCookie, deleteSession, deleteSessionCookie } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const sessionId = getSessionCookie(cookies);

		if (sessionId) {
			// Delete session from database
			await deleteSession(sessionId);
		}

		// Clear session cookie
		deleteSessionCookie(cookies);

		// Redirect to login page
		redirect(303, '/auth/login');
	}
};
