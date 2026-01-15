import type { Handle } from '@sveltejs/kit';
import { getSessionCookie, validateSession, refreshSessionIfNeeded, setSessionCookie } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = getSessionCookie(event.cookies);

	if (sessionId) {
		const session = await validateSession(sessionId);

		if (session) {
			event.locals.user = {
				id: session.user.id,
				email: session.user.email
			};

			// Refresh session if needed
			const wasRefreshed = await refreshSessionIfNeeded(sessionId);
			if (wasRefreshed) {
				setSessionCookie(event.cookies, sessionId);
			}
		}
	}

	return resolve(event);
};
