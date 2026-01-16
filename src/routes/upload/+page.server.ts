import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { analyzeGameImage, type ExtractedGameData } from '$lib/server/gemini';
import { searchGames, type Game } from '$lib/server/games';
import { addExistingGameToLibrary, isGameInLibrary } from '$lib/server/library-games';

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

		// Extended game result type that includes catalog match info
		interface GameWithCatalogMatch extends ExtractedGameData {
			catalogMatch: Game | null;
			alreadyInLibrary: boolean;
		}

		// Analyze all images - each image can now contain multiple games
		const results: Array<{
			success: boolean;
			games: GameWithCatalogMatch[];
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
				const validGames = result.games.filter((g) => g.title && g.title.trim() !== '');

				// Search the catalog for each detected game
				const gamesWithMatches: GameWithCatalogMatch[] = [];
				for (const game of validGames) {
					// Search catalog by exact title first
					const searchResults = await searchGames(locals.supabase, game.title!);

					// Find exact match (case-insensitive) or close match
					let catalogMatch: Game | null = null;
					if (searchResults.length > 0) {
						// Try exact match first
						const exactMatch = searchResults.find(
							(r) => r.title.toLowerCase() === game.title!.toLowerCase()
						);
						if (exactMatch) {
							catalogMatch = exactMatch;
						} else {
							// Otherwise use first search result as close match
							catalogMatch = searchResults[0];
						}
					}

					// Check if the matched game is already in user's library
					let alreadyInLibrary = false;
					if (catalogMatch) {
						alreadyInLibrary = await isGameInLibrary(locals.supabase, catalogMatch.id);
					}

					gamesWithMatches.push({
						...game,
						catalogMatch,
						alreadyInLibrary
					});
				}

				totalGamesFound += gamesWithMatches.length;
				results.push({
					success: true,
					games: gamesWithMatches,
					gameCount: gamesWithMatches.length,
					error: null,
					fileName: image.fileName
				});
			}
		}

		// Return all results with multi-game and catalog match support
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

		// Extended type with catalog match info
		interface GameWithCatalogMatch extends ExtractedGameData {
			catalogMatch?: {
				id: string;
				title: string;
				[key: string]: unknown;
			} | null;
			alreadyInLibrary?: boolean;
		}

		let games: GameWithCatalogMatch[];
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
		const skippedGames: string[] = [];
		const errors: string[] = [];

		for (const gameData of games) {
			// Validate title
			if (!gameData.title || gameData.title.trim() === '') {
				errors.push('A game is missing a title');
				continue;
			}

			// Skip games already in library
			if (gameData.alreadyInLibrary) {
				skippedGames.push(gameData.title);
				continue;
			}

			// Only allow adding games that exist in the catalog
			if (!gameData.catalogMatch || !gameData.catalogMatch.id) {
				// Game not in catalog - skip (only admins can create new catalog entries)
				skippedGames.push(gameData.title);
				continue;
			}

			try {
				// Game exists in catalog - add to library using existing catalog entry
				const result = await addExistingGameToLibrary(
					locals.supabase,
					locals.user.id,
					gameData.catalogMatch.id,
					{
						playCount: 0,
						personalRating: null,
						review: null
					}
				);

				if (result) {
					addedGames.push(gameData.catalogMatch.title || gameData.title);
				} else {
					errors.push(`Failed to add ${gameData.title} to library`);
				}
			} catch (error) {
				console.error('Error adding game:', error);
				errors.push(`Failed to add ${gameData.title}`);
			}
		}

		if (addedGames.length === 0 && skippedGames.length === 0) {
			return fail(500, {
				addError: 'Failed to add any games. Please try again.'
			});
		}

		// Return success
		return {
			added: true,
			addedCount: addedGames.length,
			addedGames,
			skippedCount: skippedGames.length,
			skippedGames
		};
	},

	/**
	 * Search the catalog for matching games manually
	 */
	searchCatalog: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const query = formData.get('query')?.toString().trim() ?? '';

		if (!query) {
			return {
				searchResults: [],
				searchQuery: ''
			};
		}

		// Search the shared catalog
		const results = await searchGames(locals.supabase, query);

		// Check which games are already in the user's library
		const resultsWithLibraryStatus = await Promise.all(
			results.map(async (game) => ({
				...game,
				alreadyInLibrary: await isGameInLibrary(locals.supabase, game.id)
			}))
		);

		return {
			catalogSearchResults: resultsWithLibraryStatus,
			catalogSearchQuery: query
		};
	}
};
