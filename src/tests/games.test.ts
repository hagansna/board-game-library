import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '$lib/server/db';
import { registerUser } from '$lib/server/auth';
import { getUserGames, getGameById, createGame, updateGame, deleteGame } from '$lib/server/games';

// Helper to parse form validation errors (mirrors server-side validation logic)
function parseValidationError(data: {
	title: string;
	year?: number | null;
	minPlayers?: number | null;
	maxPlayers?: number | null;
	playTimeMin?: number | null;
	playTimeMax?: number | null;
}) {
	const errors: { title?: string; year?: string; players?: string; playTime?: string } = {};

	// Validate title (required)
	if (!data.title || !data.title.trim()) {
		errors.title = 'Title is required';
	}

	// Validate year
	const currentYear = new Date().getFullYear();
	if (data.year !== null && data.year !== undefined) {
		if (isNaN(data.year) || data.year < 1 || data.year > currentYear + 1) {
			errors.year = 'Please enter a valid year';
		}
	}

	// Validate players
	if (data.minPlayers !== null && data.minPlayers !== undefined && data.minPlayers < 1) {
		errors.players = 'Minimum players must be at least 1';
	}
	if (data.maxPlayers !== null && data.maxPlayers !== undefined && data.maxPlayers < 1) {
		errors.players = 'Maximum players must be at least 1';
	}
	if (data.minPlayers && data.maxPlayers && data.minPlayers > data.maxPlayers) {
		errors.players = 'Minimum players cannot be greater than maximum players';
	}

	// Validate play time
	if (data.playTimeMin !== null && data.playTimeMin !== undefined && data.playTimeMin < 1) {
		errors.playTime = 'Minimum play time must be at least 1 minute';
	}
	if (data.playTimeMax !== null && data.playTimeMax !== undefined && data.playTimeMax < 1) {
		errors.playTime = 'Maximum play time must be at least 1 minute';
	}
	if (data.playTimeMin && data.playTimeMax && data.playTimeMin > data.playTimeMax) {
		errors.playTime = 'Minimum play time cannot be greater than maximum play time';
	}

	return Object.keys(errors).length > 0 ? errors : null;
}

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

describe('Library Management - Add Game (Story 6)', () => {
	const testUserEmail = 'addgameuser@example.com';
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
		await prisma.game.deleteMany({});
	});

	afterAll(async () => {
		// Clean up after all tests
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	describe('Form Validation', () => {
		it('should require title field', () => {
			const errors = parseValidationError({ title: '' });
			expect(errors).not.toBeNull();
			expect(errors?.title).toBe('Title is required');
		});

		it('should require title to not be only whitespace', () => {
			const errors = parseValidationError({ title: '   ' });
			expect(errors).not.toBeNull();
			expect(errors?.title).toBe('Title is required');
		});

		it('should accept valid title', () => {
			const errors = parseValidationError({ title: 'Catan' });
			expect(errors).toBeNull();
		});

		it('should reject invalid year (too far in the future)', () => {
			const futureYear = new Date().getFullYear() + 5;
			const errors = parseValidationError({ title: 'Test', year: futureYear });
			expect(errors).not.toBeNull();
			expect(errors?.year).toBe('Please enter a valid year');
		});

		it('should reject invalid year (negative)', () => {
			const errors = parseValidationError({ title: 'Test', year: -1 });
			expect(errors).not.toBeNull();
			expect(errors?.year).toBe('Please enter a valid year');
		});

		it('should accept valid year', () => {
			const errors = parseValidationError({ title: 'Test', year: 1995 });
			expect(errors).toBeNull();
		});

		it('should reject min players greater than max players', () => {
			const errors = parseValidationError(
				{ title: 'Test', minPlayers: 5, maxPlayers: 2 },
				testUserId
			);
			expect(errors).not.toBeNull();
			expect(errors?.players).toBe('Minimum players cannot be greater than maximum players');
		});

		it('should accept valid player range', () => {
			const errors = parseValidationError(
				{ title: 'Test', minPlayers: 2, maxPlayers: 4 },
				testUserId
			);
			expect(errors).toBeNull();
		});

		it('should reject min play time greater than max play time', () => {
			const errors = parseValidationError(
				{ title: 'Test', playTimeMin: 120, playTimeMax: 30 },
				testUserId
			);
			expect(errors).not.toBeNull();
			expect(errors?.playTime).toBe('Minimum play time cannot be greater than maximum play time');
		});

		it('should accept valid play time range', () => {
			const errors = parseValidationError(
				{ title: 'Test', playTimeMin: 30, playTimeMax: 60 },
				testUserId
			);
			expect(errors).toBeNull();
		});
	});

	describe('Game Creation', () => {
		it('should create game with all fields', async () => {
			const game = await createGame(testUserId, {
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 90
			});

			expect(game.id).toBeDefined();
			expect(game.title).toBe('Catan');
			expect(game.year).toBe(1995);
			expect(game.minPlayers).toBe(3);
			expect(game.maxPlayers).toBe(4);
			expect(game.playTimeMin).toBe(60);
			expect(game.playTimeMax).toBe(90);
		});

		it('should create game with only title (other fields optional)', async () => {
			const game = await createGame(testUserId, { title: 'Mystery Game' });

			expect(game.id).toBeDefined();
			expect(game.title).toBe('Mystery Game');
			expect(game.year).toBeNull();
			expect(game.minPlayers).toBeNull();
			expect(game.maxPlayers).toBeNull();
			expect(game.playTimeMin).toBeNull();
			expect(game.playTimeMax).toBeNull();
		});

		it('should persist game to database', async () => {
			await createGame(testUserId, {
				title: 'Ticket to Ride',
				year: 2004
			});

			const games = await getUserGames(testUserId);
			expect(games).toHaveLength(1);
			expect(games[0].title).toBe('Ticket to Ride');
			expect(games[0].year).toBe(2004);
		});

		it('should associate game with correct user', async () => {
			const game = await createGame(testUserId, { title: 'User Game' });

			const userGames = await getUserGames(testUserId);
			expect(userGames.map((g) => g.id)).toContain(game.id);
		});

		it('should add game immediately visible in library', async () => {
			// Library starts empty
			const initialGames = await getUserGames(testUserId);
			expect(initialGames).toHaveLength(0);

			// Add a game
			await createGame(testUserId, { title: 'New Game' });

			// Game appears immediately
			const updatedGames = await getUserGames(testUserId);
			expect(updatedGames).toHaveLength(1);
			expect(updatedGames[0].title).toBe('New Game');
		});

		it('should handle multiple games added sequentially', async () => {
			await createGame(testUserId, { title: 'Game 1' });
			await createGame(testUserId, { title: 'Game 2' });
			await createGame(testUserId, { title: 'Game 3' });

			const games = await getUserGames(testUserId);
			expect(games).toHaveLength(3);
		});

		it('should persist game data after refresh (simulated by re-fetching)', async () => {
			await createGame(testUserId, {
				title: 'Persistent Game',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 6,
				playTimeMin: 45,
				playTimeMax: 90
			});

			// Simulate page refresh by fetching again
			const gamesFetch1 = await getUserGames(testUserId);
			const gamesFetch2 = await getUserGames(testUserId);

			expect(gamesFetch1).toHaveLength(1);
			expect(gamesFetch2).toHaveLength(1);
			expect(gamesFetch1[0]).toEqual(gamesFetch2[0]);
		});
	});
});

describe('Library Management - Edit Game (Story 7)', () => {
	const testUser1Email = 'editgameuser1@example.com';
	const testUser2Email = 'editgameuser2@example.com';
	const testPassword = 'securepassword123';
	let testUser1Id: string;
	let testUser2Id: string;

	beforeEach(async () => {
		// Clean up all test data and recreate users before each test
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});

		// Create two test users for each test
		const user1 = await registerUser(testUser1Email, testPassword);
		const user2 = await registerUser(testUser2Email, testPassword);
		testUser1Id = user1.id;
		testUser2Id = user2.id;
	});

	afterAll(async () => {
		// Clean up after all tests
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
	});

	describe('updateGame', () => {
		it('should update game title', async () => {
			const game = await createGame(testUser1Id, {
				title: 'Original Title',
				year: 1995
			});

			const updated = await updateGame(game.id, testUser1Id, {
				title: 'Updated Title',
				year: 1995
			});

			expect(updated).not.toBeNull();
			expect(updated?.title).toBe('Updated Title');
			expect(updated?.year).toBe(1995);
		});

		it('should update all fields', async () => {
			const game = await createGame(testUser1Id, {
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 90
			});

			const updated = await updateGame(game.id, testUser1Id, {
				title: 'Catan: Seafarers',
				year: 1997,
				minPlayers: 2,
				maxPlayers: 6,
				playTimeMin: 90,
				playTimeMax: 120
			});

			expect(updated).not.toBeNull();
			expect(updated?.title).toBe('Catan: Seafarers');
			expect(updated?.year).toBe(1997);
			expect(updated?.minPlayers).toBe(2);
			expect(updated?.maxPlayers).toBe(6);
			expect(updated?.playTimeMin).toBe(90);
			expect(updated?.playTimeMax).toBe(120);
		});

		it('should allow clearing optional fields by setting to null', async () => {
			const game = await createGame(testUser1Id, {
				title: 'Game With Details',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60
			});

			const updated = await updateGame(game.id, testUser1Id, {
				title: 'Game Without Details',
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null
			});

			expect(updated).not.toBeNull();
			expect(updated?.title).toBe('Game Without Details');
			expect(updated?.year).toBeNull();
			expect(updated?.minPlayers).toBeNull();
			expect(updated?.maxPlayers).toBeNull();
			expect(updated?.playTimeMin).toBeNull();
			expect(updated?.playTimeMax).toBeNull();
		});

		it('should preserve id after update', async () => {
			const game = await createGame(testUser1Id, { title: 'My Game' });

			const updated = await updateGame(game.id, testUser1Id, {
				title: 'My Updated Game'
			});

			expect(updated?.id).toBe(game.id);
		});

		it('should update updatedAt timestamp', async () => {
			const game = await createGame(testUser1Id, { title: 'Test Game' });
			const originalUpdatedAt = game.updatedAt;

			// Small delay to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			const updated = await updateGame(game.id, testUser1Id, {
				title: 'Updated Test Game'
			});

			expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});

		it('should return null when game does not exist', async () => {
			const result = await updateGame('non-existent-id', testUser1Id, {
				title: 'Does Not Matter'
			});

			expect(result).toBeNull();
		});

		it('should return null when user does not own the game', async () => {
			const game = await createGame(testUser1Id, { title: 'User 1 Game' });

			// User 2 tries to update User 1's game
			const result = await updateGame(game.id, testUser2Id, {
				title: 'Hacked Title'
			});

			expect(result).toBeNull();

			// Verify original game is unchanged
			const originalGame = await getGameById(game.id, testUser1Id);
			expect(originalGame?.title).toBe('User 1 Game');
		});

		it('should persist changes to database', async () => {
			const game = await createGame(testUser1Id, { title: 'Before Update' });

			await updateGame(game.id, testUser1Id, { title: 'After Update' });

			// Fetch the game again to verify persistence
			const fetched = await getGameById(game.id, testUser1Id);
			expect(fetched?.title).toBe('After Update');
		});

		it('should display updated game in library', async () => {
			await createGame(testUser1Id, { title: 'Alpha Game' });
			const game2 = await createGame(testUser1Id, { title: 'Beta Game' });
			await createGame(testUser1Id, { title: 'Gamma Game' });

			// Update Beta to Zeta
			await updateGame(game2.id, testUser1Id, { title: 'Zeta Game' });

			// Verify library reflects the change
			const games = await getUserGames(testUser1Id);
			const titles = games.map((g) => g.title);

			expect(titles).toContain('Zeta Game');
			expect(titles).not.toContain('Beta Game');
		});

		it('should not affect other games when updating one', async () => {
			const game1 = await createGame(testUser1Id, {
				title: 'Game 1',
				year: 2020
			});
			const game2 = await createGame(testUser1Id, {
				title: 'Game 2',
				year: 2021
			});

			// Update only game1
			await updateGame(game1.id, testUser1Id, {
				title: 'Game 1 Updated',
				year: 2022
			});

			// Verify game2 is unchanged
			const fetchedGame2 = await getGameById(game2.id, testUser1Id);
			expect(fetchedGame2?.title).toBe('Game 2');
			expect(fetchedGame2?.year).toBe(2021);
		});
	});

	describe('Edit Form Validation (reuses add game validation)', () => {
		it('should reject empty title when editing', () => {
			const errors = parseValidationError({ title: '' });
			expect(errors).not.toBeNull();
			expect(errors?.title).toBe('Title is required');
		});

		it('should accept valid update data', () => {
			const errors = parseValidationError({
				title: 'Updated Game',
				year: 2023,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60
			});
			expect(errors).toBeNull();
		});
	});
});

describe('Library Management - Delete Game (Story 8)', () => {
	const testUser1Email = 'deletegameuser1@example.com';
	const testUser2Email = 'deletegameuser2@example.com';
	const testPassword = 'securepassword123';
	let testUser1Id: string;
	let testUser2Id: string;

	beforeEach(async () => {
		// Clean up all test data and recreate users before each test
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});

		// Create two test users for each test
		const user1 = await registerUser(testUser1Email, testPassword);
		const user2 = await registerUser(testUser2Email, testPassword);
		testUser1Id = user1.id;
		testUser2Id = user2.id;
	});

	afterAll(async () => {
		// Clean up after all tests
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
	});

	describe('deleteGame', () => {
		it('should delete a game owned by the user', async () => {
			const game = await createGame(testUser1Id, { title: 'Game to Delete' });

			const result = await deleteGame(game.id, testUser1Id);
			expect(result).toBe(true);

			// Verify game is gone
			const fetchedGame = await getGameById(game.id, testUser1Id);
			expect(fetchedGame).toBeNull();
		});

		it('should return false when game does not exist', async () => {
			const result = await deleteGame('non-existent-id', testUser1Id);
			expect(result).toBe(false);
		});

		it('should return false when user does not own the game', async () => {
			const game = await createGame(testUser1Id, { title: 'User 1 Game' });

			// User 2 tries to delete User 1's game
			const result = await deleteGame(game.id, testUser2Id);
			expect(result).toBe(false);

			// Verify original game still exists
			const originalGame = await getGameById(game.id, testUser1Id);
			expect(originalGame).not.toBeNull();
			expect(originalGame?.title).toBe('User 1 Game');
		});

		it('should remove game from library view after deletion', async () => {
			const game1 = await createGame(testUser1Id, { title: 'Game 1' });
			const game2 = await createGame(testUser1Id, { title: 'Game 2' });
			const game3 = await createGame(testUser1Id, { title: 'Game 3' });

			// Verify all 3 games exist
			let games = await getUserGames(testUser1Id);
			expect(games).toHaveLength(3);

			// Delete game 2
			await deleteGame(game2.id, testUser1Id);

			// Verify only 2 games remain
			games = await getUserGames(testUser1Id);
			expect(games).toHaveLength(2);
			expect(games.map((g) => g.title)).toContain('Game 1');
			expect(games.map((g) => g.title)).toContain('Game 3');
			expect(games.map((g) => g.title)).not.toContain('Game 2');
		});

		it('should not affect other games when deleting one', async () => {
			const game1 = await createGame(testUser1Id, {
				title: 'Game 1',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4
			});
			const game2 = await createGame(testUser1Id, {
				title: 'Game 2',
				year: 2021,
				minPlayers: 1,
				maxPlayers: 6
			});

			// Delete game1
			await deleteGame(game1.id, testUser1Id);

			// Verify game2 is unchanged
			const fetchedGame2 = await getGameById(game2.id, testUser1Id);
			expect(fetchedGame2).not.toBeNull();
			expect(fetchedGame2?.title).toBe('Game 2');
			expect(fetchedGame2?.year).toBe(2021);
			expect(fetchedGame2?.minPlayers).toBe(1);
			expect(fetchedGame2?.maxPlayers).toBe(6);
		});

		it('should persist deletion after refresh (simulated by re-fetching)', async () => {
			const game = await createGame(testUser1Id, { title: 'Temporary Game' });

			// Verify game exists
			let fetchedGame = await getGameById(game.id, testUser1Id);
			expect(fetchedGame).not.toBeNull();

			// Delete the game
			await deleteGame(game.id, testUser1Id);

			// Fetch multiple times to simulate refresh
			fetchedGame = await getGameById(game.id, testUser1Id);
			expect(fetchedGame).toBeNull();

			const games1 = await getUserGames(testUser1Id);
			const games2 = await getUserGames(testUser1Id);
			expect(games1).toEqual(games2);
			expect(games1.map((g) => g.title)).not.toContain('Temporary Game');
		});

		it('should handle deletion of the only game in library', async () => {
			const game = await createGame(testUser1Id, { title: 'Only Game' });

			// Verify library has one game
			let games = await getUserGames(testUser1Id);
			expect(games).toHaveLength(1);

			// Delete the only game
			const result = await deleteGame(game.id, testUser1Id);
			expect(result).toBe(true);

			// Verify library is now empty
			games = await getUserGames(testUser1Id);
			expect(games).toHaveLength(0);
		});

		it('should isolate deletion between users', async () => {
			// Create games for both users
			const user1Game = await createGame(testUser1Id, { title: 'User 1 Game' });
			const user2Game = await createGame(testUser2Id, { title: 'User 2 Game' });

			// User 1 deletes their game
			await deleteGame(user1Game.id, testUser1Id);

			// User 2's game should still exist
			const user2Games = await getUserGames(testUser2Id);
			expect(user2Games).toHaveLength(1);
			expect(user2Games[0].title).toBe('User 2 Game');

			// User 1's library should be empty
			const user1Games = await getUserGames(testUser1Id);
			expect(user1Games).toHaveLength(0);
		});

		it('should not allow deleting same game twice', async () => {
			const game = await createGame(testUser1Id, { title: 'Delete Me' });

			// First deletion should succeed
			const firstResult = await deleteGame(game.id, testUser1Id);
			expect(firstResult).toBe(true);

			// Second deletion should fail (game no longer exists)
			const secondResult = await deleteGame(game.id, testUser1Id);
			expect(secondResult).toBe(false);
		});
	});
});

describe('Library Management - Box Art Display (Story 16)', () => {
	const testUserEmail = 'boxartdisplayuser@example.com';
	const testPassword = 'securepassword123';
	let testUserId: string;

	beforeEach(async () => {
		// Clean up all test data and recreate user before each test
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});

		// Create test user
		const user = await registerUser(testUserEmail, testPassword);
		testUserId = user.id;
	});

	afterAll(async () => {
		// Clean up after all tests
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
	});

	describe('Box Art in Game Data', () => {
		it('should return boxArtUrl in getUserGames response', async () => {
			const boxArtUrl = 'https://example.com/catan-box-art.jpg';
			await createGame(testUserId, {
				title: 'Catan',
				boxArtUrl
			});

			const games = await getUserGames(testUserId);
			expect(games).toHaveLength(1);
			expect(games[0].boxArtUrl).toBe(boxArtUrl);
		});

		it('should return null boxArtUrl when game has no box art', async () => {
			await createGame(testUserId, {
				title: 'Game Without Art'
			});

			const games = await getUserGames(testUserId);
			expect(games).toHaveLength(1);
			expect(games[0].boxArtUrl).toBeNull();
		});

		it('should return boxArtUrl in getGameById response', async () => {
			const boxArtUrl = 'https://example.com/ticket-to-ride.png';
			const game = await createGame(testUserId, {
				title: 'Ticket to Ride',
				boxArtUrl
			});

			const fetched = await getGameById(game.id, testUserId);
			expect(fetched).not.toBeNull();
			expect(fetched?.boxArtUrl).toBe(boxArtUrl);
		});

		it('should handle local upload path as boxArtUrl', async () => {
			const localPath = '/uploads/boxart/game-12345.jpg';
			await createGame(testUserId, {
				title: 'Local Art Game',
				boxArtUrl: localPath
			});

			const games = await getUserGames(testUserId);
			expect(games[0].boxArtUrl).toBe(localPath);
		});

		it('should return multiple games with varying box art states', async () => {
			await createGame(testUserId, {
				title: 'Alpha',
				boxArtUrl: 'https://example.com/alpha.jpg'
			});
			await createGame(testUserId, {
				title: 'Beta',
				boxArtUrl: null
			});
			await createGame(testUserId, {
				title: 'Gamma',
				boxArtUrl: '/uploads/boxart/gamma.png'
			});

			const games = await getUserGames(testUserId);
			expect(games).toHaveLength(3);

			const alpha = games.find((g) => g.title === 'Alpha');
			const beta = games.find((g) => g.title === 'Beta');
			const gamma = games.find((g) => g.title === 'Gamma');

			expect(alpha?.boxArtUrl).toBe('https://example.com/alpha.jpg');
			expect(beta?.boxArtUrl).toBeNull();
			expect(gamma?.boxArtUrl).toBe('/uploads/boxart/gamma.png');
		});
	});

	describe('Box Art Update and Remove', () => {
		it('should update game to add box art', async () => {
			const game = await createGame(testUserId, {
				title: 'No Art Game'
			});
			expect(game.boxArtUrl).toBeNull();

			const updated = await updateGame(game.id, testUserId, {
				title: 'No Art Game',
				boxArtUrl: 'https://example.com/new-art.jpg'
			});

			expect(updated?.boxArtUrl).toBe('https://example.com/new-art.jpg');
		});

		it('should update game to replace box art', async () => {
			const game = await createGame(testUserId, {
				title: 'Art Game',
				boxArtUrl: 'https://example.com/old.jpg'
			});

			const updated = await updateGame(game.id, testUserId, {
				title: 'Art Game',
				boxArtUrl: 'https://example.com/new.jpg'
			});

			expect(updated?.boxArtUrl).toBe('https://example.com/new.jpg');
		});

		it('should update game to remove box art', async () => {
			const game = await createGame(testUserId, {
				title: 'Art Game',
				boxArtUrl: 'https://example.com/art.jpg'
			});
			expect(game.boxArtUrl).not.toBeNull();

			const updated = await updateGame(game.id, testUserId, {
				title: 'Art Game',
				boxArtUrl: null
			});

			expect(updated?.boxArtUrl).toBeNull();
		});

		it('should persist box art changes across fetches', async () => {
			const game = await createGame(testUserId, {
				title: 'Persistent Game',
				boxArtUrl: 'https://example.com/persistent.jpg'
			});

			// Update box art
			await updateGame(game.id, testUserId, {
				title: 'Persistent Game',
				boxArtUrl: 'https://example.com/updated.jpg'
			});

			// Fetch again to verify persistence
			const fetched = await getGameById(game.id, testUserId);
			expect(fetched?.boxArtUrl).toBe('https://example.com/updated.jpg');

			// Also check getUserGames
			const games = await getUserGames(testUserId);
			expect(games[0].boxArtUrl).toBe('https://example.com/updated.jpg');
		});
	});
});
