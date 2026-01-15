import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import {
	findUserByEmail,
	verifyPassword,
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

		// Find user by email
		const user = await findUserByEmail(email);
		if (!user) {
			return fail(400, {
				email,
				error: 'Invalid email or password'
			});
		}

		// Verify password
		const isPasswordValid = await verifyPassword(password, user.passwordHash);
		if (!isPasswordValid) {
			return fail(400, {
				email,
				error: 'Invalid email or password'
			});
		}

		// Create session and set cookie
		try {
			const sessionId = await createSession(user.id);
			setSessionCookie(cookies, sessionId);
		} catch {
			return fail(500, {
				email,
				error: 'An error occurred during login. Please try again.'
			});
		}

		// Redirect to library page after successful login
		redirect(303, '/');
	}
};
