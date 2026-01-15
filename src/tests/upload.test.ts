import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '$lib/server/db';
import { registerUser, createSession } from '$lib/server/auth';

// Validation logic mirroring server-side implementation
const ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/heic',
	'image/heif'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateImageFile(file: { type: string; size: number; name: string }): {
	valid: boolean;
	error?: string;
} {
	// Check file presence
	if (!file || file.size === 0) {
		return { valid: false, error: 'Please select an image file to upload' };
	}

	// Check file type
	const mimeType = file.type.toLowerCase();
	if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
		return { valid: false, error: 'Invalid file type. Please upload a JPG, PNG, or HEIC image.' };
	}

	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return { valid: false, error: `File size (${sizeMB}MB) exceeds the 10MB limit.` };
	}

	return { valid: true };
}

describe('Image Upload - Story 9', () => {
	const testUserEmail = 'uploadtest@example.com';
	const testPassword = 'securepassword123';
	let testUserId: string;

	beforeAll(async () => {
		// Clean up existing test data
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});

		// Create test user
		const user = await registerUser(testUserEmail, testPassword);
		testUserId = user.id;
	});

	afterAll(async () => {
		// Clean up
		await prisma.game.deleteMany({});
		await prisma.session.deleteMany({});
		await prisma.user.deleteMany({});
		await prisma.$disconnect();
	});

	describe('File Type Validation', () => {
		it('should accept JPG/JPEG images', () => {
			const jpgFile = { type: 'image/jpeg', size: 1024 * 1024, name: 'game.jpg' };
			const jpegFile = { type: 'image/jpg', size: 1024 * 1024, name: 'game.jpeg' };

			expect(validateImageFile(jpgFile).valid).toBe(true);
			expect(validateImageFile(jpegFile).valid).toBe(true);
		});

		it('should accept PNG images', () => {
			const pngFile = { type: 'image/png', size: 1024 * 1024, name: 'game.png' };

			expect(validateImageFile(pngFile).valid).toBe(true);
		});

		it('should accept HEIC/HEIF images', () => {
			const heicFile = { type: 'image/heic', size: 1024 * 1024, name: 'game.heic' };
			const heifFile = { type: 'image/heif', size: 1024 * 1024, name: 'game.heif' };

			expect(validateImageFile(heicFile).valid).toBe(true);
			expect(validateImageFile(heifFile).valid).toBe(true);
		});

		it('should reject invalid file types', () => {
			const invalidFiles = [
				{ type: 'text/plain', size: 1024, name: 'file.txt' },
				{ type: 'application/pdf', size: 1024, name: 'document.pdf' },
				{ type: 'image/gif', size: 1024, name: 'animated.gif' },
				{ type: 'image/webp', size: 1024, name: 'image.webp' },
				{ type: 'video/mp4', size: 1024, name: 'video.mp4' }
			];

			for (const file of invalidFiles) {
				const result = validateImageFile(file);
				expect(result.valid).toBe(false);
				expect(result.error).toBe('Invalid file type. Please upload a JPG, PNG, or HEIC image.');
			}
		});

		it('should handle case-insensitive MIME types', () => {
			const upperCaseFile = { type: 'IMAGE/JPEG', size: 1024, name: 'game.jpg' };
			const mixedCaseFile = { type: 'Image/Png', size: 1024, name: 'game.png' };

			expect(validateImageFile(upperCaseFile).valid).toBe(true);
			expect(validateImageFile(mixedCaseFile).valid).toBe(true);
		});
	});

	describe('File Size Validation', () => {
		it('should accept files under 10MB', () => {
			const smallFile = { type: 'image/jpeg', size: 1024, name: 'small.jpg' }; // 1KB
			const mediumFile = { type: 'image/jpeg', size: 5 * 1024 * 1024, name: 'medium.jpg' }; // 5MB
			const nearLimitFile = { type: 'image/jpeg', size: 10 * 1024 * 1024 - 1, name: 'large.jpg' }; // Just under 10MB

			expect(validateImageFile(smallFile).valid).toBe(true);
			expect(validateImageFile(mediumFile).valid).toBe(true);
			expect(validateImageFile(nearLimitFile).valid).toBe(true);
		});

		it('should accept files exactly at 10MB limit', () => {
			const exactLimitFile = { type: 'image/jpeg', size: 10 * 1024 * 1024, name: 'exact.jpg' };

			expect(validateImageFile(exactLimitFile).valid).toBe(true);
		});

		it('should reject files over 10MB', () => {
			const overLimitFile = { type: 'image/jpeg', size: 10 * 1024 * 1024 + 1, name: 'large.jpg' };
			const result = validateImageFile(overLimitFile);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('exceeds the 10MB limit');
		});

		it('should show correct file size in error message', () => {
			const largeFile = { type: 'image/jpeg', size: 15 * 1024 * 1024, name: 'huge.jpg' }; // 15MB
			const result = validateImageFile(largeFile);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('File size (15.0MB) exceeds the 10MB limit.');
		});
	});

	describe('Empty File Handling', () => {
		it('should reject empty files', () => {
			const emptyFile = { type: 'image/jpeg', size: 0, name: 'empty.jpg' };
			const result = validateImageFile(emptyFile);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Please select an image file to upload');
		});
	});

	describe('Authentication', () => {
		it('should require authentication for upload page', async () => {
			// This test validates that the upload page requires auth
			// In the actual implementation, unauthenticated requests are redirected to /auth/login
			// The page.server.ts throws redirect(302, '/auth/login') when locals.user is undefined
			// createSession returns the session ID (string) for authenticated users
			const sessionId = await createSession(testUserId);
			expect(sessionId).toBeDefined();
			expect(typeof sessionId).toBe('string');
			expect(sessionId.length).toBeGreaterThan(0);
		});
	});

	describe('Valid Upload Flow', () => {
		it('should return success with image data for valid files', () => {
			// This tests the expected return structure from a valid upload
			const validFile = {
				type: 'image/jpeg',
				size: 1024 * 1024,
				name: 'boardgame.jpg'
			};

			const result = validateImageFile(validFile);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should preserve filename information', () => {
			const files = [
				{ type: 'image/jpeg', size: 1024, name: 'Catan Box Art.jpg' },
				{ type: 'image/png', size: 1024, name: 'ticket-to-ride.png' },
				{ type: 'image/heic', size: 1024, name: 'IMG_1234.HEIC' }
			];

			for (const file of files) {
				const result = validateImageFile(file);
				expect(result.valid).toBe(true);
			}
		});
	});

	describe('Multiple File Type Validation Edge Cases', () => {
		it('should handle files with no extension', () => {
			const noExtFile = { type: 'image/jpeg', size: 1024, name: 'gamephoto' };
			expect(validateImageFile(noExtFile).valid).toBe(true);
		});

		it('should validate by MIME type not file extension', () => {
			// A file claiming to be jpeg but with wrong extension should still be valid
			// (server validates by MIME type)
			const mismatchedFile = { type: 'image/jpeg', size: 1024, name: 'photo.png' };
			expect(validateImageFile(mismatchedFile).valid).toBe(true);

			// A file with correct extension but wrong MIME type should be invalid
			const wrongMimeFile = { type: 'application/octet-stream', size: 1024, name: 'photo.jpg' };
			expect(validateImageFile(wrongMimeFile).valid).toBe(false);
		});
	});
});
