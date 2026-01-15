import type { SupabaseClient } from '@supabase/supabase-js';

// Database game type (snake_case from Supabase)
interface DbGame {
	id: string;
	user_id: string;
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

// Input type for creating/updating games
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
function transformGame(game: DbGame): Game {
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
function transformInput(data: GameInput): Record<string, unknown> {
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
 * Get all games for a specific user, sorted alphabetically by title
 * RLS ensures only user's games are returned
 */
export async function getUserGames(supabase: SupabaseClient): Promise<Game[]> {
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
 * Get a single game by ID
 * RLS ensures user can only access their own games
 */
export async function getGameById(supabase: SupabaseClient, gameId: string): Promise<Game | null> {
	const { data, error } = await supabase.from('games').select('*').eq('id', gameId).single();

	if (error || !data) {
		return null;
	}

	return transformGame(data as DbGame);
}

/**
 * Create a new game for a user
 */
export async function createGame(
	supabase: SupabaseClient,
	userId: string,
	data: GameInput
): Promise<Game | null> {
	const dbData = {
		...transformInput(data),
		user_id: userId
	};

	const { data: game, error } = await supabase.from('games').insert(dbData).select().single();

	if (error) {
		console.error('Error creating game:', error);
		return null;
	}

	return transformGame(game as DbGame);
}

/**
 * Update an existing game
 * RLS ensures user can only update their own games
 */
export async function updateGame(
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
 * Delete a game
 * RLS ensures user can only delete their own games
 */
export async function deleteGame(supabase: SupabaseClient, gameId: string): Promise<boolean> {
	const { error } = await supabase.from('games').delete().eq('id', gameId);

	if (error) {
		console.error('Error deleting game:', error);
		return false;
	}

	return true;
}
