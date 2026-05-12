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
 * On first load with both `userPreferences` and `selectedSpan` available,
 * detect a V2-format value in the backend pref and convert it to V3 paths
 * using the loaded span's shape. Idempotent: once written in V3 format the
 * format check on subsequent loads short-circuits.
 *
 * Unmappable keys (not present on the loaded span) are dropped — we can't
 * determine whether they belong under `attributes`, `resource`, or top-level.
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

		// Walk every entry — the array may be mixed (e.g. some legacy V2 flat
		// keys saved alongside V3 paths). V3 entries pass through unchanged;
		// V2 entries get converted via the loaded span; unmappable V2 entries
		// are dropped. We only persist when at least one V2 entry was found
		// (otherwise the input is already V3-clean).
		const next: string[] = [];
		let hadV2Entry = false;

		for (const entry of value) {
			if (isV3PinnedAttribute(entry)) {
				next.push(entry);
				continue;
			}
			hadV2Entry = true;
			const path = v2KeyToPath(entry, selectedSpan);
			if (path) {
				next.push(serializeKeyPath(path));
			}
			// else: unmappable on the loaded span — drop
		}

		if (!hadV2Entry) {
			ranRef.current = true;
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
					ranRef.current = true;
				},
				onError: () => {
					// Roll back the optimistic context update
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
