import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserGames, deleteGame } from '$lib/server/games';

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

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const gameId = formData.get('gameId');

		if (!gameId || typeof gameId !== 'string') {
			return fail(400, { error: 'Game ID is required' });
		}

		const deleted = await deleteGame(gameId, locals.user.id);

		if (!deleted) {
			return fail(404, { error: 'Game not found or you do not have permission to delete it' });
		}

		return { success: true };
	}
};
