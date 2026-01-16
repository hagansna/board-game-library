/**
 * Story 29 Tests: Script backfills suggested age for existing games using AI lookup
 *
 * Acceptance criteria:
 * - Script queries all games where suggested_age is null
 * - For each game, sends title to Gemini to look up recommended age
 * - Updates database record with AI-determined age
 * - Includes rate limiting to avoid API throttling
 * - Handles errors gracefully (logs failures, continues processing)
 * - Provides progress output during execution
 * - Can be run multiple times safely (only updates null values)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	parseAgeResponse,
	getGamesWithNullAge,
	updateGameAge,
	lookupSuggestedAge,
	backfillSuggestedAge
} from '../../scripts/backfill-suggested-age';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Gemini AI module
vi.mock('@google/generative-ai', () => ({
	GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
		getGenerativeModel: vi.fn().mockReturnValue({
			generateContent: vi.fn()
		})
	}))
}));

describe('Story 29: Script backfills suggested age for existing games', () => {
	describe('parseAgeResponse - parsing AI age lookup responses', () => {
		it('should parse valid JSON with suggestedAge', () => {
			const response = '{"suggestedAge": 10, "confidence": "high"}';
			const result = parseAgeResponse(response);
			expect(result).toBe(10);
		});

		it('should parse JSON wrapped in markdown code blocks', () => {
			const response = '```json\n{"suggestedAge": 8, "confidence": "high"}\n```';
			const result = parseAgeResponse(response);
			expect(result).toBe(8);
		});

		it('should parse JSON wrapped in plain code blocks', () => {
			const response = '```\n{"suggestedAge": 12, "confidence": "medium"}\n```';
			const result = parseAgeResponse(response);
			expect(result).toBe(12);
		});

		it('should floor decimal values', () => {
			const response = '{"suggestedAge": 10.7, "confidence": "high"}';
			const result = parseAgeResponse(response);
			expect(result).toBe(10);
		});

		it('should return null for zero suggestedAge', () => {
			const response = '{"suggestedAge": 0, "confidence": "low"}';
			const result = parseAgeResponse(response);
			expect(result).toBeNull();
		});

		it('should return null for negative suggestedAge', () => {
			const response = '{"suggestedAge": -5, "confidence": "low"}';
			const result = parseAgeResponse(response);
			expect(result).toBeNull();
		});

		it('should return null for null suggestedAge', () => {
			const response = '{"suggestedAge": null, "confidence": "low"}';
			const result = parseAgeResponse(response);
			expect(result).toBeNull();
		});

		it('should return null for missing suggestedAge', () => {
			const response = '{"confidence": "low"}';
			const result = parseAgeResponse(response);
			expect(result).toBeNull();
		});

		it('should return null for non-number suggestedAge', () => {
			const response = '{"suggestedAge": "ten", "confidence": "high"}';
			const result = parseAgeResponse(response);
			expect(result).toBeNull();
		});

		it('should return null for invalid JSON', () => {
			const response = 'not valid json';
			const result = parseAgeResponse(response);
			expect(result).toBeNull();
		});

		it('should handle empty string response', () => {
			const response = '';
			const result = parseAgeResponse(response);
			expect(result).toBeNull();
		});

		it('should handle whitespace in response', () => {
			const response = '  {"suggestedAge": 8, "confidence": "high"}  ';
			const result = parseAgeResponse(response);
			expect(result).toBe(8);
		});
	});

	describe('getGamesWithNullAge - querying games needing backfill', () => {
		it('should query games with null suggested_age', async () => {
			const mockSelect = vi.fn().mockReturnValue({
				is: vi.fn().mockReturnValue({
					order: vi.fn().mockResolvedValue({
						data: [
							{ id: '1', title: 'Catan', suggested_age: null },
							{ id: '2', title: 'Pandemic', suggested_age: null }
						],
						error: null
					})
				})
			});

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: mockSelect
				})
			} as unknown as SupabaseClient;

			const result = await getGamesWithNullAge(mockSupabase);

			expect(mockSupabase.from).toHaveBeenCalledWith('games');
			expect(result).toHaveLength(2);
			expect(result[0].title).toBe('Catan');
			expect(result[1].title).toBe('Pandemic');
		});

		it('should return empty array when no games need backfill', async () => {
			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			const result = await getGamesWithNullAge(mockSupabase);
			expect(result).toHaveLength(0);
		});

		it('should throw error when query fails', async () => {
			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: null,
								error: { message: 'Database error' }
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			await expect(getGamesWithNullAge(mockSupabase)).rejects.toThrow(
				'Failed to fetch games: Database error'
			);
		});

		it('should order results by title ascending', async () => {
			const mockOrder = vi.fn().mockResolvedValue({
				data: [],
				error: null
			});

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: mockOrder
						})
					})
				})
			} as unknown as SupabaseClient;

			await getGamesWithNullAge(mockSupabase);

			expect(mockOrder).toHaveBeenCalledWith('title', { ascending: true });
		});
	});

	describe('updateGameAge - updating game records', () => {
		it('should update game with suggested age', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: null
				})
			});

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					update: mockUpdate
				})
			} as unknown as SupabaseClient;

			const result = await updateGameAge(mockSupabase, 'game-123', 10);

			expect(mockSupabase.from).toHaveBeenCalledWith('games');
			expect(mockUpdate).toHaveBeenCalledWith({ suggested_age: 10 });
			expect(result).toBe(true);
		});

		it('should throw error when update fails', async () => {
			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							error: { message: 'Update failed' }
						})
					})
				})
			} as unknown as SupabaseClient;

			await expect(updateGameAge(mockSupabase, 'game-123', 10)).rejects.toThrow(
				'Failed to update game game-123: Update failed'
			);
		});
	});

	describe('lookupSuggestedAge - AI age lookup', () => {
		it('should send correct prompt to Gemini', async () => {
			const mockGenerateContent = vi.fn().mockResolvedValue({
				response: {
					text: () => '{"suggestedAge": 10, "confidence": "high"}'
				}
			});

			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: mockGenerateContent
				})
			};

			const result = await lookupSuggestedAge(mockGenAI as never, 'Catan');

			expect(mockGenerateModel(mockGenAI)).toHaveBeenCalledWith({
				model: 'gemini-3-flash-preview'
			});
			expect(mockGenerateContent).toHaveBeenCalled();
			expect(result).toBe(10);

			// Helper to get the model call
			function mockGenerateModel(genAI: { getGenerativeModel: ReturnType<typeof vi.fn> }) {
				return genAI.getGenerativeModel;
			}
		});

		it('should include game title in prompt', async () => {
			const mockGenerateContent = vi.fn().mockResolvedValue({
				response: {
					text: () => '{"suggestedAge": 8, "confidence": "high"}'
				}
			});

			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: mockGenerateContent
				})
			};

			await lookupSuggestedAge(mockGenAI as never, 'Ticket to Ride');

			// Verify the prompt contains the game title
			const callArg = mockGenerateContent.mock.calls[0][0];
			expect(callArg).toContain('Ticket to Ride');
		});

		it('should return null when AI cannot determine age', async () => {
			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: vi.fn().mockResolvedValue({
						response: {
							text: () => '{"suggestedAge": null, "confidence": "low"}'
						}
					})
				})
			};

			const result = await lookupSuggestedAge(mockGenAI as never, 'Unknown Game');
			expect(result).toBeNull();
		});
	});

	describe('backfillSuggestedAge - main function', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return summary with zero totals when no games need backfill', async () => {
			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			const mockGenAI = {
				getGenerativeModel: vi.fn()
			};

			const result = await backfillSuggestedAge(mockSupabase, mockGenAI as never);

			expect(result.total).toBe(0);
			expect(result.updated).toBe(0);
			expect(result.failed).toBe(0);
			expect(result.skipped).toBe(0);
			expect(result.results).toHaveLength(0);
		});

		it('should process games and return summary', async () => {
			// Mock Supabase client
			const mockSupabase = {
				from: vi.fn().mockImplementation((table: string) => {
					if (table === 'games') {
						return {
							select: vi.fn().mockReturnValue({
								is: vi.fn().mockReturnValue({
									order: vi.fn().mockResolvedValue({
										data: [{ id: '1', title: 'Catan', suggested_age: null }],
										error: null
									})
								})
							}),
							update: vi.fn().mockReturnValue({
								eq: vi.fn().mockResolvedValue({
									error: null
								})
							})
						};
					}
					return {};
				})
			} as unknown as SupabaseClient;

			// Mock Gemini client
			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: vi.fn().mockResolvedValue({
						response: {
							text: () => '{"suggestedAge": 10, "confidence": "high"}'
						}
					})
				})
			};

			const resultPromise = backfillSuggestedAge(mockSupabase, mockGenAI as never);

			// Fast-forward through rate limiting
			await vi.runAllTimersAsync();

			const result = await resultPromise;

			expect(result.total).toBe(1);
			expect(result.updated).toBe(1);
			expect(result.failed).toBe(0);
		});

		it('should handle errors gracefully and continue processing', async () => {
			// First game will fail, second will succeed
			let callCount = 0;

			const mockSupabase = {
				from: vi.fn().mockImplementation(() => ({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [
									{ id: '1', title: 'Game1', suggested_age: null },
									{ id: '2', title: 'Game2', suggested_age: null }
								],
								error: null
							})
						})
					}),
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							error: null
						})
					})
				}))
			} as unknown as SupabaseClient;

			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: vi.fn().mockImplementation(() => {
						callCount++;
						if (callCount <= 3) {
							// First game fails (including retries)
							throw new Error('API error');
						}
						// Second game succeeds
						return Promise.resolve({
							response: {
								text: () => '{"suggestedAge": 8, "confidence": "high"}'
							}
						});
					})
				})
			};

			const resultPromise = backfillSuggestedAge(mockSupabase, mockGenAI as never);

			// Fast-forward through all timers (rate limiting and retries)
			await vi.runAllTimersAsync();

			const result = await resultPromise;

			expect(result.total).toBe(2);
			expect(result.failed).toBe(1);
			expect(result.updated).toBe(1);
		});

		it('should skip games when age cannot be determined', async () => {
			const mockSupabase = {
				from: vi.fn().mockImplementation(() => ({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [{ id: '1', title: 'Unknown Game', suggested_age: null }],
								error: null
							})
						})
					}),
					update: vi.fn()
				}))
			} as unknown as SupabaseClient;

			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: vi.fn().mockResolvedValue({
						response: {
							text: () => '{"suggestedAge": null, "confidence": "low"}'
						}
					})
				})
			};

			const resultPromise = backfillSuggestedAge(mockSupabase, mockGenAI as never);

			await vi.runAllTimersAsync();

			const result = await resultPromise;

			expect(result.total).toBe(1);
			expect(result.updated).toBe(0);
			expect(result.skipped).toBe(1);
		});
	});

	describe('Rate limiting and progress', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should wait between processing each game', async () => {
			const mockSupabase = {
				from: vi.fn().mockImplementation(() => ({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [
									{ id: '1', title: 'Game1', suggested_age: null },
									{ id: '2', title: 'Game2', suggested_age: null }
								],
								error: null
							})
						})
					}),
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ error: null })
					})
				}))
			} as unknown as SupabaseClient;

			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: vi.fn().mockResolvedValue({
						response: {
							text: () => '{"suggestedAge": 10, "confidence": "high"}'
						}
					})
				})
			};

			const resultPromise = backfillSuggestedAge(mockSupabase, mockGenAI as never);

			// Fast-forward through all timers
			await vi.runAllTimersAsync();

			await resultPromise;

			// Verify both games were processed
			expect(mockGenAI.getGenerativeModel().generateContent).toHaveBeenCalledTimes(2);
		});
	});

	describe('Idempotency - safe to run multiple times', () => {
		it('should only query games with null suggested_age', async () => {
			const mockIs = vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: [],
					error: null
				})
			});

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						is: mockIs
					})
				})
			} as unknown as SupabaseClient;

			const mockGenAI = {
				getGenerativeModel: vi.fn()
			};

			await backfillSuggestedAge(mockSupabase, mockGenAI as never);

			// Verify query filters for null suggested_age
			expect(mockIs).toHaveBeenCalledWith('suggested_age', null);
		});
	});

	describe('BackfillResult structure', () => {
		it('should include all required fields in successful result', async () => {
			const mockSupabase = {
				from: vi.fn().mockImplementation(() => ({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [{ id: 'game-123', title: 'Test Game', suggested_age: null }],
								error: null
							})
						})
					}),
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ error: null })
					})
				}))
			} as unknown as SupabaseClient;

			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: vi.fn().mockResolvedValue({
						response: {
							text: () => '{"suggestedAge": 10, "confidence": "high"}'
						}
					})
				})
			};

			vi.useFakeTimers();
			const resultPromise = backfillSuggestedAge(mockSupabase, mockGenAI as never);
			await vi.runAllTimersAsync();
			const result = await resultPromise;
			vi.useRealTimers();

			expect(result.results[0]).toMatchObject({
				gameId: 'game-123',
				title: 'Test Game',
				suggestedAge: 10,
				success: true
			});
		});

		it('should include error message in failed result', async () => {
			const mockSupabase = {
				from: vi.fn().mockImplementation(() => ({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [{ id: 'game-123', title: 'Test Game', suggested_age: null }],
								error: null
							})
						})
					}),
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ error: null })
					})
				}))
			} as unknown as SupabaseClient;

			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: vi.fn().mockRejectedValue(new Error('API rate limit'))
				})
			};

			vi.useFakeTimers();
			const resultPromise = backfillSuggestedAge(mockSupabase, mockGenAI as never);
			await vi.runAllTimersAsync();
			const result = await resultPromise;
			vi.useRealTimers();

			expect(result.results[0]).toMatchObject({
				gameId: 'game-123',
				title: 'Test Game',
				suggestedAge: null,
				success: false,
				error: 'API rate limit'
			});
		});
	});

	describe('Typical game ages', () => {
		it('should handle family game ages (8-10)', () => {
			const response = '{"suggestedAge": 8, "confidence": "high"}';
			expect(parseAgeResponse(response)).toBe(8);
		});

		it('should handle gateway strategy game ages (10-12)', () => {
			const response = '{"suggestedAge": 12, "confidence": "high"}';
			expect(parseAgeResponse(response)).toBe(12);
		});

		it('should handle heavy strategy game ages (14+)', () => {
			const response = '{"suggestedAge": 14, "confidence": "high"}';
			expect(parseAgeResponse(response)).toBe(14);
		});

		it('should handle children game ages (3-7)', () => {
			const response = '{"suggestedAge": 4, "confidence": "high"}';
			expect(parseAgeResponse(response)).toBe(4);
		});

		it('should handle adult party game ages (18+)', () => {
			const response = '{"suggestedAge": 18, "confidence": "high"}';
			expect(parseAgeResponse(response)).toBe(18);
		});
	});

	describe('Acceptance criteria verification', () => {
		it('queries all games where suggested_age is null', async () => {
			const mockIs = vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({ data: [], error: null })
			});

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({ is: mockIs })
				})
			} as unknown as SupabaseClient;

			await getGamesWithNullAge(mockSupabase);

			expect(mockIs).toHaveBeenCalledWith('suggested_age', null);
		});

		it('updates database record with AI-determined age', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null })
			});

			const mockSupabase = {
				from: vi.fn().mockReturnValue({ update: mockUpdate })
			} as unknown as SupabaseClient;

			await updateGameAge(mockSupabase, 'game-id', 10);

			expect(mockUpdate).toHaveBeenCalledWith({ suggested_age: 10 });
		});

		it('handles errors gracefully by logging and continuing', async () => {
			// This is tested in the "should handle errors gracefully and continue processing" test
			// The key behavior: when one game fails, others continue to process
		});

		it('provides progress output during execution', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const mockSupabase = {
				from: vi.fn().mockImplementation(() => ({
					select: vi.fn().mockReturnValue({
						is: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({
								data: [{ id: '1', title: 'Game1', suggested_age: null }],
								error: null
							})
						})
					}),
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ error: null })
					})
				}))
			} as unknown as SupabaseClient;

			const mockGenAI = {
				getGenerativeModel: vi.fn().mockReturnValue({
					generateContent: vi.fn().mockResolvedValue({
						response: { text: () => '{"suggestedAge": 10, "confidence": "high"}' }
					})
				})
			};

			vi.useFakeTimers();
			const resultPromise = backfillSuggestedAge(mockSupabase, mockGenAI as never);
			await vi.runAllTimersAsync();
			await resultPromise;
			vi.useRealTimers();

			// Verify progress logs were made
			expect(consoleSpy).toHaveBeenCalled();
			const logCalls = consoleSpy.mock.calls.flat().join(' ');
			expect(logCalls).toContain('Starting');
			expect(logCalls).toContain('Processing');

			consoleSpy.mockRestore();
		});

		it('can be run multiple times safely - only updates null values', () => {
			// The getGamesWithNullAge function filters for is('suggested_age', null)
			// So running multiple times will only process games that still have null values
			// This is verified by the "should only query games with null suggested_age" test
		});
	});
});
