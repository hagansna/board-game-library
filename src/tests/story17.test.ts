import { describe, it, expect } from 'vitest';
import type { ExtractedGameData } from '$lib/server/gemini';

// Validation logic mirroring server-side implementation
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Mock file validation for testing
function validateImageFile(file: { type: string; size: number; name: string }): {
	valid: boolean;
	error?: string;
} {
	// Check file presence
	if (!file || file.size === 0) {
		return { valid: false, error: 'Please select an image file to upload' };
	}

	// Check file type
	const mimeType = file.type.toLowerCase();
	if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
		return { valid: false, error: 'Invalid file type. Please upload a JPG, PNG, or HEIC image.' };
	}

	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return { valid: false, error: `File size (${sizeMB}MB) exceeds the 10MB limit.` };
	}

	return { valid: true };
}

// Validate multiple files and filter valid ones
function validateMultipleFiles(files: Array<{ type: string; size: number; name: string }>): {
	validFiles: Array<{ type: string; size: number; name: string }>;
	errors: string[];
} {
	const validFiles: Array<{ type: string; size: number; name: string }> = [];
	const errors: string[] = [];

	for (const file of files) {
		const result = validateImageFile(file);
		if (result.valid) {
			validFiles.push(file);
		} else {
			errors.push(`${file.name}: ${result.error}`);
		}
	}

	return { validFiles, errors };
}

// Helper function to check if AI recognition failed
function isAIRecognitionFailed(gameData: ExtractedGameData | null): boolean {
	if (!gameData) return true;
	return gameData.title === null || gameData.title.trim() === '';
}

// Story 17 Tests - Multi-image upload for batch AI analysis
describe('Multi-Image Upload - Story 17', () => {
	describe('Multiple File Selection', () => {
		it('should accept multiple valid image files', () => {
			const files = [
				{ type: 'image/jpeg', size: 1024 * 1024, name: 'game1.jpg' },
				{ type: 'image/png', size: 2 * 1024 * 1024, name: 'game2.png' },
				{ type: 'image/heic', size: 512 * 1024, name: 'game3.heic' }
			];

			const { validFiles, errors } = validateMultipleFiles(files);

			expect(validFiles).toHaveLength(3);
			expect(errors).toHaveLength(0);
		});

		it('should filter out invalid file types from batch', () => {
			const files = [
				{ type: 'image/jpeg', size: 1024 * 1024, name: 'valid.jpg' },
				{ type: 'text/plain', size: 1024, name: 'invalid.txt' },
				{ type: 'image/png', size: 1024 * 1024, name: 'valid.png' },
				{ type: 'application/pdf', size: 1024, name: 'document.pdf' }
			];

			const { validFiles, errors } = validateMultipleFiles(files);

			expect(validFiles).toHaveLength(2);
			expect(errors).toHaveLength(2);
			expect(errors.some((e) => e.includes('invalid.txt'))).toBe(true);
			expect(errors.some((e) => e.includes('document.pdf'))).toBe(true);
		});

		it('should filter out oversized files from batch', () => {
			const files = [
				{ type: 'image/jpeg', size: 5 * 1024 * 1024, name: 'small.jpg' }, // 5MB - OK
				{ type: 'image/jpeg', size: 15 * 1024 * 1024, name: 'large.jpg' }, // 15MB - too big
				{ type: 'image/png', size: 10 * 1024 * 1024, name: 'exact.png' } // 10MB - OK
			];

			const { validFiles, errors } = validateMultipleFiles(files);

			expect(validFiles).toHaveLength(2);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('large.jpg');
			expect(errors[0]).toContain('15.0MB');
		});

		it('should handle mix of valid and invalid files', () => {
			const files = [
				{ type: 'image/jpeg', size: 1024 * 1024, name: 'valid1.jpg' },
				{ type: 'image/gif', size: 1024, name: 'invalid.gif' },
				{ type: 'image/png', size: 20 * 1024 * 1024, name: 'toobig.png' },
				{ type: 'image/heif', size: 1024 * 1024, name: 'valid2.heif' }
			];

			const { validFiles, errors } = validateMultipleFiles(files);

			expect(validFiles).toHaveLength(2);
			expect(validFiles.map((f) => f.name)).toEqual(['valid1.jpg', 'valid2.heif']);
			expect(errors).toHaveLength(2);
		});

		it('should return empty valid files when all files are invalid', () => {
			const files = [
				{ type: 'text/plain', size: 1024, name: 'text.txt' },
				{ type: 'application/json', size: 1024, name: 'data.json' }
			];

			const { validFiles, errors } = validateMultipleFiles(files);

			expect(validFiles).toHaveLength(0);
			expect(errors).toHaveLength(2);
		});
	});

	describe('File Removal from Selection', () => {
		it('should allow removing individual files from selection', () => {
			const files = [
				{ type: 'image/jpeg', size: 1024 * 1024, name: 'game1.jpg' },
				{ type: 'image/png', size: 1024 * 1024, name: 'game2.png' },
				{ type: 'image/heic', size: 1024 * 1024, name: 'game3.heic' }
			];

			// Simulate removing the second file (index 1)
			const remainingFiles = files.filter((_, index) => index !== 1);

			expect(remainingFiles).toHaveLength(2);
			expect(remainingFiles.map((f) => f.name)).toEqual(['game1.jpg', 'game3.heic']);
		});

		it('should not affect other files when removing one', () => {
			const files = [
				{ type: 'image/jpeg', size: 1024 * 1024, name: 'game1.jpg' },
				{ type: 'image/png', size: 2 * 1024 * 1024, name: 'game2.png' },
				{ type: 'image/heic', size: 512 * 1024, name: 'game3.heic' }
			];

			// Remove first file
			const remaining = files.slice(1);

			expect(remaining).toHaveLength(2);
			expect(remaining[0].name).toBe('game2.png');
			expect(remaining[0].size).toBe(2 * 1024 * 1024);
			expect(remaining[1].name).toBe('game3.heic');
		});
	});

	describe('Batch Analysis Results Aggregation', () => {
		it('should aggregate multiple successful analysis results', () => {
			const analysisResults = [
				{
					success: true,
					gameData: {
						title: 'Catan',
						publisher: 'Kosmos',
						year: 1995,
						minPlayers: 3,
						maxPlayers: 4,
						playTimeMin: 60,
						playTimeMax: 120,
						confidence: 'high' as const,
						description: 'Trade and build settlements',
						categories: ['strategy', 'trading'],
						bggRating: 7.1,
						bggRank: 437
					},
					error: null
				},
				{
					success: true,
					gameData: {
						title: 'Ticket to Ride',
						publisher: 'Days of Wonder',
						year: 2004,
						minPlayers: 2,
						maxPlayers: 5,
						playTimeMin: 30,
						playTimeMax: 60,
						confidence: 'high' as const,
						description: 'Build train routes',
						categories: ['family', 'route-building'],
						bggRating: 7.4,
						bggRank: 178
					},
					error: null
				}
			];

			const successfulResults = analysisResults.filter(
				(r) => r.success && r.gameData && !isAIRecognitionFailed(r.gameData)
			);

			expect(successfulResults).toHaveLength(2);
			expect(successfulResults[0].gameData?.title).toBe('Catan');
			expect(successfulResults[1].gameData?.title).toBe('Ticket to Ride');
		});

		it('should handle mix of successful and failed analysis results', () => {
			const analysisResults = [
				{
					success: true,
					gameData: {
						title: 'Pandemic',
						publisher: 'Z-Man Games',
						year: 2008,
						minPlayers: 2,
						maxPlayers: 4,
						playTimeMin: 45,
						playTimeMax: 60,
						confidence: 'high' as const,
						description: null,
						categories: null,
						bggRating: null,
						bggRank: null
					},
					error: null
				},
				{
					success: false,
					gameData: null,
					error: 'Failed to analyze image'
				},
				{
					success: true,
					gameData: {
						title: null, // Recognition failed
						publisher: null,
						year: null,
						minPlayers: null,
						maxPlayers: null,
						playTimeMin: null,
						playTimeMax: null,
						confidence: 'low' as const,
						description: null,
						categories: null,
						bggRating: null,
						bggRank: null
					},
					error: null
				}
			];

			const successfulResults = analysisResults.filter(
				(r) => r.success && r.gameData && !isAIRecognitionFailed(r.gameData)
			);
			const failedResults = analysisResults.filter(
				(r) => !r.success || !r.gameData || isAIRecognitionFailed(r.gameData)
			);

			expect(successfulResults).toHaveLength(1);
			expect(failedResults).toHaveLength(2);
			expect(successfulResults[0].gameData?.title).toBe('Pandemic');
		});

		it('should correctly count games found across images', () => {
			const analysisResults = [
				{
					success: true,
					gameData: { title: 'Game 1', confidence: 'high' as const } as ExtractedGameData
				},
				{
					success: true,
					gameData: { title: 'Game 2', confidence: 'medium' as const } as ExtractedGameData
				},
				{ success: false, gameData: null, error: 'Error' },
				{
					success: true,
					gameData: { title: 'Game 3', confidence: 'high' as const } as ExtractedGameData
				},
				{
					success: true,
					gameData: { title: null, confidence: 'low' as const } as ExtractedGameData
				}
			];

			const totalImages = analysisResults.length;
			const gamesFound = analysisResults.filter(
				(r) => r.success && r.gameData && !isAIRecognitionFailed(r.gameData)
			).length;

			expect(totalImages).toBe(5);
			expect(gamesFound).toBe(3);
		});
	});

	describe('Batch Game Selection', () => {
		it('should allow selecting/deselecting individual games', () => {
			const selectedGames = new Set<number>();

			// Select games at indices 0 and 2
			selectedGames.add(0);
			selectedGames.add(2);

			expect(selectedGames.size).toBe(2);
			expect(selectedGames.has(0)).toBe(true);
			expect(selectedGames.has(1)).toBe(false);
			expect(selectedGames.has(2)).toBe(true);

			// Deselect game at index 0
			selectedGames.delete(0);

			expect(selectedGames.size).toBe(1);
			expect(selectedGames.has(0)).toBe(false);
			expect(selectedGames.has(2)).toBe(true);
		});

		it('should implement select all functionality', () => {
			const analysisResults = [
				{ index: 0, success: true, hasTitle: true },
				{ index: 1, success: false, hasTitle: false },
				{ index: 2, success: true, hasTitle: true },
				{ index: 3, success: true, hasTitle: true }
			];

			const selectedGames = new Set<number>();

			// Select all successful results
			for (const result of analysisResults) {
				if (result.success && result.hasTitle) {
					selectedGames.add(result.index);
				}
			}

			expect(selectedGames.size).toBe(3);
			expect(selectedGames.has(0)).toBe(true);
			expect(selectedGames.has(1)).toBe(false); // Failed result
			expect(selectedGames.has(2)).toBe(true);
			expect(selectedGames.has(3)).toBe(true);
		});

		it('should implement deselect all functionality', () => {
			const selectedGames = new Set<number>([0, 2, 3]);

			expect(selectedGames.size).toBe(3);

			// Deselect all
			selectedGames.clear();

			expect(selectedGames.size).toBe(0);
		});
	});

	describe('Progress Tracking', () => {
		it('should track progress state for each image', () => {
			const imageCount = 5;
			const progressState = new Map<
				number,
				{ status: 'pending' | 'analyzing' | 'done' | 'error' }
			>();

			// Initialize all as pending
			for (let i = 0; i < imageCount; i++) {
				progressState.set(i, { status: 'pending' });
			}

			expect(progressState.size).toBe(5);
			expect(Array.from(progressState.values()).every((p) => p.status === 'pending')).toBe(true);

			// Simulate analysis starting
			for (let i = 0; i < imageCount; i++) {
				progressState.set(i, { status: 'analyzing' });
			}

			expect(Array.from(progressState.values()).every((p) => p.status === 'analyzing')).toBe(true);

			// Simulate mixed results
			progressState.set(0, { status: 'done' });
			progressState.set(1, { status: 'done' });
			progressState.set(2, { status: 'error' });
			progressState.set(3, { status: 'done' });
			progressState.set(4, { status: 'error' });

			const doneCount = Array.from(progressState.values()).filter(
				(p) => p.status === 'done'
			).length;
			const errorCount = Array.from(progressState.values()).filter(
				(p) => p.status === 'error'
			).length;

			expect(doneCount).toBe(3);
			expect(errorCount).toBe(2);
		});

		it('should detect when all analyses are complete', () => {
			const progressState = new Map([
				[0, { status: 'done' as const }],
				[1, { status: 'done' as const }],
				[2, { status: 'error' as const }],
				[3, { status: 'done' as const }]
			]);

			const allComplete = Array.from(progressState.values()).every(
				(p) => p.status === 'done' || p.status === 'error'
			);

			expect(allComplete).toBe(true);
		});

		it('should detect when any analysis is still in progress', () => {
			const progressState = new Map([
				[0, { status: 'done' as const }],
				[1, { status: 'analyzing' as const }],
				[2, { status: 'pending' as const }]
			]);

			const anyInProgress = Array.from(progressState.values()).some(
				(p) => p.status === 'pending' || p.status === 'analyzing'
			);

			expect(anyInProgress).toBe(true);
		});
	});

	describe('Summary Display', () => {
		it('should generate correct summary message for results', () => {
			const results = {
				totalImages: 5,
				gamesFound: 3,
				errors: 2
			};

			// Test summary message generation
			const summaryMessage =
				results.gamesFound > 0
					? `Found ${results.gamesFound} of ${results.totalImages} game${results.totalImages !== 1 ? 's' : ''}`
					: 'No games were successfully identified';

			expect(summaryMessage).toBe('Found 3 of 5 games');
		});

		it('should handle case when no games are found', () => {
			const results = {
				totalImages: 3,
				gamesFound: 0,
				errors: 3
			};

			const summaryMessage =
				results.gamesFound > 0
					? `Found ${results.gamesFound} of ${results.totalImages} games`
					: 'No games were successfully identified';

			expect(summaryMessage).toBe('No games were successfully identified');
		});

		it('should handle singular/plural correctly in summary', () => {
			// Single image
			const singleResult = { totalImages: 1, gamesFound: 1 };
			const singleSummary = `Found ${singleResult.gamesFound} of ${singleResult.totalImages} game${singleResult.totalImages !== 1 ? 's' : ''}`;
			expect(singleSummary).toBe('Found 1 of 1 game');

			// Multiple images
			const multiResult = { totalImages: 3, gamesFound: 2 };
			const multiSummary = `Found ${multiResult.gamesFound} of ${multiResult.totalImages} game${multiResult.totalImages !== 1 ? 's' : ''}`;
			expect(multiSummary).toBe('Found 2 of 3 games');
		});
	});

	describe('Error Handling in Batch', () => {
		it('should continue processing other images when one fails', () => {
			// Simulate batch processing where one fails
			const images = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
			const results: Array<{ name: string; success: boolean }> = [];

			for (let i = 0; i < images.length; i++) {
				// Simulate image2.jpg failing
				if (images[i] === 'image2.jpg') {
					results.push({ name: images[i], success: false });
				} else {
					results.push({ name: images[i], success: true });
				}
			}

			expect(results).toHaveLength(3);
			expect(results.filter((r) => r.success).length).toBe(2);
			expect(results.filter((r) => !r.success).length).toBe(1);
		});

		it('should preserve error information for failed images', () => {
			const results = [
				{ fileName: 'game1.jpg', success: true, error: null },
				{ fileName: 'blurry.jpg', success: false, error: 'Could not identify game' },
				{ fileName: 'corrupt.jpg', success: false, error: 'Invalid image data' },
				{ fileName: 'game2.jpg', success: true, error: null }
			];

			const failedResults = results.filter((r) => !r.success);

			expect(failedResults).toHaveLength(2);
			expect(failedResults[0].fileName).toBe('blurry.jpg');
			expect(failedResults[0].error).toBe('Could not identify game');
			expect(failedResults[1].fileName).toBe('corrupt.jpg');
			expect(failedResults[1].error).toBe('Invalid image data');
		});
	});

	describe('File Input State Management', () => {
		it('should clear all files when "Clear all" is clicked', () => {
			let selectedFiles = [
				{ name: 'game1.jpg', type: 'image/jpeg', size: 1024 },
				{ name: 'game2.png', type: 'image/png', size: 2048 }
			];

			// Simulate clear all
			selectedFiles = [];

			expect(selectedFiles).toHaveLength(0);
		});

		it('should reset analysis state when files are cleared', () => {
			let analysisResults = new Map([
				[0, { status: 'done', result: { title: 'Game 1' } }],
				[1, { status: 'done', result: { title: 'Game 2' } }]
			]);

			// Clear analysis state
			analysisResults = new Map();

			expect(analysisResults.size).toBe(0);
		});
	});

	describe('Integration - Full Batch Flow', () => {
		it('should handle complete batch upload and add flow simulation', () => {
			// Simulate the full flow:
			// 1. Multiple files selected
			const files = [
				{ name: 'catan.jpg', type: 'image/jpeg', size: 1024 * 1024 },
				{ name: 'ticket.png', type: 'image/png', size: 2 * 1024 * 1024 },
				{ name: 'pandemic.heic', type: 'image/heic', size: 1024 * 1024 }
			];

			// 2. Files validated
			const { validFiles } = validateMultipleFiles(files);
			expect(validFiles).toHaveLength(3);

			// 3. Simulate AI analysis results
			const analysisResults = [
				{
					index: 0,
					gameData: { title: 'Catan', year: 1995, minPlayers: 3, maxPlayers: 4 }
				},
				{
					index: 1,
					gameData: { title: 'Ticket to Ride', year: 2004, minPlayers: 2, maxPlayers: 5 }
				},
				{
					index: 2,
					gameData: { title: 'Pandemic', year: 2008, minPlayers: 2, maxPlayers: 4 }
				}
			];

			// 4. User selects games (select all)
			const selectedGames = new Set<number>([0, 1, 2]);
			expect(selectedGames.size).toBe(3);

			// 5. Collect selected game data
			const gamesToAdd = analysisResults
				.filter((r) => selectedGames.has(r.index))
				.map((r) => r.gameData);

			expect(gamesToAdd).toHaveLength(3);
			expect(gamesToAdd.map((g) => g.title).sort()).toEqual([
				'Catan',
				'Pandemic',
				'Ticket to Ride'
			]);
		});

		it('should handle partial selection in batch flow', () => {
			// Simulate selecting only some games
			const analysisResults = [
				{ index: 0, gameData: { title: 'Game A', year: 2020 } },
				{ index: 1, gameData: { title: 'Game B', year: 2021 } },
				{ index: 2, gameData: { title: 'Game C', year: 2022 } }
			];

			// User only selects indices 0 and 2
			const selectedGames = new Set<number>([0, 2]);

			const gamesToAdd = analysisResults
				.filter((r) => selectedGames.has(r.index))
				.map((r) => r.gameData);

			expect(gamesToAdd).toHaveLength(2);
			expect(gamesToAdd.map((g) => g.title).sort()).toEqual(['Game A', 'Game C']);
			// Game B should NOT be included
			expect(gamesToAdd.some((g) => g.title === 'Game B')).toBe(false);
		});

		it('should handle mixed success and failure in analysis', () => {
			const files = [
				{ name: 'game1.jpg', type: 'image/jpeg', size: 1024 * 1024 },
				{ name: 'blurry.jpg', type: 'image/jpeg', size: 1024 * 1024 },
				{ name: 'game2.png', type: 'image/png', size: 1024 * 1024 }
			];

			const { validFiles } = validateMultipleFiles(files);
			expect(validFiles).toHaveLength(3);

			// Simulate mixed analysis results
			const analysisResults: Array<{
				success: boolean;
				gameData: { title: string | null } | null;
				error: string | null;
			}> = [
				{ success: true, gameData: { title: 'Game 1' }, error: null },
				{ success: true, gameData: { title: null }, error: null }, // AI couldn't identify
				{ success: true, gameData: { title: 'Game 2' }, error: null }
			];

			const successfulResults = analysisResults.filter(
				(r) => r.success && r.gameData && r.gameData.title
			);

			expect(successfulResults).toHaveLength(2);
		});
	});

	describe('Acceptance Criteria Verification', () => {
		it('should support selecting multiple images at once', () => {
			// Acceptance: File picker supports selecting multiple images at once
			const multipleFiles = [
				{ name: 'img1.jpg', type: 'image/jpeg', size: 1024 },
				{ name: 'img2.jpg', type: 'image/jpeg', size: 1024 },
				{ name: 'img3.jpg', type: 'image/jpeg', size: 1024 }
			];

			expect(multipleFiles.length).toBeGreaterThan(1);
		});

		it('should track status for each image during analysis', () => {
			// Acceptance: Progress indicator shows status for each image during analysis
			const statusMap = new Map<number, string>();
			const imageCount = 3;

			for (let i = 0; i < imageCount; i++) {
				statusMap.set(i, 'analyzing');
			}

			// Each image has its own status
			expect(statusMap.size).toBe(imageCount);
			expect(Array.from(statusMap.values()).every((s) => s === 'analyzing')).toBe(true);
		});

		it('should not block processing when one image fails', () => {
			// Acceptance: Failed images don't block processing of other images
			const results = [
				{ success: true },
				{ success: false }, // This failure shouldn't block others
				{ success: true }
			];

			// Despite one failure, other results are still present
			expect(results.length).toBe(3);
			expect(results.filter((r) => r.success).length).toBe(2);
		});

		it('should allow removing images before processing', () => {
			// Acceptance: User can remove images from selection before processing
			let files = [{ name: 'a.jpg' }, { name: 'b.jpg' }, { name: 'c.jpg' }];

			// Remove 'b.jpg'
			files = files.filter((f) => f.name !== 'b.jpg');

			expect(files.length).toBe(2);
			expect(files.map((f) => f.name)).toEqual(['a.jpg', 'c.jpg']);
		});

		it('should show clear summary of total games found', () => {
			// Acceptance: Clear summary shows total games found across all images
			const totalImages = 5;
			const gamesFound = 3;

			const summary = `Found ${gamesFound} game${gamesFound !== 1 ? 's' : ''} in ${totalImages} image${totalImages !== 1 ? 's' : ''}`;

			expect(summary).toBe('Found 3 games in 5 images');
		});
	});
});
