import { USER_PREFERENCES } from 'constants/userPreferences';
import { UserPreference } from 'types/api/preferences/preference';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { WaterfallAggregationResponse } from 'types/api/trace/getTraceV3';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { create } from 'zustand';

import {
	COLOR_BY_FIELDS,
	COLOR_BY_OPTIONS,
	ColorByOption,
	DEFAULT_COLOR_BY_FIELD,
} from '../constants';
import {
	AGGREGATIONS,
	getAggregationMap as findAggregationMap,
} from '../utils/aggregations';

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
	aggregations: WaterfallAggregationResponse[] | undefined;
	userPreferences: UserPreference[] | null;
	updateUserPreferenceInContext: UpdateUserPreferenceInContext | null;
	mutateUserPreference: MutateUserPreference | null;

	// --- Derived state (cached for reference stability) ---
	colorByField: TelemetryFieldKey;
	availableColorByOptions: ColorByOption[];
	previewFields: BaseAutocompleteData[];

	// --- Setters used only by TraceStoreSync ---
	setAggregations: (
		aggregations: WaterfallAggregationResponse[] | undefined,
	) => void;
	setUserPreferences: (userPreferences: UserPreference[] | null) => void;
	setCallbacks: (callbacks: {
		updateUserPreferenceInContext: UpdateUserPreferenceInContext;
		mutateUserPreference: MutateUserPreference;
	}) => void;

	// --- Public actions (called from components) ---
	setColorByField: (field: TelemetryFieldKey) => void;
	setPreviewFields: (next: BaseAutocompleteData[]) => void;
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
 * Preserves the "trust persisted while aggregations load" rule so the
 * flamegraph doesn't repaint when the aggregations response arrives.
 */
function deriveColorState(
	aggregations: WaterfallAggregationResponse[] | undefined,
	userPreferences: UserPreference[] | null,
): Pick<TraceStoreState, 'colorByField' | 'availableColorByOptions'> {
	const isFieldAvailable = (fieldName: string): boolean => {
		if (fieldName === DEFAULT_COLOR_BY_FIELD.name) {
			return true;
		}
		const map = findAggregationMap(
			aggregations,
			AGGREGATIONS.EXEC_TIME_PCT,
			fieldName,
		);
		return !!map && Object.keys(map).length > 0;
	};

	const availableColorByOptions = COLOR_BY_OPTIONS.filter((opt) =>
		isFieldAvailable(opt.field.name),
	);

	const persistedColorByField = getPersistedColorByField(userPreferences);
	// While aggregations are loading, trust persisted — don't flip to default
	// just because we haven't confirmed availability yet.
	const colorByField =
		aggregations === undefined || isFieldAvailable(persistedColorByField.name)
			? persistedColorByField
			: DEFAULT_COLOR_BY_FIELD;

	return { colorByField, availableColorByOptions };
}

/**
 * Reads preview fields from user preferences and filters out malformed entries.
 */
function derivePreviewFields(
	userPreferences: UserPreference[] | null,
): BaseAutocompleteData[] {
	const pref = userPreferences?.find(
		(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PREVIEW_ATTRIBUTES,
	);
	const raw = (pref?.value as BaseAutocompleteData[] | undefined) ?? [];
	return raw.filter(
		(f): f is BaseAutocompleteData =>
			typeof f === 'object' &&
			f !== null &&
			typeof (f as { key?: unknown }).key === 'string',
	);
}

export const useTraceStore = create<TraceStoreState>()((set, get) => ({
	aggregations: undefined,
	userPreferences: null,
	updateUserPreferenceInContext: null,
	mutateUserPreference: null,

	colorByField: DEFAULT_COLOR_BY_FIELD,
	availableColorByOptions: COLOR_BY_OPTIONS.filter(
		(opt) => opt.field.name === DEFAULT_COLOR_BY_FIELD.name,
	),
	previewFields: [],

	setAggregations: (aggregations): void => {
		const { userPreferences } = get();
		set({
			aggregations,
			...deriveColorState(aggregations, userPreferences),
		});
	},

	setUserPreferences: (userPreferences): void => {
		const { aggregations } = get();
		set({
			userPreferences,
			...deriveColorState(aggregations, userPreferences),
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

export const setTraceStoreAggregations = (
	aggregations: WaterfallAggregationResponse[] | undefined,
): void => useTraceStore.getState().setAggregations(aggregations);

export const setTraceStoreUserPreferences = (
	userPreferences: UserPreference[] | null,
): void => useTraceStore.getState().setUserPreferences(userPreferences);

export const setTraceStoreCallbacks = (callbacks: {
	updateUserPreferenceInContext: UpdateUserPreferenceInContext;
	mutateUserPreference: MutateUserPreference;
}): void => useTraceStore.getState().setCallbacks(callbacks);
