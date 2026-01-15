import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createGame } from '$lib/server/games';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, parent }) => {
		const { user } = await parent();

		// Redirect to login if not authenticated
		if (!user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim() ?? '';
		const yearStr = formData.get('year')?.toString().trim() ?? '';
		const minPlayersStr = formData.get('minPlayers')?.toString().trim() ?? '';
		const maxPlayersStr = formData.get('maxPlayers')?.toString().trim() ?? '';
		const playTimeMinStr = formData.get('playTimeMin')?.toString().trim() ?? '';
		const playTimeMaxStr = formData.get('playTimeMax')?.toString().trim() ?? '';

		const errors: { title?: string; year?: string; players?: string; playTime?: string } = {};

		// Validate title (required)
		if (!title) {
			errors.title = 'Title is required';
		}

		// Parse and validate optional numeric fields
		const year = yearStr ? parseInt(yearStr, 10) : null;
		if (yearStr && (isNaN(year!) || year! < 1 || year! > new Date().getFullYear() + 1)) {
			errors.year = 'Please enter a valid year';
		}

		const minPlayers = minPlayersStr ? parseInt(minPlayersStr, 10) : null;
		const maxPlayers = maxPlayersStr ? parseInt(maxPlayersStr, 10) : null;

		if (minPlayersStr && (isNaN(minPlayers!) || minPlayers! < 1)) {
			errors.players = 'Minimum players must be at least 1';
		}
		if (maxPlayersStr && (isNaN(maxPlayers!) || maxPlayers! < 1)) {
			errors.players = 'Maximum players must be at least 1';
		}
		if (minPlayers && maxPlayers && minPlayers > maxPlayers) {
			errors.players = 'Minimum players cannot be greater than maximum players';
		}

		const playTimeMin = playTimeMinStr ? parseInt(playTimeMinStr, 10) : null;
		const playTimeMax = playTimeMaxStr ? parseInt(playTimeMaxStr, 10) : null;

		if (playTimeMinStr && (isNaN(playTimeMin!) || playTimeMin! < 1)) {
			errors.playTime = 'Minimum play time must be at least 1 minute';
		}
		if (playTimeMaxStr && (isNaN(playTimeMax!) || playTimeMax! < 1)) {
			errors.playTime = 'Maximum play time must be at least 1 minute';
		}
		if (playTimeMin && playTimeMax && playTimeMin > playTimeMax) {
			errors.playTime = 'Minimum play time cannot be greater than maximum play time';
		}

		// Return validation errors
		if (Object.keys(errors).length > 0) {
			return fail(400, {
				title,
				year: yearStr,
				minPlayers: minPlayersStr,
				maxPlayers: maxPlayersStr,
				playTimeMin: playTimeMinStr,
				playTimeMax: playTimeMaxStr,
				errors
			});
		}

		// Create game
		try {
			await createGame(user.id, {
				title,
				year,
				minPlayers,
				maxPlayers,
				playTimeMin,
				playTimeMax
			});
		} catch {
			return fail(500, {
				title,
				year: yearStr,
				minPlayers: minPlayersStr,
				maxPlayers: maxPlayersStr,
				playTimeMin: playTimeMinStr,
				playTimeMax: playTimeMaxStr,
				error: 'An error occurred while adding the game. Please try again.'
			});
		}

		// Redirect to library page after successful creation
		redirect(303, '/games');
	}
};
