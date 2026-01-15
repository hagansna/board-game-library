import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Redirect authenticated users to their library
	if (user) {
		throw redirect(302, '/games');
	}

	return {};
};
