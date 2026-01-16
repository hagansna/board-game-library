import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { searchGames, type Game } from '$lib/server/games';
import { addExistingGameToLibrary, isGameInLibrary } from '$lib/server/library-games';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	return {};
};

export const actions: Actions = {
	/**
	 * Search the shared game catalog by title
	 */
	search: async ({ request, locals }) => {
		const user = locals.user;

		// Redirect to login if not authenticated
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

		// Search the shared catalog
		const results = await searchGames(locals.supabase, query);

		return {
			searchResults: results,
			searchQuery: query
		};
	},

	/**
	 * Add an existing game from the catalog to the user's library
	 */
	addFromCatalog: async ({ request, locals }) => {
		const user = locals.user;

		// Redirect to login if not authenticated
		if (!user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const gameId = formData.get('gameId')?.toString().trim() ?? '';
		const playCountStr = formData.get('playCount')?.toString().trim() ?? '';
		const personalRatingStr = formData.get('personalRating')?.toString().trim() ?? '';
		const review = formData.get('review')?.toString().trim() || null;

		const errors: {
			gameId?: string;
			playCount?: string;
			personalRating?: string;
			general?: string;
		} = {};

		// Validate game ID
		if (!gameId) {
			errors.gameId = 'Please select a game to add';
		}

		// Check if game is already in library
		if (gameId) {
			const alreadyInLibrary = await isGameInLibrary(locals.supabase, gameId);
			if (alreadyInLibrary) {
				errors.general = 'This game is already in your library';
			}
		}

		// Validate and parse play count
		const playCount = playCountStr ? parseInt(playCountStr, 10) : null;
		if (playCountStr && (isNaN(playCount!) || playCount! < 0)) {
			errors.playCount = 'Play count must be a non-negative number';
		}

		// Validate and parse personal rating
		const personalRating = personalRatingStr ? parseInt(personalRatingStr, 10) : null;
		if (
			personalRatingStr &&
			(isNaN(personalRating!) || personalRating! < 1 || personalRating! > 5)
		) {
			errors.personalRating = 'Personal rating must be between 1 and 5';
		}

		// Return validation errors
		if (Object.keys(errors).length > 0) {
			return fail(400, {
				gameId,
				playCount: playCountStr,
				personalRating: personalRatingStr,
				review: review ?? '',
				errors
			});
		}

		// Add the game to the user's library
		try {
			const result = await addExistingGameToLibrary(locals.supabase, user.id, gameId, {
				playCount,
				personalRating,
				review
			});

			if (!result) {
				return fail(500, {
					gameId,
					playCount: playCountStr,
					personalRating: personalRatingStr,
					review: review ?? '',
					errors: { general: 'Failed to add game to library. Please try again.' }
				});
			}
		} catch {
			return fail(500, {
				gameId,
				playCount: playCountStr,
				personalRating: personalRatingStr,
				review: review ?? '',
				errors: { general: 'An error occurred while adding the game. Please try again.' }
			});
		}

		// Redirect to library page after successful addition
		redirect(303, '/games');
	}
};
