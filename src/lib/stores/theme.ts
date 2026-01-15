import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme-preference';

function getInitialTheme(): Theme {
	if (!browser) return 'system';

	const stored = localStorage.getItem(THEME_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') {
		return stored;
	}
	return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
	if (!browser) return;

	const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
	const root = document.documentElement;

	if (resolvedTheme === 'dark') {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
}

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	// Apply theme on initial load
	if (browser) {
		const initial = getInitialTheme();
		applyTheme(initial);

		// Listen for OS theme changes when in system mode
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', () => {
			const currentTheme = localStorage.getItem(THEME_KEY) as Theme | null;
			if (currentTheme === 'system' || currentTheme === null) {
				applyTheme('system');
			}
		});
	}

	return {
		subscribe,
		set: (theme: Theme) => {
			if (browser) {
				localStorage.setItem(THEME_KEY, theme);
				applyTheme(theme);
			}
			set(theme);
		},
		toggle: () => {
			update((current) => {
				// Cycle through: light -> dark -> system -> light
				const next: Theme = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
				if (browser) {
					localStorage.setItem(THEME_KEY, next);
					applyTheme(next);
				}
				return next;
			});
		},
		setLight: () => {
			if (browser) {
				localStorage.setItem(THEME_KEY, 'light');
				applyTheme('light');
			}
			set('light');
		},
		setDark: () => {
			if (browser) {
				localStorage.setItem(THEME_KEY, 'dark');
				applyTheme('dark');
			}
			set('dark');
		},
		setSystem: () => {
			if (browser) {
				localStorage.setItem(THEME_KEY, 'system');
				applyTheme('system');
			}
			set('system');
		}
	};
}

export const theme = createThemeStore();
