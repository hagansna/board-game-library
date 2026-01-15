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
			<Button href={resolve('/games/add')}>Add Game</Button>
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
						title={game.title}
						year={game.year}
						minPlayers={game.minPlayers}
						maxPlayers={game.maxPlayers}
						playTimeMin={game.playTimeMin}
						playTimeMax={game.playTimeMax}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
