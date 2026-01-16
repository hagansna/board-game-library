<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import StarRating from '$lib/components/StarRating.svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	// Get game info from the library entry (read-only display)
	const game = data.libraryEntry;
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-lg space-y-8">
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
			<h1 class="text-3xl font-bold text-foreground">Edit Library Entry</h1>
		</div>

		<!-- Game Info Card (Read-Only) -->
		<Card.Root>
			<Card.Header>
				<Card.Title>{game.title}</Card.Title>
				<Card.Description>
					Game information from the shared catalog (read-only)
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Box Art -->
				{#if game.boxArtUrl}
					<div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
						<img
							src={game.boxArtUrl}
							alt="Box art for {game.title}"
							class="h-full w-full object-contain"
						/>
					</div>
				{/if}

				<!-- Game Metadata Grid -->
				<div class="grid grid-cols-2 gap-4 text-sm">
					{#if game.year}
						<div>
							<span class="text-muted-foreground">Year:</span>
							<span class="ml-2 font-medium">{game.year}</span>
						</div>
					{/if}
					{#if game.minPlayers || game.maxPlayers}
						<div>
							<span class="text-muted-foreground">Players:</span>
							<span class="ml-2 font-medium">
								{#if game.minPlayers && game.maxPlayers}
									{game.minPlayers === game.maxPlayers
										? `${game.minPlayers}`
										: `${game.minPlayers}-${game.maxPlayers}`}
								{:else if game.minPlayers}
									{game.minPlayers}+
								{:else}
									Up to {game.maxPlayers}
								{/if}
							</span>
						</div>
					{/if}
					{#if game.playTimeMin || game.playTimeMax}
						<div>
							<span class="text-muted-foreground">Play Time:</span>
							<span class="ml-2 font-medium">
								{#if game.playTimeMin && game.playTimeMax}
									{game.playTimeMin === game.playTimeMax
										? `${game.playTimeMin} min`
										: `${game.playTimeMin}-${game.playTimeMax} min`}
								{:else if game.playTimeMin}
									{game.playTimeMin}+ min
								{:else}
									Up to {game.playTimeMax} min
								{/if}
							</span>
						</div>
					{/if}
					{#if game.suggestedAge}
						<div>
							<span class="text-muted-foreground">Ages:</span>
							<span class="ml-2 font-medium">{game.suggestedAge}+</span>
						</div>
					{/if}
					{#if game.bggRating}
						<div>
							<span class="text-muted-foreground">BGG Rating:</span>
							<span class="ml-2 font-medium">{game.bggRating.toFixed(1)}</span>
						</div>
					{/if}
					{#if game.bggRank}
						<div>
							<span class="text-muted-foreground">BGG Rank:</span>
							<span class="ml-2 font-medium">#{game.bggRank}</span>
						</div>
					{/if}
				</div>

				<!-- Categories -->
				{#if game.categories && game.categories.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each game.categories as category}
							<span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
								{category}
							</span>
						{/each}
					</div>
				{/if}

				<!-- Description -->
				{#if game.description}
					<p class="text-sm text-muted-foreground">{game.description}</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Personal Tracking Card (Editable) -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Your Personal Stats</Card.Title>
				<Card.Description>Update your personal tracking information for this game.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" use:enhance class="space-y-6">
					{#if form?.error}
						<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
							{form.error}
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="playCount">Play Count</Label>
						<Input
							id="playCount"
							name="playCount"
							type="number"
							min="0"
							placeholder="e.g., 5"
							value={form?.playCount ?? game.playCount ?? ''}
						/>
						<p class="text-xs text-muted-foreground">How many times you've played this game</p>
						{#if form?.errors?.playCount}
							<p class="text-sm text-destructive">{form.errors.playCount}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label>Personal Rating</Label>
						<StarRating
							value={form?.personalRating ? parseInt(form.personalRating) : game.personalRating}
							name="personalRating"
						/>
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
							rows="4"
							class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>{form?.review ?? game.review ?? ''}</textarea
						>
						<p class="text-xs text-muted-foreground">Your personal review or notes about this game</p>
					</div>

					<div class="flex gap-4 pt-4">
						<Button type="button" variant="outline" href={resolve('/games')} class="flex-1"
							>Cancel</Button
						>
						<Button type="submit" class="flex-1">Save Changes</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
