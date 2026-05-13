import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation } from 'react-query';
import getLocalStorageKey from 'api/browser/localstorage/get';
import updateUserPreferenceAPI from 'api/v1/user/preferences/name/update';
import { LOCALSTORAGE } from 'constants/localStorage';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { isV3PinnedAttribute } from 'pages/TraceDetailsV3/utils';
import { deserializeKeyPath } from 'periscope/components/PrettyView/utils';
import { useAppContext } from 'providers/App/App';

interface UsePinnedAttributesReturn {
	pinnedAttributes: Record<string, boolean>;
	togglePin: (attributeKey: string) => void;
	isPinned: (attributeKey: string) => boolean;
}

/**
 * V2 trace-details pinned-attributes hook.
 *
 * Reads/writes the shared user-preference `span_details_pinned_attributes`
 * (same key V3 uses). Projects V3-shape entries (JSON-stringified paths)
 * down to their leaf-key string so V2 consumers see flat names, then writes
 * any normalization back to the pref so subsequent reads are V2-clean.
 *
 * Legacy seed: on first mount with an empty pref slot but non-empty
 * `localStorage.SPAN_DETAILS_PINNED_ATTRIBUTES`, copy localStorage → pref
 * once (for users who pinned in V2 before V2 stopped dual-writing). After
 * that, localStorage is no longer touched.
 */
export function usePinnedAttributes(
	availableAttributes: string[],
): UsePinnedAttributesReturn {
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();
	const { mutate } = useMutation(updateUserPreferenceAPI);
	const ranRef = useRef(false);

	// Normalize the raw pref array (potentially mixed V2 + V3) into a flat
	// list of leaf-key strings for V2 consumption. Dedupe in case V3 had
	// `attributes.foo` and `resource.foo` (same leaf, different namespaces).
	const pinnedKeys = useMemo<string[]>(() => {
		const pref = userPreferences?.find(
			(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
		);
		const raw = (pref?.value as string[] | undefined) ?? [];
		return normalizeRawToV2(raw).value;
	}, [userPreferences]);

	// On mount: legacy seed + V3 → V2 normalization. Writes the normalized
	// (and possibly seeded) array back to the pref so subsequent reads see
	// a clean V2-shape array.
	useEffect(() => {
		if (ranRef.current || !userPreferences) {
			return;
		}

		const pref = userPreferences.find(
			(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
		);
		const raw = (pref?.value as string[] | undefined) ?? [];

		// Legacy seed: empty pref + localStorage has entries → copy to pref.
		if (raw.length === 0) {
			const legacy = readLegacyLocalStorageEntries();
			if (legacy.length > 0 && pref) {
				const previousValue = pref.value;
				updateUserPreferenceInContext({ ...pref, value: legacy });
				mutate(
					{
						name: USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
						value: legacy,
					},
					{
						onSuccess: () => {
							ranRef.current = true;
						},
						onError: () => {
							updateUserPreferenceInContext({ ...pref, value: previousValue });
						},
					},
				);
			} else {
				ranRef.current = true;
			}
			return;
		}

		const { value: nextValue, changed } = normalizeRawToV2(raw);

		if (!changed) {
			ranRef.current = true;
			return;
		}

		if (pref) {
			const previousValue = pref.value;
			updateUserPreferenceInContext({ ...pref, value: nextValue });
			mutate(
				{
					name: USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
					value: nextValue,
				},
				{
					onSuccess: () => {
						ranRef.current = true;
					},
					onError: () => {
						updateUserPreferenceInContext({ ...pref, value: previousValue });
					},
				},
			);
		}
	}, [userPreferences, updateUserPreferenceInContext, mutate]);

	const pinnedAttributes = useMemo(
		(): Record<string, boolean> =>
			pinnedKeys.reduce(
				(acc, key) => {
					if (availableAttributes.includes(key)) {
						acc[key] = true;
					}
					return acc;
				},
				{} as Record<string, boolean>,
			),
		[pinnedKeys, availableAttributes],
	);

	const togglePin = useCallback(
		(attributeKey: string): void => {
			const next = pinnedKeys.includes(attributeKey)
				? pinnedKeys.filter((k) => k !== attributeKey)
				: [...pinnedKeys, attributeKey];

			const pref = userPreferences?.find(
				(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
			);
			if (pref) {
				updateUserPreferenceInContext({ ...pref, value: next });
			}
			mutate({
				name: USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
				value: next,
			});
		},
		[pinnedKeys, userPreferences, updateUserPreferenceInContext, mutate],
	);

	const isPinned = useCallback(
		(attributeKey: string): boolean => pinnedAttributes[attributeKey] === true,
		[pinnedAttributes],
	);

	return {
		pinnedAttributes,
		togglePin,
		isPinned,
	};
}

/**
 * Pure V3 → V2 normalization. Walks `raw` (potentially mixed V2 flat strings
 * + V3 JSON paths), produces a deduped V2-shape array, and reports whether
 * the result differs from the input. Used both for the read projection
 * (where the `changed` flag is ignored) and the on-mount migration write
 * (where it gates the API call).
 */
export function normalizeRawToV2(raw: string[]): {
	value: string[];
	changed: boolean;
} {
	const normalized = new Set<string>();
	let changed = false;

	for (const entry of raw) {
		let key: string;
		if (isV3PinnedAttribute(entry)) {
			const path = deserializeKeyPath(entry);
			if (path && path.length > 0) {
				key = String(path[path.length - 1]);
				changed = true; // V3 → V2 conversion happened
			} else {
				key = entry;
			}
		} else {
			key = entry;
		}
		if (normalized.has(key)) {
			changed = true; // dedupe trimmed an entry
			continue;
		}
		normalized.add(key);
	}

	return { value: Array.from(normalized), changed };
}

function readLegacyLocalStorageEntries(): string[] {
	try {
		const raw = getLocalStorageKey(LOCALSTORAGE.SPAN_DETAILS_PINNED_ATTRIBUTES);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((s): s is string => typeof s === 'string')
			: [];
	} catch {
		return [];
	}
}
