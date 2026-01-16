import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getLibraryEntryWithGame,
	updateLibraryEntry,
	isValidPersonalRating,
	isValidPlayCount
} from '$lib/server/library-games';

export const load: PageServerLoad = async ({ parent, params, locals }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	// Fetch the library entry with game data (RLS ensures only user's entries are accessible)
	// params.id is the library_games entry ID
	const libraryEntry = await getLibraryEntryWithGame(locals.supabase, params.id);

	if (!libraryEntry) {
		throw error(404, 'Library entry not found');
	}

	return { libraryEntry };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = locals.user;

		// Redirect to login if not authenticated
		if (!user) {
			throw redirect(302, '/auth/login');
		}

		// Verify the library entry exists
		const existingEntry = await getLibraryEntryWithGame(locals.supabase, params.id);
		if (!existingEntry) {
			throw error(404, 'Library entry not found');
		}

		const formData = await request.formData();

		// Only user-specific fields are editable in split schema
		const playCountStr = formData.get('playCount')?.toString().trim() ?? '';
		const personalRatingStr = formData.get('personalRating')?.toString().trim() ?? '';
		const review = formData.get('review')?.toString().trim() || null;

		const errors: {
			playCount?: string;
			personalRating?: string;
		} = {};

		// Validate and parse play count
		const playCount = playCountStr ? parseInt(playCountStr, 10) : null;
		if (playCountStr && !isValidPlayCount(playCount)) {
			errors.playCount = 'Play count must be a non-negative number';
		}

		// Validate and parse personal rating
		const personalRating = personalRatingStr ? parseInt(personalRatingStr, 10) : null;
		if (personalRatingStr && !isValidPersonalRating(personalRating)) {
			errors.personalRating = 'Personal rating must be between 1 and 5';
		}

		// Return validation errors
		if (Object.keys(errors).length > 0) {
			return fail(400, {
				playCount: playCountStr,
				personalRating: personalRatingStr,
				review: review ?? '',
				errors
			});
		}

		// Update library entry (only user-specific fields)
		try {
			const updatedEntry = await updateLibraryEntry(locals.supabase, params.id, {
				playCount,
				personalRating,
				review
			});

			if (!updatedEntry) {
				throw error(404, 'Library entry not found');
			}
		} catch (e) {
			// Re-throw HTTP errors
			if (e && typeof e === 'object' && 'status' in e) {
				throw e;
			}
			return fail(500, {
				playCount: playCountStr,
				personalRating: personalRatingStr,
				review: review ?? '',
				error: 'An error occurred while updating. Please try again.'
			});
		}

		// Redirect to library page after successful update
		redirect(303, '/games');
	}
};
