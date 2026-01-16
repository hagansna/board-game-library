/**
 * Migration Script: Convert Existing Data to Split Schema
 *
 * This script migrates data from the old single-table schema (games with user_id)
 * to the new split schema (shared games catalog + library_games for user-specific data).
 *
 * Usage:
 *   npx tsx scripts/migrate-to-split-schema.ts
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables (service role bypasses RLS)
 *
 * Features:
 *   - Deduplicates games by title (keeps one shared record with most complete data)
 *   - Creates library_games entries for each user's games
 *   - Preserves user-specific data (play_count, personal_rating, review)
 *   - Progress output during execution
 *   - Graceful error handling (logs failures, continues processing)
 *   - Safe to run multiple times (idempotent)
 *
 * Schema Expectations:
 * - Old schema: games table has user_id, play_count, personal_rating, review columns
 * - New schema: games table has no user-specific columns, library_games table exists
 *
 * IMPORTANT: Before running this script, ensure the library_games table exists:
 * ```sql
 * CREATE TABLE IF NOT EXISTS library_games (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 *   play_count INTEGER DEFAULT 0,
 *   personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 5),
 *   review TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
 *   UNIQUE(user_id, game_id)
 * );
 *
 * ALTER TABLE library_games ENABLE ROW LEVEL SECURITY;
 * ```
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Types

/**
 * Legacy game record from old schema (with user_id and user-specific fields)
 */
export interface LegacyGame {
	id: string;
	user_id: string | null;
	title: string;
	year: number | null;
	min_players: number | null;
	max_players: number | null;
	play_time_min: number | null;
	play_time_max: number | null;
	box_art_url: string | null;
	description: string | null;
	categories: string[] | null;
	bgg_rating: number | null;
	bgg_rank: number | null;
	suggested_age: number | null;
	play_count: number | null;
	personal_rating: number | null;
	review: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Shared game data (without user-specific fields)
 */
export interface SharedGameData {
	title: string;
	year: number | null;
	min_players: number | null;
	max_players: number | null;
	play_time_min: number | null;
	play_time_max: number | null;
	box_art_url: string | null;
	description: string | null;
	categories: string[] | null;
	bgg_rating: number | null;
	bgg_rank: number | null;
	suggested_age: number | null;
}

/**
 * Library entry data (user-specific fields)
 */
export interface LibraryEntryData {
	user_id: string;
	game_id: string;
	play_count: number;
	personal_rating: number | null;
	review: string | null;
}

/**
 * Result of migrating a single legacy game
 */
export interface MigrationResult {
	legacyGameId: string;
	title: string;
	userId: string | null;
	newGameId: string | null;
	libraryEntryId: string | null;
	action: 'created_game' | 'reused_game' | 'created_library_entry' | 'skipped' | 'failed';
	success: boolean;
	error?: string;
}

/**
 * Summary of the migration process
 */
export interface MigrationSummary {
	totalLegacyGames: number;
	uniqueGamesCreated: number;
	libraryEntriesCreated: number;
	skipped: number;
	failed: number;
	results: MigrationResult[];
}

/**
 * Group of legacy games with the same title (for deduplication)
 */
export interface GameGroup {
	title: string;
	normalizedTitle: string;
	games: LegacyGame[];
}

/**
 * Initialize Supabase client with service role key (bypasses RLS)
 */
export function getSupabaseClient(): SupabaseClient {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new Error(
			'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required'
		);
	}

	return createClient(url, key);
}

/**
 * Normalize a game title for comparison (lowercase, trim, remove extra spaces)
 */
export function normalizeTitle(title: string): string {
	return title.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Fetch all legacy games from the old schema
 * This assumes the games table still has user_id, play_count, personal_rating, review columns
 */
export async function fetchLegacyGames(supabase: SupabaseClient): Promise<LegacyGame[]> {
	// First, check if the table has user_id column (legacy schema)
	const { data, error } = await supabase
		.from('games')
		.select('*')
		.order('title', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch legacy games: ${error.message}`);
	}

	return (data || []) as LegacyGame[];
}

/**
 * Check if a library entry already exists for a user and game
 */
export async function libraryEntryExists(
	supabase: SupabaseClient,
	userId: string,
	gameId: string
): Promise<boolean> {
	const { data, error } = await supabase
		.from('library_games')
		.select('id')
		.eq('user_id', userId)
		.eq('game_id', gameId)
		.maybeSingle();

	if (error) {
		console.error(`Error checking library entry: ${error.message}`);
		return false;
	}

	return data !== null;
}

/**
 * Check if a game with the exact title already exists in the shared catalog
 * Returns the existing game ID if found
 */
export async function findExistingSharedGame(
	supabase: SupabaseClient,
	title: string
): Promise<string | null> {
	const normalizedTitle = normalizeTitle(title);

	const { data, error } = await supabase.from('games').select('id, title');

	if (error) {
		console.error(`Error finding shared game: ${error.message}`);
		return null;
	}

	// Find exact match by normalized title
	const match = (data || []).find((g) => normalizeTitle(g.title) === normalizedTitle);
	return match ? match.id : null;
}

/**
 * Group legacy games by normalized title for deduplication
 */
export function groupGamesByTitle(games: LegacyGame[]): GameGroup[] {
	const groups = new Map<string, GameGroup>();

	for (const game of games) {
		const normalized = normalizeTitle(game.title);

		if (!groups.has(normalized)) {
			groups.set(normalized, {
				title: game.title,
				normalizedTitle: normalized,
				games: []
			});
		}

		groups.get(normalized)!.games.push(game);
	}

	return Array.from(groups.values());
}

/**
 * Select the best game from a group for the shared catalog
 * Prioritizes games with most complete metadata
 */
export function selectBestGameForCatalog(games: LegacyGame[]): LegacyGame {
	if (games.length === 1) {
		return games[0];
	}

	// Score each game based on completeness of metadata
	const scored = games.map((game) => {
		let score = 0;
		if (game.year !== null) score += 2;
		if (game.min_players !== null) score += 1;
		if (game.max_players !== null) score += 1;
		if (game.play_time_min !== null) score += 1;
		if (game.play_time_max !== null) score += 1;
		if (game.box_art_url !== null) score += 3;
		if (game.description !== null && game.description.length > 0) score += 3;
		if (game.categories !== null && game.categories.length > 0) score += 2;
		if (game.bgg_rating !== null) score += 2;
		if (game.bgg_rank !== null) score += 2;
		if (game.suggested_age !== null) score += 1;

		return { game, score };
	});

	// Sort by score descending, then by created_at ascending (oldest first for stability)
	scored.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return new Date(a.game.created_at).getTime() - new Date(b.game.created_at).getTime();
	});

	return scored[0].game;
}

/**
 * Extract shared game data from a legacy game (strips user-specific fields)
 */
export function extractSharedGameData(game: LegacyGame): SharedGameData {
	return {
		title: game.title,
		year: game.year,
		min_players: game.min_players,
		max_players: game.max_players,
		play_time_min: game.play_time_min,
		play_time_max: game.play_time_max,
		box_art_url: game.box_art_url,
		description: game.description,
		categories: game.categories,
		bgg_rating: game.bgg_rating,
		bgg_rank: game.bgg_rank,
		suggested_age: game.suggested_age
	};
}

/**
 * Extract library entry data from a legacy game
 */
export function extractLibraryEntryData(game: LegacyGame, newGameId: string): LibraryEntryData | null {
	if (!game.user_id) {
		return null;
	}

	return {
		user_id: game.user_id,
		game_id: newGameId,
		play_count: game.play_count ?? 0,
		personal_rating: game.personal_rating,
		review: game.review
	};
}

/**
 * Create or find a shared game in the catalog
 * Returns the game ID (either existing or newly created)
 */
export async function createOrFindSharedGame(
	supabase: SupabaseClient,
	gameData: SharedGameData,
	titleToGameIdMap: Map<string, string>
): Promise<{ gameId: string; isNew: boolean }> {
	const normalizedTitle = normalizeTitle(gameData.title);

	// Check our local cache first
	const cachedId = titleToGameIdMap.get(normalizedTitle);
	if (cachedId) {
		return { gameId: cachedId, isNew: false };
	}

	// Check if game already exists in database
	const existingId = await findExistingSharedGame(supabase, gameData.title);
	if (existingId) {
		titleToGameIdMap.set(normalizedTitle, existingId);
		return { gameId: existingId, isNew: false };
	}

	// Create new shared game
	const { data: newGame, error } = await supabase
		.from('games')
		.insert(gameData)
		.select('id')
		.single();

	if (error) {
		throw new Error(`Failed to create shared game "${gameData.title}": ${error.message}`);
	}

	const newGameId = newGame.id;
	titleToGameIdMap.set(normalizedTitle, newGameId);

	return { gameId: newGameId, isNew: true };
}

/**
 * Create a library entry for a user
 */
export async function createLibraryEntry(
	supabase: SupabaseClient,
	data: LibraryEntryData
): Promise<string> {
	// Check if entry already exists
	const exists = await libraryEntryExists(supabase, data.user_id, data.game_id);
	if (exists) {
		throw new Error('Library entry already exists');
	}

	const { data: entry, error } = await supabase
		.from('library_games')
		.insert(data)
		.select('id')
		.single();

	if (error) {
		throw new Error(`Failed to create library entry: ${error.message}`);
	}

	return entry.id;
}

/**
 * Check if the database has the old schema (with user_id column on games)
 */
export async function hasLegacySchema(supabase: SupabaseClient): Promise<boolean> {
	// Try to query with user_id column - if it fails, it's the new schema
	const { error } = await supabase.from('games').select('user_id').limit(1);

	// If no error, the column exists (legacy schema)
	return !error;
}

/**
 * Check if library_games table exists
 */
export async function libraryGamesTableExists(supabase: SupabaseClient): Promise<boolean> {
	const { error } = await supabase.from('library_games').select('id').limit(1);

	// If error is about relation not existing, table doesn't exist
	if (error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
		return false;
	}

	// Otherwise, table exists (even if empty)
	return true;
}

/**
 * Main migration function - converts legacy schema data to split schema
 */
export async function migrateToSplitSchema(
	supabase?: SupabaseClient
): Promise<MigrationSummary> {
	// Initialize client if not provided (for testing)
	const supabaseClient = supabase || getSupabaseClient();

	console.log('Starting migration to split schema...\n');

	// Check if library_games table exists
	const libraryTableExists = await libraryGamesTableExists(supabaseClient);
	if (!libraryTableExists) {
		throw new Error(
			'library_games table does not exist. Please create it before running this migration.\n' +
			'See the script documentation for the required SQL.'
		);
	}

	// Check if this is legacy schema
	const isLegacySchema = await hasLegacySchema(supabaseClient);
	if (!isLegacySchema) {
		console.log('Database appears to already be using the new split schema (no user_id column on games).');
		console.log('If you need to run migration anyway, ensure the games table has the legacy columns.');
		return {
			totalLegacyGames: 0,
			uniqueGamesCreated: 0,
			libraryEntriesCreated: 0,
			skipped: 0,
			failed: 0,
			results: []
		};
	}

	// Fetch all legacy games
	const legacyGames = await fetchLegacyGames(supabaseClient);

	if (legacyGames.length === 0) {
		console.log('No games found in the database. Nothing to migrate.');
		return {
			totalLegacyGames: 0,
			uniqueGamesCreated: 0,
			libraryEntriesCreated: 0,
			skipped: 0,
			failed: 0,
			results: []
		};
	}

	console.log(`Found ${legacyGames.length} legacy game records to migrate.\n`);

	// Group games by title for deduplication
	const groups = groupGamesByTitle(legacyGames);
	console.log(`Identified ${groups.length} unique games (by title).\n`);

	const results: MigrationResult[] = [];
	let uniqueGamesCreated = 0;
	let libraryEntriesCreated = 0;
	let skipped = 0;
	let failed = 0;

	// Map to track created shared games (normalized title -> game ID)
	const titleToGameIdMap = new Map<string, string>();

	// Process each group
	for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
		const group = groups[groupIndex];
		const progress = `[${groupIndex + 1}/${groups.length}]`;

		console.log(`${progress} Processing: "${group.title}" (${group.games.length} record(s))`);

		// Select the best game for the shared catalog
		const bestGame = selectBestGameForCatalog(group.games);
		const sharedData = extractSharedGameData(bestGame);

		// Create or find the shared game
		let sharedGameId: string;
		let isNewGame: boolean;

		try {
			const result = await createOrFindSharedGame(supabaseClient, sharedData, titleToGameIdMap);
			sharedGameId = result.gameId;
			isNewGame = result.isNew;

			if (isNewGame) {
				uniqueGamesCreated++;
				console.log(`  ✓ Created shared game (ID: ${sharedGameId.substring(0, 8)}...)`);
			} else {
				console.log(`  → Using existing shared game (ID: ${sharedGameId.substring(0, 8)}...)`);
			}
		} catch (error) {
			console.log(`  ✗ Failed to create/find shared game: ${error instanceof Error ? error.message : 'Unknown error'}`);

			// Mark all games in this group as failed
			for (const game of group.games) {
				failed++;
				results.push({
					legacyGameId: game.id,
					title: game.title,
					userId: game.user_id,
					newGameId: null,
					libraryEntryId: null,
					action: 'failed',
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
			continue;
		}

		// Create library entries for all games in this group
		for (const legacyGame of group.games) {
			const libraryData = extractLibraryEntryData(legacyGame, sharedGameId);

			if (!libraryData) {
				// Game has no user_id - skip library entry creation
				skipped++;
				console.log(`    - Skipped library entry for game without user_id`);
				results.push({
					legacyGameId: legacyGame.id,
					title: legacyGame.title,
					userId: null,
					newGameId: sharedGameId,
					libraryEntryId: null,
					action: 'skipped',
					success: true
				});
				continue;
			}

			try {
				// Check if library entry already exists
				const exists = await libraryEntryExists(supabaseClient, libraryData.user_id, sharedGameId);
				if (exists) {
					skipped++;
					console.log(`    - Skipped: Library entry already exists for user ${libraryData.user_id.substring(0, 8)}...`);
					results.push({
						legacyGameId: legacyGame.id,
						title: legacyGame.title,
						userId: libraryData.user_id,
						newGameId: sharedGameId,
						libraryEntryId: null,
						action: 'skipped',
						success: true
					});
					continue;
				}

				const libraryEntryId = await createLibraryEntry(supabaseClient, libraryData);
				libraryEntriesCreated++;
				console.log(`    ✓ Created library entry for user ${libraryData.user_id.substring(0, 8)}... (plays: ${libraryData.play_count}, rating: ${libraryData.personal_rating ?? 'none'})`);
				results.push({
					legacyGameId: legacyGame.id,
					title: legacyGame.title,
					userId: libraryData.user_id,
					newGameId: sharedGameId,
					libraryEntryId,
					action: 'created_library_entry',
					success: true
				});
			} catch (error) {
				failed++;
				console.log(`    ✗ Failed to create library entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
				results.push({
					legacyGameId: legacyGame.id,
					title: legacyGame.title,
					userId: libraryData.user_id,
					newGameId: sharedGameId,
					libraryEntryId: null,
					action: 'failed',
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}
	}

	// Print summary
	console.log('\n========== Migration Summary ==========');
	console.log(`Total legacy game records: ${legacyGames.length}`);
	console.log(`Unique titles found:       ${groups.length}`);
	console.log(`Shared games created:      ${uniqueGamesCreated}`);
	console.log(`Library entries created:   ${libraryEntriesCreated}`);
	console.log(`Skipped (existing/no user):${skipped}`);
	console.log(`Failed:                    ${failed}`);
	console.log('========================================\n');

	if (failed === 0) {
		console.log('Migration completed successfully!');
		console.log('\nNext steps:');
		console.log('1. Verify the data in library_games table is correct');
		console.log('2. Update RLS policies on games table (remove user-based policies)');
		console.log('3. Remove user_id, play_count, personal_rating, review columns from games table');
		console.log('4. Deploy the new application code');
	} else {
		console.log(`Migration completed with ${failed} errors. Please review the failed records.`);
	}

	return {
		totalLegacyGames: legacyGames.length,
		uniqueGamesCreated,
		libraryEntriesCreated,
		skipped,
		failed,
		results
	};
}

// Run the script if executed directly
const isMainModule = process.argv[1]?.endsWith('migrate-to-split-schema.ts');
if (isMainModule) {
	migrateToSplitSchema()
		.then((summary) => {
			if (summary.failed > 0) {
				process.exit(1);
			}
			process.exit(0);
		})
		.catch((error) => {
			console.error('Migration failed:', error);
			process.exit(1);
		});
}
