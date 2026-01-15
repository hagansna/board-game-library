import { prisma } from './db';
import type { Game } from '@prisma/client';

export type GameWithoutUser = Omit<Game, 'userId'>;

/**
 * Get all games for a specific user, sorted alphabetically by title
 */
export async function getUserGames(userId: string): Promise<GameWithoutUser[]> {
	const games = await prisma.game.findMany({
		where: { userId },
		orderBy: { title: 'asc' },
		select: {
			id: true,
			title: true,
			year: true,
			minPlayers: true,
			maxPlayers: true,
			playTimeMin: true,
			playTimeMax: true,
			boxArtUrl: true,
			createdAt: true,
			updatedAt: true
		}
	});
	return games;
}

/**
 * Get a single game by ID, ensuring it belongs to the specified user
 */
export async function getGameById(gameId: string, userId: string): Promise<GameWithoutUser | null> {
	const game = await prisma.game.findFirst({
		where: {
			id: gameId,
			userId
		},
		select: {
			id: true,
			title: true,
			year: true,
			minPlayers: true,
			maxPlayers: true,
			playTimeMin: true,
			playTimeMax: true,
			boxArtUrl: true,
			createdAt: true,
			updatedAt: true
		}
	});
	return game;
}

/**
 * Create a new game for a user
 */
export async function createGame(
	userId: string,
	data: {
		title: string;
		year?: number | null;
		minPlayers?: number | null;
		maxPlayers?: number | null;
		playTimeMin?: number | null;
		playTimeMax?: number | null;
		boxArtUrl?: string | null;
	}
): Promise<GameWithoutUser> {
	const game = await prisma.game.create({
		data: {
			...data,
			userId
		},
		select: {
			id: true,
			title: true,
			year: true,
			minPlayers: true,
			maxPlayers: true,
			playTimeMin: true,
			playTimeMax: true,
			boxArtUrl: true,
			createdAt: true,
			updatedAt: true
		}
	});
	return game;
}

/**
 * Update an existing game, ensuring it belongs to the specified user
 * Returns the updated game or null if game doesn't exist or doesn't belong to user
 */
export async function updateGame(
	gameId: string,
	userId: string,
	data: {
		title: string;
		year?: number | null;
		minPlayers?: number | null;
		maxPlayers?: number | null;
		playTimeMin?: number | null;
		playTimeMax?: number | null;
		boxArtUrl?: string | null;
	}
): Promise<GameWithoutUser | null> {
	// First check if game exists and belongs to user
	const existingGame = await prisma.game.findFirst({
		where: {
			id: gameId,
			userId
		}
	});

	if (!existingGame) {
		return null;
	}

	const game = await prisma.game.update({
		where: { id: gameId },
		data,
		select: {
			id: true,
			title: true,
			year: true,
			minPlayers: true,
			maxPlayers: true,
			playTimeMin: true,
			playTimeMax: true,
			boxArtUrl: true,
			createdAt: true,
			updatedAt: true
		}
	});
	return game;
}

/**
 * Delete a game, ensuring it belongs to the specified user
 * Returns true if game was deleted, false if game doesn't exist or doesn't belong to user
 */
export async function deleteGame(gameId: string, userId: string): Promise<boolean> {
	// First check if game exists and belongs to user
	const existingGame = await prisma.game.findFirst({
		where: {
			id: gameId,
			userId
		}
	});

	if (!existingGame) {
		return false;
	}

	await prisma.game.delete({
		where: { id: gameId }
	});

	return true;
}
