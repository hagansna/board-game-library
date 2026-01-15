import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserGames } from '$lib/server/games';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	// Fetch user's games
	const games = await getUserGames(user.id);

	return {
		games
	};
};
