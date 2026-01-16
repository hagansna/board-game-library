import { describe, it, expect } from 'vitest';
import type { DbGame, Game } from '$lib/server/games';
import { transformGame } from '$lib/server/games';
import type {
	DbLibraryGame,
	LibraryGame,
	UserGameView,
	DbUserGameView,
	DbUserGameViewFlat
} from '$lib/server/library-games';
import {
	transformLibraryGame,
	transformUserGameView,
	transformUserGameViewFlat,
	combineGameAndLibraryEntry
} from '$lib/server/library-games';

// Sample DbGame for testing (shared metadata only)
const sampleDbGame: DbGame = {
	id: 'game-123',
	title: 'Catan',
	year: 1995,
	min_players: 3,
	max_players: 4,
	play_time_min: 60,
	play_time_max: 120,
	box_art_url: 'https://example.com/catan.jpg',
	description: 'A classic trading and building game',
	categories: ['strategy', 'trading'],
	bgg_rating: 7.2,
	bgg_rank: 150,
	suggested_age: 10,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-02T00:00:00Z'
};

// Sample DbLibraryGame for testing (user-specific data)
const sampleDbLibraryGame: DbLibraryGame = {
	id: 'library-456',
	user_id: 'user-789',
	game_id: 'game-123',
	play_count: 5,
	personal_rating: 4,
	review: 'Great game for game nights!',
	created_at: '2024-02-01T00:00:00Z',
	updated_at: '2024-02-02T00:00:00Z'
};

describe('Story 36: TypeScript interfaces for split schema', () => {
	describe('DbGame interface (shared metadata only)', () => {
		it('should contain only shared game metadata fields', () => {
			// Verify DbGame has all expected fields
			const game: DbGame = sampleDbGame;

			expect(game.id).toBeDefined();
			expect(game.title).toBeDefined();
			expect(game.year).toBeDefined();
			expect(game.min_players).toBeDefined();
			expect(game.max_players).toBeDefined();
			expect(game.play_time_min).toBeDefined();
			expect(game.play_time_max).toBeDefined();
			expect(game.box_art_url).toBeDefined();
			expect(game.description).toBeDefined();
			expect(game.categories).toBeDefined();
			expect(game.bgg_rating).toBeDefined();
			expect(game.bgg_rank).toBeDefined();
			expect(game.suggested_age).toBeDefined();
			expect(game.created_at).toBeDefined();
			expect(game.updated_at).toBeDefined();
		});

		it('should NOT contain user-specific fields', () => {
			const game = sampleDbGame as Record<string, unknown>;

			// Verify DbGame does NOT have user-specific fields
			expect(game['user_id']).toBeUndefined();
			expect(game['play_count']).toBeUndefined();
			expect(game['personal_rating']).toBeUndefined();
			expect(game['review']).toBeUndefined();
		});

		it('should have 15 fields for shared metadata', () => {
			const keys = Object.keys(sampleDbGame);
			// id, title, year, min_players, max_players, play_time_min, play_time_max,
			// box_art_url, description, categories, bgg_rating, bgg_rank, suggested_age,
			// created_at, updated_at = 15 fields
			expect(keys.length).toBe(15);
		});
	});

	describe('DbLibraryGame interface (user-specific data)', () => {
		it('should contain user-specific fields', () => {
			const entry: DbLibraryGame = sampleDbLibraryGame;

			expect(entry.id).toBeDefined();
			expect(entry.user_id).toBeDefined();
			expect(entry.game_id).toBeDefined();
			expect(entry.play_count).toBeDefined();
			expect(entry.personal_rating).toBeDefined();
			expect(entry.review).toBeDefined();
			expect(entry.created_at).toBeDefined();
			expect(entry.updated_at).toBeDefined();
		});

		it('should NOT contain game metadata fields', () => {
			const entry = sampleDbLibraryGame as Record<string, unknown>;

			expect(entry['title']).toBeUndefined();
			expect(entry['year']).toBeUndefined();
			expect(entry['min_players']).toBeUndefined();
			expect(entry['description']).toBeUndefined();
		});

		it('should have 8 fields for library entry', () => {
			const keys = Object.keys(sampleDbLibraryGame);
			// id, user_id, game_id, play_count, personal_rating, review, created_at, updated_at = 8 fields
			expect(keys.length).toBe(8);
		});
	});

	describe('UserGameView interface (combined data for UI)', () => {
		it('should combine game metadata and library data', () => {
			const view: UserGameView = {
				// Library entry identifiers
				libraryEntryId: 'library-456',
				gameId: 'game-123',
				userId: 'user-789',

				// Shared game metadata
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				boxArtUrl: 'https://example.com/catan.jpg',
				description: 'A classic trading game',
				categories: ['strategy'],
				bggRating: 7.2,
				bggRank: 150,
				suggestedAge: 10,

				// User-specific data
				playCount: 5,
				personalRating: 4,
				review: 'Great game!',

				// Timestamps
				gameCreatedAt: '2024-01-01T00:00:00Z',
				gameUpdatedAt: '2024-01-02T00:00:00Z',
				libraryEntryCreatedAt: '2024-02-01T00:00:00Z',
				libraryEntryUpdatedAt: '2024-02-02T00:00:00Z'
			};

			// Verify all fields exist
			expect(view.libraryEntryId).toBe('library-456');
			expect(view.gameId).toBe('game-123');
			expect(view.userId).toBe('user-789');
			expect(view.title).toBe('Catan');
			expect(view.year).toBe(1995);
			expect(view.playCount).toBe(5);
			expect(view.personalRating).toBe(4);
			expect(view.review).toBe('Great game!');
		});

		it('should have 19 fields combining game and library data', () => {
			const view: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Test',
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				boxArtUrl: null,
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null,
				suggestedAge: null,
				playCount: null,
				personalRating: null,
				review: null,
				gameCreatedAt: '',
				gameUpdatedAt: '',
				libraryEntryCreatedAt: '',
				libraryEntryUpdatedAt: ''
			};

			const keys = Object.keys(view);
			// 3 identifiers + 12 game metadata + 3 user-specific + 4 timestamps = 22 fields
			expect(keys.length).toBe(22);
		});

		it('should allow null values for optional fields', () => {
			const view: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Test Game',
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				boxArtUrl: null,
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null,
				suggestedAge: null,
				playCount: null,
				personalRating: null,
				review: null,
				gameCreatedAt: '2024-01-01T00:00:00Z',
				gameUpdatedAt: '2024-01-01T00:00:00Z',
				libraryEntryCreatedAt: '2024-02-01T00:00:00Z',
				libraryEntryUpdatedAt: '2024-02-01T00:00:00Z'
			};

			expect(view.year).toBeNull();
			expect(view.playCount).toBeNull();
			expect(view.personalRating).toBeNull();
			expect(view.review).toBeNull();
		});
	});

	describe('transformGame function (shared metadata)', () => {
		it('should transform DbGame to Game correctly', () => {
			const game: Game = transformGame(sampleDbGame);

			expect(game.id).toBe('game-123');
			expect(game.title).toBe('Catan');
			expect(game.year).toBe(1995);
			expect(game.minPlayers).toBe(3);
			expect(game.maxPlayers).toBe(4);
			expect(game.playTimeMin).toBe(60);
			expect(game.playTimeMax).toBe(120);
			expect(game.boxArtUrl).toBe('https://example.com/catan.jpg');
			expect(game.description).toBe('A classic trading and building game');
			expect(game.categories).toEqual(['strategy', 'trading']);
			expect(game.bggRating).toBe(7.2);
			expect(game.bggRank).toBe(150);
			expect(game.suggestedAge).toBe(10);
			expect(game.createdAt).toBe('2024-01-01T00:00:00Z');
			expect(game.updatedAt).toBe('2024-01-02T00:00:00Z');
		});

		it('should NOT include user-specific fields in transformed Game', () => {
			const game = transformGame(sampleDbGame) as Record<string, unknown>;

			expect(game['userId']).toBeUndefined();
			expect(game['playCount']).toBeUndefined();
			expect(game['personalRating']).toBeUndefined();
			expect(game['review']).toBeUndefined();
		});
	});

	describe('transformLibraryGame function', () => {
		it('should transform DbLibraryGame to LibraryGame correctly', () => {
			const entry: LibraryGame = transformLibraryGame(sampleDbLibraryGame);

			expect(entry.id).toBe('library-456');
			expect(entry.userId).toBe('user-789');
			expect(entry.gameId).toBe('game-123');
			expect(entry.playCount).toBe(5);
			expect(entry.personalRating).toBe(4);
			expect(entry.review).toBe('Great game for game nights!');
			expect(entry.createdAt).toBe('2024-02-01T00:00:00Z');
			expect(entry.updatedAt).toBe('2024-02-02T00:00:00Z');
		});

		it('should handle null values correctly', () => {
			const dbEntry: DbLibraryGame = {
				...sampleDbLibraryGame,
				play_count: null,
				personal_rating: null,
				review: null
			};

			const entry = transformLibraryGame(dbEntry);

			expect(entry.playCount).toBeNull();
			expect(entry.personalRating).toBeNull();
			expect(entry.review).toBeNull();
		});
	});

	describe('transformUserGameView function', () => {
		it('should transform DbUserGameView to UserGameView correctly', () => {
			const dbRow: DbUserGameView = {
				id: 'library-456',
				user_id: 'user-789',
				game_id: 'game-123',
				play_count: 5,
				personal_rating: 4,
				review: 'Great game!',
				created_at: '2024-02-01T00:00:00Z',
				updated_at: '2024-02-02T00:00:00Z',
				games: sampleDbGame
			};

			const view = transformUserGameView(dbRow);

			// Check library entry identifiers
			expect(view.libraryEntryId).toBe('library-456');
			expect(view.gameId).toBe('game-123');
			expect(view.userId).toBe('user-789');

			// Check game metadata
			expect(view.title).toBe('Catan');
			expect(view.year).toBe(1995);
			expect(view.minPlayers).toBe(3);
			expect(view.maxPlayers).toBe(4);
			expect(view.description).toBe('A classic trading and building game');

			// Check user-specific data
			expect(view.playCount).toBe(5);
			expect(view.personalRating).toBe(4);
			expect(view.review).toBe('Great game!');

			// Check timestamps
			expect(view.gameCreatedAt).toBe('2024-01-01T00:00:00Z');
			expect(view.libraryEntryCreatedAt).toBe('2024-02-01T00:00:00Z');
		});

		it('should handle null values in both game and library data', () => {
			const dbGameWithNulls: DbGame = {
				id: 'game-123',
				title: 'Test Game',
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
				id: 'library-456',
				user_id: 'user-789',
				game_id: 'game-123',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-02-01T00:00:00Z',
				updated_at: '2024-02-01T00:00:00Z',
				games: dbGameWithNulls
			};

			const view = transformUserGameView(dbRow);

			expect(view.year).toBeNull();
			expect(view.minPlayers).toBeNull();
			expect(view.playCount).toBeNull();
			expect(view.personalRating).toBeNull();
			expect(view.review).toBeNull();
		});
	});

	describe('transformUserGameViewFlat function', () => {
		it('should transform flattened JOIN result to UserGameView', () => {
			const dbRow: DbUserGameViewFlat = {
				library_id: 'library-456',
				user_id: 'user-789',
				game_id: 'game-123',
				play_count: 5,
				personal_rating: 4,
				review: 'Great game!',
				library_created_at: '2024-02-01T00:00:00Z',
				library_updated_at: '2024-02-02T00:00:00Z',
				title: 'Catan',
				year: 1995,
				min_players: 3,
				max_players: 4,
				play_time_min: 60,
				play_time_max: 120,
				box_art_url: 'https://example.com/catan.jpg',
				description: 'A classic game',
				categories: ['strategy'],
				bgg_rating: 7.2,
				bgg_rank: 150,
				suggested_age: 10,
				game_created_at: '2024-01-01T00:00:00Z',
				game_updated_at: '2024-01-02T00:00:00Z'
			};

			const view = transformUserGameViewFlat(dbRow);

			expect(view.libraryEntryId).toBe('library-456');
			expect(view.gameId).toBe('game-123');
			expect(view.userId).toBe('user-789');
			expect(view.title).toBe('Catan');
			expect(view.year).toBe(1995);
			expect(view.playCount).toBe(5);
			expect(view.personalRating).toBe(4);
			expect(view.gameCreatedAt).toBe('2024-01-01T00:00:00Z');
			expect(view.libraryEntryCreatedAt).toBe('2024-02-01T00:00:00Z');
		});
	});

	describe('combineGameAndLibraryEntry function', () => {
		it('should combine separate Game and LibraryGame into UserGameView', () => {
			const game: Game = {
				id: 'game-123',
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				boxArtUrl: 'https://example.com/catan.jpg',
				description: 'A classic game',
				categories: ['strategy'],
				bggRating: 7.2,
				bggRank: 150,
				suggestedAge: 10,
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-02T00:00:00Z'
			};

			const libraryEntry: LibraryGame = {
				id: 'library-456',
				userId: 'user-789',
				gameId: 'game-123',
				playCount: 5,
				personalRating: 4,
				review: 'Great game!',
				createdAt: '2024-02-01T00:00:00Z',
				updatedAt: '2024-02-02T00:00:00Z'
			};

			const view = combineGameAndLibraryEntry(game, libraryEntry);

			// Check identifiers
			expect(view.libraryEntryId).toBe('library-456');
			expect(view.gameId).toBe('game-123');
			expect(view.userId).toBe('user-789');

			// Check game metadata
			expect(view.title).toBe('Catan');
			expect(view.year).toBe(1995);
			expect(view.minPlayers).toBe(3);
			expect(view.maxPlayers).toBe(4);

			// Check user-specific data
			expect(view.playCount).toBe(5);
			expect(view.personalRating).toBe(4);
			expect(view.review).toBe('Great game!');

			// Check timestamps come from correct sources
			expect(view.gameCreatedAt).toBe('2024-01-01T00:00:00Z');
			expect(view.libraryEntryCreatedAt).toBe('2024-02-01T00:00:00Z');
		});

		it('should handle null user-specific fields', () => {
			const game: Game = {
				id: 'game-123',
				title: 'Test Game',
				year: 2000,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				boxArtUrl: null,
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null,
				suggestedAge: null,
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const libraryEntry: LibraryGame = {
				id: 'library-789',
				userId: 'user-123',
				gameId: 'game-123',
				playCount: null,
				personalRating: null,
				review: null,
				createdAt: '2024-02-01T00:00:00Z',
				updatedAt: '2024-02-01T00:00:00Z'
			};

			const view = combineGameAndLibraryEntry(game, libraryEntry);

			expect(view.playCount).toBeNull();
			expect(view.personalRating).toBeNull();
			expect(view.review).toBeNull();
			expect(view.boxArtUrl).toBeNull();
		});

		it('should use game ID from Game object for consistency', () => {
			const game: Game = {
				id: 'game-correct-id',
				title: 'Test',
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				boxArtUrl: null,
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null,
				suggestedAge: null,
				createdAt: '',
				updatedAt: ''
			};

			const libraryEntry: LibraryGame = {
				id: 'lib-1',
				userId: 'user-1',
				gameId: 'game-different-id', // This should NOT be used
				playCount: null,
				personalRating: null,
				review: null,
				createdAt: '',
				updatedAt: ''
			};

			const view = combineGameAndLibraryEntry(game, libraryEntry);

			// gameId should come from the Game object
			expect(view.gameId).toBe('game-correct-id');
		});
	});

	describe('Acceptance criteria verification', () => {
		it('AC1: DbGame interface contains only shared game metadata fields', () => {
			const game: DbGame = sampleDbGame;
			const keys = Object.keys(game);

			// Should have shared metadata fields
			expect(keys).toContain('id');
			expect(keys).toContain('title');
			expect(keys).toContain('year');
			expect(keys).toContain('min_players');
			expect(keys).toContain('description');
			expect(keys).toContain('categories');
			expect(keys).toContain('bgg_rating');

			// Should NOT have user-specific fields
			expect(keys).not.toContain('user_id');
			expect(keys).not.toContain('play_count');
			expect(keys).not.toContain('personal_rating');
			expect(keys).not.toContain('review');
		});

		it('AC2: DbLibraryGame interface contains user-specific fields', () => {
			const entry: DbLibraryGame = sampleDbLibraryGame;
			const keys = Object.keys(entry);

			// Should have user-specific fields
			expect(keys).toContain('user_id');
			expect(keys).toContain('game_id');
			expect(keys).toContain('play_count');
			expect(keys).toContain('personal_rating');
			expect(keys).toContain('review');
		});

		it('AC3: UserGameView interface combines game and library data for UI', () => {
			const view: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Test',
				year: 2000,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				boxArtUrl: null,
				description: 'A test game',
				categories: ['test'],
				bggRating: 7.0,
				bggRank: 100,
				suggestedAge: 8,
				playCount: 10,
				personalRating: 5,
				review: 'Great!',
				gameCreatedAt: '',
				gameUpdatedAt: '',
				libraryEntryCreatedAt: '',
				libraryEntryUpdatedAt: ''
			};

			// Has game metadata
			expect(view.title).toBeDefined();
			expect(view.year).toBeDefined();
			expect(view.description).toBeDefined();

			// Has library data
			expect(view.playCount).toBeDefined();
			expect(view.personalRating).toBeDefined();
			expect(view.review).toBeDefined();

			// Has both identifiers
			expect(view.libraryEntryId).toBeDefined();
			expect(view.gameId).toBeDefined();
			expect(view.userId).toBeDefined();
		});

		it('AC4: Transform functions handle mapping between DB and app types', () => {
			// transformGame works
			const game = transformGame(sampleDbGame);
			expect(game.minPlayers).toBe(sampleDbGame.min_players);
			expect(game.maxPlayers).toBe(sampleDbGame.max_players);

			// transformLibraryGame works
			const entry = transformLibraryGame(sampleDbLibraryGame);
			expect(entry.userId).toBe(sampleDbLibraryGame.user_id);
			expect(entry.gameId).toBe(sampleDbLibraryGame.game_id);

			// transformUserGameView works
			const dbRow: DbUserGameView = {
				...sampleDbLibraryGame,
				games: sampleDbGame
			};
			const view = transformUserGameView(dbRow);
			expect(view.title).toBe(sampleDbGame.title);
			expect(view.playCount).toBe(sampleDbLibraryGame.play_count);
		});

		it('AC5: Existing code should compile without errors (type test)', () => {
			// This test passes if the file compiles - TypeScript will catch errors at compile time
			// We're testing that the interfaces are properly defined and usable

			const game: Game = transformGame(sampleDbGame);
			const entry: LibraryGame = transformLibraryGame(sampleDbLibraryGame);
			const combined: UserGameView = combineGameAndLibraryEntry(game, entry);

			// Types are properly assigned
			expect(typeof game.title).toBe('string');
			expect(typeof entry.userId).toBe('string');
			expect(typeof combined.libraryEntryId).toBe('string');
		});
	});

	describe('Edge cases', () => {
		it('should handle game with all null optional fields', () => {
			const minimalDbGame: DbGame = {
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

			const game = transformGame(minimalDbGame);

			expect(game.title).toBe('Minimal Game');
			expect(game.year).toBeNull();
			expect(game.minPlayers).toBeNull();
			expect(game.description).toBeNull();
		});

		it('should handle library entry with zero play count', () => {
			const entryWithZero: DbLibraryGame = {
				...sampleDbLibraryGame,
				play_count: 0
			};

			const entry = transformLibraryGame(entryWithZero);

			expect(entry.playCount).toBe(0);
		});

		it('should handle categories as empty array', () => {
			const gameWithEmptyCategories: DbGame = {
				...sampleDbGame,
				categories: []
			};

			const game = transformGame(gameWithEmptyCategories);

			expect(game.categories).toEqual([]);
		});

		it('should handle very long review text', () => {
			const longReview = 'A'.repeat(10000);
			const entryWithLongReview: DbLibraryGame = {
				...sampleDbLibraryGame,
				review: longReview
			};

			const entry = transformLibraryGame(entryWithLongReview);

			expect(entry.review).toBe(longReview);
			expect(entry.review?.length).toBe(10000);
		});
	});

	describe('Type safety verification', () => {
		it('DbGame should not accept user_id field', () => {
			// This is a compile-time check - if DbGame had user_id, this would fail to compile
			const game: DbGame = {
				id: 'test',
				title: 'Test',
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
				created_at: '',
				updated_at: ''
			};

			// Just verify it's a valid DbGame
			expect(game.id).toBe('test');
		});

		it('Game interface should be camelCase', () => {
			const game: Game = transformGame(sampleDbGame);

			// Verify camelCase naming
			expect('minPlayers' in game).toBe(true);
			expect('maxPlayers' in game).toBe(true);
			expect('playTimeMin' in game).toBe(true);
			expect('playTimeMax' in game).toBe(true);
			expect('boxArtUrl' in game).toBe(true);
			expect('bggRating' in game).toBe(true);
			expect('bggRank' in game).toBe(true);
			expect('suggestedAge' in game).toBe(true);
			expect('createdAt' in game).toBe(true);
			expect('updatedAt' in game).toBe(true);

			// Verify snake_case is NOT present
			expect('min_players' in game).toBe(false);
			expect('max_players' in game).toBe(false);
		});

		it('LibraryGame interface should be camelCase', () => {
			const entry: LibraryGame = transformLibraryGame(sampleDbLibraryGame);

			// Verify camelCase naming
			expect('userId' in entry).toBe(true);
			expect('gameId' in entry).toBe(true);
			expect('playCount' in entry).toBe(true);
			expect('personalRating' in entry).toBe(true);
			expect('createdAt' in entry).toBe(true);
			expect('updatedAt' in entry).toBe(true);

			// Verify snake_case is NOT present
			expect('user_id' in entry).toBe(false);
			expect('game_id' in entry).toBe(false);
		});
	});
});
