import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = 'static/uploads/boxart';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export interface BoxArtUploadResult {
	success: boolean;
	url?: string;
	error?: string;
}

/**
 * Validates that a URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		// Must be http or https
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return false;
		}
		// Check for common image extensions in path
		const pathname = parsed.pathname.toLowerCase();
		const hasImageExtension = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some((ext) =>
			pathname.endsWith(ext)
		);
		// Also allow URLs without extensions (many CDNs serve images without extensions)
		return hasImageExtension || pathname.length > 0;
	} catch {
		return false;
	}
}

/**
 * Validates file type based on MIME type and extension
 */
export function isValidImageFile(file: File): { valid: boolean; error?: string } {
	// Check MIME type
	if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
		return {
			valid: false,
			error: `Invalid file type. Allowed types: JPG, PNG, WebP`
		};
	}

	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `File too large. Maximum size: 5MB`
		};
	}

	// Check extension
	const ext = path.extname(file.name).toLowerCase();
	if (!ALLOWED_EXTENSIONS.includes(ext)) {
		return {
			valid: false,
			error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
		};
	}

	return { valid: true };
}

/**
 * Saves an uploaded box art file and returns the URL
 */
export async function saveBoxArtFile(file: File, userId: string): Promise<BoxArtUploadResult> {
	// Validate file
	const validation = isValidImageFile(file);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	// Ensure uploads directory exists
	const uploadsPath = path.resolve(UPLOADS_DIR);
	if (!existsSync(uploadsPath)) {
		await mkdir(uploadsPath, { recursive: true });
	}

	// Generate unique filename
	const ext = path.extname(file.name).toLowerCase();
	const hash = crypto.randomBytes(16).toString('hex');
	const filename = `${userId}-${hash}${ext}`;
	const filepath = path.join(uploadsPath, filename);

	try {
		// Convert File to Buffer and save
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		await writeFile(filepath, buffer);

		// Return the public URL
		const url = `/uploads/boxart/${filename}`;
		return { success: true, url };
	} catch (err) {
		console.error('Error saving box art file:', err);
		return { success: false, error: 'Failed to save file' };
	}
}

/**
 * Deletes a box art file from the uploads directory
 */
export async function deleteBoxArtFile(url: string): Promise<boolean> {
	if (!url || !url.startsWith('/uploads/boxart/')) {
		return false;
	}

	const filename = url.replace('/uploads/boxart/', '');
	const filepath = path.resolve(UPLOADS_DIR, filename);

	try {
		if (existsSync(filepath)) {
			await unlink(filepath);
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Determines if a boxArtUrl is an uploaded file (local) or external URL
 */
export function isLocalBoxArt(url: string | null | undefined): boolean {
	return !!url && url.startsWith('/uploads/boxart/');
}
