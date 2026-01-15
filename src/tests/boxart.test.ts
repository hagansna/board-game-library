import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import {
	isValidImageUrl,
	isValidImageFile,
	saveBoxArtFile,
	deleteBoxArtFile,
	isLocalBoxArt
} from '$lib/server/boxart';

// Test directory for uploads
const TEST_UPLOADS_DIR = 'static/uploads/boxart';

describe('Box Art Utilities', () => {
	beforeEach(() => {
		// Ensure test upload directory exists
		if (!existsSync(TEST_UPLOADS_DIR)) {
			mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
		}
	});

	describe('isValidImageUrl', () => {
		it('accepts valid https image URLs', () => {
			expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
			expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
			expect(isValidImageUrl('https://example.com/image.webp')).toBe(true);
			expect(isValidImageUrl('https://cdn.example.com/images/game.jpeg')).toBe(true);
		});

		it('accepts valid http image URLs', () => {
			expect(isValidImageUrl('http://example.com/image.jpg')).toBe(true);
			expect(isValidImageUrl('http://example.com/path/to/image.png')).toBe(true);
		});

		it('accepts URLs without image extensions (CDNs)', () => {
			expect(isValidImageUrl('https://images.example.com/abc123')).toBe(true);
			expect(isValidImageUrl('https://cdn.example.com/image')).toBe(true);
		});

		it('rejects non-http/https protocols', () => {
			expect(isValidImageUrl('ftp://example.com/image.jpg')).toBe(false);
			expect(isValidImageUrl('file:///path/to/image.jpg')).toBe(false);
			expect(isValidImageUrl('data:image/png;base64,abc')).toBe(false);
		});

		it('rejects invalid URLs', () => {
			expect(isValidImageUrl('not-a-url')).toBe(false);
			expect(isValidImageUrl('')).toBe(false);
			expect(isValidImageUrl('example.com/image.jpg')).toBe(false);
		});
	});

	describe('isValidImageFile', () => {
		function createMockFile(name: string, type: string, size: number): File {
			const buffer = new ArrayBuffer(size);
			const blob = new Blob([buffer], { type });
			return new File([blob], name, { type });
		}

		it('accepts valid JPG files', () => {
			const file = createMockFile('test.jpg', 'image/jpeg', 1024);
			const result = isValidImageFile(file);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('accepts valid PNG files', () => {
			const file = createMockFile('test.png', 'image/png', 1024);
			const result = isValidImageFile(file);
			expect(result.valid).toBe(true);
		});

		it('accepts valid WebP files', () => {
			const file = createMockFile('test.webp', 'image/webp', 1024);
			const result = isValidImageFile(file);
			expect(result.valid).toBe(true);
		});

		it('rejects files with invalid MIME types', () => {
			const file = createMockFile('test.gif', 'image/gif', 1024);
			const result = isValidImageFile(file);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid file type');
		});

		it('rejects files that exceed size limit (5MB)', () => {
			const file = createMockFile('test.jpg', 'image/jpeg', 6 * 1024 * 1024);
			const result = isValidImageFile(file);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('File too large');
		});

		it('accepts files at exactly 5MB', () => {
			const file = createMockFile('test.jpg', 'image/jpeg', 5 * 1024 * 1024);
			const result = isValidImageFile(file);
			expect(result.valid).toBe(true);
		});

		it('rejects files with invalid extensions', () => {
			const file = createMockFile('test.gif', 'image/jpeg', 1024);
			const result = isValidImageFile(file);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid file extension');
		});

		it('accepts .jpeg extension', () => {
			const file = createMockFile('test.jpeg', 'image/jpeg', 1024);
			const result = isValidImageFile(file);
			expect(result.valid).toBe(true);
		});
	});

	describe('saveBoxArtFile', () => {
		const testFiles: string[] = [];

		afterEach(async () => {
			// Clean up test files
			for (const filepath of testFiles) {
				try {
					if (existsSync(filepath)) {
						rmSync(filepath);
					}
				} catch {
					// Ignore cleanup errors
				}
			}
			testFiles.length = 0;
		});

		// Create a proper File-like object with arrayBuffer method for Node.js tests
		function createMockFile(name: string, type: string, size: number): File {
			const buffer = new ArrayBuffer(size);
			const view = new Uint8Array(buffer);
			for (let i = 0; i < size; i++) {
				view[i] = i % 256;
			}

			// Create a proper File object that works in Node.js
			const file = {
				name,
				type,
				size,
				lastModified: Date.now(),
				arrayBuffer: async () => buffer,
				text: async () => '',
				slice: () => new Blob([buffer], { type }),
				stream: () => new ReadableStream()
			} as unknown as File;

			return file;
		}

		it('saves a valid image file and returns URL', async () => {
			const file = createMockFile('test.jpg', 'image/jpeg', 1024);
			const result = await saveBoxArtFile(file, 'test-user-123');

			expect(result.success).toBe(true);
			expect(result.url).toBeDefined();
			expect(result.url).toMatch(/^\/uploads\/boxart\/test-user-123-[a-f0-9]+\.jpg$/);

			// Track file for cleanup using resolved path
			if (result.url) {
				const filepath = path.resolve('static', result.url.slice(1)); // Remove leading slash
				testFiles.push(filepath);
				expect(existsSync(filepath)).toBe(true);
			}
		});

		it('returns error for invalid file type', async () => {
			const file = createMockFile('test.gif', 'image/gif', 1024);
			const result = await saveBoxArtFile(file, 'test-user-123');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid file type');
		});

		it('returns error for oversized file', async () => {
			const file = createMockFile('test.jpg', 'image/jpeg', 6 * 1024 * 1024);
			const result = await saveBoxArtFile(file, 'test-user-123');

			expect(result.success).toBe(false);
			expect(result.error).toContain('File too large');
		});

		it('generates unique filenames for same user', async () => {
			const file1 = createMockFile('image1.jpg', 'image/jpeg', 512);
			const file2 = createMockFile('image2.jpg', 'image/jpeg', 512);

			const result1 = await saveBoxArtFile(file1, 'same-user');
			const result2 = await saveBoxArtFile(file2, 'same-user');

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(result1.url).not.toBe(result2.url);

			// Track files for cleanup using resolved paths
			if (result1.url) testFiles.push(path.resolve('static', result1.url.slice(1)));
			if (result2.url) testFiles.push(path.resolve('static', result2.url.slice(1)));
		});
	});

	describe('deleteBoxArtFile', () => {
		it('returns false for non-local URLs', async () => {
			const result = await deleteBoxArtFile('https://example.com/image.jpg');
			expect(result).toBe(false);
		});

		it('returns false for empty URL', async () => {
			const result = await deleteBoxArtFile('');
			expect(result).toBe(false);
		});

		it('returns false for non-existent file', async () => {
			const result = await deleteBoxArtFile('/uploads/boxart/nonexistent.jpg');
			expect(result).toBe(false);
		});
	});

	describe('isLocalBoxArt', () => {
		it('returns true for local upload paths', () => {
			expect(isLocalBoxArt('/uploads/boxart/abc123.jpg')).toBe(true);
			expect(isLocalBoxArt('/uploads/boxart/user-image.png')).toBe(true);
		});

		it('returns false for external URLs', () => {
			expect(isLocalBoxArt('https://example.com/image.jpg')).toBe(false);
			expect(isLocalBoxArt('http://cdn.example.com/boxart.png')).toBe(false);
		});

		it('returns false for null/undefined/empty', () => {
			expect(isLocalBoxArt(null)).toBe(false);
			expect(isLocalBoxArt(undefined)).toBe(false);
			expect(isLocalBoxArt('')).toBe(false);
		});

		it('returns false for other local paths', () => {
			expect(isLocalBoxArt('/images/logo.png')).toBe(false);
			expect(isLocalBoxArt('/uploads/other/file.jpg')).toBe(false);
		});
	});
});

describe('Box Art in Games CRUD', () => {
	// Import after describe to ensure proper module loading
	let prisma: typeof import('$lib/server/db').prisma;
	let createGame: typeof import('$lib/server/games').createGame;
	let getGameById: typeof import('$lib/server/games').getGameById;
	let updateGame: typeof import('$lib/server/games').updateGame;
	let getUserGames: typeof import('$lib/server/games').getUserGames;
	let testUserId: string;

	beforeEach(async () => {
		const dbModule = await import('$lib/server/db');
		const gamesModule = await import('$lib/server/games');
		prisma = dbModule.prisma;
		createGame = gamesModule.createGame;
		getGameById = gamesModule.getGameById;
		updateGame = gamesModule.updateGame;
		getUserGames = gamesModule.getUserGames;

		// Create a test user for games
		const user = await prisma.user.create({
			data: {
				email: `boxart-test-${Date.now()}@test.com`,
				passwordHash: 'test-hash'
			}
		});
		testUserId = user.id;
	});

	afterEach(async () => {
		// Clean up test data - delete games first due to foreign key
		if (testUserId) {
			await prisma.game.deleteMany({
				where: { userId: testUserId }
			});
			await prisma.user.delete({
				where: { id: testUserId }
			});
		}
	});

	it('creates game with boxArtUrl', async () => {
		const game = await createGame(testUserId, {
			title: 'Test Game',
			boxArtUrl: 'https://example.com/boxart.jpg'
		});

		expect(game.boxArtUrl).toBe('https://example.com/boxart.jpg');
	});

	it('creates game without boxArtUrl', async () => {
		const game = await createGame(testUserId, {
			title: 'No Art Game'
		});

		expect(game.boxArtUrl).toBeNull();
	});

	it('retrieves game with boxArtUrl', async () => {
		const created = await createGame(testUserId, {
			title: 'Get Test Game',
			boxArtUrl: '/uploads/boxart/test.jpg'
		});

		const retrieved = await getGameById(created.id, testUserId);
		expect(retrieved).not.toBeNull();
		expect(retrieved?.boxArtUrl).toBe('/uploads/boxart/test.jpg');
	});

	it('updates game boxArtUrl', async () => {
		const created = await createGame(testUserId, {
			title: 'Update Test Game',
			boxArtUrl: 'https://old.example.com/old.jpg'
		});

		const updated = await updateGame(created.id, testUserId, {
			title: 'Update Test Game',
			boxArtUrl: 'https://new.example.com/new.jpg'
		});

		expect(updated?.boxArtUrl).toBe('https://new.example.com/new.jpg');
	});

	it('removes game boxArtUrl by setting to null', async () => {
		const created = await createGame(testUserId, {
			title: 'Remove Art Game',
			boxArtUrl: 'https://example.com/art.jpg'
		});

		const updated = await updateGame(created.id, testUserId, {
			title: 'Remove Art Game',
			boxArtUrl: null
		});

		expect(updated?.boxArtUrl).toBeNull();
	});

	it('includes boxArtUrl in getUserGames', async () => {
		await createGame(testUserId, {
			title: 'Game 1',
			boxArtUrl: 'https://example.com/game1.jpg'
		});
		await createGame(testUserId, {
			title: 'Game 2',
			boxArtUrl: null
		});

		const games = await getUserGames(testUserId);
		expect(games).toHaveLength(2);

		const game1 = games.find((g) => g.title === 'Game 1');
		const game2 = games.find((g) => g.title === 'Game 2');

		expect(game1?.boxArtUrl).toBe('https://example.com/game1.jpg');
		expect(game2?.boxArtUrl).toBeNull();
	});
});
