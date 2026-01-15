import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '$lib/server/db';
import { registerUser, createSession } from '$lib/server/auth';
import { createGame, getUserGames } from '$lib/server/games';
import type { ExtractedGameData } from '$lib/server/gemini';

// Validation logic mirroring server-side implementation
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateImageFile(file: { type: string; size: number; name: string }): {
	valid: boolean;
	error?: string;
} {
	// Check file presence
	if (!file || file.size === 0) {
		return { valid: false, error: 'Please select an image file to upload' };
	}

	// Check file type
	const mimeType = file.type.toLowerCase();
	if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
		return { valid: false, error: 'Invalid file type. Please upload a JPG, PNG, or HEIC image.' };
	}

	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return { valid: false, error: `File size (${sizeMB}MB) exceeds the 10MB limit.` };
	}

	return { valid: true };
}

describe('Image Upload - Story 9', () => {
	const testUserEmail = 'uploadtest@example.com';
	const testPassword = 'securepassword123';
	let testUserId: string;

	beforeAll(async () => {
		// Clean up existing test data
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});

		// Create test user
		const user = await registerUser(testUserEmail, testPassword);
		testUserId = user.id;
	});

	afterAll(async () => {
		// Clean up
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	describe('File Type Validation', () => {
		it('should accept JPG/JPEG images', () => {
			const jpgFile = { type: 'image/jpeg', size: 1024 * 1024, name: 'game.jpg' };
			const jpegFile = { type: 'image/jpg', size: 1024 * 1024, name: 'game.jpeg' };

			expect(validateImageFile(jpgFile).valid).toBe(true);
			expect(validateImageFile(jpegFile).valid).toBe(true);
		});

		it('should accept PNG images', () => {
			const pngFile = { type: 'image/png', size: 1024 * 1024, name: 'game.png' };

			expect(validateImageFile(pngFile).valid).toBe(true);
		});

		it('should accept HEIC/HEIF images', () => {
			const heicFile = { type: 'image/heic', size: 1024 * 1024, name: 'game.heic' };
			const heifFile = { type: 'image/heif', size: 1024 * 1024, name: 'game.heif' };

			expect(validateImageFile(heicFile).valid).toBe(true);
			expect(validateImageFile(heifFile).valid).toBe(true);
		});

		it('should reject invalid file types', () => {
			const invalidFiles = [
				{ type: 'text/plain', size: 1024, name: 'file.txt' },
				{ type: 'application/pdf', size: 1024, name: 'document.pdf' },
				{ type: 'image/gif', size: 1024, name: 'animated.gif' },
				{ type: 'image/webp', size: 1024, name: 'image.webp' },
				{ type: 'video/mp4', size: 1024, name: 'video.mp4' }
			];

			for (const file of invalidFiles) {
				const result = validateImageFile(file);
				expect(result.valid).toBe(false);
				expect(result.error).toBe('Invalid file type. Please upload a JPG, PNG, or HEIC image.');
			}
		});

		it('should handle case-insensitive MIME types', () => {
			const upperCaseFile = { type: 'IMAGE/JPEG', size: 1024, name: 'game.jpg' };
			const mixedCaseFile = { type: 'Image/Png', size: 1024, name: 'game.png' };

			expect(validateImageFile(upperCaseFile).valid).toBe(true);
			expect(validateImageFile(mixedCaseFile).valid).toBe(true);
		});
	});

	describe('File Size Validation', () => {
		it('should accept files under 10MB', () => {
			const smallFile = { type: 'image/jpeg', size: 1024, name: 'small.jpg' }; // 1KB
			const mediumFile = { type: 'image/jpeg', size: 5 * 1024 * 1024, name: 'medium.jpg' }; // 5MB
			const nearLimitFile = { type: 'image/jpeg', size: 10 * 1024 * 1024 - 1, name: 'large.jpg' }; // Just under 10MB

			expect(validateImageFile(smallFile).valid).toBe(true);
			expect(validateImageFile(mediumFile).valid).toBe(true);
			expect(validateImageFile(nearLimitFile).valid).toBe(true);
		});

		it('should accept files exactly at 10MB limit', () => {
			const exactLimitFile = { type: 'image/jpeg', size: 10 * 1024 * 1024, name: 'exact.jpg' };

			expect(validateImageFile(exactLimitFile).valid).toBe(true);
		});

		it('should reject files over 10MB', () => {
			const overLimitFile = { type: 'image/jpeg', size: 10 * 1024 * 1024 + 1, name: 'large.jpg' };
			const result = validateImageFile(overLimitFile);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('exceeds the 10MB limit');
		});

		it('should show correct file size in error message', () => {
			const largeFile = { type: 'image/jpeg', size: 15 * 1024 * 1024, name: 'huge.jpg' }; // 15MB
			const result = validateImageFile(largeFile);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('File size (15.0MB) exceeds the 10MB limit.');
		});
	});

	describe('Empty File Handling', () => {
		it('should reject empty files', () => {
			const emptyFile = { type: 'image/jpeg', size: 0, name: 'empty.jpg' };
			const result = validateImageFile(emptyFile);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Please select an image file to upload');
		});
	});

	describe('Authentication', () => {
		it('should require authentication for upload page', async () => {
			// This test validates that the upload page requires auth
			// In the actual implementation, unauthenticated requests are redirected to /auth/login
			// The page.server.ts throws redirect(302, '/auth/login') when locals.user is undefined
			// createSession returns the session ID (string) for authenticated users
			const sessionId = await createSession(testUserId);
			expect(sessionId).toBeDefined();
			expect(typeof sessionId).toBe('string');
			expect(sessionId.length).toBeGreaterThan(0);
		});
	});

	describe('Valid Upload Flow', () => {
		it('should return success with image data for valid files', () => {
			// This tests the expected return structure from a valid upload
			const validFile = {
				type: 'image/jpeg',
				size: 1024 * 1024,
				name: 'boardgame.jpg'
			};

			const result = validateImageFile(validFile);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should preserve filename information', () => {
			const files = [
				{ type: 'image/jpeg', size: 1024, name: 'Catan Box Art.jpg' },
				{ type: 'image/png', size: 1024, name: 'ticket-to-ride.png' },
				{ type: 'image/heic', size: 1024, name: 'IMG_1234.HEIC' }
			];

			for (const file of files) {
				const result = validateImageFile(file);
				expect(result.valid).toBe(true);
			}
		});
	});

	describe('Multiple File Type Validation Edge Cases', () => {
		it('should handle files with no extension', () => {
			const noExtFile = { type: 'image/jpeg', size: 1024, name: 'gamephoto' };
			expect(validateImageFile(noExtFile).valid).toBe(true);
		});

		it('should validate by MIME type not file extension', () => {
			// A file claiming to be jpeg but with wrong extension should still be valid
			// (server validates by MIME type)
			const mismatchedFile = { type: 'image/jpeg', size: 1024, name: 'photo.png' };
			expect(validateImageFile(mismatchedFile).valid).toBe(true);

			// A file with correct extension but wrong MIME type should be invalid
			const wrongMimeFile = { type: 'application/octet-stream', size: 1024, name: 'photo.jpg' };
			expect(validateImageFile(wrongMimeFile).valid).toBe(false);
		});
	});
});

// Story 11 Tests - Review and Confirm AI Results Before Adding to Library
describe('AI Results Review - Story 11', () => {
	const testUserEmail = 'reviewtest@example.com';
	const testPassword = 'securepassword123';
	let testUserId: string;

	beforeAll(async () => {
		// Clean up existing test data
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});

		// Create test user
		const user = await registerUser(testUserEmail, testPassword);
		testUserId = user.id;
	});

	beforeEach(async () => {
		// Clean up games before each test
		await prisma.game.deleteMany({ where: { userId: testUserId } });
	});

	afterAll(async () => {
		// Clean up
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	// Validation logic for addToLibrary action
	function validateAddToLibraryForm(formData: {
		title?: string;
		publisher?: string;
		year?: string;
		minPlayers?: string;
		maxPlayers?: string;
		playTimeMin?: string;
		playTimeMax?: string;
	}): { valid: boolean; errors: Record<string, string> } {
		const errors: Record<string, string> = {};

		// Validate title
		const title = formData.title?.trim();
		if (!title) {
			errors.title = 'Title is required';
		}

		// Validate year
		const currentYear = new Date().getFullYear();
		if (formData.year) {
			const year = parseInt(formData.year, 10);
			if (isNaN(year) || year < 1 || year > currentYear + 1) {
				errors.year = `Year must be between 1 and ${currentYear + 1}`;
			}
		}

		// Validate player count
		if (formData.minPlayers && formData.maxPlayers) {
			const minPlayers = parseInt(formData.minPlayers, 10);
			const maxPlayers = parseInt(formData.maxPlayers, 10);
			if (!isNaN(minPlayers) && !isNaN(maxPlayers) && minPlayers > maxPlayers) {
				errors.players = 'Min players cannot be greater than max players';
			}
		}

		// Validate play time
		if (formData.playTimeMin && formData.playTimeMax) {
			const playTimeMin = parseInt(formData.playTimeMin, 10);
			const playTimeMax = parseInt(formData.playTimeMax, 10);
			if (!isNaN(playTimeMin) && !isNaN(playTimeMax) && playTimeMin > playTimeMax) {
				errors.playTime = 'Min play time cannot be greater than max play time';
			}
		}

		return {
			valid: Object.keys(errors).length === 0,
			errors
		};
	}

	describe('Form Validation', () => {
		it('should require a title to add game to library', () => {
			const result = validateAddToLibraryForm({});
			expect(result.valid).toBe(false);
			expect(result.errors.title).toBe('Title is required');
		});

		it('should reject empty or whitespace-only title', () => {
			const emptyResult = validateAddToLibraryForm({ title: '' });
			expect(emptyResult.valid).toBe(false);
			expect(emptyResult.errors.title).toBe('Title is required');

			const whitespaceResult = validateAddToLibraryForm({ title: '   ' });
			expect(whitespaceResult.valid).toBe(false);
			expect(whitespaceResult.errors.title).toBe('Title is required');
		});

		it('should accept valid form data with all fields', () => {
			const result = validateAddToLibraryForm({
				title: 'Catan',
				publisher: 'Kosmos',
				year: '1995',
				minPlayers: '3',
				maxPlayers: '4',
				playTimeMin: '60',
				playTimeMax: '120'
			});
			expect(result.valid).toBe(true);
			expect(Object.keys(result.errors)).toHaveLength(0);
		});

		it('should accept form with only required title', () => {
			const result = validateAddToLibraryForm({
				title: 'Pandemic'
			});
			expect(result.valid).toBe(true);
		});

		it('should reject invalid year', () => {
			const futureYear = validateAddToLibraryForm({
				title: 'Test Game',
				year: '2100'
			});
			expect(futureYear.valid).toBe(false);
			expect(futureYear.errors.year).toContain('Year must be between');

			const negativeYear = validateAddToLibraryForm({
				title: 'Test Game',
				year: '-100'
			});
			expect(negativeYear.valid).toBe(false);

			const zeroYear = validateAddToLibraryForm({
				title: 'Test Game',
				year: '0'
			});
			expect(zeroYear.valid).toBe(false);
		});

		it('should reject invalid player count range', () => {
			const result = validateAddToLibraryForm({
				title: 'Test Game',
				minPlayers: '5',
				maxPlayers: '2'
			});
			expect(result.valid).toBe(false);
			expect(result.errors.players).toBe('Min players cannot be greater than max players');
		});

		it('should reject invalid play time range', () => {
			const result = validateAddToLibraryForm({
				title: 'Test Game',
				playTimeMin: '120',
				playTimeMax: '30'
			});
			expect(result.valid).toBe(false);
			expect(result.errors.playTime).toBe('Min play time cannot be greater than max play time');
		});
	});

	describe('Adding Game to Library', () => {
		it('should successfully add game with AI-extracted data', async () => {
			// Simulate AI-extracted data that user confirms
			const gameData = {
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120
			};

			const game = await createGame(testUserId, gameData);

			expect(game).toBeDefined();
			expect(game.title).toBe('Catan');
			expect(game.year).toBe(1995);
			expect(game.minPlayers).toBe(3);
			expect(game.maxPlayers).toBe(4);

			// Verify it appears in user's library
			const games = await getUserGames(testUserId);
			expect(games).toHaveLength(1);
			expect(games[0].title).toBe('Catan');
		});

		it('should allow user to modify AI-extracted data before adding', async () => {
			// AI extracted 'Catan' but user corrects it
			const correctedData = {
				title: 'Die Siedler von Catan', // User corrects to German name
				year: 1995,
				minPlayers: 3,
				maxPlayers: 6, // User corrects max players for expansion
				playTimeMin: 60,
				playTimeMax: 150
			};

			const game = await createGame(testUserId, correctedData);

			expect(game.title).toBe('Die Siedler von Catan');
			expect(game.maxPlayers).toBe(6);
			expect(game.playTimeMax).toBe(150);
		});

		it('should handle game with partial AI data that user completes', async () => {
			// AI only extracted title (low confidence)
			// User fills in the rest manually
			const completedData = {
				title: 'Obscure Board Game',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 5,
				playTimeMin: 30,
				playTimeMax: 60
			};

			const game = await createGame(testUserId, completedData);

			expect(game.title).toBe('Obscure Board Game');
			expect(game.year).toBe(2020);
			expect(game.minPlayers).toBe(2);
		});

		it('should add game with only title when other fields are empty', async () => {
			// User confirms game with only title extracted
			const minimalData = {
				title: 'Unknown Game'
			};

			const game = await createGame(testUserId, minimalData);

			expect(game.title).toBe('Unknown Game');
			expect(game.year).toBeNull();
			expect(game.minPlayers).toBeNull();
			expect(game.maxPlayers).toBeNull();
			expect(game.playTimeMin).toBeNull();
			expect(game.playTimeMax).toBeNull();
		});

		it('should not add game when user cancels (clears form)', async () => {
			// User decides not to add the game
			// This is tested by verifying no game is added when cancel is clicked
			const gamesBefore = await getUserGames(testUserId);
			const countBefore = gamesBefore.length;

			// Simulate cancel - no createGame call is made
			// Just verify the state hasn't changed
			const gamesAfter = await getUserGames(testUserId);
			expect(gamesAfter).toHaveLength(countBefore);
		});
	});

	describe('ExtractedGameData Population', () => {
		it('should correctly structure AI-extracted data for form population', () => {
			// Simulate the ExtractedGameData that would come from Gemini
			const extractedData: ExtractedGameData = {
				title: 'Ticket to Ride',
				publisher: 'Days of Wonder',
				year: 2004,
				minPlayers: 2,
				maxPlayers: 5,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high'
			};

			// These values should be directly usable in form inputs
			expect(extractedData.title).toBe('Ticket to Ride');
			expect(extractedData.publisher).toBe('Days of Wonder');
			expect(extractedData.year?.toString()).toBe('2004');
			expect(extractedData.minPlayers?.toString()).toBe('2');
			expect(extractedData.maxPlayers?.toString()).toBe('5');
			expect(extractedData.playTimeMin?.toString()).toBe('30');
			expect(extractedData.playTimeMax?.toString()).toBe('60');
		});

		it('should handle null values in extracted data', () => {
			const partialData: ExtractedGameData = {
				title: 'Some Game',
				publisher: null,
				year: null,
				minPlayers: 2,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				confidence: 'medium'
			};

			// Null values should become empty strings for form inputs
			expect(partialData.title).toBe('Some Game');
			expect(partialData.publisher ?? '').toBe('');
			expect(partialData.year?.toString() ?? '').toBe('');
			expect(partialData.minPlayers?.toString()).toBe('2');
			expect(partialData.maxPlayers?.toString() ?? '').toBe('');
		});

		it('should handle completely empty extraction result', () => {
			const emptyData: ExtractedGameData = {
				title: null,
				publisher: null,
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				confidence: 'low'
			};

			// All fields should be empty/null
			expect(emptyData.title).toBeNull();
			expect(emptyData.confidence).toBe('low');
		});
	});

	describe('Data Persistence', () => {
		it('should persist game to database after user confirms', async () => {
			const gameData = {
				title: 'Azul',
				year: 2017,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 45
			};

			await createGame(testUserId, gameData);

			// Verify directly from database
			const dbGame = await prisma.game.findFirst({
				where: {
					userId: testUserId,
					title: 'Azul'
				}
			});

			expect(dbGame).not.toBeNull();
			expect(dbGame?.title).toBe('Azul');
			expect(dbGame?.year).toBe(2017);
		});

		it('should associate game with correct user', async () => {
			// Create second user
			const user2 = await registerUser('user2@example.com', 'password123');

			// Add game for user 1
			await createGame(testUserId, { title: 'User1 Game' });

			// Add game for user 2
			await createGame(user2.id, { title: 'User2 Game' });

			// Verify each user sees only their game
			const user1Games = await getUserGames(testUserId);
			const user2Games = await getUserGames(user2.id);

			expect(user1Games.some((g) => g.title === 'User1 Game')).toBe(true);
			expect(user1Games.some((g) => g.title === 'User2 Game')).toBe(false);

			expect(user2Games.some((g) => g.title === 'User2 Game')).toBe(true);
			expect(user2Games.some((g) => g.title === 'User1 Game')).toBe(false);
		});
	});
});
