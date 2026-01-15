<script lang="ts">
	import { theme, type Theme } from '$lib/stores/theme';
	import { Button } from '$lib/components/ui/button';

	let currentTheme: Theme = $state('system');

	theme.subscribe((value) => {
		currentTheme = value;
	});

	function handleClick() {
		theme.toggle();
	}
</script>

<Button
	variant="ghost"
	size="icon-sm"
	onclick={handleClick}
	aria-label="Toggle theme (current: {currentTheme})"
	title="Toggle theme: {currentTheme}"
>
	{#if currentTheme === 'light'}
		<!-- Sun icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
		>
			<circle cx="12" cy="12" r="4"></circle>
			<path d="M12 2v2"></path>
			<path d="M12 20v2"></path>
			<path d="m4.93 4.93 1.41 1.41"></path>
			<path d="m17.66 17.66 1.41 1.41"></path>
			<path d="M2 12h2"></path>
			<path d="M20 12h2"></path>
			<path d="m6.34 17.66-1.41 1.41"></path>
			<path d="m19.07 4.93-1.41 1.41"></path>
		</svg>
	{:else if currentTheme === 'dark'}
		<!-- Moon icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
		>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
		</svg>
	{:else}
		<!-- Monitor/System icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
		>
			<rect width="20" height="14" x="2" y="3" rx="2"></rect>
			<line x1="8" x2="16" y1="21" y2="21"></line>
			<line x1="12" x2="12" y1="17" y2="21"></line>
		</svg>
	{/if}
</Button>
