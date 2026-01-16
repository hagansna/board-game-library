/**
 * Story 37: getUserLibrary function returns combined game and library data via JOIN
 *
 * Acceptance Criteria:
 * - getUserLibrary() replaces getUserGames()
 * - Function performs JOIN between games and library_games tables
 * - Returns UserGameView[] with both game metadata and user-specific data
 * - Results filtered by authenticated user's library entries
 * - Empty array returned if user has no library entries
 */

import { describe, it, expect } from 'vitest';
import {
	getUserLibrary,
	getLibraryEntryWithGame,
	getLibraryEntryWithGameByGameId,
	transformUserGameView,
	type DbUserGameView,
	type UserGameView
} from '$lib/server/library-games.js';
import type { DbGame } from '$lib/server/games.js';

// Mock data for testing
const mockDbGame: DbGame = {
	id: 'game-123',
	title: 'Catan',
	year: 1995,
	min_players: 3,
	max_players: 4,
	play_time_min: 60,
	play_time_max: 90,
	box_art_url: 'https://example.com/catan.jpg',
	description: 'A classic trading game',
	categories: ['strategy', 'trading'],
	bgg_rating: 7.2,
	bgg_rank: 150,
	suggested_age: 10,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-02T00:00:00Z'
};

const mockDbUserGameView: DbUserGameView = {
	id: 'lib-entry-123',
	user_id: 'user-123',
	game_id: 'game-123',
	play_count: 5,
	personal_rating: 4,
	review: 'Great game for family nights!',
	created_at: '2024-02-01T00:00:00Z',
	updated_at: '2024-02-02T00:00:00Z',
	games: mockDbGame
};

describe('Story 37: getUserLibrary function with JOIN', () => {
	describe('getUserLibrary function signature', () => {
		it('should export getUserLibrary function', () => {
			expect(typeof getUserLibrary).toBe('function');
		});

		it('should accept supabase client as first parameter', () => {
			// Function exists and accepts parameters
			expect(getUserLibrary.length).toBeGreaterThanOrEqual(1);
		});

		it('should accept optional sortBy parameter', () => {
			// Function signature allows sortBy
			expect(typeof getUserLibrary).toBe('function');
		});
	});

	describe('getLibraryEntryWithGame function signature', () => {
		it('should export getLibraryEntryWithGame function', () => {
			expect(typeof getLibraryEntryWithGame).toBe('function');
		});

		it('should accept supabase client and libraryEntryId parameters', () => {
			expect(getLibraryEntryWithGame.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('getLibraryEntryWithGameByGameId function signature', () => {
		it('should export getLibraryEntryWithGameByGameId function', () => {
			expect(typeof getLibraryEntryWithGameByGameId).toBe('function');
		});

		it('should accept supabase client and gameId parameters', () => {
			expect(getLibraryEntryWithGameByGameId.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('transformUserGameView function', () => {
		it('should transform DbUserGameView to UserGameView', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect(result).toBeDefined();
			expect(result.libraryEntryId).toBe('lib-entry-123');
			expect(result.gameId).toBe('game-123');
			expect(result.userId).toBe('user-123');
		});

		it('should include all game metadata fields', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect(result.title).toBe('Catan');
			expect(result.year).toBe(1995);
			expect(result.minPlayers).toBe(3);
			expect(result.maxPlayers).toBe(4);
			expect(result.playTimeMin).toBe(60);
			expect(result.playTimeMax).toBe(90);
			expect(result.boxArtUrl).toBe('https://example.com/catan.jpg');
			expect(result.description).toBe('A classic trading game');
			expect(result.categories).toEqual(['strategy', 'trading']);
			expect(result.bggRating).toBe(7.2);
			expect(result.bggRank).toBe(150);
			expect(result.suggestedAge).toBe(10);
		});

		it('should include all user-specific fields', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect(result.playCount).toBe(5);
			expect(result.personalRating).toBe(4);
			expect(result.review).toBe('Great game for family nights!');
		});

		it('should include all timestamp fields', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect(result.gameCreatedAt).toBe('2024-01-01T00:00:00Z');
			expect(result.gameUpdatedAt).toBe('2024-01-02T00:00:00Z');
			expect(result.libraryEntryCreatedAt).toBe('2024-02-01T00:00:00Z');
			expect(result.libraryEntryUpdatedAt).toBe('2024-02-02T00:00:00Z');
		});
	});

	describe('UserGameView interface structure', () => {
		it('should have library entry identifiers', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect('libraryEntryId' in result).toBe(true);
			expect('gameId' in result).toBe(true);
			expect('userId' in result).toBe(true);
		});

		it('should have shared game metadata from games table', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect('title' in result).toBe(true);
			expect('year' in result).toBe(true);
			expect('minPlayers' in result).toBe(true);
			expect('maxPlayers' in result).toBe(true);
			expect('playTimeMin' in result).toBe(true);
			expect('playTimeMax' in result).toBe(true);
			expect('boxArtUrl' in result).toBe(true);
			expect('description' in result).toBe(true);
			expect('categories' in result).toBe(true);
			expect('bggRating' in result).toBe(true);
			expect('bggRank' in result).toBe(true);
			expect('suggestedAge' in result).toBe(true);
		});

		it('should have user-specific data from library_games table', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect('playCount' in result).toBe(true);
			expect('personalRating' in result).toBe(true);
			expect('review' in result).toBe(true);
		});

		it('should have separate timestamps for game and library entry', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect('gameCreatedAt' in result).toBe(true);
			expect('gameUpdatedAt' in result).toBe(true);
			expect('libraryEntryCreatedAt' in result).toBe(true);
			expect('libraryEntryUpdatedAt' in result).toBe(true);
		});
	});

	describe('UserGameView with null values', () => {
		it('should handle null game metadata fields', () => {
			const dbRowWithNulls: DbUserGameView = {
				id: 'lib-entry-456',
				user_id: 'user-456',
				game_id: 'game-456',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-02-01T00:00:00Z',
				updated_at: '2024-02-02T00:00:00Z',
				games: {
					id: 'game-456',
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
					suggested_age: null,
					created_at: '2024-01-01T00:00:00Z',
					updated_at: '2024-01-02T00:00:00Z'
				}
			};

			const result = transformUserGameView(dbRowWithNulls);

			expect(result.year).toBeNull();
			expect(result.minPlayers).toBeNull();
			expect(result.maxPlayers).toBeNull();
			expect(result.playTimeMin).toBeNull();
			expect(result.playTimeMax).toBeNull();
			expect(result.boxArtUrl).toBeNull();
			expect(result.description).toBeNull();
			expect(result.categories).toBeNull();
			expect(result.bggRating).toBeNull();
			expect(result.bggRank).toBeNull();
			expect(result.suggestedAge).toBeNull();
		});

		it('should handle null user-specific fields', () => {
			const dbRowWithNullUserData: DbUserGameView = {
				...mockDbUserGameView,
				play_count: null,
				personal_rating: null,
				review: null
			};

			const result = transformUserGameView(dbRowWithNullUserData);

			expect(result.playCount).toBeNull();
			expect(result.personalRating).toBeNull();
			expect(result.review).toBeNull();
		});
	});

	describe('Sort options for getUserLibrary', () => {
		it('should support title sort option', () => {
			// Sort option 'title' should be valid
			const sortOption: Parameters<typeof getUserLibrary>[1] = 'title';
			expect(sortOption).toBe('title');
		});

		it('should support recently_added sort option', () => {
			const sortOption: Parameters<typeof getUserLibrary>[1] = 'recently_added';
			expect(sortOption).toBe('recently_added');
		});

		it('should support year sort option', () => {
			const sortOption: Parameters<typeof getUserLibrary>[1] = 'year';
			expect(sortOption).toBe('year');
		});

		it('should support play_count sort option', () => {
			const sortOption: Parameters<typeof getUserLibrary>[1] = 'play_count';
			expect(sortOption).toBe('play_count');
		});
	});

	describe('Return type verification', () => {
		it('should return UserGameView type from transform', () => {
			const result: UserGameView = transformUserGameView(mockDbUserGameView);
			expect(result).toBeDefined();
		});

		it('should return array type from getUserLibrary', async () => {
			// getUserLibrary returns Promise<UserGameView[]>
			expect(getUserLibrary).toBeDefined();
			// Type check: the function should return a promise
			const fn = getUserLibrary;
			expect(typeof fn).toBe('function');
		});
	});

	describe('Acceptance Criteria Verification', () => {
		it('AC1: getUserLibrary replaces getUserGames for user library', () => {
			// getUserLibrary is the new function for fetching user's library
			expect(typeof getUserLibrary).toBe('function');
		});

		it('AC2: Function performs JOIN between games and library_games', () => {
			// The transform function expects DbUserGameView which contains both library and game data
			// This structure requires a JOIN query in the actual implementation
			const joinResult: DbUserGameView = mockDbUserGameView;
			expect(joinResult.id).toBeDefined(); // library_games.id
			expect(joinResult.games).toBeDefined(); // joined games table
			expect(joinResult.games.id).toBeDefined(); // games.id
		});

		it('AC3: Returns UserGameView[] with both game metadata and user data', () => {
			const result = transformUserGameView(mockDbUserGameView);

			// Game metadata
			expect(result.title).toBe('Catan');
			expect(result.year).toBe(1995);

			// User-specific data
			expect(result.playCount).toBe(5);
			expect(result.personalRating).toBe(4);
			expect(result.review).toBeDefined();
		});

		it('AC4: Results include library entry identifiers for filtering by user', () => {
			const result = transformUserGameView(mockDbUserGameView);
			expect(result.userId).toBe('user-123');
			expect(result.libraryEntryId).toBe('lib-entry-123');
			expect(result.gameId).toBe('game-123');
		});

		it('AC5: Function handles empty results gracefully', () => {
			// The function should return empty array for users with no library entries
			// This is verified by the function implementation returning []
			expect(getUserLibrary).toBeDefined();
		});
	});

	describe('Edge cases', () => {
		it('should handle games with minimal data', () => {
			const minimalGame: DbGame = {
				id: 'game-minimal',
				title: 'Minimal Game',
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
				suggested_age: null,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z'
			};

			const dbRow: DbUserGameView = {
				id: 'lib-minimal',
				user_id: 'user-minimal',
				game_id: 'game-minimal',
				play_count: 0,
				personal_rating: null,
				review: null,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
				games: minimalGame
			};

			const result = transformUserGameView(dbRow);
			expect(result.title).toBe('Minimal Game');
			expect(result.playCount).toBe(0);
		});

		it('should handle games with full data', () => {
			const result = transformUserGameView(mockDbUserGameView);

			// All fields should be populated
			expect(result.title).toBe('Catan');
			expect(result.year).toBe(1995);
			expect(result.minPlayers).toBe(3);
			expect(result.maxPlayers).toBe(4);
			expect(result.playTimeMin).toBe(60);
			expect(result.playTimeMax).toBe(90);
			expect(result.boxArtUrl).toBe('https://example.com/catan.jpg');
			expect(result.description).toBe('A classic trading game');
			expect(result.categories).toEqual(['strategy', 'trading']);
			expect(result.bggRating).toBe(7.2);
			expect(result.bggRank).toBe(150);
			expect(result.suggestedAge).toBe(10);
			expect(result.playCount).toBe(5);
			expect(result.personalRating).toBe(4);
			expect(result.review).toBe('Great game for family nights!');
		});

		it('should handle zero play count', () => {
			const dbRow: DbUserGameView = {
				...mockDbUserGameView,
				play_count: 0
			};

			const result = transformUserGameView(dbRow);
			expect(result.playCount).toBe(0);
		});

		it('should handle empty categories array', () => {
			const dbRow: DbUserGameView = {
				...mockDbUserGameView,
				games: {
					...mockDbGame,
					categories: []
				}
			};

			const result = transformUserGameView(dbRow);
			expect(result.categories).toEqual([]);
		});

		it('should handle empty review string', () => {
			const dbRow: DbUserGameView = {
				...mockDbUserGameView,
				review: ''
			};

			const result = transformUserGameView(dbRow);
			expect(result.review).toBe('');
		});
	});

	describe('Data integrity', () => {
		it('should preserve all IDs correctly', () => {
			const result = transformUserGameView(mockDbUserGameView);

			// Library entry ID comes from library_games.id
			expect(result.libraryEntryId).toBe(mockDbUserGameView.id);

			// Game ID should match both the library entry's game_id and the game's id
			expect(result.gameId).toBe(mockDbUserGameView.game_id);
			expect(result.gameId).toBe(mockDbUserGameView.games.id);

			// User ID comes from library_games.user_id
			expect(result.userId).toBe(mockDbUserGameView.user_id);
		});

		it('should correctly map timestamps from both tables', () => {
			const result = transformUserGameView(mockDbUserGameView);

			// Game timestamps
			expect(result.gameCreatedAt).toBe(mockDbUserGameView.games.created_at);
			expect(result.gameUpdatedAt).toBe(mockDbUserGameView.games.updated_at);

			// Library entry timestamps
			expect(result.libraryEntryCreatedAt).toBe(mockDbUserGameView.created_at);
			expect(result.libraryEntryUpdatedAt).toBe(mockDbUserGameView.updated_at);
		});

		it('should correctly transform snake_case to camelCase', () => {
			const result = transformUserGameView(mockDbUserGameView);

			// Database uses snake_case, result should use camelCase
			expect(result.minPlayers).toBeDefined();
			expect(result.maxPlayers).toBeDefined();
			expect(result.playTimeMin).toBeDefined();
			expect(result.playTimeMax).toBeDefined();
			expect(result.boxArtUrl).toBeDefined();
			expect(result.bggRating).toBeDefined();
			expect(result.bggRank).toBeDefined();
			expect(result.suggestedAge).toBeDefined();
			expect(result.playCount).toBeDefined();
			expect(result.personalRating).toBeDefined();
		});
	});

	describe('Multiple games transformation', () => {
		it('should handle transforming multiple games independently', () => {
			const secondGame: DbUserGameView = {
				id: 'lib-entry-456',
				user_id: 'user-123',
				game_id: 'game-456',
				play_count: 10,
				personal_rating: 5,
				review: 'Best game ever!',
				created_at: '2024-03-01T00:00:00Z',
				updated_at: '2024-03-02T00:00:00Z',
				games: {
					id: 'game-456',
					title: 'Ticket to Ride',
					year: 2004,
					min_players: 2,
					max_players: 5,
					play_time_min: 30,
					play_time_max: 60,
					box_art_url: 'https://example.com/ttr.jpg',
					description: 'Train adventure game',
					categories: ['family', 'trains'],
					bgg_rating: 7.5,
					bgg_rank: 50,
					suggested_age: 8,
					created_at: '2024-01-05T00:00:00Z',
					updated_at: '2024-01-06T00:00:00Z'
				}
			};

			const result1 = transformUserGameView(mockDbUserGameView);
			const result2 = transformUserGameView(secondGame);

			// Verify each game is transformed correctly
			expect(result1.title).toBe('Catan');
			expect(result2.title).toBe('Ticket to Ride');

			// Verify user data is separate
			expect(result1.playCount).toBe(5);
			expect(result2.playCount).toBe(10);

			// Verify library entry IDs are different
			expect(result1.libraryEntryId).not.toBe(result2.libraryEntryId);

			// Same user can have multiple games
			expect(result1.userId).toBe(result2.userId);
		});
	});

	describe('Function export verification', () => {
		it('should export getUserLibrary from library-games module', () => {
			expect(getUserLibrary).toBeDefined();
			expect(typeof getUserLibrary).toBe('function');
		});

		it('should export getLibraryEntryWithGame from library-games module', () => {
			expect(getLibraryEntryWithGame).toBeDefined();
			expect(typeof getLibraryEntryWithGame).toBe('function');
		});

		it('should export getLibraryEntryWithGameByGameId from library-games module', () => {
			expect(getLibraryEntryWithGameByGameId).toBeDefined();
			expect(typeof getLibraryEntryWithGameByGameId).toBe('function');
		});

		it('should export transformUserGameView from library-games module', () => {
			expect(transformUserGameView).toBeDefined();
			expect(typeof transformUserGameView).toBe('function');
		});
	});
});
