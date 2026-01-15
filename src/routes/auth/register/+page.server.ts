import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import {
	registerUser,
	findUserByEmail,
	isValidEmail,
	isValidPassword,
	createSession,
	setSessionCookie
} from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
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

		// Check for existing user
		const existingUser = await findUserByEmail(email);
		if (existingUser) {
			return fail(400, {
				email,
				error: 'An account with this email already exists'
			});
		}

		// Create user
		try {
			const user = await registerUser(email, password);

			// Create session and set cookie
			const sessionId = await createSession(user.id);
			setSessionCookie(cookies, sessionId);
		} catch {
			return fail(500, {
				email,
				error: 'An error occurred during registration. Please try again.'
			});
		}

		// Redirect to library page after successful registration
		redirect(303, '/');
	}
};
