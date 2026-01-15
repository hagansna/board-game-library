import type { LayoutServerLoad } from './$types';
import {
	getSessionCookie,
	validateSession,
	refreshSessionIfNeeded,
	setSessionCookie
} from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const sessionId = getSessionCookie(cookies);

	if (!sessionId) {
		return { user: null };
	}

	const session = await validateSession(sessionId);

	if (!session) {
		return { user: null };
	}

	// Refresh session if it's close to expiring (sliding session)
	// This ensures active users don't get logged out unexpectedly
	const wasRefreshed = await refreshSessionIfNeeded(sessionId);
	if (wasRefreshed) {
		// Update cookie with new expiration
		setSessionCookie(cookies, sessionId);
	}

	return {
		user: {
			id: session.user.id,
			email: session.user.email
		}
	};
};
