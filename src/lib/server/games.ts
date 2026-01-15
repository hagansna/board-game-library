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
			createdAt: true,
			updatedAt: true
		}
	});
	return game;
}
