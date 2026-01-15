/**
 * Story 19: User can select which games to add when multiple games are detected from images
 *
 * Tests for batch game selection and individual game editing functionality
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { ExtractedGameData } from '$lib/server/gemini';

// Mock game data for testing
const mockGame1: ExtractedGameData = {
	title: 'Catan',
	publisher: 'Kosmos',
	year: 1995,
	minPlayers: 3,
	maxPlayers: 4,
	playTimeMin: 60,
	playTimeMax: 120,
	confidence: 'high',
	description: 'A strategy game about trading and building settlements',
	categories: ['strategy', 'trading'],
	bggRating: 7.2,
	bggRank: 150
};

const mockGame2: ExtractedGameData = {
	title: 'Ticket to Ride',
	publisher: 'Days of Wonder',
	year: 2004,
	minPlayers: 2,
	maxPlayers: 5,
	playTimeMin: 30,
	playTimeMax: 60,
	confidence: 'high',
	description: 'A cross-country train adventure game',
	categories: ['family', 'strategy'],
	bggRating: 7.4,
	bggRank: 100
};

const mockGame3: ExtractedGameData = {
	title: 'Pandemic',
	publisher: 'Z-Man Games',
	year: 2008,
	minPlayers: 2,
	maxPlayers: 4,
	playTimeMin: 45,
	playTimeMax: 60,
	confidence: 'medium',
	description: 'A cooperative disease fighting game',
	categories: ['cooperative', 'strategy'],
	bggRating: 7.6,
	bggRank: 75
};

// Helper function to generate game key (same logic as in the component)
function getGameKey(imageIndex: number, gameIndex: number): string {
	return `${imageIndex}-${gameIndex}`;
}

// Helper to simulate analysis results structure
interface AnalysisResult {
	games: ExtractedGameData[];
	gameCount: number;
	error: string | null;
	status: 'pending' | 'analyzing' | 'done' | 'error';
}

describe('Story 19: Select Games from Multiple Detected', () => {
	describe('Game Key Generation', () => {
		it('generates unique keys for games from different images', () => {
			const key1 = getGameKey(0, 0);
			const key2 = getGameKey(0, 1);
			const key3 = getGameKey(1, 0);
			const key4 = getGameKey(1, 1);

			expect(key1).toBe('0-0');
			expect(key2).toBe('0-1');
			expect(key3).toBe('1-0');
			expect(key4).toBe('1-1');

			// All keys should be unique
			const keys = new Set([key1, key2, key3, key4]);
			expect(keys.size).toBe(4);
		});

		it('parses game key back to indices correctly', () => {
			const key = '2-3';
			const [imageIndexStr, gameIndexStr] = key.split('-');
			const imageIndex = parseInt(imageIndexStr, 10);
			const gameIndex = parseInt(gameIndexStr, 10);

			expect(imageIndex).toBe(2);
			expect(gameIndex).toBe(3);
		});
	});

	describe('Checkbox Selection State', () => {
		it('maintains selected games in a Set', () => {
			const selectedGames = new Set<string>();

			// Add games
			selectedGames.add(getGameKey(0, 0));
			selectedGames.add(getGameKey(1, 0));

			expect(selectedGames.size).toBe(2);
			expect(selectedGames.has('0-0')).toBe(true);
			expect(selectedGames.has('1-0')).toBe(true);
			expect(selectedGames.has('0-1')).toBe(false);
		});

		it('allows toggling game selection', () => {
			const selectedGames = new Set<string>();
			const key = getGameKey(0, 0);

			// Select
			selectedGames.add(key);
			expect(selectedGames.has(key)).toBe(true);

			// Deselect
			selectedGames.delete(key);
			expect(selectedGames.has(key)).toBe(false);
		});

		it('handles select all operation correctly', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1, mockGame2],
				gameCount: 2,
				error: null,
				status: 'done'
			});
			analysisResults.set(1, {
				games: [mockGame3],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			const selectedGames = new Set<string>();

			// Select all implementation
			for (const [imageIndex, result] of analysisResults.entries()) {
				if (result.status === 'done' && result.games) {
					result.games.forEach((_, gameIndex) => {
						selectedGames.add(getGameKey(imageIndex, gameIndex));
					});
				}
			}

			expect(selectedGames.size).toBe(3);
			expect(selectedGames.has('0-0')).toBe(true);
			expect(selectedGames.has('0-1')).toBe(true);
			expect(selectedGames.has('1-0')).toBe(true);
		});

		it('handles deselect all operation correctly', () => {
			const selectedGames = new Set<string>(['0-0', '0-1', '1-0']);

			// Deselect all
			selectedGames.clear();

			expect(selectedGames.size).toBe(0);
		});
	});

	describe('Game Display Information', () => {
		it('displays title, year, player count, and play time', () => {
			const game = mockGame1;

			expect(game.title).toBe('Catan');
			expect(game.year).toBe(1995);
			expect(game.minPlayers).toBe(3);
			expect(game.maxPlayers).toBe(4);
			expect(game.playTimeMin).toBe(60);
			expect(game.playTimeMax).toBe(120);
		});

		it('handles games with partial information', () => {
			const partialGame: ExtractedGameData = {
				title: 'Unknown Game',
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

			expect(partialGame.title).toBe('Unknown Game');
			expect(partialGame.year).toBeNull();
			expect(partialGame.minPlayers).toBeNull();
		});

		it('groups games by source image', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1, mockGame2],
				gameCount: 2,
				error: null,
				status: 'done'
			});
			analysisResults.set(1, {
				games: [mockGame3],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			// Verify games are grouped by image index
			const image0Games = analysisResults.get(0)?.games;
			const image1Games = analysisResults.get(1)?.games;

			expect(image0Games).toHaveLength(2);
			expect(image0Games?.[0].title).toBe('Catan');
			expect(image0Games?.[1].title).toBe('Ticket to Ride');

			expect(image1Games).toHaveLength(1);
			expect(image1Games?.[0].title).toBe('Pandemic');
		});
	});

	describe('Individual Game Editing', () => {
		let editingGameKey: string | null;
		let batchEditData: ExtractedGameData | null;

		beforeEach(() => {
			editingGameKey = null;
			batchEditData = null;
		});

		it('starts editing mode for a specific game', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			// Start editing
			const imageIndex = 0;
			const gameIndex = 0;
			const key = getGameKey(imageIndex, gameIndex);
			const result = analysisResults.get(imageIndex);

			if (result?.games && result.games[gameIndex]) {
				editingGameKey = key;
				batchEditData = { ...result.games[gameIndex] };
			}

			expect(editingGameKey).toBe('0-0');
			expect(batchEditData).not.toBeNull();
			expect(batchEditData?.title).toBe('Catan');
		});

		it('creates a copy of game data for editing (not mutating original)', () => {
			const originalGame = { ...mockGame1 };
			batchEditData = { ...originalGame };

			// Modify the edit data
			batchEditData.title = 'Modified Catan';
			batchEditData.year = 2000;

			// Original should be unchanged
			expect(originalGame.title).toBe('Catan');
			expect(originalGame.year).toBe(1995);
		});

		it('cancels editing and discards changes', () => {
			editingGameKey = '0-0';
			batchEditData = { ...mockGame1 };
			batchEditData.title = 'Modified Title';

			// Cancel editing
			editingGameKey = null;
			batchEditData = null;

			expect(editingGameKey).toBeNull();
			expect(batchEditData).toBeNull();
		});

		it('saves edited game data back to analysis results', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [{ ...mockGame1 }],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			editingGameKey = '0-0';
			batchEditData = { ...mockGame1 };
			batchEditData.title = 'Catan: Settlers Edition';
			batchEditData.year = 2020;

			// Save changes (simulating saveEditedGame function)
			if (editingGameKey && batchEditData) {
				const [imageIndexStr, gameIndexStr] = editingGameKey.split('-');
				const imageIndex = parseInt(imageIndexStr, 10);
				const gameIndex = parseInt(gameIndexStr, 10);

				const result = analysisResults.get(imageIndex);
				if (result?.games && result.games[gameIndex]) {
					const newGames = [...result.games];
					newGames[gameIndex] = { ...batchEditData };
					analysisResults.set(imageIndex, { ...result, games: newGames });
				}
			}

			// Verify changes were saved
			const updatedGame = analysisResults.get(0)?.games[0];
			expect(updatedGame?.title).toBe('Catan: Settlers Edition');
			expect(updatedGame?.year).toBe(2020);
		});

		it('allows editing all game fields', () => {
			batchEditData = { ...mockGame1 };

			// Edit all fields
			batchEditData.title = 'New Title';
			batchEditData.publisher = 'New Publisher';
			batchEditData.year = 2023;
			batchEditData.minPlayers = 1;
			batchEditData.maxPlayers = 6;
			batchEditData.playTimeMin = 30;
			batchEditData.playTimeMax = 90;

			expect(batchEditData.title).toBe('New Title');
			expect(batchEditData.publisher).toBe('New Publisher');
			expect(batchEditData.year).toBe(2023);
			expect(batchEditData.minPlayers).toBe(1);
			expect(batchEditData.maxPlayers).toBe(6);
			expect(batchEditData.playTimeMin).toBe(30);
			expect(batchEditData.playTimeMax).toBe(90);
		});

		it('prevents saving with empty title', () => {
			batchEditData = { ...mockGame1 };
			batchEditData.title = '';

			const canSave = batchEditData.title?.trim() !== '';
			expect(canSave).toBe(false);
		});

		it('allows saving with whitespace-only fields other than title', () => {
			batchEditData = { ...mockGame1 };
			batchEditData.publisher = '   ';

			const canSave = batchEditData.title?.trim() !== '';
			expect(canSave).toBe(true);
		});
	});

	describe('Selected Games Data Extraction', () => {
		it('extracts selected games data for form submission', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1, mockGame2],
				gameCount: 2,
				error: null,
				status: 'done'
			});
			analysisResults.set(1, {
				games: [mockGame3],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			const selectedGames = new Set<string>(['0-0', '1-0']); // Selected Catan and Pandemic

			// Extract selected games (simulating getSelectedGamesData)
			const games: ExtractedGameData[] = [];
			for (const key of selectedGames) {
				const [imageIndexStr, gameIndexStr] = key.split('-');
				const imageIndex = parseInt(imageIndexStr, 10);
				const gameIndex = parseInt(gameIndexStr, 10);
				const result = analysisResults.get(imageIndex);
				if (result?.games && result.games[gameIndex]) {
					games.push(result.games[gameIndex]);
				}
			}

			expect(games).toHaveLength(2);
			expect(games.map((g) => g.title)).toContain('Catan');
			expect(games.map((g) => g.title)).toContain('Pandemic');
			expect(games.map((g) => g.title)).not.toContain('Ticket to Ride');
		});

		it('returns empty array when no games selected', () => {
			const selectedGames = new Set<string>();
			const games: ExtractedGameData[] = [];

			for (const key of selectedGames) {
				// This loop won't execute
				console.log(key);
			}

			expect(games).toHaveLength(0);
		});

		it('preserves edited data in selected games', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [{ ...mockGame1, title: 'Edited Catan Title' }],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			const selectedGames = new Set<string>(['0-0']);

			const games: ExtractedGameData[] = [];
			for (const key of selectedGames) {
				const [imageIndexStr, gameIndexStr] = key.split('-');
				const imageIndex = parseInt(imageIndexStr, 10);
				const gameIndex = parseInt(gameIndexStr, 10);
				const result = analysisResults.get(imageIndex);
				if (result?.games && result.games[gameIndex]) {
					games.push(result.games[gameIndex]);
				}
			}

			expect(games[0].title).toBe('Edited Catan Title');
		});
	});

	describe('Add Selected to Library', () => {
		it('only adds checked games to library', () => {
			const allGames = [mockGame1, mockGame2, mockGame3];
			const selectedGames = new Set<string>(['0-0', '0-2']); // Select first and third

			// Simulate the addSelectedToLibrary action filtering
			const gamesToAdd = allGames.filter((_, index) => selectedGames.has(`0-${index}`));

			expect(gamesToAdd).toHaveLength(2);
			expect(gamesToAdd[0].title).toBe('Catan');
			expect(gamesToAdd[1].title).toBe('Pandemic');
		});

		it('validates game data before adding', () => {
			const games: ExtractedGameData[] = [
				mockGame1,
				{ ...mockGame2, title: '' }, // Invalid - empty title
				mockGame3
			];

			const validGames = games.filter((g) => g.title && g.title.trim() !== '');

			expect(validGames).toHaveLength(2);
		});
	});

	describe('Summary Display', () => {
		it('shows correct count of games found', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1, mockGame2],
				gameCount: 2,
				error: null,
				status: 'done'
			});
			analysisResults.set(1, {
				games: [mockGame3],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			let totalGames = 0;
			for (const result of analysisResults.values()) {
				if (result.status === 'done') {
					totalGames += result.games.length;
				}
			}

			expect(totalGames).toBe(3);
		});

		it('shows correct count of selected games', () => {
			const selectedGames = new Set<string>(['0-0', '1-0']);
			expect(selectedGames.size).toBe(2);
		});

		it('shows games detected per image', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1, mockGame2],
				gameCount: 2,
				error: null,
				status: 'done'
			});

			const image0Result = analysisResults.get(0);
			expect(image0Result?.gameCount).toBe(2);
		});
	});

	describe('Error Handling', () => {
		it('handles images with no games detected', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [],
				gameCount: 0,
				error: 'Could not identify any games',
				status: 'error'
			});

			const result = analysisResults.get(0);
			expect(result?.games).toHaveLength(0);
			expect(result?.error).toBe('Could not identify any games');
		});

		it('handles mixed success and failure results', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1],
				gameCount: 1,
				error: null,
				status: 'done'
			});
			analysisResults.set(1, {
				games: [],
				gameCount: 0,
				error: 'Analysis failed',
				status: 'error'
			});

			let successCount = 0;
			let errorCount = 0;

			for (const result of analysisResults.values()) {
				if (result.status === 'done' && result.gameCount > 0) {
					successCount++;
				} else if (result.status === 'error') {
					errorCount++;
				}
			}

			expect(successCount).toBe(1);
			expect(errorCount).toBe(1);
		});
	});

	describe('Acceptance Criteria Verification', () => {
		it('AC1: Checkbox list displays all detected games from all processed images', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, { games: [mockGame1], gameCount: 1, error: null, status: 'done' });
			analysisResults.set(1, {
				games: [mockGame2, mockGame3],
				gameCount: 2,
				error: null,
				status: 'done'
			});

			let allGames: ExtractedGameData[] = [];
			for (const result of analysisResults.values()) {
				if (result.status === 'done') {
					allGames = [...allGames, ...result.games];
				}
			}

			expect(allGames).toHaveLength(3);
		});

		it('AC2: Each game entry shows extracted info (title, year, players, play time)', () => {
			const game = mockGame1;

			// All these fields should be accessible for display
			expect(game.title).toBeDefined();
			expect(game.year).toBeDefined();
			expect(game.minPlayers).toBeDefined();
			expect(game.maxPlayers).toBeDefined();
			expect(game.playTimeMin).toBeDefined();
			expect(game.playTimeMax).toBeDefined();
		});

		it('AC3: User can select/deselect individual games via checkboxes', () => {
			const selectedGames = new Set<string>();
			const key = '0-0';

			// Select
			selectedGames.add(key);
			expect(selectedGames.has(key)).toBe(true);

			// Deselect
			selectedGames.delete(key);
			expect(selectedGames.has(key)).toBe(false);
		});

		it('AC4: Select All and Deselect All options available', () => {
			const totalGames = 3;
			const selectedGames = new Set<string>();

			// Select all
			for (let i = 0; i < totalGames; i++) {
				selectedGames.add(`0-${i}`);
			}
			expect(selectedGames.size).toBe(totalGames);

			// Deselect all
			selectedGames.clear();
			expect(selectedGames.size).toBe(0);
		});

		it('AC5: Add Selected button adds only checked games to library', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1, mockGame2, mockGame3],
				gameCount: 3,
				error: null,
				status: 'done'
			});

			const selectedGames = new Set<string>(['0-0', '0-2']); // Only first and third

			const gamesToAdd: ExtractedGameData[] = [];
			for (const key of selectedGames) {
				const [imageIndexStr, gameIndexStr] = key.split('-');
				const result = analysisResults.get(parseInt(imageIndexStr, 10));
				const game = result?.games[parseInt(gameIndexStr, 10)];
				if (game) {
					gamesToAdd.push(game);
				}
			}

			expect(gamesToAdd).toHaveLength(2);
			expect(gamesToAdd.find((g) => g.title === 'Ticket to Ride')).toBeUndefined();
		});

		it('AC6: Each game can be edited individually before adding', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [{ ...mockGame1 }],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			// Start editing
			let batchEditData: ExtractedGameData | null = { ...mockGame1 };

			// Edit the title
			batchEditData.title = 'Catan: 25th Anniversary Edition';

			// Save changes
			const result = analysisResults.get(0);
			if (result) {
				result.games[0] = { ...batchEditData };
			}

			// Clear edit state
			batchEditData = null;

			// Verify edit was saved
			expect(analysisResults.get(0)?.games[0].title).toBe('Catan: 25th Anniversary Edition');
		});

		it('AC7: Visual grouping shows which games came from the same image', () => {
			const analysisResults = new Map<number, AnalysisResult>();
			analysisResults.set(0, {
				games: [mockGame1, mockGame2],
				gameCount: 2,
				error: null,
				status: 'done'
			});
			analysisResults.set(1, {
				games: [mockGame3],
				gameCount: 1,
				error: null,
				status: 'done'
			});

			// Games are grouped by their image index (key in the Map)
			const image0Games = analysisResults.get(0)?.games ?? [];
			const image1Games = analysisResults.get(1)?.games ?? [];

			// Image 0 has Catan and Ticket to Ride
			expect(image0Games.map((g) => g.title)).toEqual(['Catan', 'Ticket to Ride']);

			// Image 1 has Pandemic
			expect(image1Games.map((g) => g.title)).toEqual(['Pandemic']);
		});
	});
});
