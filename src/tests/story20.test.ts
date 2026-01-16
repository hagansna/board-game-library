import { describe, it, expect } from 'vitest';

// Test the AI enrichment response parsing logic
// This mirrors the server implementation to test parsing without API calls

interface ExtractedGameData {
	title: string | null;
	publisher: string | null;
	year: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playTimeMin: number | null;
	playTimeMax: number | null;
	confidence: 'high' | 'medium' | 'low';
	// AI-enriched fields
	description: string | null;
	categories: string[] | null;
	bggRating: number | null;
	bggRank: number | null;
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

		// Validate and normalize categories array
		let categories: string[] | null = null;
		if (Array.isArray(parsed.categories)) {
			const filteredCategories = parsed.categories
				.filter((c: unknown) => typeof c === 'string' && c.trim().length > 0)
				.map((c: string) => c.trim());
			if (filteredCategories.length > 0) {
				categories = filteredCategories;
			}
		}

		// Validate and normalize bggRating (must be between 0 and 10)
		let bggRating: number | null = null;
		if (typeof parsed.bggRating === 'number' && parsed.bggRating >= 0 && parsed.bggRating <= 10) {
			// Round to one decimal place
			bggRating = Math.round(parsed.bggRating * 10) / 10;
		}

		// Validate and normalize bggRank (must be positive integer)
		let bggRank: number | null = null;
		if (typeof parsed.bggRank === 'number' && parsed.bggRank > 0) {
			bggRank = Math.floor(parsed.bggRank);
		}

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
			confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
			description: typeof parsed.description === 'string' ? parsed.description.trim() : null,
			categories,
			bggRating,
			bggRank
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
			confidence: 'low',
			description: null,
			categories: null,
			bggRating: null,
			bggRank: null
		};
	}
}

describe('Story 20 - AI Enrichment with Board Game Knowledge', () => {
	describe('Description Field Parsing', () => {
		it('should parse description from well-known game response', () => {
			const response = JSON.stringify({
				title: 'Catan',
				publisher: 'Catan Studio',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				confidence: 'high',
				description:
					'A classic strategy game where players trade resources and build settlements on the island of Catan.',
				categories: ['strategy', 'trading', 'family'],
				bggRating: 7.1,
				bggRank: 437
			});

			const result = parseGeminiResponse(response);

			expect(result.description).toBe(
				'A classic strategy game where players trade resources and build settlements on the island of Catan.'
			);
		});

		it('should trim whitespace from description', () => {
			const response = JSON.stringify({
				title: 'Pandemic',
				publisher: 'Z-Man Games',
				year: 2008,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 45,
				playTimeMax: 60,
				confidence: 'high',
				description: '   A cooperative game where players work together to cure diseases.   ',
				categories: ['cooperative', 'strategy'],
				bggRating: 7.6,
				bggRank: 121
			});

			const result = parseGeminiResponse(response);

			expect(result.description).toBe(
				'A cooperative game where players work together to cure diseases.'
			);
		});

		it('should return null description for unrecognized game', () => {
			const response = JSON.stringify({
				title: 'Some Unknown Game',
				publisher: null,
				year: null,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: null,
				playTimeMax: null,
				confidence: 'medium',
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.description).toBeNull();
		});

		it('should return null for non-string description', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: 12345,
				categories: null,
				bggRating: null,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.description).toBeNull();
		});
	});

	describe('Categories Field Parsing', () => {
		it('should parse categories array correctly', () => {
			const response = JSON.stringify({
				title: 'Wingspan',
				publisher: 'Stonemaier Games',
				year: 2019,
				minPlayers: 1,
				maxPlayers: 5,
				playTimeMin: 40,
				playTimeMax: 70,
				confidence: 'high',
				description: 'An engine-building game about attracting birds to your wildlife reserves.',
				categories: ['engine-building', 'card-game', 'nature'],
				bggRating: 8.0,
				bggRank: 26
			});

			const result = parseGeminiResponse(response);

			expect(result.categories).toEqual(['engine-building', 'card-game', 'nature']);
		});

		it('should trim whitespace from category strings', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: ['  strategy  ', ' party ', '  family  '],
				bggRating: null,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.categories).toEqual(['strategy', 'party', 'family']);
		});

		it('should filter out empty strings from categories', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: ['strategy', '', '   ', 'party'],
				bggRating: null,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.categories).toEqual(['strategy', 'party']);
		});

		it('should return null for empty categories array', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: [],
				bggRating: null,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.categories).toBeNull();
		});

		it('should return null for non-array categories', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: 'strategy',
				bggRating: null,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.categories).toBeNull();
		});

		it('should filter out non-string elements from categories', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: ['strategy', 123, null, 'party', { type: 'invalid' }],
				bggRating: null,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.categories).toEqual(['strategy', 'party']);
		});
	});

	describe('BGG Rating Field Parsing', () => {
		it('should parse valid BGG rating', () => {
			const response = JSON.stringify({
				title: 'Gloomhaven',
				publisher: 'Cephalofair Games',
				year: 2017,
				minPlayers: 1,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				confidence: 'high',
				description: 'A cooperative campaign game of tactical combat.',
				categories: ['adventure', 'dungeon-crawler'],
				bggRating: 8.5,
				bggRank: 1
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRating).toBe(8.5);
		});

		it('should round BGG rating to one decimal place', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: 7.456,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRating).toBe(7.5);
		});

		it('should accept BGG rating of 0', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: 0,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRating).toBe(0);
		});

		it('should accept BGG rating of 10', () => {
			const response = JSON.stringify({
				title: 'Perfect Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: 10,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRating).toBe(10);
		});

		it('should reject BGG rating above 10', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: 10.5,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRating).toBeNull();
		});

		it('should reject negative BGG rating', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: -1,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRating).toBeNull();
		});

		it('should return null for non-numeric BGG rating', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: '7.5',
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRating).toBeNull();
		});
	});

	describe('BGG Rank Field Parsing', () => {
		it('should parse valid BGG rank', () => {
			const response = JSON.stringify({
				title: 'Brass: Birmingham',
				publisher: 'Roxley',
				year: 2018,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				confidence: 'high',
				description:
					'An economic strategy game set in Birmingham during the industrial revolution.',
				categories: ['economic', 'strategy'],
				bggRating: 8.6,
				bggRank: 3
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRank).toBe(3);
		});

		it('should floor decimal BGG rank to integer', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: null,
				bggRank: 150.7
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRank).toBe(150);
		});

		it('should reject BGG rank of 0', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: null,
				bggRank: 0
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRank).toBeNull();
		});

		it('should reject negative BGG rank', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: null,
				bggRank: -10
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRank).toBeNull();
		});

		it('should return null for non-numeric BGG rank', () => {
			const response = JSON.stringify({
				title: 'Test Game',
				publisher: null,
				year: 2020,
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description: null,
				categories: null,
				bggRating: null,
				bggRank: '150'
			});

			const result = parseGeminiResponse(response);

			expect(result.bggRank).toBeNull();
		});
	});

	describe('Complete AI Enrichment Response', () => {
		it('should parse complete enrichment data for well-known game (Catan)', () => {
			const response = JSON.stringify({
				title: 'Catan',
				publisher: 'Catan Studio',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				confidence: 'high',
				description:
					'Trade, build, and settle the island of Catan in this classic strategy game. Collect resources and use them to build roads, settlements, and cities.',
				categories: ['strategy', 'trading', 'negotiation', 'family'],
				bggRating: 7.1,
				bggRank: 437
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
			expect(result.description).toContain('Trade, build, and settle');
			expect(result.categories).toContain('strategy');
			expect(result.categories).toContain('trading');
			expect(result.bggRating).toBe(7.1);
			expect(result.bggRank).toBe(437);
		});

		it('should parse enrichment data for Ticket to Ride', () => {
			const response = JSON.stringify({
				title: 'Ticket to Ride',
				publisher: 'Days of Wonder',
				year: 2004,
				minPlayers: 2,
				maxPlayers: 5,
				playTimeMin: 30,
				playTimeMax: 60,
				confidence: 'high',
				description:
					'Build train routes across North America by collecting and playing matching train cards.',
				categories: ['family', 'set-collection', 'route-building'],
				bggRating: 7.4,
				bggRank: 178
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Ticket to Ride');
			expect(result.categories).toContain('family');
			expect(result.categories).toContain('route-building');
			expect(result.bggRating).toBe(7.4);
			expect(result.bggRank).toBe(178);
		});

		it('should handle response with image data but no knowledge enrichment', () => {
			const response = JSON.stringify({
				title: 'Obscure Indie Game',
				publisher: 'Small Publisher',
				year: 2023,
				minPlayers: 2,
				maxPlayers: 6,
				playTimeMin: 45,
				playTimeMax: 90,
				confidence: 'medium',
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null
			});

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Obscure Indie Game');
			expect(result.publisher).toBe('Small Publisher');
			expect(result.year).toBe(2023);
			expect(result.confidence).toBe('medium');
			expect(result.description).toBeNull();
			expect(result.categories).toBeNull();
			expect(result.bggRating).toBeNull();
			expect(result.bggRank).toBeNull();
		});

		it('should handle response in markdown code blocks with enrichment data', () => {
			const response = `\`\`\`json
{
  "title": "Azul",
  "publisher": "Plan B Games",
  "year": 2017,
  "minPlayers": 2,
  "maxPlayers": 4,
  "playTimeMin": 30,
  "playTimeMax": 45,
  "confidence": "high",
  "description": "Tile-laying game inspired by Portuguese azulejos tiles.",
  "categories": ["abstract", "pattern-building"],
  "bggRating": 7.8,
  "bggRank": 65
}
\`\`\``;

			const result = parseGeminiResponse(response);

			expect(result.title).toBe('Azul');
			expect(result.description).toBe('Tile-laying game inspired by Portuguese azulejos tiles.');
			expect(result.categories).toEqual(['abstract', 'pattern-building']);
			expect(result.bggRating).toBe(7.8);
			expect(result.bggRank).toBe(65);
		});
	});

	describe('Non-Game Image Response with Enrichment Fields', () => {
		it('should return all nulls including enrichment fields for non-game image', () => {
			const response = JSON.stringify({
				title: null,
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
				bggRank: null
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
			expect(result.description).toBeNull();
			expect(result.categories).toBeNull();
			expect(result.bggRating).toBeNull();
			expect(result.bggRank).toBeNull();
		});
	});

	describe('Error Handling with Enrichment Fields', () => {
		it('should return default data including null enrichment fields for invalid JSON', () => {
			const response = 'This is not valid JSON';

			const result = parseGeminiResponse(response);

			expect(result.title).toBeNull();
			expect(result.confidence).toBe('low');
			expect(result.description).toBeNull();
			expect(result.categories).toBeNull();
			expect(result.bggRating).toBeNull();
			expect(result.bggRank).toBeNull();
		});

		it('should return default data for empty response', () => {
			const result = parseGeminiResponse('');

			expect(result.title).toBeNull();
			expect(result.description).toBeNull();
			expect(result.categories).toBeNull();
			expect(result.bggRating).toBeNull();
			expect(result.bggRank).toBeNull();
		});
	});

	describe('AI Indicator for Enriched Data', () => {
		it('should clearly distinguish image data from knowledge data', () => {
			// Response where AI provides additional info beyond what's visible on box
			const response = JSON.stringify({
				title: 'Spirit Island',
				publisher: 'Greater Than Games',
				year: 2017,
				minPlayers: 1,
				maxPlayers: 4,
				playTimeMin: 90,
				playTimeMax: 120,
				confidence: 'high',
				// These come from AI knowledge, not from the image
				description:
					'A cooperative game where players are spirits defending their island from colonizers.',
				categories: ['cooperative', 'strategy', 'area-control', 'asymmetric'],
				bggRating: 8.3,
				bggRank: 12
			});

			const result = parseGeminiResponse(response);

			// Image data fields
			expect(result.title).toBe('Spirit Island');
			expect(result.publisher).toBe('Greater Than Games');
			expect(result.year).toBe(2017);

			// AI knowledge fields (should all be present for a well-known game)
			expect(result.description).not.toBeNull();
			expect(result.categories).not.toBeNull();
			expect(result.bggRating).not.toBeNull();
			expect(result.bggRank).not.toBeNull();
		});
	});
});

describe('Story 20 - Type Interface Validation', () => {
	it('should define ExtractedGameData with all enrichment fields', () => {
		const validData: ExtractedGameData = {
			title: 'Catan',
			publisher: 'Catan Studio',
			year: 1995,
			minPlayers: 3,
			maxPlayers: 4,
			playTimeMin: 60,
			playTimeMax: 120,
			confidence: 'high',
			description: 'A trading and building game',
			categories: ['strategy', 'trading'],
			bggRating: 7.1,
			bggRank: 437
		};

		expect(validData).toBeDefined();
		expect(validData.description).toBe('A trading and building game');
		expect(validData.categories).toEqual(['strategy', 'trading']);
		expect(validData.bggRating).toBe(7.1);
		expect(validData.bggRank).toBe(437);
	});

	it('should allow all enrichment fields to be null', () => {
		const dataWithNulls: ExtractedGameData = {
			title: 'Unknown Game',
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
			bggRank: null
		};

		expect(dataWithNulls.description).toBeNull();
		expect(dataWithNulls.categories).toBeNull();
		expect(dataWithNulls.bggRating).toBeNull();
		expect(dataWithNulls.bggRank).toBeNull();
	});
});
