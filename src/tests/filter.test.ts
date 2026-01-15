import { describe, it, expect } from 'vitest';

// Test the filter logic that's used in the games page
// This mirrors the client-side filtering in src/routes/games/+page.svelte

interface Game {
	id: string;
	title: string;
	year: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playTimeMin: number | null;
	playTimeMax: number | null;
}

// Filter types matching the games page
type PlayerCountFilter = 'any' | '1' | '2' | '3-4' | '5+';
type PlayTimeFilter = 'any' | 'under-30' | '30-60' | '60-120' | '120+';
type YearFilter = 'any' | '2020s' | '2010s' | '2000s' | '1990s' | 'pre-1990';

// Replicate the filter logic from the games page
function matchesPlayerCount(
	game: { minPlayers: number | null; maxPlayers: number | null },
	filter: PlayerCountFilter
): boolean {
	if (filter === 'any') return true;

	const min = game.minPlayers;
	const max = game.maxPlayers;

	// If no player count info, exclude from filtered results
	if (min === null && max === null) return false;

	// Get the range of players the game supports
	const gameMin = min ?? max ?? 0;
	const gameMax = max ?? min ?? 999;

	switch (filter) {
		case '1':
			return gameMin <= 1 && gameMax >= 1;
		case '2':
			return gameMin <= 2 && gameMax >= 2;
		case '3-4':
			// Game supports at least one player count in 3-4 range
			return gameMin <= 4 && gameMax >= 3;
		case '5+':
			return gameMax >= 5;
		default:
			return true;
	}
}

function matchesPlayTime(
	game: { playTimeMin: number | null; playTimeMax: number | null },
	filter: PlayTimeFilter
): boolean {
	if (filter === 'any') return true;

	const min = game.playTimeMin;
	const max = game.playTimeMax;

	// If no play time info, exclude from filtered results
	if (min === null && max === null) return false;

	// Use whichever value is available, prefer min for lower bound checks
	const playtime = min ?? max ?? 0;

	switch (filter) {
		case 'under-30':
			return playtime < 30;
		case '30-60':
			return playtime >= 30 && playtime <= 60;
		case '60-120':
			return playtime > 60 && playtime <= 120;
		case '120+':
			return playtime > 120;
		default:
			return true;
	}
}

function matchesYear(game: { year: number | null }, filter: YearFilter): boolean {
	if (filter === 'any') return true;

	const year = game.year;

	// If no year info, exclude from filtered results
	if (year === null) return false;

	switch (filter) {
		case '2020s':
			return year >= 2020 && year <= 2029;
		case '2010s':
			return year >= 2010 && year <= 2019;
		case '2000s':
			return year >= 2000 && year <= 2009;
		case '1990s':
			return year >= 1990 && year <= 1999;
		case 'pre-1990':
			return year < 1990;
		default:
			return true;
	}
}

// Combined filter function
function filterGames(
	games: Game[],
	playerFilter: PlayerCountFilter,
	playTimeFilter: PlayTimeFilter,
	yearFilter: YearFilter
): Game[] {
	return games.filter((game) => {
		if (playerFilter !== 'any' && !matchesPlayerCount(game, playerFilter)) return false;
		if (playTimeFilter !== 'any' && !matchesPlayTime(game, playTimeFilter)) return false;
		if (yearFilter !== 'any' && !matchesYear(game, yearFilter)) return false;
		return true;
	});
}

describe('Library Filters - Filter by Player Count, Play Time, Year (Story 24)', () => {
	// Test data with various player counts, play times, and years
	const testGames: Game[] = [
		// Solo games (1 player)
		{
			id: '1',
			title: 'Friday',
			year: 2011,
			minPlayers: 1,
			maxPlayers: 1,
			playTimeMin: 25,
			playTimeMax: 25
		},
		// 2-player games
		{
			id: '2',
			title: '7 Wonders Duel',
			year: 2015,
			minPlayers: 2,
			maxPlayers: 2,
			playTimeMin: 30,
			playTimeMax: 30
		},
		// 2-4 player games
		{
			id: '3',
			title: 'Catan',
			year: 1995,
			minPlayers: 3,
			maxPlayers: 4,
			playTimeMin: 60,
			playTimeMax: 120
		},
		// 1-5 player games
		{
			id: '4',
			title: 'Wingspan',
			year: 2019,
			minPlayers: 1,
			maxPlayers: 5,
			playTimeMin: 40,
			playTimeMax: 70
		},
		// 3-6 player games
		{
			id: '5',
			title: 'Ticket to Ride',
			year: 2004,
			minPlayers: 2,
			maxPlayers: 5,
			playTimeMin: 30,
			playTimeMax: 60
		},
		// Long game (2+ hours)
		{
			id: '6',
			title: 'Twilight Imperium',
			year: 2017,
			minPlayers: 3,
			maxPlayers: 6,
			playTimeMin: 240,
			playTimeMax: 480
		},
		// Quick filler (under 30 min)
		{
			id: '7',
			title: 'Love Letter',
			year: 2012,
			minPlayers: 2,
			maxPlayers: 4,
			playTimeMin: 20,
			playTimeMax: 20
		},
		// Older game (pre-1990)
		{
			id: '8',
			title: 'Acquire',
			year: 1964,
			minPlayers: 3,
			maxPlayers: 6,
			playTimeMin: 90,
			playTimeMax: 90
		},
		// 2000s game
		{
			id: '9',
			title: 'Pandemic',
			year: 2008,
			minPlayers: 2,
			maxPlayers: 4,
			playTimeMin: 45,
			playTimeMax: 45
		},
		// 2020s game
		{
			id: '10',
			title: 'Cascadia',
			year: 2021,
			minPlayers: 1,
			maxPlayers: 4,
			playTimeMin: 30,
			playTimeMax: 45
		},
		// Game with no player count info
		{
			id: '11',
			title: 'Unknown Players Game',
			year: 2015,
			minPlayers: null,
			maxPlayers: null,
			playTimeMin: 60,
			playTimeMax: 60
		},
		// Game with no play time info
		{
			id: '12',
			title: 'Unknown Time Game',
			year: 2010,
			minPlayers: 2,
			maxPlayers: 4,
			playTimeMin: null,
			playTimeMax: null
		},
		// Game with no year info
		{
			id: '13',
			title: 'Unknown Year Game',
			year: null,
			minPlayers: 2,
			maxPlayers: 4,
			playTimeMin: 45,
			playTimeMax: 45
		}
	];

	describe('Player Count Filter', () => {
		it('should return all games when filter is "any"', () => {
			const result = filterGames(testGames, 'any', 'any', 'any');
			expect(result).toHaveLength(testGames.length);
		});

		it('should filter for 1 player games', () => {
			const result = filterGames(testGames, '1', 'any', 'any');
			// Should include: Friday (1-1), Wingspan (1-5), Cascadia (1-4)
			expect(result.length).toBe(3);
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Friday');
			expect(titles).toContain('Wingspan');
			expect(titles).toContain('Cascadia');
		});

		it('should filter for 2 player games', () => {
			const result = filterGames(testGames, '2', 'any', 'any');
			// Should include games that support exactly 2 players
			const titles = result.map((g) => g.title);
			expect(titles).toContain('7 Wonders Duel');
			expect(titles).toContain('Ticket to Ride');
			expect(titles).toContain('Love Letter');
			expect(titles).toContain('Pandemic');
		});

		it('should filter for 3-4 player games', () => {
			const result = filterGames(testGames, '3-4', 'any', 'any');
			// Should include games that support at least one player count in 3-4 range
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Catan');
			expect(titles).toContain('Wingspan');
			expect(titles).toContain('Ticket to Ride');
			expect(titles).toContain('Love Letter');
			expect(titles).toContain('Twilight Imperium');
		});

		it('should filter for 5+ player games', () => {
			const result = filterGames(testGames, '5+', 'any', 'any');
			// Should include games that support 5 or more players
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Wingspan');
			expect(titles).toContain('Ticket to Ride');
			expect(titles).toContain('Twilight Imperium');
			expect(titles).toContain('Acquire');
		});

		it('should exclude games with no player count info from filtered results', () => {
			const result = filterGames(testGames, '2', 'any', 'any');
			const titles = result.map((g) => g.title);
			expect(titles).not.toContain('Unknown Players Game');
		});

		it('should handle game with only minPlayers set', () => {
			const gamesWithPartialData: Game[] = [
				{
					id: '1',
					title: 'Min Only',
					year: 2020,
					minPlayers: 2,
					maxPlayers: null,
					playTimeMin: 30,
					playTimeMax: 30
				}
			];
			const result = filterGames(gamesWithPartialData, '2', 'any', 'any');
			expect(result).toHaveLength(1);
		});

		it('should handle game with only maxPlayers set', () => {
			const gamesWithPartialData: Game[] = [
				{
					id: '1',
					title: 'Max Only',
					year: 2020,
					minPlayers: null,
					maxPlayers: 4,
					playTimeMin: 30,
					playTimeMax: 30
				}
			];
			const result = filterGames(gamesWithPartialData, '3-4', 'any', 'any');
			expect(result).toHaveLength(1);
		});
	});

	describe('Play Time Filter', () => {
		it('should filter for games under 30 minutes', () => {
			const result = filterGames(testGames, 'any', 'under-30', 'any');
			// Should include: Friday (25), Love Letter (20)
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Friday');
			expect(titles).toContain('Love Letter');
			expect(titles).not.toContain('Catan');
		});

		it('should filter for games 30-60 minutes', () => {
			const result = filterGames(testGames, 'any', '30-60', 'any');
			// Should include: 7 Wonders Duel (30), Ticket to Ride (30-60), Wingspan (40-70), Pandemic (45), Cascadia (30-45)
			const titles = result.map((g) => g.title);
			expect(titles).toContain('7 Wonders Duel');
			expect(titles).toContain('Ticket to Ride');
			expect(titles).toContain('Wingspan');
			expect(titles).toContain('Pandemic');
			expect(titles).toContain('Cascadia');
		});

		it('should filter for games 1-2 hours (60-120 min)', () => {
			const result = filterGames(testGames, 'any', '60-120', 'any');
			// Should include: Acquire (90)
			// Note: Catan has playTimeMin=60, but filter is > 60 and <= 120, so 60 is excluded
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Acquire');
			// Catan's playTimeMin is exactly 60, which is in the 30-60 range (>= 30 and <= 60)
			expect(titles).not.toContain('Catan');
		});

		it('should filter for games 2+ hours (120+ min)', () => {
			const result = filterGames(testGames, 'any', '120+', 'any');
			// Should include: Twilight Imperium (240-480)
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Twilight Imperium');
			expect(result.length).toBe(1);
		});

		it('should exclude games with no play time info from filtered results', () => {
			const result = filterGames(testGames, 'any', '30-60', 'any');
			const titles = result.map((g) => g.title);
			expect(titles).not.toContain('Unknown Time Game');
		});

		it('should handle boundary cases correctly (exactly 30 min)', () => {
			const boundaryGames: Game[] = [
				{
					id: '1',
					title: 'Exactly 30',
					year: 2020,
					minPlayers: 2,
					maxPlayers: 4,
					playTimeMin: 30,
					playTimeMax: 30
				}
			];
			const under30 = filterGames(boundaryGames, 'any', 'under-30', 'any');
			const thirtyTo60 = filterGames(boundaryGames, 'any', '30-60', 'any');
			expect(under30).toHaveLength(0); // 30 is not < 30
			expect(thirtyTo60).toHaveLength(1); // 30 is >= 30 and <= 60
		});

		it('should handle boundary cases correctly (exactly 60 min)', () => {
			const boundaryGames: Game[] = [
				{
					id: '1',
					title: 'Exactly 60',
					year: 2020,
					minPlayers: 2,
					maxPlayers: 4,
					playTimeMin: 60,
					playTimeMax: 60
				}
			];
			const thirtyTo60 = filterGames(boundaryGames, 'any', '30-60', 'any');
			const sixtyTo120 = filterGames(boundaryGames, 'any', '60-120', 'any');
			expect(thirtyTo60).toHaveLength(1); // 60 is <= 60
			expect(sixtyTo120).toHaveLength(0); // 60 is not > 60
		});

		it('should handle boundary cases correctly (exactly 120 min)', () => {
			const boundaryGames: Game[] = [
				{
					id: '1',
					title: 'Exactly 120',
					year: 2020,
					minPlayers: 2,
					maxPlayers: 4,
					playTimeMin: 120,
					playTimeMax: 120
				}
			];
			const sixtyTo120 = filterGames(boundaryGames, 'any', '60-120', 'any');
			const over120 = filterGames(boundaryGames, 'any', '120+', 'any');
			expect(sixtyTo120).toHaveLength(1); // 120 is > 60 and <= 120
			expect(over120).toHaveLength(0); // 120 is not > 120
		});
	});

	describe('Year Filter', () => {
		it('should filter for 2020s games', () => {
			const result = filterGames(testGames, 'any', 'any', '2020s');
			// Should include: Cascadia (2021)
			expect(result.length).toBe(1);
			expect(result[0].title).toBe('Cascadia');
		});

		it('should filter for 2010s games', () => {
			const result = filterGames(testGames, 'any', 'any', '2010s');
			// Should include: Friday (2011), 7 Wonders Duel (2015), Wingspan (2019), Twilight Imperium (2017), Love Letter (2012), Unknown Players Game (2015), Unknown Time Game (2010)
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Friday');
			expect(titles).toContain('7 Wonders Duel');
			expect(titles).toContain('Wingspan');
			expect(titles).toContain('Love Letter');
		});

		it('should filter for 2000s games', () => {
			const result = filterGames(testGames, 'any', 'any', '2000s');
			// Should include: Ticket to Ride (2004), Pandemic (2008)
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Ticket to Ride');
			expect(titles).toContain('Pandemic');
		});

		it('should filter for 1990s games', () => {
			const result = filterGames(testGames, 'any', 'any', '1990s');
			// Should include: Catan (1995)
			expect(result.length).toBe(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should filter for pre-1990 games', () => {
			const result = filterGames(testGames, 'any', 'any', 'pre-1990');
			// Should include: Acquire (1964)
			expect(result.length).toBe(1);
			expect(result[0].title).toBe('Acquire');
		});

		it('should exclude games with no year info from filtered results', () => {
			const result = filterGames(testGames, 'any', 'any', '2010s');
			const titles = result.map((g) => g.title);
			expect(titles).not.toContain('Unknown Year Game');
		});

		it('should handle year boundary correctly (year 2020)', () => {
			const boundaryGames: Game[] = [
				{
					id: '1',
					title: 'Year 2020',
					year: 2020,
					minPlayers: 2,
					maxPlayers: 4,
					playTimeMin: 30,
					playTimeMax: 30
				}
			];
			const result2010s = filterGames(boundaryGames, 'any', 'any', '2010s');
			const result2020s = filterGames(boundaryGames, 'any', 'any', '2020s');
			expect(result2010s).toHaveLength(0);
			expect(result2020s).toHaveLength(1);
		});

		it('should handle year boundary correctly (year 1990)', () => {
			const boundaryGames: Game[] = [
				{
					id: '1',
					title: 'Year 1990',
					year: 1990,
					minPlayers: 2,
					maxPlayers: 4,
					playTimeMin: 30,
					playTimeMax: 30
				}
			];
			const resultPre1990 = filterGames(boundaryGames, 'any', 'any', 'pre-1990');
			const result1990s = filterGames(boundaryGames, 'any', 'any', '1990s');
			expect(resultPre1990).toHaveLength(0);
			expect(result1990s).toHaveLength(1);
		});
	});

	describe('Combined Filters', () => {
		it('should apply multiple filters simultaneously (player count + play time)', () => {
			// 2-player games under 30 minutes
			const result = filterGames(testGames, '2', 'under-30', 'any');
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Love Letter'); // 2-4 players, 20 min
			expect(titles).not.toContain('Friday'); // Only 1 player
			expect(titles).not.toContain('7 Wonders Duel'); // 2 players but 30 min (not under 30)
		});

		it('should apply multiple filters simultaneously (player count + year)', () => {
			// 3-4 player games from 2010s
			const result = filterGames(testGames, '3-4', 'any', '2010s');
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Wingspan'); // 1-5 players, 2019
			expect(titles).toContain('Love Letter'); // 2-4 players, 2012
			expect(titles).not.toContain('Catan'); // 3-4 players but 1995
		});

		it('should apply multiple filters simultaneously (play time + year)', () => {
			// Games 30-60 minutes from 2000s
			const result = filterGames(testGames, 'any', '30-60', '2000s');
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Ticket to Ride'); // 30-60 min, 2004
			expect(titles).toContain('Pandemic'); // 45 min, 2008
			expect(titles).not.toContain('7 Wonders Duel'); // 30 min but 2015
		});

		it('should apply all three filters simultaneously', () => {
			// 3-4 player games, 30-60 minutes, from 2010s
			const result = filterGames(testGames, '3-4', '30-60', '2010s');
			const titles = result.map((g) => g.title);
			expect(titles).toContain('Wingspan'); // 1-5 players, 40-70 min, 2019
			// Love Letter doesn't match because it's 20 min
		});

		it('should return empty array when no games match all filters', () => {
			// 1 player games, 2+ hours, from 1990s (no such games exist)
			const result = filterGames(testGames, '1', '120+', '1990s');
			expect(result).toHaveLength(0);
		});

		it('should work with filters that exclude games missing data', () => {
			// When filtering by player count, games without player data should be excluded
			// When filtering by time, games without time data should be excluded
			// When filtering by year, games without year data should be excluded
			const result = filterGames(testGames, '2', '30-60', '2010s');
			const titles = result.map((g) => g.title);
			expect(titles).not.toContain('Unknown Players Game');
			expect(titles).not.toContain('Unknown Time Game');
			expect(titles).not.toContain('Unknown Year Game');
		});
	});

	describe('Active Filter Count', () => {
		it('should count 0 active filters when all are "any"', () => {
			const playerFilter: PlayerCountFilter = 'any';
			const playTimeFilter: PlayTimeFilter = 'any';
			const yearFilter: YearFilter = 'any';
			const count =
				(playerFilter !== 'any' ? 1 : 0) +
				(playTimeFilter !== 'any' ? 1 : 0) +
				(yearFilter !== 'any' ? 1 : 0);
			expect(count).toBe(0);
		});

		it('should count 1 active filter when one is set', () => {
			const playerFilter: PlayerCountFilter = '2';
			const playTimeFilter: PlayTimeFilter = 'any';
			const yearFilter: YearFilter = 'any';
			const count =
				(playerFilter !== 'any' ? 1 : 0) +
				(playTimeFilter !== 'any' ? 1 : 0) +
				(yearFilter !== 'any' ? 1 : 0);
			expect(count).toBe(1);
		});

		it('should count 2 active filters when two are set', () => {
			const playerFilter: PlayerCountFilter = '3-4';
			const playTimeFilter: PlayTimeFilter = '30-60';
			const yearFilter: YearFilter = 'any';
			const count =
				(playerFilter !== 'any' ? 1 : 0) +
				(playTimeFilter !== 'any' ? 1 : 0) +
				(yearFilter !== 'any' ? 1 : 0);
			expect(count).toBe(2);
		});

		it('should count 3 active filters when all are set', () => {
			const playerFilter: PlayerCountFilter = '5+';
			const playTimeFilter: PlayTimeFilter = '60-120';
			const yearFilter: YearFilter = '2010s';
			const count =
				(playerFilter !== 'any' ? 1 : 0) +
				(playTimeFilter !== 'any' ? 1 : 0) +
				(yearFilter !== 'any' ? 1 : 0);
			expect(count).toBe(3);
		});
	});

	describe('Clear All Filters', () => {
		it('should reset all filters to "any" after clearing', () => {
			// Simulate clearing filters
			let playerFilter: PlayerCountFilter = '2';
			let playTimeFilter: PlayTimeFilter = '30-60';
			let yearFilter: YearFilter = '2010s';

			// Verify filters are set
			expect(playerFilter).not.toBe('any');
			expect(playTimeFilter).not.toBe('any');
			expect(yearFilter).not.toBe('any');

			// Clear all
			playerFilter = 'any';
			playTimeFilter = 'any';
			yearFilter = 'any';

			// Verify all cleared
			expect(playerFilter).toBe('any');
			expect(playTimeFilter).toBe('any');
			expect(yearFilter).toBe('any');

			// Verify all games returned
			const result = filterGames(testGames, playerFilter, playTimeFilter, yearFilter);
			expect(result).toHaveLength(testGames.length);
		});
	});

	describe('Filter with Search', () => {
		// Helper to combine search and filter
		function filterAndSearch(
			games: Game[],
			searchQuery: string,
			playerFilter: PlayerCountFilter,
			playTimeFilter: PlayTimeFilter,
			yearFilter: YearFilter
		): Game[] {
			let filtered = games;

			// Apply search
			if (searchQuery.trim() !== '') {
				filtered = filtered.filter((game) =>
					game.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
				);
			}

			// Apply filters
			if (playerFilter !== 'any') {
				filtered = filtered.filter((game) => matchesPlayerCount(game, playerFilter));
			}
			if (playTimeFilter !== 'any') {
				filtered = filtered.filter((game) => matchesPlayTime(game, playTimeFilter));
			}
			if (yearFilter !== 'any') {
				filtered = filtered.filter((game) => matchesYear(game, yearFilter));
			}

			return filtered;
		}

		it('should combine search with player filter', () => {
			const result = filterAndSearch(testGames, 'Ticket', '2', 'any', 'any');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Ticket to Ride');
		});

		it('should combine search with play time filter', () => {
			const result = filterAndSearch(testGames, 'wingspan', 'any', '30-60', 'any');
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Wingspan');
		});

		it('should combine search with year filter', () => {
			const result = filterAndSearch(testGames, 'c', 'any', 'any', '1990s');
			// Catan starts with 'C' and is from 1995
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Catan');
		});

		it('should combine search with all filters', () => {
			const result = filterAndSearch(testGames, 'pan', '3-4', '30-60', '2000s');
			// Should match Pandemic (contains 'pan', 2-4 players, 45 min, 2008)
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Pandemic');
		});

		it('should return empty when search and filter have no overlap', () => {
			const result = filterAndSearch(testGames, 'Acquire', 'any', 'any', '2020s');
			// Acquire exists but is from 1964, not 2020s
			expect(result).toHaveLength(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty games array', () => {
			const result = filterGames([], '2', '30-60', '2010s');
			expect(result).toHaveLength(0);
		});

		it('should handle single game that matches all filters', () => {
			const singleGame: Game[] = [
				{
					id: '1',
					title: 'Perfect Match',
					year: 2015,
					minPlayers: 2,
					maxPlayers: 4,
					playTimeMin: 45,
					playTimeMax: 45
				}
			];
			const result = filterGames(singleGame, '2', '30-60', '2010s');
			expect(result).toHaveLength(1);
		});

		it('should handle single game that matches no filters', () => {
			const singleGame: Game[] = [
				{
					id: '1',
					title: 'No Match',
					year: 1980,
					minPlayers: 6,
					maxPlayers: 8,
					playTimeMin: 300,
					playTimeMax: 300
				}
			];
			const result = filterGames(singleGame, '2', '30-60', '2010s');
			expect(result).toHaveLength(0);
		});

		it('should handle games with all null optional fields', () => {
			const nullGame: Game[] = [
				{
					id: '1',
					title: 'All Nulls',
					year: null,
					minPlayers: null,
					maxPlayers: null,
					playTimeMin: null,
					playTimeMax: null
				}
			];
			// Should be excluded by any non-'any' filter
			expect(filterGames(nullGame, '2', 'any', 'any')).toHaveLength(0);
			expect(filterGames(nullGame, 'any', '30-60', 'any')).toHaveLength(0);
			expect(filterGames(nullGame, 'any', 'any', '2010s')).toHaveLength(0);
			// Should be included when all filters are 'any'
			expect(filterGames(nullGame, 'any', 'any', 'any')).toHaveLength(1);
		});
	});
});
