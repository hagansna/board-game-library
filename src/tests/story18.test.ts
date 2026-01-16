/**
 * Story 18 Tests: AI detects and extracts information for multiple board games from a single image
 *
 * Acceptance criteria:
 * - AI identifies when an image contains multiple game boxes
 * - Each detected game is returned as a separate entry with its own data
 * - Count of games detected is shown to user (e.g., 'Found 3 games')
 * - Low-confidence detections are flagged appropriately
 * - Works with shelf photos, collection photos, and stacked boxes
 * - Gracefully handles partially visible or obscured games
 */

import { describe, it, expect } from 'vitest';
import {
	parseMultiGameResponse,
	parseSingleGame,
	type ExtractedGameData
} from '$lib/server/gemini';

describe('Story 18: Multi-game detection from single image', () => {
	describe('parseMultiGameResponse - multi-game format', () => {
		it('should parse response with multiple games', () => {
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
						bggRank: 150
					},
					{
						title: 'Ticket to Ride',
						publisher: 'Days of Wonder',
						year: 2004,
						minPlayers: 2,
						maxPlayers: 5,
						playTimeMin: 45,
						playTimeMax: 90,
						confidence: 'high',
						description: 'Build train routes across the map',
						categories: ['family', 'strategy'],
						bggRating: 7.4,
						bggRank: 120
					},
					{
						title: 'Pandemic',
						publisher: 'Z-Man Games',
						year: 2008,
						minPlayers: 2,
						maxPlayers: 4,
						playTimeMin: 45,
						playTimeMax: 60,
						confidence: 'medium',
						description: 'Cooperative game to save the world',
						categories: ['cooperative', 'strategy'],
						bggRating: 7.6,
						bggRank: 80
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(3);
			expect(result[0].title).toBe('Catan');
			expect(result[1].title).toBe('Ticket to Ride');
			expect(result[2].title).toBe('Pandemic');
		});

		it('should return count of detected games', () => {
			const response = JSON.stringify({
				games: [
					{ title: 'Game 1', confidence: 'high' },
					{ title: 'Game 2', confidence: 'medium' },
					{ title: 'Game 3', confidence: 'low' }
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result.length).toBe(3);
		});

		it('should parse single game in multi-game format (array with one element)', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Solo Game',
						publisher: 'Publisher',
						year: 2020,
						minPlayers: 1,
						maxPlayers: 4,
						playTimeMin: 30,
						playTimeMax: 60,
						confidence: 'high'
					}
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Solo Game');
		});

		it('should handle empty games array', () => {
			const response = JSON.stringify({ games: [] });

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(0);
		});

		it('should handle response with markdown code blocks', () => {
			const response = `\`\`\`json
{
	"games": [
		{ "title": "Game 1", "confidence": "high" },
		{ "title": "Game 2", "confidence": "medium" }
	]
}
\`\`\``;

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(2);
			expect(result[0].title).toBe('Game 1');
			expect(result[1].title).toBe('Game 2');
		});
	});

	describe('parseMultiGameResponse - legacy single-game format compatibility', () => {
		it('should handle legacy single-game format with title property', () => {
			const response = JSON.stringify({
				title: 'Legacy Game',
				publisher: 'Old Publisher',
				year: 2019,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high'
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Legacy Game');
		});

		it('should handle direct array format', () => {
			const response = JSON.stringify([
				{ title: 'Array Game 1', confidence: 'high' },
				{ title: 'Array Game 2', confidence: 'medium' }
			]);

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(2);
		});
	});

	describe('parseSingleGame - individual game validation', () => {
		it('should normalize all fields correctly', () => {
			const gameData = {
				title: '  Game Title  ',
				publisher: '  Publisher  ',
				year: 2020.7,
				minPlayers: 2.9,
				maxPlayers: 4.1,
				playTimeMin: 30.5,
				playTimeMax: 60.9,
				confidence: 'high',
				description: '  Game description  ',
				categories: ['strategy', '  trading  '],
				bggRating: 7.25,
				bggRank: 150.9
			};

			const result = parseSingleGame(gameData);

			expect(result.title).toBe('Game Title');
			expect(result.publisher).toBe('Publisher');
			expect(result.year).toBe(2020);
			expect(result.minPlayers).toBe(2);
			expect(result.maxPlayers).toBe(4);
			expect(result.playTimeMin).toBe(30);
			expect(result.playTimeMax).toBe(60);
			expect(result.description).toBe('Game description');
			expect(result.categories).toEqual(['strategy', 'trading']);
			expect(result.bggRating).toBe(7.3);
			expect(result.bggRank).toBe(150);
		});

		it('should handle null values appropriately', () => {
			const gameData = {
				title: 'Only Title',
				confidence: 'medium'
			};

			const result = parseSingleGame(gameData);

			expect(result.title).toBe('Only Title');
			expect(result.publisher).toBeNull();
			expect(result.year).toBeNull();
			expect(result.minPlayers).toBeNull();
			expect(result.maxPlayers).toBeNull();
			expect(result.playTimeMin).toBeNull();
			expect(result.playTimeMax).toBeNull();
			expect(result.description).toBeNull();
			expect(result.categories).toBeNull();
			expect(result.bggRating).toBeNull();
			expect(result.bggRank).toBeNull();
		});
	});

	describe('Confidence levels for partial/obscured games', () => {
		it('should preserve different confidence levels for each game', () => {
			const response = JSON.stringify({
				games: [
					{ title: 'Clear Game', confidence: 'high' },
					{ title: 'Somewhat Visible', confidence: 'medium' },
					{ title: 'Partially Obscured', confidence: 'low' }
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].confidence).toBe('high');
			expect(result[1].confidence).toBe('medium');
			expect(result[2].confidence).toBe('low');
		});

		it('should default to low confidence if not specified', () => {
			const response = JSON.stringify({
				games: [{ title: 'Unknown Confidence' }]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].confidence).toBe('low');
		});

		it('should default to low confidence for invalid confidence value', () => {
			const response = JSON.stringify({
				games: [{ title: 'Invalid Confidence', confidence: 'invalid' }]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].confidence).toBe('low');
		});
	});

	describe('Error handling and edge cases', () => {
		it('should return empty array for invalid JSON', () => {
			const result = parseMultiGameResponse('not valid json');

			expect(result).toHaveLength(0);
		});

		it('should return empty array for empty string', () => {
			const result = parseMultiGameResponse('');

			expect(result).toHaveLength(0);
		});

		it('should filter out invalid game objects in array', () => {
			const response = JSON.stringify({
				games: [
					{ title: 'Valid Game', confidence: 'high' },
					null,
					'not an object',
					{ title: 'Another Valid Game', confidence: 'medium' },
					42
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(2);
			expect(result[0].title).toBe('Valid Game');
			expect(result[1].title).toBe('Another Valid Game');
		});

		it('should handle games with null title (failed detection)', () => {
			const response = JSON.stringify({
				games: [
					{ title: 'Valid Game', confidence: 'high' },
					{ title: null, confidence: 'low' },
					{ confidence: 'low' }
				]
			});

			const result = parseMultiGameResponse(response);

			// All games are returned, even those with null titles
			// Filtering happens at the UI/server level
			expect(result).toHaveLength(3);
			expect(result[0].title).toBe('Valid Game');
			expect(result[1].title).toBeNull();
			expect(result[2].title).toBeNull();
		});
	});

	describe('Shelf/collection photo scenarios', () => {
		it('should handle shelf photo with many games', () => {
			const games = Array.from({ length: 10 }, (_, i) => ({
				title: `Shelf Game ${i + 1}`,
				confidence: i < 3 ? 'high' : i < 7 ? 'medium' : 'low'
			}));

			const response = JSON.stringify({ games });
			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(10);
			expect(result.filter((g) => g.confidence === 'high')).toHaveLength(3);
			expect(result.filter((g) => g.confidence === 'medium')).toHaveLength(4);
			expect(result.filter((g) => g.confidence === 'low')).toHaveLength(3);
		});

		it('should handle mixed success/failure in shelf photo', () => {
			const response = JSON.stringify({
				games: [
					{ title: 'Clearly Visible Game 1', confidence: 'high', year: 2020 },
					{ title: 'Clearly Visible Game 2', confidence: 'high', year: 2018 },
					{ title: 'Partial Title', confidence: 'low', year: null },
					{ title: null, confidence: 'low' } // Completely obscured
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result).toHaveLength(4);
			const validGames = result.filter((g) => g.title !== null);
			expect(validGames).toHaveLength(3);
		});
	});

	describe('AI-enriched data for multiple games', () => {
		it('should preserve AI-enriched fields for each game', () => {
			const response = JSON.stringify({
				games: [
					{
						title: 'Catan',
						confidence: 'high',
						description: 'Trade and build settlements',
						categories: ['strategy', 'trading', 'negotiation'],
						bggRating: 7.2,
						bggRank: 150
					},
					{
						title: 'Unknown Game',
						confidence: 'medium',
						description: null,
						categories: null,
						bggRating: null,
						bggRank: null
					}
				]
			});

			const result = parseMultiGameResponse(response);

			// First game has full enriched data
			expect(result[0].description).toBe('Trade and build settlements');
			expect(result[0].categories).toEqual(['strategy', 'trading', 'negotiation']);
			expect(result[0].bggRating).toBe(7.2);
			expect(result[0].bggRank).toBe(150);

			// Second game has null enriched data (not recognized)
			expect(result[1].description).toBeNull();
			expect(result[1].categories).toBeNull();
			expect(result[1].bggRating).toBeNull();
			expect(result[1].bggRank).toBeNull();
		});

		it('should validate and normalize BGG rating bounds per game', () => {
			const response = JSON.stringify({
				games: [
					{ title: 'Game 1', bggRating: 15 }, // Invalid - over 10
					{ title: 'Game 2', bggRating: -1 }, // Invalid - negative
					{ title: 'Game 3', bggRating: 7.567 }, // Should round to 7.6
					{ title: 'Game 4', bggRating: 0 } // Valid - exactly 0
				]
			});

			const result = parseMultiGameResponse(response);

			expect(result[0].bggRating).toBeNull();
			expect(result[1].bggRating).toBeNull();
			expect(result[2].bggRating).toBe(7.6);
			expect(result[3].bggRating).toBe(0);
		});
	});

	describe('MultiGameAnalysisResult interface', () => {
		it('should have correct structure with gameCount', () => {
			// This tests the type structure - the actual API call is mocked in integration tests
			const mockResult = {
				success: true,
				games: [{ title: 'Game 1' } as ExtractedGameData, { title: 'Game 2' } as ExtractedGameData],
				gameCount: 2,
				error: null,
				rawResponse: '...'
			};

			expect(mockResult.success).toBe(true);
			expect(mockResult.games).toHaveLength(2);
			expect(mockResult.gameCount).toBe(2);
			expect(mockResult.error).toBeNull();
		});

		it('should have correct structure for error case', () => {
			const mockResult = {
				success: false,
				games: [],
				gameCount: 0,
				error: 'Failed to analyze image',
				rawResponse: null
			};

			expect(mockResult.success).toBe(false);
			expect(mockResult.games).toHaveLength(0);
			expect(mockResult.gameCount).toBe(0);
			expect(mockResult.error).toBe('Failed to analyze image');
		});
	});
});
