<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	let searchQuery = $state(data.searchQuery ?? '');
	let isSearching = $state(false);
	let deleteDialogOpen = $state(false);
	let gameToDelete = $state<{ id: string; title: string } | null>(null);
	let isDeleting = $state(false);

	function formatPlayerCount(game: {
		minPlayers?: number | null;
		maxPlayers?: number | null;
	}): string {
		if (game.minPlayers && game.maxPlayers) {
			return game.minPlayers === game.maxPlayers
				? `${game.minPlayers}`
				: `${game.minPlayers}-${game.maxPlayers}`;
		}
		if (game.minPlayers) return `${game.minPlayers}+`;
		if (game.maxPlayers) return `1-${game.maxPlayers}`;
		return '-';
	}

	function formatPlayTime(game: {
		playTimeMin?: number | null;
		playTimeMax?: number | null;
	}): string {
		if (game.playTimeMin && game.playTimeMax) {
			return game.playTimeMin === game.playTimeMax
				? `${game.playTimeMin} min`
				: `${game.playTimeMin}-${game.playTimeMax} min`;
		}
		if (game.playTimeMin) return `${game.playTimeMin}+ min`;
		if (game.playTimeMax) return `Up to ${game.playTimeMax} min`;
		return '-';
	}

	function openDeleteDialog(id: string, title: string) {
		gameToDelete = { id, title };
		deleteDialogOpen = true;
	}

	function closeDeleteDialog() {
		deleteDialogOpen = false;
		gameToDelete = null;
	}

	function handleSearch() {
		isSearching = true;
		const params = new URLSearchParams();
		if (searchQuery.trim()) {
			params.set('q', searchQuery.trim());
		}
		goto(`/admin/games${params.toString() ? '?' + params.toString() : ''}`).finally(() => {
			isSearching = false;
		});
	}

	function clearSearch() {
		searchQuery = '';
		goto('/admin/games');
	}
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-6xl space-y-8">
		<!-- Header -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
					Back to Library
				</Button>
				<div>
					<h1 class="text-3xl font-bold text-foreground">Game Catalog Admin</h1>
					<p class="text-sm text-muted-foreground">Manage the shared game catalog</p>
				</div>
			</div>
			<Button href={resolve('/admin/games/add')}>
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
				Add New Game
			</Button>
		</div>

		<!-- Search Bar -->
		<Card.Root>
			<Card.Content class="pt-6">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSearch();
					}}
					class="flex gap-2"
				>
					<div class="relative flex-1">
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
							class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.3-4.3" />
						</svg>
						<Input
							type="text"
							placeholder="Search games by title..."
							value={searchQuery}
							oninput={(e) => (searchQuery = (e.target as HTMLInputElement).value)}
							class="pl-10"
						/>
						{#if searchQuery}
							<button
								type="button"
								onclick={clearSearch}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
					<Button type="submit" disabled={isSearching}>
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
						{/if}
						Search
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Game Count -->
		<div class="flex items-center justify-between text-sm text-muted-foreground">
			<span>
				{#if data.searchQuery}
					Found {data.games.length} game{data.games.length === 1 ? '' : 's'} matching "{data.searchQuery}"
				{:else}
					{data.games.length} game{data.games.length === 1 ? '' : 's'} in catalog
				{/if}
			</span>
		</div>

		<!-- Games Table -->
		{#if data.games.length > 0}
			<Card.Root>
				<Card.Content class="p-0">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="border-b bg-muted/50">
								<tr>
									<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Game</th
									>
									<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Year</th
									>
									<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
										>Players</th
									>
									<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
										>Play Time</th
									>
									<th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
										>BGG Rating</th
									>
									<th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground"
										>Actions</th
									>
								</tr>
							</thead>
							<tbody class="divide-y">
								{#each data.games as game (game.id)}
									<tr class="hover:bg-muted/30">
										<td class="px-4 py-3">
											<div class="flex items-center gap-3">
												{#if game.boxArtUrl}
													<img
														src={game.boxArtUrl}
														alt="Box art for {game.title}"
														class="h-10 w-10 rounded object-cover"
													/>
												{:else}
													<div class="flex h-10 w-10 items-center justify-center rounded bg-muted">
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
															class="text-muted-foreground"
														>
															<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
															<circle cx="9" cy="9" r="2" />
															<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
														</svg>
													</div>
												{/if}
												<div>
													<p class="font-medium text-foreground">{game.title}</p>
													{#if game.categories && game.categories.length > 0}
														<div class="flex flex-wrap gap-1 mt-0.5">
															{#each game.categories.slice(0, 3) as category}
																<span
																	class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
																>
																	{category}
																</span>
															{/each}
															{#if game.categories.length > 3}
																<span class="text-xs text-muted-foreground">
																	+{game.categories.length - 3}
																</span>
															{/if}
														</div>
													{/if}
												</div>
											</div>
										</td>
										<td class="px-4 py-3 text-sm text-muted-foreground">
											{game.year ?? '-'}
										</td>
										<td class="px-4 py-3 text-sm text-muted-foreground">
											{formatPlayerCount(game)}
										</td>
										<td class="px-4 py-3 text-sm text-muted-foreground">
											{formatPlayTime(game)}
										</td>
										<td class="px-4 py-3 text-sm text-muted-foreground">
											{#if game.bggRating}
												<span class="flex items-center gap-1">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="14"
														height="14"
														viewBox="0 0 24 24"
														fill="currentColor"
														class="text-yellow-500"
													>
														<polygon
															points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
														/>
													</svg>
													{game.bggRating.toFixed(1)}
												</span>
											{:else}
												-
											{/if}
										</td>
										<td class="px-4 py-3 text-right">
											<div class="flex items-center justify-end gap-2">
												<Button
													variant="outline"
													size="sm"
													href={resolve(`/admin/games/${game.id}/edit`)}
												>
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
														<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
														<path d="m15 5 4 4" />
													</svg>
													Edit
												</Button>
												<Button
													variant="outline"
													size="sm"
													class="text-destructive hover:bg-destructive hover:text-destructive-foreground"
													onclick={() => openDeleteDialog(game.id, game.title)}
												>
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
														<path d="M3 6h18" />
														<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
														<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
														<line x1="10" x2="10" y1="11" y2="17" />
														<line x1="14" x2="14" y1="11" y2="17" />
													</svg>
													Delete
												</Button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<!-- Empty State -->
			<Card.Root>
				<Card.Content class="flex flex-col items-center justify-center py-16">
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
						class="text-muted-foreground"
					>
						<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
						<circle cx="9" cy="9" r="2" />
						<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
					</svg>
					{#if data.searchQuery}
						<h2 class="mt-4 text-lg font-semibold text-foreground">No games found</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							No games match "{data.searchQuery}". Try a different search term.
						</p>
						<Button variant="outline" class="mt-4" onclick={clearSearch}>Clear Search</Button>
					{:else}
						<h2 class="mt-4 text-lg font-semibold text-foreground">No games in catalog</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							Get started by adding your first game to the catalog.
						</p>
						<Button class="mt-4" href={resolve('/admin/games/add')}>
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
							Add First Game
						</Button>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Game</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete "{gameToDelete?.title}"?
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
			<strong>Warning:</strong> This will permanently remove the game from the shared catalog and delete
			it from all users' libraries.
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={closeDeleteDialog} disabled={isDeleting}>Cancel</Button>
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isDeleting = true;
					return async ({ update }) => {
						await update();
						isDeleting = false;
						closeDeleteDialog();
					};
				}}
			>
				<input type="hidden" name="gameId" value={gameToDelete?.id ?? ''} />
				<Button type="submit" variant="destructive" disabled={isDeleting}>
					{#if isDeleting}
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
					{/if}
					Delete Game
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
