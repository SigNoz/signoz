import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { buildExplorerNavigationUrl } from 'utils/buildExplorerNavigationUrl';

import { getSavedViewQuery } from './getSavedViewQuery';

export function getSavedViewPath(
	pathname: string,
	view: SavedviewtypesSavedViewDTO,
	timeSearch: string,
): string {
	const path = buildExplorerNavigationUrl(pathname, getSavedViewQuery(view), {
		[QueryParams.panelTypes]: view.spec.panelType,
		[QueryParams.viewKey]: view.id,
	});
	return timeSearch ? `${path}&${timeSearch}` : path;
}
