import {
	// oxlint-disable-next-line no-restricted-imports
	createContext,
	ReactNode,
	useCallback,
	// oxlint-disable-next-line no-restricted-imports
	useContext,
	useMemo,
} from 'react';
import { useMutation } from 'react-query';
import updateUserPreferenceAPI from 'api/v1/user/preferences/name/update';
import { themeColors } from 'constants/theme';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { useAppContext } from 'providers/App/App';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import {
	SpanV3,
	WaterfallAggregationResponse,
	WaterfallAggregationType,
} from 'types/api/trace/getTraceV3';

import {
	ColorByOption,
	COLOR_BY_FIELDS,
	COLOR_BY_OPTIONS,
	DEFAULT_COLOR_BY_FIELD,
} from '../constants';
import { getSpanAttribute } from '../utils';
import {
	AGGREGATIONS,
	getAggregationMap as findAggregationMap,
} from '../utils/aggregations';

interface TraceContextValue {
	colorByField: TelemetryFieldKey;
	setColorByField: (field: TelemetryFieldKey) => void;
	aggregations: WaterfallAggregationResponse[] | undefined;
	getAggregationMap: (
		type: WaterfallAggregationType,
	) => Record<string, number> | undefined;
	getSpanGroupValue: (span: SpanV3) => string;
	resolveSpanColor: (span: SpanV3) => string;
	/**
	 * Subset of COLOR_BY_OPTIONS whose data is populated on the current trace.
	 * `service.name` is always included; host/container only when their
	 * aggregation `value` map has entries.
	 */
	availableColorByOptions: ColorByOption[];
	/**
	 * Per-user preview fields (selected via the floating "Preview fields"
	 * panel). Stored in `span_details_preview_attributes` user pref. Will be
	 * consumed by the flamegraph `selectFields` request and the waterfall +
	 * flamegraph hover popovers in follow-up phases.
	 */
	previewFields: BaseAutocompleteData[];
	setPreviewFields: (next: BaseAutocompleteData[]) => void;
}

const TraceContext = createContext<TraceContextValue | null>(null);

export function TraceProvider({
	aggregations,
	children,
}: {
	aggregations: WaterfallAggregationResponse[] | undefined;
	children: ReactNode;
}): JSX.Element | null {
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();
	const { mutate: updateUserPreferenceMutation } = useMutation(
		updateUserPreferenceAPI,
	);

	// Source of truth: user-preferences API (loaded once on app init via
	// AppProvider). Render nothing until it resolves so we never paint the
	// default colour first and then swap to the user's persisted choice.
	// AppProvider fires the prefs query as soon as the user is logged in, so
	// this is usually already settled by the time TraceDetailsV3 mounts.
	const persistedColorByField = useMemo<TelemetryFieldKey>(() => {
		const pref = userPreferences?.find(
			(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_COLOR_BY_ATTRIBUTE,
		);
		const name = (pref?.value as string) || '';
		return COLOR_BY_FIELDS.find((f) => f.name === name) ?? DEFAULT_COLOR_BY_FIELD;
	}, [userPreferences]);

	const setColorByField = useCallback(
		(field: TelemetryFieldKey): void => {
			// Optimistically reflect the choice in the in-memory cache so the UI
			// reacts immediately (the GET /user/preferences response on app init
			// always includes the registered key, so `existing` will be defined).
			const existing = userPreferences?.find(
				(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_COLOR_BY_ATTRIBUTE,
			);
			if (existing) {
				updateUserPreferenceInContext({ ...existing, value: field.name });
			}
			updateUserPreferenceMutation({
				name: USER_PREFERENCES.SPAN_DETAILS_COLOR_BY_ATTRIBUTE,
				value: field.name,
			});
		},
		[
			userPreferences,
			updateUserPreferenceInContext,
			updateUserPreferenceMutation,
		],
	);

	const previewFields = useMemo<BaseAutocompleteData[]>(() => {
		const pref = userPreferences?.find(
			(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PREVIEW_ATTRIBUTES,
		);
		const raw = (pref?.value as BaseAutocompleteData[] | undefined) ?? [];
		// Defensive: keep only entries that have a string `key`.
		return raw.filter(
			(f): f is BaseAutocompleteData =>
				typeof f === 'object' &&
				f !== null &&
				typeof (f as { key?: unknown }).key === 'string',
		);
	}, [userPreferences]);

	const setPreviewFields = useCallback(
		(next: BaseAutocompleteData[]): void => {
			const existing = userPreferences?.find(
				(p) => p.name === USER_PREFERENCES.SPAN_DETAILS_PREVIEW_ATTRIBUTES,
			);
			if (existing) {
				updateUserPreferenceInContext({ ...existing, value: next });
			}
			updateUserPreferenceMutation({
				name: USER_PREFERENCES.SPAN_DETAILS_PREVIEW_ATTRIBUTES,
				value: next,
			});
		},
		[
			userPreferences,
			updateUserPreferenceInContext,
			updateUserPreferenceMutation,
		],
	);

	const value = useMemo<TraceContextValue>(() => {
		const isFieldAvailable = (fieldName: string): boolean => {
			if (fieldName === DEFAULT_COLOR_BY_FIELD.name) {
				return true;
			}
			// Pick any aggregation type — if execution_time_percentage is empty,
			// span_count for the same field will be too (both are derived from
			// the same set of spans).
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

		const colorByField =
			aggregations === undefined || isFieldAvailable(persistedColorByField.name)
				? persistedColorByField
				: DEFAULT_COLOR_BY_FIELD;

		const getAggregationMap = (
			type: WaterfallAggregationType,
		): Record<string, number> | undefined =>
			findAggregationMap(aggregations, type, colorByField.name);

		const getSpanGroupValue = (span: SpanV3): string =>
			getSpanAttribute(span, colorByField.name) || 'unknown';

		const resolveSpanColor = (span: SpanV3): string => {
			if (span.has_error) {
				return 'var(--bg-cherry-500)';
			}
			return generateColor(
				getSpanGroupValue(span),
				themeColors.traceDetailColorsV3,
			);
		};

		return {
			colorByField,
			setColorByField,
			aggregations,
			getAggregationMap,
			getSpanGroupValue,
			resolveSpanColor,
			availableColorByOptions,
			previewFields,
			setPreviewFields,
		};
	}, [
		persistedColorByField,
		aggregations,
		setColorByField,
		previewFields,
		setPreviewFields,
	]);

	if (!userPreferences) {
		return null;
	}

	return <TraceContext.Provider value={value}>{children}</TraceContext.Provider>;
}

export function useTraceContext(): TraceContextValue {
	const ctx = useContext(TraceContext);
	if (!ctx) {
		throw new Error('useTraceContext must be used inside TraceProvider');
	}
	return ctx;
}
