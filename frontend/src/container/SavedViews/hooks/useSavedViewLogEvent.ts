import { useCallback, useRef } from 'react';
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
	const sourceRef = useRef(source);
	sourceRef.current = source;

	return useCallback(
		(event: SavedViewEvents, attributes: Record<string, unknown> = {}): void => {
			try {
				void logEvent(event, {
					[SavedViewEventKeys.Source]: sourceRef.current,
					...attributes,
				});
			} catch {
				// No-op.
			}
		},
		[],
	);
}
