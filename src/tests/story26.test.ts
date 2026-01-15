/**
 * Story 26 Tests: AI extracts suggested minimum age when analyzing board game images
 *
 * Acceptance criteria:
 * - ExtractedGameData interface includes suggestedAge: number | null
 * - AI prompt instructs extraction of minimum recommended age
 * - AI uses board game knowledge to determine age if not visible on box
 * - Suggested age is included in extraction results for known games
 * - Graceful handling when age cannot be determined (returns null)
 */

import { describe, it, expect } from 'vitest';
import {
	parseMultiGameResponse,
	parseSingleGame,
	type ExtractedGameData
} from '$lib/server/gemini';

describe('Story 26: AI extracts suggested minimum age', () => {
	describe('ExtractedGameData interface includes suggestedAge', () => {
		it('should include suggestedAge field in extracted game data', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Catan',
						confidence: 'high',
						suggestedAge: 10
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveProperty('suggestedAge');
			expect(result[0].suggestedAge).toBe(10);
		});

		it('should include suggestedAge as null when not provided', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Unknown Game',
						confidence: 'low'
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(1);
			expect(result[0].suggestedAge).toBeNull();
		});
	});

	describe('parseSingleGame handles suggestedAge field', () => {
		it('should parse valid suggestedAge from game data', () => {
			const gameData = {
				title: 'Ticket to Ride',
				confidence: 'high',
				suggestedAge: 8
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBe(8);
		});

		it('should handle decimal suggestedAge by flooring', () => {
			const gameData = {
				title: 'Test Game',
				confidence: 'medium',
				suggestedAge: 10.7
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBe(10);
		});

		it('should return null for zero suggestedAge', () => {
			const gameData = {
				title: 'Test Game',
				confidence: 'medium',
				suggestedAge: 0
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBeNull();
		});

		it('should return null for negative suggestedAge', () => {
			const gameData = {
				title: 'Test Game',
				confidence: 'medium',
				suggestedAge: -5
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBeNull();
		});

		it('should return null for non-number suggestedAge', () => {
			const gameData = {
				title: 'Test Game',
				confidence: 'medium',
				suggestedAge: 'eight'
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBeNull();
		});

		it('should return null for undefined suggestedAge', () => {
			const gameData = {
				title: 'Test Game',
				confidence: 'medium'
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBeNull();
		});

		it('should return null for null suggestedAge', () => {
			const gameData = {
				title: 'Test Game',
				confidence: 'medium',
				suggestedAge: null
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBeNull();
		});
	});

	describe('suggestedAge with well-known games', () => {
		it('should extract suggestedAge for Catan (10+)', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Catan',
						publisher: 'Kosmos',
						year: 1995,
						minPlayers: 3,
						maxPlayers: 4,
						playTimeMin: 60,
						playTimeMax: 120,
						confidence: 'high',
						description: 'Trade and build settlements',
						categories: ['strategy', 'trading'],
						bggRating: 7.2,
						bggRank: 150,
						suggestedAge: 10
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].title).toBe('Catan');
			expect(result[0].suggestedAge).toBe(10);
		});

		it('should extract suggestedAge for Ticket to Ride (8+)', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Ticket to Ride',
						publisher: 'Days of Wonder',
						year: 2004,
						confidence: 'high',
						suggestedAge: 8
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].title).toBe('Ticket to Ride');
			expect(result[0].suggestedAge).toBe(8);
		});

		it('should extract suggestedAge for Pandemic (8+)', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Pandemic',
						publisher: 'Z-Man Games',
						year: 2008,
						confidence: 'high',
						suggestedAge: 8
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].suggestedAge).toBe(8);
		});

		it('should extract suggestedAge for 7 Wonders (10+)', () => {
			const response = JSON.stringify({
				games: [
					{
						title: '7 Wonders',
						year: 2010,
						confidence: 'high',
						suggestedAge: 10
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].suggestedAge).toBe(10);
		});

		it('should extract suggestedAge for Gloomhaven (14+)', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Gloomhaven',
						year: 2017,
						confidence: 'high',
						suggestedAge: 14
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].suggestedAge).toBe(14);
		});
	});

	describe('suggestedAge with multiple games in single image', () => {
		it('should extract suggestedAge for multiple games', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Catan',
						confidence: 'high',
						suggestedAge: 10
					},
					{
						title: 'Ticket to Ride',
						confidence: 'high',
						suggestedAge: 8
					},
					{
						title: 'Pandemic',
						confidence: 'medium',
						suggestedAge: 8
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(3);
			expect(result[0].suggestedAge).toBe(10);
			expect(result[1].suggestedAge).toBe(8);
			expect(result[2].suggestedAge).toBe(8);
		});

		it('should handle mixed known/unknown games with varying suggestedAge', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Catan',
						confidence: 'high',
						suggestedAge: 10
					},
					{
						title: 'Unknown Game',
						confidence: 'low',
						suggestedAge: null
					},
					{
						title: 'Partially Visible',
						confidence: 'low'
						// suggestedAge not provided
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(3);
			expect(result[0].suggestedAge).toBe(10);
			expect(result[1].suggestedAge).toBeNull();
			expect(result[2].suggestedAge).toBeNull();
		});
	});

	describe('suggestedAge edge cases', () => {
		it('should handle typical age values (1-21 range)', () => {
			const ages = [3, 5, 6, 7, 8, 10, 12, 13, 14, 16, 18, 21];

			for (const age of ages) {
				const gameData = {
					title: 'Test Game',
					confidence: 'high' as const,
					suggestedAge: age
				};

				const result = parseSingleGame(gameData);
				expect(result.suggestedAge).toBe(age);
			}
		});

		it('should handle unusual but valid ages', () => {
			// Some party games might be 21+ for alcohol-themed games
			const gameData = {
				title: 'Adult Party Game',
				confidence: 'high',
				suggestedAge: 21
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBe(21);
		});

		it('should handle high ages by preserving them', () => {
			// No upper bound validation - AI might return any age
			const gameData = {
				title: 'Test Game',
				confidence: 'high',
				suggestedAge: 99
			};

			const result = parseSingleGame(gameData);

			expect(result.suggestedAge).toBe(99);
		});
	});

	describe('suggestedAge flows through complete extraction', () => {
		it('should include suggestedAge in full game extraction with all fields', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Catan',
						publisher: 'Kosmos',
						year: 1995,
						minPlayers: 3,
						maxPlayers: 4,
						playTimeMin: 60,
						playTimeMax: 120,
						confidence: 'high',
						description: 'A classic trading and building game',
						categories: ['strategy', 'trading'],
						bggRating: 7.2,
						bggRank: 150,
						suggestedAge: 10
					}
				]
			});

			const result = parseMultiGameResponse(response);

			// Verify all fields are present
			expect(result[0].title).toBe('Catan');
			expect(result[0].publisher).toBe('Kosmos');
			expect(result[0].year).toBe(1995);
			expect(result[0].minPlayers).toBe(3);
			expect(result[0].maxPlayers).toBe(4);
			expect(result[0].playTimeMin).toBe(60);
			expect(result[0].playTimeMax).toBe(120);
			expect(result[0].confidence).toBe('high');
			expect(result[0].description).toBe('A classic trading and building game');
			expect(result[0].categories).toEqual(['strategy', 'trading']);
			expect(result[0].bggRating).toBe(7.2);
			expect(result[0].bggRank).toBe(150);
			expect(result[0].suggestedAge).toBe(10);
		});

		it('should handle markdown wrapped response with suggestedAge', () => {
			const response = `\`\`\`json
{
	"games": [
		{
			"title": "Catan",
			"confidence": "high",
			"suggestedAge": 10
		}
	]
}
\`\`\``;

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(1);
			expect(result[0].suggestedAge).toBe(10);
		});
	});

	describe('graceful handling when age cannot be determined', () => {
		it('should return null suggestedAge for unrecognized games', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Very Obscure Game That Nobody Knows',
						confidence: 'low',
						suggestedAge: null
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].title).toBe('Very Obscure Game That Nobody Knows');
			expect(result[0].suggestedAge).toBeNull();
		});

		it('should handle empty games array', () => {
			const response = JSON.stringify({
				games: []
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(0);
		});

		it('should handle non-game images returning empty array', () => {
			const response = JSON.stringify({
				games: []
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(0);
		});
	});

	describe('ExtractedGameData type compliance', () => {
		it('should satisfy ExtractedGameData interface with suggestedAge', () => {
			const gameData: ExtractedGameData = {
				title: 'Test Game',
				publisher: 'Test Publisher',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: 'A test game description',
				categories: ['strategy'],
				bggRating: 7.5,
				bggRank: 100,
				suggestedAge: 10
			};

			expect(gameData.suggestedAge).toBe(10);
		});

		it('should satisfy ExtractedGameData interface with null suggestedAge', () => {
			const gameData: ExtractedGameData = {
				title: 'Test Game',
				publisher: null,
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				confidence: 'low',
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null,
				suggestedAge: null
			};

			expect(gameData.suggestedAge).toBeNull();
		});
	});
});
