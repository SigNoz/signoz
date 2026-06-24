import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { VariableDefaultValueDTO } from 'api/generated/services/sigNoz.schemas';
import { sortBy } from 'lodash-es';

/**
 * The four variable types the editor exposes. No generated enum exists for this
 * — it's a UI grouping over the wire's envelope + plugin kinds: the TextVariable
 * envelope → `TEXT`, and a ListVariable's `DashboardtypesVariablePluginKindDTO`
 * (`signoz/QueryVariable` | `signoz/CustomVariable` | `signoz/DynamicVariable`)
 * → `QUERY` | `CUSTOM` | `DYNAMIC`. Replace with a generated enum if the backend
 * ever exposes a single variable-kind type.
 */
export type VariableType = 'QUERY' | 'CUSTOM' | 'TEXT' | 'DYNAMIC';

/** Telemetry signal — the generated enum (traces / logs / metrics). */
export type TelemetrySignal = TelemetrytypesSignalDTO;

/**
 * Signal selected in the dynamic-variable editor. `'all'` is UI-only (the
 * generated `TelemetrytypesSignalDTO` has no "all") — it searches across every
 * signal and maps to an omitted `signal` on the wire (see {@link signalForApi}).
 */
export const DYNAMIC_SIGNAL_ALL = 'all' as const;
export type DynamicSignalOption = TelemetrySignal | typeof DYNAMIC_SIGNAL_ALL;

/**
 * Sort order for list-variable values. The wire (Perses) validates `sort`
 * against a fixed method set. There is no generated TS enum for it
 * (`DashboardtypesListOrderDTO` is the query-builder order, a different field),
 * so we mirror the Perses `Sort` tokens here.
 */
export const VARIABLE_SORT = {
	DISABLED: 'none',
	ASC: 'alphabetical-asc',
	DESC: 'alphabetical-desc',
	NUMERICAL_ASC: 'numerical-asc',
	NUMERICAL_DESC: 'numerical-desc',
	CI_ASC: 'alphabetical-ci-asc',
	CI_DESC: 'alphabetical-ci-desc',
} as const;

export type VariableSort = (typeof VARIABLE_SORT)[keyof typeof VARIABLE_SORT];

/** Persisted "no sort" value (Perses `none`). */
export const VARIABLE_SORT_DISABLED: VariableSort = VARIABLE_SORT.DISABLED;

export const VARIABLE_SORTS: VariableSort[] = [
	VARIABLE_SORT.DISABLED,
	VARIABLE_SORT.ASC,
	VARIABLE_SORT.DESC,
	VARIABLE_SORT.NUMERICAL_ASC,
	VARIABLE_SORT.NUMERICAL_DESC,
	VARIABLE_SORT.CI_ASC,
	VARIABLE_SORT.CI_DESC,
];

export const VARIABLE_SORT_LABEL: Record<VariableSort, string> = {
	[VARIABLE_SORT.DISABLED]: 'Disabled',
	[VARIABLE_SORT.ASC]: 'Alphabetical (ascending)',
	[VARIABLE_SORT.DESC]: 'Alphabetical (descending)',
	[VARIABLE_SORT.NUMERICAL_ASC]: 'Numerical (ascending)',
	[VARIABLE_SORT.NUMERICAL_DESC]: 'Numerical (descending)',
	[VARIABLE_SORT.CI_ASC]: 'Alphabetical, case-insensitive (ascending)',
	[VARIABLE_SORT.CI_DESC]: 'Alphabetical, case-insensitive (descending)',
};

export const DYNAMIC_SIGNALS: DynamicSignalOption[] = [
	DYNAMIC_SIGNAL_ALL,
	TelemetrytypesSignalDTO.traces,
	TelemetrytypesSignalDTO.logs,
	TelemetrytypesSignalDTO.metrics,
];

export const DYNAMIC_SIGNAL_LABEL: Record<DynamicSignalOption, string> = {
	[DYNAMIC_SIGNAL_ALL]: 'All telemetry',
	[TelemetrytypesSignalDTO.traces]: 'Traces',
	[TelemetrytypesSignalDTO.logs]: 'Logs',
	[TelemetrytypesSignalDTO.metrics]: 'Metrics',
};

/** Maps the editor's signal selection to the wire value (`'all'` → omitted). */
export function signalForApi(
	signal: DynamicSignalOption,
): TelemetrySignal | undefined {
	return signal === DYNAMIC_SIGNAL_ALL ? undefined : signal;
}

type SortableValues = (string | number | boolean)[];

/** Sorts preview / option values by the variable's chosen order (no-op when disabled). */
export function sortValuesByOrder(
	values: SortableValues,
	sort: VariableSort,
): SortableValues {
	switch (sort) {
		case VARIABLE_SORT.ASC:
			return sortBy(values);
		case VARIABLE_SORT.DESC:
			return sortBy(values).reverse();
		case VARIABLE_SORT.NUMERICAL_ASC:
			return sortBy(values, (value) => Number(value));
		case VARIABLE_SORT.NUMERICAL_DESC:
			return sortBy(values, (value) => Number(value)).reverse();
		case VARIABLE_SORT.CI_ASC:
			return sortBy(values, (value) => String(value).toLowerCase());
		case VARIABLE_SORT.CI_DESC:
			return sortBy(values, (value) => String(value).toLowerCase()).reverse();
		default:
			return values;
	}
}

export interface VariableFormModel {
	/** Stable identifier, referenced in queries (e.g. `$name`); must be unique. */
	name: string;
	description: string;
	type: VariableType;

	// List-variable common fields (Query / Custom / Dynamic).
	multiSelect: boolean;
	showAllOption: boolean;
	sort: VariableSort;

	// Type-specific.
	queryValue: string; // QUERY
	customValue: string; // CUSTOM
	textValue: string; // TEXT
	textConstant: boolean; // TEXT
	dynamicAttribute: string; // DYNAMIC — the telemetry field name
	dynamicSignal: DynamicSignalOption; // DYNAMIC — the telemetry signal

	/**
	 * Runtime-selected default, not editable in the management tab yet; carried
	 * through edits so saving a definition doesn't clobber it.
	 */
	defaultValue?: VariableDefaultValueDTO;
}

export function emptyVariableFormModel(): VariableFormModel {
	return {
		name: '',
		description: '',
		type: 'DYNAMIC',
		multiSelect: false,
		showAllOption: false,
		sort: VARIABLE_SORT_DISABLED,
		queryValue: '',
		customValue: '',
		textValue: '',
		textConstant: false,
		dynamicAttribute: '',
		dynamicSignal: DYNAMIC_SIGNAL_ALL,
	};
}
