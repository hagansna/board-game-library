<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import StarRating from '$lib/components/StarRating.svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { Game } from '$lib/server/games';

	let { form } = $props();

	// Search state
	let searchQuery = $state(form?.searchQuery ?? '');
	let searchResults = $state<Game[]>(form?.searchResults ?? []);
	let isSearching = $state(false);

	// Selection state
	let selectedGame = $state<Game | null>(null);

	// Update search results when form data changes
	$effect(() => {
		if (form?.searchResults) {
			searchResults = form.searchResults;
		}
		if (form?.searchQuery !== undefined) {
			searchQuery = form.searchQuery;
		}
	});

	function selectGame(game: Game) {
		selectedGame = game;
	}

	function clearSelection() {
		selectedGame = null;
	}

	function formatPlayerCount(game: Game): string {
		if (game.minPlayers && game.maxPlayers) {
			return game.minPlayers === game.maxPlayers
				? `${game.minPlayers} players`
				: `${game.minPlayers}-${game.maxPlayers} players`;
		}
		if (game.minPlayers) return `${game.minPlayers}+ players`;
		if (game.maxPlayers) return `Up to ${game.maxPlayers} players`;
		return '';
	}

	function formatPlayTime(game: Game): string {
		if (game.playTimeMin && game.playTimeMax) {
			return game.playTimeMin === game.playTimeMax
				? `${game.playTimeMin} min`
				: `${game.playTimeMin}-${game.playTimeMax} min`;
		}
		if (game.playTimeMin) return `${game.playTimeMin}+ min`;
		if (game.playTimeMax) return `Up to ${game.playTimeMax} min`;
		return '';
	}
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-2xl space-y-8">
		<div class="flex items-center gap-4">
			<Button variant="outline" href={resolve('/games')}>
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
					<path d="m12 19-7-7 7-7" />
					<path d="M19 12H5" />
				</svg>
				Back
			</Button>
			<h1 class="text-3xl font-bold text-foreground">Add Game to Library</h1>
		</div>

		{#if !selectedGame}
			<!-- Search Section -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Search Game Catalog</Card.Title>
					<Card.Description>Find a game in the shared catalog to add to your library.</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/search"
						use:enhance={() => {
							isSearching = true;
							return async ({ update }) => {
								await update();
								isSearching = false;
							};
						}}
						class="space-y-4"
					>
						<div class="flex gap-2">
							<div class="flex-1">
								<Input
									id="query"
									name="query"
									type="text"
									placeholder="Search by game title..."
									value={searchQuery}
									oninput={(e) => (searchQuery = (e.target as HTMLInputElement).value)}
								/>
							</div>
							<Button type="submit" disabled={isSearching || !searchQuery.trim()}>
								{#if isSearching}
									<svg
										class="mr-2 h-4 w-4 animate-spin"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
								{:else}
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
										<circle cx="11" cy="11" r="8" />
										<path d="m21 21-4.3-4.3" />
									</svg>
								{/if}
								Search
							</Button>
						</div>
					</form>

					<!-- Search Results -->
					{#if searchResults.length > 0}
						<div class="mt-6 space-y-3">
							<p class="text-sm text-muted-foreground">
								Found {searchResults.length} game{searchResults.length === 1 ? '' : 's'}
							</p>
							<div class="max-h-96 space-y-2 overflow-y-auto">
								{#each searchResults as game (game.id)}
									<button
										type="button"
										class="flex w-full items-start gap-4 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent"
										onclick={() => selectGame(game)}
									>
										{#if game.boxArtUrl}
											<img
												src={game.boxArtUrl}
												alt="Box art for {game.title}"
												class="h-16 w-16 flex-shrink-0 rounded object-cover"
											/>
										{:else}
											<div
												class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded bg-muted"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="24"
													height="24"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													class="text-muted-foreground"
												>
													<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
													<circle cx="9" cy="9" r="2" />
													<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
												</svg>
											</div>
										{/if}
										<div class="flex-1 overflow-hidden">
											<h3 class="font-medium text-foreground">{game.title}</h3>
											<div class="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
												{#if game.year}
													<span>{game.year}</span>
												{/if}
												{#if formatPlayerCount(game)}
													<span>{formatPlayerCount(game)}</span>
												{/if}
												{#if formatPlayTime(game)}
													<span>{formatPlayTime(game)}</span>
												{/if}
											</div>
											{#if game.description}
												<p class="mt-1 line-clamp-1 text-xs text-muted-foreground">
													{game.description}
												</p>
											{/if}
										</div>
										<div class="flex-shrink-0">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="20"
												height="20"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="text-muted-foreground"
											>
												<path d="M5 12h14" />
												<path d="M12 5v14" />
											</svg>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{:else if form?.searchQuery && !isSearching}
						<div class="mt-6 text-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="48"
								height="48"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="mx-auto text-muted-foreground"
							>
								<circle cx="11" cy="11" r="8" />
								<path d="m21 21-4.3-4.3" />
								<path d="M8 8h6" />
							</svg>
							<p class="mt-2 text-sm text-muted-foreground">
								No games found matching "{form.searchQuery}"
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								Try a different search term or check the game catalog.
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{:else}
			<!-- Selected Game - Add to Library Form -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Add to Your Library</Card.Title>
					<Card.Description>Confirm and optionally set your initial tracking data.</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/addFromCatalog"
						use:enhance
						class="space-y-6"
					>
						{#if form?.errors?.general}
							<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
								{form.errors.general}
							</div>
						{/if}

						<!-- Selected Game Info (Read-Only) -->
						<div class="flex items-start gap-4 rounded-lg border border-border bg-muted/30 p-4">
							{#if selectedGame.boxArtUrl}
								<img
									src={selectedGame.boxArtUrl}
									alt="Box art for {selectedGame.title}"
									class="h-24 w-24 flex-shrink-0 rounded object-cover"
								/>
							{:else}
								<div
									class="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded bg-muted"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="32"
										height="32"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="text-muted-foreground"
									>
										<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
										<circle cx="9" cy="9" r="2" />
										<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
									</svg>
								</div>
							{/if}
							<div class="flex-1 overflow-hidden">
								<h3 class="text-lg font-medium text-foreground">{selectedGame.title}</h3>
								<div class="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
									{#if selectedGame.year}
										<span class="flex items-center gap-1">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
												<line x1="16" x2="16" y1="2" y2="6" />
												<line x1="8" x2="8" y1="2" y2="6" />
												<line x1="3" x2="21" y1="10" y2="10" />
											</svg>
											{selectedGame.year}
										</span>
									{/if}
									{#if formatPlayerCount(selectedGame)}
										<span class="flex items-center gap-1">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
												<circle cx="9" cy="7" r="4" />
												<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
												<path d="M16 3.13a4 4 0 0 1 0 7.75" />
											</svg>
											{formatPlayerCount(selectedGame)}
										</span>
									{/if}
									{#if formatPlayTime(selectedGame)}
										<span class="flex items-center gap-1">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<circle cx="12" cy="12" r="10" />
												<polyline points="12 6 12 12 16 14" />
											</svg>
											{formatPlayTime(selectedGame)}
										</span>
									{/if}
								</div>
								{#if selectedGame.description}
									<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
										{selectedGame.description}
									</p>
								{/if}
							</div>
						</div>

						<!-- Hidden game ID -->
						<input type="hidden" name="gameId" value={selectedGame.id} />

						<!-- Personal Tracking Section -->
						<div class="border-t pt-6">
							<h3 class="mb-4 text-sm font-medium text-foreground">Personal Tracking (Optional)</h3>

							<div class="space-y-6">
								<div class="space-y-2">
									<Label for="playCount">Initial Play Count</Label>
									<Input
										id="playCount"
										name="playCount"
										type="number"
										min="0"
										placeholder="e.g., 5"
										value={form?.playCount ?? ''}
									/>
									<p class="text-xs text-muted-foreground">How many times you've already played this game</p>
									{#if form?.errors?.playCount}
										<p class="text-sm text-destructive">{form.errors.playCount}</p>
									{/if}
								</div>

								<div class="space-y-2">
									<Label>Personal Rating</Label>
									<StarRating value={form?.personalRating ? parseInt(form.personalRating) : null} name="personalRating" />
									<p class="text-xs text-muted-foreground">Your personal rating (1-5 stars)</p>
									{#if form?.errors?.personalRating}
										<p class="text-sm text-destructive">{form.errors.personalRating}</p>
									{/if}
								</div>

								<div class="space-y-2">
									<Label for="review">Personal Review</Label>
									<textarea
										id="review"
										name="review"
										placeholder="Your thoughts on the game..."
										rows="3"
										class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
									>{form?.review ?? ''}</textarea>
									<p class="text-xs text-muted-foreground">Your personal review or notes about this game</p>
								</div>
							</div>
						</div>

						<div class="flex gap-4 pt-4">
							<Button type="button" variant="outline" onclick={clearSelection} class="flex-1">
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
									<path d="m12 19-7-7 7-7" />
									<path d="M19 12H5" />
								</svg>
								Choose Different Game
							</Button>
							<Button type="submit" class="flex-1">
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
									<path d="M5 12h14" />
									<path d="M12 5v14" />
								</svg>
								Add to Library
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
