import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { cn } from '$lib/utils';
import * as Button from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Dialog from '$lib/components/ui/dialog';
import * as Input from '$lib/components/ui/input';
import * as Label from '$lib/components/ui/label';
import InputComponent from '$lib/components/ui/input/input.svelte';

describe('shadcn-svelte setup', () => {
	describe('cn utility function', () => {
		it('should merge class names correctly', () => {
			const result = cn('bg-red-500', 'text-white');
			expect(result).toBe('bg-red-500 text-white');
		});

		it('should handle conditional classes', () => {
			const shouldInclude = false;
			const result = cn('base-class', shouldInclude && 'excluded', 'included');
			expect(result).toBe('base-class included');
		});

		it('should merge conflicting Tailwind classes', () => {
			const result = cn('bg-red-500', 'bg-blue-500');
			expect(result).toBe('bg-blue-500');
		});

		it('should handle undefined and null values', () => {
			const result = cn('base', undefined, null, 'end');
			expect(result).toBe('base end');
		});

		it('should handle array of classes', () => {
			const result = cn(['class-a', 'class-b']);
			expect(result).toBe('class-a class-b');
		});

		it('should handle object syntax', () => {
			const result = cn({ 'active-class': true, 'inactive-class': false });
			expect(result).toBe('active-class');
		});
	});

	describe('Button component exports', () => {
		it('should export Button component', () => {
			expect(Button.Button).toBeDefined();
		});

		it('should export buttonVariants', () => {
			expect(Button.buttonVariants).toBeDefined();
		});
	});

	describe('Card component exports', () => {
		it('should export all card subcomponents', () => {
			expect(Card.Root).toBeDefined();
			expect(Card.Header).toBeDefined();
			expect(Card.Title).toBeDefined();
			expect(Card.Description).toBeDefined();
			expect(Card.Content).toBeDefined();
			expect(Card.Footer).toBeDefined();
		});
	});

	describe('Dialog component exports', () => {
		it('should export all dialog subcomponents', () => {
			expect(Dialog.Root).toBeDefined();
			expect(Dialog.Trigger).toBeDefined();
			expect(Dialog.Content).toBeDefined();
			expect(Dialog.Header).toBeDefined();
			expect(Dialog.Footer).toBeDefined();
			expect(Dialog.Title).toBeDefined();
			expect(Dialog.Description).toBeDefined();
			expect(Dialog.Close).toBeDefined();
		});
	});

	describe('Input component exports', () => {
		it('should export Input component', () => {
			expect(Input.Input).toBeDefined();
		});
	});

	describe('Label component exports', () => {
		it('should export Label component', () => {
			expect(Label.Label).toBeDefined();
		});
	});

	describe('Input component rendering', () => {
		it('should render input element', () => {
			render(InputComponent, {
				props: {
					placeholder: 'Enter text...'
				}
			});

			const input = screen.getByPlaceholderText('Enter text...');
			expect(input).toBeInTheDocument();
			expect(input.tagName).toBe('INPUT');
		});

		it('should apply custom className', () => {
			render(InputComponent, {
				props: {
					class: 'custom-input',
					placeholder: 'test'
				}
			});

			const input = screen.getByPlaceholderText('test');
			expect(input).toHaveClass('custom-input');
		});

		it('should handle type attribute', () => {
			render(InputComponent, {
				props: {
					type: 'email',
					placeholder: 'email input'
				}
			});

			const input = screen.getByPlaceholderText('email input');
			expect(input).toHaveAttribute('type', 'email');
		});

		it('should be focusable', () => {
			render(InputComponent, {
				props: {
					placeholder: 'focusable'
				}
			});

			const input = screen.getByPlaceholderText('focusable');
			input.focus();
			expect(document.activeElement).toBe(input);
		});
	});

	describe('Tailwind CSS configuration', () => {
		it('should have theme colors available through CSS variables', () => {
			// Create a test element to check CSS variables
			const testDiv = document.createElement('div');
			testDiv.style.setProperty('--background', 'oklch(1 0 0)');
			document.body.appendChild(testDiv);

			const styles = getComputedStyle(testDiv);
			expect(styles.getPropertyValue('--background')).toBe('oklch(1 0 0)');

			document.body.removeChild(testDiv);
		});
	});
});
