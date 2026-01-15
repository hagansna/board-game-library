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
	let selectedFiles = $state<File[]>([]);
	let previewUrls = $state<Map<string, string>>(new Map());
	let isUploading = $state(false);
	let isAnalyzing = $state(false);
	let isAddingToLibrary = $state(false);

	// State for uploaded images data (from server)
	let uploadedImages = $state<Array<{ imageData: string; mimeType: string; fileName: string }>>([]);

	// State for AI analysis results (multiple games per image now)
	let analysisResults = $state<
		Map<
			number,
			{
				games: ExtractedGameData[];
				gameCount: number;
				error: string | null;
				status: 'pending' | 'analyzing' | 'done' | 'error';
			}
		>
	>(new Map());

	// State for manual entry mode (when AI fails or user chooses to skip AI)
	let manualEntryMode = $state(false);

	// State for showing batch results review
	let showBatchReview = $state(false);

	// Editable form fields for review (single game mode)
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

	// Handle file selection (multiple files)
	function handleFileSelect(files: FileList | null) {
		if (!files || files.length === 0) return;

		// Reset analysis state when new files are selected
		analysisResults = new Map();
		uploadedImages = [];
		showBatchReview = false;
		selectionInitialized = false;

		const newFiles: File[] = [];
		const newUrls = new Map<string, string>();

		// Clean up existing preview URLs
		for (const url of previewUrls.values()) {
			URL.revokeObjectURL(url);
		}

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];

			if (!validTypes.includes(file.type.toLowerCase())) {
				// Skip invalid files (they'll be filtered out on server anyway)
				continue;
			}

			if (file.size > maxFileSize) {
				// Skip oversized files
				continue;
			}

			newFiles.push(file);
			// Use file name + size as a unique key
			const fileKey = `${file.name}-${file.size}`;
			newUrls.set(fileKey, URL.createObjectURL(file));
		}

		selectedFiles = newFiles;
		previewUrls = newUrls;
	}

	// Handle input change
	function onInputChange(event: Event) {
		const input = event.target as HTMLInputElement;
		handleFileSelect(input.files);
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

		const files = event.dataTransfer?.files ?? null;
		if (files && files.length > 0) {
			handleFileSelect(files);
			// Update the file input so form submission works
			const dataTransfer = new DataTransfer();
			for (let i = 0; i < files.length; i++) {
				dataTransfer.items.add(files[i]);
			}
			fileInput.files = dataTransfer.files;
		}
	}

	// Handle click on drop zone
	function onDropZoneClick() {
		fileInput.click();
	}

	// Remove a single file from selection
	function removeFile(index: number) {
		const file = selectedFiles[index];
		const fileKey = `${file.name}-${file.size}`;
		const url = previewUrls.get(fileKey);
		if (url) {
			URL.revokeObjectURL(url);
			previewUrls.delete(fileKey);
			previewUrls = new Map(previewUrls);
		}

		selectedFiles = selectedFiles.filter((_, i) => i !== index);

		// Update file input
		if (fileInput) {
			const dataTransfer = new DataTransfer();
			for (const f of selectedFiles) {
				dataTransfer.items.add(f);
			}
			fileInput.files = dataTransfer.files;
		}
	}

	// Clear all selected files
	function clearAllFiles() {
		for (const url of previewUrls.values()) {
			URL.revokeObjectURL(url);
		}

		selectedFiles = [];
		previewUrls = new Map();

		if (fileInput) {
			fileInput.value = '';
		}

		// Reset all analysis state
		analysisResults = new Map();
		uploadedImages = [];
		manualEntryMode = false;
		showBatchReview = false;
		selectionInitialized = false;

		// Reset edit fields
		resetEditFields();
	}

	// Reset edit fields
	function resetEditFields() {
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

	// Enter manual entry mode
	function enterManualMode() {
		manualEntryMode = true;
		showBatchReview = false;
		resetEditFields();
	}

	// Cancel manual entry and return to upload/analysis state
	function cancelManualEntry() {
		manualEntryMode = false;
		resetEditFields();
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
			for (const url of previewUrls.values()) {
				URL.revokeObjectURL(url);
			}
		};
	});

	// Populate editable fields from analysis result (for single game mode)
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

	// Get file key for preview URL lookup
	function getFileKey(file: File): string {
		return `${file.name}-${file.size}`;
	}

	// Count total games found across all images
	function getTotalGamesCount(): number {
		let count = 0;
		for (const result of analysisResults.values()) {
			if (result.status === 'done' && result.games) {
				count += result.games.filter((g) => !isAIRecognitionFailed(g)).length;
			}
		}
		return count;
	}

	// Get all games as a flat array with their source image index
	function getAllGames(): Array<{
		imageIndex: number;
		gameIndex: number;
		data: ExtractedGameData;
	}> {
		const allGames: Array<{ imageIndex: number; gameIndex: number; data: ExtractedGameData }> = [];
		for (const [imageIndex, result] of analysisResults.entries()) {
			if (result.status === 'done' && result.games) {
				result.games.forEach((game, gameIndex) => {
					if (!isAIRecognitionFailed(game)) {
						allGames.push({ imageIndex, gameIndex, data: game });
					}
				});
			}
		}
		return allGames;
	}

	// Get images count that had games detected
	function getImagesWithGamesCount(): number {
		let count = 0;
		for (const result of analysisResults.values()) {
			if (result.status === 'done' && result.gameCount > 0) {
				count++;
			}
		}
		return count;
	}

	// Check if any analysis is in progress
	function isAnyAnalyzing(): boolean {
		for (const result of analysisResults.values()) {
			if (result.status === 'analyzing') {
				return true;
			}
		}
		return false;
	}

	// Check if all analyses are complete
	function areAllAnalysesComplete(): boolean {
		if (analysisResults.size === 0) return false;
		for (const result of analysisResults.values()) {
			if (result.status === 'pending' || result.status === 'analyzing') {
				return false;
			}
		}
		return true;
	}

	// Handle form response updates
	$effect(() => {
		if (form) {
			isUploading = false;
			isAnalyzing = false;
			isAddingToLibrary = false;

			// Store uploaded images data for batch analysis
			if (form.success && form.images && Array.isArray(form.images)) {
				uploadedImages = form.images;
				// Initialize analysis results for all uploaded images
				const newResults = new Map<
					number,
					{
						games: ExtractedGameData[];
						gameCount: number;
						error: string | null;
						status: 'pending' | 'analyzing' | 'done' | 'error';
					}
				>();
				for (let i = 0; i < form.images.length; i++) {
					newResults.set(i, { games: [], gameCount: 0, error: null, status: 'pending' });
				}
				analysisResults = newResults;
			}

			// Handle batch analysis results (now with multi-game support)
			if (form.batchAnalyzed && form.results && Array.isArray(form.results)) {
				const newResults = new Map(analysisResults);
				for (let i = 0; i < form.results.length; i++) {
					const result = form.results[i];
					if (result.success && result.games && result.games.length > 0) {
						// Filter out games without valid titles
						const validGames = result.games.filter(
							(g: ExtractedGameData) => !isAIRecognitionFailed(g)
						);
						if (validGames.length > 0) {
							newResults.set(i, {
								games: validGames,
								gameCount: validGames.length,
								error: null,
								status: 'done'
							});
						} else {
							newResults.set(i, {
								games: [],
								gameCount: 0,
								error: 'Could not identify any games in this image',
								status: 'error'
							});
						}
					} else {
						newResults.set(i, {
							games: [],
							gameCount: 0,
							error: result.error || 'Analysis failed',
							status: 'error'
						});
					}
				}
				analysisResults = newResults;
				showBatchReview = true;
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

	// Track which games are selected for adding to library (key: "imageIndex-gameIndex")
	let selectedGames = $state<Set<string>>(new Set());

	// Track whether we've initialized selection for the current batch
	let selectionInitialized = $state(false);

	// Track which game is currently being edited (key: "imageIndex-gameIndex")
	let editingGameKey = $state<string | null>(null);

	// Editable data for the game being edited in batch mode
	let batchEditData = $state<ExtractedGameData | null>(null);

	// Generate unique key for a game
	function getGameKey(imageIndex: number, gameIndex: number): string {
		return `${imageIndex}-${gameIndex}`;
	}

	// Start editing a specific game in batch review
	function startEditingGame(imageIndex: number, gameIndex: number) {
		const key = getGameKey(imageIndex, gameIndex);
		const result = analysisResults.get(imageIndex);
		if (result?.games && result.games[gameIndex]) {
			editingGameKey = key;
			batchEditData = { ...result.games[gameIndex] };
		}
	}

	// Cancel editing and discard changes
	function cancelEditingGame() {
		editingGameKey = null;
		batchEditData = null;
	}

	// Save edited game data back to analysisResults
	function saveEditedGame() {
		if (!editingGameKey || !batchEditData) return;

		const [imageIndexStr, gameIndexStr] = editingGameKey.split('-');
		const imageIndex = parseInt(imageIndexStr, 10);
		const gameIndex = parseInt(gameIndexStr, 10);

		const result = analysisResults.get(imageIndex);
		if (result?.games && result.games[gameIndex]) {
			// Update the game in the results
			const newGames = [...result.games];
			newGames[gameIndex] = { ...batchEditData };

			const newResults = new Map(analysisResults);
			newResults.set(imageIndex, {
				...result,
				games: newGames
			});
			analysisResults = newResults;
		}

		editingGameKey = null;
		batchEditData = null;
	}

	// Initialize selectedGames when entering batch review (only once per batch)
	$effect(() => {
		if (showBatchReview && analysisResults.size > 0 && !selectionInitialized) {
			// Auto-select all successful results
			const newSelected = new Set<string>();
			for (const [imageIndex, result] of analysisResults.entries()) {
				if (result.status === 'done' && result.games) {
					result.games.forEach((game, gameIndex) => {
						if (!isAIRecognitionFailed(game)) {
							newSelected.add(getGameKey(imageIndex, gameIndex));
						}
					});
				}
			}
			selectedGames = newSelected;
			selectionInitialized = true;
		}
	});

	// Toggle game selection
	function toggleGameSelection(imageIndex: number, gameIndex: number) {
		const key = getGameKey(imageIndex, gameIndex);
		const newSelected = new Set(selectedGames);
		if (newSelected.has(key)) {
			newSelected.delete(key);
		} else {
			newSelected.add(key);
		}
		selectedGames = newSelected;
	}

	// Select all games
	function selectAllGames() {
		const newSelected = new Set<string>();
		for (const [imageIndex, result] of analysisResults.entries()) {
			if (result.status === 'done' && result.games) {
				result.games.forEach((game, gameIndex) => {
					if (!isAIRecognitionFailed(game)) {
						newSelected.add(getGameKey(imageIndex, gameIndex));
					}
				});
			}
		}
		selectedGames = newSelected;
	}

	// Deselect all games
	function deselectAllGames() {
		selectedGames = new Set();
	}

	// Get selected games data for form submission
	function getSelectedGamesData(): ExtractedGameData[] {
		const games: ExtractedGameData[] = [];
		for (const key of selectedGames) {
			const [imageIndexStr, gameIndexStr] = key.split('-');
			const imageIndex = parseInt(imageIndexStr, 10);
			const gameIndex = parseInt(gameIndexStr, 10);
			const result = analysisResults.get(imageIndex);
			if (result?.games && result.games[gameIndex]) {
				games.push(result.games[gameIndex]);
			}
		}
		return games;
	}
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
			<h1 class="text-3xl font-bold text-foreground">Upload Board Game Photos</h1>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Upload Images</Card.Title>
				<Card.Description>
					Take photos of your board game boxes and we'll use AI to identify the game details. You
					can upload multiple images at once.
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

					{#if form?.success && uploadedImages.length > 0 && !showBatchReview}
						<div class="rounded-md bg-green-500/15 p-3 text-sm text-green-700 dark:text-green-400">
							{uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} uploaded successfully!
							Click "Analyze All" to extract game information.
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
							name="images"
							accept={acceptedTypes}
							multiple
							onchange={onInputChange}
							class="sr-only"
						/>

						{#if selectedFiles.length > 0}
							<!-- Preview state with thumbnails -->
							<div class="p-6">
								<div class="mb-4 flex items-center justify-between">
									<p class="text-sm font-medium text-foreground">
										{selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
									</p>
									<button
										type="button"
										aria-label="Clear all images"
										onclick={(e) => {
											e.stopPropagation();
											clearAllFiles();
										}}
										class="text-sm text-muted-foreground hover:text-destructive"
									>
										Clear all
									</button>
								</div>
								<div class="grid grid-cols-3 gap-4 sm:grid-cols-4">
									{#each selectedFiles as file, index}
										{@const fileKey = getFileKey(file)}
										{@const previewUrl = previewUrls.get(fileKey)}
										<div class="group relative">
											{#if previewUrl}
												<img
													src={previewUrl}
													alt="Preview of {file.name}"
													class="aspect-square w-full rounded-lg object-cover shadow-md"
												/>
											{:else}
												<div
													class="flex aspect-square w-full items-center justify-center rounded-lg bg-muted"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="24"
														height="24"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														class="text-muted-foreground"
													>
														<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
														<circle cx="9" cy="9" r="2" />
														<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
													</svg>
												</div>
											{/if}
											<button
												type="button"
												aria-label="Remove {file.name}"
												onclick={(e) => {
													e.stopPropagation();
													removeFile(index);
												}}
												class="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="12"
													height="12"
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
											<p
												class="mt-1 truncate text-center text-xs text-muted-foreground"
												title={file.name}
											>
												{file.name}
											</p>
										</div>
									{/each}
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
									{isDragging ? 'Drop images here' : 'Drag & drop or click to upload'}
								</p>
								<p class="text-sm text-muted-foreground">
									Supports JPG, PNG, HEIC (max {maxFileSizeMB}MB each)
								</p>
								<p class="mt-1 text-xs text-muted-foreground">
									Select multiple images to batch analyze
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
							disabled={selectedFiles.length === 0 || isUploading || uploadedImages.length > 0}
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
								Upload {selectedFiles.length > 1 ? `${selectedFiles.length} Images` : 'Image'}
							{/if}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- AI Analysis Section - Shows after upload -->
		{#if uploadedImages.length > 0 && !showBatchReview && !manualEntryMode}
			<Card.Root>
				<Card.Header>
					<Card.Title>AI Analysis</Card.Title>
					<Card.Description>
						Click the button below to analyze {uploadedImages.length > 1
							? `all ${uploadedImages.length} images`
							: 'the image'} and extract game information using AI.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/analyzeAll"
						use:enhance={() => {
							isAnalyzing = true;
							// Mark all as analyzing
							const newResults = new Map(analysisResults);
							for (const key of newResults.keys()) {
								newResults.set(key, { ...newResults.get(key)!, status: 'analyzing' });
							}
							analysisResults = newResults;
							return async ({ update }) => {
								await update();
								isAnalyzing = false;
							};
						}}
					>
						<input type="hidden" name="images" value={JSON.stringify(uploadedImages)} />

						<!-- Progress display during analysis -->
						{#if isAnalyzing}
							<div class="mb-4 space-y-3">
								<div class="flex items-center justify-center gap-2">
									<svg
										class="h-5 w-5 animate-spin"
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
									<span class="text-sm text-muted-foreground">
										Analyzing {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''}...
									</span>
								</div>
								<div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
									{#each uploadedImages as image, index}
										{@const result = analysisResults.get(index)}
										{@const hasGames = result?.status === 'done' && result.gameCount > 0}
										<div
											class="relative aspect-square overflow-hidden rounded border-2 {hasGames
												? 'border-green-500'
												: result?.status === 'error' ||
													  (result?.status === 'done' && result.gameCount === 0)
													? 'border-red-500'
													: 'border-primary animate-pulse'}"
										>
											<img
												src={image.imageData}
												alt="Analyzing {image.fileName}"
												class="h-full w-full object-cover"
											/>
											{#if hasGames}
												<div
													class="absolute inset-0 flex items-center justify-center bg-green-500/30"
												>
													<span
														class="rounded-full bg-green-600 px-2 py-0.5 text-sm font-bold text-white"
													>
														{result.gameCount}
													</span>
												</div>
											{:else if result?.status === 'error' || (result?.status === 'done' && result?.gameCount === 0)}
												<div
													class="absolute inset-0 flex items-center justify-center bg-red-500/30"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="20"
														height="20"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="3"
														class="text-red-600"
													>
														<path d="M18 6 6 18" />
														<path d="m6 6 12 12" />
													</svg>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<Button type="submit" class="w-full" disabled={isAnalyzing}>
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
								Analyze {uploadedImages.length > 1 ? 'All' : 'with AI'}
							</Button>

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
					</form>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Batch Results Review Section -->
		{#if showBatchReview && analysisResults.size > 0}
			{@const totalGames = getTotalGamesCount()}
			{@const imagesWithGames = getImagesWithGamesCount()}
			{@const totalImages = analysisResults.size}
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Analysis Results</Card.Title>
						<span class="rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
							Found {totalGames} game{totalGames !== 1 ? 's' : ''} in {imagesWithGames} of {totalImages}
							image{totalImages !== 1 ? 's' : ''}
						</span>
					</div>
					<Card.Description>
						{#if totalGames > 0}
							Select the games you want to add to your library.
						{:else}
							No games were successfully identified. You can enter details manually.
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if totalGames > 0}
						<!-- Select All / Deselect All buttons -->
						<div class="mb-4 flex items-center justify-between">
							<span class="text-sm text-muted-foreground">
								{selectedGames.size} of {totalGames} selected
							</span>
							<div class="flex gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={selectAllGames}
									disabled={selectedGames.size === totalGames}
								>
									Select All
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={deselectAllGames}
									disabled={selectedGames.size === 0}
								>
									Deselect All
								</Button>
							</div>
						</div>

						<!-- Results list grouped by image -->
						<div class="space-y-4">
							{#each [...analysisResults.entries()] as [imageIndex, result]}
								{@const uploadedImage = uploadedImages[imageIndex]}
								{@const hasGames = result.status === 'done' && result.gameCount > 0}

								<!-- Image group header -->
								<div class="rounded-lg border {hasGames ? 'bg-card' : 'bg-muted/50'}">
									<div class="flex items-center gap-3 border-b p-3">
										{#if uploadedImage}
											<img
												src={uploadedImage.imageData}
												alt={uploadedImage.fileName}
												class="h-12 w-12 shrink-0 rounded object-cover"
											/>
										{/if}
										<div class="min-w-0 flex-1">
											<p
												class="truncate text-sm font-medium text-foreground"
												title={uploadedImage?.fileName}
											>
												{uploadedImage?.fileName ?? `Image ${imageIndex + 1}`}
											</p>
											{#if hasGames}
												<p class="text-sm text-muted-foreground">
													{result.gameCount} game{result.gameCount !== 1 ? 's' : ''} detected
												</p>
											{:else}
												<p class="text-sm text-destructive">
													{result.error || 'No games detected'}
												</p>
											{/if}
										</div>
									</div>

									<!-- Games from this image -->
									{#if hasGames && result.games}
										<div class="divide-y">
											{#each result.games as game, gameIndex}
												{@const gameKey = getGameKey(imageIndex, gameIndex)}
												{@const isSelected = selectedGames.has(gameKey)}
												{@const isEditing = editingGameKey === gameKey}

												{#if isEditing && batchEditData}
													<!-- Edit mode for this game -->
													<div class="space-y-4 bg-muted/30 p-4">
														<div class="flex items-center justify-between">
															<h4 class="font-medium text-foreground">Edit Game Details</h4>
															<button
																type="button"
																onclick={cancelEditingGame}
																class="text-muted-foreground hover:text-foreground"
																aria-label="Cancel editing"
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

														<div class="grid gap-4">
															<div class="space-y-1.5">
																<Label for="edit-title-{gameKey}"
																	>Title <span class="text-destructive">*</span></Label
																>
																<Input
																	id="edit-title-{gameKey}"
																	type="text"
																	bind:value={batchEditData.title}
																	placeholder="Game title"
																/>
															</div>

															<div class="grid grid-cols-2 gap-4">
																<div class="space-y-1.5">
																	<Label for="edit-year-{gameKey}">Year</Label>
																	<Input
																		id="edit-year-{gameKey}"
																		type="number"
																		value={batchEditData.year ?? ''}
																		onchange={(e) => {
																			const val = (e.target as HTMLInputElement).value;
																			if (batchEditData)
																				batchEditData.year = val ? parseInt(val, 10) : null;
																		}}
																		placeholder="Year"
																		min="1"
																		max={new Date().getFullYear() + 1}
																	/>
																</div>
																<div class="space-y-1.5">
																	<Label for="edit-publisher-{gameKey}">Publisher</Label>
																	<Input
																		id="edit-publisher-{gameKey}"
																		type="text"
																		bind:value={batchEditData.publisher}
																		placeholder="Publisher"
																	/>
																</div>
															</div>

															<div class="space-y-1.5">
																<Label>Player Count</Label>
																<div class="flex items-center gap-2">
																	<Input
																		id="edit-minPlayers-{gameKey}"
																		type="number"
																		value={batchEditData.minPlayers ?? ''}
																		onchange={(e) => {
																			const val = (e.target as HTMLInputElement).value;
																			if (batchEditData)
																				batchEditData.minPlayers = val ? parseInt(val, 10) : null;
																		}}
																		placeholder="Min"
																		min="1"
																		class="flex-1"
																	/>
																	<span class="text-muted-foreground">to</span>
																	<Input
																		id="edit-maxPlayers-{gameKey}"
																		type="number"
																		value={batchEditData.maxPlayers ?? ''}
																		onchange={(e) => {
																			const val = (e.target as HTMLInputElement).value;
																			if (batchEditData)
																				batchEditData.maxPlayers = val ? parseInt(val, 10) : null;
																		}}
																		placeholder="Max"
																		min="1"
																		class="flex-1"
																	/>
																</div>
															</div>

															<div class="space-y-1.5">
																<Label>Play Time (minutes)</Label>
																<div class="flex items-center gap-2">
																	<Input
																		id="edit-playTimeMin-{gameKey}"
																		type="number"
																		value={batchEditData.playTimeMin ?? ''}
																		onchange={(e) => {
																			const val = (e.target as HTMLInputElement).value;
																			if (batchEditData)
																				batchEditData.playTimeMin = val ? parseInt(val, 10) : null;
																		}}
																		placeholder="Min"
																		min="1"
																		class="flex-1"
																	/>
																	<span class="text-muted-foreground">to</span>
																	<Input
																		id="edit-playTimeMax-{gameKey}"
																		type="number"
																		value={batchEditData.playTimeMax ?? ''}
																		onchange={(e) => {
																			const val = (e.target as HTMLInputElement).value;
																			if (batchEditData)
																				batchEditData.playTimeMax = val ? parseInt(val, 10) : null;
																		}}
																		placeholder="Max"
																		min="1"
																		class="flex-1"
																	/>
																</div>
															</div>
														</div>

														<div class="flex justify-end gap-2 pt-2">
															<Button
																type="button"
																variant="outline"
																size="sm"
																onclick={cancelEditingGame}
															>
																Cancel
															</Button>
															<Button
																type="button"
																size="sm"
																onclick={saveEditedGame}
																disabled={!batchEditData.title?.trim()}
															>
																Save Changes
															</Button>
														</div>
													</div>
												{:else}
													<!-- Display mode for this game -->
													<div
														class="flex items-start gap-3 p-3 {isSelected ? 'bg-primary/5' : ''}"
													>
														<input
															type="checkbox"
															checked={isSelected}
															onchange={() => toggleGameSelection(imageIndex, gameIndex)}
															class="mt-1 h-4 w-4 rounded border-input"
														/>
														<div class="min-w-0 flex-1">
															<div class="flex items-start justify-between gap-2">
																<div class="min-w-0 flex-1">
																	<p class="truncate font-medium text-foreground">
																		{game.title}
																	</p>
																	<p class="text-sm text-muted-foreground">
																		{#if game.year}
																			{game.year}
																		{/if}
																		{#if game.minPlayers || game.maxPlayers}
																			<span class="mx-1">|</span>
																			{game.minPlayers ?? '?'}-{game.maxPlayers ?? '?'} players
																		{/if}
																		{#if game.playTimeMin || game.playTimeMax}
																			<span class="mx-1">|</span>
																			{game.playTimeMin ?? '?'}-{game.playTimeMax ?? '?'} min
																		{/if}
																	</p>
																</div>
																<div class="flex shrink-0 items-center gap-2">
																	<button
																		type="button"
																		onclick={() => startEditingGame(imageIndex, gameIndex)}
																		class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
																		aria-label="Edit {game.title}"
																		title="Edit game details"
																	>
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			width="14"
																			height="14"
																			viewBox="0 0 24 24"
																			fill="none"
																			stroke="currentColor"
																			stroke-width="2"
																			stroke-linecap="round"
																			stroke-linejoin="round"
																		>
																			<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
																			<path d="m15 5 4 4" />
																		</svg>
																	</button>
																	<span
																		class="rounded-full px-2 py-0.5 text-xs font-medium {getConfidenceBadgeClass(
																			game.confidence
																		)}"
																	>
																		{game.confidence}
																	</span>
																</div>
															</div>
														</div>
													</div>
												{/if}
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>

						<!-- Add Selected button -->
						<form
							method="POST"
							action="?/addSelectedToLibrary"
							use:enhance={() => {
								isAddingToLibrary = true;
								return async ({ update }) => {
									await update();
									isAddingToLibrary = false;
								};
							}}
							class="mt-6"
						>
							<input type="hidden" name="games" value={JSON.stringify(getSelectedGamesData())} />
							<div class="flex gap-4">
								<Button type="button" variant="outline" onclick={clearAllFiles} class="flex-1">
									Start Over
								</Button>
								<Button
									type="submit"
									class="flex-1"
									disabled={selectedGames.size === 0 || isAddingToLibrary}
								>
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
										Add {selectedGames.size} Game{selectedGames.size !== 1 ? 's' : ''} to Library
									{/if}
								</Button>
							</div>
						</form>
					{:else}
						<!-- No successful results - offer manual entry -->
						<div class="space-y-4">
							<div class="rounded-md bg-destructive/15 p-4 text-center">
								<p class="text-sm text-destructive">
									None of the images could be analyzed successfully.
								</p>
							</div>
							<div class="flex gap-4">
								<Button type="button" variant="outline" onclick={clearAllFiles} class="flex-1">
									Try Different Images
								</Button>
								<Button type="button" onclick={enterManualMode} class="flex-1">
									Enter Manually
								</Button>
							</div>
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
							<Button
								type="submit"
								class="flex-1"
								disabled={isAddingToLibrary || !editTitle.trim()}
							>
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
						Take a clear photo of the front of each game box
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
						Upload multiple images at once to quickly add your collection
					</li>
				</ul>
			</Card.Content>
		</Card.Root>
	</div>
</div>
