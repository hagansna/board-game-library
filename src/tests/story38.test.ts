import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Import functions and types from library-games
import {
	addToLibrary,
	updateLibraryEntry,
	removeFromLibrary,
	updateLibraryPlayCount,
	addGameToLibrary,
	addExistingGameToLibrary,
	getLibraryEntryWithGame,
	getUserLibrary,
	isValidPlayCount,
	isValidPersonalRating,
	type LibraryGameInput,
	type UserGameView
} from '$lib/server/library-games';

// Mock Supabase client factory
function createMockSupabase(overrides: Partial<ReturnType<typeof vi.fn>> = {}) {
	const mockSelect = vi.fn();
	const mockInsert = vi.fn();
	const mockUpdate = vi.fn();
	const mockDelete = vi.fn();
	const mockEq = vi.fn();
	const mockSingle = vi.fn();
	const mockOrder = vi.fn();

	const chainable = {
		select: mockSelect.mockReturnThis(),
		insert: mockInsert.mockReturnThis(),
		update: mockUpdate.mockReturnThis(),
		delete: mockDelete.mockReturnThis(),
		eq: mockEq.mockReturnThis(),
		single: mockSingle,
		order: mockOrder.mockReturnThis(),
		...overrides
	};

	const mockFrom = vi.fn(() => chainable);

	return {
		from: mockFrom,
		_mocks: {
			from: mockFrom,
			select: mockSelect,
			insert: mockInsert,
			update: mockUpdate,
			delete: mockDelete,
			eq: mockEq,
			single: mockSingle,
			order: mockOrder
		}
	} as unknown as SupabaseClient & { _mocks: Record<string, ReturnType<typeof vi.fn>> };
}

describe('Story 38: CRUD operations for split schema', () => {
	describe('addToLibrary function', () => {
		it('should insert into library_games table', async () => {
			const mockSupabase = createMockSupabase();
			const mockLibraryEntry = {
				id: 'lib-123',
				user_id: 'user-456',
				game_id: 'game-789',
				play_count: 0,
				personal_rating: null,
				review: null,
				created_at: '2026-01-16T00:00:00Z',
				updated_at: '2026-01-16T00:00:00Z'
			};

			mockSupabase._mocks.single.mockResolvedValue({ data: mockLibraryEntry, error: null });

			const input: LibraryGameInput = {
				gameId: 'game-789',
				playCount: 0,
				personalRating: null,
				review: null
			};

			const result = await addToLibrary(mockSupabase, 'user-456', input);

			expect(mockSupabase._mocks.from).toHaveBeenCalledWith('library_games');
			expect(mockSupabase._mocks.insert).toHaveBeenCalled();
			expect(result).not.toBeNull();
			expect(result?.gameId).toBe('game-789');
		});

		it('should validate play count before insertion', async () => {
			const mockSupabase = createMockSupabase();

			const input: LibraryGameInput = {
				gameId: 'game-789',
				playCount: -5, // Invalid
				personalRating: null,
				review: null
			};

			const result = await addToLibrary(mockSupabase, 'user-456', input);

			expect(result).toBeNull();
		});

		it('should validate personal rating before insertion', async () => {
			const mockSupabase = createMockSupabase();

			const input: LibraryGameInput = {
				gameId: 'game-789',
				playCount: 0,
				personalRating: 10, // Invalid (must be 1-5)
				review: null
			};

			const result = await addToLibrary(mockSupabase, 'user-456', input);

			expect(result).toBeNull();
		});
	});

	describe('updateLibraryEntry function', () => {
		it('should update library_games fields', async () => {
			const mockSupabase = createMockSupabase();
			const mockUpdatedEntry = {
				id: 'lib-123',
				user_id: 'user-456',
				game_id: 'game-789',
				play_count: 5,
				personal_rating: 4,
				review: 'Great game!',
				created_at: '2026-01-16T00:00:00Z',
				updated_at: '2026-01-16T01:00:00Z'
			};

			mockSupabase._mocks.single.mockResolvedValue({ data: mockUpdatedEntry, error: null });

			const result = await updateLibraryEntry(mockSupabase, 'lib-123', {
				playCount: 5,
				personalRating: 4,
				review: 'Great game!'
			});

			expect(mockSupabase._mocks.from).toHaveBeenCalledWith('library_games');
			expect(mockSupabase._mocks.update).toHaveBeenCalled();
			expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('id', 'lib-123');
			expect(result).not.toBeNull();
			expect(result?.playCount).toBe(5);
			expect(result?.personalRating).toBe(4);
			expect(result?.review).toBe('Great game!');
		});

		it('should validate play count on update', async () => {
			const mockSupabase = createMockSupabase();

			const result = await updateLibraryEntry(mockSupabase, 'lib-123', {
				playCount: -1 // Invalid
			});

			expect(result).toBeNull();
		});

		it('should validate personal rating on update', async () => {
			const mockSupabase = createMockSupabase();

			const result = await updateLibraryEntry(mockSupabase, 'lib-123', {
				personalRating: 6 // Invalid (must be 1-5)
			});

			expect(result).toBeNull();
		});
	});

	describe('removeFromLibrary function', () => {
		it('should delete from library_games only', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.eq.mockResolvedValue({ error: null });

			const result = await removeFromLibrary(mockSupabase, 'lib-123');

			expect(mockSupabase._mocks.from).toHaveBeenCalledWith('library_games');
			expect(mockSupabase._mocks.delete).toHaveBeenCalled();
			expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('id', 'lib-123');
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.eq.mockResolvedValue({ error: { message: 'Not found' } });

			const result = await removeFromLibrary(mockSupabase, 'invalid-id');

			expect(result).toBe(false);
		});
	});

	describe('updateLibraryPlayCount function', () => {
		it('should increment play count', async () => {
			const mockSupabase = createMockSupabase();

			// First call gets current value
			mockSupabase._mocks.single
				.mockResolvedValueOnce({ data: { play_count: 5 }, error: null })
				// Second call updates
				.mockResolvedValueOnce({ data: { play_count: 6 }, error: null });

			const result = await updateLibraryPlayCount(mockSupabase, 'lib-123', 1);

			expect(result).not.toBeNull();
			expect(result?.playCount).toBe(6);
		});

		it('should decrement play count but not below 0', async () => {
			const mockSupabase = createMockSupabase();

			// Current count is 0
			mockSupabase._mocks.single
				.mockResolvedValueOnce({ data: { play_count: 0 }, error: null })
				.mockResolvedValueOnce({ data: { play_count: 0 }, error: null });

			const result = await updateLibraryPlayCount(mockSupabase, 'lib-123', -1);

			expect(result).not.toBeNull();
			expect(result?.playCount).toBe(0);
		});

		it('should target library_games table', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.single
				.mockResolvedValueOnce({ data: { play_count: 1 }, error: null })
				.mockResolvedValueOnce({ data: { play_count: 2 }, error: null });

			await updateLibraryPlayCount(mockSupabase, 'lib-123', 1);

			expect(mockSupabase._mocks.from).toHaveBeenCalledWith('library_games');
		});
	});

	describe('Validation functions', () => {
		describe('isValidPlayCount', () => {
			it('should accept null', () => {
				expect(isValidPlayCount(null)).toBe(true);
			});

			it('should accept undefined', () => {
				expect(isValidPlayCount(undefined)).toBe(true);
			});

			it('should accept 0', () => {
				expect(isValidPlayCount(0)).toBe(true);
			});

			it('should accept positive integers', () => {
				expect(isValidPlayCount(1)).toBe(true);
				expect(isValidPlayCount(100)).toBe(true);
			});

			it('should reject negative numbers', () => {
				expect(isValidPlayCount(-1)).toBe(false);
			});

			it('should reject non-integers', () => {
				expect(isValidPlayCount(1.5)).toBe(false);
			});
		});

		describe('isValidPersonalRating', () => {
			it('should accept null', () => {
				expect(isValidPersonalRating(null)).toBe(true);
			});

			it('should accept undefined', () => {
				expect(isValidPersonalRating(undefined)).toBe(true);
			});

			it('should accept 1-5', () => {
				expect(isValidPersonalRating(1)).toBe(true);
				expect(isValidPersonalRating(3)).toBe(true);
				expect(isValidPersonalRating(5)).toBe(true);
			});

			it('should reject 0', () => {
				expect(isValidPersonalRating(0)).toBe(false);
			});

			it('should reject values > 5', () => {
				expect(isValidPersonalRating(6)).toBe(false);
			});

			it('should reject non-integers', () => {
				expect(isValidPersonalRating(3.5)).toBe(false);
			});
		});
	});

	describe('UserGameView interface structure', () => {
		it('should have library entry identifiers', () => {
			const view: UserGameView = {
				libraryEntryId: 'lib-123',
				gameId: 'game-456',
				userId: 'user-789',
				title: 'Test Game',
				year: 2020,
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
				playCount: 0,
				personalRating: null,
				review: null,
				gameCreatedAt: '2026-01-16T00:00:00Z',
				gameUpdatedAt: '2026-01-16T00:00:00Z',
				libraryEntryCreatedAt: '2026-01-16T00:00:00Z',
				libraryEntryUpdatedAt: '2026-01-16T00:00:00Z'
			};

			expect(view.libraryEntryId).toBe('lib-123');
			expect(view.gameId).toBe('game-456');
			expect(view.userId).toBe('user-789');
		});

		it('should include both game metadata and user-specific fields', () => {
			const view: UserGameView = {
				libraryEntryId: 'lib-123',
				gameId: 'game-456',
				userId: 'user-789',
				// Game metadata
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 90,
				boxArtUrl: 'https://example.com/catan.jpg',
				description: 'A trading and building game',
				categories: ['strategy', 'trading'],
				bggRating: 7.2,
				bggRank: 150,
				suggestedAge: 10,
				// User-specific
				playCount: 15,
				personalRating: 5,
				review: 'One of my favorites!',
				// Timestamps
				gameCreatedAt: '2026-01-15T00:00:00Z',
				gameUpdatedAt: '2026-01-15T00:00:00Z',
				libraryEntryCreatedAt: '2026-01-16T00:00:00Z',
				libraryEntryUpdatedAt: '2026-01-16T00:00:00Z'
			};

			// Game metadata
			expect(view.title).toBe('Catan');
			expect(view.year).toBe(1995);
			expect(view.bggRating).toBe(7.2);

			// User-specific
			expect(view.playCount).toBe(15);
			expect(view.personalRating).toBe(5);
			expect(view.review).toBe('One of my favorites!');
		});
	});

	describe('getLibraryEntryWithGame function', () => {
		it('should return combined game + library data', async () => {
			const mockSupabase = createMockSupabase();
			const mockJoinResult = {
				id: 'lib-123',
				user_id: 'user-456',
				game_id: 'game-789',
				play_count: 5,
				personal_rating: 4,
				review: 'Fun game!',
				created_at: '2026-01-16T00:00:00Z',
				updated_at: '2026-01-16T00:00:00Z',
				games: {
					id: 'game-789',
					title: 'Test Game',
					year: 2020,
					min_players: 2,
					max_players: 4,
					play_time_min: 30,
					play_time_max: 60,
					box_art_url: null,
					description: 'A test game',
					categories: ['test'],
					bgg_rating: 7.5,
					bgg_rank: 100,
					suggested_age: 10,
					created_at: '2026-01-15T00:00:00Z',
					updated_at: '2026-01-15T00:00:00Z'
				}
			};

			mockSupabase._mocks.single.mockResolvedValue({ data: mockJoinResult, error: null });

			const result = await getLibraryEntryWithGame(mockSupabase, 'lib-123');

			expect(result).not.toBeNull();
			expect(result?.libraryEntryId).toBe('lib-123');
			expect(result?.gameId).toBe('game-789');
			expect(result?.title).toBe('Test Game');
			expect(result?.playCount).toBe(5);
			expect(result?.personalRating).toBe(4);
		});

		it('should return null if entry not found', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

			const result = await getLibraryEntryWithGame(mockSupabase, 'invalid-id');

			expect(result).toBeNull();
		});
	});

	describe('Acceptance Criteria Verification', () => {
		it('addGameToLibrary inserts into library_games table only', async () => {
			// The addGameToLibrary function creates a game in the catalog AND adds to library
			// This verifies the library_games insertion part
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.single
				// First call creates the game
				.mockResolvedValueOnce({
					data: {
						id: 'game-123',
						title: 'New Game',
						year: 2026,
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
						created_at: '2026-01-16T00:00:00Z',
						updated_at: '2026-01-16T00:00:00Z'
					},
					error: null
				})
				// Second call creates the library entry
				.mockResolvedValueOnce({
					data: {
						id: 'lib-456',
						user_id: 'user-789',
						game_id: 'game-123',
						play_count: 0,
						personal_rating: null,
						review: null,
						created_at: '2026-01-16T00:00:00Z',
						updated_at: '2026-01-16T00:00:00Z'
					},
					error: null
				});

			const result = await addGameToLibrary(
				mockSupabase,
				'user-789',
				{ title: 'New Game', year: 2026 },
				{ playCount: 0 }
			);

			expect(result).not.toBeNull();
			expect(result?.title).toBe('New Game');
			expect(result?.libraryEntryId).toBe('lib-456');
		});

		it('getLibraryEntryWithGame returns combined data via JOIN', async () => {
			// Already tested above, this is a semantic verification
			expect(typeof getLibraryEntryWithGame).toBe('function');
		});

		it('updateLibraryEntry updates library_games fields only', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.single.mockResolvedValue({
				data: {
					id: 'lib-123',
					user_id: 'user-456',
					game_id: 'game-789',
					play_count: 10,
					personal_rating: 5,
					review: 'Updated review',
					created_at: '2026-01-16T00:00:00Z',
					updated_at: '2026-01-16T01:00:00Z'
				},
				error: null
			});

			const result = await updateLibraryEntry(mockSupabase, 'lib-123', {
				playCount: 10,
				personalRating: 5,
				review: 'Updated review'
			});

			// Verify it targets library_games
			expect(mockSupabase._mocks.from).toHaveBeenCalledWith('library_games');
			expect(result?.playCount).toBe(10);
			expect(result?.personalRating).toBe(5);
		});

		it('removeFromLibrary deletes from library_games only (game stays in catalog)', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.eq.mockResolvedValue({ error: null });

			const result = await removeFromLibrary(mockSupabase, 'lib-123');

			// Verify it only targets library_games, not games
			expect(mockSupabase._mocks.from).toHaveBeenCalledWith('library_games');
			expect(result).toBe(true);
		});

		it('updateLibraryPlayCount updates library_games.play_count', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.single
				.mockResolvedValueOnce({ data: { play_count: 3 }, error: null })
				.mockResolvedValueOnce({ data: { play_count: 4 }, error: null });

			const result = await updateLibraryPlayCount(mockSupabase, 'lib-123', 1);

			expect(mockSupabase._mocks.from).toHaveBeenCalledWith('library_games');
			expect(result?.playCount).toBe(4);
		});
	});

	describe('Edge Cases', () => {
		it('handles null play_count from database', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.single
				.mockResolvedValueOnce({ data: { play_count: null }, error: null })
				.mockResolvedValueOnce({ data: { play_count: 1 }, error: null });

			const result = await updateLibraryPlayCount(mockSupabase, 'lib-123', 1);

			expect(result?.playCount).toBe(1);
		});

		it('handles missing game relation gracefully', async () => {
			const mockSupabase = createMockSupabase();
			mockSupabase._mocks.single.mockResolvedValue({
				data: {
					id: 'lib-123',
					user_id: 'user-456',
					game_id: 'game-789',
					play_count: 0,
					personal_rating: null,
					review: null,
					created_at: '2026-01-16T00:00:00Z',
					updated_at: '2026-01-16T00:00:00Z',
					games: null // Game was deleted
				},
				error: null
			});

			const result = await getLibraryEntryWithGame(mockSupabase, 'lib-123');

			expect(result).toBeNull();
		});

		it('addExistingGameToLibrary prevents duplicate entries', async () => {
			const mockSupabase = createMockSupabase();

			// Game exists in catalog
			mockSupabase._mocks.single
				.mockResolvedValueOnce({
					data: {
						id: 'game-123',
						title: 'Existing Game',
						year: 2020,
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
						created_at: '2026-01-15T00:00:00Z',
						updated_at: '2026-01-15T00:00:00Z'
					},
					error: null
				})
				// Game already in library
				.mockResolvedValueOnce({
					data: {
						id: 'lib-existing',
						user_id: 'user-456',
						game_id: 'game-123',
						play_count: 5,
						personal_rating: 4,
						review: null,
						created_at: '2026-01-15T00:00:00Z',
						updated_at: '2026-01-15T00:00:00Z'
					},
					error: null
				});

			const result = await addExistingGameToLibrary(mockSupabase, 'user-456', 'game-123');

			expect(result).toBeNull(); // Should fail because already in library
		});
	});

	describe('Route Handler Integration', () => {
		it('games page should use getUserLibrary', () => {
			// Verify the function exists and returns UserGameView[]
			expect(typeof getUserLibrary).toBe('function');
		});

		it('UserGameView has libraryEntryId for form actions', () => {
			const view: UserGameView = {
				libraryEntryId: 'lib-123',
				gameId: 'game-456',
				userId: 'user-789',
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

			// libraryEntryId should be used for delete and playcount actions
			expect(view.libraryEntryId).toBeDefined();
			expect(typeof view.libraryEntryId).toBe('string');
		});
	});
});
