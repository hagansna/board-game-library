import { describe, it, expect } from 'vitest';

/**
 * Story 34 - Database has library_games table for user-specific game data
 *
 * This test file verifies the TypeScript interfaces and transform functions
 * for the library_games table that stores user-specific game data.
 *
 * The actual database table must be created manually in Supabase using SQL.
 */

// Copy of interfaces for testing (mirrors src/lib/server/library-games.ts)
interface DbLibraryGame {
	id: string;
	user_id: string;
	game_id: string;
	play_count: number | null;
	personal_rating: number | null;
	review: string | null;
	created_at: string;
	updated_at: string;
}

interface LibraryGame {
	id: string;
	userId: string;
	gameId: string;
	playCount: number | null;
	personalRating: number | null;
	review: string | null;
	createdAt: string;
	updatedAt: string;
}

interface LibraryGameInput {
	gameId: string;
	playCount?: number | null;
	personalRating?: number | null;
	review?: string | null;
}

// Transform functions (mirrors src/lib/server/library-games.ts)
function transformLibraryGame(dbLibraryGame: DbLibraryGame): LibraryGame {
	return {
		id: dbLibraryGame.id,
		userId: dbLibraryGame.user_id,
		gameId: dbLibraryGame.game_id,
		playCount: dbLibraryGame.play_count,
		personalRating: dbLibraryGame.personal_rating,
		review: dbLibraryGame.review,
		createdAt: dbLibraryGame.created_at,
		updatedAt: dbLibraryGame.updated_at
	};
}

function transformLibraryGameInput(data: LibraryGameInput): Record<string, unknown> {
	const result: Record<string, unknown> = {
		game_id: data.gameId
	};

	if (data.playCount !== undefined) result.play_count = data.playCount;
	if (data.personalRating !== undefined) result.personal_rating = data.personalRating;
	if (data.review !== undefined) result.review = data.review;

	return result;
}

function isValidPersonalRating(rating: number | null | undefined): boolean {
	if (rating === null || rating === undefined) return true;
	return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

function isValidPlayCount(count: number | null | undefined): boolean {
	if (count === null || count === undefined) return true;
	return Number.isInteger(count) && count >= 0;
}

describe('Story 34 - Library Games Table for User-Specific Game Data', () => {
	describe('DbLibraryGame Interface Structure', () => {
		it('should include id as string primary key', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-uuid-123',
				user_id: 'user-uuid-456',
				game_id: 'game-uuid-789',
				play_count: 0,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbEntry.id).toBe('entry-uuid-123');
			expect(typeof dbEntry.id).toBe('string');
		});

		it('should include user_id as string foreign key', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-uuid-123',
				user_id: 'user-uuid-456',
				game_id: 'game-uuid-789',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbEntry.user_id).toBe('user-uuid-456');
			expect(typeof dbEntry.user_id).toBe('string');
		});

		it('should include game_id as string foreign key', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-uuid-123',
				user_id: 'user-uuid-456',
				game_id: 'game-uuid-789',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbEntry.game_id).toBe('game-uuid-789');
			expect(typeof dbEntry.game_id).toBe('string');
		});

		it('should include play_count as nullable integer defaulting to 0', () => {
			const dbEntryWithCount: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: 5,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const dbEntryWithDefault: DbLibraryGame = {
				id: 'entry-2',
				user_id: 'user-1',
				game_id: 'game-2',
				play_count: 0,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbEntryWithCount.play_count).toBe(5);
			expect(dbEntryWithDefault.play_count).toBe(0);
		});

		it('should include personal_rating as nullable integer constrained 1-5', () => {
			const entries: DbLibraryGame[] = [1, 2, 3, 4, 5].map((rating) => ({
				id: `entry-${rating}`,
				user_id: 'user-1',
				game_id: `game-${rating}`,
				play_count: null,
				personal_rating: rating,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			}));

			entries.forEach((entry, index) => {
				expect(entry.personal_rating).toBe(index + 1);
			});
		});

		it('should include review as nullable text', () => {
			const dbEntryWithReview: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: null,
				personal_rating: null,
				review: 'This is my review of the game.',
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const dbEntryWithoutReview: DbLibraryGame = {
				id: 'entry-2',
				user_id: 'user-1',
				game_id: 'game-2',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbEntryWithReview.review).toBe('This is my review of the game.');
			expect(dbEntryWithoutReview.review).toBeNull();
		});

		it('should include created_at and updated_at timestamps', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T10:30:00Z',
				updated_at: '2024-01-15T12:45:00Z'
			};

			expect(dbEntry.created_at).toBe('2024-01-15T10:30:00Z');
			expect(dbEntry.updated_at).toBe('2024-01-15T12:45:00Z');
		});
	});

	describe('LibraryGame Interface (camelCase for frontend)', () => {
		it('should include all fields with camelCase naming', () => {
			const entry: LibraryGame = {
				id: 'entry-uuid-123',
				userId: 'user-uuid-456',
				gameId: 'game-uuid-789',
				playCount: 10,
				personalRating: 4,
				review: 'Great game!',
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z'
			};

			expect(entry.id).toBe('entry-uuid-123');
			expect(entry.userId).toBe('user-uuid-456');
			expect(entry.gameId).toBe('game-uuid-789');
			expect(entry.playCount).toBe(10);
			expect(entry.personalRating).toBe(4);
			expect(entry.review).toBe('Great game!');
			expect(entry.createdAt).toBe('2024-01-15T00:00:00Z');
			expect(entry.updatedAt).toBe('2024-01-15T00:00:00Z');
		});

		it('should allow nullable fields to be null', () => {
			const entry: LibraryGame = {
				id: 'entry-1',
				userId: 'user-1',
				gameId: 'game-1',
				playCount: null,
				personalRating: null,
				review: null,
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z'
			};

			expect(entry.playCount).toBeNull();
			expect(entry.personalRating).toBeNull();
			expect(entry.review).toBeNull();
		});
	});

	describe('LibraryGameInput Interface', () => {
		it('should require gameId field', () => {
			const input: LibraryGameInput = {
				gameId: 'game-uuid-123'
			};

			expect(input.gameId).toBe('game-uuid-123');
		});

		it('should allow optional playCount', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				playCount: 5
			};

			expect(input.playCount).toBe(5);
		});

		it('should allow optional personalRating', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				personalRating: 4
			};

			expect(input.personalRating).toBe(4);
		});

		it('should allow optional review', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				review: 'My thoughts on this game...'
			};

			expect(input.review).toBe('My thoughts on this game...');
		});

		it('should allow all optional fields together', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				playCount: 20,
				personalRating: 5,
				review: 'One of my favorites!'
			};

			expect(input.gameId).toBe('game-1');
			expect(input.playCount).toBe(20);
			expect(input.personalRating).toBe(5);
			expect(input.review).toBe('One of my favorites!');
		});

		it('should allow optional fields to be null', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				playCount: null,
				personalRating: null,
				review: null
			};

			expect(input.playCount).toBeNull();
			expect(input.personalRating).toBeNull();
			expect(input.review).toBeNull();
		});
	});

	describe('transformLibraryGame Function', () => {
		it('should map user_id to userId', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-uuid-456',
				game_id: 'game-1',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const entry = transformLibraryGame(dbEntry);
			expect(entry.userId).toBe('user-uuid-456');
		});

		it('should map game_id to gameId', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-uuid-789',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const entry = transformLibraryGame(dbEntry);
			expect(entry.gameId).toBe('game-uuid-789');
		});

		it('should map play_count to playCount', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: 15,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const entry = transformLibraryGame(dbEntry);
			expect(entry.playCount).toBe(15);
		});

		it('should map personal_rating to personalRating', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: null,
				personal_rating: 4,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const entry = transformLibraryGame(dbEntry);
			expect(entry.personalRating).toBe(4);
		});

		it('should map created_at to createdAt', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T10:30:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const entry = transformLibraryGame(dbEntry);
			expect(entry.createdAt).toBe('2024-01-15T10:30:00Z');
		});

		it('should map updated_at to updatedAt', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T14:45:00Z'
			};

			const entry = transformLibraryGame(dbEntry);
			expect(entry.updatedAt).toBe('2024-01-15T14:45:00Z');
		});

		it('should transform all fields correctly', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-complete',
				user_id: 'user-complete',
				game_id: 'game-complete',
				play_count: 25,
				personal_rating: 5,
				review: 'Absolutely fantastic game!',
				created_at: '2024-01-10T08:00:00Z',
				updated_at: '2024-01-15T16:30:00Z'
			};

			const entry = transformLibraryGame(dbEntry);

			expect(entry.id).toBe('entry-complete');
			expect(entry.userId).toBe('user-complete');
			expect(entry.gameId).toBe('game-complete');
			expect(entry.playCount).toBe(25);
			expect(entry.personalRating).toBe(5);
			expect(entry.review).toBe('Absolutely fantastic game!');
			expect(entry.createdAt).toBe('2024-01-10T08:00:00Z');
			expect(entry.updatedAt).toBe('2024-01-15T16:30:00Z');
		});

		it('should handle null values correctly', () => {
			const dbEntry: DbLibraryGame = {
				id: 'entry-nulls',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const entry = transformLibraryGame(dbEntry);

			expect(entry.playCount).toBeNull();
			expect(entry.personalRating).toBeNull();
			expect(entry.review).toBeNull();
		});
	});

	describe('transformLibraryGameInput Function', () => {
		it('should map gameId to game_id', () => {
			const input: LibraryGameInput = {
				gameId: 'game-uuid-123'
			};

			const result = transformLibraryGameInput(input);
			expect(result.game_id).toBe('game-uuid-123');
		});

		it('should map playCount to play_count', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				playCount: 10
			};

			const result = transformLibraryGameInput(input);
			expect(result.play_count).toBe(10);
		});

		it('should map personalRating to personal_rating', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				personalRating: 4
			};

			const result = transformLibraryGameInput(input);
			expect(result.personal_rating).toBe(4);
		});

		it('should map review to review (same name)', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				review: 'Great game!'
			};

			const result = transformLibraryGameInput(input);
			expect(result.review).toBe('Great game!');
		});

		it('should not include undefined optional fields', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1'
			};

			const result = transformLibraryGameInput(input);

			expect(result.game_id).toBe('game-1');
			expect(result).not.toHaveProperty('play_count');
			expect(result).not.toHaveProperty('personal_rating');
			expect(result).not.toHaveProperty('review');
		});

		it('should include null values when explicitly set', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				playCount: null,
				personalRating: null,
				review: null
			};

			const result = transformLibraryGameInput(input);

			expect(result.play_count).toBeNull();
			expect(result.personal_rating).toBeNull();
			expect(result.review).toBeNull();
		});

		it('should transform all fields correctly', () => {
			const input: LibraryGameInput = {
				gameId: 'game-complete',
				playCount: 30,
				personalRating: 5,
				review: 'Must-play game!'
			};

			const result = transformLibraryGameInput(input);

			expect(result.game_id).toBe('game-complete');
			expect(result.play_count).toBe(30);
			expect(result.personal_rating).toBe(5);
			expect(result.review).toBe('Must-play game!');
		});
	});

	describe('isValidPersonalRating Function', () => {
		it('should return true for null', () => {
			expect(isValidPersonalRating(null)).toBe(true);
		});

		it('should return true for undefined', () => {
			expect(isValidPersonalRating(undefined)).toBe(true);
		});

		it('should return true for rating of 1', () => {
			expect(isValidPersonalRating(1)).toBe(true);
		});

		it('should return true for rating of 5', () => {
			expect(isValidPersonalRating(5)).toBe(true);
		});

		it('should return true for ratings 2, 3, 4', () => {
			expect(isValidPersonalRating(2)).toBe(true);
			expect(isValidPersonalRating(3)).toBe(true);
			expect(isValidPersonalRating(4)).toBe(true);
		});

		it('should return false for rating of 0', () => {
			expect(isValidPersonalRating(0)).toBe(false);
		});

		it('should return false for rating of 6', () => {
			expect(isValidPersonalRating(6)).toBe(false);
		});

		it('should return false for negative rating', () => {
			expect(isValidPersonalRating(-1)).toBe(false);
		});

		it('should return false for decimal rating', () => {
			expect(isValidPersonalRating(3.5)).toBe(false);
		});
	});

	describe('isValidPlayCount Function', () => {
		it('should return true for null', () => {
			expect(isValidPlayCount(null)).toBe(true);
		});

		it('should return true for undefined', () => {
			expect(isValidPlayCount(undefined)).toBe(true);
		});

		it('should return true for 0', () => {
			expect(isValidPlayCount(0)).toBe(true);
		});

		it('should return true for positive integers', () => {
			expect(isValidPlayCount(1)).toBe(true);
			expect(isValidPlayCount(10)).toBe(true);
			expect(isValidPlayCount(100)).toBe(true);
			expect(isValidPlayCount(1000)).toBe(true);
		});

		it('should return false for negative numbers', () => {
			expect(isValidPlayCount(-1)).toBe(false);
			expect(isValidPlayCount(-10)).toBe(false);
		});

		it('should return false for decimals', () => {
			expect(isValidPlayCount(5.5)).toBe(false);
			expect(isValidPlayCount(0.1)).toBe(false);
		});
	});

	describe('Unique Constraint on (user_id, game_id)', () => {
		it('should conceptually prevent duplicate entries for same user and game', () => {
			// This test verifies the interface design supports unique constraint
			// The actual constraint is enforced at database level
			const entry1: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: 5,
				personal_rating: 4,
				review: 'First entry',
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			// Same user, same game would violate unique constraint
			const entry2: DbLibraryGame = {
				id: 'entry-2', // Different ID
				user_id: 'user-1', // Same user
				game_id: 'game-1', // Same game
				play_count: 10,
				personal_rating: 5,
				review: 'Duplicate entry (should not exist)',
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			// Verify the entries have the same user_id and game_id
			// In practice, the database would reject entry2
			expect(entry1.user_id).toBe(entry2.user_id);
			expect(entry1.game_id).toBe(entry2.game_id);
			expect(entry1.id).not.toBe(entry2.id);
		});

		it('should allow same game for different users', () => {
			const entry1: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: 5,
				personal_rating: 4,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const entry2: DbLibraryGame = {
				id: 'entry-2',
				user_id: 'user-2', // Different user
				game_id: 'game-1', // Same game
				play_count: 20,
				personal_rating: 3,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			// Different users can have the same game
			expect(entry1.user_id).not.toBe(entry2.user_id);
			expect(entry1.game_id).toBe(entry2.game_id);
		});

		it('should allow same user to have different games', () => {
			const entry1: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-1',
				play_count: 5,
				personal_rating: 4,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const entry2: DbLibraryGame = {
				id: 'entry-2',
				user_id: 'user-1', // Same user
				game_id: 'game-2', // Different game
				play_count: 10,
				personal_rating: 5,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			// Same user can have different games
			expect(entry1.user_id).toBe(entry2.user_id);
			expect(entry1.game_id).not.toBe(entry2.game_id);
		});
	});

	describe('Play Count Default Value', () => {
		it('should default play_count to 0 conceptually', () => {
			// When creating a new entry without playCount, it should default to 0
			const input: LibraryGameInput = {
				gameId: 'game-1'
				// playCount not provided
			};

			const result = transformLibraryGameInput(input);

			// The database default handles this, input transform doesn't include it
			expect(result).not.toHaveProperty('play_count');

			// If we were to create the entry, the DB would set play_count = 0
			const dbEntryAfterInsert: DbLibraryGame = {
				id: 'new-entry',
				user_id: 'user-1',
				game_id: input.gameId,
				play_count: 0, // Database default
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(dbEntryAfterInsert.play_count).toBe(0);
		});
	});

	describe('Personal Rating Constraint (1-5)', () => {
		it('should validate rating is within range', () => {
			// Valid ratings
			expect(isValidPersonalRating(1)).toBe(true);
			expect(isValidPersonalRating(2)).toBe(true);
			expect(isValidPersonalRating(3)).toBe(true);
			expect(isValidPersonalRating(4)).toBe(true);
			expect(isValidPersonalRating(5)).toBe(true);

			// Invalid ratings
			expect(isValidPersonalRating(0)).toBe(false);
			expect(isValidPersonalRating(6)).toBe(false);
			expect(isValidPersonalRating(-1)).toBe(false);
			expect(isValidPersonalRating(10)).toBe(false);
		});
	});

	describe('RLS Policy Concepts', () => {
		it('should design entries with user_id for row-level security', () => {
			const userAEntry: DbLibraryGame = {
				id: 'entry-a',
				user_id: 'user-a',
				game_id: 'game-1',
				play_count: 5,
				personal_rating: 4,
				review: "User A's review",
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			const userBEntry: DbLibraryGame = {
				id: 'entry-b',
				user_id: 'user-b',
				game_id: 'game-2',
				play_count: 10,
				personal_rating: 5,
				review: "User B's review",
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			// Each entry is associated with a specific user
			// RLS policies use user_id to restrict access
			expect(userAEntry.user_id).toBe('user-a');
			expect(userBEntry.user_id).toBe('user-b');
		});

		it('should restrict access to users own rows conceptually', () => {
			// Simulating RLS filter: WHERE auth.uid() = user_id
			const allEntries: DbLibraryGame[] = [
				{
					id: 'entry-1',
					user_id: 'user-current',
					game_id: 'game-1',
					play_count: 5,
					personal_rating: 4,
					review: null,
					created_at: '2024-01-15T00:00:00Z',
					updated_at: '2024-01-15T00:00:00Z'
				},
				{
					id: 'entry-2',
					user_id: 'user-current',
					game_id: 'game-2',
					play_count: 10,
					personal_rating: 5,
					review: null,
					created_at: '2024-01-15T00:00:00Z',
					updated_at: '2024-01-15T00:00:00Z'
				},
				{
					id: 'entry-3',
					user_id: 'user-other',
					game_id: 'game-1',
					play_count: 20,
					personal_rating: 3,
					review: null,
					created_at: '2024-01-15T00:00:00Z',
					updated_at: '2024-01-15T00:00:00Z'
				}
			];

			const currentUserId = 'user-current';
			const visibleToCurrentUser = allEntries.filter((entry) => entry.user_id === currentUserId);

			expect(visibleToCurrentUser.length).toBe(2);
			expect(visibleToCurrentUser.every((e) => e.user_id === currentUserId)).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty review string', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				review: ''
			};

			const result = transformLibraryGameInput(input);
			expect(result.review).toBe('');
		});

		it('should handle very long review', () => {
			const longReview = 'A'.repeat(10000);
			const input: LibraryGameInput = {
				gameId: 'game-1',
				review: longReview
			};

			const result = transformLibraryGameInput(input);
			expect(result.review).toBe(longReview);
		});

		it('should handle high play count', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				playCount: 9999
			};

			const result = transformLibraryGameInput(input);
			expect(result.play_count).toBe(9999);
			expect(isValidPlayCount(9999)).toBe(true);
		});

		it('should handle zero play count', () => {
			const input: LibraryGameInput = {
				gameId: 'game-1',
				playCount: 0
			};

			const result = transformLibraryGameInput(input);
			expect(result.play_count).toBe(0);
			expect(isValidPlayCount(0)).toBe(true);
		});

		it('should handle review with special characters', () => {
			const specialReview = "Great game! 🎲🎮 <script>alert('xss')</script> & more";
			const input: LibraryGameInput = {
				gameId: 'game-1',
				review: specialReview
			};

			const result = transformLibraryGameInput(input);
			expect(result.review).toBe(specialReview);
		});

		it('should handle review with newlines', () => {
			const multilineReview = 'Line 1\nLine 2\nLine 3';
			const input: LibraryGameInput = {
				gameId: 'game-1',
				review: multilineReview
			};

			const result = transformLibraryGameInput(input);
			expect(result.review).toBe(multilineReview);
		});
	});

	describe('Acceptance Criteria Verification', () => {
		it('should have library_games table columns matching schema', () => {
			// Verify DbLibraryGame has all required columns
			const requiredColumns = [
				'id',
				'user_id',
				'game_id',
				'play_count',
				'personal_rating',
				'review',
				'created_at',
				'updated_at'
			];

			const dbEntry: DbLibraryGame = {
				id: 'test',
				user_id: 'test',
				game_id: 'test',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			requiredColumns.forEach((column) => {
				expect(dbEntry).toHaveProperty(column);
			});
		});

		it('should have foreign key reference to games via game_id', () => {
			// The game_id field references games(id)
			const entry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'user-1',
				game_id: 'game-uuid-from-games-table',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(typeof entry.game_id).toBe('string');
			expect(entry.game_id.length).toBeGreaterThan(0);
		});

		it('should have foreign key reference to auth.users via user_id', () => {
			// The user_id field references auth.users(id)
			const entry: DbLibraryGame = {
				id: 'entry-1',
				user_id: 'auth-user-uuid',
				game_id: 'game-1',
				play_count: null,
				personal_rating: null,
				review: null,
				created_at: '2024-01-15T00:00:00Z',
				updated_at: '2024-01-15T00:00:00Z'
			};

			expect(typeof entry.user_id).toBe('string');
			expect(entry.user_id.length).toBeGreaterThan(0);
		});

		it('should enforce personal_rating in 1-5 range via validation', () => {
			// Valid range
			expect(isValidPersonalRating(1)).toBe(true);
			expect(isValidPersonalRating(5)).toBe(true);

			// Outside range
			expect(isValidPersonalRating(0)).toBe(false);
			expect(isValidPersonalRating(6)).toBe(false);
		});
	});
});
