// Simple validation helpers for auth
// Supabase handles password hashing and session management

import { redirect } from '@sveltejs/kit';

export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
	return password.length >= 8;
}

// Role-based access control helpers

type User = {
	id: string;
	email: string;
	role: 'admin' | 'user';
};

/**
 * Check if user has admin role
 */
export function isAdmin(user: User | undefined | null): boolean {
	return user?.role === 'admin';
}

/**
 * Require admin role, redirect to home if not admin
 * Use in server load functions and actions
 */
export function requireAdmin(user: User | undefined | null): void {
	if (!user) {
		throw redirect(302, '/auth/login');
	}
	if (user.role !== 'admin') {
		throw redirect(302, '/games');
	}
}
