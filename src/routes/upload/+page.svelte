<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ExtractedGameData } from '$lib/server/gemini';

	let { form } = $props();

	// State for drag and drop
	let isDragging = $state(false);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let isUploading = $state(false);
	let isAnalyzing = $state(false);

	// State for uploaded image data (from server)
	let uploadedImageData = $state<string | null>(null);
	let uploadedMimeType = $state<string | null>(null);

	// State for AI analysis results
	let analysisResult = $state<ExtractedGameData | null>(null);
	let analysisError = $state<string | null>(null);

	// File input reference
	let fileInput: HTMLInputElement;

	// Allowed file types
	const acceptedTypes = '.jpg,.jpeg,.png,.heic,.heif';
	const maxFileSizeMB = 10;
	const maxFileSize = maxFileSizeMB * 1024 * 1024;

	// Handle file selection
	function handleFileSelect(file: File | null) {
		if (!file) return;

		// Reset analysis state when new file is selected
		analysisResult = null;
		analysisError = null;
		uploadedImageData = null;
		uploadedMimeType = null;

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
		// Reset all analysis state
		analysisResult = null;
		analysisError = null;
		uploadedImageData = null;
		uploadedMimeType = null;
	}

	// Format file size for display
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Get confidence badge color
	function getConfidenceBadgeClass(confidence: string): string {
		switch (confidence) {
			case 'high':
				return 'bg-green-500/15 text-green-700 dark:text-green-400';
			case 'medium':
				return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400';
			case 'low':
				return 'bg-red-500/15 text-red-700 dark:text-red-400';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	// Cleanup on component destroy
	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	// Handle form response updates
	$effect(() => {
		if (form) {
			isUploading = false;
			isAnalyzing = false;

			// Store uploaded image data for analysis
			if (form.success && form.imageData && form.mimeType) {
				uploadedImageData = form.imageData;
				uploadedMimeType = form.mimeType;
			}

			// Store analysis results
			if (form.analyzed && form.gameData) {
				analysisResult = form.gameData;
				analysisError = null;
			}

			// Store analysis error
			if (form.analyzeError) {
				analysisError = form.analyzeError;
				analysisResult = null;
			}
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

					{#if form?.success && !analysisResult && !analysisError}
						<div class="rounded-md bg-green-500/15 p-3 text-sm text-green-700 dark:text-green-400">
							Image uploaded successfully! Click "Analyze with AI" to extract game information.
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
											aria-label="Remove selected image"
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
						<Button
							type="submit"
							class="flex-1"
							disabled={!selectedFile || isUploading || uploadedImageData !== null}
						>
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

		<!-- AI Analysis Section - Shows after upload -->
		{#if uploadedImageData && !analysisResult}
			<Card.Root>
				<Card.Header>
					<Card.Title>AI Analysis</Card.Title>
					<Card.Description>
						Click the button below to analyze the image and extract game information using AI.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if analysisError}
						<div class="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
							{analysisError}
						</div>
					{/if}

					<form
						method="POST"
						action="?/analyze"
						use:enhance={() => {
							isAnalyzing = true;
							return async ({ update }) => {
								await update();
								isAnalyzing = false;
							};
						}}
					>
						<input type="hidden" name="imageData" value={uploadedImageData} />
						<input type="hidden" name="mimeType" value={uploadedMimeType} />

						<Button type="submit" class="w-full" disabled={isAnalyzing}>
							{#if isAnalyzing}
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
								Analyzing with AI...
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
									<path
										d="M12 2a4 4 0 0 0-4 4c0 1.1.45 2.1 1.17 2.83L2 16v6h6l7.17-7.17A4 4 0 1 0 12 2z"
									/>
									<circle cx="12" cy="6" r="1" />
								</svg>
								Analyze with AI
							{/if}
						</Button>
					</form>

					{#if isAnalyzing}
						<div class="mt-4 text-center">
							<p class="text-sm text-muted-foreground">
								This may take a few seconds while the AI examines the image...
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Analysis Results -->
		{#if analysisResult}
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Analysis Results</Card.Title>
						<span
							class="rounded-full px-3 py-1 text-xs font-medium {getConfidenceBadgeClass(
								analysisResult.confidence
							)}"
						>
							{analysisResult.confidence === 'high'
								? 'High'
								: analysisResult.confidence === 'medium'
									? 'Medium'
									: 'Low'} Confidence
						</span>
					</div>
					<Card.Description>
						{#if analysisResult.confidence === 'high'}
							The game was clearly identified from the image.
						{:else if analysisResult.confidence === 'medium'}
							The game was partially identified. Please verify the details.
						{:else}
							The AI could not confidently identify the game. Consider entering details manually.
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#if analysisResult.title}
							<div class="flex justify-between border-b border-border pb-2">
								<span class="font-medium text-muted-foreground">Title</span>
								<span class="text-foreground">{analysisResult.title}</span>
							</div>
						{/if}

						{#if analysisResult.publisher}
							<div class="flex justify-between border-b border-border pb-2">
								<span class="font-medium text-muted-foreground">Publisher</span>
								<span class="text-foreground">{analysisResult.publisher}</span>
							</div>
						{/if}

						{#if analysisResult.year}
							<div class="flex justify-between border-b border-border pb-2">
								<span class="font-medium text-muted-foreground">Year</span>
								<span class="text-foreground">{analysisResult.year}</span>
							</div>
						{/if}

						{#if analysisResult.minPlayers || analysisResult.maxPlayers}
							<div class="flex justify-between border-b border-border pb-2">
								<span class="font-medium text-muted-foreground">Players</span>
								<span class="text-foreground">
									{#if analysisResult.minPlayers && analysisResult.maxPlayers}
										{analysisResult.minPlayers === analysisResult.maxPlayers
											? analysisResult.minPlayers
											: `${analysisResult.minPlayers}-${analysisResult.maxPlayers}`}
									{:else if analysisResult.minPlayers}
										{analysisResult.minPlayers}+
									{:else if analysisResult.maxPlayers}
										Up to {analysisResult.maxPlayers}
									{/if}
								</span>
							</div>
						{/if}

						{#if analysisResult.playTimeMin || analysisResult.playTimeMax}
							<div class="flex justify-between border-b border-border pb-2">
								<span class="font-medium text-muted-foreground">Play Time</span>
								<span class="text-foreground">
									{#if analysisResult.playTimeMin && analysisResult.playTimeMax}
										{analysisResult.playTimeMin === analysisResult.playTimeMax
											? `${analysisResult.playTimeMin} min`
											: `${analysisResult.playTimeMin}-${analysisResult.playTimeMax} min`}
									{:else if analysisResult.playTimeMin}
										{analysisResult.playTimeMin}+ min
									{:else if analysisResult.playTimeMax}
										Up to {analysisResult.playTimeMax} min
									{/if}
								</span>
							</div>
						{/if}

						{#if !analysisResult.title && !analysisResult.publisher && !analysisResult.year && !analysisResult.minPlayers && !analysisResult.maxPlayers && !analysisResult.playTimeMin && !analysisResult.playTimeMax}
							<p class="text-center text-muted-foreground">
								No game information could be extracted from this image. The image may not show a
								board game box, or may be too unclear.
							</p>
						{/if}
					</div>
				</Card.Content>
				<Card.Footer class="flex gap-4">
					<Button variant="outline" onclick={clearFile} class="flex-1">
						Upload Different Image
					</Button>
					{#if analysisResult.title}
						<Button href={resolve('/games/add')} class="flex-1">Add to Library</Button>
					{/if}
				</Card.Footer>
			</Card.Root>
		{/if}

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
