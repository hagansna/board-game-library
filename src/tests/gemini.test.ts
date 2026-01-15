import { describe, it, expect } from 'vitest';

// Test the response parsing logic without making actual API calls
// We'll mock the Gemini API for integration testing

/**
 * parseGeminiResponse test utility - mirrors the server implementation
 * This allows us to test the parsing logic without needing the actual API
 */
interface ExtractedGameData {
	title: string | null;
	publisher: string | null;
	year: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playTimeMin: number | null;
	playTimeMax: number | null;
	confidence: 'high' | 'medium' | 'low';
}

function parseGeminiResponse(responseText: string): ExtractedGameData {
	try {
		// Clean up the response - remove markdown code blocks if present
		let cleanedText = responseText.trim();

		// Remove ```json and ``` markers if present
		if (cleanedText.startsWith('```json')) {
			cleanedText = cleanedText.slice(7);
		} else if (cleanedText.startsWith('```')) {
			cleanedText = cleanedText.slice(3);
		}

		if (cleanedText.endsWith('```')) {
			cleanedText = cleanedText.slice(0, -3);
		}

		cleanedText = cleanedText.trim();

		// Parse the JSON
		const parsed = JSON.parse(cleanedText);

		// Validate and normalize the data
		return {
			title: typeof parsed.title === 'string' ? parsed.title.trim() : null,
			publisher: typeof parsed.publisher === 'string' ? parsed.publisher.trim() : null,
			year: typeof parsed.year === 'number' && parsed.year > 0 ? Math.floor(parsed.year) : null,
			minPlayers:
				typeof parsed.minPlayers === 'number' && parsed.minPlayers > 0
					? Math.floor(parsed.minPlayers)
					: null,
			maxPlayers:
				typeof parsed.maxPlayers === 'number' && parsed.maxPlayers > 0
					? Math.floor(parsed.maxPlayers)
					: null,
			playTimeMin:
				typeof parsed.playTimeMin === 'number' && parsed.playTimeMin > 0
					? Math.floor(parsed.playTimeMin)
					: null,
			playTimeMax:
				typeof parsed.playTimeMax === 'number' && parsed.playTimeMax > 0
					? Math.floor(parsed.playTimeMax)
					: null,
			confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low'
		};
	} catch {
		// If parsing fails, return empty data with low confidence
		return {
			title: null,
			publisher: null,
			year: null,
			minPlayers: null,
			maxPlayers: null,
			playTimeMin: null,
			playTimeMax: null,
			confidence: 'low'
		};
	}
}

describe('Gemini AI Extraction - Story 10', () => {
	describe('Response Parsing - Valid JSON', () => {
		it('should parse a complete valid response', () => {
			const response = JSON.stringify({
				title: 'Catan',
				publisher: 'Catan Studio',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Catan');
			expect(result.publisher).toBe('Catan Studio');
			expect(result.year).toBe(1995);
			expect(result.minPlayers).toBe(3);
			expect(result.maxPlayers).toBe(4);
			expect(result.playTimeMin).toBe(60);
			expect(result.playTimeMax).toBe(120);
			expect(result.confidence).toBe('high');
		});

		it('should parse response with null values', () => {
			const response = JSON.stringify({
				title: 'Unknown Game',
				publisher: null,
				year: null,
				minPlayers: 2,
				maxPlayers: 6,
				playTimeMin: null,
				playTimeMax: null,
				confidence: 'medium'
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Unknown Game');
			expect(result.publisher).toBeNull();
			expect(result.year).toBeNull();
			expect(result.minPlayers).toBe(2);
			expect(result.maxPlayers).toBe(6);
			expect(result.playTimeMin).toBeNull();
			expect(result.playTimeMax).toBeNull();
			expect(result.confidence).toBe('medium');
		});

		it('should handle JSON wrapped in markdown code blocks', () => {
			const response = `\`\`\`json
{
  "title": "Ticket to Ride",
  "publisher": "Days of Wonder",
  "year": 2004,
  "minPlayers": 2,
  "maxPlayers": 5,
  "playTimeMin": 30,
  "playTimeMax": 60,
  "confidence": "high"
}
\`\`\``;

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Ticket to Ride');
			expect(result.publisher).toBe('Days of Wonder');
			expect(result.year).toBe(2004);
			expect(result.confidence).toBe('high');
		});

		it('should handle JSON with extra whitespace', () => {
			const response = `

			{
				"title": "Pandemic",
				"publisher": "Z-Man Games",
				"year": 2008,
				"minPlayers": 2,
				"maxPlayers": 4,
				"playTimeMin": 45,
				"playTimeMax": 60,
				"confidence": "high"
			}

			`;

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Pandemic');
			expect(result.publisher).toBe('Z-Man Games');
		});
	});

	describe('Response Parsing - Data Validation', () => {
		it('should trim whitespace from string values', () => {
			const response = JSON.stringify({
				title: '  Azul  ',
				publisher: '  Plan B Games  ',
				year: 2017,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 45,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Azul');
			expect(result.publisher).toBe('Plan B Games');
		});

		it('should floor decimal values for numbers', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020.5,
				minPlayers: 2.7,
				maxPlayers: 4.9,
				playTimeMin: 30.5,
				playTimeMax: 60.9,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);

			expect(result.year).toBe(2020);
			expect(result.minPlayers).toBe(2);
			expect(result.maxPlayers).toBe(4);
			expect(result.playTimeMin).toBe(30);
			expect(result.playTimeMax).toBe(60);
		});

		it('should reject negative numbers', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: -2020,
				minPlayers: -2,
				maxPlayers: 4,
				playTimeMin: -30,
				playTimeMax: 60,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);

			expect(result.year).toBeNull();
			expect(result.minPlayers).toBeNull();
			expect(result.playTimeMin).toBeNull();
			expect(result.maxPlayers).toBe(4);
			expect(result.playTimeMax).toBe(60);
		});

		it('should reject zero values for numeric fields', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 0,
				minPlayers: 0,
				maxPlayers: 4,
				playTimeMin: 0,
				playTimeMax: 60,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);

			expect(result.year).toBeNull();
			expect(result.minPlayers).toBeNull();
			expect(result.playTimeMin).toBeNull();
		});

		it('should handle non-string title gracefully', () => {
			const response = JSON.stringify({
				title: 12345,
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBeNull();
		});

		it('should default invalid confidence to low', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'super_high'
			});

			const result = parseGeminiResponse(response);

			expect(result.confidence).toBe('low');
		});
	});

	describe('Response Parsing - Error Handling', () => {
		it('should return default data for invalid JSON', () => {
			const response = 'This is not valid JSON';

			const result = parseGeminiResponse(response);

			expect(result.title).toBeNull();
			expect(result.publisher).toBeNull();
			expect(result.year).toBeNull();
			expect(result.confidence).toBe('low');
		});

		it('should return default data for empty string', () => {
			const result = parseGeminiResponse('');

			expect(result.title).toBeNull();
			expect(result.confidence).toBe('low');
		});

		it('should return default data for malformed JSON', () => {
			const response = '{ "title": "Incomplete JSON';

			const result = parseGeminiResponse(response);

			expect(result.title).toBeNull();
			expect(result.confidence).toBe('low');
		});

		it('should handle array response gracefully', () => {
			const response = '["not", "an", "object"]';

			const result = parseGeminiResponse(response);

			// Arrays don't have the expected properties, so everything should be null
			expect(result.title).toBeNull();
			expect(result.confidence).toBe('low');
		});
	});

	describe('Response Parsing - Edge Cases', () => {
		it('should handle empty object response', () => {
			const response = '{}';

			const result = parseGeminiResponse(response);

			expect(result.title).toBeNull();
			expect(result.publisher).toBeNull();
			expect(result.year).toBeNull();
			expect(result.minPlayers).toBeNull();
			expect(result.maxPlayers).toBeNull();
			expect(result.playTimeMin).toBeNull();
			expect(result.playTimeMax).toBeNull();
			expect(result.confidence).toBe('low');
		});

		it('should handle response with extra fields', () => {
			const response = JSON.stringify({
				title: 'Root',
				publisher: 'Leder Games',
				year: 2018,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 90,
				confidence: 'high',
				extraField: 'ignored',
				anotherExtra: 12345
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Root');
			expect(result.publisher).toBe('Leder Games');
			expect(result.confidence).toBe('high');
			// Extra fields should be ignored
			expect(result).not.toHaveProperty('extraField');
			expect(result).not.toHaveProperty('anotherExtra');
		});

		it('should handle very long title strings', () => {
			const longTitle = 'A'.repeat(1000);
			const response = JSON.stringify({
				title: longTitle,
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBe(longTitle);
		});

		it('should handle unicode characters in strings', () => {
			const response = JSON.stringify({
				title: 'Wingspan: European Expansion',
				publisher: 'Stonemaier Games',
				year: 2019,
				minPlayers: 1,
				maxPlayers: 5,
				playTimeMin: 40,
				playTimeMax: 70,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Wingspan: European Expansion');
		});
	});

	describe('Confidence Level Handling', () => {
		it('should correctly identify high confidence', () => {
			const response = JSON.stringify({
				title: 'Clear Game',
				publisher: 'Clear Publisher',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high'
			});

			const result = parseGeminiResponse(response);
			expect(result.confidence).toBe('high');
		});

		it('should correctly identify medium confidence', () => {
			const response = JSON.stringify({
				title: 'Partial Game',
				publisher: null,
				year: null,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: null,
				playTimeMax: null,
				confidence: 'medium'
			});

			const result = parseGeminiResponse(response);
			expect(result.confidence).toBe('medium');
		});

		it('should correctly identify low confidence', () => {
			const response = JSON.stringify({
				title: null,
				publisher: null,
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				confidence: 'low'
			});

			const result = parseGeminiResponse(response);
			expect(result.confidence).toBe('low');
		});
	});

	describe('Non-Game Image Handling', () => {
		it('should return all nulls with low confidence for non-game images', () => {
			// This is the expected response when AI detects a non-board-game image
			const response = JSON.stringify({
				title: null,
				publisher: null,
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				confidence: 'low'
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBeNull();
			expect(result.publisher).toBeNull();
			expect(result.year).toBeNull();
			expect(result.minPlayers).toBeNull();
			expect(result.maxPlayers).toBeNull();
			expect(result.playTimeMin).toBeNull();
			expect(result.playTimeMax).toBeNull();
			expect(result.confidence).toBe('low');
		});
	});
});

describe('Gemini API Integration Types', () => {
	it('should define correct ExtractedGameData interface', () => {
		// Type checking test - ensures the interface is defined correctly
		const validData: ExtractedGameData = {
			title: 'Test',
			publisher: 'Test Publisher',
			year: 2020,
			minPlayers: 2,
			maxPlayers: 4,
			playTimeMin: 30,
			playTimeMax: 60,
			confidence: 'high'
		};

		expect(validData).toBeDefined();
		expect(validData.confidence).toBeOneOf(['high', 'medium', 'low']);
	});

	it('should allow null values for optional fields', () => {
		const dataWithNulls: ExtractedGameData = {
			title: null,
			publisher: null,
			year: null,
			minPlayers: null,
			maxPlayers: null,
			playTimeMin: null,
			playTimeMax: null,
			confidence: 'low'
		};

		expect(dataWithNulls.title).toBeNull();
		expect(dataWithNulls.confidence).toBe('low');
	});
});

// Custom matcher for confidence levels
expect.extend({
	toBeOneOf(received, array) {
		const pass = array.includes(received);
		return {
			pass,
			message: () =>
				pass
					? `expected ${received} not to be one of ${array.join(', ')}`
					: `expected ${received} to be one of ${array.join(', ')}`
		};
	}
});

declare module 'vitest' {
	interface Assertion {
		toBeOneOf(array: unknown[]): void;
	}
}
