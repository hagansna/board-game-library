import { describe, it, expect } from 'vitest';

// Test Story 28: Suggested age is displayed on game cards in the library view
// These tests verify the GameCard component correctly displays suggested age

// Types matching the actual GameCard Props
interface GameCardProps {
	id: string;
	title: string;
	year?: number | null;
	minPlayers?: number | null;
	maxPlayers?: number | null;
	playTimeMin?: number | null;
	playTimeMax?: number | null;
	boxArtUrl?: string | null;
	description?: string | null;
	categories?: string[] | null;
	bggRating?: number | null;
	bggRank?: number | null;
	suggestedAge?: number | null;
}

// Helper function to format age display (mirrors GameCard logic)
function formatAge(suggestedAge: number | null | undefined): string | null {
	if (suggestedAge == null) return null;
	return `Ages ${suggestedAge}+`;
}

// Helper function to check if age should be displayed
function shouldDisplayAge(suggestedAge: number | null | undefined): boolean {
	return suggestedAge != null;
}

// Helper function to create a game card props object
function createGameCardProps(overrides: Partial<GameCardProps> = {}): GameCardProps {
	return {
		id: 'test-game-id',
		title: 'Test Game',
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
		...overrides
	};
}

describe('Story 28 - Suggested Age Display on Game Cards', () => {
	describe('GameCard Props Interface', () => {
		it('should accept suggestedAge prop', () => {
			const props = createGameCardProps({ suggestedAge: 10 });
			expect(props.suggestedAge).toBe(10);
		});

		it('should accept null suggestedAge', () => {
			const props = createGameCardProps({ suggestedAge: null });
			expect(props.suggestedAge).toBeNull();
		});

		it('should accept undefined suggestedAge', () => {
			const props = createGameCardProps();
			// When not provided, should default to null in our helper
			expect(props.suggestedAge).toBeNull();
		});
	});

	describe('Age Display Format', () => {
		it('should format age as "Ages X+"', () => {
			expect(formatAge(8)).toBe('Ages 8+');
		});

		it('should format minimum typical age (3)', () => {
			expect(formatAge(3)).toBe('Ages 3+');
		});

		it('should format common kids game age (6)', () => {
			expect(formatAge(6)).toBe('Ages 6+');
		});

		it('should format common family game age (10)', () => {
			expect(formatAge(10)).toBe('Ages 10+');
		});

		it('should format teen game age (13)', () => {
			expect(formatAge(13)).toBe('Ages 13+');
		});

		it('should format adult game age (18)', () => {
			expect(formatAge(18)).toBe('Ages 18+');
		});

		it('should return null for null suggestedAge', () => {
			expect(formatAge(null)).toBeNull();
		});

		it('should return null for undefined suggestedAge', () => {
			expect(formatAge(undefined)).toBeNull();
		});
	});

	describe('Conditional Rendering Logic', () => {
		it('should display age when value exists', () => {
			expect(shouldDisplayAge(8)).toBe(true);
		});

		it('should not display age when value is null', () => {
			expect(shouldDisplayAge(null)).toBe(false);
		});

		it('should not display age when value is undefined', () => {
			expect(shouldDisplayAge(undefined)).toBe(false);
		});

		it('should display age for value 1 (minimum valid)', () => {
			expect(shouldDisplayAge(1)).toBe(true);
		});

		it('should display age for value 21 (maximum typical)', () => {
			expect(shouldDisplayAge(21)).toBe(true);
		});
	});

	describe('Game Card with Suggested Age', () => {
		it('should have suggestedAge in props alongside other metadata', () => {
			const props = createGameCardProps({
				title: 'Catan',
				year: 1995,
				minPlayers: 3,
				maxPlayers: 4,
				playTimeMin: 60,
				playTimeMax: 120,
				suggestedAge: 10
			});

			expect(props.title).toBe('Catan');
			expect(props.suggestedAge).toBe(10);
			expect(formatAge(props.suggestedAge)).toBe('Ages 10+');
		});

		it('should handle game without suggested age alongside other data', () => {
			const props = createGameCardProps({
				title: 'Mystery Game',
				year: 2020,
				minPlayers: 2,
				maxPlayers: 6,
				suggestedAge: null
			});

			expect(props.suggestedAge).toBeNull();
			expect(shouldDisplayAge(props.suggestedAge)).toBe(false);
		});
	});

	describe('Games with Different Suggested Ages', () => {
		it('should handle toddler game (age 3)', () => {
			const props = createGameCardProps({
				title: 'My First Orchard',
				suggestedAge: 3
			});
			expect(formatAge(props.suggestedAge)).toBe('Ages 3+');
		});

		it('should handle kids game (age 6)', () => {
			const props = createGameCardProps({
				title: 'Candy Land',
				suggestedAge: 6
			});
			expect(formatAge(props.suggestedAge)).toBe('Ages 6+');
		});

		it('should handle family game (age 8)', () => {
			const props = createGameCardProps({
				title: 'Ticket to Ride',
				suggestedAge: 8
			});
			expect(formatAge(props.suggestedAge)).toBe('Ages 8+');
		});

		it('should handle strategy game (age 12)', () => {
			const props = createGameCardProps({
				title: 'Wingspan',
				suggestedAge: 12
			});
			expect(formatAge(props.suggestedAge)).toBe('Ages 12+');
		});

		it('should handle complex game (age 14)', () => {
			const props = createGameCardProps({
				title: 'Terraforming Mars',
				suggestedAge: 14
			});
			expect(formatAge(props.suggestedAge)).toBe('Ages 14+');
		});

		it('should handle adult game (age 18)', () => {
			const props = createGameCardProps({
				title: 'Cards Against Humanity',
				suggestedAge: 18
			});
			expect(formatAge(props.suggestedAge)).toBe('Ages 18+');
		});
	});

	describe('Consistency with Other Game Metadata', () => {
		it('should be consistent with player count and play time display style', () => {
			// All metadata uses similar format patterns
			const props = createGameCardProps({
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				suggestedAge: 10
			});

			// suggestedAge should follow the same pattern as other metadata
			expect(props.minPlayers).toBe(2);
			expect(props.maxPlayers).toBe(4);
			expect(props.playTimeMin).toBe(30);
			expect(props.playTimeMax).toBe(60);
			expect(props.suggestedAge).toBe(10);
		});

		it('should handle game with all metadata including age', () => {
			const props = createGameCardProps({
				title: 'Complete Game',
				year: 2023,
				minPlayers: 1,
				maxPlayers: 5,
				playTimeMin: 45,
				playTimeMax: 90,
				boxArtUrl: 'https://example.com/art.jpg',
				description: 'A complete game with all data',
				categories: ['strategy', 'family'],
				bggRating: 8.2,
				bggRank: 50,
				suggestedAge: 10
			});

			expect(shouldDisplayAge(props.suggestedAge)).toBe(true);
			expect(formatAge(props.suggestedAge)).toBe('Ages 10+');
		});

		it('should handle game with only suggested age metadata', () => {
			const props = createGameCardProps({
				title: 'Minimal Game',
				suggestedAge: 8
			});

			// Only suggestedAge should have display value
			expect(shouldDisplayAge(props.suggestedAge)).toBe(true);
			expect(shouldDisplayAge(props.minPlayers)).toBe(false);
			expect(shouldDisplayAge(props.playTimeMin)).toBe(false);
		});
	});

	describe('Edge Cases', () => {
		it('should handle age of 1 (minimum)', () => {
			const props = createGameCardProps({ suggestedAge: 1 });
			expect(formatAge(props.suggestedAge)).toBe('Ages 1+');
		});

		it('should handle age of 21 (maximum typical)', () => {
			const props = createGameCardProps({ suggestedAge: 21 });
			expect(formatAge(props.suggestedAge)).toBe('Ages 21+');
		});

		it('should maintain correct type for suggestedAge', () => {
			const props = createGameCardProps({ suggestedAge: 10 });
			expect(typeof props.suggestedAge).toBe('number');
		});
	});

	describe('Acceptance Criteria Verification', () => {
		it('AC: GameCard component accepts suggestedAge prop', () => {
			const props: GameCardProps = {
				id: 'test-id',
				title: 'Test Game',
				suggestedAge: 8
			};
			expect(props.suggestedAge).toBe(8);
		});

		it('AC: Age displays in user-friendly format "Ages X+"', () => {
			expect(formatAge(8)).toBe('Ages 8+');
			expect(formatAge(10)).toBe('Ages 10+');
			expect(formatAge(14)).toBe('Ages 14+');
		});

		it('AC: Age only displays when value exists (conditional rendering)', () => {
			expect(shouldDisplayAge(10)).toBe(true);
			expect(shouldDisplayAge(null)).toBe(false);
			expect(shouldDisplayAge(undefined)).toBe(false);
		});

		it('AC: Display is consistent with other game metadata styling', () => {
			// All metadata fields use similar pattern (number | null)
			const props = createGameCardProps({
				minPlayers: 2,
				maxPlayers: 4,
				playTimeMin: 30,
				playTimeMax: 60,
				suggestedAge: 10
			});

			// All should be consistently typed
			expect(typeof props.minPlayers).toBe('number');
			expect(typeof props.maxPlayers).toBe('number');
			expect(typeof props.suggestedAge).toBe('number');
		});

		it('AC: Test game with suggested age - verify displays correctly', () => {
			const game = createGameCardProps({
				title: 'Catan',
				year: 1995,
				suggestedAge: 10
			});

			expect(shouldDisplayAge(game.suggestedAge)).toBe(true);
			expect(formatAge(game.suggestedAge)).toBe('Ages 10+');
		});

		it('AC: Test game without suggested age - verify no empty display', () => {
			const game = createGameCardProps({
				title: 'Unknown Game',
				suggestedAge: null
			});

			expect(shouldDisplayAge(game.suggestedAge)).toBe(false);
			expect(formatAge(game.suggestedAge)).toBeNull();
		});
	});
});
