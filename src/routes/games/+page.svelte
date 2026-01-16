<script lang="ts">
	import GameCard from '$lib/components/GameCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { resolve } from '$app/paths';

	let { data } = $props();

	// Search state
	let searchQuery = $state('');

	// Sort state
	type SortOption =
		| 'title-asc'
		| 'title-desc'
		| 'year-desc'
		| 'year-asc'
		| 'recently-added'
		| 'players'
		| 'playtime';

	const sortOptions: { value: SortOption; label: string }[] = [
		{ value: 'title-asc', label: 'Title A-Z' },
		{ value: 'title-desc', label: 'Title Z-A' },
		{ value: 'year-desc', label: 'Year (Newest)' },
		{ value: 'year-asc', label: 'Year (Oldest)' },
		{ value: 'recently-added', label: 'Recently Added' },
		{ value: 'players', label: 'Player Count' },
		{ value: 'playtime', label: 'Play Time' }
	];

	let currentSort = $state<SortOption>('title-asc');

	// Get sort label for display
	let currentSortLabel = $derived(
		sortOptions.find((opt) => opt.value === currentSort)?.label ?? 'Sort'
	);

	// Filter state
	type PlayerCountFilter = 'any' | '1' | '2' | '3-4' | '5+';
	type PlayTimeFilter = 'any' | 'under-30' | '30-60' | '60-120' | '120+';
	type YearFilter = 'any' | '2020s' | '2010s' | '2000s' | '1990s' | 'pre-1990';

	const playerCountOptions: { value: PlayerCountFilter; label: string }[] = [
		{ value: 'any', label: 'Any Players' },
		{ value: '1', label: '1 Player' },
		{ value: '2', label: '2 Players' },
		{ value: '3-4', label: '3-4 Players' },
		{ value: '5+', label: '5+ Players' }
	];

	const playTimeOptions: { value: PlayTimeFilter; label: string }[] = [
		{ value: 'any', label: 'Any Duration' },
		{ value: 'under-30', label: 'Under 30 min' },
		{ value: '30-60', label: '30-60 min' },
		{ value: '60-120', label: '1-2 hours' },
		{ value: '120+', label: '2+ hours' }
	];

	const yearOptions: { value: YearFilter; label: string }[] = [
		{ value: 'any', label: 'Any Year' },
		{ value: '2020s', label: '2020s' },
		{ value: '2010s', label: '2010s' },
		{ value: '2000s', label: '2000s' },
		{ value: '1990s', label: '1990s' },
		{ value: 'pre-1990', label: 'Pre-1990' }
	];

	let playerCountFilter = $state<PlayerCountFilter>('any');
	let playTimeFilter = $state<PlayTimeFilter>('any');
	let yearFilter = $state<YearFilter>('any');

	// Get filter labels for display
	let playerCountLabel = $derived(
		playerCountOptions.find((opt) => opt.value === playerCountFilter)?.label ?? 'Players'
	);
	let playTimeLabel = $derived(
		playTimeOptions.find((opt) => opt.value === playTimeFilter)?.label ?? 'Duration'
	);
	let yearLabel = $derived(yearOptions.find((opt) => opt.value === yearFilter)?.label ?? 'Year');

	// Count active filters
	let activeFilterCount = $derived(
		(playerCountFilter !== 'any' ? 1 : 0) +
			(playTimeFilter !== 'any' ? 1 : 0) +
			(yearFilter !== 'any' ? 1 : 0)
	);

	// Clear all filters
	function clearAllFilters() {
		playerCountFilter = 'any';
		playTimeFilter = 'any';
		yearFilter = 'any';
	}

	// Filter functions
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

	// Sort function for games
	function sortGames<T extends typeof data.games>(games: T): T {
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
				// Most recent first - use library entry created at for when it was added to user's library
				sorted.sort(
					(a, b) =>
						new Date(b.libraryEntryCreatedAt).getTime() -
						new Date(a.libraryEntryCreatedAt).getTime()
				);
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
		return sorted as T;
	}

	// Filter games based on search query (case-insensitive, partial match), filters, then sort
	let filteredGames = $derived.by(() => {
		let filtered = data.games;

		// Apply search filter
		if (searchQuery.trim() !== '') {
			filtered = filtered.filter((game) =>
				game.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
			);
		}

		// Apply player count filter
		if (playerCountFilter !== 'any') {
			filtered = filtered.filter((game) => matchesPlayerCount(game, playerCountFilter));
		}

		// Apply play time filter
		if (playTimeFilter !== 'any') {
			filtered = filtered.filter((game) => matchesPlayTime(game, playTimeFilter));
		}

		// Apply year filter
		if (yearFilter !== 'any') {
			filtered = filtered.filter((game) => matchesYear(game, yearFilter));
		}

		return sortGames(filtered);
	});

	// Clear search
	function clearSearch() {
		searchQuery = '';
	}
</script>

<div class="min-h-screen bg-background">
	<div class="mx-auto max-w-6xl px-4 py-8">
		<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-3xl font-bold text-foreground">My Library</h1>
				<p class="mt-1 text-muted-foreground">
					{data.games.length === 0
						? 'Start building your collection'
						: `${data.games.length} game${data.games.length === 1 ? '' : 's'} in your library`}
				</p>
			</div>
			<div class="flex gap-2">
				<Button variant="outline" href={resolve('/upload')}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="mr-2"
					>
						<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
						<circle cx="9" cy="9" r="2" />
						<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
					</svg>
					Upload Photo
				</Button>
				<Button href={resolve('/games/add')}>Add Game</Button>
			</div>
		</div>

		<!-- Search Bar, Filters, and Sort -->
		{#if data.games.length > 0}
			<div class="mb-6 space-y-3">
				<!-- Top row: Search and Sort -->
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="relative max-w-md flex-1">
						<!-- Search Icon -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.3-4.3" />
						</svg>
						<Input
							type="text"
							placeholder="Search games by title..."
							bind:value={searchQuery}
							class="pl-10 pr-10"
							aria-label="Search games"
						/>
						<!-- Clear Button -->
						{#if searchQuery.trim() !== ''}
							<button
								type="button"
								onclick={clearSearch}
								class="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								aria-label="Clear search"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M18 6 6 18" />
									<path d="m6 6 12 12" />
								</svg>
							</button>
						{/if}
					</div>

					<!-- Sort Dropdown -->
					<div class="flex items-center gap-2">
						<span class="text-sm text-muted-foreground">Sort by:</span>
						<Select.Root type="single" bind:value={currentSort}>
							<Select.Trigger class="w-[160px]" aria-label="Sort games by">
								{currentSortLabel}
							</Select.Trigger>
							<Select.Content>
								{#each sortOptions as option (option.value)}
									<Select.Item value={option.value} label={option.label}>
										{option.label}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<!-- Second row: Filters -->
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-sm text-muted-foreground">Filter:</span>

					<!-- Player Count Filter -->
					<Select.Root type="single" bind:value={playerCountFilter}>
						<Select.Trigger
							class="w-[130px] {playerCountFilter !== 'any' ? 'border-primary bg-primary/10' : ''}"
							aria-label="Filter by player count"
						>
							{playerCountLabel}
						</Select.Trigger>
						<Select.Content>
							{#each playerCountOptions as option (option.value)}
								<Select.Item value={option.value} label={option.label}>
									{option.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<!-- Play Time Filter -->
					<Select.Root type="single" bind:value={playTimeFilter}>
						<Select.Trigger
							class="w-[130px] {playTimeFilter !== 'any' ? 'border-primary bg-primary/10' : ''}"
							aria-label="Filter by play time"
						>
							{playTimeLabel}
						</Select.Trigger>
						<Select.Content>
							{#each playTimeOptions as option (option.value)}
								<Select.Item value={option.value} label={option.label}>
									{option.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<!-- Year Filter -->
					<Select.Root type="single" bind:value={yearFilter}>
						<Select.Trigger
							class="w-[120px] {yearFilter !== 'any' ? 'border-primary bg-primary/10' : ''}"
							aria-label="Filter by year"
						>
							{yearLabel}
						</Select.Trigger>
						<Select.Content>
							{#each yearOptions as option (option.value)}
								<Select.Item value={option.value} label={option.label}>
									{option.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<!-- Active Filter Count Badge and Clear All -->
					{#if activeFilterCount > 0}
						<span
							class="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
							aria-label="{activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}"
						>
							{activeFilterCount}
						</span>
						<button
							type="button"
							onclick={clearAllFilters}
							class="ml-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
							aria-label="Clear all filters"
						>
							Clear all
						</button>
					{/if}
				</div>
			</div>
		{/if}

		{#if data.games.length === 0}
			<!-- Empty library state -->
			<div
				class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mb-4 text-muted-foreground"
				>
					<rect width="7" height="7" x="3" y="3" rx="1" />
					<rect width="7" height="7" x="14" y="3" rx="1" />
					<rect width="7" height="7" x="14" y="14" rx="1" />
					<rect width="7" height="7" x="3" y="14" rx="1" />
				</svg>
				<h2 class="mb-2 text-xl font-semibold text-foreground">No games yet</h2>
				<p class="mb-6 text-center text-muted-foreground">
					Add your first game to start building your collection.
				</p>
				<Button href={resolve('/games/add')}>Add Your First Game</Button>
			</div>
		{:else if filteredGames.length === 0}
			<!-- No search/filter results state -->
			<div
				class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mb-4 text-muted-foreground"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
					<path d="M8 8l6 6" />
					<path d="M14 8l-6 6" />
				</svg>
				<h2 class="mb-2 text-xl font-semibold text-foreground">No results found</h2>
				<p class="mb-6 max-w-md text-center text-muted-foreground">
					{#if searchQuery.trim() !== '' && activeFilterCount > 0}
						No games match "<span class="font-medium">{searchQuery.trim()}</span>" with the selected
						filters.
					{:else if searchQuery.trim() !== ''}
						No games match "<span class="font-medium">{searchQuery.trim()}</span>". Try a different
						search term.
					{:else if activeFilterCount > 0}
						No games match the selected filters. Try adjusting your filter criteria.
					{:else}
						No games found.
					{/if}
				</p>
				<div class="flex gap-2">
					{#if searchQuery.trim() !== ''}
						<Button variant="outline" onclick={clearSearch}>Clear Search</Button>
					{/if}
					{#if activeFilterCount > 0}
						<Button variant="outline" onclick={clearAllFilters}>Clear Filters</Button>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Games grid -->
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredGames as game (game.libraryEntryId)}
					<GameCard
						libraryEntryId={game.libraryEntryId}
						gameId={game.gameId}
						title={game.title}
						year={game.year}
						minPlayers={game.minPlayers}
						maxPlayers={game.maxPlayers}
						playTimeMin={game.playTimeMin}
						playTimeMax={game.playTimeMax}
						boxArtUrl={game.boxArtUrl}
						description={game.description}
						categories={game.categories}
						bggRating={game.bggRating}
						bggRank={game.bggRank}
						suggestedAge={game.suggestedAge}
						playCount={game.playCount}
						review={game.review}
						personalRating={game.personalRating}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
