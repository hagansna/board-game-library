/**
 * Populate Games Table from BGG Data
 *
 * This script reads the bgg-data/games.csv file and populates the Supabase
 * games table with board game data from BoardGameGeek.
 *
 * Usage:
 *   npx tsx scripts/populate-games-from-bgg.ts
 *
 * Options:
 *   --dry-run     Preview what would be inserted without making changes
 *   --limit=N     Only process the first N games (useful for testing)
 *   --batch=N     Batch size for inserts (default: 100)
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 *
 * CSV Field Mapping (BGG → Supabase):
 *   - BGGId → used to generate deterministic UUID
 *   - Name → title
 *   - Description → description
 *   - YearPublished → year
 *   - MinPlayers → min_players
 *   - MaxPlayers → max_players
 *   - ComMinPlaytime → play_time_min (falls back to MfgPlaytime)
 *   - ComMaxPlaytime → play_time_max (falls back to MfgPlaytime)
 *   - ImagePath → box_art_url
 *   - AvgRating → bgg_rating
 *   - Rank:boardgame → bgg_rank
 *   - ComAgeRec → suggested_age (falls back to MfgAgeRec)
 *   - Cat:* columns → categories array
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import { v5 as uuidv5 } from 'uuid';

// Load environment variables
dotenv.config();

// UUID namespace for generating deterministic IDs from BGG IDs
const BGG_UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Configuration
const DEFAULT_BATCH_SIZE = 100;
const CSV_PATH = path.join(process.cwd(), 'bgg-data', 'games.csv');

// Category mapping from CSV column names to readable names
const CATEGORY_MAP: Record<string, string> = {
	'Cat:Thematic': 'Thematic',
	'Cat:Strategy': 'Strategy',
	'Cat:War': 'War',
	'Cat:Family': 'Family',
	'Cat:CGS': 'Collectible Card Game',
	'Cat:Abstract': 'Abstract',
	'Cat:Party': 'Party',
	'Cat:Childrens': "Children's"
};

// Types
interface BggCsvRow {
	BGGId: string;
	Name: string;
	Description: string;
	YearPublished: string;
	MinPlayers: string;
	MaxPlayers: string;
	MfgPlaytime: string;
	ComMinPlaytime: string;
	ComMaxPlaytime: string;
	MfgAgeRec: string;
	ComAgeRec: string;
	AvgRating: string;
	ImagePath: string;
	'Rank:boardgame': string;
	[key: string]: string; // For Cat:* columns
}

interface GameInsert {
	id: string;
	title: string;
	description: string | null;
	year: number | null;
	min_players: number | null;
	max_players: number | null;
	play_time_min: number | null;
	play_time_max: number | null;
	box_art_url: string | null;
	bgg_rating: number | null;
	bgg_rank: number | null;
	suggested_age: number | null;
	categories: string[] | null;
}

interface PopulateResult {
	total: number;
	inserted: number;
	skipped: number;
	failed: number;
	errors: Array<{ bggId: string; title: string; error: string }>;
}

/**
 * Initialize Supabase client with service role key (bypasses RLS)
 */
function getSupabaseClient(): SupabaseClient {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new Error(
			'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.\n' +
				'The service role key is needed to bypass Row Level Security for bulk inserts.'
		);
	}

	return createClient(url, key);
}

/**
 * Generate a deterministic UUID from a BGG ID
 */
function bggIdToUuid(bggId: string): string {
	return uuidv5(bggId, BGG_UUID_NAMESPACE);
}

/**
 * Parse a numeric value, returning null for invalid/empty values
 */
function parseNumber(value: string | undefined): number | null {
	if (!value || value.trim() === '') return null;
	const num = parseFloat(value);
	return isNaN(num) ? null : num;
}

/**
 * Parse an integer value, returning null for invalid/empty values
 */
function parseInt(value: string | undefined): number | null {
	const num = parseNumber(value);
	return num !== null ? Math.floor(num) : null;
}

/**
 * Parse the rank value, returning null for unranked games (21926 typically means unranked)
 */
function parseRank(value: string | undefined): number | null {
	const rank = parseInt(value);
	// BGG uses 21926 (or similar high values) to indicate unranked
	if (rank !== null && rank > 20000) return null;
	return rank;
}

/**
 * Extract categories from CSV row based on Cat:* columns
 */
function extractCategories(row: BggCsvRow): string[] | null {
	const categories: string[] = [];

	for (const [colName, categoryName] of Object.entries(CATEGORY_MAP)) {
		const value = row[colName];
		// Value of 1 indicates the game belongs to this category
		if (value === '1') {
			categories.push(categoryName);
		}
	}

	return categories.length > 0 ? categories : null;
}

/**
 * Clean and truncate description text
 */
function cleanDescription(description: string | undefined): string | null {
	if (!description || description.trim() === '') return null;

	// The descriptions in the CSV appear to be already processed/cleaned
	// Just trim and limit length if needed
	let cleaned = description.trim();

	// Limit to 10000 characters to avoid database issues
	if (cleaned.length > 10000) {
		cleaned = cleaned.substring(0, 9997) + '...';
	}

	return cleaned || null;
}

/**
 * Transform a BGG CSV row to a game insert object
 */
function transformRow(row: BggCsvRow): GameInsert {
	// Use community playtime if available, otherwise manufacturer playtime
	const mfgPlaytime = parseInt(row.MfgPlaytime);
	const comMinPlaytime = parseInt(row.ComMinPlaytime);
	const comMaxPlaytime = parseInt(row.ComMaxPlaytime);

	const playTimeMin = comMinPlaytime ?? mfgPlaytime;
	const playTimeMax = comMaxPlaytime ?? mfgPlaytime;

	// Use community age recommendation if available, otherwise manufacturer
	const comAgeRec = parseNumber(row.ComAgeRec);
	const mfgAgeRec = parseInt(row.MfgAgeRec);
	const suggestedAge = comAgeRec !== null ? Math.floor(comAgeRec) : mfgAgeRec;

	return {
		id: bggIdToUuid(row.BGGId),
		title: row.Name.trim(),
		description: cleanDescription(row.Description),
		year: parseInt(row.YearPublished),
		min_players: parseInt(row.MinPlayers),
		max_players: parseInt(row.MaxPlayers),
		play_time_min: playTimeMin,
		play_time_max: playTimeMax,
		box_art_url: row.ImagePath?.trim() || null,
		bgg_rating: parseNumber(row.AvgRating),
		bgg_rank: parseRank(row['Rank:boardgame']),
		suggested_age: suggestedAge,
		categories: extractCategories(row)
	};
}

/**
 * Read and parse the BGG CSV file
 */
function readCsvFile(csvPath: string): BggCsvRow[] {
	if (!fs.existsSync(csvPath)) {
		throw new Error(`CSV file not found: ${csvPath}`);
	}

	const fileContent = fs.readFileSync(csvPath, 'utf-8');

	const records = parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
		relax_quotes: true,
		relax_column_count: true
	});

	return records as BggCsvRow[];
}

/**
 * Insert games in batches with upsert (update if exists)
 */
async function insertBatch(
	supabase: SupabaseClient,
	games: GameInsert[],
	dryRun: boolean
): Promise<{ inserted: number; errors: Array<{ bggId: string; title: string; error: string }> }> {
	if (dryRun) {
		return { inserted: games.length, errors: [] };
	}

	// Use upsert to handle duplicates gracefully
	const { data, error } = await supabase
		.from('games')
		.upsert(games, {
			onConflict: 'id',
			ignoreDuplicates: false
		})
		.select('id');

	if (error) {
		// Return all games as failed if batch insert fails
		return {
			inserted: 0,
			errors: games.map((g) => ({
				bggId: g.id,
				title: g.title,
				error: error.message
			}))
		};
	}

	return { inserted: data?.length ?? games.length, errors: [] };
}

/**
 * Main function to populate the games table
 */
export async function populateGamesFromBgg(options: {
	dryRun?: boolean;
	limit?: number;
	batchSize?: number;
	supabase?: SupabaseClient;
}): Promise<PopulateResult> {
	const { dryRun = false, limit, batchSize = DEFAULT_BATCH_SIZE, supabase } = options;

	const supabaseClient = supabase || getSupabaseClient();

	console.log('='.repeat(60));
	console.log('BGG Games Import Script');
	console.log('='.repeat(60));
	if (dryRun) {
		console.log('MODE: Dry run (no changes will be made)');
	}
	console.log(`CSV Path: ${CSV_PATH}`);
	console.log(`Batch Size: ${batchSize}`);
	if (limit) {
		console.log(`Limit: ${limit} games`);
	}
	console.log('='.repeat(60) + '\n');

	// Read CSV file
	console.log('Reading CSV file...');
	let rows = readCsvFile(CSV_PATH);
	console.log(`Found ${rows.length} games in CSV\n`);

	// Apply limit if specified
	if (limit && limit > 0) {
		rows = rows.slice(0, limit);
		console.log(`Processing first ${rows.length} games only\n`);
	}

	// Transform all rows
	console.log('Transforming data...');
	const games: GameInsert[] = [];
	const transformErrors: Array<{ bggId: string; title: string; error: string }> = [];

	for (const row of rows) {
		try {
			const game = transformRow(row);
			games.push(game);
		} catch (err) {
			transformErrors.push({
				bggId: row.BGGId,
				title: row.Name || 'Unknown',
				error: err instanceof Error ? err.message : 'Transform failed'
			});
		}
	}

	console.log(`Transformed ${games.length} games successfully`);
	if (transformErrors.length > 0) {
		console.log(`Failed to transform ${transformErrors.length} games\n`);
	}

	// Insert in batches
	console.log('\nInserting games into database...');
	const result: PopulateResult = {
		total: rows.length,
		inserted: 0,
		skipped: 0,
		failed: transformErrors.length,
		errors: [...transformErrors]
	};

	const totalBatches = Math.ceil(games.length / batchSize);
	for (let i = 0; i < games.length; i += batchSize) {
		const batch = games.slice(i, i + batchSize);
		const batchNum = Math.floor(i / batchSize) + 1;

		process.stdout.write(`\rBatch ${batchNum}/${totalBatches} (${i + batch.length}/${games.length} games)...`);

		const batchResult = await insertBatch(supabaseClient, batch, dryRun);
		result.inserted += batchResult.inserted;
		result.errors.push(...batchResult.errors);
		result.failed += batchResult.errors.length;
	}

	console.log('\n');

	// Print summary
	console.log('='.repeat(60));
	console.log('IMPORT SUMMARY');
	console.log('='.repeat(60));
	console.log(`Total games in CSV:     ${result.total}`);
	console.log(`Successfully inserted:  ${result.inserted}`);
	console.log(`Failed:                 ${result.failed}`);
	console.log('='.repeat(60));

	// Print errors if any
	if (result.errors.length > 0 && result.errors.length <= 20) {
		console.log('\nErrors:');
		for (const err of result.errors) {
			console.log(`  - ${err.title} (BGG ID: ${err.bggId}): ${err.error}`);
		}
	} else if (result.errors.length > 20) {
		console.log(`\nFirst 20 errors (${result.errors.length} total):`);
		for (const err of result.errors.slice(0, 20)) {
			console.log(`  - ${err.title} (BGG ID: ${err.bggId}): ${err.error}`);
		}
	}

	return result;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean; limit?: number; batchSize: number } {
	const args = process.argv.slice(2);
	let dryRun = false;
	let limit: number | undefined;
	let batchSize = DEFAULT_BATCH_SIZE;

	for (const arg of args) {
		if (arg === '--dry-run') {
			dryRun = true;
		} else if (arg.startsWith('--limit=')) {
			limit = Number.parseInt(arg.split('=')[1], 10);
		} else if (arg.startsWith('--batch=')) {
			batchSize = Number.parseInt(arg.split('=')[1], 10);
		}
	}

	return { dryRun, limit, batchSize };
}

// Run the script if executed directly
const isMainModule = process.argv[1]?.endsWith('populate-games-from-bgg.ts');
if (isMainModule) {
	const { dryRun, limit, batchSize } = parseArgs();

	populateGamesFromBgg({ dryRun, limit, batchSize })
		.then((result) => {
			if (result.failed > 0) {
				process.exit(1);
			}
			process.exit(0);
		})
		.catch((error) => {
			console.error('Import failed:', error);
			process.exit(1);
		});
}
