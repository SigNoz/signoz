import { QueryClient } from 'react-query';
import {
	invalidateGetSavedView,
	invalidateListSavedViews,
} from 'api/generated/services/saved-view';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

export async function invalidateSavedViews(
	queryClient: QueryClient,
	source: SavedviewtypesSourceDTO,
	id?: string,
): Promise<void> {
	await Promise.all([
		invalidateListSavedViews(queryClient),
		id ? invalidateGetSavedView(queryClient, { id }) : undefined,
		// The saved views bar still lists through v1.
		queryClient.invalidateQueries([{ sourcepage: source }]),
	]);
}
