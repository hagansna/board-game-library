import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createGame } from '$lib/server/games';
import { isValidImageUrl, saveBoxArtFile } from '$lib/server/boxart';

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
		const boxArtUrlInput = formData.get('boxArtUrl')?.toString().trim() ?? '';
		const boxArtFile = formData.get('boxArtFile') as File | null;
		const description = formData.get('description')?.toString().trim() || null;
		const categoriesInput = formData.get('categories')?.toString().trim() ?? '';
		const bggRatingStr = formData.get('bggRating')?.toString().trim() ?? '';
		const bggRankStr = formData.get('bggRank')?.toString().trim() ?? '';

		const errors: {
			title?: string;
			year?: string;
			players?: string;
			playTime?: string;
			boxArt?: string;
			bggRating?: string;
			bggRank?: string;
		} = {};

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

		// Handle box art - file upload takes priority over URL
		let boxArtUrl: string | null = null;

		if (boxArtFile && boxArtFile.size > 0) {
			// User uploaded a file
			const uploadResult = await saveBoxArtFile(boxArtFile, user.id);
			if (!uploadResult.success) {
				errors.boxArt = uploadResult.error || 'Failed to upload box art';
			} else {
				boxArtUrl = uploadResult.url || null;
			}
		} else if (boxArtUrlInput) {
			// User provided a URL
			if (!isValidImageUrl(boxArtUrlInput)) {
				errors.boxArt = 'Please enter a valid image URL (http or https)';
			} else {
				boxArtUrl = boxArtUrlInput;
			}
		}

		// Parse categories from comma-separated string to JSON array
		let categories: string | null = null;
		if (categoriesInput) {
			const categoryArray = categoriesInput
				.split(',')
				.map((c) => c.trim())
				.filter((c) => c.length > 0);
			if (categoryArray.length > 0) {
				categories = JSON.stringify(categoryArray);
			}
		}

		// Validate and parse BGG rating
		const bggRating = bggRatingStr ? parseFloat(bggRatingStr) : null;
		if (bggRatingStr && (isNaN(bggRating!) || bggRating! < 0 || bggRating! > 10)) {
			errors.bggRating = 'Rating must be between 0 and 10';
		}

		// Validate and parse BGG rank
		const bggRank = bggRankStr ? parseInt(bggRankStr, 10) : null;
		if (bggRankStr && (isNaN(bggRank!) || bggRank! < 1)) {
			errors.bggRank = 'Rank must be at least 1';
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
				boxArtUrl: boxArtUrlInput,
				description: description ?? '',
				categories: categoriesInput,
				bggRating: bggRatingStr,
				bggRank: bggRankStr,
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
				playTimeMax,
				boxArtUrl,
				description,
				categories,
				bggRating,
				bggRank
			});
		} catch {
			return fail(500, {
				title,
				year: yearStr,
				minPlayers: minPlayersStr,
				maxPlayers: maxPlayersStr,
				playTimeMin: playTimeMinStr,
				playTimeMax: playTimeMaxStr,
				boxArtUrl: boxArtUrlInput,
				description: description ?? '',
				categories: categoriesInput,
				bggRating: bggRatingStr,
				bggRank: bggRankStr,
				error: 'An error occurred while adding the game. Please try again.'
			});
		}

		// Redirect to library page after successful creation
		redirect(303, '/games');
	}
};
