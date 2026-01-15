<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();
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
			<h1 class="text-3xl font-bold text-foreground">Edit Game</h1>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Game Details</Card.Title>
				<Card.Description>Update the information for your board game.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" use:enhance class="space-y-6">
					{#if form?.error}
						<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
							{form.error}
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="title">Title <span class="text-destructive">*</span></Label>
						<Input
							id="title"
							name="title"
							type="text"
							placeholder="e.g., Catan"
							value={form?.title ?? data.game.title}
							required
						/>
						{#if form?.errors?.title}
							<p class="text-sm text-destructive">{form.errors.title}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="year">Year Published</Label>
						<Input
							id="year"
							name="year"
							type="number"
							placeholder="e.g., 1995"
							value={form?.year ?? data.game.year ?? ''}
							min="1"
							max={new Date().getFullYear() + 1}
						/>
						{#if form?.errors?.year}
							<p class="text-sm text-destructive">{form.errors.year}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label>Player Count</Label>
						<div class="flex items-center gap-2">
							<Input
								id="minPlayers"
								name="minPlayers"
								type="number"
								placeholder="Min"
								value={form?.minPlayers ?? data.game.minPlayers ?? ''}
								min="1"
								class="flex-1"
							/>
							<span class="text-muted-foreground">to</span>
							<Input
								id="maxPlayers"
								name="maxPlayers"
								type="number"
								placeholder="Max"
								value={form?.maxPlayers ?? data.game.maxPlayers ?? ''}
								min="1"
								class="flex-1"
							/>
						</div>
						{#if form?.errors?.players}
							<p class="text-sm text-destructive">{form.errors.players}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label>Play Time (minutes)</Label>
						<div class="flex items-center gap-2">
							<Input
								id="playTimeMin"
								name="playTimeMin"
								type="number"
								placeholder="Min"
								value={form?.playTimeMin ?? data.game.playTimeMin ?? ''}
								min="1"
								class="flex-1"
							/>
							<span class="text-muted-foreground">to</span>
							<Input
								id="playTimeMax"
								name="playTimeMax"
								type="number"
								placeholder="Max"
								value={form?.playTimeMax ?? data.game.playTimeMax ?? ''}
								min="1"
								class="flex-1"
							/>
						</div>
						{#if form?.errors?.playTime}
							<p class="text-sm text-destructive">{form.errors.playTime}</p>
						{/if}
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
