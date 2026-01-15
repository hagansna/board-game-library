import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { isValidEmail, isValidPassword } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		const errors: { email?: string; password?: string } = {};

		// Validate email
		if (!email) {
			errors.email = 'Email is required';
		} else if (!isValidEmail(email)) {
			errors.email = 'Please enter a valid email address';
		}

		// Validate password
		if (!password) {
			errors.password = 'Password is required';
		} else if (!isValidPassword(password)) {
			errors.password = 'Password must be at least 8 characters';
		}

		// Return validation errors
		if (Object.keys(errors).length > 0) {
			return fail(400, { email, errors });
		}

		// Sign in with Supabase
		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(400, {
				email,
				error: 'Invalid email or password'
			});
		}

		// Redirect to library page after successful login
		redirect(303, '/');
	}
};
