<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	interface Props {
		id: string;
		title: string;
		year?: number | null;
		minPlayers?: number | null;
		maxPlayers?: number | null;
		playTimeMin?: number | null;
		playTimeMax?: number | null;
		boxArtUrl?: string | null;
		description?: string | null;
		categories?: string | null;
		bggRating?: number | null;
		bggRank?: number | null;
	}

	let {
		id,
		title,
		year,
		minPlayers,
		maxPlayers,
		playTimeMin,
		playTimeMax,
		boxArtUrl,
		description,
		categories,
		bggRating,
		bggRank
	}: Props = $props();

	// Parse categories JSON string to array
	const categoryList = $derived(categories ? (JSON.parse(categories) as string[]) : []);

	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);
	let imageError = $state(false);

	function handleImageError() {
		imageError = true;
	}

	function formatPlayers(min: number | null | undefined, max: number | null | undefined): string {
		if (min == null && max == null) return '';
		if (min != null && max != null) {
			if (min === max) return `${min} players`;
			return `${min}-${max} players`;
		}
		if (min != null) return `${min}+ players`;
		return `Up to ${max} players`;
	}

	function formatPlayTime(min: number | null | undefined, max: number | null | undefined): string {
		if (min == null && max == null) return '';
		if (min != null && max != null) {
			if (min === max) return `${min} min`;
			return `${min}-${max} min`;
		}
		if (min != null) return `${min}+ min`;
		return `Up to ${max} min`;
	}

	const playersText = $derived(formatPlayers(minPlayers, maxPlayers));
	const playTimeText = $derived(formatPlayTime(playTimeMin, playTimeMax));
</script>

<Card.Root class="overflow-hidden transition-shadow hover:shadow-md">
	<!-- Box Art Image -->
	<div class="relative aspect-[4/3] w-full overflow-hidden bg-muted">
		{#if boxArtUrl && !imageError}
			<img
				src={boxArtUrl}
				alt="Box art for {title}"
				loading="lazy"
				onerror={handleImageError}
				class="h-full w-full object-cover"
			/>
		{:else}
			<!-- Placeholder when no box art or image error -->
			<div class="flex h-full w-full items-center justify-center">
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
					class="text-muted-foreground/50"
					aria-hidden="true"
				>
					<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
					<circle cx="9" cy="9" r="2" />
					<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
				</svg>
			</div>
		{/if}
	</div>
	<Card.Header>
		<Card.Title class="text-lg">{title}</Card.Title>
		{#if year}
			<Card.Description>{year}</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content class="space-y-3">
		<!-- Player count and play time -->
		<div class="flex flex-wrap gap-3 text-sm text-muted-foreground">
			{#if playersText}
				<span class="flex items-center gap-1">
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
						class="inline-block"
					>
						<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
					{playersText}
				</span>
			{/if}
			{#if playTimeText}
				<span class="flex items-center gap-1">
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
						class="inline-block"
					>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					{playTimeText}
				</span>
			{/if}
		</div>

		<!-- BGG Rating and Rank -->
		{#if bggRating != null || bggRank != null}
			<div class="flex flex-wrap gap-3 text-sm text-muted-foreground">
				{#if bggRating != null}
					<span class="flex items-center gap-1" title="BoardGameGeek Rating">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="inline-block text-yellow-500"
						>
							<polygon
								points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
							/>
						</svg>
						{bggRating.toFixed(1)}
					</span>
				{/if}
				{#if bggRank != null}
					<span class="flex items-center gap-1" title="BoardGameGeek Rank">
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
							class="inline-block"
						>
							<line x1="18" x2="18" y1="20" y2="10" />
							<line x1="12" x2="12" y1="20" y2="4" />
							<line x1="6" x2="6" y1="20" y2="14" />
						</svg>
						#{bggRank}
					</span>
				{/if}
			</div>
		{/if}

		<!-- Categories as tags -->
		{#if categoryList.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each categoryList as category}
					<span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
						{category}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Description (truncated) -->
		{#if description}
			<p class="line-clamp-2 text-sm text-muted-foreground">{description}</p>
		{/if}
	</Card.Content>
	<Card.Footer class="gap-2 pt-0">
		<Button variant="outline" size="sm" href={resolve(`/games/${id}/edit`)}>
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
				class="mr-1"
			>
				<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
				<path d="m15 5 4 4" />
			</svg>
			Edit
		</Button>
		<Dialog.Root bind:open={deleteDialogOpen}>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="outline"
						size="sm"
						class="text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
							class="mr-1"
						>
							<path d="M3 6h18" />
							<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
							<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
							<line x1="10" x2="10" y1="11" y2="17" />
							<line x1="14" x2="14" y1="11" y2="17" />
						</svg>
						Delete
					</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Delete Game</Dialog.Title>
					<Dialog.Description>
						Are you sure you want to delete "{title}" from your library? This action cannot be
						undone.
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer>
					<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => {
							isDeleting = true;
							return async ({ update }) => {
								await update();
								isDeleting = false;
								deleteDialogOpen = false;
							};
						}}
					>
						<input type="hidden" name="gameId" value={id} />
						<Button type="submit" variant="destructive" disabled={isDeleting}>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</Button>
					</form>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</Card.Footer>
</Card.Root>
