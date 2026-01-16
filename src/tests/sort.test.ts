import { describe, it, expect } from 'vitest';

// Types matching the page component
type SortOption =
	| 'title-asc'
	| 'title-desc'
	| 'year-desc'
	| 'year-asc'
	| 'recently-added'
	| 'players'
	| 'playtime';

interface Game {
	id: string;
	title: string;
	year: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playTimeMin: number | null;
	playTimeMax: number | null;
	boxArtUrl: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// Sort function matching the implementation in +page.svelte
function sortGames(games: Game[], currentSort: SortOption): Game[] {
	const sorted = [...games];
	switch (currentSort) {
		case 'title-asc':
			sorted.sort((a, b) => a.title.localeCompare(b.title));
			break;
		case 'title-desc':
			sorted.sort((a, b) => b.title.localeCompare(a.title));
			break;
		case 'year-desc':
			// Newest first, null values go to end
			sorted.sort((a, b) => {
				if (a.year === null && b.year === null) return 0;
				if (a.year === null) return 1;
				if (b.year === null) return -1;
				return b.year - a.year;
			});
			break;
		case 'year-asc':
			// Oldest first, null values go to end
			sorted.sort((a, b) => {
				if (a.year === null && b.year === null) return 0;
				if (a.year === null) return 1;
				if (b.year === null) return -1;
				return a.year - b.year;
			});
			break;
		case 'recently-added':
			// Most recent first
			sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
			break;
		case 'players':
			// By min players (ascending), null values go to end
			sorted.sort((a, b) => {
				if (a.minPlayers === null && b.minPlayers === null) return 0;
				if (a.minPlayers === null) return 1;
				if (b.minPlayers === null) return -1;
				return a.minPlayers - b.minPlayers;
			});
			break;
		case 'playtime':
			// By min play time (ascending), null values go to end
			sorted.sort((a, b) => {
				if (a.playTimeMin === null && b.playTimeMin === null) return 0;
				if (a.playTimeMin === null) return 1;
				if (b.playTimeMin === null) return -1;
				return a.playTimeMin - b.playTimeMin;
			});
			break;
	}
	return sorted;
}

// Filter and sort function matching the implementation
function filterAndSortGames(games: Game[], searchQuery: string, currentSort: SortOption): Game[] {
	const filtered =
		searchQuery.trim() === ''
			? games
			: games.filter((game) => game.title.toLowerCase().includes(searchQuery.toLowerCase().trim()));
	return sortGames(filtered, currentSort);
}

// Helper to create test games
function createGame(overrides: Partial<Game>): Game {
	const now = new Date();
	return {
		id: `game-${Math.random().toString(36).substring(7)}`,
		title: 'Test Game',
		year: null,
		minPlayers: null,
		maxPlayers: null,
		playTimeMin: null,
		playTimeMax: null,
		boxArtUrl: null,
		createdAt: now,
		updatedAt: now,
		...overrides
	};
}

describe('Sort functionality', () => {
	describe('Title A-Z (title-asc)', () => {
		it('sorts games alphabetically by title', () => {
			const games = [
				createGame({ title: 'Catan' }),
				createGame({ title: 'Azul' }),
				createGame({ title: 'Wingspan' })
			];
			const sorted = sortGames(games, 'title-asc');
			expect(sorted.map((g) => g.title)).toEqual(['Azul', 'Catan', 'Wingspan']);
		});

		it('is case-insensitive', () => {
			const games = [
				createGame({ title: 'wingspan' }),
				createGame({ title: 'Azul' }),
				createGame({ title: 'CATAN' })
			];
			const sorted = sortGames(games, 'title-asc');
			expect(sorted.map((g) => g.title)).toEqual(['Azul', 'CATAN', 'wingspan']);
		});

		it('handles single game', () => {
			const games = [createGame({ title: 'Solo' })];
			const sorted = sortGames(games, 'title-asc');
			expect(sorted.map((g) => g.title)).toEqual(['Solo']);
		});

		it('handles empty list', () => {
			const sorted = sortGames([], 'title-asc');
			expect(sorted).toEqual([]);
		});
	});

	describe('Title Z-A (title-desc)', () => {
		it('sorts games reverse alphabetically by title', () => {
			const games = [
				createGame({ title: 'Azul' }),
				createGame({ title: 'Catan' }),
				createGame({ title: 'Wingspan' })
			];
			const sorted = sortGames(games, 'title-desc');
			expect(sorted.map((g) => g.title)).toEqual(['Wingspan', 'Catan', 'Azul']);
		});

		it('handles games with same starting letter', () => {
			const games = [
				createGame({ title: 'Chess' }),
				createGame({ title: 'Catan' }),
				createGame({ title: 'Codenames' })
			];
			const sorted = sortGames(games, 'title-desc');
			expect(sorted.map((g) => g.title)).toEqual(['Codenames', 'Chess', 'Catan']);
		});
	});

	describe('Year (Newest first) (year-desc)', () => {
		it('sorts games by year descending', () => {
			const games = [
				createGame({ title: 'Old', year: 1990 }),
				createGame({ title: 'New', year: 2024 }),
				createGame({ title: 'Mid', year: 2010 })
			];
			const sorted = sortGames(games, 'year-desc');
			expect(sorted.map((g) => g.title)).toEqual(['New', 'Mid', 'Old']);
		});

		it('puts null years at the end', () => {
			const games = [
				createGame({ title: 'Unknown', year: null }),
				createGame({ title: 'New', year: 2024 }),
				createGame({ title: 'Old', year: 1990 })
			];
			const sorted = sortGames(games, 'year-desc');
			expect(sorted.map((g) => g.title)).toEqual(['New', 'Old', 'Unknown']);
		});

		it('handles all null years', () => {
			const games = [
				createGame({ title: 'A', year: null }),
				createGame({ title: 'B', year: null }),
				createGame({ title: 'C', year: null })
			];
			const sorted = sortGames(games, 'year-desc');
			expect(sorted.length).toBe(3);
		});

		it('handles mix of null and same years', () => {
			const games = [
				createGame({ title: 'A', year: null }),
				createGame({ title: 'B', year: 2020 }),
				createGame({ title: 'C', year: 2020 })
			];
			const sorted = sortGames(games, 'year-desc');
			expect(sorted[2].title).toBe('A'); // null at end
			expect(sorted[0].year).toBe(2020);
			expect(sorted[1].year).toBe(2020);
		});
	});

	describe('Year (Oldest first) (year-asc)', () => {
		it('sorts games by year ascending', () => {
			const games = [
				createGame({ title: 'New', year: 2024 }),
				createGame({ title: 'Old', year: 1990 }),
				createGame({ title: 'Mid', year: 2010 })
			];
			const sorted = sortGames(games, 'year-asc');
			expect(sorted.map((g) => g.title)).toEqual(['Old', 'Mid', 'New']);
		});

		it('puts null years at the end', () => {
			const games = [
				createGame({ title: 'Unknown', year: null }),
				createGame({ title: 'Old', year: 1990 }),
				createGame({ title: 'New', year: 2024 })
			];
			const sorted = sortGames(games, 'year-asc');
			expect(sorted.map((g) => g.title)).toEqual(['Old', 'New', 'Unknown']);
		});
	});

	describe('Recently Added (recently-added)', () => {
		it('sorts games by createdAt descending (newest first)', () => {
			const games = [
				createGame({ title: 'First', createdAt: new Date('2024-01-01') }),
				createGame({ title: 'Third', createdAt: new Date('2024-03-01') }),
				createGame({ title: 'Second', createdAt: new Date('2024-02-01') })
			];
			const sorted = sortGames(games, 'recently-added');
			expect(sorted.map((g) => g.title)).toEqual(['Third', 'Second', 'First']);
		});

		it('handles same timestamp games', () => {
			const sameTime = new Date('2024-01-01');
			const games = [
				createGame({ title: 'A', createdAt: sameTime }),
				createGame({ title: 'B', createdAt: sameTime })
			];
			const sorted = sortGames(games, 'recently-added');
			expect(sorted.length).toBe(2);
		});

		it('sorts by millisecond precision', () => {
			const games = [
				createGame({ title: 'Earlier', createdAt: new Date('2024-01-01T10:00:00.000Z') }),
				createGame({ title: 'Later', createdAt: new Date('2024-01-01T10:00:00.001Z') })
			];
			const sorted = sortGames(games, 'recently-added');
			expect(sorted.map((g) => g.title)).toEqual(['Later', 'Earlier']);
		});
	});

	describe('Player Count (players)', () => {
		it('sorts games by minPlayers ascending', () => {
			const games = [
				createGame({ title: 'Party', minPlayers: 5 }),
				createGame({ title: 'Solo', minPlayers: 1 }),
				createGame({ title: 'Duo', minPlayers: 2 })
			];
			const sorted = sortGames(games, 'players');
			expect(sorted.map((g) => g.title)).toEqual(['Solo', 'Duo', 'Party']);
		});

		it('puts null player counts at the end', () => {
			const games = [
				createGame({ title: 'Unknown', minPlayers: null }),
				createGame({ title: 'Solo', minPlayers: 1 }),
				createGame({ title: 'Party', minPlayers: 5 })
			];
			const sorted = sortGames(games, 'players');
			expect(sorted.map((g) => g.title)).toEqual(['Solo', 'Party', 'Unknown']);
		});

		it('handles all null player counts', () => {
			const games = [
				createGame({ title: 'A', minPlayers: null }),
				createGame({ title: 'B', minPlayers: null })
			];
			const sorted = sortGames(games, 'players');
			expect(sorted.length).toBe(2);
		});
	});

	describe('Play Time (playtime)', () => {
		it('sorts games by playTimeMin ascending', () => {
			const games = [
				createGame({ title: 'Long', playTimeMin: 120 }),
				createGame({ title: 'Short', playTimeMin: 15 }),
				createGame({ title: 'Medium', playTimeMin: 45 })
			];
			const sorted = sortGames(games, 'playtime');
			expect(sorted.map((g) => g.title)).toEqual(['Short', 'Medium', 'Long']);
		});

		it('puts null play times at the end', () => {
			const games = [
				createGame({ title: 'Unknown', playTimeMin: null }),
				createGame({ title: 'Short', playTimeMin: 15 }),
				createGame({ title: 'Long', playTimeMin: 120 })
			];
			const sorted = sortGames(games, 'playtime');
			expect(sorted.map((g) => g.title)).toEqual(['Short', 'Long', 'Unknown']);
		});

		it('handles all null play times', () => {
			const games = [
				createGame({ title: 'A', playTimeMin: null }),
				createGame({ title: 'B', playTimeMin: null })
			];
			const sorted = sortGames(games, 'playtime');
			expect(sorted.length).toBe(2);
		});
	});

	describe('Sort combined with search', () => {
		it('filters first then sorts', () => {
			const games = [
				createGame({ title: 'Catan', year: 1995 }),
				createGame({ title: 'Catapult', year: 2020 }),
				createGame({ title: 'Wingspan', year: 2019 })
			];
			const result = filterAndSortGames(games, 'cat', 'year-desc');
			expect(result.map((g) => g.title)).toEqual(['Catapult', 'Catan']);
		});

		it('returns empty when search matches nothing', () => {
			const games = [
				createGame({ title: 'Catan', year: 1995 }),
				createGame({ title: 'Wingspan', year: 2019 })
			];
			const result = filterAndSortGames(games, 'monopoly', 'title-asc');
			expect(result).toEqual([]);
		});

		it('sorts all games when search is empty', () => {
			const games = [
				createGame({ title: 'Wingspan', year: 2019 }),
				createGame({ title: 'Catan', year: 1995 })
			];
			const result = filterAndSortGames(games, '', 'title-asc');
			expect(result.map((g) => g.title)).toEqual(['Catan', 'Wingspan']);
		});

		it('handles whitespace-only search as empty', () => {
			const games = [
				createGame({ title: 'B', year: 2020 }),
				createGame({ title: 'A', year: 2010 })
			];
			const result = filterAndSortGames(games, '   ', 'title-asc');
			expect(result.map((g) => g.title)).toEqual(['A', 'B']);
		});
	});

	describe('Sort stability and edge cases', () => {
		it('does not mutate original array', () => {
			const games = [
				createGame({ title: 'B' }),
				createGame({ title: 'A' }),
				createGame({ title: 'C' })
			];
			const originalOrder = games.map((g) => g.title);
			sortGames(games, 'title-asc');
			expect(games.map((g) => g.title)).toEqual(originalOrder);
		});

		it('handles special characters in titles', () => {
			const games = [
				createGame({ title: '7 Wonders' }),
				createGame({ title: 'Azul' }),
				createGame({ title: '1830' })
			];
			const sorted = sortGames(games, 'title-asc');
			// Numbers come before letters
			expect(sorted.map((g) => g.title)).toEqual(['1830', '7 Wonders', 'Azul']);
		});

		it('handles emoji in titles', () => {
			const games = [createGame({ title: '🎲 Dice Game' }), createGame({ title: 'Azul' })];
			const sorted = sortGames(games, 'title-asc');
			expect(sorted.length).toBe(2);
		});

		it('handles very long titles', () => {
			const longTitle = 'A'.repeat(1000);
			const games = [createGame({ title: longTitle }), createGame({ title: 'B' })];
			const sorted = sortGames(games, 'title-asc');
			expect(sorted[0].title).toBe(longTitle);
		});
	});

	describe('Default sort option', () => {
		it('title-asc is a valid sort option', () => {
			const games = [createGame({ title: 'B' }), createGame({ title: 'A' })];
			const sorted = sortGames(games, 'title-asc');
			expect(sorted.map((g) => g.title)).toEqual(['A', 'B']);
		});
	});

	describe('Sort options list', () => {
		const sortOptions: { value: SortOption; label: string }[] = [
			{ value: 'title-asc', label: 'Title A-Z' },
			{ value: 'title-desc', label: 'Title Z-A' },
			{ value: 'year-desc', label: 'Year (Newest)' },
			{ value: 'year-asc', label: 'Year (Oldest)' },
			{ value: 'recently-added', label: 'Recently Added' },
			{ value: 'players', label: 'Player Count' },
			{ value: 'playtime', label: 'Play Time' }
		];

		it('has 7 sort options', () => {
			expect(sortOptions.length).toBe(7);
		});

		it('all sort option values are unique', () => {
			const values = sortOptions.map((opt) => opt.value);
			const uniqueValues = new Set(values);
			expect(uniqueValues.size).toBe(values.length);
		});

		it('all sort option labels are unique', () => {
			const labels = sortOptions.map((opt) => opt.label);
			const uniqueLabels = new Set(labels);
			expect(uniqueLabels.size).toBe(labels.length);
		});
	});
});
