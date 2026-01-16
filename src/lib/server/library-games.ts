import type { SupabaseClient } from '@supabase/supabase-js';
import {
	type DbGame,
	type Game,
	type GameInput,
	transformGame,
	createSharedGame,
	getGameById
} from './games.js';

/**
 * Library Games Module
 *
 * This module handles user-specific game library data, separated from shared game metadata.
 * The library_games table stores user-specific fields like play_count, personal_rating, and review.
 *
 * Database Schema (user must create in Supabase):
 * ```sql
 * CREATE TABLE library_games (
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
 * -- RLS Policies
 * ALTER TABLE library_games ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can view their own library entries"
 *   ON library_games FOR SELECT
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can insert their own library entries"
 *   ON library_games FOR INSERT
 *   WITH CHECK (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can update their own library entries"
 *   ON library_games FOR UPDATE
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can delete their own library entries"
 *   ON library_games FOR DELETE
 *   USING (auth.uid() = user_id);
 * ```
 */

// Database library_games type (snake_case from Supabase)
export interface DbLibraryGame {
	id: string;
	user_id: string;
	game_id: string;
	play_count: number | null;
	personal_rating: number | null;
	review: string | null;
	created_at: string;
	updated_at: string;
}

// App library game type (camelCase for frontend)
export interface LibraryGame {
	id: string;
	userId: string;
	gameId: string;
	playCount: number | null;
	personalRating: number | null;
	review: string | null;
	createdAt: string;
	updatedAt: string;
}

// Input type for creating/updating library entries
export interface LibraryGameInput {
	gameId: string;
	playCount?: number | null;
	personalRating?: number | null;
	review?: string | null;
}

/**
 * Combined view interface for UI display
 * Combines shared game metadata with user-specific library data
 * This is what the frontend uses to display games in a user's library
 */
export interface UserGameView {
	// Library entry identifiers
	libraryEntryId: string;
	gameId: string;
	userId: string;

	// Shared game metadata (from games table)
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

	// User-specific data (from library_games table)
	playCount: number | null;
	personalRating: number | null;
	review: string | null;

	// Timestamps
	gameCreatedAt: string;
	gameUpdatedAt: string;
	libraryEntryCreatedAt: string;
	libraryEntryUpdatedAt: string;
}

/**
 * Database row type for JOIN query result
 * This represents the raw result of joining library_games with games
 */
export interface DbUserGameView {
	// Library entry fields (prefixed with library_ in JOIN)
	id: string; // library_games.id
	user_id: string;
	game_id: string;
	play_count: number | null;
	personal_rating: number | null;
	review: string | null;
	created_at: string; // library_games.created_at
	updated_at: string; // library_games.updated_at

	// Game metadata (from embedded games relation)
	games: DbGame;
}

/**
 * Alternative flattened JOIN result for simpler queries
 */
export interface DbUserGameViewFlat {
	// Library entry fields
	library_id: string;
	user_id: string;
	game_id: string;
	play_count: number | null;
	personal_rating: number | null;
	review: string | null;
	library_created_at: string;
	library_updated_at: string;

	// Game metadata fields
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
	game_created_at: string;
	game_updated_at: string;
}

/**
 * Transform snake_case DB record to camelCase for app
 */
export function transformLibraryGame(dbLibraryGame: DbLibraryGame): LibraryGame {
	return {
		id: dbLibraryGame.id,
		userId: dbLibraryGame.user_id,
		gameId: dbLibraryGame.game_id,
		playCount: dbLibraryGame.play_count,
		personalRating: dbLibraryGame.personal_rating,
		review: dbLibraryGame.review,
		createdAt: dbLibraryGame.created_at,
		updatedAt: dbLibraryGame.updated_at
	};
}

/**
 * Transform camelCase input to snake_case for DB
 */
export function transformLibraryGameInput(
	data: LibraryGameInput
): Record<string, unknown> {
	const result: Record<string, unknown> = {
		game_id: data.gameId
	};

	if (data.playCount !== undefined) result.play_count = data.playCount;
	if (data.personalRating !== undefined) result.personal_rating = data.personalRating;
	if (data.review !== undefined) result.review = data.review;

	return result;
}

/**
 * Transform DbUserGameView (JOIN with embedded games relation) to UserGameView
 * Used when querying with Supabase's relation select: library_games.select('*, games(*)')
 */
export function transformUserGameView(dbRow: DbUserGameView): UserGameView {
	const game = transformGame(dbRow.games);
	return {
		// Library entry identifiers
		libraryEntryId: dbRow.id,
		gameId: dbRow.game_id,
		userId: dbRow.user_id,

		// Shared game metadata
		title: game.title,
		year: game.year,
		minPlayers: game.minPlayers,
		maxPlayers: game.maxPlayers,
		playTimeMin: game.playTimeMin,
		playTimeMax: game.playTimeMax,
		boxArtUrl: game.boxArtUrl,
		description: game.description,
		categories: game.categories,
		bggRating: game.bggRating,
		bggRank: game.bggRank,
		suggestedAge: game.suggestedAge,

		// User-specific data
		playCount: dbRow.play_count,
		personalRating: dbRow.personal_rating,
		review: dbRow.review,

		// Timestamps
		gameCreatedAt: game.createdAt,
		gameUpdatedAt: game.updatedAt,
		libraryEntryCreatedAt: dbRow.created_at,
		libraryEntryUpdatedAt: dbRow.updated_at
	};
}

/**
 * Transform DbUserGameViewFlat (flattened JOIN result) to UserGameView
 * Used for manual SQL queries with explicit column aliases
 */
export function transformUserGameViewFlat(dbRow: DbUserGameViewFlat): UserGameView {
	return {
		// Library entry identifiers
		libraryEntryId: dbRow.library_id,
		gameId: dbRow.game_id,
		userId: dbRow.user_id,

		// Shared game metadata
		title: dbRow.title,
		year: dbRow.year,
		minPlayers: dbRow.min_players,
		maxPlayers: dbRow.max_players,
		playTimeMin: dbRow.play_time_min,
		playTimeMax: dbRow.play_time_max,
		boxArtUrl: dbRow.box_art_url,
		description: dbRow.description,
		categories: dbRow.categories,
		bggRating: dbRow.bgg_rating,
		bggRank: dbRow.bgg_rank,
		suggestedAge: dbRow.suggested_age,

		// User-specific data
		playCount: dbRow.play_count,
		personalRating: dbRow.personal_rating,
		review: dbRow.review,

		// Timestamps
		gameCreatedAt: dbRow.game_created_at,
		gameUpdatedAt: dbRow.game_updated_at,
		libraryEntryCreatedAt: dbRow.library_created_at,
		libraryEntryUpdatedAt: dbRow.library_updated_at
	};
}

/**
 * Combine separate Game and LibraryGame objects into UserGameView
 * Useful when you already have both objects loaded separately
 */
export function combineGameAndLibraryEntry(
	game: Game,
	libraryEntry: LibraryGame
): UserGameView {
	return {
		// Library entry identifiers
		libraryEntryId: libraryEntry.id,
		gameId: game.id,
		userId: libraryEntry.userId,

		// Shared game metadata
		title: game.title,
		year: game.year,
		minPlayers: game.minPlayers,
		maxPlayers: game.maxPlayers,
		playTimeMin: game.playTimeMin,
		playTimeMax: game.playTimeMax,
		boxArtUrl: game.boxArtUrl,
		description: game.description,
		categories: game.categories,
		bggRating: game.bggRating,
		bggRank: game.bggRank,
		suggestedAge: game.suggestedAge,

		// User-specific data
		playCount: libraryEntry.playCount,
		personalRating: libraryEntry.personalRating,
		review: libraryEntry.review,

		// Timestamps
		gameCreatedAt: game.createdAt,
		gameUpdatedAt: game.updatedAt,
		libraryEntryCreatedAt: libraryEntry.createdAt,
		libraryEntryUpdatedAt: libraryEntry.updatedAt
	};
}

/**
 * Validate personal rating is within 1-5 range
 */
export function isValidPersonalRating(rating: number | null | undefined): boolean {
	if (rating === null || rating === undefined) return true;
	return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Validate play count is non-negative integer
 */
export function isValidPlayCount(count: number | null | undefined): boolean {
	if (count === null || count === undefined) return true;
	return Number.isInteger(count) && count >= 0;
}

/**
 * Get all library entries for the current user
 * RLS ensures only user's entries are returned
 */
export async function getUserLibraryEntries(
	supabase: SupabaseClient
): Promise<LibraryGame[]> {
	const { data, error } = await supabase
		.from('library_games')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching library entries:', error);
		return [];
	}

	return (data as DbLibraryGame[]).map(transformLibraryGame);
}

/**
 * Get a single library entry by ID
 * RLS ensures user can only access their own entries
 */
export async function getLibraryEntryById(
	supabase: SupabaseClient,
	entryId: string
): Promise<LibraryGame | null> {
	const { data, error } = await supabase
		.from('library_games')
		.select('*')
		.eq('id', entryId)
		.single();

	if (error || !data) {
		return null;
	}

	return transformLibraryGame(data as DbLibraryGame);
}

/**
 * Get a library entry by game ID for the current user
 * RLS ensures user can only access their own entries
 */
export async function getLibraryEntryByGameId(
	supabase: SupabaseClient,
	gameId: string
): Promise<LibraryGame | null> {
	const { data, error } = await supabase
		.from('library_games')
		.select('*')
		.eq('game_id', gameId)
		.single();

	if (error || !data) {
		return null;
	}

	return transformLibraryGame(data as DbLibraryGame);
}

/**
 * Add a game to the user's library
 */
export async function addToLibrary(
	supabase: SupabaseClient,
	userId: string,
	data: LibraryGameInput
): Promise<LibraryGame | null> {
	// Validate input
	if (!isValidPlayCount(data.playCount)) {
		console.error('Invalid play count:', data.playCount);
		return null;
	}
	if (!isValidPersonalRating(data.personalRating)) {
		console.error('Invalid personal rating:', data.personalRating);
		return null;
	}

	const dbData = {
		...transformLibraryGameInput(data),
		user_id: userId
	};

	const { data: entry, error } = await supabase
		.from('library_games')
		.insert(dbData)
		.select()
		.single();

	if (error) {
		console.error('Error adding to library:', error);
		return null;
	}

	return transformLibraryGame(entry as DbLibraryGame);
}

/**
 * Update a library entry
 * RLS ensures user can only update their own entries
 */
export async function updateLibraryEntry(
	supabase: SupabaseClient,
	entryId: string,
	data: Partial<Omit<LibraryGameInput, 'gameId'>>
): Promise<LibraryGame | null> {
	// Validate input
	if (data.playCount !== undefined && !isValidPlayCount(data.playCount)) {
		console.error('Invalid play count:', data.playCount);
		return null;
	}
	if (data.personalRating !== undefined && !isValidPersonalRating(data.personalRating)) {
		console.error('Invalid personal rating:', data.personalRating);
		return null;
	}

	const updateData: Record<string, unknown> = {};
	if (data.playCount !== undefined) updateData.play_count = data.playCount;
	if (data.personalRating !== undefined) updateData.personal_rating = data.personalRating;
	if (data.review !== undefined) updateData.review = data.review;

	const { data: entry, error } = await supabase
		.from('library_games')
		.update(updateData)
		.eq('id', entryId)
		.select()
		.single();

	if (error) {
		console.error('Error updating library entry:', error);
		return null;
	}

	return transformLibraryGame(entry as DbLibraryGame);
}

/**
 * Remove a game from the user's library
 * RLS ensures user can only delete their own entries
 */
export async function removeFromLibrary(
	supabase: SupabaseClient,
	entryId: string
): Promise<boolean> {
	const { error } = await supabase
		.from('library_games')
		.delete()
		.eq('id', entryId);

	if (error) {
		console.error('Error removing from library:', error);
		return false;
	}

	return true;
}

/**
 * Update play count for a library entry (increment or decrement)
 * RLS ensures user can only update their own entries
 */
export async function updateLibraryPlayCount(
	supabase: SupabaseClient,
	entryId: string,
	delta: number
): Promise<{ playCount: number } | null> {
	// First get the current play count
	const { data: entry, error: fetchError } = await supabase
		.from('library_games')
		.select('play_count')
		.eq('id', entryId)
		.single();

	if (fetchError || !entry) {
		console.error('Error fetching library entry for play count update:', fetchError);
		return null;
	}

	const currentCount = entry.play_count ?? 0;
	const newCount = Math.max(0, currentCount + delta); // Ensure count doesn't go below 0

	const { data: updated, error: updateError } = await supabase
		.from('library_games')
		.update({ play_count: newCount })
		.eq('id', entryId)
		.select('play_count')
		.single();

	if (updateError || !updated) {
		console.error('Error updating play count:', updateError);
		return null;
	}

	return { playCount: updated.play_count ?? 0 };
}

/**
 * Check if a game is already in the user's library
 */
export async function isGameInLibrary(
	supabase: SupabaseClient,
	gameId: string
): Promise<boolean> {
	const { data, error } = await supabase
		.from('library_games')
		.select('id')
		.eq('game_id', gameId)
		.single();

	if (error || !data) {
		return false;
	}

	return true;
}

/**
 * Add a game to the catalog and the user's library in one operation
 * This is used when adding a new game that doesn't exist in the catalog yet
 * It creates the shared game record and then adds it to the user's library
 *
 * @param supabase - Supabase client with user session
 * @param userId - The ID of the user adding the game
 * @param gameData - The shared game metadata (title, year, players, etc.)
 * @param libraryData - Optional user-specific data (playCount, personalRating, review)
 * @returns UserGameView with the combined data, or null if failed
 */
export async function addGameToLibrary(
	supabase: SupabaseClient,
	userId: string,
	gameData: GameInput,
	libraryData?: Partial<Omit<LibraryGameInput, 'gameId'>>
): Promise<UserGameView | null> {
	// First, create the game in the shared catalog
	const game = await createSharedGame(supabase, gameData);

	if (!game) {
		console.error('Failed to create game in catalog');
		return null;
	}

	// Then add it to the user's library
	const libraryInput: LibraryGameInput = {
		gameId: game.id,
		playCount: libraryData?.playCount ?? 0,
		personalRating: libraryData?.personalRating ?? null,
		review: libraryData?.review ?? null
	};

	const libraryEntry = await addToLibrary(supabase, userId, libraryInput);

	if (!libraryEntry) {
		console.error('Failed to add game to library');
		// Note: The game was created in the catalog but library entry failed
		// This is acceptable as the game can still be added to the library later
		return null;
	}

	// Combine into UserGameView
	return combineGameAndLibraryEntry(game, libraryEntry);
}

/**
 * Add an existing game from the catalog to the user's library
 * Use this when the game already exists in the shared catalog
 *
 * @param supabase - Supabase client with user session
 * @param userId - The ID of the user adding the game
 * @param gameId - The ID of the game in the shared catalog
 * @param libraryData - Optional user-specific data (playCount, personalRating, review)
 * @returns UserGameView with the combined data, or null if failed
 */
export async function addExistingGameToLibrary(
	supabase: SupabaseClient,
	userId: string,
	gameId: string,
	libraryData?: Partial<Omit<LibraryGameInput, 'gameId'>>
): Promise<UserGameView | null> {
	// First, verify the game exists in the catalog
	const game = await getGameById(supabase, gameId);

	if (!game) {
		console.error('Game not found in catalog:', gameId);
		return null;
	}

	// Check if already in library
	const existing = await getLibraryEntryByGameId(supabase, gameId);
	if (existing) {
		console.error('Game already in library:', gameId);
		return null;
	}

	// Add to the user's library
	const libraryInput: LibraryGameInput = {
		gameId: game.id,
		playCount: libraryData?.playCount ?? 0,
		personalRating: libraryData?.personalRating ?? null,
		review: libraryData?.review ?? null
	};

	const libraryEntry = await addToLibrary(supabase, userId, libraryInput);

	if (!libraryEntry) {
		console.error('Failed to add game to library');
		return null;
	}

	// Combine into UserGameView
	return combineGameAndLibraryEntry(game, libraryEntry);
}

/**
 * Get the user's full library with combined game metadata and user-specific data
 * This performs a JOIN between library_games and games tables
 * RLS ensures only the authenticated user's library entries are returned
 *
 * @param supabase - Supabase client with user session
 * @param sortBy - Sort order for results (default: 'title')
 * @returns Array of UserGameView objects containing both game metadata and library data
 */
export async function getUserLibrary(
	supabase: SupabaseClient,
	sortBy: 'title' | 'recently_added' | 'year' | 'play_count' = 'title'
): Promise<UserGameView[]> {
	// Use Supabase relation query to get library entries with embedded game data
	// The `games(*)` syntax fetches the related game record via the game_id foreign key
	const { data, error } = await supabase
		.from('library_games')
		.select(`
			id,
			user_id,
			game_id,
			play_count,
			personal_rating,
			review,
			created_at,
			updated_at,
			games (
				id,
				title,
				year,
				min_players,
				max_players,
				play_time_min,
				play_time_max,
				box_art_url,
				description,
				categories,
				bgg_rating,
				bgg_rank,
				suggested_age,
				created_at,
				updated_at
			)
		`);

	if (error) {
		console.error('Error fetching user library:', error);
		return [];
	}

	if (!data || data.length === 0) {
		return [];
	}

	// Transform DB records to UserGameView
	// Filter out any entries where the game relation is null (shouldn't happen but be safe)
	const userGameViews: UserGameView[] = [];

	for (const row of data) {
		// Supabase returns the relation as a single object (not array) because it's a many-to-one
		const gameData = row.games as DbGame | null;

		if (!gameData) {
			// Skip entries where the game was deleted but library entry remains
			// This shouldn't happen with CASCADE delete but handle it gracefully
			console.warn(`Library entry ${row.id} has no associated game (game_id: ${row.game_id})`);
			continue;
		}

		const dbUserGameView: DbUserGameView = {
			id: row.id,
			user_id: row.user_id,
			game_id: row.game_id,
			play_count: row.play_count,
			personal_rating: row.personal_rating,
			review: row.review,
			created_at: row.created_at,
			updated_at: row.updated_at,
			games: gameData
		};

		userGameViews.push(transformUserGameView(dbUserGameView));
	}

	// Sort the results based on the requested sort order
	switch (sortBy) {
		case 'title':
			userGameViews.sort((a, b) => a.title.localeCompare(b.title));
			break;
		case 'recently_added':
			userGameViews.sort(
				(a, b) =>
					new Date(b.libraryEntryCreatedAt).getTime() -
					new Date(a.libraryEntryCreatedAt).getTime()
			);
			break;
		case 'year':
			userGameViews.sort((a, b) => {
				// Sort nulls to the end
				if (a.year === null && b.year === null) return 0;
				if (a.year === null) return 1;
				if (b.year === null) return -1;
				return b.year - a.year; // Newest first
			});
			break;
		case 'play_count':
			userGameViews.sort((a, b) => {
				const countA = a.playCount ?? 0;
				const countB = b.playCount ?? 0;
				return countB - countA; // Most played first
			});
			break;
	}

	return userGameViews;
}

/**
 * Get a single library entry with full game details by library entry ID
 * This performs a JOIN to get both library data and game metadata
 * RLS ensures user can only access their own entries
 *
 * @param supabase - Supabase client with user session
 * @param libraryEntryId - The ID of the library_games entry
 * @returns UserGameView with combined data, or null if not found
 */
export async function getLibraryEntryWithGame(
	supabase: SupabaseClient,
	libraryEntryId: string
): Promise<UserGameView | null> {
	const { data, error } = await supabase
		.from('library_games')
		.select(`
			id,
			user_id,
			game_id,
			play_count,
			personal_rating,
			review,
			created_at,
			updated_at,
			games (
				id,
				title,
				year,
				min_players,
				max_players,
				play_time_min,
				play_time_max,
				box_art_url,
				description,
				categories,
				bgg_rating,
				bgg_rank,
				suggested_age,
				created_at,
				updated_at
			)
		`)
		.eq('id', libraryEntryId)
		.single();

	if (error || !data) {
		return null;
	}

	const gameData = data.games as DbGame | null;

	if (!gameData) {
		console.warn(`Library entry ${data.id} has no associated game`);
		return null;
	}

	const dbUserGameView: DbUserGameView = {
		id: data.id,
		user_id: data.user_id,
		game_id: data.game_id,
		play_count: data.play_count,
		personal_rating: data.personal_rating,
		review: data.review,
		created_at: data.created_at,
		updated_at: data.updated_at,
		games: gameData
	};

	return transformUserGameView(dbUserGameView);
}

/**
 * Get a library entry with full game details by game ID for the current user
 * RLS ensures user can only access their own entries
 *
 * @param supabase - Supabase client with user session
 * @param gameId - The ID of the game in the shared catalog
 * @returns UserGameView with combined data, or null if not found
 */
export async function getLibraryEntryWithGameByGameId(
	supabase: SupabaseClient,
	gameId: string
): Promise<UserGameView | null> {
	const { data, error } = await supabase
		.from('library_games')
		.select(`
			id,
			user_id,
			game_id,
			play_count,
			personal_rating,
			review,
			created_at,
			updated_at,
			games (
				id,
				title,
				year,
				min_players,
				max_players,
				play_time_min,
				play_time_max,
				box_art_url,
				description,
				categories,
				bgg_rating,
				bgg_rank,
				suggested_age,
				created_at,
				updated_at
			)
		`)
		.eq('game_id', gameId)
		.single();

	if (error || !data) {
		return null;
	}

	const gameData = data.games as DbGame | null;

	if (!gameData) {
		console.warn(`Library entry ${data.id} has no associated game`);
		return null;
	}

	const dbUserGameView: DbUserGameView = {
		id: data.id,
		user_id: data.user_id,
		game_id: data.game_id,
		play_count: data.play_count,
		personal_rating: data.personal_rating,
		review: data.review,
		created_at: data.created_at,
		updated_at: data.updated_at,
		games: gameData
	};

	return transformUserGameView(dbUserGameView);
}
