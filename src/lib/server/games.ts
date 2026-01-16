import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Games Catalog Module
 *
 * This module handles shared game metadata that is common to all users.
 * User-specific data (play_count, personal_rating, review) is stored in library_games table.
 *
 * The games table contains only shared metadata and is readable by all authenticated users.
 * INSERT/UPDATE/DELETE operations are restricted to admin or service role.
 *
 * Database Schema (user must update in Supabase):
 * ```sql
 * -- Remove user-specific columns from games table if they exist
 * -- Note: Migrate data to library_games first before running this!
 * ALTER TABLE games DROP COLUMN IF EXISTS user_id;
 * ALTER TABLE games DROP COLUMN IF EXISTS play_count;
 * ALTER TABLE games DROP COLUMN IF EXISTS personal_rating;
 * ALTER TABLE games DROP COLUMN IF EXISTS review;
 *
 * -- Update RLS policies for shared game catalog
 * DROP POLICY IF EXISTS "Users can view own games" ON games;
 * DROP POLICY IF EXISTS "Users can insert own games" ON games;
 * DROP POLICY IF EXISTS "Users can update own games" ON games;
 * DROP POLICY IF EXISTS "Users can delete own games" ON games;
 *
 * -- Allow all authenticated users to read games
 * CREATE POLICY "Authenticated users can view all games"
 *   ON games FOR SELECT
 *   TO authenticated
 *   USING (true);
 *
 * -- Restrict write operations to service role (admin)
 * CREATE POLICY "Service role can insert games"
 *   ON games FOR INSERT
 *   TO service_role
 *   WITH CHECK (true);
 *
 * CREATE POLICY "Service role can update games"
 *   ON games FOR UPDATE
 *   TO service_role
 *   USING (true);
 *
 * CREATE POLICY "Service role can delete games"
 *   ON games FOR DELETE
 *   TO service_role
 *   USING (true);
 * ```
 */

// Database game type (snake_case from Supabase)
// Contains only shared game metadata - no user-specific fields
export interface DbGame {
	id: string;
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
	created_at: string;
	updated_at: string;
}

// App game type (camelCase for frontend)
// Contains only shared game metadata - no user-specific fields
export interface Game {
	id: string;
	title: string;
	year: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playTimeMin: number | null;
	playTimeMax: number | null;
	boxArtUrl: string | null;
	description: string | null;
	categories: string[] | null;
	bggRating: number | null;
	bggRank: number | null;
	suggestedAge: number | null;
	createdAt: string;
	updatedAt: string;
}

// Input type for creating/updating games (shared metadata only)
// User-specific fields are handled by LibraryGameInput in library-games.ts
export interface GameInput {
	title: string;
	year?: number | null;
	minPlayers?: number | null;
	maxPlayers?: number | null;
	playTimeMin?: number | null;
	playTimeMax?: number | null;
	boxArtUrl?: string | null;
	description?: string | null;
	categories?: string | null; // JSON string from form
	bggRating?: number | null;
	bggRank?: number | null;
	suggestedAge?: number | null;
}

// Transform snake_case DB record to camelCase for app
// Only maps shared game metadata fields
export function transformGame(game: DbGame): Game {
	return {
		id: game.id,
		title: game.title,
		year: game.year,
		minPlayers: game.min_players,
		maxPlayers: game.max_players,
		playTimeMin: game.play_time_min,
		playTimeMax: game.play_time_max,
		boxArtUrl: game.box_art_url,
		description: game.description,
		categories: game.categories,
		bggRating: game.bgg_rating,
		bggRank: game.bgg_rank,
		suggestedAge: game.suggested_age,
		createdAt: game.created_at,
		updatedAt: game.updated_at
	};
}

// Transform camelCase input to snake_case for DB
// Only maps shared game metadata fields (no user-specific fields)
export function transformInput(data: GameInput): Record<string, unknown> {
	const result: Record<string, unknown> = {
		title: data.title
	};

	if (data.year !== undefined) result.year = data.year;
	if (data.minPlayers !== undefined) result.min_players = data.minPlayers;
	if (data.maxPlayers !== undefined) result.max_players = data.maxPlayers;
	if (data.playTimeMin !== undefined) result.play_time_min = data.playTimeMin;
	if (data.playTimeMax !== undefined) result.play_time_max = data.playTimeMax;
	if (data.boxArtUrl !== undefined) result.box_art_url = data.boxArtUrl;
	if (data.description !== undefined) result.description = data.description;
	if (data.bggRating !== undefined) result.bgg_rating = data.bggRating;
	if (data.bggRank !== undefined) result.bgg_rank = data.bggRank;
	if (data.suggestedAge !== undefined) result.suggested_age = data.suggestedAge;

	// Parse categories JSON string to array for JSONB column
	if (data.categories !== undefined) {
		if (data.categories && data.categories.trim()) {
			try {
				result.categories = JSON.parse(data.categories);
			} catch {
				result.categories = null;
			}
		} else {
			result.categories = null;
		}
	}

	return result;
}

/**
 * Get all games from the shared catalog, sorted alphabetically by title
 * All authenticated users can read from the shared catalog
 */
export async function getAllGames(supabase: SupabaseClient): Promise<Game[]> {
	const { data, error } = await supabase
		.from('games')
		.select('*')
		.order('title', { ascending: true });

	if (error) {
		console.error('Error fetching games:', error);
		return [];
	}

	return (data as DbGame[]).map(transformGame);
}

/**
 * Search games by title (case-insensitive partial match)
 * All authenticated users can search the shared catalog
 */
export async function searchGames(
	supabase: SupabaseClient,
	query: string
): Promise<Game[]> {
	const { data, error } = await supabase
		.from('games')
		.select('*')
		.ilike('title', `%${query}%`)
		.order('title', { ascending: true })
		.limit(50);

	if (error) {
		console.error('Error searching games:', error);
		return [];
	}

	return (data as DbGame[]).map(transformGame);
}

/**
 * Get a single game by ID from the shared catalog
 * All authenticated users can access any game in the catalog
 */
export async function getGameById(supabase: SupabaseClient, gameId: string): Promise<Game | null> {
	const { data, error } = await supabase.from('games').select('*').eq('id', gameId).single();

	if (error || !data) {
		return null;
	}

	return transformGame(data as DbGame);
}

/**
 * Create a new game in the shared catalog
 * Requires service role or admin privileges
 * No user_id - games are shared across all users
 */
export async function createSharedGame(
	supabase: SupabaseClient,
	data: GameInput
): Promise<Game | null> {
	const dbData = transformInput(data);

	const { data: game, error } = await supabase.from('games').insert(dbData).select().single();

	if (error) {
		console.error('Error creating game:', error);
		return null;
	}

	return transformGame(game as DbGame);
}

/**
 * Update an existing game in the shared catalog
 * Requires service role or admin privileges
 */
export async function updateSharedGame(
	supabase: SupabaseClient,
	gameId: string,
	data: GameInput
): Promise<Game | null> {
	const dbData = transformInput(data);

	const { data: game, error } = await supabase
		.from('games')
		.update(dbData)
		.eq('id', gameId)
		.select()
		.single();

	if (error) {
		console.error('Error updating game:', error);
		return null;
	}

	return transformGame(game as DbGame);
}

/**
 * Delete a game from the shared catalog
 * Requires service role or admin privileges
 * WARNING: This will cascade delete all library_games entries referencing this game
 */
export async function deleteSharedGame(supabase: SupabaseClient, gameId: string): Promise<boolean> {
	const { error } = await supabase.from('games').delete().eq('id', gameId);

	if (error) {
		console.error('Error deleting game:', error);
		return false;
	}

	return true;
}

// ============================================================================
// LEGACY FUNCTIONS - For backward compatibility during migration
// These will be removed once the schema split migration is complete
// ============================================================================

/**
 * @deprecated Use getAllGames() instead. This alias exists for backward compatibility.
 */
export async function getUserGames(supabase: SupabaseClient): Promise<Game[]> {
	return getAllGames(supabase);
}

/**
 * @deprecated Use createSharedGame() instead. This function signature is kept for backward compatibility.
 * The userId parameter is ignored - games are now shared.
 */
export async function createGame(
	supabase: SupabaseClient,
	_userId: string,
	data: GameInput
): Promise<Game | null> {
	return createSharedGame(supabase, data);
}

/**
 * @deprecated Use updateSharedGame() instead. This alias exists for backward compatibility.
 */
export async function updateGame(
	supabase: SupabaseClient,
	gameId: string,
	data: GameInput
): Promise<Game | null> {
	return updateSharedGame(supabase, gameId, data);
}

/**
 * @deprecated Use deleteSharedGame() instead. This alias exists for backward compatibility.
 */
export async function deleteGame(supabase: SupabaseClient, gameId: string): Promise<boolean> {
	return deleteSharedGame(supabase, gameId);
}

/**
 * @deprecated Play count is now stored in library_games table.
 * Use updateLibraryPlayCount from library-games.ts instead.
 * This function is kept temporarily for backward compatibility but does nothing.
 */
export async function updatePlayCount(
	_supabase: SupabaseClient,
	_gameId: string,
	_delta: number
): Promise<{ playCount: number } | null> {
	console.warn(
		'updatePlayCount is deprecated. Play count is now stored in library_games table. ' +
			'Use updateLibraryPlayCount from library-games.ts instead.'
	);
	return null;
}
