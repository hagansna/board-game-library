import bcrypt from 'bcryptjs';
import { prisma } from './db';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE_NAME = 'session_id';
const SESSION_DURATION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
	return password.length >= 8;
}

export async function createSession(userId: string): Promise<string> {
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

	const session = await prisma.session.create({
		data: {
			userId,
			expiresAt
		}
	});

	return session.id;
}

export async function validateSession(sessionId: string) {
	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { user: true }
	});

	if (!session) {
		return null;
	}

	if (session.expiresAt < new Date()) {
		await prisma.session.delete({ where: { id: sessionId } });
		return null;
	}

	return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
	await prisma.session.delete({ where: { id: sessionId } }).catch(() => {
		// Session may already be deleted
	});
}

export function setSessionCookie(cookies: Cookies, sessionId: string): void {
	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS
	});
}

export function getSessionCookie(cookies: Cookies): string | undefined {
	return cookies.get(SESSION_COOKIE_NAME);
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export async function registerUser(email: string, password: string) {
	const passwordHash = await hashPassword(password);

	const user = await prisma.user.create({
		data: {
			email: email.toLowerCase().trim(),
			passwordHash
		}
	});

	return user;
}

export async function findUserByEmail(email: string) {
	return prisma.user.findUnique({
		where: { email: email.toLowerCase().trim() }
	});
}
