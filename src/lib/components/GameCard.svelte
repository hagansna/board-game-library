<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import StarRating from '$lib/components/StarRating.svelte';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	interface Props {
		libraryEntryId: string; // The library_games entry ID (for delete/playcount actions)
		gameId: string; // The games table ID (for edit page)
		title: string;
		year?: number | null;
		minPlayers?: number | null;
		maxPlayers?: number | null;
		playTimeMin?: number | null;
		playTimeMax?: number | null;
		boxArtUrl?: string | null;
		description?: string | null;
		categories?: string[] | null;
		bggRating?: number | null;
		bggRank?: number | null;
		suggestedAge?: number | null;
		playCount?: number | null;
		review?: string | null;
		personalRating?: number | null;
	}

	let {
		libraryEntryId,
		gameId,
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
		bggRank,
		suggestedAge,
		playCount,
		review,
		personalRating
	}: Props = $props();

	// Categories are already an array from the database
	const categoryList = $derived(categories ?? []);

	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);
	let imageError = $state(false);
	let expandedModalOpen = $state(false);
	let modalImageError = $state(false);

	// Local state for play count that can be updated without closing modal
	let localPlayCount = $state(playCount ?? 0);
	let isUpdatingPlayCount = $state(false);

	// Sync local state when prop changes (e.g., after page data reload)
	$effect(() => {
		localPlayCount = playCount ?? 0;
	});

	function handleImageError() {
		imageError = true;
	}

	function handleModalImageError() {
		modalImageError = true;
	}

	function openExpandedModal(event: MouseEvent) {
		// Prevent opening modal if clicking on Edit/Delete buttons
		const target = event.target as HTMLElement;
		if (target.closest('a[href]') || target.closest('button') || target.closest('form')) {
			return;
		}
		expandedModalOpen = true;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			const target = event.target as HTMLElement;
			// Only trigger if focusing on the card itself, not buttons/links inside
			if (
				!target.closest('a[href]') &&
				!target.closest('button') &&
				!target.closest('form') &&
				!target.closest('input')
			) {
				event.preventDefault();
				expandedModalOpen = true;
			}
		}
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<Card.Root
	class="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
	onclick={openExpandedModal}
	onkeydown={handleKeyDown}
	tabindex="0"
	role="button"
	aria-label="Click to view details for {title}"
>
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
		<!-- Player count, play time, and suggested age -->
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
			{#if suggestedAge != null}
				<span class="flex items-center gap-1" title="Suggested minimum age">
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
						<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
					Ages {suggestedAge}+
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
		<Button variant="outline" size="sm" href={resolve(`/games/${libraryEntryId}/edit`)}>
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
						<input type="hidden" name="libraryEntryId" value={libraryEntryId} />
						<Button type="submit" variant="destructive" disabled={isDeleting}>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</Button>
					</form>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</Card.Footer>
</Card.Root>

<!-- Expanded Game Modal -->
<Dialog.Root bind:open={expandedModalOpen}>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="text-2xl">{title}</Dialog.Title>
			{#if year}
				<Dialog.Description class="text-base">Published in {year}</Dialog.Description>
			{/if}
		</Dialog.Header>

		<div class="space-y-6">
			<!-- Larger Box Art Image -->
			{#if boxArtUrl && !modalImageError}
				<div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
					<img
						src={boxArtUrl}
						alt="Box art for {title}"
						onerror={handleModalImageError}
						class="h-full w-full object-contain"
					/>
				</div>
			{:else if boxArtUrl === null || boxArtUrl === undefined || modalImageError}
				<!-- Placeholder when no box art -->
				<div class="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="64"
						height="64"
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

			<!-- Game Metadata Grid -->
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{#if playersText}
					<div class="flex items-center gap-2 text-sm">
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
							<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
						<span>{playersText}</span>
					</div>
				{/if}
				{#if playTimeText}
					<div class="flex items-center gap-2 text-sm">
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
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
						<span>{playTimeText}</span>
					</div>
				{/if}
				{#if suggestedAge != null}
					<div class="flex items-center gap-2 text-sm" title="Suggested minimum age">
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
							<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
						<span>Ages {suggestedAge}+</span>
					</div>
				{/if}
			</div>

			<!-- BGG Rating and Rank -->
			{#if bggRating != null || bggRank != null}
				<div class="flex flex-wrap gap-4 rounded-lg bg-muted/50 p-4">
					<h3 class="w-full text-sm font-medium text-muted-foreground">BoardGameGeek</h3>
					{#if bggRating != null}
						<div class="flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="text-yellow-500"
							>
								<polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								/>
							</svg>
							<span class="text-lg font-semibold">{bggRating.toFixed(1)}</span>
							<span class="text-sm text-muted-foreground">/ 10</span>
						</div>
					{/if}
					{#if bggRank != null}
						<div class="flex items-center gap-2">
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
								<line x1="18" x2="18" y1="20" y2="10" />
								<line x1="12" x2="12" y1="20" y2="4" />
								<line x1="6" x2="6" y1="20" y2="14" />
							</svg>
							<span class="text-lg font-semibold">#{bggRank}</span>
							<span class="text-sm text-muted-foreground">Overall Rank</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Categories -->
			{#if categoryList.length > 0}
				<div>
					<h3 class="mb-2 text-sm font-medium text-muted-foreground">Categories</h3>
					<div class="flex flex-wrap gap-2">
						{#each categoryList as category}
							<span class="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
								{category}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Full Description -->
			{#if description}
				<div>
					<h3 class="mb-2 text-sm font-medium text-muted-foreground">Description</h3>
					<p class="text-sm leading-relaxed text-foreground">{description}</p>
				</div>
			{/if}

			<!-- Personal Stats Section -->
			<div class="space-y-4 rounded-lg border bg-card p-4">
				<h3 class="text-sm font-medium text-muted-foreground">Your Personal Stats</h3>

				<!-- Play Count with +/- buttons -->
				<div class="flex items-center gap-3">
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
						<polygon points="6 3 20 12 6 21 6 3" />
					</svg>
					<div class="flex items-center gap-2">
						<form
							method="POST"
							action="?/decrementPlayCount"
							use:enhance={() => {
								isUpdatingPlayCount = true;
								return async ({ result }) => {
									isUpdatingPlayCount = false;
									if (result.type === 'success' && result.data?.playCount !== undefined) {
										localPlayCount = result.data.playCount as number;
									}
								};
							}}
						>
							<input type="hidden" name="libraryEntryId" value={libraryEntryId} />
							<Button
								type="submit"
								variant="outline"
								size="sm"
								class="h-8 w-8 p-0"
								disabled={isUpdatingPlayCount || localPlayCount <= 0}
								aria-label="Decrement play count"
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
									<line x1="5" x2="19" y1="12" y2="12" />
								</svg>
							</Button>
						</form>
						<span class="min-w-[3rem] text-center text-lg font-semibold">
							{#if isUpdatingPlayCount}
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
									class="mx-auto animate-spin"
								>
									<path d="M21 12a9 9 0 1 1-6.219-8.56" />
								</svg>
							{:else}
								{localPlayCount}
							{/if}
						</span>
						<form
							method="POST"
							action="?/incrementPlayCount"
							use:enhance={() => {
								isUpdatingPlayCount = true;
								return async ({ result }) => {
									isUpdatingPlayCount = false;
									if (result.type === 'success' && result.data?.playCount !== undefined) {
										localPlayCount = result.data.playCount as number;
									}
								};
							}}
						>
							<input type="hidden" name="libraryEntryId" value={libraryEntryId} />
							<Button
								type="submit"
								variant="outline"
								size="sm"
								class="h-8 w-8 p-0"
								disabled={isUpdatingPlayCount}
								aria-label="Increment play count"
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
									<line x1="12" x2="12" y1="5" y2="19" />
									<line x1="5" x2="19" y1="12" y2="12" />
								</svg>
							</Button>
						</form>
					</div>
					<span class="text-sm text-muted-foreground">
						{localPlayCount === 1 ? 'play' : 'plays'}
					</span>
				</div>

				<!-- Personal Rating -->
				{#if personalRating != null}
					<div class="flex items-center gap-2">
						<span class="text-sm text-muted-foreground">Your Rating:</span>
						<StarRating value={personalRating} readonly={true} size="md" />
						<span class="ml-1 text-sm text-muted-foreground">{personalRating}/5</span>
					</div>
				{/if}

				<!-- Personal Review -->
				{#if review}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">Your Review</h4>
						<p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
							{review}
						</p>
					</div>
				{/if}
			</div>
		</div>

		<Dialog.Footer class="mt-6 flex-col gap-2 sm:flex-row">
			<Button variant="outline" href={resolve(`/games/${libraryEntryId}/edit`)}>
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
					<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
					<path d="m15 5 4 4" />
				</svg>
				Edit Game
			</Button>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="secondary">Close</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
