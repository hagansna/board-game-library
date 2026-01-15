<script lang="ts">
	import GameCard from '$lib/components/GameCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<div class="min-h-screen bg-background">
	<div class="mx-auto max-w-6xl px-4 py-8">
		<div class="mb-8 flex items-center justify-between">
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

		{#if data.games.length === 0}
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
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.games as game (game.id)}
					<GameCard
						id={game.id}
						title={game.title}
						year={game.year}
						minPlayers={game.minPlayers}
						maxPlayers={game.maxPlayers}
						playTimeMin={game.playTimeMin}
						playTimeMax={game.playTimeMax}
						boxArtUrl={game.boxArtUrl}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
