<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { ExtractedGameData } from '$lib/server/gemini';

	let { form } = $props();

	// State for drag and drop
	let isDragging = $state(false);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let isUploading = $state(false);
	let isAnalyzing = $state(false);
	let isAddingToLibrary = $state(false);

	// State for uploaded image data (from server)
	let uploadedImageData = $state<string | null>(null);
	let uploadedMimeType = $state<string | null>(null);

	// State for AI analysis results
	let analysisResult = $state<ExtractedGameData | null>(null);
	let analysisError = $state<string | null>(null);

	// State for manual entry mode (when AI fails or user chooses to skip AI)
	let manualEntryMode = $state(false);

	// Editable form fields for review
	let editTitle = $state('');
	let editPublisher = $state('');
	let editYear = $state('');
	let editMinPlayers = $state('');
	let editMaxPlayers = $state('');
	let editPlayTimeMin = $state('');
	let editPlayTimeMax = $state('');
	// AI-enriched fields
	let editDescription = $state('');
	let editCategories = $state('');
	let editBggRating = $state('');
	let editBggRank = $state('');

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
		// Reset manual entry mode
		manualEntryMode = false;
	}

	// Enter manual entry mode
	function enterManualMode() {
		manualEntryMode = true;
		analysisError = null;
		// Clear any existing form data
		editTitle = '';
		editPublisher = '';
		editYear = '';
		editMinPlayers = '';
		editMaxPlayers = '';
		editPlayTimeMin = '';
		editPlayTimeMax = '';
		editDescription = '';
		editCategories = '';
		editBggRating = '';
		editBggRank = '';
	}

	// Cancel manual entry and return to upload/analysis state
	function cancelManualEntry() {
		manualEntryMode = false;
		// Clear form fields
		editTitle = '';
		editPublisher = '';
		editYear = '';
		editMinPlayers = '';
		editMaxPlayers = '';
		editPlayTimeMin = '';
		editPlayTimeMax = '';
		editDescription = '';
		editCategories = '';
		editBggRating = '';
		editBggRank = '';
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

	// Populate editable fields from analysis result
	function populateEditFields(data: ExtractedGameData) {
		editTitle = data.title ?? '';
		editPublisher = data.publisher ?? '';
		editYear = data.year?.toString() ?? '';
		editMinPlayers = data.minPlayers?.toString() ?? '';
		editMaxPlayers = data.maxPlayers?.toString() ?? '';
		editPlayTimeMin = data.playTimeMin?.toString() ?? '';
		editPlayTimeMax = data.playTimeMax?.toString() ?? '';
		// AI-enriched fields
		editDescription = data.description ?? '';
		editCategories = data.categories?.join(', ') ?? '';
		editBggRating = data.bggRating?.toString() ?? '';
		editBggRank = data.bggRank?.toString() ?? '';
	}

	// Check if AI result indicates a failed recognition (low confidence with no title)
	function isAIRecognitionFailed(gameData: ExtractedGameData | null): boolean {
		if (!gameData) return true;
		// Failed if no title was extracted, regardless of confidence
		return gameData.title === null || gameData.title.trim() === '';
	}

	// Handle form response updates
	$effect(() => {
		if (form) {
			isUploading = false;
			isAnalyzing = false;
			isAddingToLibrary = false;

			// Store uploaded image data for analysis
			if (form.success && form.imageData && form.mimeType) {
				uploadedImageData = form.imageData;
				uploadedMimeType = form.mimeType;
			}

			// Store analysis results and populate editable fields
			if (form.analyzed && form.gameData) {
				// Check if AI couldn't extract a title (failed recognition)
				if (isAIRecognitionFailed(form.gameData)) {
					// Show error message with manual entry option
					analysisError =
						'Could not identify the board game from this image. The image may be unclear, or it may not show a recognizable board game box.';
					analysisResult = null;
				} else {
					analysisResult = form.gameData;
					analysisError = null;
					populateEditFields(form.gameData);
				}
			}

			// Store analysis error
			if (form.analyzeError) {
				analysisError = form.analyzeError;
				analysisResult = null;
			}

			// Handle successful game addition - redirect to library
			if (form.added) {
				goto(resolve('/games'));
			}

			// Handle add to library error
			if (form.addError) {
				// Keep the form open with the error displayed
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
		{#if uploadedImageData && !analysisResult && !manualEntryMode}
			<Card.Root>
				<Card.Header>
					<Card.Title>AI Analysis</Card.Title>
					<Card.Description>
						Click the button below to analyze the image and extract game information using AI.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if analysisError}
						<div class="mb-4 rounded-md bg-destructive/15 p-4">
							<div class="flex items-start gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="mt-0.5 shrink-0 text-destructive"
								>
									<circle cx="12" cy="12" r="10" />
									<line x1="12" x2="12" y1="8" y2="12" />
									<line x1="12" x2="12.01" y1="16" y2="16" />
								</svg>
								<div class="space-y-1">
									<p class="font-medium text-destructive">AI Recognition Failed</p>
									<p class="text-sm text-destructive/80">{analysisError}</p>
								</div>
							</div>
						</div>
						<div class="mt-4 space-y-3">
							<p class="text-sm text-muted-foreground">
								Don't worry! You can enter the game details manually instead.
							</p>
							<Button type="button" onclick={enterManualMode} class="w-full">
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
									<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
									<path d="m15 5 4 4" />
								</svg>
								Enter Manually
							</Button>
							<Button type="button" variant="outline" onclick={clearFile} class="w-full">
								Try Different Image
							</Button>
						</div>
					{:else}
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

						<div class="mt-4 border-t pt-4">
							<p class="mb-3 text-center text-sm text-muted-foreground">Or skip AI analysis</p>
							<Button type="button" variant="outline" onclick={enterManualMode} class="w-full">
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
									<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
									<path d="m15 5 4 4" />
								</svg>
								Enter Manually Instead
							</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Manual Entry Mode - Shows when user chooses to enter manually -->
		{#if manualEntryMode}
			<Card.Root>
				<Card.Header>
					<Card.Title>Enter Game Details</Card.Title>
					<Card.Description>
						Fill in the game information manually. Only the title is required.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/addToLibrary"
						use:enhance={() => {
							isAddingToLibrary = true;
							return async ({ update }) => {
								await update();
								isAddingToLibrary = false;
							};
						}}
						class="space-y-6"
					>
						{#if form?.addError}
							<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
								{form.addError}
							</div>
						{/if}

						<div class="space-y-2">
							<Label for="manual-title">Title <span class="text-destructive">*</span></Label>
							<Input
								id="manual-title"
								name="title"
								type="text"
								placeholder="e.g., Catan"
								bind:value={editTitle}
								required
							/>
							{#if form?.errors?.title}
								<p class="text-sm text-destructive">{form.errors.title}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="manual-publisher">Publisher</Label>
							<Input
								id="manual-publisher"
								name="publisher"
								type="text"
								placeholder="e.g., Kosmos"
								bind:value={editPublisher}
							/>
						</div>

						<div class="space-y-2">
							<Label for="manual-year">Year Published</Label>
							<Input
								id="manual-year"
								name="year"
								type="number"
								placeholder="e.g., 1995"
								bind:value={editYear}
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
									id="manual-minPlayers"
									name="minPlayers"
									type="number"
									placeholder="Min"
									bind:value={editMinPlayers}
									min="1"
									class="flex-1"
								/>
								<span class="text-muted-foreground">to</span>
								<Input
									id="manual-maxPlayers"
									name="maxPlayers"
									type="number"
									placeholder="Max"
									bind:value={editMaxPlayers}
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
									id="manual-playTimeMin"
									name="playTimeMin"
									type="number"
									placeholder="Min"
									bind:value={editPlayTimeMin}
									min="1"
									class="flex-1"
								/>
								<span class="text-muted-foreground">to</span>
								<Input
									id="manual-playTimeMax"
									name="playTimeMax"
									type="number"
									placeholder="Max"
									bind:value={editPlayTimeMax}
									min="1"
									class="flex-1"
								/>
							</div>
							{#if form?.errors?.playTime}
								<p class="text-sm text-destructive">{form.errors.playTime}</p>
							{/if}
						</div>

						<div class="flex gap-4 pt-4">
							<Button type="button" variant="outline" onclick={cancelManualEntry} class="flex-1">
								Cancel
							</Button>
							<Button type="submit" class="flex-1" disabled={isAddingToLibrary || !editTitle.trim()}>
								{#if isAddingToLibrary}
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
									Adding...
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
										<path d="M12 5v14" />
										<path d="M5 12h14" />
									</svg>
									Add to Library
								{/if}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Analysis Results - Editable Review Form -->
		{#if analysisResult}
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Review Game Details</Card.Title>
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
							The game was clearly identified. Review the details and click "Add to Library" to save.
						{:else if analysisResult.confidence === 'medium'}
							The game was partially identified. Please verify and correct the details below.
						{:else}
							The AI could not confidently identify the game. Please fill in or correct the details below.
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/addToLibrary"
						use:enhance={() => {
							isAddingToLibrary = true;
							return async ({ update }) => {
								await update();
								isAddingToLibrary = false;
							};
						}}
						class="space-y-6"
					>
						{#if form?.addError}
							<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
								{form.addError}
							</div>
						{/if}

						<div class="space-y-2">
							<Label for="title">Title <span class="text-destructive">*</span></Label>
							<Input
								id="title"
								name="title"
								type="text"
								placeholder="e.g., Catan"
								bind:value={editTitle}
								required
							/>
							{#if form?.errors?.title}
								<p class="text-sm text-destructive">{form.errors.title}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="publisher">Publisher</Label>
							<Input
								id="publisher"
								name="publisher"
								type="text"
								placeholder="e.g., Kosmos"
								bind:value={editPublisher}
							/>
						</div>

						<div class="space-y-2">
							<Label for="year">Year Published</Label>
							<Input
								id="year"
								name="year"
								type="number"
								placeholder="e.g., 1995"
								bind:value={editYear}
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
									bind:value={editMinPlayers}
									min="1"
									class="flex-1"
								/>
								<span class="text-muted-foreground">to</span>
								<Input
									id="maxPlayers"
									name="maxPlayers"
									type="number"
									placeholder="Max"
									bind:value={editMaxPlayers}
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
									bind:value={editPlayTimeMin}
									min="1"
									class="flex-1"
								/>
								<span class="text-muted-foreground">to</span>
								<Input
									id="playTimeMax"
									name="playTimeMax"
									type="number"
									placeholder="Max"
									bind:value={editPlayTimeMax}
									min="1"
									class="flex-1"
								/>
							</div>
							{#if form?.errors?.playTime}
								<p class="text-sm text-destructive">{form.errors.playTime}</p>
							{/if}
						</div>

						<!-- AI-Enriched Fields Section -->
						{#if editDescription || editCategories || editBggRating || editBggRank}
							<div class="border-t pt-6">
								<div class="mb-4 flex items-center gap-2">
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
										class="text-primary"
									>
										<path
											d="M12 2a4 4 0 0 0-4 4c0 1.1.45 2.1 1.17 2.83L2 16v6h6l7.17-7.17A4 4 0 1 0 12 2z"
										/>
										<circle cx="12" cy="6" r="1" />
									</svg>
									<span class="text-sm font-medium text-muted-foreground"
										>AI-Enriched Information</span
									>
								</div>

								<div class="space-y-4">
									<div class="space-y-2">
										<Label for="description">Description</Label>
										<textarea
											id="description"
											name="description"
											placeholder="Brief description of the game"
											bind:value={editDescription}
											rows="3"
											class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										></textarea>
									</div>

									<div class="space-y-2">
										<Label for="categories">Categories</Label>
										<Input
											id="categories"
											name="categories"
											type="text"
											placeholder="e.g., strategy, trading, family (comma-separated)"
											bind:value={editCategories}
										/>
										<p class="text-xs text-muted-foreground">Separate multiple categories with commas</p>
									</div>

									<div class="grid grid-cols-2 gap-4">
										<div class="space-y-2">
											<Label for="bggRating">BGG Rating</Label>
											<Input
												id="bggRating"
												name="bggRating"
												type="number"
												placeholder="e.g., 7.5"
												bind:value={editBggRating}
												min="0"
												max="10"
												step="0.1"
											/>
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
												placeholder="e.g., 150"
												bind:value={editBggRank}
												min="1"
											/>
											{#if form?.errors?.bggRank}
												<p class="text-sm text-destructive">{form.errors.bggRank}</p>
											{/if}
										</div>
									</div>
								</div>
							</div>
						{/if}

						<div class="flex gap-4 pt-4">
							<Button type="button" variant="outline" onclick={clearFile} class="flex-1">
								Cancel
							</Button>
							<Button type="submit" class="flex-1" disabled={isAddingToLibrary || !editTitle.trim()}>
								{#if isAddingToLibrary}
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
									Adding...
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
										<path d="M12 5v14" />
										<path d="M5 12h14" />
									</svg>
									Add to Library
								{/if}
							</Button>
						</div>
					</form>
				</Card.Content>
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
