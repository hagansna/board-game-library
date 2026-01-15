<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	interface Props {
		title: string;
		year?: number | null;
		minPlayers?: number | null;
		maxPlayers?: number | null;
		playTimeMin?: number | null;
		playTimeMax?: number | null;
	}

	let { title, year, minPlayers, maxPlayers, playTimeMin, playTimeMax }: Props = $props();

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
</Card.Root>
