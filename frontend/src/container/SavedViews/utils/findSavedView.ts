import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';

export function findSavedView(
	views: SavedviewtypesSavedViewDTO[] | null | undefined,
	id: string,
): SavedviewtypesSavedViewDTO | undefined {
	return views?.find((view) => view.id === id);
}
