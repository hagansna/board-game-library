/**
 * Backfill Script: Suggested Age for Existing Games
 *
 * This script queries all games where suggested_age is null and uses
 * Google Gemini AI to look up the recommended minimum age for each game
 * based on its title.
 *
 * Usage:
 *   npx tsx scripts/backfill-suggested-age.ts
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 *   - GEMINI_API_KEY environment variable
 *
 * Features:
 *   - Rate limiting (1 request per second to avoid API throttling)
 *   - Progress output during execution
 *   - Graceful error handling (logs failures, continues processing)
 *   - Safe to run multiple times (only updates null values)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration
const RATE_LIMIT_MS = 1000; // 1 second between requests
const MAX_RETRIES = 2;

// Types
interface GameWithNullAge {
	id: string;
	title: string;
	suggested_age: number | null;
}

interface BackfillResult {
	gameId: string;
	title: string;
	suggestedAge: number | null;
	success: boolean;
	error?: string;
}

interface BackfillSummary {
	total: number;
	updated: number;
	failed: number;
	skipped: number;
	results: BackfillResult[];
}

// Prompt for looking up suggested age by game title
const AGE_LOOKUP_PROMPT = `You are a board game expert. Given a board game title, provide the recommended minimum age for players.

For the board game titled "{TITLE}", what is the recommended minimum age?

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "suggestedAge": 10,
  "confidence": "high"
}

Guidelines:
- suggestedAge should be a positive integer representing the minimum age (e.g., 8 for "Ages 8+")
- Use "high" confidence if you're certain about this game
- Use "medium" confidence if you're somewhat sure
- Use "low" confidence if you're uncertain
- If you don't recognize the game or can't determine the age, return: { "suggestedAge": null, "confidence": "low" }

Common age ranges for reference:
- Family/Party games: 8-10
- Gateway strategy games: 10-12
- Medium strategy games: 12-14
- Heavy strategy games: 14+
- Children's games: 3-7`;

/**
 * Initialize Gemini AI client
 */
function getGeminiClient(): GoogleGenerativeAI {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error('GEMINI_API_KEY environment variable is not set');
	}
	return new GoogleGenerativeAI(apiKey);
}

/**
 * Initialize Supabase client
 */
function getSupabaseClient(): SupabaseClient {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_ANON_KEY;

	if (!url || !key) {
		throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
	}

	return createClient(url, key);
}

/**
 * Fetch all games where suggested_age is null
 */
export async function getGamesWithNullAge(supabase: SupabaseClient): Promise<GameWithNullAge[]> {
	const { data, error } = await supabase
		.from('games')
		.select('id, title, suggested_age')
		.is('suggested_age', null)
		.order('title', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch games: ${error.message}`);
	}

	return data as GameWithNullAge[];
}

/**
 * Look up suggested age for a game title using Gemini AI
 */
export async function lookupSuggestedAge(
	genAI: GoogleGenerativeAI,
	title: string
): Promise<number | null> {
	const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
	const prompt = AGE_LOOKUP_PROMPT.replace('{TITLE}', title);

	const result = await model.generateContent(prompt);
	const response = await result.response;
	const text = response.text().trim();

	// Parse JSON response
	const parsed = parseAgeResponse(text);
	return parsed;
}

/**
 * Parse the Gemini response to extract suggested age
 */
export function parseAgeResponse(responseText: string): number | null {
	try {
		// Clean markdown code blocks if present
		let cleanedText = responseText.trim();
		if (cleanedText.startsWith('```json')) {
			cleanedText = cleanedText.slice(7);
		} else if (cleanedText.startsWith('```')) {
			cleanedText = cleanedText.slice(3);
		}
		if (cleanedText.endsWith('```')) {
			cleanedText = cleanedText.slice(0, -3);
		}
		cleanedText = cleanedText.trim();

		const parsed = JSON.parse(cleanedText);

		// Validate suggestedAge
		if (typeof parsed.suggestedAge === 'number' && parsed.suggestedAge > 0) {
			return Math.floor(parsed.suggestedAge);
		}

		return null;
	} catch {
		console.error('Failed to parse age response:', responseText);
		return null;
	}
}

/**
 * Update a game's suggested_age in the database
 */
export async function updateGameAge(
	supabase: SupabaseClient,
	gameId: string,
	suggestedAge: number
): Promise<boolean> {
	const { error } = await supabase
		.from('games')
		.update({ suggested_age: suggestedAge })
		.eq('id', gameId);

	if (error) {
		throw new Error(`Failed to update game ${gameId}: ${error.message}`);
	}

	return true;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process a single game with retry logic
 */
async function processGame(
	genAI: GoogleGenerativeAI,
	supabase: SupabaseClient,
	game: GameWithNullAge,
	retries = MAX_RETRIES
): Promise<BackfillResult> {
	try {
		const suggestedAge = await lookupSuggestedAge(genAI, game.title);

		if (suggestedAge === null) {
			return {
				gameId: game.id,
				title: game.title,
				suggestedAge: null,
				success: true,
				error: 'Age could not be determined'
			};
		}

		await updateGameAge(supabase, game.id, suggestedAge);

		return {
			gameId: game.id,
			title: game.title,
			suggestedAge,
			success: true
		};
	} catch (error) {
		if (retries > 0) {
			console.log(`  Retrying ${game.title} (${retries} attempts left)...`);
			await sleep(RATE_LIMIT_MS);
			return processGame(genAI, supabase, game, retries - 1);
		}

		return {
			gameId: game.id,
			title: game.title,
			suggestedAge: null,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Main backfill function - processes all games with null suggested_age
 */
export async function backfillSuggestedAge(
	supabase?: SupabaseClient,
	genAI?: GoogleGenerativeAI
): Promise<BackfillSummary> {
	// Initialize clients if not provided (for testing)
	const supabaseClient = supabase || getSupabaseClient();
	const geminiClient = genAI || getGeminiClient();

	console.log('Starting suggested age backfill...\n');

	// Fetch games with null suggested_age
	const games = await getGamesWithNullAge(supabaseClient);

	if (games.length === 0) {
		console.log('No games found with null suggested_age. Nothing to backfill.');
		return {
			total: 0,
			updated: 0,
			failed: 0,
			skipped: 0,
			results: []
		};
	}

	console.log(`Found ${games.length} games with null suggested_age.\n`);

	const results: BackfillResult[] = [];
	let updated = 0;
	let failed = 0;
	let skipped = 0;

	// Process each game with rate limiting
	for (let i = 0; i < games.length; i++) {
		const game = games[i];
		const progress = `[${i + 1}/${games.length}]`;

		console.log(`${progress} Processing: ${game.title}`);

		const result = await processGame(geminiClient, supabaseClient, game);
		results.push(result);

		if (result.success && result.suggestedAge !== null) {
			updated++;
			console.log(`  ✓ Updated: Ages ${result.suggestedAge}+`);
		} else if (result.success) {
			skipped++;
			console.log(`  - Skipped: ${result.error || 'Age unknown'}`);
		} else {
			failed++;
			console.log(`  ✗ Failed: ${result.error}`);
		}

		// Rate limiting - wait between requests (except for last item)
		if (i < games.length - 1) {
			await sleep(RATE_LIMIT_MS);
		}
	}

	// Print summary
	console.log('\n========== Backfill Summary ==========');
	console.log(`Total games processed: ${games.length}`);
	console.log(`Successfully updated:  ${updated}`);
	console.log(`Skipped (age unknown): ${skipped}`);
	console.log(`Failed:                ${failed}`);
	console.log('=======================================\n');

	return {
		total: games.length,
		updated,
		failed,
		skipped,
		results
	};
}

// Run the script if executed directly
const isMainModule = process.argv[1]?.endsWith('backfill-suggested-age.ts');
if (isMainModule) {
	backfillSuggestedAge()
		.then((summary) => {
			if (summary.failed > 0) {
				process.exit(1);
			}
			process.exit(0);
		})
		.catch((error) => {
			console.error('Backfill failed:', error);
			process.exit(1);
		});
}
