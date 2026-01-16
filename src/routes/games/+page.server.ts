import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserLibrary, removeFromLibrary, updateLibraryPlayCount } from '$lib/server/library-games';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	// Fetch user's library (JOIN of games and library_games tables)
	// RLS ensures only user's library entries are returned
	const games = await getUserLibrary(locals.supabase);

	return {
		games
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const libraryEntryId = formData.get('libraryEntryId');

		if (!libraryEntryId || typeof libraryEntryId !== 'string') {
			return fail(400, { error: 'Library entry ID is required' });
		}

		// RLS ensures user can only delete their own library entries
		// Note: This removes from library only, not from the shared game catalog
		const deleted = await removeFromLibrary(locals.supabase, libraryEntryId);

		if (!deleted) {
			return fail(404, { error: 'Library entry not found or you do not have permission to delete it' });
		}

		return { success: true };
	},

	incrementPlayCount: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const libraryEntryId = formData.get('libraryEntryId');

		if (!libraryEntryId || typeof libraryEntryId !== 'string') {
			return fail(400, { error: 'Library entry ID is required' });
		}

		const result = await updateLibraryPlayCount(locals.supabase, libraryEntryId, 1);

		if (!result) {
			return fail(404, { error: 'Library entry not found or you do not have permission to update it' });
		}

		return { success: true, playCount: result.playCount };
	},

	decrementPlayCount: async ({ request, locals }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const libraryEntryId = formData.get('libraryEntryId');

		if (!libraryEntryId || typeof libraryEntryId !== 'string') {
			return fail(400, { error: 'Library entry ID is required' });
		}

		const result = await updateLibraryPlayCount(locals.supabase, libraryEntryId, -1);

		if (!result) {
			return fail(404, { error: 'Library entry not found or you do not have permission to update it' });
		}

		return { success: true, playCount: result.playCount };
	}
};
