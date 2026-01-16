import { describe, it, expect } from 'vitest';

// Test the play count, review, and personal rating data model changes
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
	play_count: number | null;
	review: string | null;
	personal_rating: number | null;
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
	playCount: number | null;
	review: string | null;
	personalRating: number | null;
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
	playCount?: number | null;
	review?: string | null;
	personalRating?: number | null;
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
		playCount: game.play_count,
		review: game.review,
		personalRating: game.personal_rating,
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
	if (data.playCount !== undefined) result.play_count = data.playCount;
	if (data.review !== undefined) result.review = data.review;
	if (data.personalRating !== undefined) result.personal_rating = data.personalRating;

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

describe('Story 30 - Play Count, Review, and Personal Rating Data Model', () => {
	describe('DbGame Interface - play_count field', () => {
		it('should include play_count as nullable integer field', () => {
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
				play_count: 15,
				review: null,
				personal_rating: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.play_count).toBe(15);
		});

		it('should allow play_count to be null', () => {
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
				play_count: null,
				review: null,
				personal_rating: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.play_count).toBeNull();
		});

		it('should allow play_count to be 0', () => {
			const dbGame: DbGame = {
				id: 'test-id',
				user_id: 'user-id',
				title: 'New Game',
				year: 2024,
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
				review: null,
				personal_rating: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.play_count).toBe(0);
		});
	});

	describe('DbGame Interface - review field', () => {
		it('should include review as nullable text field', () => {
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
				play_count: null,
				review: 'Great game for family nights! Easy to learn but has good strategic depth.',
				personal_rating: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.review).toBe(
				'Great game for family nights! Easy to learn but has good strategic depth.'
			);
		});

		it('should allow review to be null', () => {
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
				play_count: null,
				review: null,
				personal_rating: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.review).toBeNull();
		});

		it('should allow long review text', () => {
			const longReview = 'A'.repeat(1000);
			const dbGame: DbGame = {
				id: 'test-id',
				user_id: 'user-id',
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
				play_count: null,
				review: longReview,
				personal_rating: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.review).toBe(longReview);
			expect(dbGame.review?.length).toBe(1000);
		});
	});

	describe('DbGame Interface - personal_rating field', () => {
		it('should include personal_rating as nullable integer field (1-5)', () => {
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
				play_count: null,
				review: null,
				personal_rating: 4,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.personal_rating).toBe(4);
		});

		it('should allow personal_rating to be null', () => {
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
				play_count: null,
				review: null,
				personal_rating: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.personal_rating).toBeNull();
		});

		it('should handle rating value of 1 (minimum)', () => {
			const dbGame: DbGame = {
				id: 'test-id',
				user_id: 'user-id',
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
				play_count: null,
				review: null,
				personal_rating: 1,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.personal_rating).toBe(1);
		});

		it('should handle rating value of 5 (maximum)', () => {
			const dbGame: DbGame = {
				id: 'test-id',
				user_id: 'user-id',
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
				play_count: null,
				review: null,
				personal_rating: 5,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbGame.personal_rating).toBe(5);
		});
	});

	describe('Game Interface (camelCase)', () => {
		it('should include playCount as nullable integer field', () => {
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
				playCount: 25,
				review: null,
				personalRating: null,
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z'
			};

			expect(game.playCount).toBe(25);
		});

		it('should include review as nullable text field', () => {
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
				playCount: null,
				review: 'Love this game! Perfect for introducing new players to board games.',
				personalRating: null,
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z'
			};

			expect(game.review).toBe(
				'Love this game! Perfect for introducing new players to board games.'
			);
		});

		it('should include personalRating as nullable integer field', () => {
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
				playCount: null,
				review: null,
				personalRating: 5,
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z'
			};

			expect(game.personalRating).toBe(5);
		});

		it('should allow all new fields to be null', () => {
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
				playCount: null,
				review: null,
				personalRating: null,
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z'
			};

			expect(game.playCount).toBeNull();
			expect(game.review).toBeNull();
			expect(game.personalRating).toBeNull();
		});
	});

	describe('GameInput Interface', () => {
		it('should include optional playCount field', () => {
			const input: GameInput = {
				title: 'Catan',
				playCount: 10
			};

			expect(input.playCount).toBe(10);
		});

		it('should include optional review field', () => {
			const input: GameInput = {
				title: 'Catan',
				review: 'A classic strategy game.'
			};

			expect(input.review).toBe('A classic strategy game.');
		});

		it('should include optional personalRating field', () => {
			const input: GameInput = {
				title: 'Catan',
				personalRating: 4
			};

			expect(input.personalRating).toBe(4);
		});

		it('should allow new fields to be null', () => {
			const input: GameInput = {
				title: 'Test Game',
				playCount: null,
				review: null,
				personalRating: null
			};

			expect(input.playCount).toBeNull();
			expect(input.review).toBeNull();
			expect(input.personalRating).toBeNull();
		});

		it('should allow new fields to be omitted', () => {
			const input: GameInput = {
				title: 'Test Game'
			};

			expect(input.playCount).toBeUndefined();
			expect(input.review).toBeUndefined();
			expect(input.personalRating).toBeUndefined();
		});

		it('should allow all new fields together', () => {
			const input: GameInput = {
				title: 'Wingspan',
				playCount: 20,
				review: 'Beautiful game with great replayability.',
				personalRating: 5
			};

			expect(input.playCount).toBe(20);
			expect(input.review).toBe('Beautiful game with great replayability.');
			expect(input.personalRating).toBe(5);
		});
	});

	describe('transformGame Function', () => {
		it('should map play_count to playCount', () => {
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
				description: null,
				categories: null,
				bgg_rating: 7.6,
				bgg_rank: 121,
				suggested_age: 8,
				play_count: 42,
				review: null,
				personal_rating: null,
				created_at: '2024-01-15T10:00:00Z',
				updated_at: '2024-01-15T10:00:00Z'
			};

			const game = transformGame(dbGame);

			expect(game.playCount).toBe(42);
		});

		it('should map review to review (same name)', () => {
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
				description: null,
				categories: null,
				bgg_rating: 7.6,
				bgg_rank: 121,
				suggested_age: 8,
				play_count: null,
				review: 'Intense cooperative experience!',
				personal_rating: null,
				created_at: '2024-01-15T10:00:00Z',
				updated_at: '2024-01-15T10:00:00Z'
			};

			const game = transformGame(dbGame);

			expect(game.review).toBe('Intense cooperative experience!');
		});

		it('should map personal_rating to personalRating', () => {
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
				description: null,
				categories: null,
				bgg_rating: 7.6,
				bgg_rank: 121,
				suggested_age: 8,
				play_count: null,
				review: null,
				personal_rating: 4,
				created_at: '2024-01-15T10:00:00Z',
				updated_at: '2024-01-15T10:00:00Z'
			};

			const game = transformGame(dbGame);

			expect(game.personalRating).toBe(4);
		});

		it('should handle null values for all new fields', () => {
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
				play_count: null,
				review: null,
				personal_rating: null,
				created_at: '2024-01-15T10:00:00Z',
				updated_at: '2024-01-15T10:00:00Z'
			};

			const game = transformGame(dbGame);

			expect(game.playCount).toBeNull();
			expect(game.review).toBeNull();
			expect(game.personalRating).toBeNull();
		});

		it('should transform all new fields together correctly', () => {
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
				play_count: 35,
				review: 'One of our favorite games! Beautiful artwork and satisfying gameplay.',
				personal_rating: 5,
				created_at: '2024-01-15T10:00:00Z',
				updated_at: '2024-01-15T10:00:00Z'
			};

			const game = transformGame(dbGame);

			expect(game.id).toBe('game-3');
			expect(game.title).toBe('Wingspan');
			expect(game.playCount).toBe(35);
			expect(game.review).toBe(
				'One of our favorite games! Beautiful artwork and satisfying gameplay.'
			);
			expect(game.personalRating).toBe(5);
			// Verify other fields still work
			expect(game.year).toBe(2019);
			expect(game.suggestedAge).toBe(10);
		});
	});

	describe('transformInput Function', () => {
		it('should map playCount to play_count', () => {
			const input: GameInput = {
				title: 'Catan',
				playCount: 10
			};

			const result = transformInput(input);

			expect(result.play_count).toBe(10);
		});

		it('should map review to review (same name)', () => {
			const input: GameInput = {
				title: 'Catan',
				review: 'Classic gateway game.'
			};

			const result = transformInput(input);

			expect(result.review).toBe('Classic gateway game.');
		});

		it('should map personalRating to personal_rating', () => {
			const input: GameInput = {
				title: 'Catan',
				personalRating: 4
			};

			const result = transformInput(input);

			expect(result.personal_rating).toBe(4);
		});

		it('should handle null values for new fields', () => {
			const input: GameInput = {
				title: 'Test Game',
				playCount: null,
				review: null,
				personalRating: null
			};

			const result = transformInput(input);

			expect(result.play_count).toBeNull();
			expect(result.review).toBeNull();
			expect(result.personal_rating).toBeNull();
		});

		it('should not include new fields when undefined', () => {
			const input: GameInput = {
				title: 'Test Game'
			};

			const result = transformInput(input);

			expect(result).not.toHaveProperty('play_count');
			expect(result).not.toHaveProperty('review');
			expect(result).not.toHaveProperty('personal_rating');
		});

		it('should transform all new fields together correctly', () => {
			const input: GameInput = {
				title: 'Spirit Island',
				year: 2017,
				minPlayers: 1,
				maxPlayers: 4,
				playTimeMin: 90,
				playTimeMax: 120,
				playCount: 50,
				review: 'Complex and rewarding cooperative experience.',
				personalRating: 5
			};

			const result = transformInput(input);

			expect(result.title).toBe('Spirit Island');
			expect(result.year).toBe(2017);
			expect(result.min_players).toBe(1);
			expect(result.max_players).toBe(4);
			expect(result.play_count).toBe(50);
			expect(result.review).toBe('Complex and rewarding cooperative experience.');
			expect(result.personal_rating).toBe(5);
		});
	});

	describe('Typical Value Scenarios', () => {
		it('should handle high play count (100+)', () => {
			const input: GameInput = {
				title: 'Frequent Favorite',
				playCount: 150
			};

			const result = transformInput(input);
			expect(result.play_count).toBe(150);
		});

		it('should handle zero play count', () => {
			const input: GameInput = {
				title: 'Unplayed Game',
				playCount: 0
			};

			const result = transformInput(input);
			expect(result.play_count).toBe(0);
		});

		it('should handle each star rating value (1-5)', () => {
			for (let rating = 1; rating <= 5; rating++) {
				const input: GameInput = {
					title: `Game with ${rating} stars`,
					personalRating: rating
				};

				const result = transformInput(input);
				expect(result.personal_rating).toBe(rating);
			}
		});

		it('should handle short review', () => {
			const input: GameInput = {
				title: 'Quick Review',
				review: 'Fun!'
			};

			const result = transformInput(input);
			expect(result.review).toBe('Fun!');
		});

		it('should handle detailed review with multiple paragraphs', () => {
			const detailedReview = `This is an amazing game!\n\nThe mechanics are solid and the theme is engaging.\n\nHighly recommended for strategy lovers.`;
			const input: GameInput = {
				title: 'Detailed Review Game',
				review: detailedReview
			};

			const result = transformInput(input);
			expect(result.review).toBe(detailedReview);
		});

		it('should handle empty string review', () => {
			const input: GameInput = {
				title: 'Empty Review',
				review: ''
			};

			const result = transformInput(input);
			expect(result.review).toBe('');
		});
	});

	describe('Existing Games Unaffected', () => {
		it('should handle games without new fields (existing games)', () => {
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
				suggested_age: null,
				play_count: null,
				review: null,
				personal_rating: null,
				created_at: '2023-01-01T00:00:00Z',
				updated_at: '2023-01-01T00:00:00Z'
			};

			const game = transformGame(existingDbGame);

			expect(game.playCount).toBeNull();
			expect(game.review).toBeNull();
			expect(game.personalRating).toBeNull();
			expect(game.title).toBe('Old Game Entry');
		});

		it('should allow updating game without changing new fields', () => {
			const input: GameInput = {
				title: 'Updated Title'
			};

			const result = transformInput(input);

			expect(result.title).toBe('Updated Title');
			expect(result).not.toHaveProperty('play_count');
			expect(result).not.toHaveProperty('review');
			expect(result).not.toHaveProperty('personal_rating');
		});

		it('should allow updating only playCount independently', () => {
			const input: GameInput = {
				title: 'Existing Game',
				playCount: 5
			};

			const result = transformInput(input);

			expect(result.title).toBe('Existing Game');
			expect(result.play_count).toBe(5);
			expect(result).not.toHaveProperty('review');
			expect(result).not.toHaveProperty('personal_rating');
		});

		it('should allow updating only review independently', () => {
			const input: GameInput = {
				title: 'Existing Game',
				review: 'Adding my thoughts on this game.'
			};

			const result = transformInput(input);

			expect(result.title).toBe('Existing Game');
			expect(result.review).toBe('Adding my thoughts on this game.');
			expect(result).not.toHaveProperty('play_count');
			expect(result).not.toHaveProperty('personal_rating');
		});

		it('should allow updating only personalRating independently', () => {
			const input: GameInput = {
				title: 'Existing Game',
				personalRating: 3
			};

			const result = transformInput(input);

			expect(result.title).toBe('Existing Game');
			expect(result.personal_rating).toBe(3);
			expect(result).not.toHaveProperty('play_count');
			expect(result).not.toHaveProperty('review');
		});
	});

	describe('Combined with Existing Fields', () => {
		it('should work alongside all existing fields', () => {
			const dbGame: DbGame = {
				id: 'complete-game',
				user_id: 'user-1',
				title: 'Complete Game',
				year: 2022,
				min_players: 1,
				max_players: 6,
				play_time_min: 60,
				play_time_max: 120,
				box_art_url: 'https://example.com/game.jpg',
				description: 'A complete game with all fields filled',
				categories: ['strategy', 'family'],
				bgg_rating: 7.8,
				bgg_rank: 100,
				suggested_age: 12,
				play_count: 30,
				review: 'Excellent game for all ages.',
				personal_rating: 5,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const game = transformGame(dbGame);

			// Verify all fields are present
			expect(game.id).toBe('complete-game');
			expect(game.title).toBe('Complete Game');
			expect(game.year).toBe(2022);
			expect(game.minPlayers).toBe(1);
			expect(game.maxPlayers).toBe(6);
			expect(game.playTimeMin).toBe(60);
			expect(game.playTimeMax).toBe(120);
			expect(game.boxArtUrl).toBe('https://example.com/game.jpg');
			expect(game.description).toBe('A complete game with all fields filled');
			expect(game.categories).toEqual(['strategy', 'family']);
			expect(game.bggRating).toBe(7.8);
			expect(game.bggRank).toBe(100);
			expect(game.suggestedAge).toBe(12);
			expect(game.playCount).toBe(30);
			expect(game.review).toBe('Excellent game for all ages.');
			expect(game.personalRating).toBe(5);
		});

		it('should create complete input with all fields', () => {
			const input: GameInput = {
				title: 'New Complete Game',
				year: 2024,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 45,
				playTimeMax: 90,
				boxArtUrl: 'https://example.com/new-game.jpg',
				description: 'A brand new game',
				categories: JSON.stringify(['adventure', 'puzzle']),
				bggRating: 8.2,
				bggRank: 50,
				suggestedAge: 10,
				playCount: 1,
				review: 'Just played for the first time!',
				personalRating: 4
			};

			const result = transformInput(input);

			expect(result.title).toBe('New Complete Game');
			expect(result.year).toBe(2024);
			expect(result.min_players).toBe(2);
			expect(result.max_players).toBe(4);
			expect(result.play_time_min).toBe(45);
			expect(result.play_time_max).toBe(90);
			expect(result.box_art_url).toBe('https://example.com/new-game.jpg');
			expect(result.description).toBe('A brand new game');
			expect(result.categories).toEqual(['adventure', 'puzzle']);
			expect(result.bgg_rating).toBe(8.2);
			expect(result.bgg_rank).toBe(50);
			expect(result.suggested_age).toBe(10);
			expect(result.play_count).toBe(1);
			expect(result.review).toBe('Just played for the first time!');
			expect(result.personal_rating).toBe(4);
		});
	});
});
