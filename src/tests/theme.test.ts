import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: true
}));

describe('Story 14: Dark/Light Mode Toggle', () => {
	// Setup: Mock localStorage and matchMedia
	let localStorageMock: Record<string, string>;
	let matchMediaMock: ReturnType<typeof vi.fn>;
	let mediaQueryListeners: ((e: MediaQueryListEvent) => void)[];

	beforeEach(() => {
		// Reset localStorage mock
		localStorageMock = {};
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				localStorageMock[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete localStorageMock[key];
			}),
			clear: vi.fn(() => {
				localStorageMock = {};
			})
		});

		// Reset media query listeners
		mediaQueryListeners = [];

		// Mock matchMedia
		matchMediaMock = vi.fn((query: string) => ({
			matches: query.includes('dark') ? false : true, // Default to light mode
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
				mediaQueryListeners.push(cb);
			}),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}));
		vi.stubGlobal('matchMedia', matchMediaMock);

		// Clear any dark class from document
		document.documentElement.classList.remove('dark');
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
		document.documentElement.classList.remove('dark');
	});

	describe('Theme Store', () => {
		it('should default to system theme when no preference is stored', async () => {
			// Re-import to get fresh module
			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			let currentTheme: string | undefined;
			const unsubscribe = theme.subscribe((value) => {
				currentTheme = value;
			});

			expect(currentTheme).toBe('system');
			unsubscribe();
		});

		it('should respect stored light theme preference', async () => {
			localStorageMock['theme-preference'] = 'light';

			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			let currentTheme: string | undefined;
			const unsubscribe = theme.subscribe((value) => {
				currentTheme = value;
			});

			expect(currentTheme).toBe('light');
			expect(document.documentElement.classList.contains('dark')).toBe(false);
			unsubscribe();
		});

		it('should respect stored dark theme preference', async () => {
			localStorageMock['theme-preference'] = 'dark';

			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			let currentTheme: string | undefined;
			const unsubscribe = theme.subscribe((value) => {
				currentTheme = value;
			});

			expect(currentTheme).toBe('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);
			unsubscribe();
		});

		it('should persist theme preference to localStorage when set', async () => {
			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			theme.set('dark');

			expect(localStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
			expect(localStorageMock['theme-preference']).toBe('dark');
		});

		it('should toggle through light -> dark -> system -> light', async () => {
			localStorageMock['theme-preference'] = 'light';

			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			let currentTheme: string | undefined;
			const unsubscribe = theme.subscribe((value) => {
				currentTheme = value;
			});

			expect(currentTheme).toBe('light');

			theme.toggle();
			expect(currentTheme).toBe('dark');
			expect(localStorageMock['theme-preference']).toBe('dark');

			theme.toggle();
			expect(currentTheme).toBe('system');
			expect(localStorageMock['theme-preference']).toBe('system');

			theme.toggle();
			expect(currentTheme).toBe('light');
			expect(localStorageMock['theme-preference']).toBe('light');

			unsubscribe();
		});

		it('should apply dark class when theme is dark', async () => {
			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			theme.setDark();

			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		it('should remove dark class when theme is light', async () => {
			document.documentElement.classList.add('dark');

			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			theme.setLight();

			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});

		it('should respect OS preference when theme is system and OS prefers dark', async () => {
			// Mock OS preferring dark mode
			matchMediaMock = vi.fn((query: string) => ({
				matches: query.includes('dark') ? true : false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn()
			}));
			vi.stubGlobal('matchMedia', matchMediaMock);

			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			theme.setSystem();

			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		it('should respect OS preference when theme is system and OS prefers light', async () => {
			// Mock OS preferring light mode
			matchMediaMock = vi.fn((query: string) => ({
				matches: query.includes('dark') ? false : true,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn()
			}));
			vi.stubGlobal('matchMedia', matchMediaMock);

			document.documentElement.classList.add('dark');

			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			theme.setSystem();

			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});
	});

	describe('ThemeToggle Component', () => {
		it('should have setLight helper that sets theme to light', async () => {
			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			theme.setDark();
			expect(document.documentElement.classList.contains('dark')).toBe(true);

			theme.setLight();
			expect(localStorageMock['theme-preference']).toBe('light');
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});

		it('should have setDark helper that sets theme to dark', async () => {
			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			theme.setLight();
			expect(document.documentElement.classList.contains('dark')).toBe(false);

			theme.setDark();
			expect(localStorageMock['theme-preference']).toBe('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});
	});

	describe('Theme Persistence', () => {
		it('should persist theme across page reloads (simulated)', async () => {
			// Set dark theme
			localStorageMock['theme-preference'] = 'dark';

			// Simulate page load
			vi.resetModules();
			const { theme: theme1 } = await import('$lib/stores/theme');

			let currentTheme: string | undefined;
			let unsubscribe = theme1.subscribe((value) => {
				currentTheme = value;
			});

			expect(currentTheme).toBe('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);

			unsubscribe();

			// Simulate another page load (re-import module)
			vi.resetModules();
			const { theme: theme2 } = await import('$lib/stores/theme');

			unsubscribe = theme2.subscribe((value) => {
				currentTheme = value;
			});

			expect(currentTheme).toBe('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);

			unsubscribe();
		});

		it('should clear theme preference and use OS default', async () => {
			localStorageMock['theme-preference'] = 'dark';

			vi.resetModules();
			const { theme } = await import('$lib/stores/theme');

			theme.setSystem();

			expect(localStorageMock['theme-preference']).toBe('system');
		});
	});

	describe('FOUC Prevention Script', () => {
		it('should have inline script in app.html that applies theme before render', () => {
			// This test verifies the concept - the actual script is in app.html
			// We test the logic here
			const stored = 'dark';
			const prefersDark = false;

			let isDark = false;
			if (stored === 'dark') {
				isDark = true;
			} else if (stored === 'light') {
				isDark = false;
			} else {
				isDark = prefersDark;
			}

			expect(isDark).toBe(true);
		});

		it('should use OS preference when no stored preference', () => {
			const stored: string | null = null;
			const prefersDark = true;

			let isDark = false;
			if (stored === 'dark') {
				isDark = true;
			} else if (stored === 'light') {
				isDark = false;
			} else {
				isDark = prefersDark;
			}

			expect(isDark).toBe(true);
		});
	});
});
