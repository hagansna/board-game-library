<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { resolve } from '$app/paths';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<header class="border-b border-border bg-background">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
			<a href={resolve('/')} class="text-xl font-bold text-foreground">Board Game Library</a>
			<div class="flex items-center gap-4">
				<span class="text-sm text-muted-foreground">{data.user.email}</span>
				<ThemeToggle />
				<form action="/auth/logout" method="POST">
					<Button type="submit" variant="outline" size="sm">Logout</Button>
				</form>
			</div>
		</div>
	</header>
{:else}
	<header class="border-b border-border bg-background">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
			<a href={resolve('/')} class="text-xl font-bold text-foreground">Board Game Library</a>
			<ThemeToggle />
		</div>
	</header>
{/if}

{@render children()}
