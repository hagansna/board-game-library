import { describe, it, expect } from 'vitest';

// Test the search filtering logic that's used in the games page
// This mirrors the client-side filtering in src/routes/games/+page.svelte

interface Game {
	id: string;
	title: string;
	year?: number | null;
	minPlayers?: number | null;
	maxPlayers?: number | null;
	playTimeMin?: number | null;
	playTimeMax?: number | null;
	boxArtUrl?: string | null;
}

// Replicate the filter logic from the games page
function filterGamesByTitle(games: Game[], searchQuery: string): Game[] {
	if (searchQuery.trim() === '') {
		return games;
	}
	return games.filter((game) =>
		game.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
	);
}

describe('Library Search - Search by Title (Story 22)', () => {
	const testGames: Game[] = [
		{ id: '1', title: 'Catan', year: 1995 },
		{ id: '2', title: 'Ticket to Ride', year: 2004 },
		{ id: '3', title: 'Pandemic', year: 2008 },
		{ id: '4', title: 'Carcassonne', year: 2000 },
		{ id: '5', title: 'Azul', year: 2017 },
		{ id: '6', title: 'Wingspan', year: 2019 },
		{ id: '7', title: 'Cat in the Hat', year: 2003 },
		{ id: '8', title: 'The Castles of Burgundy', year: 2011 }
	];

	describe('Basic Search Functionality', () => {
		it('should return all games when search query is empty', () => {
			const result = filterGamesByTitle(testGames, '');
			expect(result).toHaveLength(testGames.length);
			expect(result).toEqual(testGames);
		});

		it('should return all games when search query is only whitespace', () => {
			const result = filterGamesByTitle(testGames, '   ');
			expect(result).toHaveLength(testGames.length);
			expect(result).toEqual(testGames);
		});

		it('should filter games by exact title match', () => {
			const result = filterGamesByTitle(testGames, 'Catan');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should filter games by partial title match', () => {
			const result = filterGamesByTitle(testGames, 'cat');
			expect(result).toHaveLength(2);
			// Should match: Catan, Cat in the Hat
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Catan');
			expect(titles).toContain('Cat in the Hat');
		});
	});

	describe('Case Insensitivity', () => {
		it('should be case-insensitive (lowercase search)', () => {
			const result = filterGamesByTitle(testGames, 'catan');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should be case-insensitive (uppercase search)', () => {
			const result = filterGamesByTitle(testGames, 'CATAN');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should be case-insensitive (mixed case search)', () => {
			const result = filterGamesByTitle(testGames, 'CaTaN');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should match case-insensitive partial strings', () => {
			const result = filterGamesByTitle(testGames, 'PAN');
			expect(result).toHaveLength(2);
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Pandemic');
			expect(titles).toContain('Wingspan');
		});
	});

	describe('Partial Matches', () => {
		it('should match at the beginning of title', () => {
			const result = filterGamesByTitle(testGames, 'Tick');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Ticket to Ride');
		});

		it('should match in the middle of title', () => {
			const result = filterGamesByTitle(testGames, 'to');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Ticket to Ride');
		});

		it('should match at the end of title', () => {
			const result = filterGamesByTitle(testGames, 'Ride');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Ticket to Ride');
		});

		it('should match multiple words', () => {
			const result = filterGamesByTitle(testGames, 'to Ride');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Ticket to Ride');
		});

		it('should match single character', () => {
			const result = filterGamesByTitle(testGames, 'z');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Azul');
		});
	});

	describe('No Results', () => {
		it('should return empty array when no games match', () => {
			const result = filterGamesByTitle(testGames, 'nonexistent');
			expect(result).toHaveLength(0);
		});

		it('should return empty array for search term not in any title', () => {
			const result = filterGamesByTitle(testGames, 'xyz123');
			expect(result).toHaveLength(0);
		});
	});

	describe('Whitespace Handling', () => {
		it('should trim leading whitespace from search query', () => {
			const result = filterGamesByTitle(testGames, '   Catan');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should trim trailing whitespace from search query', () => {
			const result = filterGamesByTitle(testGames, 'Catan   ');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should trim both leading and trailing whitespace', () => {
			const result = filterGamesByTitle(testGames, '   Catan   ');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should preserve internal whitespace in search', () => {
			const result = filterGamesByTitle(testGames, 'Ticket to');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Ticket to Ride');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty games array', () => {
			const result = filterGamesByTitle([], 'Catan');
			expect(result).toHaveLength(0);
		});

		it('should handle single game array', () => {
			const singleGame: Game[] = [{ id: '1', title: 'Solo Game' }];
			const result = filterGamesByTitle(singleGame, 'Solo');
			expect(result).toHaveLength(1);
		});

		it('should handle games with special characters in title', () => {
			const specialGames: Game[] = [
				{ id: '1', title: 'Ticket to Ride: Europe' },
				{ id: '2', title: 'Betrayal at House on the Hill (2nd Edition)' },
				{ id: '3', title: '7 Wonders' }
			];

			const colonResult = filterGamesByTitle(specialGames, ':');
			expect(colonResult).toHaveLength(1);
			expect(colonResult[0].title).toBe('Ticket to Ride: Europe');

			const parenResult = filterGamesByTitle(specialGames, '(2nd');
			expect(parenResult).toHaveLength(1);

			const numberResult = filterGamesByTitle(specialGames, '7');
			expect(numberResult).toHaveLength(1);
			expect(numberResult[0].title).toBe('7 Wonders');
		});

		it('should handle games with unicode characters', () => {
			const unicodeGames: Game[] = [
				{ id: '1', title: 'Café International' },
				{ id: '2', title: 'Hanabi' }
			];

			const result = filterGamesByTitle(unicodeGames, 'Café');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Café International');
		});
	});

	describe('Multiple Results', () => {
		it('should return multiple matching games', () => {
			const result = filterGamesByTitle(testGames, 'a');
			// Games containing 'a': Catan, Pandemic, Carcassonne, Azul, Wingspan, Cat in the Hat, The Castles of Burgundy
			expect(result.length).toBeGreaterThan(1);
		});

		it('should maintain original order of matching games', () => {
			const result = filterGamesByTitle(testGames, 'c');
			// Should match: Catan, Carcassonne, Cat in the Hat, The Castles of Burgundy, Ticket to Ride
			// Order should be preserved from original array
			const matchingIndices = result.map((r) => testGames.findIndex((g) => g.id === r.id));
			for (let i = 1; i < matchingIndices.length; i++) {
				expect(matchingIndices[i]).toBeGreaterThan(matchingIndices[i - 1]);
			}
		});
	});

	describe('Clear Search Behavior', () => {
		it('should show all games after clearing search (empty string)', () => {
			// First filter
			let result = filterGamesByTitle(testGames, 'Catan');
			expect(result).toHaveLength(1);

			// Clear search
			result = filterGamesByTitle(testGames, '');
			expect(result).toHaveLength(testGames.length);
		});
	});
});
