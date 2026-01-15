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
	}

	let { id, title, year, minPlayers, maxPlayers, playTimeMin, playTimeMax }: Props = $props();

	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);

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

<Card.Root class="transition-shadow hover:shadow-md">
	<Card.Header>
		<Card.Title class="text-lg">{title}</Card.Title>
		{#if year}
			<Card.Description>{year}</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content>
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
					<Button {...props} variant="outline" size="sm" class="text-destructive hover:bg-destructive hover:text-destructive-foreground">
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
						Are you sure you want to delete "{title}" from your library? This action cannot be undone.
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
