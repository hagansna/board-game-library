import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	hashPassword,
	verifyPassword,
	isValidEmail,
	isValidPassword,
	registerUser,
	findUserByEmail,
	createSession,
	validateSession,
	deleteSession,
	refreshSessionIfNeeded
} from '$lib/server/auth';
import { prisma } from '$lib/server/db';

describe('Auth Utilities', () => {
	describe('Email Validation', () => {
		it('should accept valid email addresses', () => {
			expect(isValidEmail('user@example.com')).toBe(true);
			expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
			expect(isValidEmail('user+tag@example.org')).toBe(true);
		});

		it('should reject invalid email addresses', () => {
			expect(isValidEmail('')).toBe(false);
			expect(isValidEmail('notanemail')).toBe(false);
			expect(isValidEmail('missing@domain')).toBe(false);
			expect(isValidEmail('@nodomain.com')).toBe(false);
			expect(isValidEmail('spaces in@email.com')).toBe(false);
		});
	});

	describe('Password Validation', () => {
		it('should accept passwords with 8+ characters', () => {
			expect(isValidPassword('12345678')).toBe(true);
			expect(isValidPassword('longpassword123')).toBe(true);
			expect(isValidPassword('abcdefgh')).toBe(true);
		});

		it('should reject passwords with less than 8 characters', () => {
			expect(isValidPassword('')).toBe(false);
			expect(isValidPassword('1234567')).toBe(false);
			expect(isValidPassword('short')).toBe(false);
		});
	});

	describe('Password Hashing', () => {
		it('should hash and verify passwords correctly', async () => {
			const password = 'securepassword123';
			const hash = await hashPassword(password);

			expect(hash).not.toBe(password);
			expect(await verifyPassword(password, hash)).toBe(true);
			expect(await verifyPassword('wrongpassword', hash)).toBe(false);
		});

		it('should produce different hashes for same password', async () => {
			const password = 'testpassword';
			const hash1 = await hashPassword(password);
			const hash2 = await hashPassword(password);

			expect(hash1).not.toBe(hash2);
		});
	});
});

describe('User Registration', () => {
	const testEmail = 'testuser@example.com';
	const testPassword = 'testpassword123';

	beforeEach(async () => {
		// Clean up test users before each test
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
	});

	afterAll(async () => {
		// Clean up after all tests
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	it('should register a new user successfully', async () => {
		const user = await registerUser(testEmail, testPassword);

		expect(user).toBeDefined();
		expect(user.email).toBe(testEmail.toLowerCase());
		expect(user.id).toBeDefined();
		expect(user.passwordHash).not.toBe(testPassword);
	});

	it('should normalize email to lowercase', async () => {
		const user = await registerUser('TEST@EXAMPLE.COM', testPassword);

		expect(user.email).toBe('test@example.com');
	});

	it('should reject duplicate email addresses', async () => {
		await registerUser(testEmail, testPassword);

		await expect(registerUser(testEmail, testPassword)).rejects.toThrow();
	});

	it('should find user by email (case insensitive)', async () => {
		await registerUser(testEmail, testPassword);

		const foundUser = await findUserByEmail(testEmail);
		expect(foundUser).toBeDefined();
		expect(foundUser?.email).toBe(testEmail);

		const foundUserUpperCase = await findUserByEmail(testEmail.toUpperCase());
		expect(foundUserUpperCase).toBeDefined();
		expect(foundUserUpperCase?.email).toBe(testEmail);
	});

	it('should return null for non-existent user', async () => {
		const user = await findUserByEmail('nonexistent@example.com');
		expect(user).toBeNull();
	});
});

describe('Session Management', () => {
	const testEmail = 'sessiontest@example.com';
	const testPassword = 'testpassword123';
	let testUserId: string;

	beforeAll(async () => {
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		const user = await registerUser(testEmail, testPassword);
		testUserId = user.id;
	});

	beforeEach(async () => {
		await prisma.session.deleteMany({});
	});

	afterAll(async () => {
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	it('should create a valid session', async () => {
		const sessionId = await createSession(testUserId);

		expect(sessionId).toBeDefined();
		expect(typeof sessionId).toBe('string');
	});

	it('should validate an existing session', async () => {
		const sessionId = await createSession(testUserId);
		const session = await validateSession(sessionId);

		expect(session).toBeDefined();
		expect(session?.userId).toBe(testUserId);
		expect(session?.user).toBeDefined();
		expect(session?.user.email).toBe(testEmail);
	});

	it('should return null for invalid session ID', async () => {
		const session = await validateSession('invalid-session-id');
		expect(session).toBeNull();
	});

	it('should delete a session', async () => {
		const sessionId = await createSession(testUserId);

		await deleteSession(sessionId);

		const session = await validateSession(sessionId);
		expect(session).toBeNull();
	});
});

describe('User Login', () => {
	const testEmail = 'logintest@example.com';
	const testPassword = 'securepassword123';

	beforeAll(async () => {
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		// Create a test user for login tests
		await registerUser(testEmail, testPassword);
	});

	afterAll(async () => {
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	it('should verify correct password for existing user', async () => {
		const user = await findUserByEmail(testEmail);
		expect(user).toBeDefined();

		const isValid = await verifyPassword(testPassword, user!.passwordHash);
		expect(isValid).toBe(true);
	});

	it('should reject incorrect password for existing user', async () => {
		const user = await findUserByEmail(testEmail);
		expect(user).toBeDefined();

		const isValid = await verifyPassword('wrongpassword123', user!.passwordHash);
		expect(isValid).toBe(false);
	});

	it('should return null when user does not exist', async () => {
		const user = await findUserByEmail('nonexistent@example.com');
		expect(user).toBeNull();
	});

	it('should create session after successful login credentials verification', async () => {
		const user = await findUserByEmail(testEmail);
		expect(user).toBeDefined();

		const isValid = await verifyPassword(testPassword, user!.passwordHash);
		expect(isValid).toBe(true);

		// Simulate login flow: create session after password verification
		const sessionId = await createSession(user!.id);
		expect(sessionId).toBeDefined();

		const session = await validateSession(sessionId);
		expect(session).toBeDefined();
		expect(session?.user.email).toBe(testEmail);
	});

	it('should handle case-insensitive email lookup for login', async () => {
		const user = await findUserByEmail(testEmail.toUpperCase());
		expect(user).toBeDefined();
		expect(user?.email).toBe(testEmail);
	});
});

describe('User Logout', () => {
	const testEmail = 'logouttest@example.com';
	const testPassword = 'securepassword123';
	let testUserId: string;

	beforeAll(async () => {
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		const user = await registerUser(testEmail, testPassword);
		testUserId = user.id;
	});

	beforeEach(async () => {
		await prisma.session.deleteMany({});
	});

	afterAll(async () => {
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	it('should delete session on logout', async () => {
		// Create a session (simulating login)
		const sessionId = await createSession(testUserId);

		// Verify session exists
		const sessionBefore = await validateSession(sessionId);
		expect(sessionBefore).toBeDefined();
		expect(sessionBefore?.userId).toBe(testUserId);

		// Delete session (simulating logout)
		await deleteSession(sessionId);

		// Verify session is deleted
		const sessionAfter = await validateSession(sessionId);
		expect(sessionAfter).toBeNull();
	});

	it('should handle deleting non-existent session gracefully', async () => {
		// Should not throw an error when deleting a non-existent session
		await expect(deleteSession('non-existent-session-id')).resolves.not.toThrow();
	});

	it('should not affect other sessions when deleting one session', async () => {
		// Create two sessions for the same user (e.g., different devices)
		const sessionId1 = await createSession(testUserId);
		const sessionId2 = await createSession(testUserId);

		// Verify both sessions exist
		expect(await validateSession(sessionId1)).toBeDefined();
		expect(await validateSession(sessionId2)).toBeDefined();

		// Delete first session
		await deleteSession(sessionId1);

		// Verify first session is deleted but second remains
		expect(await validateSession(sessionId1)).toBeNull();
		expect(await validateSession(sessionId2)).toBeDefined();
	});

	it('should invalidate session after logout preventing access', async () => {
		// Create a session
		const sessionId = await createSession(testUserId);

		// Session should be valid
		const validSession = await validateSession(sessionId);
		expect(validSession).toBeDefined();
		expect(validSession?.user.email).toBe(testEmail);

		// Logout (delete session)
		await deleteSession(sessionId);

		// Attempting to validate the same session ID should fail
		const invalidSession = await validateSession(sessionId);
		expect(invalidSession).toBeNull();
	});
});

describe('Session Persistence (Story 4)', () => {
	const testEmail = 'persistence@example.com';
	const testPassword = 'securepassword123';
	let testUserId: string;

	beforeAll(async () => {
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		const user = await registerUser(testEmail, testPassword);
		testUserId = user.id;
	});

	beforeEach(async () => {
		await prisma.session.deleteMany({});
	});

	afterAll(async () => {
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	it('should persist session data in database for later retrieval', async () => {
		// Create session (simulates login)
		const sessionId = await createSession(testUserId);

		// Simulate page refresh - fetch session fresh from database
		const refreshedSession = await validateSession(sessionId);
		expect(refreshedSession).toBeDefined();
		expect(refreshedSession?.userId).toBe(testUserId);
		expect(refreshedSession?.user.email).toBe(testEmail);
	});

	it('should create session with 30-day expiration', async () => {
		const sessionId = await createSession(testUserId);

		const session = await prisma.session.findUnique({
			where: { id: sessionId }
		});

		expect(session).toBeDefined();

		// Check expiration is approximately 30 days from now
		const expectedExpiry = new Date();
		expectedExpiry.setDate(expectedExpiry.getDate() + 30);

		const timeDiff = Math.abs(session!.expiresAt.getTime() - expectedExpiry.getTime());
		// Allow 1 second tolerance for test execution time
		expect(timeDiff).toBeLessThan(1000);
	});

	it('should validate session multiple times (simulating page navigations)', async () => {
		const sessionId = await createSession(testUserId);

		// First page load
		const session1 = await validateSession(sessionId);
		expect(session1).toBeDefined();

		// Second page load
		const session2 = await validateSession(sessionId);
		expect(session2).toBeDefined();

		// Third page load
		const session3 = await validateSession(sessionId);
		expect(session3).toBeDefined();

		// All should return the same user
		expect(session1?.userId).toBe(session2?.userId);
		expect(session2?.userId).toBe(session3?.userId);
	});

	it('should expire session after expiration date', async () => {
		// Create a session
		const sessionId = await createSession(testUserId);

		// Manually set expiration to past (simulating 30 days passing)
		const pastDate = new Date();
		pastDate.setDate(pastDate.getDate() - 1);
		await prisma.session.update({
			where: { id: sessionId },
			data: { expiresAt: pastDate }
		});

		// Session should now be invalid
		const expiredSession = await validateSession(sessionId);
		expect(expiredSession).toBeNull();

		// Session should be deleted from database
		const dbSession = await prisma.session.findUnique({
			where: { id: sessionId }
		});
		expect(dbSession).toBeNull();
	});

	it('should not refresh session that is not close to expiring', async () => {
		const sessionId = await createSession(testUserId);

		// Session with full 30-day validity should not be refreshed
		const wasRefreshed = await refreshSessionIfNeeded(sessionId);
		expect(wasRefreshed).toBe(false);
	});

	it('should refresh session when close to expiration (sliding session)', async () => {
		const sessionId = await createSession(testUserId);

		// Set expiration to 10 days from now (within 15-day threshold)
		const tenDaysFromNow = new Date();
		tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
		await prisma.session.update({
			where: { id: sessionId },
			data: { expiresAt: tenDaysFromNow }
		});

		// Get original expiration
		const beforeRefresh = await prisma.session.findUnique({
			where: { id: sessionId }
		});

		// Session should be refreshed
		const wasRefreshed = await refreshSessionIfNeeded(sessionId);
		expect(wasRefreshed).toBe(true);

		// New expiration should be 30 days from now
		const afterRefresh = await prisma.session.findUnique({
			where: { id: sessionId }
		});

		expect(afterRefresh!.expiresAt.getTime()).toBeGreaterThan(beforeRefresh!.expiresAt.getTime());

		const expectedNewExpiry = new Date();
		expectedNewExpiry.setDate(expectedNewExpiry.getDate() + 30);
		const timeDiff = Math.abs(afterRefresh!.expiresAt.getTime() - expectedNewExpiry.getTime());
		expect(timeDiff).toBeLessThan(1000);
	});

	it('should return false when refreshing non-existent session', async () => {
		const wasRefreshed = await refreshSessionIfNeeded('non-existent-id');
		expect(wasRefreshed).toBe(false);
	});

	it('should allow multiple sessions for the same user (multiple devices)', async () => {
		// Create sessions simulating different devices
		const session1 = await createSession(testUserId);
		const session2 = await createSession(testUserId);
		const session3 = await createSession(testUserId);

		// All sessions should be valid
		expect(await validateSession(session1)).toBeDefined();
		expect(await validateSession(session2)).toBeDefined();
		expect(await validateSession(session3)).toBeDefined();

		// All sessions are different
		expect(session1).not.toBe(session2);
		expect(session2).not.toBe(session3);
	});

	it('should maintain session user association correctly', async () => {
		const sessionId = await createSession(testUserId);

		const session = await validateSession(sessionId);
		expect(session?.user.id).toBe(testUserId);
		expect(session?.user.email).toBe(testEmail);
	});
});
