import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import { useRestoreLastUsedView } from './hooks/useRestoreLastUsedView';
import { useSavedViewActions } from './hooks/useSavedViewActions';

// Outside the sidebar, so a collapsed sidebar still restores on a bare explorer.
function SavedViewsRestore({
	source,
}: {
	source: SavedviewtypesSourceDTO;
}): null {
	const { selectView } = useSavedViewActions(source);
	useRestoreLastUsedView({ source, selectView });
	return null;
}

export default SavedViewsRestore;
