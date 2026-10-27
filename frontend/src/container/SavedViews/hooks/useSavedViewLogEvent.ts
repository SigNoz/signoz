import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import { SavedViewEventKeys, SavedViewEvents } from '../events';

export type SavedViewLogEvent = (
	event: SavedViewEvents,
	attributes?: Record<string, unknown>,
) => void;

export function useSavedViewLogEvent(
	source: SavedviewtypesSourceDTO,
): SavedViewLogEvent {
	return useCallback(
		(event: SavedViewEvents, attributes: Record<string, unknown> = {}): void => {
			void logEvent(event, {
				[SavedViewEventKeys.Source]: source,
				...attributes,
			});
		},
		[source],
	);
}
