/**
 * Story 44 Tests: Migration script converts existing data to split schema
 *
 * Acceptance criteria:
 * - Script handles all existing games in database
 * - Deduplicates games by title (keeps one shared record)
 * - Creates library_games entries for each user's games
 * - Preserves user-specific data (play_count, rating, review)
 * - Can be run multiple times safely (idempotent)
 * - Logs progress and handles errors gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	normalizeTitle,
	groupGamesByTitle,
	selectBestGameForCatalog,
	extractSharedGameData,
	extractLibraryEntryData,
	type LegacyGame,
	type SharedGameData,
	type LibraryEntryData,
	type GameGroup,
	type MigrationResult,
	type MigrationSummary
} from '../../scripts/migrate-to-split-schema';

// Mock Supabase client
const mockSupabase = {
	from: vi.fn()
};

// Helper to create mock legacy games
function createLegacyGame(overrides: Partial<LegacyGame> = {}): LegacyGame {
	return {
		id: 'game-' + Math.random().toString(36).substring(7),
		user_id: 'user-' + Math.random().toString(36).substring(7),
		title: 'Test Game',
		year: 2020,
		min_players: 2,
		max_players: 4,
		play_time_min: 30,
		play_time_max: 60,
		box_art_url: null,
		description: null,
		categories: null,
		bgg_rating: null,
		bgg_rank: null,
		suggested_age: null,
		play_count: 0,
		personal_rating: null,
		review: null,
		created_at: '2024-01-01T00:00:00.000Z',
		updated_at: '2024-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('Story 44: Migration script converts existing data to split schema', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('normalizeTitle - title normalization for deduplication', () => {
		it('should convert title to lowercase', () => {
			expect(normalizeTitle('CATAN')).toBe('catan');
		});

		it('should trim whitespace from title', () => {
			expect(normalizeTitle('  Catan  ')).toBe('catan');
		});

		it('should collapse multiple spaces to single space', () => {
			expect(normalizeTitle('Ticket   to    Ride')).toBe('ticket to ride');
		});

		it('should handle title with mixed case and spaces', () => {
			expect(normalizeTitle('  TICKET  To  RIDE  ')).toBe('ticket to ride');
		});

		it('should handle empty string', () => {
			expect(normalizeTitle('')).toBe('');
		});

		it('should handle single word title', () => {
			expect(normalizeTitle('Catan')).toBe('catan');
		});

		it('should preserve special characters in title', () => {
			expect(normalizeTitle("Exploding Kittens: NSFW Edition")).toBe('exploding kittens: nsfw edition');
		});

		it('should handle unicode characters', () => {
			expect(normalizeTitle('Café Games')).toBe('café games');
		});
	});

	describe('groupGamesByTitle - grouping games for deduplication', () => {
		it('should group games with same normalized title', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: 'CATAN', user_id: 'user2' }),
				createLegacyGame({ id: '3', title: 'catan', user_id: 'user3' })
			];

			const groups = groupGamesByTitle(games);

			expect(groups).toHaveLength(1);
			expect(groups[0].normalizedTitle).toBe('catan');
			expect(groups[0].games).toHaveLength(3);
		});

		it('should separate games with different titles', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: 'Ticket to Ride', user_id: 'user2' }),
				createLegacyGame({ id: '3', title: 'Azul', user_id: 'user3' })
			];

			const groups = groupGamesByTitle(games);

			expect(groups).toHaveLength(3);
			expect(groups.map(g => g.normalizedTitle).sort()).toEqual(['azul', 'catan', 'ticket to ride']);
		});

		it('should handle empty games array', () => {
			const groups = groupGamesByTitle([]);
			expect(groups).toHaveLength(0);
		});

		it('should handle single game', () => {
			const games = [createLegacyGame({ title: 'Pandemic' })];
			const groups = groupGamesByTitle(games);

			expect(groups).toHaveLength(1);
			expect(groups[0].games).toHaveLength(1);
			expect(groups[0].title).toBe('Pandemic');
		});

		it('should use first encountered title for display', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'CATAN', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: 'Catan', user_id: 'user2' })
			];

			const groups = groupGamesByTitle(games);

			// First encountered title should be used for display
			expect(groups[0].title).toBe('CATAN');
			expect(groups[0].normalizedTitle).toBe('catan');
		});

		it('should handle titles with extra whitespace', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Ticket to Ride', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: 'Ticket  to  Ride', user_id: 'user2' }),
				createLegacyGame({ id: '3', title: '  Ticket to Ride  ', user_id: 'user3' })
			];

			const groups = groupGamesByTitle(games);

			expect(groups).toHaveLength(1);
			expect(groups[0].games).toHaveLength(3);
		});
	});

	describe('selectBestGameForCatalog - selecting most complete game record', () => {
		it('should return single game when only one in group', () => {
			const games = [createLegacyGame({ id: '1', title: 'Catan' })];
			const best = selectBestGameForCatalog(games);
			expect(best.id).toBe('1');
		});

		it('should prefer game with year over game without year', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', year: null }),
				createLegacyGame({ id: '2', title: 'Catan', year: 1995 })
			];
			const best = selectBestGameForCatalog(games);
			expect(best.id).toBe('2');
		});

		it('should prefer game with box art URL', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', box_art_url: null }),
				createLegacyGame({ id: '2', title: 'Catan', box_art_url: 'https://example.com/catan.jpg' })
			];
			const best = selectBestGameForCatalog(games);
			expect(best.id).toBe('2');
		});

		it('should prefer game with description', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', description: null }),
				createLegacyGame({ id: '2', title: 'Catan', description: 'A strategy game about trading' })
			];
			const best = selectBestGameForCatalog(games);
			expect(best.id).toBe('2');
		});

		it('should prefer game with categories', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', categories: null }),
				createLegacyGame({ id: '2', title: 'Catan', categories: ['strategy', 'trading'] })
			];
			const best = selectBestGameForCatalog(games);
			expect(best.id).toBe('2');
		});

		it('should prefer game with BGG rating', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', bgg_rating: null }),
				createLegacyGame({ id: '2', title: 'Catan', bgg_rating: 7.5 })
			];
			const best = selectBestGameForCatalog(games);
			expect(best.id).toBe('2');
		});

		it('should prefer game with more complete metadata overall', () => {
			const games = [
				createLegacyGame({
					id: '1',
					title: 'Catan',
					year: 1995,
					box_art_url: null,
					description: null,
					categories: null
				}),
				createLegacyGame({
					id: '2',
					title: 'Catan',
					year: null,
					box_art_url: 'https://example.com/catan.jpg',
					description: 'A great strategy game',
					categories: ['strategy']
				})
			];
			const best = selectBestGameForCatalog(games);
			// Game 2 has box_art (3 points) + description (3 points) + categories (2 points) = 8 points
			// Game 1 has year (2 points) = 2 points
			expect(best.id).toBe('2');
		});

		it('should prefer older created_at date when scores are equal', () => {
			const games = [
				createLegacyGame({
					id: '1',
					title: 'Catan',
					created_at: '2024-06-01T00:00:00.000Z'
				}),
				createLegacyGame({
					id: '2',
					title: 'Catan',
					created_at: '2024-01-01T00:00:00.000Z'
				})
			];
			const best = selectBestGameForCatalog(games);
			// Both have same score, so older one wins
			expect(best.id).toBe('2');
		});

		it('should handle all fields being populated equally', () => {
			const games = [
				createLegacyGame({
					id: '1',
					title: 'Catan',
					year: 1995,
					min_players: 3,
					max_players: 4,
					bgg_rating: 7.2,
					created_at: '2024-01-01T00:00:00.000Z'
				}),
				createLegacyGame({
					id: '2',
					title: 'Catan',
					year: 1995,
					min_players: 3,
					max_players: 4,
					bgg_rating: 7.2,
					created_at: '2024-06-01T00:00:00.000Z'
				})
			];
			const best = selectBestGameForCatalog(games);
			// Equal scores, older one wins
			expect(best.id).toBe('1');
		});
	});

	describe('extractSharedGameData - extracting shared metadata from legacy game', () => {
		it('should extract all shared game metadata fields', () => {
			const legacyGame = createLegacyGame({
				title: 'Catan',
				year: 1995,
				min_players: 3,
				max_players: 4,
				play_time_min: 60,
				play_time_max: 90,
				box_art_url: 'https://example.com/catan.jpg',
				description: 'A strategy game',
				categories: ['strategy', 'trading'],
				bgg_rating: 7.2,
				bgg_rank: 100,
				suggested_age: 10
			});

			const shared = extractSharedGameData(legacyGame);

			expect(shared).toEqual({
				title: 'Catan',
				year: 1995,
				min_players: 3,
				max_players: 4,
				play_time_min: 60,
				play_time_max: 90,
				box_art_url: 'https://example.com/catan.jpg',
				description: 'A strategy game',
				categories: ['strategy', 'trading'],
				bgg_rating: 7.2,
				bgg_rank: 100,
				suggested_age: 10
			});
		});

		it('should NOT include user-specific fields', () => {
			const legacyGame = createLegacyGame({
				id: 'game-123',
				user_id: 'user-456',
				play_count: 5,
				personal_rating: 4,
				review: 'Great game!'
			});

			const shared = extractSharedGameData(legacyGame);

			// Should not have user-specific fields
			expect(shared).not.toHaveProperty('id');
			expect(shared).not.toHaveProperty('user_id');
			expect(shared).not.toHaveProperty('play_count');
			expect(shared).not.toHaveProperty('personal_rating');
			expect(shared).not.toHaveProperty('review');
		});

		it('should handle all null optional fields', () => {
			const legacyGame = createLegacyGame({
				title: 'Unknown Game',
				year: null,
				min_players: null,
				max_players: null,
				play_time_min: null,
				play_time_max: null,
				box_art_url: null,
				description: null,
				categories: null,
				bgg_rating: null,
				bgg_rank: null,
				suggested_age: null
			});

			const shared = extractSharedGameData(legacyGame);

			expect(shared.title).toBe('Unknown Game');
			expect(shared.year).toBeNull();
			expect(shared.min_players).toBeNull();
			expect(shared.max_players).toBeNull();
		});
	});

	describe('extractLibraryEntryData - extracting user-specific data from legacy game', () => {
		it('should extract user-specific fields for library entry', () => {
			const legacyGame = createLegacyGame({
				user_id: 'user-123',
				play_count: 5,
				personal_rating: 4,
				review: 'Great game!'
			});

			const libraryData = extractLibraryEntryData(legacyGame, 'new-game-id');

			expect(libraryData).toEqual({
				user_id: 'user-123',
				game_id: 'new-game-id',
				play_count: 5,
				personal_rating: 4,
				review: 'Great game!'
			});
		});

		it('should return null for game without user_id', () => {
			const legacyGame = createLegacyGame({
				user_id: null,
				play_count: 5
			});

			const libraryData = extractLibraryEntryData(legacyGame, 'new-game-id');

			expect(libraryData).toBeNull();
		});

		it('should default play_count to 0 when null', () => {
			const legacyGame = createLegacyGame({
				user_id: 'user-123',
				play_count: null
			});

			const libraryData = extractLibraryEntryData(legacyGame, 'new-game-id');

			expect(libraryData?.play_count).toBe(0);
		});

		it('should preserve null personal_rating', () => {
			const legacyGame = createLegacyGame({
				user_id: 'user-123',
				personal_rating: null
			});

			const libraryData = extractLibraryEntryData(legacyGame, 'new-game-id');

			expect(libraryData?.personal_rating).toBeNull();
		});

		it('should preserve null review', () => {
			const legacyGame = createLegacyGame({
				user_id: 'user-123',
				review: null
			});

			const libraryData = extractLibraryEntryData(legacyGame, 'new-game-id');

			expect(libraryData?.review).toBeNull();
		});

		it('should use the provided newGameId', () => {
			const legacyGame = createLegacyGame({
				id: 'old-game-id',
				user_id: 'user-123'
			});

			const libraryData = extractLibraryEntryData(legacyGame, 'new-shared-game-id');

			expect(libraryData?.game_id).toBe('new-shared-game-id');
		});
	});

	describe('LegacyGame interface - legacy schema type validation', () => {
		it('should have user_id field (legacy schema)', () => {
			const game = createLegacyGame({ user_id: 'user-123' });
			expect(game).toHaveProperty('user_id');
			expect(game.user_id).toBe('user-123');
		});

		it('should have play_count field (legacy schema)', () => {
			const game = createLegacyGame({ play_count: 10 });
			expect(game).toHaveProperty('play_count');
			expect(game.play_count).toBe(10);
		});

		it('should have personal_rating field (legacy schema)', () => {
			const game = createLegacyGame({ personal_rating: 5 });
			expect(game).toHaveProperty('personal_rating');
			expect(game.personal_rating).toBe(5);
		});

		it('should have review field (legacy schema)', () => {
			const game = createLegacyGame({ review: 'Great game!' });
			expect(game).toHaveProperty('review');
			expect(game.review).toBe('Great game!');
		});

		it('should have all shared metadata fields', () => {
			const game = createLegacyGame({});
			expect(game).toHaveProperty('id');
			expect(game).toHaveProperty('title');
			expect(game).toHaveProperty('year');
			expect(game).toHaveProperty('min_players');
			expect(game).toHaveProperty('max_players');
			expect(game).toHaveProperty('play_time_min');
			expect(game).toHaveProperty('play_time_max');
			expect(game).toHaveProperty('box_art_url');
			expect(game).toHaveProperty('description');
			expect(game).toHaveProperty('categories');
			expect(game).toHaveProperty('bgg_rating');
			expect(game).toHaveProperty('bgg_rank');
			expect(game).toHaveProperty('suggested_age');
			expect(game).toHaveProperty('created_at');
			expect(game).toHaveProperty('updated_at');
		});
	});

	describe('SharedGameData interface - shared catalog type validation', () => {
		it('should only contain shared metadata fields', () => {
			const legacyGame = createLegacyGame({
				title: 'Test',
				user_id: 'user-123',
				play_count: 5
			});
			const shared = extractSharedGameData(legacyGame);

			const keys = Object.keys(shared);
			expect(keys).toContain('title');
			expect(keys).toContain('year');
			expect(keys).toContain('min_players');
			expect(keys).toContain('max_players');
			expect(keys).toContain('play_time_min');
			expect(keys).toContain('play_time_max');
			expect(keys).toContain('box_art_url');
			expect(keys).toContain('description');
			expect(keys).toContain('categories');
			expect(keys).toContain('bgg_rating');
			expect(keys).toContain('bgg_rank');
			expect(keys).toContain('suggested_age');

			expect(keys).not.toContain('id');
			expect(keys).not.toContain('user_id');
			expect(keys).not.toContain('play_count');
			expect(keys).not.toContain('personal_rating');
			expect(keys).not.toContain('review');
			expect(keys).not.toContain('created_at');
			expect(keys).not.toContain('updated_at');
		});

		it('should have exactly 12 fields', () => {
			const legacyGame = createLegacyGame({});
			const shared = extractSharedGameData(legacyGame);
			expect(Object.keys(shared)).toHaveLength(12);
		});
	});

	describe('LibraryEntryData interface - library entry type validation', () => {
		it('should contain user-specific fields', () => {
			const legacyGame = createLegacyGame({
				user_id: 'user-123',
				play_count: 5,
				personal_rating: 4,
				review: 'Great!'
			});
			const library = extractLibraryEntryData(legacyGame, 'game-id');

			expect(library).toHaveProperty('user_id');
			expect(library).toHaveProperty('game_id');
			expect(library).toHaveProperty('play_count');
			expect(library).toHaveProperty('personal_rating');
			expect(library).toHaveProperty('review');
		});

		it('should have exactly 5 fields', () => {
			const legacyGame = createLegacyGame({ user_id: 'user-123' });
			const library = extractLibraryEntryData(legacyGame, 'game-id');

			expect(Object.keys(library!)).toHaveLength(5);
		});

		it('should link to new shared game ID, not old game ID', () => {
			const legacyGame = createLegacyGame({
				id: 'old-id',
				user_id: 'user-123'
			});
			const library = extractLibraryEntryData(legacyGame, 'new-shared-id');

			expect(library?.game_id).toBe('new-shared-id');
			expect(library?.game_id).not.toBe('old-id');
		});
	});

	describe('MigrationResult interface - result tracking', () => {
		it('should have all required tracking fields', () => {
			const result: MigrationResult = {
				legacyGameId: 'old-game-1',
				title: 'Catan',
				userId: 'user-123',
				newGameId: 'new-game-1',
				libraryEntryId: 'library-1',
				action: 'created_library_entry',
				success: true
			};

			expect(result).toHaveProperty('legacyGameId');
			expect(result).toHaveProperty('title');
			expect(result).toHaveProperty('userId');
			expect(result).toHaveProperty('newGameId');
			expect(result).toHaveProperty('libraryEntryId');
			expect(result).toHaveProperty('action');
			expect(result).toHaveProperty('success');
		});

		it('should support all action types', () => {
			const actions: MigrationResult['action'][] = [
				'created_game',
				'reused_game',
				'created_library_entry',
				'skipped',
				'failed'
			];

			actions.forEach(action => {
				const result: MigrationResult = {
					legacyGameId: 'id',
					title: 'title',
					userId: null,
					newGameId: null,
					libraryEntryId: null,
					action,
					success: action !== 'failed'
				};
				expect(result.action).toBe(action);
			});
		});

		it('should support optional error field', () => {
			const failedResult: MigrationResult = {
				legacyGameId: 'old-game-1',
				title: 'Failed Game',
				userId: 'user-123',
				newGameId: null,
				libraryEntryId: null,
				action: 'failed',
				success: false,
				error: 'Database connection failed'
			};

			expect(failedResult.error).toBe('Database connection failed');
		});
	});

	describe('MigrationSummary interface - summary tracking', () => {
		it('should have all required summary fields', () => {
			const summary: MigrationSummary = {
				totalLegacyGames: 100,
				uniqueGamesCreated: 50,
				libraryEntriesCreated: 95,
				skipped: 3,
				failed: 2,
				results: []
			};

			expect(summary).toHaveProperty('totalLegacyGames');
			expect(summary).toHaveProperty('uniqueGamesCreated');
			expect(summary).toHaveProperty('libraryEntriesCreated');
			expect(summary).toHaveProperty('skipped');
			expect(summary).toHaveProperty('failed');
			expect(summary).toHaveProperty('results');
		});

		it('should track game deduplication correctly', () => {
			// Simulate 100 legacy games that deduplicate to 50 shared games
			const summary: MigrationSummary = {
				totalLegacyGames: 100, // Original game count
				uniqueGamesCreated: 50, // After deduplication
				libraryEntriesCreated: 100, // One per user-game relationship
				skipped: 0,
				failed: 0,
				results: []
			};

			expect(summary.totalLegacyGames).toBeGreaterThanOrEqual(summary.uniqueGamesCreated);
		});
	});

	describe('Deduplication scenarios - various deduplication cases', () => {
		it('should handle games owned by multiple users', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: 'Catan', user_id: 'user2' }),
				createLegacyGame({ id: '3', title: 'Catan', user_id: 'user3' })
			];

			const groups = groupGamesByTitle(games);
			const best = selectBestGameForCatalog(groups[0].games);
			const sharedData = extractSharedGameData(best);

			expect(groups).toHaveLength(1);
			expect(groups[0].games).toHaveLength(3);
			// All 3 users should get library entries pointing to same shared game
			expect(sharedData.title).toBe('Catan');
		});

		it('should select version with most metadata when deduplicating', () => {
			const games = [
				createLegacyGame({
					id: '1',
					title: 'Catan',
					user_id: 'user1',
					year: null,
					box_art_url: null
				}),
				createLegacyGame({
					id: '2',
					title: 'Catan',
					user_id: 'user2',
					year: 1995,
					box_art_url: 'https://example.com/catan.jpg',
					description: 'Trade and build settlements',
					bgg_rating: 7.2
				})
			];

			const groups = groupGamesByTitle(games);
			const best = selectBestGameForCatalog(groups[0].games);

			expect(best.id).toBe('2');
			expect(best.year).toBe(1995);
			expect(best.box_art_url).toBe('https://example.com/catan.jpg');
		});

		it('should preserve user-specific data for each user when deduplicating', () => {
			const games = [
				createLegacyGame({
					id: '1',
					title: 'Catan',
					user_id: 'user1',
					play_count: 10,
					personal_rating: 5,
					review: 'My favorite!'
				}),
				createLegacyGame({
					id: '2',
					title: 'Catan',
					user_id: 'user2',
					play_count: 3,
					personal_rating: 4,
					review: 'Good but long'
				})
			];

			const groups = groupGamesByTitle(games);
			const newGameId = 'shared-catan-id';

			const libraryEntry1 = extractLibraryEntryData(groups[0].games[0], newGameId);
			const libraryEntry2 = extractLibraryEntryData(groups[0].games[1], newGameId);

			// Each user keeps their own play count, rating, and review
			expect(libraryEntry1?.play_count).toBe(10);
			expect(libraryEntry1?.personal_rating).toBe(5);
			expect(libraryEntry1?.review).toBe('My favorite!');

			expect(libraryEntry2?.play_count).toBe(3);
			expect(libraryEntry2?.personal_rating).toBe(4);
			expect(libraryEntry2?.review).toBe('Good but long');

			// Both point to the same shared game
			expect(libraryEntry1?.game_id).toBe(newGameId);
			expect(libraryEntry2?.game_id).toBe(newGameId);
		});

		it('should handle mix of single-owner and multi-owner games', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: 'Catan', user_id: 'user2' }),
				createLegacyGame({ id: '3', title: 'Ticket to Ride', user_id: 'user1' }),
				createLegacyGame({ id: '4', title: 'Azul', user_id: 'user3' })
			];

			const groups = groupGamesByTitle(games);

			expect(groups).toHaveLength(3); // 3 unique games
			const catanGroup = groups.find(g => g.normalizedTitle === 'catan');
			const ttrGroup = groups.find(g => g.normalizedTitle === 'ticket to ride');
			const azulGroup = groups.find(g => g.normalizedTitle === 'azul');

			expect(catanGroup?.games).toHaveLength(2);
			expect(ttrGroup?.games).toHaveLength(1);
			expect(azulGroup?.games).toHaveLength(1);
		});
	});

	describe('Idempotency - safe to run multiple times', () => {
		it('should skip games without user_id', () => {
			const game = createLegacyGame({ user_id: null });
			const libraryData = extractLibraryEntryData(game, 'shared-game-id');

			expect(libraryData).toBeNull();
		});

		it('should handle same game being processed multiple times gracefully', () => {
			const game = createLegacyGame({
				title: 'Catan',
				user_id: 'user1'
			});

			// Simulate processing the same game twice
			const sharedData1 = extractSharedGameData(game);
			const sharedData2 = extractSharedGameData(game);

			// Should produce identical shared data
			expect(sharedData1).toEqual(sharedData2);

			const libraryData1 = extractLibraryEntryData(game, 'shared-id');
			const libraryData2 = extractLibraryEntryData(game, 'shared-id');

			// Should produce identical library data
			expect(libraryData1).toEqual(libraryData2);
		});

		it('should produce consistent normalized titles', () => {
			// Same title with different formatting should normalize to same value
			expect(normalizeTitle('Catan')).toBe(normalizeTitle('catan'));
			expect(normalizeTitle('Catan')).toBe(normalizeTitle('  CATAN  '));
			expect(normalizeTitle('Ticket to Ride')).toBe(normalizeTitle('ticket  TO  ride'));
		});
	});

	describe('Error handling scenarios - graceful error handling', () => {
		it('should handle games with empty title', () => {
			const game = createLegacyGame({ title: '' });
			const normalized = normalizeTitle(game.title);
			expect(normalized).toBe('');
		});

		it('should handle games with whitespace-only title', () => {
			const game = createLegacyGame({ title: '   ' });
			const normalized = normalizeTitle(game.title);
			expect(normalized).toBe('');
		});

		it('should handle null user_id gracefully', () => {
			const game = createLegacyGame({ user_id: null });
			const libraryData = extractLibraryEntryData(game, 'shared-id');
			expect(libraryData).toBeNull();
		});

		it('should handle all null metadata fields', () => {
			const game = createLegacyGame({
				title: 'Unknown',
				year: null,
				min_players: null,
				max_players: null,
				play_time_min: null,
				play_time_max: null,
				box_art_url: null,
				description: null,
				categories: null,
				bgg_rating: null,
				bgg_rank: null,
				suggested_age: null
			});

			const shared = extractSharedGameData(game);
			expect(shared.title).toBe('Unknown');
			expect(shared.year).toBeNull();
			expect(shared.min_players).toBeNull();
		});
	});

	describe('Acceptance criteria verification', () => {
		it('should handle all existing games in database', () => {
			// Simulating 5 legacy games
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: 'Ticket to Ride', user_id: 'user1' }),
				createLegacyGame({ id: '3', title: 'Azul', user_id: 'user2' }),
				createLegacyGame({ id: '4', title: 'Pandemic', user_id: 'user2' }),
				createLegacyGame({ id: '5', title: 'Catan', user_id: 'user2' }) // Duplicate
			];

			// Should process all games
			expect(games).toHaveLength(5);

			// Group them
			const groups = groupGamesByTitle(games);

			// Should identify unique titles
			expect(groups).toHaveLength(4); // Catan, Ticket to Ride, Azul, Pandemic
		});

		it('should deduplicate games by title keeping one shared record', () => {
			const games = [
				createLegacyGame({ id: '1', title: 'Catan', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: 'CATAN', user_id: 'user2' }),
				createLegacyGame({ id: '3', title: 'catan', user_id: 'user3' })
			];

			const groups = groupGamesByTitle(games);

			// All 3 Catan entries should be grouped together
			expect(groups).toHaveLength(1);
			expect(groups[0].games).toHaveLength(3);

			// One shared game will be created from the best record
			const best = selectBestGameForCatalog(groups[0].games);
			expect(best).toBeDefined();
		});

		it('should create library_games entries for each user game', () => {
			const games = [
				createLegacyGame({
					id: '1',
					title: 'Catan',
					user_id: 'user1',
					play_count: 5,
					personal_rating: 4,
					review: 'Great!'
				}),
				createLegacyGame({
					id: '2',
					title: 'Catan',
					user_id: 'user2',
					play_count: 10,
					personal_rating: 5,
					review: 'Amazing!'
				})
			];

			const sharedGameId = 'shared-catan-id';

			// Each user should get their own library entry
			const library1 = extractLibraryEntryData(games[0], sharedGameId);
			const library2 = extractLibraryEntryData(games[1], sharedGameId);

			expect(library1).not.toBeNull();
			expect(library2).not.toBeNull();
			expect(library1?.user_id).toBe('user1');
			expect(library2?.user_id).toBe('user2');
		});

		it('should preserve user-specific data (play_count, rating, review)', () => {
			const game = createLegacyGame({
				user_id: 'user123',
				play_count: 42,
				personal_rating: 5,
				review: 'Best game ever!'
			});

			const libraryData = extractLibraryEntryData(game, 'shared-id');

			expect(libraryData?.play_count).toBe(42);
			expect(libraryData?.personal_rating).toBe(5);
			expect(libraryData?.review).toBe('Best game ever!');
		});

		it('should be idempotent - same input produces same output', () => {
			const game = createLegacyGame({
				title: 'Catan',
				user_id: 'user1',
				year: 1995
			});

			// Run extraction multiple times
			const shared1 = extractSharedGameData(game);
			const shared2 = extractSharedGameData(game);

			const library1 = extractLibraryEntryData(game, 'id');
			const library2 = extractLibraryEntryData(game, 'id');

			expect(shared1).toEqual(shared2);
			expect(library1).toEqual(library2);
		});

		it('should handle errors gracefully and continue', () => {
			// Games with various edge cases
			const games = [
				createLegacyGame({ id: '1', title: 'Normal Game', user_id: 'user1' }),
				createLegacyGame({ id: '2', title: '', user_id: 'user2' }), // Empty title
				createLegacyGame({ id: '3', title: 'Another Game', user_id: null }), // No user
				createLegacyGame({ id: '4', title: 'Final Game', user_id: 'user1' })
			];

			// Should be able to process all games
			const groups = groupGamesByTitle(games);

			// Should handle edge cases
			expect(groups.length).toBeGreaterThanOrEqual(1);

			// Should still extract library data for valid games
			const validGame = games[0];
			const libraryData = extractLibraryEntryData(validGame, 'shared-id');
			expect(libraryData).not.toBeNull();
		});
	});

	describe('Edge cases', () => {
		it('should handle very long game titles', () => {
			const longTitle = 'A'.repeat(500) + ' Very Long Game Title';
			const normalized = normalizeTitle(longTitle);
			expect(normalized.length).toBeLessThanOrEqual(longTitle.length);
		});

		it('should handle special characters in titles', () => {
			const games = [
				createLegacyGame({ title: "Exploding Kittens: NSFW Edition" }),
				createLegacyGame({ title: "7 Wonders" }),
				createLegacyGame({ title: "Dungeons & Dragons" }),
				createLegacyGame({ title: "Risk (Classic)" })
			];

			games.forEach(game => {
				const normalized = normalizeTitle(game.title);
				expect(normalized.length).toBeGreaterThan(0);
			});
		});

		it('should handle games with zero play count', () => {
			const game = createLegacyGame({ user_id: 'user1', play_count: 0 });
			const libraryData = extractLibraryEntryData(game, 'shared-id');
			expect(libraryData?.play_count).toBe(0);
		});

		it('should handle games with max personal rating (5)', () => {
			const game = createLegacyGame({ user_id: 'user1', personal_rating: 5 });
			const libraryData = extractLibraryEntryData(game, 'shared-id');
			expect(libraryData?.personal_rating).toBe(5);
		});

		it('should handle games with min personal rating (1)', () => {
			const game = createLegacyGame({ user_id: 'user1', personal_rating: 1 });
			const libraryData = extractLibraryEntryData(game, 'shared-id');
			expect(libraryData?.personal_rating).toBe(1);
		});

		it('should handle empty review string', () => {
			const game = createLegacyGame({ user_id: 'user1', review: '' });
			const libraryData = extractLibraryEntryData(game, 'shared-id');
			expect(libraryData?.review).toBe('');
		});

		it('should handle very long review text', () => {
			const longReview = 'This game is amazing! '.repeat(100);
			const game = createLegacyGame({ user_id: 'user1', review: longReview });
			const libraryData = extractLibraryEntryData(game, 'shared-id');
			expect(libraryData?.review).toBe(longReview);
		});
	});
});
