import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAllGames, searchGames, deleteSharedGame, type Game } from '$lib/server/games';

export const load: PageServerLoad = async ({ parent, url, locals }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	// Get search query from URL params if present
	const searchQuery = url.searchParams.get('q') ?? '';

	// Fetch games - search if query provided, otherwise get all
	let games: Game[];
	if (searchQuery.trim()) {
		games = await searchGames(locals.supabase, searchQuery);
	} else {
		games = await getAllGames(locals.supabase);
	}

	return {
		games,
		searchQuery
	};
};

export const actions: Actions = {
	/**
	 * Search the game catalog
	 */
	search: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const query = formData.get('query')?.toString().trim() ?? '';

		if (!query) {
			return {
				searchResults: [] as Game[],
				searchQuery: ''
			};
		}

		const results = await searchGames(locals.supabase, query);

		return {
			searchResults: results,
			searchQuery: query
		};
	},

	/**
	 * Delete a game from the shared catalog
	 */
	delete: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const gameId = formData.get('gameId')?.toString().trim() ?? '';

		if (!gameId) {
			return fail(400, {
				error: 'Game ID is required'
			});
		}

		const success = await deleteSharedGame(locals.supabase, gameId);

		if (!success) {
			return fail(500, {
				error: 'Failed to delete game. Please try again.'
			});
		}

		return {
			success: true
		};
	}
};
