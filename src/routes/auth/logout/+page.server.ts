import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals }) => {
		// Sign out with Supabase
		await locals.supabase.auth.signOut();

		// Redirect to login page
		redirect(303, '/auth/login');
	}
};
