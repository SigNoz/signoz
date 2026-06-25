import { USER_PREFERENCES } from 'constants/userPreferences';
import { UserPreference } from 'types/api/preferences/preference';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { create } from 'zustand';

import {
	COLOR_BY_FIELDS,
	COLOR_BY_OPTIONS,
	ColorByOption,
	DEFAULT_COLOR_BY_FIELD,
} from '../constants';
import { toTelemetryFieldKey } from '../utils/previewFields';

interface MutateOptions {
	onSuccess?: () => void;
	onError?: () => void;
}

type UpdateUserPreferenceInContext = (preference: UserPreference) => void;
type MutateUserPreference = (
	variables: { name: string; value: unknown },
	options?: MutateOptions,
) => void;

interface TraceStoreState {
	// --- Inputs synced from React layer via TraceStoreSync ---
	// Fields present on loaded spans; gates color-by options. `undefined` while
	// loading so we keep trusting the persisted field.
	availableColorByFieldNames: string[] | undefined;
	userPreferences: UserPreference[] | null;
	updateUserPreferenceInContext: UpdateUserPreferenceInContext | null;
	mutateUserPreference: MutateUserPreference | null;

	// --- Derived state (cached for reference stability) ---
	colorByField: TelemetryFieldKey;
	availableColorByOptions: ColorByOption[];
	previewFields: TelemetryFieldKey[];

	// --- Setters used only by TraceStoreSync ---
	setAvailableColorByFields: (fieldNames: string[] | undefined) => void;
	setUserPreferences: (userPreferences: UserPreference[] | null) => void;
	setCallbacks: (callbacks: {
		updateUserPreferenceInContext: UpdateUserPreferenceInContext;
		mutateUserPreference: MutateUserPreference;
	}) => void;

	// --- Public actions (called from components) ---
	setColorByField: (field: TelemetryFieldKey) => void;
	setPreviewFields: (next: TelemetryFieldKey[]) => void;
}

/**
 * Reads the persisted color-by field name from user preferences and resolves
 * it to a `TelemetryFieldKey`. Falls back to default when unset or invalid.
 */
function getPersistedColorByField(
	userPreferences: UserPreference[] | null,
): TelemetryFieldKey {
	const pref = userPreferences?.find(
		(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_COLOR_BY_ATTRIBUTE,
	);
	const name = (pref?.value as string) || '';
	return COLOR_BY_FIELDS.find((f) => f.name === name) ?? DEFAULT_COLOR_BY_FIELD;
}

/**
 * Re-derives `colorByField` + `availableColorByOptions` from the two inputs.
 * Preserves the "trust persisted while spans load" rule so the flamegraph
 * doesn't repaint when the waterfall response arrives.
 */
function deriveColorState(
	availableColorByFieldNames: string[] | undefined,
	userPreferences: UserPreference[] | null,
): Pick<TraceStoreState, 'colorByField' | 'availableColorByOptions'> {
	const isFieldAvailable = (fieldName: string): boolean => {
		if (fieldName === DEFAULT_COLOR_BY_FIELD.name) {
			return true;
		}
		return !!availableColorByFieldNames?.includes(fieldName);
	};

	const availableColorByOptions = COLOR_BY_OPTIONS.filter((opt) =>
		isFieldAvailable(opt.field.name),
	);

	const persistedColorByField = getPersistedColorByField(userPreferences);
	// While loading, trust persisted — don't flip to default prematurely.
	const colorByField =
		availableColorByFieldNames === undefined ||
		isFieldAvailable(persistedColorByField.name)
			? persistedColorByField
			: DEFAULT_COLOR_BY_FIELD;

	return { colorByField, availableColorByOptions };
}

/**
 * Reads preview fields from user preferences and normalizes them to
 * `TelemetryFieldKey`. Legacy entries persisted as `BaseAutocompleteData` (with
 * a `.key` instead of `.name`) are upgraded in-place so existing users don't
 * lose their saved preview-field selection.
 */
function derivePreviewFields(
	userPreferences: UserPreference[] | null,
): TelemetryFieldKey[] {
	const pref = userPreferences?.find(
		(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PREVIEW_ATTRIBUTES,
	);
	const raw = (pref?.value as unknown[] | undefined) ?? [];
	const result: TelemetryFieldKey[] = [];
	for (const entry of raw) {
		if (typeof entry !== 'object' || entry === null) {
			continue;
		}
		const candidate = entry as { name?: unknown; key?: unknown };
		if (typeof candidate.name === 'string') {
			result.push(entry as TelemetryFieldKey);
		} else if (typeof candidate.key === 'string') {
			result.push(toTelemetryFieldKey(entry as BaseAutocompleteData));
		}
	}
	return result;
}

export const useTraceStore = create<TraceStoreState>()((set, get) => ({
	availableColorByFieldNames: undefined,
	userPreferences: null,
	updateUserPreferenceInContext: null,
	mutateUserPreference: null,

	colorByField: DEFAULT_COLOR_BY_FIELD,
	availableColorByOptions: COLOR_BY_OPTIONS.filter(
		(opt) => opt.field.name === DEFAULT_COLOR_BY_FIELD.name,
	),
	previewFields: [],

	setAvailableColorByFields: (availableColorByFieldNames): void => {
		const { userPreferences } = get();
		set({
			availableColorByFieldNames,
			...deriveColorState(availableColorByFieldNames, userPreferences),
		});
	},

	setUserPreferences: (userPreferences): void => {
		const { availableColorByFieldNames } = get();
		set({
			userPreferences,
			...deriveColorState(availableColorByFieldNames, userPreferences),
			previewFields: derivePreviewFields(userPreferences),
		});
	},

	setCallbacks: ({
		updateUserPreferenceInContext,
		mutateUserPreference,
	}): void => set({ updateUserPreferenceInContext, mutateUserPreference }),

	setColorByField: (field): void => {
		const {
			userPreferences,
			updateUserPreferenceInContext,
			mutateUserPreference,
		} = get();
		if (
			!userPreferences ||
			!updateUserPreferenceInContext ||
			!mutateUserPreference
		) {
			return;
		}

		const existing = userPreferences.find(
			(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_COLOR_BY_ATTRIBUTE,
		);
		if (!existing) {
			return;
		}

		const previousValue = existing.value;
		updateUserPreferenceInContext({ ...existing, value: field.name });
		mutateUserPreference(
			{
				name: USER_PREFERENCES.SPAN_DETAILS_COLOR_BY_ATTRIBUTE,
				value: field.name,
			},
			{
				onError: (): void =>
					updateUserPreferenceInContext({ ...existing, value: previousValue }),
			},
		);
	},

	setPreviewFields: (next): void => {
		const {
			userPreferences,
			updateUserPreferenceInContext,
			mutateUserPreference,
		} = get();
		if (
			!userPreferences ||
			!updateUserPreferenceInContext ||
			!mutateUserPreference
		) {
			return;
		}

		const existing = userPreferences.find(
			(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PREVIEW_ATTRIBUTES,
		);
		if (!existing) {
			return;
		}

		const previousValue = existing.value;
		updateUserPreferenceInContext({ ...existing, value: next });
		mutateUserPreference(
			{ name: USER_PREFERENCES.SPAN_DETAILS_PREVIEW_ATTRIBUTES, value: next },
			{
				onError: (): void =>
					updateUserPreferenceInContext({ ...existing, value: previousValue }),
			},
		);
	},
}));

export const setTraceStoreAvailableColorByFields = (
	fieldNames: string[] | undefined,
): void => useTraceStore.getState().setAvailableColorByFields(fieldNames);

export const setTraceStoreUserPreferences = (
	userPreferences: UserPreference[] | null,
): void => useTraceStore.getState().setUserPreferences(userPreferences);

export const setTraceStoreCallbacks = (callbacks: {
	updateUserPreferenceInContext: UpdateUserPreferenceInContext;
	mutateUserPreference: MutateUserPreference;
}): void => useTraceStore.getState().setCallbacks(callbacks);
