import type { LayoutServerLoad } from './$types';
import { getSessionCookie, validateSession } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const sessionId = getSessionCookie(cookies);

	if (!sessionId) {
		return { user: null };
	}

	const session = await validateSession(sessionId);

	if (!session) {
		return { user: null };
	}

	return {
		user: {
			id: session.user.id,
			email: session.user.email
		}
	};
};
