import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { analyzeGameImage, type ExtractedGameData, type MultiGameAnalysisResult } from '$lib/server/gemini';
import { createGame } from '$lib/server/games';

// Allowed MIME types for image uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect to login if not authenticated
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	return {
		user: locals.user
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const files = formData.getAll('images') as File[];

		// Validate file presence
		if (!files || files.length === 0 || (files.length === 1 && files[0].size === 0)) {
			return fail(400, {
				error: 'Please select at least one image file to upload'
			});
		}

		const processedImages: Array<{ imageData: string; mimeType: string; fileName: string }> = [];
		const errors: string[] = [];

		for (const file of files) {
			// Skip empty files
			if (!file || file.size === 0) {
				continue;
			}

			// Validate file type
			const mimeType = file.type.toLowerCase();
			if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
				errors.push(`${file.name}: Invalid file type. Please upload JPG, PNG, or HEIC images.`);
				continue;
			}

			// Validate file size
			if (file.size > MAX_FILE_SIZE) {
				const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
				errors.push(`${file.name}: File size (${sizeMB}MB) exceeds the 10MB limit.`);
				continue;
			}

			// Convert file to base64 for storage/transmission
			const arrayBuffer = await file.arrayBuffer();
			const base64 = Buffer.from(arrayBuffer).toString('base64');
			const dataUrl = `data:${file.type};base64,${base64}`;

			processedImages.push({
				imageData: dataUrl,
				mimeType: file.type,
				fileName: file.name
			});
		}

		// If no valid files were processed
		if (processedImages.length === 0) {
			return fail(400, {
				error:
					errors.length > 0
						? errors.join('\n')
						: 'No valid image files were found. Please upload JPG, PNG, or HEIC images.'
			});
		}

		// Return success with all processed images
		return {
			success: true,
			images: processedImages,
			skippedCount: errors.length,
			skippedErrors: errors.length > 0 ? errors : undefined
		};
	},

	analyzeAll: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const imagesJson = formData.get('images') as string | null;

		if (!imagesJson) {
			return fail(400, {
				analyzeError: 'No images provided for analysis'
			});
		}

		let images: Array<{ imageData: string; mimeType: string; fileName: string }>;
		try {
			images = JSON.parse(imagesJson);
		} catch {
			return fail(400, {
				analyzeError: 'Invalid image data format'
			});
		}

		if (!Array.isArray(images) || images.length === 0) {
			return fail(400, {
				analyzeError: 'No images provided for analysis'
			});
		}

		// Analyze all images - each image can now contain multiple games
		const results: Array<{
			success: boolean;
			games: ExtractedGameData[];
			gameCount: number;
			error: string | null;
			fileName: string;
		}> = [];

		let totalGamesFound = 0;

		for (const image of images) {
			// Extract base64 data from data URL
			const base64Match = image.imageData.match(/^data:([^;]+);base64,(.+)$/);
			if (!base64Match) {
				results.push({
					success: false,
					games: [],
					gameCount: 0,
					error: 'Invalid image data format',
					fileName: image.fileName
				});
				continue;
			}

			const base64Data = base64Match[2];

			// Call Gemini AI for analysis - now returns multiple games
			const result = await analyzeGameImage(base64Data, image.mimeType);

			if (!result.success) {
				results.push({
					success: false,
					games: [],
					gameCount: 0,
					error: result.error || 'Failed to analyze the image',
					fileName: image.fileName
				});
			} else {
				// Filter out games without titles (failed detections)
				const validGames = result.games.filter(g => g.title && g.title.trim() !== '');
				totalGamesFound += validGames.length;
				results.push({
					success: true,
					games: validGames,
					gameCount: validGames.length,
					error: null,
					fileName: image.fileName
				});
			}
		}

		// Return all results with multi-game support
		return {
			batchAnalyzed: true,
			results,
			totalCount: images.length,
			totalGamesFound,
			successCount: results.filter((r) => r.success && r.gameCount > 0).length
		};
	},

	addSelectedToLibrary: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const gamesJson = formData.get('games') as string | null;

		if (!gamesJson) {
			return fail(400, {
				addError: 'No games provided'
			});
		}

		let games: ExtractedGameData[];
		try {
			games = JSON.parse(gamesJson);
		} catch {
			return fail(400, {
				addError: 'Invalid game data format'
			});
		}

		if (!Array.isArray(games) || games.length === 0) {
			return fail(400, {
				addError: 'No games selected to add'
			});
		}

		// Add all selected games
		const addedGames: string[] = [];
		const errors: string[] = [];

		for (const gameData of games) {
			// Validate title
			if (!gameData.title || gameData.title.trim() === '') {
				errors.push('A game is missing a title');
				continue;
			}

			try {
				// Parse categories if present
				let categories: string | null = null;
				if (gameData.categories && Array.isArray(gameData.categories)) {
					categories = JSON.stringify(gameData.categories);
				}

				await createGame(locals.user.id, {
					title: gameData.title.trim(),
					year: gameData.year,
					minPlayers: gameData.minPlayers,
					maxPlayers: gameData.maxPlayers,
					playTimeMin: gameData.playTimeMin,
					playTimeMax: gameData.playTimeMax,
					description: gameData.description,
					categories,
					bggRating: gameData.bggRating,
					bggRank: gameData.bggRank
				});

				addedGames.push(gameData.title);
			} catch (error) {
				console.error('Error creating game:', error);
				errors.push(`Failed to add ${gameData.title}`);
			}
		}

		if (addedGames.length === 0) {
			return fail(500, {
				addError: 'Failed to add any games. Please try again.'
			});
		}

		// Return success
		return {
			added: true,
			addedCount: addedGames.length,
			addedGames
		};
	},

	addToLibrary: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();

		// Get form values
		const title = (formData.get('title') as string)?.trim();
		const publisher = (formData.get('publisher') as string)?.trim() || null;
		const yearStr = formData.get('year') as string;
		const minPlayersStr = formData.get('minPlayers') as string;
		const maxPlayersStr = formData.get('maxPlayers') as string;
		const playTimeMinStr = formData.get('playTimeMin') as string;
		const playTimeMaxStr = formData.get('playTimeMax') as string;

		// AI-enriched fields
		const description = (formData.get('description') as string)?.trim() || null;
		const categoriesStr = (formData.get('categories') as string)?.trim() || null;
		const bggRatingStr = formData.get('bggRating') as string;
		const bggRankStr = formData.get('bggRank') as string;

		// Parse numeric values
		const year = yearStr ? parseInt(yearStr, 10) : null;
		const minPlayers = minPlayersStr ? parseInt(minPlayersStr, 10) : null;
		const maxPlayers = maxPlayersStr ? parseInt(maxPlayersStr, 10) : null;
		const playTimeMin = playTimeMinStr ? parseInt(playTimeMinStr, 10) : null;
		const playTimeMax = playTimeMaxStr ? parseInt(playTimeMaxStr, 10) : null;

		// Parse AI-enriched numeric values
		const bggRating = bggRatingStr ? parseFloat(bggRatingStr) : null;
		const bggRank = bggRankStr ? parseInt(bggRankStr, 10) : null;

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

		// Validation errors object
		const errors: Record<string, string> = {};

		// Validate title
		if (!title) {
			errors.title = 'Title is required';
		}

		// Validate year
		const currentYear = new Date().getFullYear();
		if (year !== null) {
			if (isNaN(year) || year < 1 || year > currentYear + 1) {
				errors.year = `Year must be between 1 and ${currentYear + 1}`;
			}
		}

		// Validate player count
		if (minPlayers !== null && maxPlayers !== null) {
			if (minPlayers > maxPlayers) {
				errors.players = 'Min players cannot be greater than max players';
			}
		}

		// Validate play time
		if (playTimeMin !== null && playTimeMax !== null) {
			if (playTimeMin > playTimeMax) {
				errors.playTime = 'Min play time cannot be greater than max play time';
			}
		}

		// Validate BGG rating (must be between 0 and 10)
		if (bggRating !== null) {
			if (isNaN(bggRating) || bggRating < 0 || bggRating > 10) {
				errors.bggRating = 'BGG Rating must be between 0 and 10';
			}
		}

		// Validate BGG rank (must be positive integer)
		if (bggRank !== null) {
			if (isNaN(bggRank) || bggRank < 1) {
				errors.bggRank = 'BGG Rank must be a positive number';
			}
		}

		// Return validation errors if any
		if (Object.keys(errors).length > 0) {
			return fail(400, {
				addError: 'Please correct the errors below',
				errors,
				// Preserve form values
				title,
				publisher,
				year: yearStr,
				minPlayers: minPlayersStr,
				maxPlayers: maxPlayersStr,
				playTimeMin: playTimeMinStr,
				playTimeMax: playTimeMaxStr,
				description,
				categories: categoriesStr,
				bggRating: bggRatingStr,
				bggRank: bggRankStr
			});
		}

		try {
			// Create the game in the database
			await createGame(locals.user.id, {
				title: title!,
				year,
				minPlayers,
				maxPlayers,
				playTimeMin,
				playTimeMax,
				description,
				categories,
				bggRating,
				bggRank
			});

			// Return success - the client will redirect
			return {
				added: true
			};
		} catch (error) {
			console.error('Error creating game:', error);
			return fail(500, {
				addError: 'Failed to add game to library. Please try again.',
				title,
				publisher,
				year: yearStr,
				minPlayers: minPlayersStr,
				maxPlayers: maxPlayersStr,
				playTimeMin: playTimeMinStr,
				playTimeMax: playTimeMaxStr,
				description,
				categories: categoriesStr,
				bggRating: bggRatingStr,
				bggRank: bggRankStr
			});
		}
	}
};
