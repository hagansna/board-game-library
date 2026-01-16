import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSharedGame, type GameInput } from '$lib/server/games';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();

		// Extract form values
		const title = formData.get('title')?.toString().trim() ?? '';
		const yearStr = formData.get('year')?.toString().trim() ?? '';
		const minPlayersStr = formData.get('minPlayers')?.toString().trim() ?? '';
		const maxPlayersStr = formData.get('maxPlayers')?.toString().trim() ?? '';
		const playTimeMinStr = formData.get('playTimeMin')?.toString().trim() ?? '';
		const playTimeMaxStr = formData.get('playTimeMax')?.toString().trim() ?? '';
		const boxArtUrl = formData.get('boxArtUrl')?.toString().trim() || null;
		const description = formData.get('description')?.toString().trim() || null;
		const categoriesStr = formData.get('categories')?.toString().trim() ?? '';
		const bggRatingStr = formData.get('bggRating')?.toString().trim() ?? '';
		const bggRankStr = formData.get('bggRank')?.toString().trim() ?? '';
		const suggestedAgeStr = formData.get('suggestedAge')?.toString().trim() ?? '';

		const errors: Record<string, string> = {};

		// Title validation (required)
		if (!title) {
			errors.title = 'Title is required';
		}

		// Year validation (optional, but must be valid if provided)
		const year = yearStr ? parseInt(yearStr, 10) : null;
		if (yearStr) {
			const currentYear = new Date().getFullYear();
			if (isNaN(year!) || year! < 1 || year! > currentYear + 1) {
				errors.year = `Year must be between 1 and ${currentYear + 1}`;
			}
		}

		// Player count validation
		const minPlayers = minPlayersStr ? parseInt(minPlayersStr, 10) : null;
		const maxPlayers = maxPlayersStr ? parseInt(maxPlayersStr, 10) : null;
		if (minPlayersStr && (isNaN(minPlayers!) || minPlayers! < 1)) {
			errors.minPlayers = 'Min players must be at least 1';
		}
		if (maxPlayersStr && (isNaN(maxPlayers!) || maxPlayers! < 1)) {
			errors.maxPlayers = 'Max players must be at least 1';
		}
		if (minPlayers && maxPlayers && minPlayers > maxPlayers) {
			errors.maxPlayers = 'Max players cannot be less than min players';
		}

		// Play time validation
		const playTimeMin = playTimeMinStr ? parseInt(playTimeMinStr, 10) : null;
		const playTimeMax = playTimeMaxStr ? parseInt(playTimeMaxStr, 10) : null;
		if (playTimeMinStr && (isNaN(playTimeMin!) || playTimeMin! < 1)) {
			errors.playTimeMin = 'Min play time must be at least 1';
		}
		if (playTimeMaxStr && (isNaN(playTimeMax!) || playTimeMax! < 1)) {
			errors.playTimeMax = 'Max play time must be at least 1';
		}
		if (playTimeMin && playTimeMax && playTimeMin > playTimeMax) {
			errors.playTimeMax = 'Max play time cannot be less than min play time';
		}

		// Box art URL validation (optional, but must be valid URL if provided)
		if (boxArtUrl && !isValidUrl(boxArtUrl)) {
			errors.boxArtUrl = 'Please enter a valid URL';
		}

		// BGG Rating validation (0-10)
		const bggRating = bggRatingStr ? parseFloat(bggRatingStr) : null;
		if (bggRatingStr && (isNaN(bggRating!) || bggRating! < 0 || bggRating! > 10)) {
			errors.bggRating = 'BGG Rating must be between 0 and 10';
		}

		// BGG Rank validation (positive integer)
		const bggRank = bggRankStr ? parseInt(bggRankStr, 10) : null;
		if (bggRankStr && (isNaN(bggRank!) || bggRank! < 1)) {
			errors.bggRank = 'BGG Rank must be at least 1';
		}

		// Suggested age validation (1-21)
		const suggestedAge = suggestedAgeStr ? parseInt(suggestedAgeStr, 10) : null;
		if (suggestedAgeStr && (isNaN(suggestedAge!) || suggestedAge! < 1 || suggestedAge! > 21)) {
			errors.suggestedAge = 'Suggested age must be between 1 and 21';
		}

		// Parse categories from comma-separated string to JSON
		let categories: string | null = null;
		if (categoriesStr) {
			const categoriesArray = categoriesStr
				.split(',')
				.map((c) => c.trim())
				.filter((c) => c.length > 0);
			if (categoriesArray.length > 0) {
				categories = JSON.stringify(categoriesArray);
			}
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
				boxArtUrl: boxArtUrl ?? '',
				description: description ?? '',
				categories: categoriesStr,
				bggRating: bggRatingStr,
				bggRank: bggRankStr,
				suggestedAge: suggestedAgeStr,
				errors
			});
		}

		// Create the game in the shared catalog
		const gameData: GameInput = {
			title,
			year,
			minPlayers,
			maxPlayers,
			playTimeMin,
			playTimeMax,
			boxArtUrl,
			description,
			categories,
			bggRating,
			bggRank,
			suggestedAge
		};

		const game = await createSharedGame(locals.supabase, gameData);

		if (!game) {
			return fail(500, {
				title,
				year: yearStr,
				minPlayers: minPlayersStr,
				maxPlayers: maxPlayersStr,
				playTimeMin: playTimeMinStr,
				playTimeMax: playTimeMaxStr,
				boxArtUrl: boxArtUrl ?? '',
				description: description ?? '',
				categories: categoriesStr,
				bggRating: bggRatingStr,
				bggRank: bggRankStr,
				suggestedAge: suggestedAgeStr,
				errors: { general: 'Failed to create game. Please try again.' }
			});
		}

		// Redirect to admin games list
		redirect(303, '/admin/games');
	}
};

function isValidUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}
