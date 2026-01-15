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
	deleteSession
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
