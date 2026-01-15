import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '$lib/server/db';
import { createGame, getGameById, getUserGames, updateGame } from '$lib/server/games';

// Helper to create a test user
async function createTestUser(email: string) {
	return prisma.user.create({
		data: {
			email,
			passwordHash: 'test-hash'
		}
	});
}

// Helper to cleanup test data
async function cleanupTestData() {
	await prisma.game.deleteMany({});
	await prisma.session.deleteMany({});
	await prisma.user.deleteMany({});
}

describe('Story 21: Game data model stores additional AI-provided fields', () => {
	beforeEach(async () => {
		await cleanupTestData();
	});

	afterEach(async () => {
		await cleanupTestData();
	});

	describe('Database schema includes new fields', () => {
		it('should create game with description field', async () => {
			const user = await createTestUser('test@example.com');
			const game = await createGame(user.id, {
				title: 'Test Game',
				description: 'A classic strategy game about trading and building settlements.'
			});

			expect(game.description).toBe(
				'A classic strategy game about trading and building settlements.'
			);
		});

		it('should create game with categories field as JSON string', async () => {
			const user = await createTestUser('test@example.com');
			const categories = JSON.stringify(['strategy', 'trading', 'family']);
			const game = await createGame(user.id, {
				title: 'Test Game',
				categories
			});

			expect(game.categories).toBe(categories);
			expect(JSON.parse(game.categories!)).toEqual(['strategy', 'trading', 'family']);
		});

		it('should create game with bggRating field (decimal)', async () => {
			const user = await createTestUser('test@example.com');
			const game = await createGame(user.id, {
				title: 'Test Game',
				bggRating: 7.5
			});

			expect(game.bggRating).toBe(7.5);
		});

		it('should create game with bggRank field (integer)', async () => {
			const user = await createTestUser('test@example.com');
			const game = await createGame(user.id, {
				title: 'Test Game',
				bggRank: 150
			});

			expect(game.bggRank).toBe(150);
		});

		it('should create game with all new fields populated', async () => {
			const user = await createTestUser('test@example.com');
			const categories = JSON.stringify(['strategy', 'economic']);
			const game = await createGame(user.id, {
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				description: 'Trade, build, and settle the island of Catan.',
				categories,
				bggRating: 7.2,
				bggRank: 403
			});

			expect(game.title).toBe('Catan');
			expect(game.description).toBe('Trade, build, and settle the island of Catan.');
			expect(game.categories).toBe(categories);
			expect(game.bggRating).toBe(7.2);
			expect(game.bggRank).toBe(403);
		});
	});

	describe('Existing games are unaffected (new fields are nullable)', () => {
		it('should load existing game with null values for new fields', async () => {
			const user = await createTestUser('test@example.com');
			const game = await createGame(user.id, {
				title: 'Existing Game',
				year: 2000
			});

			expect(game.description).toBeNull();
			expect(game.categories).toBeNull();
			expect(game.bggRating).toBeNull();
			expect(game.bggRank).toBeNull();
		});

		it('should retrieve games without new fields populated correctly', async () => {
			const user = await createTestUser('test@example.com');
			await createGame(user.id, { title: 'Game Without AI Fields' });

			const games = await getUserGames(user.id);
			expect(games.length).toBe(1);
			expect(games[0].description).toBeNull();
			expect(games[0].categories).toBeNull();
			expect(games[0].bggRating).toBeNull();
			expect(games[0].bggRank).toBeNull();
		});
	});

	describe('New fields are included in CRUD operations', () => {
		it('should return new fields in getUserGames', async () => {
			const user = await createTestUser('test@example.com');
			const categories = JSON.stringify(['party', 'word']);
			await createGame(user.id, {
				title: 'Test Game',
				description: 'A fun party game',
				categories,
				bggRating: 8.1,
				bggRank: 50
			});

			const games = await getUserGames(user.id);
			expect(games[0].description).toBe('A fun party game');
			expect(games[0].categories).toBe(categories);
			expect(games[0].bggRating).toBe(8.1);
			expect(games[0].bggRank).toBe(50);
		});

		it('should return new fields in getGameById', async () => {
			const user = await createTestUser('test@example.com');
			const categories = JSON.stringify(['cooperative', 'horror']);
			const created = await createGame(user.id, {
				title: 'Test Game',
				description: 'A cooperative horror game',
				categories,
				bggRating: 7.8,
				bggRank: 200
			});

			const game = await getGameById(created.id, user.id);
			expect(game!.description).toBe('A cooperative horror game');
			expect(game!.categories).toBe(categories);
			expect(game!.bggRating).toBe(7.8);
			expect(game!.bggRank).toBe(200);
		});

		it('should update game with new fields via updateGame', async () => {
			const user = await createTestUser('test@example.com');
			const created = await createGame(user.id, {
				title: 'Original Title'
			});

			const categories = JSON.stringify(['dexterity', 'action']);
			const updated = await updateGame(created.id, user.id, {
				title: 'Updated Title',
				description: 'Added description',
				categories,
				bggRating: 6.5,
				bggRank: 1000
			});

			expect(updated!.description).toBe('Added description');
			expect(updated!.categories).toBe(categories);
			expect(updated!.bggRating).toBe(6.5);
			expect(updated!.bggRank).toBe(1000);
		});

		it('should clear new fields when set to null', async () => {
			const user = await createTestUser('test@example.com');
			const categories = JSON.stringify(['strategy']);
			const created = await createGame(user.id, {
				title: 'Test Game',
				description: 'Has description',
				categories,
				bggRating: 7.0,
				bggRank: 100
			});

			const updated = await updateGame(created.id, user.id, {
				title: 'Test Game',
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null
			});

			expect(updated!.description).toBeNull();
			expect(updated!.categories).toBeNull();
			expect(updated!.bggRating).toBeNull();
			expect(updated!.bggRank).toBeNull();
		});
	});

	describe('Categories field stores JSON array correctly', () => {
		it('should store empty array as JSON string', async () => {
			const user = await createTestUser('test@example.com');
			const categories = JSON.stringify([]);
			const game = await createGame(user.id, {
				title: 'Test Game',
				categories
			});

			expect(JSON.parse(game.categories!)).toEqual([]);
		});

		it('should store single category as JSON array', async () => {
			const user = await createTestUser('test@example.com');
			const categories = JSON.stringify(['solo']);
			const game = await createGame(user.id, {
				title: 'Test Game',
				categories
			});

			expect(JSON.parse(game.categories!)).toEqual(['solo']);
		});

		it('should store multiple categories as JSON array', async () => {
			const user = await createTestUser('test@example.com');
			const categories = JSON.stringify(['strategy', 'economic', 'civilization', 'area control']);
			const game = await createGame(user.id, {
				title: 'Test Game',
				categories
			});

			const parsed = JSON.parse(game.categories!);
			expect(parsed.length).toBe(4);
			expect(parsed).toContain('strategy');
			expect(parsed).toContain('civilization');
		});
	});

	describe('BGG rating and rank validation', () => {
		it('should store rating with decimal precision', async () => {
			const user = await createTestUser('test@example.com');
			const game = await createGame(user.id, {
				title: 'Test Game',
				bggRating: 7.234
			});

			// SQLite stores as float, check approximate value
			expect(game.bggRating).toBeCloseTo(7.234, 2);
		});

		it('should store rank as integer', async () => {
			const user = await createTestUser('test@example.com');
			const game = await createGame(user.id, {
				title: 'Test Game',
				bggRank: 1
			});

			expect(game.bggRank).toBe(1);
		});

		it('should handle high rank values', async () => {
			const user = await createTestUser('test@example.com');
			const game = await createGame(user.id, {
				title: 'Test Game',
				bggRank: 50000
			});

			expect(game.bggRank).toBe(50000);
		});
	});

	describe('Mixed data scenarios', () => {
		it('should handle game with some new fields and some null', async () => {
			const user = await createTestUser('test@example.com');
			const game = await createGame(user.id, {
				title: 'Test Game',
				description: 'Only has description',
				bggRating: 7.0
				// categories and bggRank are null
			});

			expect(game.description).toBe('Only has description');
			expect(game.categories).toBeNull();
			expect(game.bggRating).toBe(7.0);
			expect(game.bggRank).toBeNull();
		});

		it('should retrieve multiple games with different field combinations', async () => {
			const user = await createTestUser('test@example.com');

			await createGame(user.id, {
				title: 'Game A',
				description: 'Has description',
				bggRating: 8.0
			});

			await createGame(user.id, {
				title: 'Game B',
				categories: JSON.stringify(['party']),
				bggRank: 100
			});

			await createGame(user.id, {
				title: 'Game C'
				// No new fields
			});

			const games = await getUserGames(user.id);
			expect(games.length).toBe(3);

			const gameA = games.find((g) => g.title === 'Game A');
			const gameB = games.find((g) => g.title === 'Game B');
			const gameC = games.find((g) => g.title === 'Game C');

			expect(gameA!.description).toBe('Has description');
			expect(gameA!.bggRating).toBe(8.0);
			expect(gameA!.categories).toBeNull();

			expect(gameB!.categories).toBe(JSON.stringify(['party']));
			expect(gameB!.bggRank).toBe(100);
			expect(gameB!.description).toBeNull();

			expect(gameC!.description).toBeNull();
			expect(gameC!.categories).toBeNull();
			expect(gameC!.bggRating).toBeNull();
			expect(gameC!.bggRank).toBeNull();
		});
	});
});
