import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { analyzeGameImage, type ExtractedGameData } from '$lib/server/gemini';
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
		const file = formData.get('image') as File | null;

		// Validate file presence
		if (!file || file.size === 0) {
			return fail(400, {
				error: 'Please select an image file to upload'
			});
		}

		// Validate file type
		const mimeType = file.type.toLowerCase();
		if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
			return fail(400, {
				error: 'Invalid file type. Please upload a JPG, PNG, or HEIC image.'
			});
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
			return fail(400, {
				error: `File size (${sizeMB}MB) exceeds the 10MB limit.`
			});
		}

		// Convert file to base64 for storage/transmission
		const arrayBuffer = await file.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString('base64');
		const dataUrl = `data:${file.type};base64,${base64}`;

		// Return success with image data for preview and AI analysis
		return {
			success: true,
			imageData: dataUrl,
			fileName: file.name,
			fileSize: file.size,
			mimeType: file.type
		};
	},

	analyze: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const imageData = formData.get('imageData') as string | null;
		const mimeType = formData.get('mimeType') as string | null;

		// Validate image data
		if (!imageData || !mimeType) {
			return fail(400, {
				analyzeError: 'No image data provided for analysis'
			});
		}

		// Extract base64 data from data URL
		const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
		if (!base64Match) {
			return fail(400, {
				analyzeError: 'Invalid image data format'
			});
		}

		const base64Data = base64Match[2];

		// Call Gemini AI for analysis
		const result = await analyzeGameImage(base64Data, mimeType);

		if (!result.success) {
			return fail(500, {
				analyzeError: result.error || 'Failed to analyze the image'
			});
		}

		// Return the extracted game data
		return {
			analyzed: true,
			gameData: result.data as ExtractedGameData,
			confidence: result.data?.confidence || 'low'
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

		// Parse numeric values
		const year = yearStr ? parseInt(yearStr, 10) : null;
		const minPlayers = minPlayersStr ? parseInt(minPlayersStr, 10) : null;
		const maxPlayers = maxPlayersStr ? parseInt(maxPlayersStr, 10) : null;
		const playTimeMin = playTimeMinStr ? parseInt(playTimeMinStr, 10) : null;
		const playTimeMax = playTimeMaxStr ? parseInt(playTimeMaxStr, 10) : null;

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
				playTimeMax: playTimeMaxStr
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
				playTimeMax
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
				playTimeMax: playTimeMaxStr
			});
		}
	}
};
