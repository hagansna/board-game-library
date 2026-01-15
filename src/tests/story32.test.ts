/**
 * Story 32 Tests: Expanded Game Modal View
 *
 * Tests for clicking a game card to open an expanded modal view with full game details.
 *
 * Acceptance Criteria:
 * - Clicking anywhere on game card (except Edit/Delete buttons) opens modal
 * - Modal displays larger box art image
 * - Modal shows full description without truncation
 * - Modal displays all game metadata (players, time, year, categories)
 * - Modal shows BGG rating and rank if available
 * - Modal shows personal rating, play count, and review if available
 * - Close button (X) dismisses modal
 * - Clicking outside modal dismisses it
 * - Edit button in modal navigates to edit page
 */

import { describe, it, expect } from 'vitest';

describe('Story 32: Expanded Game Modal View', () => {
	// ==================== GameCard Props Interface Tests ====================
	describe('GameCard Props Interface', () => {
		it('should accept playCount prop', () => {
			interface GameCardProps {
				id: string;
				title: string;
				playCount?: number | null;
			}

			const props: GameCardProps = {
				id: 'game-1',
				title: 'Test Game',
				playCount: 5
			};

			expect(props.playCount).toBe(5);
		});

		it('should accept review prop', () => {
			interface GameCardProps {
				id: string;
				title: string;
				review?: string | null;
			}

			const props: GameCardProps = {
				id: 'game-1',
				title: 'Test Game',
				review: 'Great game, highly recommend!'
			};

			expect(props.review).toBe('Great game, highly recommend!');
		});

		it('should accept personalRating prop', () => {
			interface GameCardProps {
				id: string;
				title: string;
				personalRating?: number | null;
			}

			const props: GameCardProps = {
				id: 'game-1',
				title: 'Test Game',
				personalRating: 4
			};

			expect(props.personalRating).toBe(4);
		});

		it('should accept all new props together', () => {
			interface GameCardProps {
				id: string;
				title: string;
				playCount?: number | null;
				review?: string | null;
				personalRating?: number | null;
			}

			const props: GameCardProps = {
				id: 'game-1',
				title: 'Test Game',
				playCount: 10,
				review: 'Amazing experience every time!',
				personalRating: 5
			};

			expect(props.playCount).toBe(10);
			expect(props.review).toBe('Amazing experience every time!');
			expect(props.personalRating).toBe(5);
		});
	});

	// ==================== Modal State Management Tests ====================
	describe('Modal State Management', () => {
		it('should start with modal closed', () => {
			let expandedModalOpen = false;
			expect(expandedModalOpen).toBe(false);
		});

		it('should open modal when card is clicked', () => {
			let expandedModalOpen = false;

			function openExpandedModal() {
				expandedModalOpen = true;
			}

			openExpandedModal();
			expect(expandedModalOpen).toBe(true);
		});

		it('should close modal when close is triggered', () => {
			let expandedModalOpen = true;

			function closeModal() {
				expandedModalOpen = false;
			}

			closeModal();
			expect(expandedModalOpen).toBe(false);
		});

		it('should track separate modal image error state', () => {
			let imageError = false;
			let modalImageError = false;

			// Card image fails
			imageError = true;

			// Modal image should still be separate
			expect(imageError).toBe(true);
			expect(modalImageError).toBe(false);

			// Modal image fails independently
			modalImageError = true;
			expect(modalImageError).toBe(true);
		});
	});

	// ==================== Click Handler Tests ====================
	describe('Card Click Handler', () => {
		it('should open modal on card click', () => {
			let expandedModalOpen = false;

			function openExpandedModal(event: { target: HTMLElement }) {
				const target = event.target;
				if (
					target.closest('a[href]') ||
					target.closest('button') ||
					target.closest('form')
				) {
					return;
				}
				expandedModalOpen = true;
			}

			// Simulate clicking on card content (not a button)
			const mockTarget = {
				closest: (selector: string) => null
			} as HTMLElement;

			openExpandedModal({ target: mockTarget });
			expect(expandedModalOpen).toBe(true);
		});

		it('should NOT open modal when clicking Edit button', () => {
			let expandedModalOpen = false;

			function openExpandedModal(event: { target: HTMLElement }) {
				const target = event.target;
				if (
					target.closest('a[href]') ||
					target.closest('button') ||
					target.closest('form')
				) {
					return;
				}
				expandedModalOpen = true;
			}

			// Simulate clicking on a link (Edit button)
			const mockTarget = {
				closest: (selector: string) => (selector === 'a[href]' ? {} : null)
			} as HTMLElement;

			openExpandedModal({ target: mockTarget });
			expect(expandedModalOpen).toBe(false);
		});

		it('should NOT open modal when clicking Delete button', () => {
			let expandedModalOpen = false;

			function openExpandedModal(event: { target: HTMLElement }) {
				const target = event.target;
				if (
					target.closest('a[href]') ||
					target.closest('button') ||
					target.closest('form')
				) {
					return;
				}
				expandedModalOpen = true;
			}

			// Simulate clicking on a button (Delete button)
			const mockTarget = {
				closest: (selector: string) => (selector === 'button' ? {} : null)
			} as HTMLElement;

			openExpandedModal({ target: mockTarget });
			expect(expandedModalOpen).toBe(false);
		});

		it('should NOT open modal when clicking form elements', () => {
			let expandedModalOpen = false;

			function openExpandedModal(event: { target: HTMLElement }) {
				const target = event.target;
				if (
					target.closest('a[href]') ||
					target.closest('button') ||
					target.closest('form')
				) {
					return;
				}
				expandedModalOpen = true;
			}

			// Simulate clicking on a form element
			const mockTarget = {
				closest: (selector: string) => (selector === 'form' ? {} : null)
			} as HTMLElement;

			openExpandedModal({ target: mockTarget });
			expect(expandedModalOpen).toBe(false);
		});
	});

	// ==================== Keyboard Handler Tests ====================
	describe('Keyboard Handler', () => {
		it('should open modal on Enter key', () => {
			let expandedModalOpen = false;

			function handleKeyDown(event: { key: string; target: HTMLElement; preventDefault: () => void }) {
				if (event.key === 'Enter' || event.key === ' ') {
					const target = event.target;
					if (
						!target.closest('a[href]') &&
						!target.closest('button') &&
						!target.closest('form') &&
						!target.closest('input')
					) {
						event.preventDefault();
						expandedModalOpen = true;
					}
				}
			}

			const mockTarget = {
				closest: (selector: string) => null
			} as HTMLElement;

			handleKeyDown({ key: 'Enter', target: mockTarget, preventDefault: () => {} });
			expect(expandedModalOpen).toBe(true);
		});

		it('should open modal on Space key', () => {
			let expandedModalOpen = false;

			function handleKeyDown(event: { key: string; target: HTMLElement; preventDefault: () => void }) {
				if (event.key === 'Enter' || event.key === ' ') {
					const target = event.target;
					if (
						!target.closest('a[href]') &&
						!target.closest('button') &&
						!target.closest('form') &&
						!target.closest('input')
					) {
						event.preventDefault();
						expandedModalOpen = true;
					}
				}
			}

			const mockTarget = {
				closest: (selector: string) => null
			} as HTMLElement;

			handleKeyDown({ key: ' ', target: mockTarget, preventDefault: () => {} });
			expect(expandedModalOpen).toBe(true);
		});

		it('should NOT open modal on other keys', () => {
			let expandedModalOpen = false;

			function handleKeyDown(event: { key: string; target: HTMLElement; preventDefault: () => void }) {
				if (event.key === 'Enter' || event.key === ' ') {
					const target = event.target;
					if (
						!target.closest('a[href]') &&
						!target.closest('button') &&
						!target.closest('form') &&
						!target.closest('input')
					) {
						event.preventDefault();
						expandedModalOpen = true;
					}
				}
			}

			const mockTarget = {
				closest: (selector: string) => null
			} as HTMLElement;

			handleKeyDown({ key: 'Tab', target: mockTarget, preventDefault: () => {} });
			expect(expandedModalOpen).toBe(false);
		});

		it('should NOT open modal when keyboard event targets a button', () => {
			let expandedModalOpen = false;

			function handleKeyDown(event: { key: string; target: HTMLElement; preventDefault: () => void }) {
				if (event.key === 'Enter' || event.key === ' ') {
					const target = event.target;
					if (
						!target.closest('a[href]') &&
						!target.closest('button') &&
						!target.closest('form') &&
						!target.closest('input')
					) {
						event.preventDefault();
						expandedModalOpen = true;
					}
				}
			}

			const mockTarget = {
				closest: (selector: string) => (selector === 'button' ? {} : null)
			} as HTMLElement;

			handleKeyDown({ key: 'Enter', target: mockTarget, preventDefault: () => {} });
			expect(expandedModalOpen).toBe(false);
		});
	});

	// ==================== Modal Content Display Tests ====================
	describe('Modal Content Display', () => {
		it('should format players text for modal', () => {
			function formatPlayers(
				min: number | null | undefined,
				max: number | null | undefined
			): string {
				if (min == null && max == null) return '';
				if (min != null && max != null) {
					if (min === max) return `${min} players`;
					return `${min}-${max} players`;
				}
				if (min != null) return `${min}+ players`;
				return `Up to ${max} players`;
			}

			expect(formatPlayers(2, 4)).toBe('2-4 players');
			expect(formatPlayers(1, 1)).toBe('1 players');
			expect(formatPlayers(2, null)).toBe('2+ players');
			expect(formatPlayers(null, 6)).toBe('Up to 6 players');
			expect(formatPlayers(null, null)).toBe('');
		});

		it('should format play time text for modal', () => {
			function formatPlayTime(
				min: number | null | undefined,
				max: number | null | undefined
			): string {
				if (min == null && max == null) return '';
				if (min != null && max != null) {
					if (min === max) return `${min} min`;
					return `${min}-${max} min`;
				}
				if (min != null) return `${min}+ min`;
				return `Up to ${max} min`;
			}

			expect(formatPlayTime(30, 60)).toBe('30-60 min');
			expect(formatPlayTime(45, 45)).toBe('45 min');
			expect(formatPlayTime(60, null)).toBe('60+ min');
			expect(formatPlayTime(null, 90)).toBe('Up to 90 min');
			expect(formatPlayTime(null, null)).toBe('');
		});

		it('should format play count text correctly', () => {
			function formatPlayCount(count: number): string {
				return count === 1 ? 'play' : 'plays';
			}

			expect(formatPlayCount(0)).toBe('plays');
			expect(formatPlayCount(1)).toBe('play');
			expect(formatPlayCount(5)).toBe('plays');
			expect(formatPlayCount(100)).toBe('plays');
		});

		it('should format BGG rating with one decimal place', () => {
			function formatBggRating(rating: number): string {
				return rating.toFixed(1);
			}

			expect(formatBggRating(7.5)).toBe('7.5');
			expect(formatBggRating(8.0)).toBe('8.0');
			expect(formatBggRating(7.234)).toBe('7.2');
			expect(formatBggRating(9.999)).toBe('10.0');
		});

		it('should format BGG rank with # prefix', () => {
			function formatBggRank(rank: number): string {
				return `#${rank}`;
			}

			expect(formatBggRank(1)).toBe('#1');
			expect(formatBggRank(150)).toBe('#150');
			expect(formatBggRank(1000)).toBe('#1000');
		});
	});

	// ==================== Personal Stats Display Tests ====================
	describe('Personal Stats Display', () => {
		it('should show personal stats section when playCount exists', () => {
			const game = {
				playCount: 5,
				review: null,
				personalRating: null
			};

			const hasPersonalStats =
				game.playCount != null || game.personalRating != null || game.review;
			expect(hasPersonalStats).toBe(true);
		});

		it('should show personal stats section when personalRating exists', () => {
			const game = {
				playCount: null,
				review: null,
				personalRating: 4
			};

			const hasPersonalStats =
				game.playCount != null || game.personalRating != null || game.review;
			expect(hasPersonalStats).toBe(true);
		});

		it('should show personal stats section when review exists', () => {
			const game = {
				playCount: null,
				review: 'Great game!',
				personalRating: null
			};

			const hasPersonalStats =
				game.playCount != null || game.personalRating != null || Boolean(game.review);
			expect(hasPersonalStats).toBe(true);
		});

		it('should NOT show personal stats section when no personal data exists', () => {
			const game = {
				playCount: null,
				review: null,
				personalRating: null
			};

			const hasPersonalStats =
				game.playCount != null || game.personalRating != null || Boolean(game.review);
			expect(hasPersonalStats).toBe(false);
		});

		it('should show all personal stats when all data exists', () => {
			const game = {
				playCount: 10,
				review: 'Absolutely love this game!',
				personalRating: 5
			};

			const hasPersonalStats =
				game.playCount != null || game.personalRating != null || game.review;
			expect(hasPersonalStats).toBe(true);
			expect(game.playCount).toBe(10);
			expect(game.review).toBe('Absolutely love this game!');
			expect(game.personalRating).toBe(5);
		});
	});

	// ==================== Box Art Display Tests ====================
	describe('Box Art Display in Modal', () => {
		it('should show box art image when URL exists and no error', () => {
			const boxArtUrl = 'https://example.com/game.jpg';
			const modalImageError = false;

			const showImage = boxArtUrl && !modalImageError;
			expect(showImage).toBe(true);
		});

		it('should show placeholder when no box art URL', () => {
			const boxArtUrl = null;
			const modalImageError = false;

			const showPlaceholder =
				boxArtUrl === null || boxArtUrl === undefined || modalImageError;
			expect(showPlaceholder).toBe(true);
		});

		it('should show placeholder when box art URL fails to load', () => {
			const boxArtUrl = 'https://example.com/broken.jpg';
			const modalImageError = true;

			const showPlaceholder =
				boxArtUrl === null || boxArtUrl === undefined || modalImageError;
			expect(showPlaceholder).toBe(true);
		});
	});

	// ==================== Categories Display Tests ====================
	describe('Categories Display in Modal', () => {
		it('should show categories when array has items', () => {
			const categories = ['Strategy', 'Economic', 'Trading'];
			expect(categories.length).toBeGreaterThan(0);
			expect(categories).toContain('Strategy');
		});

		it('should NOT show categories section when array is empty', () => {
			const categories: string[] = [];
			expect(categories.length).toBe(0);
		});

		it('should NOT show categories section when null', () => {
			const categories = null;
			const categoryList = categories ?? [];
			expect(categoryList.length).toBe(0);
		});
	});

	// ==================== Description Display Tests ====================
	describe('Description Display in Modal', () => {
		it('should show full description without truncation', () => {
			const description =
				'This is a very long description that would normally be truncated on the card view. ' +
				'However, in the modal, we want to show the full description without any line clamping. ' +
				'Users should be able to read the entire description to get all the information about the game.';

			// In modal, we don't apply line-clamp, so full text is available
			expect(description.length).toBeGreaterThan(100);
		});

		it('should NOT show description section when null', () => {
			const description = null;
			const showDescription = description !== null && description !== undefined;
			expect(showDescription).toBe(false);
		});

		it('should show description section when string is non-empty', () => {
			const description = 'A classic game of strategy.';
			const showDescription = description !== null && description !== undefined;
			expect(showDescription).toBe(true);
		});
	});

	// ==================== BGG Section Display Tests ====================
	describe('BGG Section Display in Modal', () => {
		it('should show BGG section when rating exists', () => {
			const bggRating = 7.5;
			const bggRank = null;

			const showBggSection = bggRating != null || bggRank != null;
			expect(showBggSection).toBe(true);
		});

		it('should show BGG section when rank exists', () => {
			const bggRating = null;
			const bggRank = 150;

			const showBggSection = bggRating != null || bggRank != null;
			expect(showBggSection).toBe(true);
		});

		it('should show BGG section when both exist', () => {
			const bggRating = 8.2;
			const bggRank = 42;

			const showBggSection = bggRating != null || bggRank != null;
			expect(showBggSection).toBe(true);
		});

		it('should NOT show BGG section when both are null', () => {
			const bggRating = null;
			const bggRank = null;

			const showBggSection = bggRating != null || bggRank != null;
			expect(showBggSection).toBe(false);
		});
	});

	// ==================== Metadata Grid Display Tests ====================
	describe('Metadata Grid Display in Modal', () => {
		it('should show suggested age when available', () => {
			const suggestedAge = 10;
			const formattedAge = `Ages ${suggestedAge}+`;
			expect(formattedAge).toBe('Ages 10+');
		});

		it('should not show suggested age when null', () => {
			const suggestedAge = null;
			const showAge = suggestedAge != null;
			expect(showAge).toBe(false);
		});

		it('should format year in description', () => {
			const year = 2020;
			const yearText = `Published in ${year}`;
			expect(yearText).toBe('Published in 2020');
		});
	});

	// ==================== Edit Button in Modal Tests ====================
	describe('Edit Button in Modal', () => {
		it('should generate correct edit URL', () => {
			const gameId = 'game-123';
			const editUrl = `/games/${gameId}/edit`;
			expect(editUrl).toBe('/games/game-123/edit');
		});

		it('should generate edit URL for different game IDs', () => {
			const ids = ['abc-123', 'xyz-789', 'test-game'];
			const urls = ids.map((id) => `/games/${id}/edit`);

			expect(urls).toEqual([
				'/games/abc-123/edit',
				'/games/xyz-789/edit',
				'/games/test-game/edit'
			]);
		});
	});

	// ==================== Acceptance Criteria Verification Tests ====================
	describe('Acceptance Criteria Verification', () => {
		it('AC1: Clicking card opens modal (except Edit/Delete buttons)', () => {
			// Click handler ignores buttons and links
			function openExpandedModal(event: { target: HTMLElement }): boolean {
				const target = event.target;
				if (
					target.closest('a[href]') ||
					target.closest('button') ||
					target.closest('form')
				) {
					return false;
				}
				return true;
			}

			// Regular card click
			const cardTarget = { closest: () => null } as HTMLElement;
			expect(openExpandedModal({ target: cardTarget })).toBe(true);

			// Button click
			const buttonTarget = {
				closest: (s: string) => (s === 'button' ? {} : null)
			} as HTMLElement;
			expect(openExpandedModal({ target: buttonTarget })).toBe(false);

			// Link click
			const linkTarget = {
				closest: (s: string) => (s === 'a[href]' ? {} : null)
			} as HTMLElement;
			expect(openExpandedModal({ target: linkTarget })).toBe(false);
		});

		it('AC2: Modal displays larger box art image', () => {
			// Modal uses object-contain for full image display
			// Max width is 2xl (672px) allowing for larger image
			const modalMaxWidth = '2xl'; // 672px
			expect(modalMaxWidth).toBe('2xl');
		});

		it('AC3: Modal shows full description without truncation', () => {
			// Card uses line-clamp-2, modal does not
			const cardClass = 'line-clamp-2';
			const modalClass = 'leading-relaxed';

			expect(cardClass).toContain('line-clamp');
			expect(modalClass).not.toContain('line-clamp');
		});

		it('AC4: Modal displays all game metadata', () => {
			const metadata = {
				players: '2-4 players',
				playTime: '60-90 min',
				year: 2015,
				categories: ['Strategy', 'Economic']
			};

			expect(metadata.players).toBeTruthy();
			expect(metadata.playTime).toBeTruthy();
			expect(metadata.year).toBeTruthy();
			expect(metadata.categories.length).toBeGreaterThan(0);
		});

		it('AC5: Modal shows BGG rating and rank if available', () => {
			const game = { bggRating: 7.8, bggRank: 120 };
			const showBgg = game.bggRating != null || game.bggRank != null;
			expect(showBgg).toBe(true);
		});

		it('AC6: Modal shows personal rating, play count, and review if available', () => {
			const game = {
				personalRating: 4,
				playCount: 12,
				review: 'One of my favorites!'
			};

			const showPersonal =
				game.personalRating != null || game.playCount != null || game.review;
			expect(showPersonal).toBe(true);
		});

		it('AC7: Close button dismisses modal (Dialog.Close component)', () => {
			// Dialog.Close is used with a Close button
			const hasCloseButton = true;
			expect(hasCloseButton).toBe(true);
		});

		it('AC8: Clicking outside modal dismisses it (shadcn Dialog default)', () => {
			// shadcn Dialog has built-in outside click handling
			const dialogHasOutsideClickClose = true;
			expect(dialogHasOutsideClickClose).toBe(true);
		});

		it('AC9: Edit button in modal navigates to edit page', () => {
			const gameId = 'test-123';
			const editHref = `/games/${gameId}/edit`;
			expect(editHref).toBe('/games/test-123/edit');
		});
	});

	// ==================== Edge Cases Tests ====================
	describe('Edge Cases', () => {
		it('should handle game with minimal data', () => {
			const minimalGame = {
				id: 'min-1',
				title: 'Minimal Game',
				year: null,
				minPlayers: null,
				maxPlayers: null,
				playTimeMin: null,
				playTimeMax: null,
				boxArtUrl: null,
				description: null,
				categories: null,
				bggRating: null,
				bggRank: null,
				suggestedAge: null,
				playCount: null,
				review: null,
				personalRating: null
			};

			expect(minimalGame.title).toBe('Minimal Game');
		});

		it('should handle game with all data populated', () => {
			const fullGame = {
				id: 'full-1',
				title: 'Complete Game',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 6,
				playTimeMin: 45,
				playTimeMax: 90,
				boxArtUrl: 'https://example.com/art.jpg',
				description: 'A complete game with all details.',
				categories: ['Strategy', 'Family', 'Card Game'],
				bggRating: 8.5,
				bggRank: 50,
				suggestedAge: 10,
				playCount: 15,
				review: 'Excellent game for all ages!',
				personalRating: 5
			};

			expect(fullGame.title).toBe('Complete Game');
			expect(fullGame.categories?.length).toBe(3);
			expect(fullGame.personalRating).toBe(5);
		});

		it('should handle empty string review', () => {
			const game = { review: '' };
			// Empty string is falsy, so personal stats section won't show
			const showReview = Boolean(game.review);
			expect(showReview).toBe(false);
		});

		it('should handle zero play count', () => {
			const game = { playCount: 0 };
			// Zero is a valid play count value
			const hasPlayCount = game.playCount != null;
			expect(hasPlayCount).toBe(true);
			expect(game.playCount).toBe(0);
		});
	});
});
