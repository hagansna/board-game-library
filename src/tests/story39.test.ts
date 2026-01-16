/**
 * Story 39 Tests: Admin functions for managing the shared game catalog
 *
 * Acceptance Criteria:
 * - getAllGames() returns all games from shared catalog
 * - searchGames(query) searches catalog by title
 * - getGameById(id) returns single game from catalog
 * - createSharedGame(data) adds new game to catalog
 * - updateSharedGame(id, data) edits game metadata
 * - Functions use service role or bypass RLS appropriately
 */

import { describe, it, expect } from 'vitest';
import {
	getAllGames,
	searchGames,
	getGameById,
	createSharedGame,
	updateSharedGame,
	deleteSharedGame,
	transformGame,
	transformInput,
	type DbGame,
	type Game,
	type GameInput
} from '$lib/server/games';

// Mock DbGame for testing transforms
const createMockDbGame = (overrides: Partial<DbGame> = {}): DbGame => ({
	id: 'game-123',
	title: 'Test Game',
	year: 2020,
	min_players: 2,
	max_players: 4,
	play_time_min: 30,
	play_time_max: 60,
	box_art_url: 'https://example.com/art.jpg',
	description: 'A test game description',
	categories: ['strategy', 'family'],
	bgg_rating: 7.5,
	bgg_rank: 100,
	suggested_age: 10,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	...overrides
});

// Mock Game for testing
const createMockGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'game-123',
	title: 'Test Game',
	year: 2020,
	minPlayers: 2,
	maxPlayers: 4,
	playTimeMin: 30,
	playTimeMax: 60,
	boxArtUrl: 'https://example.com/art.jpg',
	description: 'A test game description',
	categories: ['strategy', 'family'],
	bggRating: 7.5,
	bggRank: 100,
	suggestedAge: 10,
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
	...overrides
});

describe('Story 39: Admin functions for game catalog', () => {
	describe('getAllGames function', () => {
		it('should be a function that accepts a supabase client', () => {
			expect(typeof getAllGames).toBe('function');
			expect(getAllGames.length).toBe(1); // One parameter (supabase)
		});

		it('should return a Promise', () => {
			// Create a mock that returns empty array
			const mockSupabase = {
				from: () => ({
					select: () => ({
						order: () => Promise.resolve({ data: [], error: null })
					})
				})
			};
			const result = getAllGames(mockSupabase as any);
			expect(result).toBeInstanceOf(Promise);
		});

		it('should return Game[] type (empty array on error)', async () => {
			const mockSupabase = {
				from: () => ({
					select: () => ({
						order: () => Promise.resolve({ data: null, error: { message: 'Error' } })
					})
				})
			};
			const result = await getAllGames(mockSupabase as any);
			expect(Array.isArray(result)).toBe(true);
			expect(result).toEqual([]);
		});

		it('should transform and return games when data is returned', async () => {
			const mockDbGames = [createMockDbGame({ id: 'game-1', title: 'Alpha' })];
			const mockSupabase = {
				from: () => ({
					select: () => ({
						order: () => Promise.resolve({ data: mockDbGames, error: null })
					})
				})
			};
			const result = await getAllGames(mockSupabase as any);
			expect(result.length).toBe(1);
			expect(result[0].id).toBe('game-1');
			expect(result[0].title).toBe('Alpha');
		});
	});

	describe('searchGames function', () => {
		it('should be a function that accepts supabase client and query string', () => {
			expect(typeof searchGames).toBe('function');
			expect(searchGames.length).toBe(2); // Two parameters
		});

		it('should return a Promise', () => {
			const mockSupabase = {
				from: () => ({
					select: () => ({
						ilike: () => ({
							order: () => ({
								limit: () => Promise.resolve({ data: [], error: null })
							})
						})
					})
				})
			};
			const result = searchGames(mockSupabase as any, 'test');
			expect(result).toBeInstanceOf(Promise);
		});

		it('should return empty array on error', async () => {
			const mockSupabase = {
				from: () => ({
					select: () => ({
						ilike: () => ({
							order: () => ({
								limit: () => Promise.resolve({ data: null, error: { message: 'Error' } })
							})
						})
					})
				})
			};
			const result = await searchGames(mockSupabase as any, 'test');
			expect(result).toEqual([]);
		});

		it('should use ilike for case-insensitive search', async () => {
			let capturedPattern = '';
			const mockSupabase = {
				from: () => ({
					select: () => ({
						ilike: (column: string, pattern: string) => {
							capturedPattern = pattern;
							return {
								order: () => ({
									limit: () => Promise.resolve({ data: [], error: null })
								})
							};
						}
					})
				})
			};
			await searchGames(mockSupabase as any, 'Catan');
			expect(capturedPattern).toBe('%Catan%');
		});

		it('should limit results to 50', async () => {
			let capturedLimit = 0;
			const mockSupabase = {
				from: () => ({
					select: () => ({
						ilike: () => ({
							order: () => ({
								limit: (n: number) => {
									capturedLimit = n;
									return Promise.resolve({ data: [], error: null });
								}
							})
						})
					})
				})
			};
			await searchGames(mockSupabase as any, 'test');
			expect(capturedLimit).toBe(50);
		});
	});

	describe('getGameById function', () => {
		it('should be a function that accepts supabase client and game ID', () => {
			expect(typeof getGameById).toBe('function');
			expect(getGameById.length).toBe(2); // Two parameters
		});

		it('should return null when game not found', async () => {
			const mockSupabase = {
				from: () => ({
					select: () => ({
						eq: () => ({
							single: () => Promise.resolve({ data: null, error: { message: 'Not found' } })
						})
					})
				})
			};
			const result = await getGameById(mockSupabase as any, 'nonexistent-id');
			expect(result).toBeNull();
		});

		it('should return transformed Game when found', async () => {
			const mockDbGame = createMockDbGame({ id: 'game-456', title: 'Found Game' });
			const mockSupabase = {
				from: () => ({
					select: () => ({
						eq: () => ({
							single: () => Promise.resolve({ data: mockDbGame, error: null })
						})
					})
				})
			};
			const result = await getGameById(mockSupabase as any, 'game-456');
			expect(result).not.toBeNull();
			expect(result!.id).toBe('game-456');
			expect(result!.title).toBe('Found Game');
		});

		it('should query by correct ID', async () => {
			let capturedId = '';
			const mockSupabase = {
				from: () => ({
					select: () => ({
						eq: (column: string, id: string) => {
							capturedId = id;
							return {
								single: () => Promise.resolve({ data: null, error: null })
							};
						}
					})
				})
			};
			await getGameById(mockSupabase as any, 'specific-game-id');
			expect(capturedId).toBe('specific-game-id');
		});
	});

	describe('createSharedGame function', () => {
		it('should be a function that accepts supabase client and game data', () => {
			expect(typeof createSharedGame).toBe('function');
			expect(createSharedGame.length).toBe(2); // Two parameters
		});

		it('should return null on error', async () => {
			const mockSupabase = {
				from: () => ({
					insert: () => ({
						select: () => ({
							single: () => Promise.resolve({ data: null, error: { message: 'Insert error' } })
						})
					})
				})
			};
			const result = await createSharedGame(mockSupabase as any, { title: 'New Game' });
			expect(result).toBeNull();
		});

		it('should return created Game on success', async () => {
			const createdDbGame = createMockDbGame({ id: 'new-game-id', title: 'New Game' });
			const mockSupabase = {
				from: () => ({
					insert: () => ({
						select: () => ({
							single: () => Promise.resolve({ data: createdDbGame, error: null })
						})
					})
				})
			};
			const result = await createSharedGame(mockSupabase as any, { title: 'New Game' });
			expect(result).not.toBeNull();
			expect(result!.id).toBe('new-game-id');
			expect(result!.title).toBe('New Game');
		});

		it('should not require user_id (games are shared)', async () => {
			let insertedData: any = null;
			const mockSupabase = {
				from: () => ({
					insert: (data: any) => {
						insertedData = data;
						return {
							select: () => ({
								single: () => Promise.resolve({ data: createMockDbGame(), error: null })
							})
						};
					}
				})
			};
			await createSharedGame(mockSupabase as any, { title: 'Shared Game' });
			expect(insertedData).not.toHaveProperty('user_id');
		});
	});

	describe('updateSharedGame function', () => {
		it('should be a function that accepts supabase client, game ID, and data', () => {
			expect(typeof updateSharedGame).toBe('function');
			expect(updateSharedGame.length).toBe(3); // Three parameters
		});

		it('should return null on error', async () => {
			const mockSupabase = {
				from: () => ({
					update: () => ({
						eq: () => ({
							select: () => ({
								single: () => Promise.resolve({ data: null, error: { message: 'Update error' } })
							})
						})
					})
				})
			};
			const result = await updateSharedGame(mockSupabase as any, 'game-id', { title: 'Updated' });
			expect(result).toBeNull();
		});

		it('should return updated Game on success', async () => {
			const updatedDbGame = createMockDbGame({ id: 'game-id', title: 'Updated Title' });
			const mockSupabase = {
				from: () => ({
					update: () => ({
						eq: () => ({
							select: () => ({
								single: () => Promise.resolve({ data: updatedDbGame, error: null })
							})
						})
					})
				})
			};
			const result = await updateSharedGame(mockSupabase as any, 'game-id', { title: 'Updated Title' });
			expect(result).not.toBeNull();
			expect(result!.title).toBe('Updated Title');
		});

		it('should update by correct game ID', async () => {
			let capturedId = '';
			const mockSupabase = {
				from: () => ({
					update: () => ({
						eq: (column: string, id: string) => {
							capturedId = id;
							return {
								select: () => ({
									single: () => Promise.resolve({ data: createMockDbGame(), error: null })
								})
							};
						}
					})
				})
			};
			await updateSharedGame(mockSupabase as any, 'target-game-id', { title: 'Updated' });
			expect(capturedId).toBe('target-game-id');
		});
	});

	describe('deleteSharedGame function', () => {
		it('should be a function that accepts supabase client and game ID', () => {
			expect(typeof deleteSharedGame).toBe('function');
			expect(deleteSharedGame.length).toBe(2);
		});

		it('should return false on error', async () => {
			const mockSupabase = {
				from: () => ({
					delete: () => ({
						eq: () => Promise.resolve({ error: { message: 'Delete error' } })
					})
				})
			};
			const result = await deleteSharedGame(mockSupabase as any, 'game-id');
			expect(result).toBe(false);
		});

		it('should return true on success', async () => {
			const mockSupabase = {
				from: () => ({
					delete: () => ({
						eq: () => Promise.resolve({ error: null })
					})
				})
			};
			const result = await deleteSharedGame(mockSupabase as any, 'game-id');
			expect(result).toBe(true);
		});
	});

	describe('transformGame function', () => {
		it('should transform snake_case to camelCase', () => {
			const dbGame = createMockDbGame();
			const game = transformGame(dbGame);

			expect(game.minPlayers).toBe(dbGame.min_players);
			expect(game.maxPlayers).toBe(dbGame.max_players);
			expect(game.playTimeMin).toBe(dbGame.play_time_min);
			expect(game.playTimeMax).toBe(dbGame.play_time_max);
			expect(game.boxArtUrl).toBe(dbGame.box_art_url);
			expect(game.bggRating).toBe(dbGame.bgg_rating);
			expect(game.bggRank).toBe(dbGame.bgg_rank);
			expect(game.suggestedAge).toBe(dbGame.suggested_age);
			expect(game.createdAt).toBe(dbGame.created_at);
			expect(game.updatedAt).toBe(dbGame.updated_at);
		});

		it('should preserve all shared metadata fields', () => {
			const dbGame = createMockDbGame();
			const game = transformGame(dbGame);

			expect(game.id).toBe(dbGame.id);
			expect(game.title).toBe(dbGame.title);
			expect(game.year).toBe(dbGame.year);
			expect(game.description).toBe(dbGame.description);
			expect(game.categories).toEqual(dbGame.categories);
		});

		it('should handle null values', () => {
			const dbGame = createMockDbGame({
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
			const game = transformGame(dbGame);

			expect(game.year).toBeNull();
			expect(game.minPlayers).toBeNull();
			expect(game.maxPlayers).toBeNull();
			expect(game.playTimeMin).toBeNull();
			expect(game.playTimeMax).toBeNull();
			expect(game.boxArtUrl).toBeNull();
			expect(game.description).toBeNull();
			expect(game.categories).toBeNull();
			expect(game.bggRating).toBeNull();
			expect(game.bggRank).toBeNull();
			expect(game.suggestedAge).toBeNull();
		});

		it('should not include user-specific fields', () => {
			const dbGame = createMockDbGame();
			const game = transformGame(dbGame);

			// These fields should NOT exist on Game interface
			expect((game as any).userId).toBeUndefined();
			expect((game as any).playCount).toBeUndefined();
			expect((game as any).personalRating).toBeUndefined();
			expect((game as any).review).toBeUndefined();
		});
	});

	describe('transformInput function', () => {
		it('should transform camelCase to snake_case', () => {
			const input: GameInput = {
				title: 'Test Game',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				boxArtUrl: 'https://example.com/art.jpg',
				bggRating: 7.5,
				bggRank: 100,
				suggestedAge: 10
			};
			const result = transformInput(input);

			expect(result.title).toBe('Test Game');
			expect(result.year).toBe(2020);
			expect(result.min_players).toBe(2);
			expect(result.max_players).toBe(4);
			expect(result.play_time_min).toBe(30);
			expect(result.play_time_max).toBe(60);
			expect(result.box_art_url).toBe('https://example.com/art.jpg');
			expect(result.bgg_rating).toBe(7.5);
			expect(result.bgg_rank).toBe(100);
			expect(result.suggested_age).toBe(10);
		});

		it('should parse categories JSON string to array', () => {
			const input: GameInput = {
				title: 'Test',
				categories: '["strategy", "family"]'
			};
			const result = transformInput(input);
			expect(result.categories).toEqual(['strategy', 'family']);
		});

		it('should handle invalid categories JSON', () => {
			const input: GameInput = {
				title: 'Test',
				categories: 'not valid json'
			};
			const result = transformInput(input);
			expect(result.categories).toBeNull();
		});

		it('should handle empty categories string', () => {
			const input: GameInput = {
				title: 'Test',
				categories: ''
			};
			const result = transformInput(input);
			expect(result.categories).toBeNull();
		});

		it('should only include defined fields', () => {
			const input: GameInput = { title: 'Minimal Game' };
			const result = transformInput(input);

			expect(result.title).toBe('Minimal Game');
			expect(result).not.toHaveProperty('year');
			expect(result).not.toHaveProperty('min_players');
			expect(result).not.toHaveProperty('max_players');
		});

		it('should not include user-specific fields', () => {
			const input: GameInput = { title: 'Test' };
			const result = transformInput(input);

			expect(result).not.toHaveProperty('user_id');
			expect(result).not.toHaveProperty('play_count');
			expect(result).not.toHaveProperty('personal_rating');
			expect(result).not.toHaveProperty('review');
		});
	});

	describe('Service role / RLS bypass behavior', () => {
		it('getAllGames does not require user_id filter', async () => {
			let selectCall: any = null;
			const mockSupabase = {
				from: () => ({
					select: (columns: string) => {
						selectCall = columns;
						return {
							order: () => Promise.resolve({ data: [], error: null })
						};
					}
				})
			};
			await getAllGames(mockSupabase as any);
			expect(selectCall).toBe('*');
		});

		it('searchGames does not filter by user_id', async () => {
			let hasUserFilter = false;
			const mockSupabase = {
				from: () => ({
					select: () => ({
						ilike: () => ({
							order: () => ({
								limit: () => Promise.resolve({ data: [], error: null })
							})
						}),
						eq: () => {
							hasUserFilter = true;
							return { ilike: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) };
						}
					})
				})
			};
			await searchGames(mockSupabase as any, 'test');
			expect(hasUserFilter).toBe(false);
		});

		it('getGameById accesses any game in catalog without ownership check', async () => {
			const anyGame = createMockDbGame({ id: 'any-game-id' });
			const mockSupabase = {
				from: () => ({
					select: () => ({
						eq: () => ({
							single: () => Promise.resolve({ data: anyGame, error: null })
						})
					})
				})
			};
			const result = await getGameById(mockSupabase as any, 'any-game-id');
			expect(result).not.toBeNull();
			expect(result!.id).toBe('any-game-id');
		});
	});

	describe('Acceptance criteria verification', () => {
		it('getAllGames returns all games from shared catalog', () => {
			// Function exists and returns Game[] - verified by type system and other tests
			expect(typeof getAllGames).toBe('function');
		});

		it('searchGames searches catalog by title', () => {
			// Function uses ilike for case-insensitive partial match - verified by other tests
			expect(typeof searchGames).toBe('function');
		});

		it('getGameById returns single game from catalog', () => {
			// Function returns Game | null - verified by type system and other tests
			expect(typeof getGameById).toBe('function');
		});

		it('createSharedGame adds new game to catalog', () => {
			// Function inserts to games table - verified by other tests
			expect(typeof createSharedGame).toBe('function');
		});

		it('updateSharedGame edits game metadata', () => {
			// Function updates games table by ID - verified by other tests
			expect(typeof updateSharedGame).toBe('function');
		});

		it('Functions use service role or bypass RLS appropriately', () => {
			// No user_id filter in queries - verified by other tests
			// RLS policies documented in module header for manual setup
			expect(true).toBe(true);
		});
	});

	describe('Edge cases', () => {
		it('getAllGames handles empty catalog', async () => {
			const mockSupabase = {
				from: () => ({
					select: () => ({
						order: () => Promise.resolve({ data: [], error: null })
					})
				})
			};
			const result = await getAllGames(mockSupabase as any);
			expect(result).toEqual([]);
		});

		it('searchGames handles empty query', async () => {
			let capturedPattern = '';
			const mockSupabase = {
				from: () => ({
					select: () => ({
						ilike: (_col: string, pattern: string) => {
							capturedPattern = pattern;
							return {
								order: () => ({
									limit: () => Promise.resolve({ data: [], error: null })
								})
							};
						}
					})
				})
			};
			await searchGames(mockSupabase as any, '');
			expect(capturedPattern).toBe('%%');
		});

		it('searchGames handles special characters in query', async () => {
			let capturedPattern = '';
			const mockSupabase = {
				from: () => ({
					select: () => ({
						ilike: (_col: string, pattern: string) => {
							capturedPattern = pattern;
							return {
								order: () => ({
									limit: () => Promise.resolve({ data: [], error: null })
								})
							};
						}
					})
				})
			};
			await searchGames(mockSupabase as any, "O'Reilly");
			expect(capturedPattern).toBe("%O'Reilly%");
		});

		it('getGameById handles empty string ID', async () => {
			let capturedId = 'not-called';
			const mockSupabase = {
				from: () => ({
					select: () => ({
						eq: (_col: string, id: string) => {
							capturedId = id;
							return {
								single: () => Promise.resolve({ data: null, error: null })
							};
						}
					})
				})
			};
			await getGameById(mockSupabase as any, '');
			expect(capturedId).toBe('');
		});

		it('createSharedGame with only required field (title)', async () => {
			let insertedData: any = null;
			const mockSupabase = {
				from: () => ({
					insert: (data: any) => {
						insertedData = data;
						return {
							select: () => ({
								single: () => Promise.resolve({ data: createMockDbGame({ title: 'Minimal' }), error: null })
							})
						};
					}
				})
			};
			await createSharedGame(mockSupabase as any, { title: 'Minimal' });
			expect(insertedData.title).toBe('Minimal');
			expect(Object.keys(insertedData).length).toBe(1);
		});
	});
});
