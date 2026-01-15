import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';

// Type definitions for extracted game data
export interface ExtractedGameData {
	title: string | null;
	publisher: string | null;
	year: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playTimeMin: number | null;
	playTimeMax: number | null;
	confidence: 'high' | 'medium' | 'low';
	// AI-enriched fields based on board game knowledge
	description: string | null;
	categories: string[] | null;
	bggRating: number | null;
	bggRank: number | null;
	suggestedAge: number | null;
}

// Result for multi-game detection from a single image
export interface MultiGameAnalysisResult {
	success: boolean;
	games: ExtractedGameData[];
	gameCount: number;
	error: string | null;
	rawResponse: string | null;
}

// Legacy single-game result (for backward compatibility)
export interface AIAnalysisResult {
	success: boolean;
	data: ExtractedGameData | null;
	error: string | null;
	rawResponse: string | null;
}

// Initialize Gemini client
function getGeminiClient() {
	if (!GEMINI_API_KEY) {
		throw new Error('GEMINI_API_KEY environment variable is not set');
	}
	return new GoogleGenerativeAI(GEMINI_API_KEY);
}

// The prompt for extracting game information (supports multiple games in one image)
const EXTRACTION_PROMPT = `You are an expert at identifying board games from images. You have extensive knowledge about board games, including their descriptions, categories, and BoardGameGeek (BGG) ratings.

IMPORTANT: Images may contain MULTIPLE board game boxes (e.g., shelf photos, collection photos, stacked boxes). You must identify and extract information for EACH visible game.

For EACH board game visible in the image, extract information from TWO sources:
1. **Visible Information**: What you can see on the box (title, publisher, year, player count, play time)
2. **Your Knowledge**: If you recognize the game, provide additional information from your board game expertise

For each game, extract:

FROM THE IMAGE (visible on the box):
- Title: The name of the board game
- Publisher: The company that published the game
- Year: The year the game was published (if visible)
- Player Count: Minimum and maximum number of players
- Play Time: Minimum and maximum play time in minutes

FROM YOUR KNOWLEDGE (if you recognize the game):
- Publisher: The company that published the game (if not visible)
- Year: The year the game was published (if not visible)
- Player Count: Minimum and maximum number of players (if not visible)
- Play Time: Minimum and maximum play time in minutes (if not visible)
- Suggested Age: The minimum recommended age for players (e.g., 8, 10, 12, 14) - this is usually printed on the box as "Ages X+" or you can determine from game complexity
- Description: A brief 1-2 sentence summary of what the game is about and how it plays
- Categories: Game categories/tags (e.g., "strategy", "party", "cooperative", "family", "deck-building", "worker-placement", "area-control")
- BGG Rating: The BoardGameGeek average rating (0-10 scale, one decimal place) - verify from boardgamegeek.com
- BGG Rank: The BoardGameGeek overall ranking (integer) - verify from boardgamegeek.com

Respond with ONLY a valid JSON object containing an array of games (no markdown, no code blocks, just the JSON):
{
  "games": [
    {
      "title": "Game Name" or null if not identifiable,
      "publisher": "Publisher Name" or null if not visible,
      "year": 1995 or null if not visible,
      "minPlayers": 2 or null if not visible,
      "maxPlayers": 4 or null if not visible,
      "playTimeMin": 30 or null if not visible,
      "playTimeMax": 60 or null if not visible,
      "confidence": "high" or "medium" or "low",
      "suggestedAge": 10 or null if not visible and unknown,
      "description": "A brief description of the game" or null if you don't recognize it,
      "categories": ["strategy", "trading"] or null if you don't recognize it,
      "bggRating": 7.2 or null if unknown,
      "bggRank": 150 or null if unknown
    }
  ]
}

IMPORTANT:
- Return an array even if there's only one game visible.
- If you see multiple games, include ALL of them in the array.
- For partially visible or obscured games, still include them with "low" confidence and extract what you can.
- Use "high" confidence if the game title is clearly visible and identifiable.
- Use "medium" confidence if the image is somewhat unclear but you can make a reasonable guess.
- Use "low" confidence if the game is very unclear, partially obscured, or you're unsure.
- For description, categories, bggRating, bggRank, and suggestedAge: Only provide values if you can see them on the box OR you RECOGNIZE the game. If you don't recognize it and can't see the info, set these to null.
- Suggested Age should be a positive integer representing the minimum age (e.g., 8 for "Ages 8+").
- BGG Rating and BGG Rank should be verified from boardgamegeek.com for accuracy.
- BGG Rating should be between 1.0 and 10.0 with one decimal place.
- BGG Rank should be a positive integer.

If this is not an image of board game boxes or no games can be identified, return:
{
  "games": []
}`;

/**
 * Analyzes an uploaded image using Gemini AI to extract board game information.
 * Supports detection of multiple games in a single image.
 * @param imageBase64 - Base64 encoded image data (without the data URL prefix)
 * @param mimeType - The MIME type of the image (e.g., 'image/jpeg')
 * @returns Analysis result with extracted game data (array of games) or error
 */
export async function analyzeGameImage(
	imageBase64: string,
	mimeType: string
): Promise<MultiGameAnalysisResult> {
	try {
		const genAI = getGeminiClient();

		// Use Gemini Flash for fast, cost-effective vision analysis
		const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

		// Prepare the image part
		const imagePart: Part = {
			inlineData: {
				data: imageBase64,
				mimeType: mimeType
			}
		};

		// Generate content with the image
		const result = await model.generateContent([EXTRACTION_PROMPT, imagePart]);
		const response = await result.response;
		const text = response.text();

		// Parse the JSON response for multiple games
		const extractedGames = parseMultiGameResponse(text);

		return {
			success: true,
			games: extractedGames,
			gameCount: extractedGames.length,
			error: null,
			rawResponse: text
		};
	} catch (error) {
		console.error('Gemini AI analysis error:', error);

		// Handle specific error types
		if (error instanceof Error) {
			if (error.message.includes('GEMINI_API_KEY')) {
				return {
					success: false,
					games: [],
					gameCount: 0,
					error: 'AI service is not configured. Please contact the administrator.',
					rawResponse: null
				};
			}

			if (error.message.includes('quota') || error.message.includes('rate')) {
				return {
					success: false,
					games: [],
					gameCount: 0,
					error: 'AI service is temporarily unavailable. Please try again later.',
					rawResponse: null
				};
			}

			if (error.message.includes('SAFETY')) {
				return {
					success: false,
					games: [],
					gameCount: 0,
					error: 'The image could not be processed. Please try a different image.',
					rawResponse: null
				};
			}
		}

		return {
			success: false,
			games: [],
			gameCount: 0,
			error: 'Failed to analyze the image. Please try again.',
			rawResponse: null
		};
	}
}

/**
 * Cleans the Gemini response text by removing markdown code blocks.
 */
function cleanResponseText(responseText: string): string {
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

	return cleanedText.trim();
}

/**
 * Parses a single game object from the parsed JSON.
 */
export function parseSingleGame(parsed: Record<string, unknown>): ExtractedGameData {
	// Validate and normalize categories array
	let categories: string[] | null = null;
	if (Array.isArray(parsed.categories)) {
		const filteredCategories = (parsed.categories as unknown[])
			.filter((c: unknown) => typeof c === 'string' && (c as string).trim().length > 0)
			.map((c) => (c as string).trim());
		if (filteredCategories.length > 0) {
			categories = filteredCategories;
		}
	}

	// Validate and normalize bggRating (must be between 0 and 10)
	let bggRating: number | null = null;
	if (
		typeof parsed.bggRating === 'number' &&
		(parsed.bggRating as number) >= 0 &&
		(parsed.bggRating as number) <= 10
	) {
		// Round to one decimal place
		bggRating = Math.round((parsed.bggRating as number) * 10) / 10;
	}

	// Validate and normalize bggRank (must be positive integer)
	let bggRank: number | null = null;
	if (typeof parsed.bggRank === 'number' && (parsed.bggRank as number) > 0) {
		bggRank = Math.floor(parsed.bggRank as number);
	}

	// Validate and normalize suggestedAge (must be positive integer, typically 1-21)
	let suggestedAge: number | null = null;
	if (typeof parsed.suggestedAge === 'number' && (parsed.suggestedAge as number) > 0) {
		suggestedAge = Math.floor(parsed.suggestedAge as number);
	}

	// Validate and normalize the data
	return {
		title: typeof parsed.title === 'string' ? (parsed.title as string).trim() : null,
		publisher: typeof parsed.publisher === 'string' ? (parsed.publisher as string).trim() : null,
		year:
			typeof parsed.year === 'number' && (parsed.year as number) > 0
				? Math.floor(parsed.year as number)
				: null,
		minPlayers:
			typeof parsed.minPlayers === 'number' && (parsed.minPlayers as number) > 0
				? Math.floor(parsed.minPlayers as number)
				: null,
		maxPlayers:
			typeof parsed.maxPlayers === 'number' && (parsed.maxPlayers as number) > 0
				? Math.floor(parsed.maxPlayers as number)
				: null,
		playTimeMin:
			typeof parsed.playTimeMin === 'number' && (parsed.playTimeMin as number) > 0
				? Math.floor(parsed.playTimeMin as number)
				: null,
		playTimeMax:
			typeof parsed.playTimeMax === 'number' && (parsed.playTimeMax as number) > 0
				? Math.floor(parsed.playTimeMax as number)
				: null,
		confidence: ['high', 'medium', 'low'].includes(parsed.confidence as string)
			? (parsed.confidence as 'high' | 'medium' | 'low')
			: 'low',
		description:
			typeof parsed.description === 'string' ? (parsed.description as string).trim() : null,
		categories,
		bggRating,
		bggRank,
		suggestedAge
	};
}

/**
 * Parses the Gemini response text for multiple games.
 * Returns an array of ExtractedGameData.
 */
export function parseMultiGameResponse(responseText: string): ExtractedGameData[] {
	try {
		const cleanedText = cleanResponseText(responseText);
		const parsed = JSON.parse(cleanedText);

		// Check if response is in the new multi-game format { games: [...] }
		if (parsed.games && Array.isArray(parsed.games)) {
			return parsed.games
				.filter((game: unknown) => game && typeof game === 'object')
				.map((game: Record<string, unknown>) => parseSingleGame(game));
		}

		// Handle legacy single-game format (for backward compatibility)
		// If it's a single object with a title, wrap it in an array
		if (parsed.title !== undefined) {
			return [parseSingleGame(parsed)];
		}

		// If parsed is an array directly (unlikely but handle it)
		if (Array.isArray(parsed)) {
			return parsed
				.filter((game: unknown) => game && typeof game === 'object')
				.map((game: Record<string, unknown>) => parseSingleGame(game));
		}

		// No games found
		return [];
	} catch {
		// If parsing fails, return empty array
		console.error('Failed to parse Gemini response:', responseText);
		return [];
	}
}

/**
 * Parses the Gemini response text into structured game data (legacy single-game format).
 * Handles various response formats and edge cases.
 * @deprecated Use parseMultiGameResponse instead
 */
function parseGeminiResponse(responseText: string): ExtractedGameData {
	const games = parseMultiGameResponse(responseText);
	if (games.length > 0) {
		return games[0];
	}
	// Return empty data if no games found
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
		bggRank: null,
		suggestedAge: null
	};
}
