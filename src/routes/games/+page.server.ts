import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserGames, deleteGame, updatePlayCount } from '$lib/server/games';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	// Fetch user's games (RLS ensures only user's games are returned)
	const games = await getUserGames(locals.supabase);

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

		// RLS ensures user can only delete their own games
		const deleted = await deleteGame(locals.supabase, gameId);

		if (!deleted) {
			return fail(404, { error: 'Game not found or you do not have permission to delete it' });
		}

		return { success: true };
	},

	incrementPlayCount: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const gameId = formData.get('gameId');

		if (!gameId || typeof gameId !== 'string') {
			return fail(400, { error: 'Game ID is required' });
		}

		const result = await updatePlayCount(locals.supabase, gameId, 1);

		if (!result) {
			return fail(404, { error: 'Game not found or you do not have permission to update it' });
		}

		return { success: true, playCount: result.playCount };
	},

	decrementPlayCount: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const gameId = formData.get('gameId');

		if (!gameId || typeof gameId !== 'string') {
			return fail(400, { error: 'Game ID is required' });
		}

		const result = await updatePlayCount(locals.supabase, gameId, -1);

		if (!result) {
			return fail(404, { error: 'Game not found or you do not have permission to update it' });
		}

		return { success: true, playCount: result.playCount };
	}
};
