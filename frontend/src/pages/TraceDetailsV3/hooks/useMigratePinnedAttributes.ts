import { useEffect, useRef } from 'react';
import { useMutation } from 'react-query';
import updateUserPreferenceAPI from 'api/v1/user/preferences/name/update';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { isV3PinnedAttribute } from 'pages/TraceDetailsV3/utils';
import { serializeKeyPath } from 'periscope/components/PrettyView/utils';
import { useAppContext } from 'providers/App/App';
import { SpanV3 } from 'types/api/trace/getTraceV3';

/**
 * V2 stored pinned attributes as flat strings (`["http.method"]`).
 * V3 stores nested key paths (`['["attributes","http.method"]']`).
 *
 * On every spanId change while there are still V2-shape entries in the pref,
 * detect V2 entries and convert them to V3 paths using the loaded span's
 * shape. Idempotent: once everything is V3 the gate flips and the hook
 * short-circuits on subsequent renders.
 *
 * Unmappable keys (not present on the loaded span) are preserved as V2-shape
 * in the pref. They get a chance to convert when a future span containing
 * them loads. The V3 read path (`useTracePinnedFields.value`) filters V2
 * leftovers out of PrettyView so they don't render half-resolved.
 */
export function useMigratePinnedAttributes(
	selectedSpan: SpanV3 | undefined,
): void {
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();
	const { mutate } = useMutation(updateUserPreferenceAPI);
	const ranRef = useRef(false);

	useEffect(() => {
		if (ranRef.current) {
			return;
		}
		if (!userPreferences || !selectedSpan) {
			return;
		}

		const pref = userPreferences.find(
			(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
		);
		const value = (pref?.value as string[] | undefined) ?? [];
		if (value.length === 0) {
			ranRef.current = true;
			return;
		}

		// convertedAny → should we write this round (skip no-op API calls).
		// stillHasV2   → should we keep retrying on future renders.
		const next: string[] = [];
		let convertedAny = false;
		let stillHasV2 = false;

		for (const entry of value) {
			if (isV3PinnedAttribute(entry)) {
				next.push(entry);
				continue;
			}
			const path = v2KeyToPath(entry, selectedSpan);
			if (path) {
				next.push(serializeKeyPath(path));
				convertedAny = true;
			} else {
				next.push(entry);
				stillHasV2 = true;
			}
		}

		if (!convertedAny) {
			// Nothing to persist this round. Mark done only when there's nothing
			// left to retry; otherwise leave ranRef false so the next spanId
			// change gets a chance at the lingering V2 entries.
			if (!stillHasV2) {
				ranRef.current = true;
			}
			return;
		}

		if (pref) {
			updateUserPreferenceInContext({ ...pref, value: next });
		}
		mutate(
			{
				name: USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
				value: next,
			},
			{
				onSuccess: () => {
					ranRef.current = !stillHasV2;
				},
				onError: () => {
					// Roll back the optimistic context updatexw
					if (pref) {
						updateUserPreferenceInContext({ ...pref, value });
					}
				},
			},
		);
	}, [userPreferences, selectedSpan, updateUserPreferenceInContext, mutate]);
}

function v2KeyToPath(key: string, span: SpanV3): (string | number)[] | null {
	if (span.attributes && key in span.attributes) {
		return ['attributes', key];
	}
	if (span.resource && key in span.resource) {
		return ['resource', key];
	}
	if (key in (span as unknown as Record<string, unknown>)) {
		return [key];
	}
	return null;
}
