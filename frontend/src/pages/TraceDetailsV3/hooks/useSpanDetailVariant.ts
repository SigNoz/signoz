import { useCallback, useState } from 'react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

import { SpanDetailVariant } from '../SpanDetailsPanel/constants';

/** Span details position, persisted under the same key Overview uses. */
export function useSpanDetailVariant(): [
	SpanDetailVariant,
	(variant: SpanDetailVariant) => void,
] {
	const [variant, setVariant] = useState<SpanDetailVariant>(
		() =>
			(getLocalStorageKey(
				LOCALSTORAGE.TRACE_DETAILS_SPAN_DETAILS_POSITION,
			) as SpanDetailVariant) || SpanDetailVariant.DOCKED_RIGHT,
	);

	const changeVariant = useCallback((next: SpanDetailVariant): void => {
		setLocalStorageKey(LOCALSTORAGE.TRACE_DETAILS_SPAN_DETAILS_POSITION, next);
		setVariant(next);
	}, []);

	return [variant, changeVariant];
}
