<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();
	let isSubmitting = $state(false);

	// Initialize form values from existing game data or form submission
	let boxArtPreviewUrl = $state(form?.boxArtUrl ?? data.game.boxArtUrl ?? '');

	// Convert categories array to comma-separated string for form
	function categoriesToString(categories: string[] | null): string {
		if (!categories || categories.length === 0) return '';
		return categories.join(', ');
	}

	function updatePreview(url: string) {
		boxArtPreviewUrl = url;
	}
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-2xl space-y-8">
		<div class="flex items-center gap-4">
			<Button variant="outline" href={resolve('/admin/games')}>
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
				<Card.Title>Game Information</Card.Title>
				<Card.Description>
					Update the game details in the shared catalog. Changes will be visible to all users.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}}
					class="space-y-6"
				>
					{#if form?.errors?.general}
						<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
							{form.errors.general}
						</div>
					{/if}

					<!-- Basic Information -->
					<div class="space-y-4">
						<h3 class="text-sm font-medium text-foreground">Basic Information</h3>

						<div class="space-y-2">
							<Label for="title">Title *</Label>
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

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="year">Year Published</Label>
								<Input
									id="year"
									name="year"
									type="number"
									min="1"
									max={new Date().getFullYear() + 1}
									placeholder="e.g., 1995"
									value={form?.year ?? data.game.year ?? ''}
								/>
								{#if form?.errors?.year}
									<p class="text-sm text-destructive">{form.errors.year}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="suggestedAge">Suggested Age</Label>
								<Input
									id="suggestedAge"
									name="suggestedAge"
									type="number"
									min="1"
									max="21"
									placeholder="e.g., 10"
									value={form?.suggestedAge ?? data.game.suggestedAge ?? ''}
								/>
								<p class="text-xs text-muted-foreground">Minimum recommended age</p>
								{#if form?.errors?.suggestedAge}
									<p class="text-sm text-destructive">{form.errors.suggestedAge}</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Player Count -->
					<div class="space-y-4 border-t pt-6">
						<h3 class="text-sm font-medium text-foreground">Player Count</h3>

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="minPlayers">Min Players</Label>
								<Input
									id="minPlayers"
									name="minPlayers"
									type="number"
									min="1"
									placeholder="e.g., 2"
									value={form?.minPlayers ?? data.game.minPlayers ?? ''}
								/>
								{#if form?.errors?.minPlayers}
									<p class="text-sm text-destructive">{form.errors.minPlayers}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="maxPlayers">Max Players</Label>
								<Input
									id="maxPlayers"
									name="maxPlayers"
									type="number"
									min="1"
									placeholder="e.g., 4"
									value={form?.maxPlayers ?? data.game.maxPlayers ?? ''}
								/>
								{#if form?.errors?.maxPlayers}
									<p class="text-sm text-destructive">{form.errors.maxPlayers}</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Play Time -->
					<div class="space-y-4 border-t pt-6">
						<h3 class="text-sm font-medium text-foreground">Play Time (minutes)</h3>

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="playTimeMin">Min Play Time</Label>
								<Input
									id="playTimeMin"
									name="playTimeMin"
									type="number"
									min="1"
									placeholder="e.g., 60"
									value={form?.playTimeMin ?? data.game.playTimeMin ?? ''}
								/>
								{#if form?.errors?.playTimeMin}
									<p class="text-sm text-destructive">{form.errors.playTimeMin}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="playTimeMax">Max Play Time</Label>
								<Input
									id="playTimeMax"
									name="playTimeMax"
									type="number"
									min="1"
									placeholder="e.g., 120"
									value={form?.playTimeMax ?? data.game.playTimeMax ?? ''}
								/>
								{#if form?.errors?.playTimeMax}
									<p class="text-sm text-destructive">{form.errors.playTimeMax}</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Description & Categories -->
					<div class="space-y-4 border-t pt-6">
						<h3 class="text-sm font-medium text-foreground">Description & Categories</h3>

						<div class="space-y-2">
							<Label for="description">Description</Label>
							<textarea
								id="description"
								name="description"
								rows="4"
								placeholder="Brief description of the game..."
								class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								>{form?.description ?? data.game.description ?? ''}</textarea
							>
							{#if form?.errors?.description}
								<p class="text-sm text-destructive">{form.errors.description}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="categories">Categories</Label>
							<Input
								id="categories"
								name="categories"
								type="text"
								placeholder="e.g., Strategy, Family, Trading"
								value={form?.categories ?? categoriesToString(data.game.categories)}
							/>
							<p class="text-xs text-muted-foreground">Comma-separated list of categories</p>
							{#if form?.errors?.categories}
								<p class="text-sm text-destructive">{form.errors.categories}</p>
							{/if}
						</div>
					</div>

					<!-- BoardGameGeek Information -->
					<div class="space-y-4 border-t pt-6">
						<h3 class="text-sm font-medium text-foreground">BoardGameGeek Information</h3>

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="bggRating">BGG Rating</Label>
								<Input
									id="bggRating"
									name="bggRating"
									type="number"
									min="0"
									max="10"
									step="0.1"
									placeholder="e.g., 7.5"
									value={form?.bggRating ?? data.game.bggRating ?? ''}
								/>
								<p class="text-xs text-muted-foreground">0-10 scale</p>
								{#if form?.errors?.bggRating}
									<p class="text-sm text-destructive">{form.errors.bggRating}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="bggRank">BGG Rank</Label>
								<Input
									id="bggRank"
									name="bggRank"
									type="number"
									min="1"
									placeholder="e.g., 150"
									value={form?.bggRank ?? data.game.bggRank ?? ''}
								/>
								<p class="text-xs text-muted-foreground">Overall ranking</p>
								{#if form?.errors?.bggRank}
									<p class="text-sm text-destructive">{form.errors.bggRank}</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Box Art -->
					<div class="space-y-4 border-t pt-6">
						<h3 class="text-sm font-medium text-foreground">Box Art</h3>

						<div class="space-y-2">
							<Label for="boxArtUrl">Image URL</Label>
							<Input
								id="boxArtUrl"
								name="boxArtUrl"
								type="url"
								placeholder="https://example.com/image.jpg"
								value={form?.boxArtUrl ?? data.game.boxArtUrl ?? ''}
								oninput={(e) => updatePreview((e.target as HTMLInputElement).value)}
							/>
							{#if form?.errors?.boxArtUrl}
								<p class="text-sm text-destructive">{form.errors.boxArtUrl}</p>
							{/if}
						</div>

						{#if boxArtPreviewUrl}
							<div class="mt-4">
								<p class="mb-2 text-sm text-muted-foreground">Preview:</p>
								<img
									src={boxArtPreviewUrl}
									alt="Box art preview"
									class="h-32 w-32 rounded object-cover"
									onerror={(e) => {
										(e.target as HTMLImageElement).style.display = 'none';
									}}
								/>
							</div>
						{/if}
					</div>

					<div class="flex gap-4 border-t pt-6">
						<Button type="button" variant="outline" href={resolve('/admin/games')} class="flex-1">
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting} class="flex-1">
							{#if isSubmitting}
								<svg
									class="mr-2 h-4 w-4 animate-spin"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							{/if}
							Save Changes
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
