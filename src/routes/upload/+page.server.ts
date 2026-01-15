import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// Allowed MIME types for image uploads
const ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/heic',
	'image/heif'
];

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect to login if not authenticated
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	return {
		user: locals.user
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const file = formData.get('image') as File | null;

		// Validate file presence
		if (!file || file.size === 0) {
			return fail(400, {
				error: 'Please select an image file to upload'
			});
		}

		// Validate file type
		const mimeType = file.type.toLowerCase();
		if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
			return fail(400, {
				error: 'Invalid file type. Please upload a JPG, PNG, or HEIC image.'
			});
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
			return fail(400, {
				error: `File size (${sizeMB}MB) exceeds the 10MB limit.`
			});
		}

		// Convert file to base64 for storage/transmission
		const arrayBuffer = await file.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString('base64');
		const dataUrl = `data:${file.type};base64,${base64}`;

		// Return success with image data for preview and AI analysis
		return {
			success: true,
			imageData: dataUrl,
			fileName: file.name,
			fileSize: file.size,
			mimeType: file.type
		};
	}
};
