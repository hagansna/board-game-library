<script lang="ts">
	interface Props {
		value?: number | null;
		name?: string;
		readonly?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { value = null, name = 'rating', readonly = false, size = 'md' }: Props = $props();

	// Internal state for the selected rating
	let selectedRating = $state(value ?? 0);

	// Update internal state when value prop changes
	$effect(() => {
		selectedRating = value ?? 0;
	});

	// Hover state for interactive mode
	let hoverRating = $state(0);

	const sizes = {
		sm: 16,
		md: 20,
		lg: 24
	};

	const starSize = $derived(sizes[size]);

	function handleClick(star: number) {
		if (readonly) return;
		// Toggle off if clicking the same star
		if (selectedRating === star) {
			selectedRating = 0;
		} else {
			selectedRating = star;
		}
	}

	function handleKeyDown(event: KeyboardEvent, star: number) {
		if (readonly) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick(star);
		}
	}

	function handleMouseEnter(star: number) {
		if (readonly) return;
		hoverRating = star;
	}

	function handleMouseLeave() {
		if (readonly) return;
		hoverRating = 0;
	}

	// Get the display rating (hover takes priority)
	const displayRating = $derived(hoverRating > 0 ? hoverRating : selectedRating);
</script>

<div class="flex items-center gap-0.5" role="group" aria-label="Star rating">
	{#if !readonly}
		<input type="hidden" {name} value={selectedRating || ''} />
	{/if}
	{#each [1, 2, 3, 4, 5] as star}
		{#if readonly}
			<span class="inline-flex" aria-hidden="true">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={starSize}
					height={starSize}
					viewBox="0 0 24 24"
					fill={star <= displayRating ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class={star <= displayRating ? 'text-yellow-500' : 'text-muted-foreground/40'}
				>
					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
					/>
				</svg>
			</span>
		{:else}
			<button
				type="button"
				class="inline-flex cursor-pointer rounded transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				onclick={() => handleClick(star)}
				onkeydown={(e) => handleKeyDown(e, star)}
				onmouseenter={() => handleMouseEnter(star)}
				onmouseleave={handleMouseLeave}
				aria-label={`Rate ${star} out of 5 stars`}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={starSize}
					height={starSize}
					viewBox="0 0 24 24"
					fill={star <= displayRating ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class={star <= displayRating ? 'text-yellow-500' : 'text-muted-foreground/40'}
				>
					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
					/>
				</svg>
			</button>
		{/if}
	{/each}
	{#if !readonly && selectedRating > 0}
		<span class="ml-2 text-sm text-muted-foreground">{selectedRating}/5</span>
	{/if}
</div>
