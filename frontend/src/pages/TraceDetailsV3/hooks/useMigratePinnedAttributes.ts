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

		const { next, convertedAny, stillHasV2 } = migrateV2ToV3Entries(
			value,
			selectedSpan,
		);

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

/**
 * Find where a V2 flat key lives on a span. Returns the V3 path tuple if
 * the key is present in `attributes`, `resource`, or as a top-level field,
 * otherwise `null`.
 */
export function v2KeyToPath(
	key: string,
	span: SpanV3,
): (string | number)[] | null {
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

/**
 * Pure migration logic — walk `value` once and produce the V3-converted
 * array plus two flags describing what happened. See the hook above for
 * how the flags drive write/retry decisions.
 */
export function migrateV2ToV3Entries(
	value: string[],
	span: SpanV3,
): { next: string[]; convertedAny: boolean; stillHasV2: boolean } {
	const next: string[] = [];
	let convertedAny = false;
	let stillHasV2 = false;

	for (const entry of value) {
		if (isV3PinnedAttribute(entry)) {
			next.push(entry);
			continue;
		}
		const path = v2KeyToPath(entry, span);
		if (path) {
			next.push(serializeKeyPath(path));
			convertedAny = true;
		} else {
			next.push(entry);
			stillHasV2 = true;
		}
	}

	return { next, convertedAny, stillHasV2 };
}
