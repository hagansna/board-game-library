<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { form } = $props();

	// State for drag and drop
	let isDragging = $state(false);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let isUploading = $state(false);

	// File input reference
	let fileInput: HTMLInputElement;

	// Allowed file types
	const acceptedTypes = '.jpg,.jpeg,.png,.heic,.heif';
	const maxFileSizeMB = 10;
	const maxFileSize = maxFileSizeMB * 1024 * 1024;

	// Handle file selection
	function handleFileSelect(file: File | null) {
		if (!file) return;

		// Client-side validation for immediate feedback
		const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
		if (!validTypes.includes(file.type.toLowerCase())) {
			// Let server handle validation error
			selectedFile = file;
			previewUrl = null;
			return;
		}

		if (file.size > maxFileSize) {
			// Let server handle validation error
			selectedFile = file;
			previewUrl = null;
			return;
		}

		selectedFile = file;

		// Create preview URL for valid images
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = URL.createObjectURL(file);
	}

	// Handle input change
	function onInputChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		handleFileSelect(file);
	}

	// Handle drag events
	function onDragEnter(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = true;
	}

	function onDragLeave(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = false;
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = true;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = false;

		const file = event.dataTransfer?.files[0] ?? null;
		if (file) {
			handleFileSelect(file);
			// Update the file input so form submission works
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(file);
			fileInput.files = dataTransfer.files;
		}
	}

	// Handle click on drop zone
	function onDropZoneClick() {
		fileInput.click();
	}

	// Clear selected file
	function clearFile() {
		selectedFile = null;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		if (fileInput) {
			fileInput.value = '';
		}
	}

	// Format file size for display
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Cleanup on component destroy
	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	// Reset uploading state when form response arrives
	$effect(() => {
		if (form) {
			isUploading = false;
		}
	});
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-2xl space-y-8">
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
			<h1 class="text-3xl font-bold text-foreground">Upload Board Game Photo</h1>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Upload Image</Card.Title>
				<Card.Description>
					Take a photo of your board game box and we'll use AI to identify the game details.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/upload"
					enctype="multipart/form-data"
					use:enhance={() => {
						isUploading = true;
						return async ({ update }) => {
							await update();
							isUploading = false;
						};
					}}
					class="space-y-6"
				>
					{#if form?.error}
						<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
							{form.error}
						</div>
					{/if}

					{#if form?.success}
						<div class="rounded-md bg-green-500/15 p-3 text-sm text-green-700 dark:text-green-400">
							Image uploaded successfully! Ready for AI analysis.
						</div>
					{/if}

					<!-- Drop zone -->
					<div
						class="relative cursor-pointer rounded-lg border-2 border-dashed transition-colors
							{isDragging
							? 'border-primary bg-primary/5'
							: 'border-border hover:border-primary/50 hover:bg-muted/50'}"
						role="button"
						tabindex="0"
						ondragenter={onDragEnter}
						ondragleave={onDragLeave}
						ondragover={onDragOver}
						ondrop={onDrop}
						onclick={onDropZoneClick}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onDropZoneClick();
							}
						}}
					>
						<input
							bind:this={fileInput}
							type="file"
							name="image"
							accept={acceptedTypes}
							onchange={onInputChange}
							class="sr-only"
						/>

						{#if previewUrl && selectedFile}
							<!-- Preview state -->
							<div class="p-6">
								<div class="flex flex-col items-center gap-4">
									<div class="relative">
										<img
											src={previewUrl}
											alt="Preview of {selectedFile.name}"
											class="max-h-64 rounded-lg object-contain shadow-md"
										/>
										<button
											type="button"
											onclick={(e) => {
												e.stopPropagation();
												clearFile();
											}}
											class="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-md hover:bg-destructive/90"
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
										</button>
									</div>
									<div class="text-center">
										<p class="font-medium text-foreground">{selectedFile.name}</p>
										<p class="text-sm text-muted-foreground">
											{formatFileSize(selectedFile.size)}
										</p>
									</div>
								</div>
							</div>
						{:else}
							<!-- Empty state -->
							<div class="flex flex-col items-center justify-center p-12">
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
									class="mb-4 text-muted-foreground"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="17 8 12 3 7 8" />
									<line x1="12" x2="12" y1="3" y2="15" />
								</svg>
								<p class="mb-1 text-lg font-medium text-foreground">
									{isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
								</p>
								<p class="text-sm text-muted-foreground">
									Supports JPG, PNG, HEIC (max {maxFileSizeMB}MB)
								</p>
							</div>
						{/if}
					</div>

					<div class="flex gap-4">
						<Button type="button" variant="outline" href={resolve('/games')} class="flex-1">
							Cancel
						</Button>
						<Button type="submit" class="flex-1" disabled={!selectedFile || isUploading}>
							{#if isUploading}
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
								Uploading...
							{:else}
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
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="17 8 12 3 7 8" />
									<line x1="12" x2="12" y1="3" y2="15" />
								</svg>
								Upload Image
							{/if}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Help section -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Tips for best results</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex items-start gap-2">
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
							class="mt-0.5 shrink-0 text-primary"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Take a clear photo of the front of the game box
					</li>
					<li class="flex items-start gap-2">
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
							class="mt-0.5 shrink-0 text-primary"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Ensure good lighting and minimal glare
					</li>
					<li class="flex items-start gap-2">
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
							class="mt-0.5 shrink-0 text-primary"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Include the game title and any visible information (year, players, play time)
					</li>
					<li class="flex items-start gap-2">
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
							class="mt-0.5 shrink-0 text-primary"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Avoid blurry or partial images
					</li>
				</ul>
			</Card.Content>
		</Card.Root>
	</div>
</div>
