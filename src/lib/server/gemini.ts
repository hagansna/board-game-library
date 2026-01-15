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
}

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

// The prompt for extracting game information
const EXTRACTION_PROMPT = `You are an expert at identifying board games from images of their boxes. You have extensive knowledge about board games, including their descriptions, categories, and BoardGameGeek (BGG) ratings.

Analyze the provided image of a board game box and extract information from TWO sources:
1. **Visible Information**: What you can see on the box (title, publisher, year, player count, play time)
2. **Your Knowledge**: If you recognize the game, provide additional information from your board game expertise

Extract and provide the following information:

FROM THE IMAGE (visible on the box):
- Title: The name of the board game
- Publisher: The company that published the game
- Year: The year the game was published (if visible)
- Player Count: Minimum and maximum number of players
- Play Time: Minimum and maximum play time in minutes

FROM YOUR KNOWLEDGE (if you recognize the game):
- Description: A brief 1-2 sentence summary of what the game is about and how it plays
- Categories: Game categories/tags (e.g., "strategy", "party", "cooperative", "family", "deck-building", "worker-placement", "area-control")
- BGG Rating: The approximate BoardGameGeek average rating (0-10 scale, one decimal place)
- BGG Rank: The approximate BoardGameGeek overall ranking (integer)

Respond with ONLY a valid JSON object in this exact format (no markdown, no code blocks, just the JSON):
{
  "title": "Game Name" or null if not identifiable,
  "publisher": "Publisher Name" or null if not visible,
  "year": 1995 or null if not visible,
  "minPlayers": 2 or null if not visible,
  "maxPlayers": 4 or null if not visible,
  "playTimeMin": 30 or null if not visible,
  "playTimeMax": 60 or null if not visible,
  "confidence": "high" or "medium" or "low",
  "description": "A brief description of the game" or null if you don't recognize it,
  "categories": ["strategy", "trading"] or null if you don't recognize it,
  "bggRating": 7.2 or null if unknown,
  "bggRank": 150 or null if unknown
}

IMPORTANT:
- Use "high" confidence if the game title is clearly visible and identifiable.
- Use "medium" confidence if the image is somewhat unclear but you can make a reasonable guess.
- Use "low" confidence if the image is very unclear or doesn't appear to show a board game.
- For description, categories, bggRating, and bggRank: Only provide values if you RECOGNIZE the game and have knowledge about it. If you don't recognize the game or aren't sure, set these to null.
- BGG Rating should be between 1.0 and 10.0 with one decimal place.
- BGG Rank should be a positive integer.

If this is not an image of a board game box, return:
{
  "title": null,
  "publisher": null,
  "year": null,
  "minPlayers": null,
  "maxPlayers": null,
  "playTimeMin": null,
  "playTimeMax": null,
  "confidence": "low",
  "description": null,
  "categories": null,
  "bggRating": null,
  "bggRank": null
}`;

/**
 * Analyzes an uploaded image using Gemini AI to extract board game information.
 * @param imageBase64 - Base64 encoded image data (without the data URL prefix)
 * @param mimeType - The MIME type of the image (e.g., 'image/jpeg')
 * @returns Analysis result with extracted game data or error
 */
export async function analyzeGameImage(
	imageBase64: string,
	mimeType: string
): Promise<AIAnalysisResult> {
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

		// Parse the JSON response
		const extractedData = parseGeminiResponse(text);

		return {
			success: true,
			data: extractedData,
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
					data: null,
					error: 'AI service is not configured. Please contact the administrator.',
					rawResponse: null
				};
			}

			if (error.message.includes('quota') || error.message.includes('rate')) {
				return {
					success: false,
					data: null,
					error: 'AI service is temporarily unavailable. Please try again later.',
					rawResponse: null
				};
			}

			if (error.message.includes('SAFETY')) {
				return {
					success: false,
					data: null,
					error: 'The image could not be processed. Please try a different image.',
					rawResponse: null
				};
			}
		}

		return {
			success: false,
			data: null,
			error: 'Failed to analyze the image. Please try again.',
			rawResponse: null
		};
	}
}

/**
 * Parses the Gemini response text into structured game data.
 * Handles various response formats and edge cases.
 */
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
		console.error('Failed to parse Gemini response:', responseText);
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
