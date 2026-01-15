import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '$lib/server/db';
import { registerUser } from '$lib/server/auth';
import { getUserGames, getGameById, createGame } from '$lib/server/games';

describe('Library Management - View Games (Story 5)', () => {
	const testUser1Email = 'gameuser1@example.com';
	const testUser2Email = 'gameuser2@example.com';
	const testPassword = 'securepassword123';
	let testUser1Id: string;
	let testUser2Id: string;

	beforeAll(async () => {
		// Clean up existing test data
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});

		// Create two test users for data isolation tests
		const user1 = await registerUser(testUser1Email, testPassword);
		const user2 = await registerUser(testUser2Email, testPassword);
		testUser1Id = user1.id;
		testUser2Id = user2.id;
	});

	beforeEach(async () => {
		// Clean up games before each test
		await prisma.game.deleteMany({});
	});

	afterAll(async () => {
		// Clean up after all tests
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	describe('getUserGames', () => {
		it('should return empty array when user has no games', async () => {
			const games = await getUserGames(testUser1Id);
			expect(games).toEqual([]);
		});

		it('should return all games for a user', async () => {
			// Create some test games for user 1
			await createGame(testUser1Id, { title: 'Catan' });
			await createGame(testUser1Id, { title: 'Ticket to Ride' });
			await createGame(testUser1Id, { title: 'Pandemic' });

			const games = await getUserGames(testUser1Id);
			expect(games).toHaveLength(3);
		});

		it('should return games sorted alphabetically by title', async () => {
			await createGame(testUser1Id, { title: 'Wingspan' });
			await createGame(testUser1Id, { title: 'Azul' });
			await createGame(testUser1Id, { title: 'Codenames' });

			const games = await getUserGames(testUser1Id);
			expect(games[0].title).toBe('Azul');
			expect(games[1].title).toBe('Codenames');
			expect(games[2].title).toBe('Wingspan');
		});

		it('should return games with all key information', async () => {
			await createGame(testUser1Id, {
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120
			});

			const games = await getUserGames(testUser1Id);
			expect(games).toHaveLength(1);

			const game = games[0];
			expect(game.title).toBe('Catan');
			expect(game.year).toBe(1995);
			expect(game.minPlayers).toBe(3);
			expect(game.maxPlayers).toBe(4);
			expect(game.playTimeMin).toBe(60);
			expect(game.playTimeMax).toBe(120);
			expect(game.id).toBeDefined();
			expect(game.createdAt).toBeDefined();
			expect(game.updatedAt).toBeDefined();
		});

		it('should handle games with only title (other fields optional)', async () => {
			await createGame(testUser1Id, { title: 'Mystery Game' });

			const games = await getUserGames(testUser1Id);
			expect(games).toHaveLength(1);

			const game = games[0];
			expect(game.title).toBe('Mystery Game');
			expect(game.year).toBeNull();
			expect(game.minPlayers).toBeNull();
			expect(game.maxPlayers).toBeNull();
			expect(game.playTimeMin).toBeNull();
			expect(game.playTimeMax).toBeNull();
		});
	});

	describe('Data Isolation', () => {
		it('should only return games belonging to the specified user', async () => {
			// Create games for user 1
			await createGame(testUser1Id, { title: 'Catan' });
			await createGame(testUser1Id, { title: 'Ticket to Ride' });

			// Create games for user 2
			await createGame(testUser2Id, { title: 'Pandemic' });
			await createGame(testUser2Id, { title: 'Azul' });
			await createGame(testUser2Id, { title: 'Root' });

			// User 1 should only see their 2 games
			const user1Games = await getUserGames(testUser1Id);
			expect(user1Games).toHaveLength(2);
			expect(user1Games.map((g) => g.title)).toContain('Catan');
			expect(user1Games.map((g) => g.title)).toContain('Ticket to Ride');
			expect(user1Games.map((g) => g.title)).not.toContain('Pandemic');

			// User 2 should only see their 3 games
			const user2Games = await getUserGames(testUser2Id);
			expect(user2Games).toHaveLength(3);
			expect(user2Games.map((g) => g.title)).toContain('Pandemic');
			expect(user2Games.map((g) => g.title)).toContain('Azul');
			expect(user2Games.map((g) => g.title)).toContain('Root');
			expect(user2Games.map((g) => g.title)).not.toContain('Catan');
		});

		it('should return empty array for user with no games even when other users have games', async () => {
			// Create games only for user 2
			await createGame(testUser2Id, { title: 'Pandemic' });
			await createGame(testUser2Id, { title: 'Azul' });

			// User 1 should see no games
			const user1Games = await getUserGames(testUser1Id);
			expect(user1Games).toEqual([]);
		});

		it('should not allow access to games by ID from another user', async () => {
			// Create a game for user 2
			const game = await createGame(testUser2Id, { title: 'Secret Game' });

			// User 1 should not be able to get user 2's game
			const notAccessible = await getGameById(game.id, testUser1Id);
			expect(notAccessible).toBeNull();

			// User 2 should be able to access their own game
			const accessible = await getGameById(game.id, testUser2Id);
			expect(accessible).toBeDefined();
			expect(accessible?.title).toBe('Secret Game');
		});
	});

	describe('createGame', () => {
		it('should create a game with all fields', async () => {
			const game = await createGame(testUser1Id, {
				title: 'Spirit Island',
				year: 2017,
				minPlayers: 1,
				maxPlayers: 4,
				playTimeMin: 90,
				playTimeMax: 120
			});

			expect(game.id).toBeDefined();
			expect(game.title).toBe('Spirit Island');
			expect(game.year).toBe(2017);
			expect(game.minPlayers).toBe(1);
			expect(game.maxPlayers).toBe(4);
			expect(game.playTimeMin).toBe(90);
			expect(game.playTimeMax).toBe(120);
		});

		it('should create a game with only required title', async () => {
			const game = await createGame(testUser1Id, { title: 'Quick Game' });

			expect(game.id).toBeDefined();
			expect(game.title).toBe('Quick Game');
			expect(game.year).toBeNull();
		});

		it('should associate game with correct user', async () => {
			const game = await createGame(testUser1Id, { title: 'User 1 Game' });

			// Verify the game belongs to user 1
			const user1Games = await getUserGames(testUser1Id);
			expect(user1Games.map((g) => g.id)).toContain(game.id);

			// Verify user 2 doesn't see this game
			const user2Games = await getUserGames(testUser2Id);
			expect(user2Games.map((g) => g.id)).not.toContain(game.id);
		});
	});

	describe('getGameById', () => {
		it('should return game when user owns it', async () => {
			const created = await createGame(testUser1Id, {
				title: 'My Game',
				year: 2020
			});

			const fetched = await getGameById(created.id, testUser1Id);
			expect(fetched).toBeDefined();
			expect(fetched?.title).toBe('My Game');
			expect(fetched?.year).toBe(2020);
		});

		it('should return null when game does not exist', async () => {
			const result = await getGameById('non-existent-id', testUser1Id);
			expect(result).toBeNull();
		});

		it('should return null when user does not own the game', async () => {
			const game = await createGame(testUser1Id, { title: 'Private Game' });

			const result = await getGameById(game.id, testUser2Id);
			expect(result).toBeNull();
		});
	});
});
