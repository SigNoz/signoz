import { sortBy } from 'lodash-es';
import type { VariableDefaultValueDTO } from 'api/generated/services/sigNoz.schemas';

/**
 * Flat, UI-friendly representation of a V2 dashboard variable. The wire format
 * (`DashboardtypesVariableDTO`) is a nested envelope/plugin union that is awkward
 * to bind a form to; `variableAdapters` converts between this model and the DTO.
 */

export type VariableType = 'QUERY' | 'CUSTOM' | 'TEXT' | 'DYNAMIC';

export type VariableSort = 'DISABLED' | 'ASC' | 'DESC';

export type TelemetrySignal = 'traces' | 'logs' | 'metrics';

/** Wire `kind` discriminators (string values of the generated enums). */
export const ENVELOPE_KIND = {
	LIST: 'ListVariable',
	TEXT: 'TextVariable',
} as const;

export const PLUGIN_KIND = {
	QUERY: 'signoz/QueryVariable',
	CUSTOM: 'signoz/CustomVariable',
	DYNAMIC: 'signoz/DynamicVariable',
} as const;

export const VARIABLE_SORTS: VariableSort[] = ['DISABLED', 'ASC', 'DESC'];

export const TELEMETRY_SIGNALS: TelemetrySignal[] = [
	'traces',
	'logs',
	'metrics',
];

export interface VariableFormModel {
	/** Stable identifier, referenced in queries (e.g. `$name`); must be unique. */
	name: string;
	description: string;
	hidden: boolean;
	type: VariableType;

	// List-variable common fields (Query / Custom / Dynamic).
	multiSelect: boolean;
	showAllOption: boolean;
	sort: VariableSort;
	capturingRegexp: string;

	// Type-specific.
	queryValue: string; // QUERY
	customValue: string; // CUSTOM
	textValue: string; // TEXT
	textConstant: boolean; // TEXT
	dynamicAttribute: string; // DYNAMIC — the telemetry field name
	dynamicSignal: TelemetrySignal; // DYNAMIC — the telemetry signal

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
		hidden: false,
		type: 'QUERY',
		multiSelect: false,
		showAllOption: false,
		sort: 'DISABLED',
		capturingRegexp: '',
		queryValue: '',
		customValue: '',
		textValue: '',
		textConstant: false,
		dynamicAttribute: '',
		dynamicSignal: 'traces',
	};
}

/** Maps the dynamic-variable signal to the field-values API signal. */
export function signalForApi(
	signal: TelemetrySignal,
): TelemetrySignal | undefined {
	return signal;
}

type SortableValues = (string | number | boolean)[];

/** Sorts option/preview values by the variable's chosen order (no-op when disabled). */
export function sortValuesByOrder(
	values: SortableValues,
	sort: VariableSort,
): SortableValues {
	if (sort === 'ASC') {
		return sortBy(values);
	}
	if (sort === 'DESC') {
		return sortBy(values).reverse();
	}
	return values;
}
