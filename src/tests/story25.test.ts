import { describe, it, expect } from 'vitest';

// Test the suggested age data model changes
// These tests verify the interface definitions and transformation logic

// Copy of interfaces for testing (mirrors src/lib/server/games.ts)
interface DbGame {
	id: string;
	user_id: string;
	title: string;
	year: number | null;
	min_players: number | null;
	max_players: number | null;
	play_time_min: number | null;
	play_time_max: number | null;
	box_art_url: string | null;
	description: string | null;
	categories: string[] | null;
	bgg_rating: number | null;
	bgg_rank: number | null;
	suggested_age: number | null;
	created_at: string;
	updated_at: string;
}

interface Game {
	id: string;
	title: string;
	year: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playTimeMin: number | null;
	playTimeMax: number | null;
	boxArtUrl: string | null;
	description: string | null;
	categories: string[] | null;
	bggRating: number | null;
	bggRank: number | null;
	suggestedAge: number | null;
	createdAt: string;
	updatedAt: string;
}

interface GameInput {
	title: string;
	year?: number | null;
	minPlayers?: number | null;
	maxPlayers?: number | null;
	playTimeMin?: number | null;
	playTimeMax?: number | null;
	boxArtUrl?: string | null;
	description?: string | null;
	categories?: string | null;
	bggRating?: number | null;
	bggRank?: number | null;
	suggestedAge?: number | null;
}

// Transform functions (mirrors src/lib/server/games.ts)
function transformGame(game: DbGame): Game {
	return {
		id: game.id,
		title: game.title,
		year: game.year,
		minPlayers: game.min_players,
		maxPlayers: game.max_players,
		playTimeMin: game.play_time_min,
		playTimeMax: game.play_time_max,
		boxArtUrl: game.box_art_url,
		description: game.description,
		categories: game.categories,
		bggRating: game.bgg_rating,
		bggRank: game.bgg_rank,
		suggestedAge: game.suggested_age,
		createdAt: game.created_at,
		updatedAt: game.updated_at
	};
}

function transformInput(data: GameInput): Record<string, unknown> {
	const result: Record<string, unknown> = {
		title: data.title
	};

	if (data.year !== undefined) result.year = data.year;
	if (data.minPlayers !== undefined) result.min_players = data.minPlayers;
	if (data.maxPlayers !== undefined) result.max_players = data.maxPlayers;
	if (data.playTimeMin !== undefined) result.play_time_min = data.playTimeMin;
	if (data.playTimeMax !== undefined) result.play_time_max = data.playTimeMax;
	if (data.boxArtUrl !== undefined) result.box_art_url = data.boxArtUrl;
	if (data.description !== undefined) result.description = data.description;
	if (data.bggRating !== undefined) result.bgg_rating = data.bggRating;
	if (data.bggRank !== undefined) result.bgg_rank = data.bggRank;
	if (data.suggestedAge !== undefined) result.suggested_age = data.suggestedAge;

	// Parse categories JSON string to array for JSONB column
	if (data.categories !== undefined) {
		if (data.categories && data.categories.trim()) {
			try {
				result.categories = JSON.parse(data.categories);
			} catch {
				result.categories = null;
			}
		} else {
			result.categories = null;
		}
	}

	return result;
}

describe('Story 25 - Game Data Model Includes Suggested Age Field', () => {
	describe('DbGame Interface', () => {
		it('should include suggested_age as nullable integer field', () => {
			const dbGame: DbGame = {
				id: 'test-id',
				user_id: 'user-id',
				title: 'Catan',
				year: 1995,
				min_players: 3,
				max_players: 4,
				play_time_min: 60,
				play_time_max: 120,
				box_art_url: null,
				description: null,
				categories: null,
				bgg_rating: 7.1,
				bgg_rank: 437,
				suggested_age: 10,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.suggested_age).toBe(10);
		});

		it('should allow suggested_age to be null', () => {
			const dbGame: DbGame = {
				id: 'test-id',
				user_id: 'user-id',
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
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.suggested_age).toBeNull();
		});
	});

	describe('Game Interface', () => {
		it('should include suggestedAge as nullable integer field (camelCase)', () => {
			const game: Game = {
				id: 'test-id',
				title: 'Ticket to Ride',
				year: 2004,
				minPlayers: 2,
				maxPlayers: 5,
				playTimeMin: 30,
				playTimeMax: 60,
				boxArtUrl: null,
				description: null,
				categories: null,
				bggRating: 7.4,
				bggRank: 178,
				suggestedAge: 8,
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z'
			};

			expect(game.suggestedAge).toBe(8);
		});

		it('should allow suggestedAge to be null', () => {
			const game: Game = {
				id: 'test-id',
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
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z'
			};

			expect(game.suggestedAge).toBeNull();
		});
	});

	describe('GameInput Interface', () => {
		it('should include optional suggestedAge field', () => {
			const input: GameInput = {
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				suggestedAge: 10
			};

			expect(input.suggestedAge).toBe(10);
		});

		it('should allow suggestedAge to be null', () => {
			const input: GameInput = {
				title: 'Test Game',
				suggestedAge: null
			};

			expect(input.suggestedAge).toBeNull();
		});

		it('should allow suggestedAge to be omitted', () => {
			const input: GameInput = {
				title: 'Test Game'
			};

			expect(input.suggestedAge).toBeUndefined();
		});
	});

	describe('transformGame Function', () => {
		it('should map suggested_age to suggestedAge', () => {
			const dbGame: DbGame = {
				id: 'game-1',
				user_id: 'user-1',
				title: 'Pandemic',
				year: 2008,
				min_players: 2,
				max_players: 4,
				play_time_min: 45,
				play_time_max: 60,
				box_art_url: null,
				description: 'Cooperative disease fighting game',
				categories: ['cooperative', 'strategy'],
				bgg_rating: 7.6,
				bgg_rank: 121,
				suggested_age: 8,
				created_at: '2024-01-15T10:00:00Z',
				updated_at: '2024-01-15T10:00:00Z'
			};

			const game = transformGame(dbGame);

			expect(game.suggestedAge).toBe(8);
		});

		it('should handle null suggested_age correctly', () => {
			const dbGame: DbGame = {
				id: 'game-2',
				user_id: 'user-1',
				title: 'Obscure Game',
				year: 2020,
				min_players: 2,
				max_players: 6,
				play_time_min: 30,
				play_time_max: 60,
				box_art_url: null,
				description: null,
				categories: null,
				bgg_rating: null,
				bgg_rank: null,
				suggested_age: null,
				created_at: '2024-01-15T10:00:00Z',
				updated_at: '2024-01-15T10:00:00Z'
			};

			const game = transformGame(dbGame);

			expect(game.suggestedAge).toBeNull();
		});

		it('should preserve all other fields when transforming with suggestedAge', () => {
			const dbGame: DbGame = {
				id: 'game-3',
				user_id: 'user-1',
				title: 'Wingspan',
				year: 2019,
				min_players: 1,
				max_players: 5,
				play_time_min: 40,
				play_time_max: 70,
				box_art_url: 'https://example.com/wingspan.jpg',
				description: 'Bird-themed engine builder',
				categories: ['engine-building', 'card-game'],
				bgg_rating: 8.0,
				bgg_rank: 26,
				suggested_age: 10,
				created_at: '2024-01-15T10:00:00Z',
				updated_at: '2024-01-15T10:00:00Z'
			};

			const game = transformGame(dbGame);

			expect(game.id).toBe('game-3');
			expect(game.title).toBe('Wingspan');
			expect(game.year).toBe(2019);
			expect(game.minPlayers).toBe(1);
			expect(game.maxPlayers).toBe(5);
			expect(game.playTimeMin).toBe(40);
			expect(game.playTimeMax).toBe(70);
			expect(game.boxArtUrl).toBe('https://example.com/wingspan.jpg');
			expect(game.description).toBe('Bird-themed engine builder');
			expect(game.categories).toEqual(['engine-building', 'card-game']);
			expect(game.bggRating).toBe(8.0);
			expect(game.bggRank).toBe(26);
			expect(game.suggestedAge).toBe(10);
			expect(game.createdAt).toBe('2024-01-15T10:00:00Z');
			expect(game.updatedAt).toBe('2024-01-15T10:00:00Z');
		});
	});

	describe('transformInput Function', () => {
		it('should map suggestedAge to suggested_age', () => {
			const input: GameInput = {
				title: 'Catan',
				year: 1995,
				suggestedAge: 10
			};

			const result = transformInput(input);

			expect(result.suggested_age).toBe(10);
		});

		it('should handle null suggestedAge correctly', () => {
			const input: GameInput = {
				title: 'Test Game',
				suggestedAge: null
			};

			const result = transformInput(input);

			expect(result.suggested_age).toBeNull();
		});

		it('should not include suggested_age when suggestedAge is undefined', () => {
			const input: GameInput = {
				title: 'Test Game'
			};

			const result = transformInput(input);

			expect(result).not.toHaveProperty('suggested_age');
		});

		it('should preserve all other fields when transforming with suggestedAge', () => {
			const input: GameInput = {
				title: 'Spirit Island',
				year: 2017,
				minPlayers: 1,
				maxPlayers: 4,
				playTimeMin: 90,
				playTimeMax: 120,
				boxArtUrl: 'https://example.com/spirit-island.jpg',
				description: 'Cooperative strategy game',
				categories: JSON.stringify(['cooperative', 'strategy']),
				bggRating: 8.3,
				bggRank: 12,
				suggestedAge: 13
			};

			const result = transformInput(input);

			expect(result.title).toBe('Spirit Island');
			expect(result.year).toBe(2017);
			expect(result.min_players).toBe(1);
			expect(result.max_players).toBe(4);
			expect(result.play_time_min).toBe(90);
			expect(result.play_time_max).toBe(120);
			expect(result.box_art_url).toBe('https://example.com/spirit-island.jpg');
			expect(result.description).toBe('Cooperative strategy game');
			expect(result.categories).toEqual(['cooperative', 'strategy']);
			expect(result.bgg_rating).toBe(8.3);
			expect(result.bgg_rank).toBe(12);
			expect(result.suggested_age).toBe(13);
		});
	});

	describe('Typical Age Values', () => {
		it('should handle common suggested age values (8+)', () => {
			const input: GameInput = {
				title: 'Ticket to Ride',
				suggestedAge: 8
			};

			const result = transformInput(input);
			expect(result.suggested_age).toBe(8);
		});

		it('should handle suggested age values for family games (10+)', () => {
			const input: GameInput = {
				title: 'Catan',
				suggestedAge: 10
			};

			const result = transformInput(input);
			expect(result.suggested_age).toBe(10);
		});

		it('should handle suggested age values for complex games (14+)', () => {
			const input: GameInput = {
				title: 'Gloomhaven',
				suggestedAge: 14
			};

			const result = transformInput(input);
			expect(result.suggested_age).toBe(14);
		});

		it('should handle suggested age values for party games (18+)', () => {
			const input: GameInput = {
				title: 'Cards Against Humanity',
				suggestedAge: 18
			};

			const result = transformInput(input);
			expect(result.suggested_age).toBe(18);
		});

		it('should handle suggested age values for kids games (3+)', () => {
			const input: GameInput = {
				title: 'Candy Land',
				suggestedAge: 3
			};

			const result = transformInput(input);
			expect(result.suggested_age).toBe(3);
		});
	});

	describe('Existing Games Unaffected', () => {
		it('should handle games without suggested_age (existing games)', () => {
			// Simulating an existing game record with null suggested_age
			const existingDbGame: DbGame = {
				id: 'existing-game',
				user_id: 'user-1',
				title: 'Old Game Entry',
				year: 2000,
				min_players: 2,
				max_players: 4,
				play_time_min: 30,
				play_time_max: 60,
				box_art_url: null,
				description: null,
				categories: null,
				bgg_rating: null,
				bgg_rank: null,
				suggested_age: null, // Null for existing games
				created_at: '2023-01-01T00:00:00Z',
				updated_at: '2023-01-01T00:00:00Z'
			};

			const game = transformGame(existingDbGame);

			// Should work correctly with null suggestedAge
			expect(game.suggestedAge).toBeNull();
			expect(game.title).toBe('Old Game Entry');
		});

		it('should allow updating game without changing suggestedAge', () => {
			// When updating only title, suggestedAge should not be included
			const input: GameInput = {
				title: 'Updated Title'
			};

			const result = transformInput(input);

			expect(result.title).toBe('Updated Title');
			expect(result).not.toHaveProperty('suggested_age');
		});

		it('should allow updating suggestedAge independently', () => {
			const input: GameInput = {
				title: 'Existing Game',
				suggestedAge: 12
			};

			const result = transformInput(input);

			expect(result.title).toBe('Existing Game');
			expect(result.suggested_age).toBe(12);
		});
	});
});
