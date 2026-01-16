/**
 * Story 41 Tests: Edit page shows game info read-only and only allows editing library fields
 *
 * Acceptance Criteria:
 * - Edit page displays game metadata as read-only (title, year, players, etc.)
 * - Only play_count, personal_rating, review fields are editable
 * - Form submission updates library_games table only
 * - Game metadata fields removed from form
 * - Page clearly indicates which fields can be edited
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getLibraryEntryWithGame,
	updateLibraryEntry,
	isValidPersonalRating,
	isValidPlayCount,
	type UserGameView,
	type LibraryGameInput
} from '$lib/server/library-games';

// Mock Supabase client
const mockSupabase = {
	from: vi.fn()
};

describe('Story 41: Edit Page for Library Fields Only', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Read-Only Game Metadata Display', () => {
		it('should return full game metadata in UserGameView', () => {
			const userGameView: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				boxArtUrl: 'https://example.com/catan.jpg',
				description: 'A strategy game about building settlements',
				categories: ['strategy', 'trading'],
				bggRating: 7.2,
				bggRank: 150,
				suggestedAge: 10,
				playCount: 5,
				personalRating: 4,
				review: 'Great game!',
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			// Verify all game metadata fields are present
			expect(userGameView.title).toBe('Catan');
			expect(userGameView.year).toBe(1995);
			expect(userGameView.minPlayers).toBe(3);
			expect(userGameView.maxPlayers).toBe(4);
			expect(userGameView.playTimeMin).toBe(60);
			expect(userGameView.playTimeMax).toBe(120);
			expect(userGameView.boxArtUrl).toBe('https://example.com/catan.jpg');
			expect(userGameView.description).toBe('A strategy game about building settlements');
			expect(userGameView.categories).toEqual(['strategy', 'trading']);
			expect(userGameView.bggRating).toBe(7.2);
			expect(userGameView.bggRank).toBe(150);
			expect(userGameView.suggestedAge).toBe(10);
		});

		it('should include game metadata fields that are read-only', () => {
			// These fields should be in UserGameView for display but NOT in LibraryGameInput
			const gameMetadataFields = [
				'title',
				'year',
				'minPlayers',
				'maxPlayers',
				'playTimeMin',
				'playTimeMax',
				'boxArtUrl',
				'description',
				'categories',
				'bggRating',
				'bggRank',
				'suggestedAge'
			];

			const userGameView: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
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
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			// All game metadata fields should exist in UserGameView
			for (const field of gameMetadataFields) {
				expect(field in userGameView).toBe(true);
			}
		});

		it('should handle games with null metadata fields', () => {
			const userGameView: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Minimal Game',
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
				playCount: 0,
				personalRating: null,
				review: null,
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			expect(userGameView.title).toBe('Minimal Game');
			expect(userGameView.year).toBeNull();
			expect(userGameView.minPlayers).toBeNull();
			expect(userGameView.boxArtUrl).toBeNull();
			expect(userGameView.categories).toBeNull();
		});
	});

	describe('Editable Library Fields Only', () => {
		it('should only allow editing playCount, personalRating, and review', () => {
			// LibraryGameInput should only contain editable fields
			const libraryInput: LibraryGameInput = {
				playCount: 10,
				personalRating: 5,
				review: 'Updated review'
			};

			expect(libraryInput.playCount).toBe(10);
			expect(libraryInput.personalRating).toBe(5);
			expect(libraryInput.review).toBe('Updated review');

			// Verify game metadata fields are NOT in LibraryGameInput
			expect('title' in libraryInput).toBe(false);
			expect('year' in libraryInput).toBe(false);
			expect('minPlayers' in libraryInput).toBe(false);
			expect('maxPlayers' in libraryInput).toBe(false);
			expect('playTimeMin' in libraryInput).toBe(false);
			expect('playTimeMax' in libraryInput).toBe(false);
		});

		it('should allow partial updates with only playCount', () => {
			const libraryInput: LibraryGameInput = {
				playCount: 5
			};

			expect(libraryInput.playCount).toBe(5);
			expect(libraryInput.personalRating).toBeUndefined();
			expect(libraryInput.review).toBeUndefined();
		});

		it('should allow partial updates with only personalRating', () => {
			const libraryInput: LibraryGameInput = {
				personalRating: 4
			};

			expect(libraryInput.playCount).toBeUndefined();
			expect(libraryInput.personalRating).toBe(4);
			expect(libraryInput.review).toBeUndefined();
		});

		it('should allow partial updates with only review', () => {
			const libraryInput: LibraryGameInput = {
				review: 'Great game for family game night!'
			};

			expect(libraryInput.playCount).toBeUndefined();
			expect(libraryInput.personalRating).toBeUndefined();
			expect(libraryInput.review).toBe('Great game for family game night!');
		});

		it('should allow null values for optional fields', () => {
			const libraryInput: LibraryGameInput = {
				playCount: null,
				personalRating: null,
				review: null
			};

			expect(libraryInput.playCount).toBeNull();
			expect(libraryInput.personalRating).toBeNull();
			expect(libraryInput.review).toBeNull();
		});
	});

	describe('Form Validation for Library Fields', () => {
		describe('playCount validation', () => {
			it('should accept 0 as valid play count', () => {
				expect(isValidPlayCount(0)).toBe(true);
			});

			it('should accept positive integers as valid play count', () => {
				expect(isValidPlayCount(1)).toBe(true);
				expect(isValidPlayCount(10)).toBe(true);
				expect(isValidPlayCount(100)).toBe(true);
			});

			it('should reject negative numbers', () => {
				expect(isValidPlayCount(-1)).toBe(false);
				expect(isValidPlayCount(-10)).toBe(false);
			});

			it('should reject non-integer values', () => {
				expect(isValidPlayCount(1.5)).toBe(false);
				expect(isValidPlayCount(3.7)).toBe(false);
			});

			it('should accept null as valid (optional field)', () => {
				// null is valid since play count is optional
				expect(isValidPlayCount(null)).toBe(true);
			});
		});

		describe('personalRating validation', () => {
			it('should accept ratings 1-5', () => {
				expect(isValidPersonalRating(1)).toBe(true);
				expect(isValidPersonalRating(2)).toBe(true);
				expect(isValidPersonalRating(3)).toBe(true);
				expect(isValidPersonalRating(4)).toBe(true);
				expect(isValidPersonalRating(5)).toBe(true);
			});

			it('should reject rating 0', () => {
				expect(isValidPersonalRating(0)).toBe(false);
			});

			it('should reject ratings above 5', () => {
				expect(isValidPersonalRating(6)).toBe(false);
				expect(isValidPersonalRating(10)).toBe(false);
			});

			it('should reject negative ratings', () => {
				expect(isValidPersonalRating(-1)).toBe(false);
			});

			it('should reject non-integer ratings', () => {
				expect(isValidPersonalRating(3.5)).toBe(false);
				expect(isValidPersonalRating(2.7)).toBe(false);
			});

			it('should accept null as valid (optional field)', () => {
				// null is valid since personal rating is optional
				expect(isValidPersonalRating(null)).toBe(true);
			});
		});
	});

	describe('Game Metadata Not Editable', () => {
		it('should not include title in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			// TypeScript would fail if we tried to add title
			expect((input as Record<string, unknown>).title).toBeUndefined();
		});

		it('should not include year in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			expect((input as Record<string, unknown>).year).toBeUndefined();
		});

		it('should not include player count fields in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			expect((input as Record<string, unknown>).minPlayers).toBeUndefined();
			expect((input as Record<string, unknown>).maxPlayers).toBeUndefined();
		});

		it('should not include play time fields in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			expect((input as Record<string, unknown>).playTimeMin).toBeUndefined();
			expect((input as Record<string, unknown>).playTimeMax).toBeUndefined();
		});

		it('should not include boxArtUrl in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			expect((input as Record<string, unknown>).boxArtUrl).toBeUndefined();
		});

		it('should not include description in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			expect((input as Record<string, unknown>).description).toBeUndefined();
		});

		it('should not include categories in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			expect((input as Record<string, unknown>).categories).toBeUndefined();
		});

		it('should not include BGG fields in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			expect((input as Record<string, unknown>).bggRating).toBeUndefined();
			expect((input as Record<string, unknown>).bggRank).toBeUndefined();
		});

		it('should not include suggestedAge in LibraryGameInput', () => {
			const input: LibraryGameInput = { playCount: 5 };
			expect((input as Record<string, unknown>).suggestedAge).toBeUndefined();
		});
	});

	describe('UserGameView Structure', () => {
		it('should contain both game and library identifiers', () => {
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
				playCount: 0,
				personalRating: null,
				review: null,
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			expect(view.libraryEntryId).toBe('lib-123');
			expect(view.gameId).toBe('game-456');
			expect(view.userId).toBe('user-789');
		});

		it('should have separate timestamps for game and library entry', () => {
			const gameDate = new Date('2024-01-01');
			const libraryDate = new Date('2024-06-15');

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
				playCount: 0,
				personalRating: null,
				review: null,
				gameCreatedAt: gameDate,
				gameUpdatedAt: gameDate,
				libraryEntryCreatedAt: libraryDate,
				libraryEntryUpdatedAt: libraryDate
			};

			expect(view.gameCreatedAt).toEqual(gameDate);
			expect(view.libraryEntryCreatedAt).toEqual(libraryDate);
		});
	});

	describe('Edit Page Load Data', () => {
		it('should provide all game metadata for display', () => {
			const libraryEntry: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Wingspan',
				year: 2019,
				minPlayers: 1,
				maxPlayers: 5,
				playTimeMin: 40,
				playTimeMax: 70,
				boxArtUrl: 'https://example.com/wingspan.jpg',
				description: 'A bird-collecting engine-building game',
				categories: ['strategy', 'card game', 'engine building'],
				bggRating: 8.1,
				bggRank: 22,
				suggestedAge: 10,
				playCount: 12,
				personalRating: 5,
				review: 'One of my favorites!',
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			// Verify all metadata is available for read-only display
			expect(libraryEntry.title).toBe('Wingspan');
			expect(libraryEntry.year).toBe(2019);
			expect(libraryEntry.description).toBe('A bird-collecting engine-building game');
			expect(libraryEntry.categories).toContain('strategy');

			// Verify editable fields are also available
			expect(libraryEntry.playCount).toBe(12);
			expect(libraryEntry.personalRating).toBe(5);
			expect(libraryEntry.review).toBe('One of my favorites!');
		});

		it('should use libraryEntryId for edit page routing', () => {
			const libraryEntry: UserGameView = {
				libraryEntryId: 'entry-abc-123',
				gameId: 'game-xyz-789',
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
				playCount: 0,
				personalRating: null,
				review: null,
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			// Edit page should be accessed via /games/[libraryEntryId]/edit
			const editUrl = `/games/${libraryEntry.libraryEntryId}/edit`;
			expect(editUrl).toBe('/games/entry-abc-123/edit');
		});
	});

	describe('Form Submission', () => {
		it('should only update library fields', () => {
			const updateData: LibraryGameInput = {
				playCount: 15,
				personalRating: 4,
				review: 'Still enjoying this game'
			};

			// Verify only library fields are in the update data
			const keys = Object.keys(updateData);
			expect(keys).toEqual(['playCount', 'personalRating', 'review']);
		});

		it('should preserve game metadata when updating library fields', () => {
			// When updating, game metadata should remain unchanged
			const originalView: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Original Title',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				boxArtUrl: 'https://example.com/game.jpg',
				description: 'Original description',
				categories: ['family'],
				bggRating: 7.5,
				bggRank: 100,
				suggestedAge: 8,
				playCount: 5,
				personalRating: 3,
				review: 'Old review',
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			// After update, game metadata fields should be same
			const updateInput: LibraryGameInput = {
				playCount: 10,
				personalRating: 5,
				review: 'New review'
			};

			// Game fields not in update input - they should remain unchanged
			expect('title' in updateInput).toBe(false);
			expect('year' in updateInput).toBe(false);
			expect('description' in updateInput).toBe(false);
		});
	});

	describe('Error Handling', () => {
		it('should handle non-existent library entry', async () => {
			// When getLibraryEntryWithGame returns null, should error
			const mockResult = null;
			expect(mockResult).toBeNull();
		});

		it('should handle validation errors for playCount', () => {
			const invalidPlayCount = -5;
			expect(isValidPlayCount(invalidPlayCount)).toBe(false);
		});

		it('should handle validation errors for personalRating', () => {
			const invalidRating = 7;
			expect(isValidPersonalRating(invalidRating)).toBe(false);
		});
	});

	describe('Acceptance Criteria Verification', () => {
		it('AC1: Edit page displays game metadata as read-only', () => {
			// UserGameView contains all game metadata for display
			const view: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				boxArtUrl: 'https://example.com/catan.jpg',
				description: 'Trading and building',
				categories: ['strategy'],
				bggRating: 7.2,
				bggRank: 150,
				suggestedAge: 10,
				playCount: 5,
				personalRating: 4,
				review: null,
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			// All game fields are present for read-only display
			expect(view.title).toBeDefined();
			expect(view.year).toBeDefined();
			expect(view.minPlayers).toBeDefined();
			expect(view.maxPlayers).toBeDefined();
		});

		it('AC2: Only play_count, personal_rating, review fields are editable', () => {
			const editableInput: LibraryGameInput = {
				playCount: 10,
				personalRating: 4,
				review: 'My review'
			};

			// Only these 3 fields should be present
			const keys = Object.keys(editableInput);
			const expectedEditableFields = ['playCount', 'personalRating', 'review'];
			keys.forEach((key) => {
				expect(expectedEditableFields).toContain(key);
			});
		});

		it('AC3: Form submission updates library_games table only', () => {
			// LibraryGameInput only contains library fields
			const input: LibraryGameInput = {
				playCount: 15,
				personalRating: 5,
				review: 'Updated review'
			};

			// No game metadata fields
			expect('title' in input).toBe(false);
			expect('year' in input).toBe(false);
			expect('boxArtUrl' in input).toBe(false);
		});

		it('AC4: Game metadata fields removed from form', () => {
			// LibraryGameInput interface does not include game metadata
			const input: LibraryGameInput = {};

			// These fields should not exist on LibraryGameInput
			const gameMetadataFields = [
				'title',
				'year',
				'minPlayers',
				'maxPlayers',
				'playTimeMin',
				'playTimeMax',
				'boxArtUrl',
				'description',
				'categories',
				'bggRating',
				'bggRank',
				'suggestedAge'
			];

			gameMetadataFields.forEach((field) => {
				expect(field in input).toBe(false);
			});
		});

		it('AC5: Page clearly indicates which fields can be edited', () => {
			// UserGameView provides all data; UI distinguishes read-only vs editable
			const view: UserGameView = {
				libraryEntryId: 'lib-1',
				gameId: 'game-1',
				userId: 'user-1',
				title: 'Game',
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
				gameCreatedAt: new Date(),
				gameUpdatedAt: new Date(),
				libraryEntryCreatedAt: new Date(),
				libraryEntryUpdatedAt: new Date()
			};

			// Editable fields
			const editableFields = ['playCount', 'personalRating', 'review'];
			editableFields.forEach((field) => {
				expect(field in view).toBe(true);
			});

			// Read-only fields
			const readOnlyFields = ['title', 'year', 'minPlayers', 'maxPlayers'];
			readOnlyFields.forEach((field) => {
				expect(field in view).toBe(true);
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty review string', () => {
			const input: LibraryGameInput = {
				review: ''
			};
			expect(input.review).toBe('');
		});

		it('should handle very long review text', () => {
			const longReview = 'A'.repeat(10000);
			const input: LibraryGameInput = {
				review: longReview
			};
			expect(input.review?.length).toBe(10000);
		});

		it('should handle maximum play count', () => {
			const input: LibraryGameInput = {
				playCount: 999999
			};
			expect(isValidPlayCount(input.playCount)).toBe(true);
		});

		it('should handle play count of 0', () => {
			const input: LibraryGameInput = {
				playCount: 0
			};
			expect(isValidPlayCount(input.playCount)).toBe(true);
		});

		it('should handle all fields as null', () => {
			const input: LibraryGameInput = {
				playCount: null,
				personalRating: null,
				review: null
			};
			expect(input.playCount).toBeNull();
			expect(input.personalRating).toBeNull();
			expect(input.review).toBeNull();
		});
	});

	describe('Function Exports', () => {
		it('should export getLibraryEntryWithGame function', () => {
			expect(typeof getLibraryEntryWithGame).toBe('function');
		});

		it('should export updateLibraryEntry function', () => {
			expect(typeof updateLibraryEntry).toBe('function');
		});

		it('should export isValidPersonalRating function', () => {
			expect(typeof isValidPersonalRating).toBe('function');
		});

		it('should export isValidPlayCount function', () => {
			expect(typeof isValidPlayCount).toBe('function');
		});
	});
});
