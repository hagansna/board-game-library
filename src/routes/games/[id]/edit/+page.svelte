<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	// Get initial box art URL from form (on validation error) or from existing game data
	let boxArtPreview = $state<string | null>(form?.boxArtUrl || data.game.boxArtUrl || null);
	let boxArtUrlInput = $state(
		form?.boxArtUrl || (data.game.boxArtUrl?.startsWith('/') ? '' : data.game.boxArtUrl) || ''
	);
	let fileInput = $state<HTMLInputElement | null>(null);
	let removeBoxArt = $state(false);

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			// Clear URL input when file is selected
			boxArtUrlInput = '';
			removeBoxArt = false;
			// Create preview URL
			boxArtPreview = URL.createObjectURL(file);
		}
	}

	function handleUrlInput(event: Event) {
		const target = event.target as HTMLInputElement;
		boxArtUrlInput = target.value;
		removeBoxArt = false;
		// Clear file input when URL is entered
		if (fileInput) {
			fileInput.value = '';
		}
		if (boxArtUrlInput) {
			boxArtPreview = boxArtUrlInput;
		} else {
			boxArtPreview = null;
		}
	}

	function clearBoxArt() {
		boxArtUrlInput = '';
		boxArtPreview = null;
		removeBoxArt = true;
		if (fileInput) {
			fileInput.value = '';
		}
	}

	$effect(() => {
		return () => {
			// Cleanup object URL on component destroy
			if (boxArtPreview && boxArtPreview.startsWith('blob:')) {
				URL.revokeObjectURL(boxArtPreview);
			}
		};
	});
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
				<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
					<input type="hidden" name="removeBoxArt" value={removeBoxArt ? 'true' : 'false'} />
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

					<div class="space-y-4">
						<Label>Box Art (optional)</Label>
						<div class="space-y-3">
							<div class="space-y-2">
								<Label for="boxArtUrl" class="text-sm text-muted-foreground">Image URL</Label>
								<Input
									id="boxArtUrl"
									name="boxArtUrl"
									type="url"
									placeholder="https://example.com/image.jpg"
									value={boxArtUrlInput}
									oninput={handleUrlInput}
								/>
							</div>
							<div class="flex items-center gap-2">
								<div class="h-px flex-1 bg-border"></div>
								<span class="text-xs text-muted-foreground">OR</span>
								<div class="h-px flex-1 bg-border"></div>
							</div>
							<div class="space-y-2">
								<Label for="boxArtFile" class="text-sm text-muted-foreground">Upload File</Label>
								<Input
									id="boxArtFile"
									name="boxArtFile"
									type="file"
									accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
									bind:this={fileInput}
									onchange={handleFileSelect}
									class="cursor-pointer"
								/>
								<p class="text-xs text-muted-foreground">Max 5MB. JPG, PNG, or WebP.</p>
							</div>
						</div>
						{#if boxArtPreview}
							<div class="relative mt-4">
								<img
									src={boxArtPreview}
									alt="Box art preview"
									class="h-48 w-auto rounded-md border object-contain"
									onerror={() => (boxArtPreview = null)}
								/>
								<Button
									type="button"
									variant="destructive"
									size="sm"
									class="absolute top-2 right-2"
									onclick={clearBoxArt}
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
										<path d="M18 6 6 18" />
										<path d="m6 6 12 12" />
									</svg>
								</Button>
							</div>
						{/if}
						{#if form?.errors?.boxArt}
							<p class="text-sm text-destructive">{form.errors.boxArt}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="description">Description</Label>
						<textarea
							id="description"
							name="description"
							placeholder="Brief description of the game..."
							rows="3"
							class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>{form?.description ?? data.game.description ?? ''}</textarea
						>
					</div>

					<div class="space-y-2">
						<Label for="categories">Categories</Label>
						<Input
							id="categories"
							name="categories"
							type="text"
							placeholder="e.g., strategy, trading, family (comma-separated)"
							value={form?.categories ??
								(data.game.categories ? JSON.parse(data.game.categories).join(', ') : '')}
						/>
						<p class="text-xs text-muted-foreground">Separate categories with commas</p>
					</div>

					<div class="space-y-2">
						<Label>BoardGameGeek Info</Label>
						<div class="flex items-center gap-4">
							<div class="flex-1 space-y-1">
								<Label for="bggRating" class="text-sm text-muted-foreground">Rating</Label>
								<Input
									id="bggRating"
									name="bggRating"
									type="number"
									step="0.1"
									min="0"
									max="10"
									placeholder="e.g., 7.5"
									value={form?.bggRating ?? data.game.bggRating ?? ''}
								/>
							</div>
							<div class="flex-1 space-y-1">
								<Label for="bggRank" class="text-sm text-muted-foreground">Rank</Label>
								<Input
									id="bggRank"
									name="bggRank"
									type="number"
									min="1"
									placeholder="e.g., 150"
									value={form?.bggRank ?? data.game.bggRank ?? ''}
								/>
							</div>
						</div>
						{#if form?.errors?.bggRating}
							<p class="text-sm text-destructive">{form.errors.bggRating}</p>
						{/if}
						{#if form?.errors?.bggRank}
							<p class="text-sm text-destructive">{form.errors.bggRank}</p>
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
